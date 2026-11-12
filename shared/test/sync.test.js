/* 自动化验证：远端内容同步的 5 条链路。
   运行：node shared/test/sync.test.js  （或 npm --prefix shared test） */
'use strict';

var crypto = require('crypto');
var assert = require('assert');
var path = require('path');

var syncMod = require('../sync');
var webStorage = require('../storage/web');
var mockMod = require('../mock/server');
var builtin = require('../content').CONTENT;

var hashFn = function (text) {
  return crypto.createHash('sha256').update(text).digest('hex');
};

var results = [];
function record(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(function (detail) { results.push({ name: name, ok: true, detail: detail }); })
    .catch(function (err) { results.push({ name: name, ok: false, detail: err.message }); });
}

function shardRequests(mock) {
  return mock.state.requests.filter(function (p) { return p.indexOf('/assets/') === 0; });
}

async function main() {
  var mock = mockMod.createMockServer({ manifestFile: 'assets/v1/manifest.json' });
  var port = await mock.listen(0);
  var manifestUrl = 'http://127.0.0.1:' + port + '/manifest.json';
  var storage = webStorage.createMemoryStorage();
  var sync = syncMod.createContentSync({ manifestUrl: manifestUrl, storage: storage, hashFn: hashFn });

  /* 1. 首次拉取成功 */
  await record('1 首次拉取成功', async function () {
    mock.state.requests.length = 0;
    var r = await sync.sync();
    assert.strictEqual(r.updated, true, '首次应更新');
    assert.strictEqual(r.source, 'remote');
    assert.strictEqual(r.version, '2026.11.04.1');
    assert.strictEqual(r.bundle.stages && Object.keys(r.bundle.stages).length, 5, '应含 5 个阶段');
    assert.strictEqual(r.bundle.content.tasks.toddler.length, 5, '应含 5 条 toddler 任务');
    assert.strictEqual(r.bundle.content.products.length, 10, '应含 10 件商品');
    assert.ok(storage.getItem('yy.v1.contentCache'), '写入本地缓存');
    return 'version=' + r.version + ', fetched=' + r.fetched.join(',') + ', cache=yes';
  });

  /* 2. 版本相同不重复下载 */
  await record('2 版本相同不重复下载', async function () {
    mock.state.requests.length = 0;
    var r = await sync.sync();
    assert.strictEqual(r.updated, false);
    assert.deepStrictEqual(r.fetched, [], '不应下载任何分片');
    assert.strictEqual(shardRequests(mock).length, 0, '分片请求数应为 0');
    return 'updated=false, shardRequests=0, only manifest checked';
  });

  /* 3. 版本升级触发增量（只下载变化的 tasks 分片） */
  await record('3 版本升级触发增量', async function () {
    mock.state.manifestFile = 'assets/v2/manifest.json';
    mock.state.requests.length = 0;
    var r = await sync.sync();
    assert.strictEqual(r.updated, true);
    assert.strictEqual(r.version, '2026.11.04.2');
    assert.deepStrictEqual(r.fetched, ['tasks'], '只应下载 tasks');
    assert.strictEqual(shardRequests(mock).length, 1, '分片请求数应为 1');
    assert.ok(shardRequests(mock)[0].indexOf('/v2/tasks.json') !== -1, '应请求 v2/tasks.json');
    assert.strictEqual(r.bundle.content.tasks.preschool.length, 6, '新增任务应生效');
    return 'version=' + r.version + ', fetched=' + r.fetched.join(',') + ', shardRequests=1';
  });

  /* 4. 断网回落缓存 */
  await record('4 断网回落缓存', async function () {
    await mock.close();
    var r = await sync.sync();
    assert.strictEqual(r.offline, true, '应标记离线');
    assert.strictEqual(r.source, 'cache', '应使用缓存');
    assert.strictEqual(r.version, '2026.11.04.2', '缓存版本应为 v2');
    assert.strictEqual(r.bundle.content.tasks.preschool.length, 6, '缓存内容应可用');
    return 'offline=true, source=cache, version=' + r.version + ', error=' + (r.error || '');
  });

  /* 5. 无缓存回落内置兜底 */
  await record('5 无缓存回落内置兜底', async function () {
    var fresh = webStorage.createMemoryStorage();
    var offlineSync = syncMod.createContentSync({
      manifestUrl: 'http://127.0.0.1:1/manifest.json',
      storage: fresh,
      hashFn: hashFn
    });
    var r = await offlineSync.sync();
    assert.strictEqual(r.source, 'builtin', '应回落内置');
    assert.strictEqual(r.version, 'builtin');
    assert.strictEqual(r.bundle.content.tasks.toddler.length, builtin.tasks.toddler.length, '内置任务应可用');
    assert.strictEqual(Object.keys(r.bundle.stages).length, 5, '内置阶段应可用');
    return 'offline=true, source=builtin, tasks.toddler=' + r.bundle.content.tasks.toddler.length;
  });

  /* 输出 */
  console.log('\n=== shared sync verification ===\n');
  var failed = 0;
  results.forEach(function (r) {
    console.log((r.ok ? 'PASS' : 'FAIL') + '  ' + r.name + '  —  ' + r.detail);
    if (!r.ok) failed += 1;
  });
  console.log('\n' + (results.length - failed) + '/' + results.length + ' passed');
  if (failed) process.exit(1);
}

main().catch(function (err) {
  console.error('test runner crashed:', err && err.stack || err);
  process.exit(1);
});
