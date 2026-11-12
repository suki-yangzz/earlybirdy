/* ============================================================
   shared/test/courses.test.js —— 孕妈课堂数据与课程收藏
   运行：node shared/test/courses.test.js
   ============================================================ */
'use strict';

var assert = require('assert');
var shared = require('../index');

var results = [];
function record(name, fn) {
  try { results.push({ name: name, ok: true, detail: fn() }); }
  catch (err) { results.push({ name: name, ok: false, detail: err.message }); }
}

function newCore(content) {
  return shared.createCore({
    stages: shared.STAGES,
    stageOrder: shared.STAGE_ORDER,
    content: content,
    storage: shared.createMemoryStorage(),
  });
}

function run() {
  record('课程分类齐全，课程字段完整', function () {
    var ids = shared.COURSE_CATEGORIES.map(function (c) { return c.id; });
    assert.deepStrictEqual(ids, ['taijiao', 'nutrition', 'checkup', 'mind', 'birth']);
    shared.COURSES.forEach(function (c) {
      assert.ok(c.id && c.title && c.intro, '课程缺少必要字段：' + c.id);
      assert.ok(Array.isArray(c.chapters) && c.chapters.length > 0, '课程缺少章节：' + c.id);
      assert.ok(ids.indexOf(c.category) !== -1, '未知分类：' + c.category);
      c.chapters.forEach(function (ch) {
        assert.ok(ch.id && ch.title, '章节缺少 id/title');
        assert.ok(typeof ch.locked === 'boolean', '章节缺少 locked 状态');
        if (!ch.locked) assert.ok(ch.body || ch.src || (Array.isArray(ch.pages) && ch.pages.length), '未解锁章节既无正文也无素材：' + ch.id);
      });
    });
    return shared.COURSES.length + ' courses / ' + shared.COURSES.reduce(function (n, c) { return n + c.chapters.length; }, 0) + ' chapters';
  });

  record('课程收藏：可收藏、可在收藏列表解析、可取消', function () {
    var content = Object.assign({}, shared.CONTENT, { courses: shared.COURSES });
    var core = newCore(content);
    var course = shared.COURSES[0];
    assert.strictEqual(core.isFav('course', course.id, 'pregnancy'), false);
    core.toggleFav('course', course.id, 'pregnancy');
    assert.strictEqual(core.isFav('course', course.id, 'pregnancy'), true);
    var items = core.favItems();
    assert.strictEqual(items.length, 1);
    assert.strictEqual(items[0].kind, 'course');
    assert.strictEqual(items[0].title, course.title);
    assert.strictEqual(items[0].emoji, course.coverEmoji);
    core.toggleFav('course', course.id, 'pregnancy');
    assert.strictEqual(core.favCount(), 0);
    return 'course fav/unfav + resolve ok';
  });

  record('课程浏览历史可记录并解析标题', function () {
    var content = Object.assign({}, shared.CONTENT, { courses: shared.COURSES });
    var core = newCore(content);
    var course = shared.COURSES[1];
    core.recordHistory('course', course.id, 'pregnancy');
    var list = core.history();
    assert.strictEqual(list.length, 1);
    assert.strictEqual(list[0].kind, 'course');
    assert.strictEqual(list[0].title, course.title);
    return 'history resolved: ' + list[0].title;
  });

  record('素材被删除后收藏优雅降级（保留标题，不空白）', function () {
    var content = Object.assign({}, shared.CONTENT, { courses: shared.COURSES.slice() });
    var core = newCore(content);
    var course = shared.COURSES[2];
    core.toggleFav('course', course.id, 'pregnancy');
    // 模拟课程下架：解析不到内容，但收藏里写入的标题仍在
    content.courses.length = 0;
    var items = core.favItems();
    assert.strictEqual(items.length, 1);
    assert.strictEqual(items[0].title, course.title, '收藏应保留写入时的标题');
    assert.strictEqual(items[0].sub.length > 0, true);
    return 'deleted course still shows cached title: ' + items[0].title;
  });

  var failed = results.filter(function (r) { return !r.ok; });
  results.forEach(function (r) {
    console.log((r.ok ? 'PASS' : 'FAIL') + '  ' + r.name + '  -> ' + r.detail);
  });
  console.log('\n' + (results.length - failed.length) + '/' + results.length + ' passed');
  if (failed.length) process.exit(1);
}

run();
