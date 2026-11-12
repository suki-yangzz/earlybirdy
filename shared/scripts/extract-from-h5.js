/* 从 app/js/data 提取纯数据，生成 shared/stages.js 与 shared/content.js。
   仅用于一次性/可重复的同步生成，运行时不依赖 app/。
   用法：node shared/scripts/extract-from-h5.js */
'use strict';

var vm = require('vm');
var fs = require('fs');
var path = require('path');

var ROOT = path.resolve(__dirname, '..', '..');
var OUT = path.resolve(__dirname, '..');

function loadH5(file) {
  var sandbox = { console: console };
  sandbox.window = sandbox; // 浏览器里 window.YY 同时是全局 YY
  var ctx = vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(file, 'utf8'), ctx, { filename: file });
  return sandbox.YY;
}

function umd(header, body) {
  return header +
    '(function (root, factory) {\n' +
    '  var api = factory();\n' +
    '  if (typeof module === "object" && module.exports) module.exports = api;\n' +
    '  if (root) {\n' +
    '    root.YYShared = root.YYShared || {};\n' +
    '    for (var k in api) if (Object.prototype.hasOwnProperty.call(api, k)) root.YYShared[k] = api[k];\n' +
    '  }\n' +
    '})(typeof globalThis !== "undefined" ? globalThis : this, function () {\n' +
    body +
    '\n});\n';
}

function writeStages() {
  var YY = loadH5(path.join(ROOT, 'app', 'js', 'data', 'stages.js'));
  var body =
    '  var INTERACTIONS = ' + JSON.stringify(YY.INTERACTIONS, null, 2) + ';\n' +
    '  var STAGE_ORDER = ' + JSON.stringify(YY.STAGE_ORDER, null, 2) + ';\n' +
    '  var STAGES = ' + JSON.stringify(YY.STAGES, null, 2) + ';\n' +
    '  function getStage(id) { return STAGES[id] || STAGES.toddler; }\n' +
    '  return { INTERACTIONS: INTERACTIONS, STAGE_ORDER: STAGE_ORDER, STAGES: STAGES, getStage: getStage };';
  fs.writeFileSync(path.join(OUT, 'stages.js'),
    umd('/* AUTO-GENERATED from app/js/data/stages.js by shared/scripts/extract-from-h5.js */\n', body));
  return { stageCount: YY.STAGE_ORDER.length };
}

function writeContent() {
  var YY = loadH5(path.join(ROOT, 'app', 'js', 'data', 'content.js'));
  var C = YY.CONTENT;
  var body =
    '  var CONTENT = ' + JSON.stringify(C, null, 2) + ';\n' +
    '  return { CONTENT: CONTENT };';
  fs.writeFileSync(path.join(OUT, 'content.js'),
    umd('/* AUTO-GENERATED from app/js/data/content.js by shared/scripts/extract-from-h5.js */\n', body));
}

writeStages();
writeContent();
console.log('generated shared/stages.js and shared/content.js');
