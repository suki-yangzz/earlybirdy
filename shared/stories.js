/* ============================================================
   shared/stories.js —— 胎教故事（内置兜底）
   - 列表按分类 / 阶段筛选；详情图文分页阅读
   - 有 audio 的故事复用 App 的音频播放器
   - 远端 manifest 提供 stories shard 时优先使用远端，本文件作为离线兜底
   ============================================================ */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) {
    root.YYShared = root.YYShared || {};
    for (var k in api) if (Object.prototype.hasOwnProperty.call(api, k)) root.YYShared[k] = api[k];
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var STORY_CATEGORIES = [
    { id: 'bedtime', label: '睡前故事' },
    { id: 'nature', label: '自然启蒙' },
    { id: 'classic', label: '经典童话' }
  ];

  var STORIES = [
    {
      id: 's-moon',
      stage: 'pregnancy',
      category: 'bedtime',
      categoryLabel: '睡前故事',
      title: '月亮船',
      subtitle: '写给肚子里的小乘客',
      coverEmoji: '🌙',
      coverColor: '#5AA9F8',
      coverBg: '#E9F3FF',
      duration: '约 3 分钟',
      intro: '一艘用月光折成的小船，载着妈妈的呼吸，慢慢摇到宝宝身边。适合睡前轻声读。',
      audio: { src: '/stories/audio/moon.wav', sec: 45 },
      pages: [
        {
          title: '第 1 页 · 月亮折了一只船',
          body: '天慢慢暗下来，窗台上落着一小块月光。妈妈把月光轻轻折起来，折成一只小小的船。船不大，刚好能装下一个还没见面的你。'
        },
        {
          title: '第 2 页 · 船里装着呼吸',
          body: '小船里没有行李，只装着妈妈一呼一吸的声音。吸气的时候，船身轻轻抬起；呼气的时候，船身又慢慢落下。你听见了吗？这是我们每天都在说的悄悄话。'
        },
        {
          title: '第 3 页 · 摇过一条温柔的河',
          body: '月亮船顺着一条看不见的河往前漂。河水是温的，岸上有一盏一盏的小灯。每经过一盏灯，妈妈就在心里说一句：今天也辛苦啦。'
        },
        {
          title: '第 4 页 · 到站啦',
          body: '船靠岸的时候，月亮正好走到窗子中间。妈妈把手放在肚子上，轻轻说：晚安，小乘客。明天我们还会见面。'
        }
      ]
    },
    {
      id: 's-seed',
      stage: 'pregnancy',
      category: 'nature',
      categoryLabel: '自然启蒙',
      title: '小种子的一生',
      subtitle: '从泥土到一片小森林',
      coverEmoji: '🌱',
      coverColor: '#3FC1A0',
      coverBg: '#E7F8F3',
      duration: '约 4 分钟',
      intro: '一颗小种子在土里醒来，听见雨声、风声，也听见妈妈的声音。用故事认识生长的节奏。',
      pages: [
        {
          title: '第 1 页 · 泥土里的小房间',
          body: '一颗小种子住在一间黑黑的泥土小房间里。它看不见外面，却能听见雨点敲门的声音，咚、咚、咚。'
        },
        {
          title: '第 2 页 · 先长出一点根',
          body: '小种子没有着急往上长，它先往下伸出细细的根，像许多只小手，把泥土轻轻抓住。根扎稳了，它才抬起头。'
        },
        {
          title: '第 3 页 · 第一片叶子',
          body: '某一天清晨，小种子顶开泥土，看见第一缕阳光。它长出第一片叶子，叶子很小，却努力朝着有光的地方伸过去。'
        },
        {
          title: '第 4 页 · 慢慢来也很好',
          body: '风问它：你什么时候才能长成大树呀？小种子说：我先把今天长好。就这样，一天一点，它后来真的长成了一片小小的森林。'
        }
      ]
    },
    {
      id: 's-star',
      stage: 'pregnancy',
      category: 'classic',
      categoryLabel: '经典童话',
      title: '星星的晚安吻',
      subtitle: '一个关于勇敢的小童话',
      coverEmoji: '⭐',
      coverColor: '#F5A623',
      coverBg: '#FFF1D6',
      duration: '约 3 分钟',
      intro: '最小的一颗星星不敢发光，直到它发现，原来有人一直在等它的光。',
      pages: [
        {
          title: '第 1 页 · 最小的一颗星星',
          body: '夜空里有很多星星，最小的一颗躲在云后面。它觉得自己太小了，照不亮谁，也不好意思出来。'
        },
        {
          title: '第 2 页 · 云朵的邀请',
          body: '一朵云慢慢飘过来，问它：你在等什么呀？小星星小声说：等我变得亮一点。云朵笑了：可是有人已经在找你了。'
        },
        {
          title: '第 3 页 · 窗边的那盏小灯',
          body: '小星星探头一看，远处的窗边亮着一盏小灯。灯下有人轻轻拍着肚子，说：今晚的星星还没出来呢。'
        },
        {
          title: '第 4 页 · 晚安吻',
          body: '小星星鼓起勇气，发出了自己的一点光。那光很小，却刚好落在窗台上。它轻轻说：晚安，我把今天的勇敢送给你。'
        }
      ]
    }
  ];

  return { STORY_CATEGORIES: STORY_CATEGORIES, STORIES: STORIES };
});
