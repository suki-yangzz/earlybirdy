/* ============================================================
   shared/mock/server.js —— legacy 本地 mock 内容服务（静态 JSON）
   ⚠ 仅用于 shared 单测；真机 / 联调请用 content/server.js（统一服务，默认 8788）。
     本 mock 只提供静态 manifest，不含档案 API / 注册表 API / /admin。
   启动：node shared/mock/server.js
   端口：默认 8787（可用 PORT 环境变量覆盖；单测以随机端口启动）
   清单：默认 assets/v1/manifest.json（可用 MANIFEST 环境变量覆盖）
   ============================================================ */
'use strict';

var http = require('http');
var fs = require('fs');
var path = require('path');

var ROOT = __dirname;

function createMockServer(opts) {
  opts = opts || {};
  var state = {
    manifestFile: opts.manifestFile || 'assets/v1/manifest.json',
    requests: []
  };

  var server = http.createServer(function (req, res) {
    var pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    } catch (err) {
      res.writeHead(400, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'bad request' }));
      return;
    }
    state.requests.push(pathname);

    // 允许 Expo Web / 其他端口的跨域读取
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (pathname === '/') {
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
      res.end(JSON.stringify({ ok: true, manifest: state.manifestFile }));
      return;
    }

    var file = pathname === '/manifest.json'
      ? path.join(ROOT, state.manifestFile)
      : path.join(ROOT, pathname.replace(/^\/+/, ''));

    if (file.indexOf(ROOT) !== 0) {
      res.writeHead(403, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'forbidden' }));
      return;
    }

    fs.readFile(file, function (err, buf) {
      if (err) {
        res.writeHead(404, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: 'not found', path: pathname }));
        return;
      }
      res.writeHead(200, {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store'
      });
      res.end(buf);
    });
  });

  return {
    server: server,
    state: state,
    listen: function (port, host) {
      return new Promise(function (resolve, reject) {
        server.once('error', reject);
        server.listen(port || 0, host || '127.0.0.1', function () {
          resolve(server.address().port);
        });
      });
    },
    close: function () {
      return new Promise(function (resolve) {
        server.close(function () { resolve(); });
      });
    }
  };
}

if (require.main === module) {
  var port = Number(process.env.PORT || 8787);
  var host = process.env.HOST || '127.0.0.1';
  var manifestFile = process.env.MANIFEST || 'assets/v1/manifest.json';
  var s = createMockServer({ manifestFile: manifestFile });
  s.listen(port, host).then(function (p) {
    console.warn('[mock][legacy] 仅用于 shared 单测；真机/联调请用 content/server.js（默认 8788）');
    console.log('mock content server: http://' + (host === '0.0.0.0' ? '127.0.0.1' : host) + ':' + p + '/manifest.json');
    if (host === '0.0.0.0') {
      console.log('bound to 0.0.0.0 — 本 mock 不含档案/注册表 API，不要用于真机');
    }
    console.log('manifest file: ' + manifestFile);
    console.log('press Ctrl+C to stop');
  }).catch(function (err) {
    console.error('failed to start mock server:', err.message);
    process.exit(1);
  });
}

module.exports = { createMockServer: createMockServer, ROOT: ROOT };
