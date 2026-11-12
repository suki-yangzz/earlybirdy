/* ============================================================
   shared/courses.js —— 孕妈课堂课程数据（内置兜底）
   - 分类：胎教 / 营养 / 产检 / 心理 / 分娩准备
   - 章节 kind=article 可直接阅读；locked=true 表示未解锁/更新中
   - 远端 manifest 提供 courses shard 时优先使用远端，本文件作为离线兜底
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

  var COURSE_CATEGORIES = [
    { id: 'taijiao', label: '胎教' },
    { id: 'nutrition', label: '营养' },
    { id: 'checkup', label: '产检' },
    { id: 'mind', label: '心理' },
    { id: 'birth', label: '分娩准备' }
  ];

  var COURSES = [
    {
      id: 'c-taijiao-01',
      category: 'taijiao',
      categoryLabel: '胎教',
      title: '胎教音乐怎么听才有效',
      subtitle: '每天 15 分钟，和宝宝建立声音联结',
      coverEmoji: '🎵',
      coverColor: '#8B6BE0',
      coverBg: '#F1EBFF',
      cover: '/images/covers/course-taijiao-01.png',
      lessons: 5,
      duration: '约 28 分钟',
      intro: '胎教不是把耳机贴在肚子上。课程从声音传导、时段选择和曲目节奏三个角度，讲清安全、有效的听法。',
      status: 'published',
      chapters: [
        { id: 'ch1', title: '宝宝什么时候能听见', kind: 'article', type: 'article', duration: '6 分钟', locked: false, pages: [
          { title: '声音怎么到宝宝耳朵', body: '孕 16～20 周左右，胎儿的听觉器官开始具备接收声音的能力；到孕 24 周后，对熟悉的声音会出现更稳定的反应。', image: '/courses/images/taijiao-ch1.png' },
          { title: '声音会被衰减', body: '声音会经过腹壁、羊水衰减，真正到达宝宝耳朵的音量比外界低很多。所以不需要把音量开大，更不要把耳机或音箱直接贴在肚皮上。' }
        ] },
        { id: 'ch2', title: '每天什么时候听', kind: 'article', type: 'article', duration: '5 分钟', locked: false, pages: [
          { title: '固定在胎动活跃的时段', body: '建议固定在宝宝胎动较活跃、你相对放松的时段，例如晚饭后或睡前。每天 1～2 次、每次 10～15 分钟即可。', image: '/courses/images/taijiao-ch2.png' },
          { title: '先让自己安定下来', body: '避免在你疲惫、饥饿或情绪波动很大时进行，胎教首先是让你自己安定下来。' }
        ] },
        { id: 'ch3', title: '选曲：慢一点、简单一点', kind: 'article', type: 'article', duration: '7 分钟', locked: false, pages: [
          { title: '慢一点、简单一点', body: '优先选择节奏平稳、旋律重复、动态范围不大的曲目，音量以正常交谈声略低为宜。' },
          { title: '重复比名气重要', body: '不必追求“名曲清单”，你和宝宝都舒服比曲目名气更重要。同一首曲子重复播放，更容易形成声音记忆。' }
        ] },
        { id: 'ch4', title: '音频精讲：三段式胎教流程', kind: 'audio', type: 'audio', duration: '45 秒试听', locked: false, src: '/courses/audio/taijiao-flow.wav', sec: 45 },
        { id: 'ch5', title: '视频跟练：胎教实操示范', kind: 'video', type: 'video', duration: '22 秒样片', locked: false, src: '/video/courses/taijiao-demo.mp4', sec: 22 }
      ]
    },
    {
      id: 'c-nutrition-01',
      category: 'nutrition',
      categoryLabel: '营养',
      title: '孕期三餐怎么吃更稳',
      subtitle: '不焦虑的日常搭配法',
      coverEmoji: '🥗',
      coverColor: '#3FC1A0',
      coverBg: '#E7F8F3',
      lessons: 3,
      duration: '约 18 分钟',
      intro: '把“该吃什么”拆成每一餐都能执行的搭配：主食、优质蛋白、蔬菜和奶类。适合没有特殊医嘱的普通孕妈作为日常参考。',
      status: 'published',
      chapters: [
        { id: 'ch1', title: '一餐的四个格子', kind: 'article', type: 'article', duration: '6 分钟', locked: false, body: '把餐盘想成四格：一格主食（优先全谷物）、一格优质蛋白（鱼禽蛋瘦肉豆制品）、两格蔬菜（深色占一半），再配一份奶或酸奶。先保证结构，再谈分量，比记热量更容易坚持。' },
        { id: 'ch2', title: '加餐不是零食自由', kind: 'article', type: 'article', duration: '5 分钟', locked: false, body: '两餐之间可以选择水果、坚果、酸奶或全麦面包，注意总量。含糖饮料和糕点容易让血糖波动，尽量留到偶尔解馋。孕吐明显时可以少量多餐，不必强求三餐整齐。' },
        { id: 'ch3', title: '这些情况要问医生', kind: 'article', type: 'article', duration: '7 分钟', locked: false, body: '妊娠糖尿病、贫血、高血压、双胎或体重增长异常时，饮食方案需要个体化。本课内容不能替代产检医生的医嘱；如果你正在补充铁剂、钙剂或其他营养剂，也请先和医生确认搭配。' }
      ]
    },
    {
      id: 'c-checkup-01',
      category: 'checkup',
      categoryLabel: '产检',
      title: '产检时间表与准备清单',
      subtitle: '每次去医院前，先看这一页',
      coverEmoji: '🩺',
      coverColor: '#5AA9F8',
      coverBg: '#E9F3FF',
      lessons: 4,
      duration: '约 24 分钟',
      intro: '按孕周梳理常见产检节点、需要带的材料和容易被忽略的问题。各地医院流程不同，具体以建档医院安排为准。',
      status: 'published',
      chapters: [
        { id: 'ch1', title: '孕早期：建档与基础检查', kind: 'article', type: 'article', duration: '6 分钟', locked: false, body: '确认宫内妊娠后，按医院要求建档。常见项目包括血常规、尿常规、肝肾功能、血型、传染病筛查和超声。提前问清是否需要空腹、是否要带夫妻双方证件。' },
        { id: 'ch2', title: '孕中期：筛查与排畸', kind: 'article', type: 'article', duration: '7 分钟', locked: false, body: '孕中期通常会有唐氏筛查或无创 DNA、系统超声等节点。检查有严格孕周窗口，建议提前预约。拿到报告先看结论和复查建议，有疑问直接问产检医生，不要只靠搜索。' },
        { id: 'ch3', title: '孕晚期：胎心监护与待产评估', kind: 'article', type: 'article', duration: '6 分钟', locked: false, body: '孕晚期产检频率增加，可能包含胎心监护、超声评估和骨盆测量。每次记录血压、体重和胎动变化。出现出血、破水、规律宫缩或胎动明显减少，应立即就医，不要等下一次产检。' },
        { id: 'ch4', title: '产检包里放什么', kind: 'article', type: 'article', duration: '5 分钟', locked: false, body: '建议常备：产检本、医保卡/就诊卡、既往报告、水和小零食、纸巾、充电宝。需要空腹的项目，提前准备检查后能立刻吃的食物。把下次产检时间当场记进日历。' }
      ]
    },
    {
      id: 'c-mind-01',
      category: 'mind',
      categoryLabel: '心理',
      title: '孕晚期情绪安放练习',
      subtitle: '给反复担心一个落脚点',
      coverEmoji: '🌙',
      coverColor: '#F5A623',
      coverBg: '#FFF1D6',
      lessons: 3,
      duration: '约 16 分钟',
      intro: '孕晚期的担心很常见。课程提供三个可以在家完成的小练习：身体扫描、担心清单和睡前降速。严重焦虑或持续失眠请及时寻求专业帮助。',
      status: 'published',
      chapters: [
        { id: 'ch1', title: '三分钟身体扫描', kind: 'article', type: 'article', duration: '5 分钟', locked: false, body: '找一个有支撑的坐姿或侧躺姿势，从额头开始，依次把注意力移到肩颈、胸口、腹部、双腿。每到一处，只描述感觉（紧、热、沉），不急着改变。三分钟后睁开眼睛，记录身体最放松的部位。' },
        { id: 'ch2', title: '把担心写成清单', kind: 'article', type: 'article', duration: '5 分钟', locked: false, body: '每天固定 10 分钟，把担心的事逐条写下，分成“现在能做的”和“现在做不了的”。能做的写一个最小动作，做不了的标记“等产检问医生”。写完后合上本子，不在睡前反复推演。' },
        { id: 'ch3', title: '睡前降速', kind: 'article', type: 'article', duration: '6 分钟', locked: false, body: '睡前一小时调暗灯光，减少刷手机。可以做 4 秒吸气、6 秒呼气的缓慢呼吸，重复 10 轮。如果 20 分钟仍睡不着，起身到暗处做安静的事，困了再回床，避免把床和焦虑绑定。' }
      ]
    },
    {
      id: 'c-birth-01',
      category: 'birth',
      categoryLabel: '分娩准备',
      title: '待产包：真正用得上的清单',
      subtitle: '按场景分袋，家属也能找到',
      coverEmoji: '🧳',
      coverColor: '#FF6B4A',
      coverBg: '#FFEFE8',
      lessons: 3,
      duration: '约 15 分钟',
      intro: '待产包不是越多越好。按“产房、住院、出院”三个场景分袋，贴上标签，让陪产家属也能快速找到。',
      status: 'published',
      chapters: [
        { id: 'ch1', title: '产房袋', kind: 'article', type: 'article', duration: '5 分钟', locked: false, body: '产房阶段通常只需要：产检资料、证件、手机和充电线、水杯、吸管、纸巾、一次性内裤和产褥垫（按医院要求）、少量补充能量的小零食。贵重物品交给家属保管。' },
        { id: 'ch2', title: '住院袋', kind: 'article', type: 'article', duration: '5 分钟', locked: false, body: '住院期间准备：哺乳内衣、宽松睡衣、防滑拖鞋、洗漱用品、毛巾、餐具、出院衣物。宝宝用品先按医院提供情况准备，不必一次囤太多尺码。' },
        { id: 'ch3', title: '出院与回家', kind: 'article', type: 'article', duration: '5 分钟', locked: false, body: '出院当天需要大人和宝宝的衣物、包被、证件和结算材料。回家前确认路线、电梯和家里温度，提前让家人把床品和待清洗衣物准备好。' }
      ]
    },
    {
      id: 'c-birth-02',
      category: 'birth',
      categoryLabel: '分娩准备',
      title: '分娩呼吸法跟练',
      subtitle: '课程制作中，可先收藏',
      coverEmoji: '🫁',
      coverColor: '#B4745A',
      coverBg: '#FBF1E9',
      lessons: 3,
      duration: '约 20 分钟',
      intro: '包含宫缩间歇呼吸、用力阶段呼吸和伴侣配合提示。音频与跟练视频正在制作，上线后可在这里直接练习。',
      status: 'coming',
      chapters: [
        { id: 'ch1', title: '宫缩间歇呼吸', kind: 'audio', type: 'audio', duration: '7 分钟', locked: true, lockText: '课程制作中，暂未解锁', body: '课程制作中：音频上线后可跟着练习宫缩间歇的缓慢呼吸节奏。' },
        { id: 'ch2', title: '用力阶段怎么呼吸', kind: 'video', type: 'video', duration: '7 分钟', locked: true, lockText: '课程制作中，暂未解锁', body: '课程制作中：跟练视频上线后可在本节观看用力阶段的呼吸示范。' },
        { id: 'ch3', title: '伴侣配合提示', kind: 'article', type: 'article', duration: '6 分钟', locked: true, lockText: '课程制作中，暂未解锁', body: '课程制作中：本节会整理伴侣在产程各阶段的配合方式与提醒话术。' }
      ]
    }
  ];

  function coursesByCategory(id) {
    if (!id || id === 'all') return COURSES.slice();
    return COURSES.filter(function (c) { return c.category === id; });
  }

  function findCourse(id) {
    for (var i = 0; i < COURSES.length; i++) if (COURSES[i].id === id) return COURSES[i];
    return null;
  }

  return {
    COURSE_CATEGORIES: COURSE_CATEGORIES,
    COURSES: COURSES,
    coursesByCategory: coursesByCategory,
    findCourse: findCourse
  };
});
