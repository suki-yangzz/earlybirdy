/* shared/index.js —— Node / Metro / 测试统一入口 */
'use strict';

var stages = require('./stages');
var content = require('./content');
var rules = require('./rules');
var sync = require('./sync');
var profile = require('./profile');
var pinyin = require('./pinyin');
var babies = require('./babies');
var profileSync = require('./profileSync');
var search = require('./search');
var report = require('./report');
var notify = require('./notify');
var courses = require('./courses');
var stories = require('./stories');
var ids = require('./ids');

var api = {};
[stages, content, rules, sync, profile, pinyin, babies, profileSync, search, report, notify, courses, stories, ids].forEach(function (part) {
  Object.keys(part).forEach(function (k) { api[k] = part[k]; });
});

/** 便捷工厂：把内置阶段与内容接到业务规则上 */
api.createAppCore = function (opts) {
  opts = opts || {};
  return api.createCore({
    stages: api.STAGES,
    stageOrder: api.STAGE_ORDER,
    content: api.CONTENT,
    storage: opts.storage || null,
    now: opts.now || null,
    state: opts.state || null
  });
};

module.exports = api;
