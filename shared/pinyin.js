/* ============================================================
   shared/pinyin.js —— 汉字拼音首字母（离线静态表）
   - 表由 ICU 拼音排序离线生成，覆盖当前内置内容用字
   - 运行时零依赖，Node / 浏览器 / React Native 结果一致
   - 未收录的字返回原字符，搜索会自然退回中文子串匹配
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

  /* 首字母 → 该组汉字。顺序无关，加载时拆成单字映射 */
  var GROUPS = {
    a: '安案爱暗按',
    b: '版勃白爸宝播百把比部边不卜蹦抱摆巴剥变傍臂膀帮病表遍步杯板本笔脖棒八饱搬吧被备玻币波保标背包碑伴别',
    c: '晨船唱纯次触材吃出草串窗春橙车翅词侧粗层闯吹从产传插磁斥成醋蹭擦彩承存册程刺参菜常楚超称城错场处持',
    d: '滴的定动大读典答代打对锻到得蹬点单朵多第垫顶咚都东灯嘀带戴当低地底冬电但钉袋等蝶嘟蛋倒段顿叠度肚待兑调掉达懂店',
    e: '儿耳二',
    f: '抚放发分服扶飞反峰伏翻饭风房方法幅复丰防腹',
    g: '钢共固宫感歌跟故光个古高公更告狗果干瓜滚给过轨构关盖杆怪挂咕龟糕够鼓敢官',
    h: '缓呼哼海哄虎话会黑合好欢和挥何很胡吼滑红还黄混火护河喝花横活回户画孩化蝴后虹或绘厚互汉含换哈号获',
    j: '节经静集记肌就睛界脚觉简几聚焦叫净接蕉橘家件交机救结角间见进极肩具举晶敬讲碱洁精己教荐距今句即胶积级计久建阶急纠剧坚及',
    k: '恐科卡廓看开可颗空盔快口客棵块筷课壳困',
    l: '篮拉乐林亮浪两老律朗来龙力厘炼轮脸牢练路萝里绿了蓝连凉流楼落冷啦六礼旅懒料璃录离励列粒烂聊量临累立类',
    m: '姆妈模每么米慢目摸蒙猫喵咪毛莓面满们忙门马木明冒名陌没蜜蚂魔吗摩码磨眠秒幕',
    n: '拟内能你哪拿鸟念凝趴脑闹泥暖年哦牛奶弄捏',
    o: '哦',
    p: '拍频普片碰配朋苹皮葡喷盆跑旁匹飘泡盘平铺拼陪品排屏',
    q: '曲琴情清轻起亲前器全启切汽圈骑去犬气奇桥群秋球区期欠趣',
    r: '柔入然认日容肉人软让热揉任',
    s: '舒斯睡森松声神手事三首识时什十诗思诵收视说适生诉他是索世素上身狮双鳃水色数酸树四它山扇书受示沙谁闪伸石送始实苏散士试湿撕碎晒述绳扫岁食设刷师蔬使顺商守式涉',
    t: '童听跳天探太图兔头甜萄藤停提铁腿条体抬堂偷同推躺土糖踢脱团托胎题贴眺替',
    w: '温晚为万弯物汪问尾外闻味我呜哇碗危玩往握乌捂完无喂文望务',
    x: '小星弦吸绪心戏熊下险想象像笑喜丫形先习学响洗香西醒系行细穴写线新相许需谢蟹修选兴馨厢鲜序效询休息信',
    y: '摇雨与音月一游吟夜宇阳眼右移易引圆也有用以远呀友样鱼又叶颜要意衣云园源由异椅遇越鸭腰芽蚁验应盐油硬勇运咬牙业页艳永育养议印邮孕仪阅愿',
    z: '噪子只着奏作主猪自宙追在左最钟真这转找眨指注知走长竹张做直籽紫栽照坐站助字组早之座中植纸桌再筝重振针住蒸嘴种怎足准汁折脏专质抓正装咨执澡周值攒'
  };

  var OVERRIDES = { '七': 'q', '这': 'z', '只': 'z', '长': 'c' };

  var TABLE = Object.create(null);
  Object.keys(GROUPS).forEach(function (initial) {
    var chars = GROUPS[initial];
    for (var i = 0; i < chars.length; i++) TABLE[chars.charAt(i)] = initial;
  });

  function isHan(ch) { return /[\u4e00-\u9fff]/.test(ch); }

  /** 单字首字母；非汉字原样返回（小写） */
  function initialOf(ch) {
    if (!ch) return '';
    if (OVERRIDES[ch]) return OVERRIDES[ch];
    if (isHan(ch)) return TABLE[ch] || ch;
    return ch.toLowerCase();
  }

  /** 整串首字母：汉字取首字母，英文/数字保留，标点空白跳过 */
  function initials(text) {
    var out = '';
    var s = String(text == null ? '' : text);
    for (var i = 0; i < s.length; i++) {
      var ch = s.charAt(i);
      /* 只保留汉字、拉丁字母与数字，避免标点/表情污染首字母串 */
      if (!/[\u4e00-\u9fffa-zA-Z0-9]/.test(ch)) continue;
      out += initialOf(ch);
    }
    return out.toLowerCase();
  }

  return { pinyinInitialOf: initialOf, pinyinInitials: initials };
});
