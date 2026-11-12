/* ============================================================
   shared/sync.js —— 远端内容协议与增量同步
   流程：拉 manifest → 比对 version / 分片 sha256 → 只下载变化分片
         → 校验 → 落盘缓存 → 断网回落缓存 → 无缓存回落内置内容
   存储通过注入的 storage adapter（可为同步或异步）。
   ============================================================ */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) {
    root.YYShared = root.YYShared || {};
    for (var k in api) if (Object.prototype.hasOwnProperty.call(api, k)) root.YYShared[k] = api[k];
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  var DEFAULT_CACHE_KEY = 'yy.v1.contentCache';
  var MANIFEST_SCHEMA_VERSION = 1;

  function defaultStages() {
    try { return require('./stages'); } catch (err) { /* 浏览器分支 */ }
    return root.YYShared || {};
  }
  function defaultContent() {
    try { return require('./content').CONTENT; } catch (err) { /* 浏览器分支 */ }
    return (root.YYShared && root.YYShared.CONTENT) || {};
  }
  function defaultStories() {
    try { return require('./stories').STORIES; } catch (err) { /* 浏览器分支 */ }
    return (root.YYShared && root.YYShared.STORIES) || [];
  }

  function builtinBundle() {
    var s = defaultStages();
    var content = defaultContent();
    return {
      version: 'builtin',
      source: 'builtin',
      stages: s.STAGES || {},
      interactions: s.INTERACTIONS || {},
      stageOrder: s.STAGE_ORDER || Object.keys(s.STAGES || {}),
      /* 内置内容里补上故事兜底，断网冷启动也能打开胎教故事 */
      content: Object.assign({}, content, { stories: content.stories || defaultStories() })
    };
  }

  function resolveUrl(url, base) {
    try { return new URL(url, base).toString(); } catch (err) { return url; }
  }

  function defaultHash(text) {
    try {
      if (typeof crypto !== 'undefined' && crypto.subtle && typeof TextEncoder !== 'undefined') {
        return crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)).then(function (buf) {
          var arr = new Uint8Array(buf);
          var hex = '';
          for (var i = 0; i < arr.length; i++) hex += (arr[i] < 16 ? '0' : '') + arr[i].toString(16);
          return hex;
        });
      }
    } catch (err) { /* 环境不支持时跳过校验 */ }
    return Promise.resolve('');
  }

  function assemble(shards) {
    var stagesShard = shards.stages || {};
    var catalog = shards.catalog || {};
    return {
      version: '',
      source: 'remote',
      stages: stagesShard.STAGES || {},
      interactions: stagesShard.INTERACTIONS || {},
      stageOrder: stagesShard.STAGE_ORDER || Object.keys(stagesShard.STAGES || {}),
      content: {
        tracks: shards.tracks || {},
        decks: shards.decks || {},
        videos: shards.videos || {},
        tasks: shards.tasks || {},
        courses: shards.courses || [],
        stories: shards.stories || [],
        categories: catalog.categories || [],
        products: catalog.products || []
      }
    };
  }

  function createContentSync(opts) {
    opts = opts || {};
    var manifestUrl = opts.manifestUrl;
    var storage = opts.storage || null;
    var cacheKey = opts.cacheKey || DEFAULT_CACHE_KEY;
    var fetchImpl = opts.fetchImpl || (typeof fetch !== 'undefined' ? fetch.bind(root) : null);
    var hashFn = opts.hashFn || defaultHash;
    var logger = opts.logger || function () {};

    if (!manifestUrl) throw new Error('createContentSync: manifestUrl is required');

    function readRaw() {
      return Promise.resolve(storage ? storage.getItem(cacheKey) : null).catch(function () { return null; });
    }
    function writeRaw(value) {
      try {
        var p = storage && storage.setItem(cacheKey, JSON.stringify(value));
        if (p && typeof p.then === 'function') return p.catch(function () {});
      } catch (err) { /* 忽略 */ }
      return Promise.resolve();
    }

    function loadCache() {
      return readRaw().then(function (raw) {
        if (!raw) return null;
        try {
          var parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
          if (!parsed || !parsed.version || !parsed.shards) return null;
          return parsed;
        } catch (err) { return null; }
      });
    }

    function bundleFromCache(cache) {
      if (!cache) return builtinBundle();
      var plain = {};
      Object.keys(cache.shards || {}).forEach(function (name) {
        var entry = cache.shards[name];
        plain[name] = entry && typeof entry === 'object' && 'data' in entry ? entry.data : entry;
      });
      var bundle = assemble(plain);
      bundle.version = cache.version;
      bundle.source = 'cache';
      return bundle;
    }

    function fetchText(url) {
      if (!fetchImpl) return Promise.reject(new Error('fetch unavailable'));
      return Promise.resolve(fetchImpl(url, { cache: 'no-store' })).then(function (res) {
        if (!res || !(res.status >= 200 && res.status < 300)) {
          throw new Error('HTTP ' + (res ? res.status : '?') + ' ' + url);
        }
        return res.text();
      });
    }

    function fetchJson(url) {
      return fetchText(url).then(function (text) {
        try { return { text: text, json: JSON.parse(text) }; }
        catch (err) { throw new Error('invalid JSON: ' + url); }
      });
    }

    function verify(text, expected, url) {
      if (!expected) return Promise.resolve();
      return Promise.resolve(hashFn(text)).then(function (actual) {
        if (!actual) return; // 当前环境无哈希能力时跳过
        if (actual !== expected) throw new Error('checksum mismatch: ' + url);
      });
    }

    /** 只读本地缓存，不触网。用于冷启动/断网立即出内容 */
    function getCachedBundle() {
      return loadCache().then(function (cache) {
        return { updated: false, source: cache ? 'cache' : 'builtin', offline: false, bundle: bundleFromCache(cache) };
      });
    }

    /** 拉 manifest 比对版本，不下载分片 */
    function checkUpdate() {
      return loadCache().then(function (cache) {
        return fetchJson(manifestUrl).then(function (m) {
          var localVersion = cache ? cache.version : null;
          var remoteVersion = m.json.version || null;
          return {
            checked: true,
            localVersion: localVersion,
            remoteVersion: remoteVersion,
            hasUpdate: !!remoteVersion && remoteVersion !== localVersion,
            manifest: m.json
          };
        }).catch(function (err) {
          return { checked: false, localVersion: cache ? cache.version : null, error: String(err && err.message || err) };
        });
      });
    }

    /**
     * 主同步流程。
     * 返回 { updated, source, offline, version, bundle, fetched:[shardName], error? }
     */
    function sync() {
      return loadCache().then(function (cache) {
        return fetchJson(manifestUrl).then(function (m) {
          var manifest = m.json;
          if (!manifest || !Array.isArray(manifest.shards)) throw new Error('manifest.shards missing');
          if (!manifest.version) throw new Error('manifest.version missing');

          // 版本相同 → 不重复下载
          if (cache && cache.version === manifest.version) {
            return { updated: false, source: 'cache', offline: false, version: cache.version, fetched: [], bundle: bundleFromCache(cache) };
          }

          var shards = {};
          var fetched = [];
          var sequence = Promise.resolve();

          manifest.shards.forEach(function (shard) {
            sequence = sequence.then(function () {
              var cached = cache && cache.shards && cache.shards[shard.name];
              if (cached && cached.sha256 === shard.sha256 && cached.data) {
                shards[shard.name] = cached.data;
                return;
              }
              var url = resolveUrl(shard.url, manifestUrl);
              return fetchText(url).then(function (text) {
                return verify(text, shard.sha256, url).then(function () {
                  var data;
                  try { data = JSON.parse(text); } catch (err) { throw new Error('invalid JSON: ' + url); }
                  shards[shard.name] = data;
                  fetched.push(shard.name);
                });
              });
            });
          });

          return sequence.then(function () {
            var nextCache = { version: manifest.version, manifest: manifest, shards: {} };
            Object.keys(shards).forEach(function (name) {
              var shard = manifest.shards.filter(function (s) { return s.name === name; })[0] || {};
              nextCache.shards[name] = { sha256: shard.sha256 || '', data: shards[name] };
            });
            return Promise.resolve(writeRaw(nextCache)).then(function () {
              var bundle = assemble(shards);
              bundle.version = manifest.version;
              bundle.source = 'remote';
              logger('content synced to ' + manifest.version + ', fetched: ' + (fetched.join(',') || 'none'));
              return { updated: true, source: 'remote', offline: false, version: manifest.version, fetched: fetched, bundle: bundle };
            });
          });
        }).catch(function (err) {
          // 断网 / 服务不可用：有缓存回缓存，无缓存回内置
          var offline = true;
          var bundle = bundleFromCache(cache);
          return {
            updated: false,
            source: cache ? 'cache' : 'builtin',
            offline: offline,
            version: bundle.version,
            fetched: [],
            error: String(err && err.message || err),
            bundle: bundle
          };
        });
      });
    }

    return {
      manifestUrl: manifestUrl,
      sync: sync,
      checkUpdate: checkUpdate,
      getCachedBundle: getCachedBundle,
      clearCache: function () {
        try {
          if (storage) return Promise.resolve(storage.removeItem(cacheKey)).catch(function () {});
        } catch (err) { /* 忽略 */ }
        return Promise.resolve();
      }
    };
  }

  return {
    MANIFEST_SCHEMA_VERSION: MANIFEST_SCHEMA_VERSION,
    DEFAULT_CACHE_KEY: DEFAULT_CACHE_KEY,
    builtinBundle: builtinBundle,
    createContentSync: createContentSync
  };
});
