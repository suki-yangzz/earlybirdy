/* 生成 shared/mock 的静态内容分片与 manifest（v1 / v2，用于验证增量同步）。
   用法：node shared/scripts/build-mock.js */
'use strict';

var fs = require('fs');
var path = require('path');
var crypto = require('crypto');

var stagesMod = require('../stages');
var content = require('../content').CONTENT;

var MOCK = path.resolve(__dirname, '..', 'mock');
var ASSETS = path.join(MOCK, 'assets');

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function writeJson(file, value) {
  var text = JSON.stringify(value, null, 2) + '\n';
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
  return { sha256: sha256(text), bytes: Buffer.byteLength(text) };
}

function shardsV1() {
  return {
    stages: {
      STAGES: stagesMod.STAGES,
      INTERACTIONS: stagesMod.INTERACTIONS,
      STAGE_ORDER: stagesMod.STAGE_ORDER
    },
    tracks: content.tracks,
    decks: content.decks,
    videos: content.videos,
    tasks: content.tasks,
    catalog: { categories: content.categories, products: content.products }
  };
}

function manifest(version, shardMap) {
  return {
    schemaVersion: 1,
    version: version,
    updatedAt: new Date().toISOString(),
    shards: Object.keys(shardMap).map(function (name) {
      var m = shardMap[name];
      return { name: name, url: m.url, sha256: m.sha256, bytes: m.bytes };
    })
  };
}

function main() {
  fs.rmSync(MOCK, { recursive: true, force: true });

  /* ---------- v1 ---------- */
  var v1 = shardsV1();
  var v1Map = {};
  Object.keys(v1).forEach(function (name) {
    var file = path.join(ASSETS, 'v1', name + '.json');
    var meta = writeJson(file, v1[name]);
    v1Map[name] = { url: 'assets/v1/' + name + '.json', sha256: meta.sha256, bytes: meta.bytes };
  });
  var v1Manifest = manifest('2026.11.04.1', v1Map);
  writeJson(path.join(ASSETS, 'v1', 'manifest.json'), v1Manifest);
  writeJson(path.join(MOCK, 'manifest.json'), v1Manifest);

  /* ---------- v2：仅 tasks 分片变化 ---------- */
  var tasksV2 = JSON.parse(JSON.stringify(v1.tasks));
  tasksV2.preschool = tasksV2.preschool.concat([{
    id: 'k6', emoji: '🧩', title: '拼一拼七巧板', sub: '新内容：每周更新一次',
    value: 15
  }]);
  var tasksMeta = writeJson(path.join(ASSETS, 'v2', 'tasks.json'), tasksV2);

  var v2Map = JSON.parse(JSON.stringify(v1Map));
  v2Map.tasks = { url: 'assets/v2/tasks.json', sha256: tasksMeta.sha256, bytes: tasksMeta.bytes };
  var v2Manifest = manifest('2026.11.04.2', v2Map);
  writeJson(path.join(ASSETS, 'v2', 'manifest.json'), v2Manifest);

  console.log('mock assets written:');
  console.log('  v1 manifest  ' + path.join(ASSETS, 'v1', 'manifest.json'));
  console.log('  v2 manifest  ' + path.join(ASSETS, 'v2', 'manifest.json'));
  console.log('  v1 shards    ' + Object.keys(v1Map).join(', '));
  console.log('  v2 changed   tasks (' + tasksMeta.sha256.slice(0, 12) + '...)');
}

main();
