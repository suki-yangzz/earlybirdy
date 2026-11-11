/* ============================================================
   数据层：所有业务内容（曲目 / 卡片 / 视频 / 任务 / 商品）
   新增内容只需要改这个文件，不需要动任何 UI 代码。
   ============================================================ */
(function () {
  'use strict';
  window.YY = window.YY || {};

  var AUDIO_SAMPLES = [
    'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3'
  ];
  var VIDEO_SAMPLE = 'https://media.w3.org/2010/05/bunny/trailer.mp4';

  YY.CONTENT = {
    /* ---------- 音频曲目 ---------- */
    tracks: {
      pregnancy: [
        { id: 'p1', title: '小星星摇篮曲', artist: '钢琴版 · 3:24 · 舒缓 60 拍', emoji: '⭐', sec: 204, mood: '舒缓安抚' },
        { id: 'p2', title: '摇篮曲 · 勃拉姆斯', artist: '弦乐版 · 3:10 · 温柔入睡', emoji: '🌙', sec: 190, mood: '温柔入睡' },
        { id: 'p3', title: '雨滴与妈妈的呼吸', artist: '白噪音 · 4:05 · 安抚情绪', emoji: '🌧️', sec: 245, mood: '白噪音' },
        { id: 'p4', title: '森林清晨', artist: '轻音乐 · 3:32 · 放松心情', emoji: '🌿', sec: 212, mood: '轻音乐' },
        { id: 'p5', title: '月亮船', artist: '童声哼唱 · 2:58 · 爸妈一起听', emoji: '🚢', sec: 178, mood: '亲子共听' },
        { id: 'p6', title: '海浪轻轻摇', artist: '纯音乐 · 2:50 · 睡前固定曲', emoji: '🌊', sec: 170, mood: '睡前固定' }
      ],
      baby: [
        { id: 'b1', title: '白噪音 · 小雨', artist: '白噪音 · 5:00 · 哄睡神器', emoji: '🌧️', sec: 300, mood: '哄睡' },
        { id: 'b2', title: '摇篮曲 · 勃拉姆斯', artist: '弦乐版 · 3:10 · 温柔入睡', emoji: '🌙', sec: 190, mood: '安抚' },
        { id: 'b3', title: '小星星摇篮曲', artist: '钢琴版 · 3:24 · 舒缓 60 拍', emoji: '⭐', sec: 204, mood: '安抚' },
        { id: 'b4', title: '心跳与呼吸', artist: '模拟宫内声音 · 4:20 · 安全感', emoji: '💓', sec: 260, mood: '安全感' }
      ],
      toddler: [
        { id: 't1', title: '两只老虎', artist: '儿歌 · 2:10 · 跟着拍手', emoji: '🐯', sec: 130, mood: '亲子律动' },
        { id: 't2', title: '小星星', artist: '童声 · 2:40 · 一起哼唱', emoji: '⭐', sec: 160, mood: '亲子律动' },
        { id: 't3', title: '拍手律动', artist: '节奏游戏 · 3:05 · 大动作', emoji: '👏', sec: 185, mood: '节奏游戏' },
        { id: 't4', title: '摇篮曲 · 晚安', artist: '弦乐版 · 3:10 · 睡前固定', emoji: '🌙', sec: 190, mood: '睡前' },
        { id: 't5', title: '森林清晨', artist: '轻音乐 · 3:32 · 放松心情', emoji: '🌿', sec: 212, mood: '轻音乐' }
      ],
      preschool: [
        { id: 'k1', title: '睡前故事 · 小熊宝宝', artist: '主播朗读 · 6:20 · 亲子共听', emoji: '🐻', sec: 380, mood: '故事' },
        { id: 'k2', title: '三只小猪', artist: '故事音频 · 5:40 · 经典童话', emoji: '🐷', sec: 340, mood: '故事' },
        { id: 'k3', title: '小雨滴答', artist: '自然声音 · 4:05 · 安静下来', emoji: '🌧️', sec: 245, mood: '安静' },
        { id: 'k4', title: '月亮船', artist: '童声哼唱 · 2:58 · 睡前一首', emoji: '🚢', sec: 178, mood: '睡前' },
        { id: 'k5', title: '森林音乐会', artist: '轻音乐 · 3:45 · 认识乐器', emoji: '🌿', sec: 225, mood: '轻音乐' }
      ],
      kid: [
        { id: 'g1', title: '恐龙时代', artist: '百科音频 · 7:10 · 每天一集', emoji: '🦕', sec: 430, mood: '百科' },
        { id: 'g2', title: '星星为什么会发光', artist: '十万个为什么 · 5:30', emoji: '⭐', sec: 330, mood: '百科' },
        { id: 'g3', title: '古诗吟唱 · 静夜思', artist: '吟诵 · 3:20 · 跟读打卡', emoji: '🌕', sec: 200, mood: '古诗' },
        { id: 'g4', title: '森林探险日记', artist: '故事音频 · 6:15 · 自主收听', emoji: '🌲', sec: 375, mood: '故事' },
        { id: 'g5', title: '宇宙的声音', artist: '科普音频 · 4:40 · 想象力', emoji: '🪐', sec: 280, mood: '科普' }
      ]
    },

    /* ---------- 认知卡组 ---------- */
    decks: {
      baby: {
        title: '黑白卡追视',
        mono: true,
        topics: [
          {
            id: 'bw', name: '黑白卡', emoji: '🖤',
            cards: [
              { art: '🌞', word: '太阳', pinyin: 'tài yáng', tip: '把卡片放在宝宝眼前 20-30 厘米，慢慢左右移动。', fact: '高对比图案最容易吸引小宝宝的目光，追视能锻炼眼部肌肉。', sentence: '太阳公公，圆圆亮亮。' },
              { art: '🌙', word: '月亮', pinyin: 'yuè liang', tip: '一边移动卡片，一边轻轻说“月亮”。', fact: '黑白轮廓卡适合 0-3 个月的宝宝，每次 1-2 分钟就好。', sentence: '月亮弯弯，像小船。' },
              { art: '😊', word: '笑脸', pinyin: 'xiào liǎn', tip: '看到笑脸时，对宝宝也笑一个。', fact: '宝宝天生喜欢人脸图案，看到笑脸会更有安全感。', sentence: '笑一笑，真开心。' },
              { art: '🖐️', word: '小手', pinyin: 'xiǎo shǒu', tip: '轻轻碰碰宝宝的小手，告诉他“这是手”。', fact: '宝宝会用眼睛和手一起探索世界。', sentence: '小手小手，挥一挥。' },
              { art: '👣', word: '小脚', pinyin: 'xiǎo jiǎo', tip: '移动卡片时，可以摸摸宝宝的小脚丫。', fact: '追视时配合触觉，宝宝记得更牢。', sentence: '小脚小脚，蹬一蹬。' },
              { art: '⭐', word: '星星', pinyin: 'xīng xing', tip: '卡片移远一点，看宝宝会不会转眼睛找。', fact: '简单的几何图形，是很好的视觉启蒙素材。', sentence: '小星星，眨呀眨。' },
              { art: '❤️', word: '爱心', pinyin: 'ài xīn', tip: '说“妈妈爱你”，把卡片轻轻放下。', fact: '宝宝最先认识的是爸爸妈妈的脸和声音。', sentence: '爱心爱心，爱你呀。' },
              { art: '⚫', word: '圆点', pinyin: 'yuán diǎn', tip: '用手指点一点卡片上的圆点。', fact: '黑白圆点卡可以练习注视和视觉聚焦。', sentence: '小圆点，一个两个。' }
            ]
          }
        ]
      },

      toddler: {
        title: '图片认知卡',
        mono: false,
        topics: [
          {
            id: 'animal', name: '动物', emoji: '🐾',
            cards: [
              { art: '🐶', word: '小狗', pinyin: 'xiǎo gǒu', tip: '指着小狗的耳朵说：“摸一摸，软软的。”', fact: '小狗会“汪汪”叫，是很多小朋友认识的第一个动物朋友。', sentence: '小狗狗，汪——汪——' },
              { art: '🐱', word: '小猫', pinyin: 'xiǎo māo', tip: '学猫叫，让宝宝跟着“喵”一声。', fact: '小猫走路轻轻的，脚上有软软的肉垫。', sentence: '小猫咪，喵——喵——' },
              { art: '🐰', word: '小兔', pinyin: 'xiǎo tù', tip: '用手比两只长耳朵放在头顶。', fact: '小兔爱吃胡萝卜，跳起来一蹦一蹦的。', sentence: '小兔子，蹦——蹦——跳。' },
              { art: '🐼', word: '熊猫', pinyin: 'xióng māo', tip: '问宝宝：“熊猫身上哪里是黑的？”', fact: '熊猫最爱吃竹子，睡觉也抱着竹子。', sentence: '大熊猫，抱竹子。' },
              { art: '🦁', word: '狮子', pinyin: 'shī zi', tip: '一起张开手做出“大狮子”的样子。', fact: '狮子头上有长长的毛，叫声很响亮。', sentence: '大狮子，吼——' },
              { art: '🐟', word: '小鱼', pinyin: 'xiǎo yú', tip: '双手合起来游一游，学小鱼摆尾巴。', fact: '小鱼用鳃呼吸，在水里摇着尾巴游。', sentence: '小鱼小鱼，游呀游。' }
            ]
          },
          {
            id: 'fruit', name: '水果', emoji: '🍎',
            cards: [
              { art: '🍎', word: '苹果', pinyin: 'píng guǒ', tip: '摸摸苹果，说“圆圆的、滑滑的”。', fact: '苹果有红色和绿色，洗干净可以直接吃。', sentence: '红苹果，甜又香。' },
              { art: '🍌', word: '香蕉', pinyin: 'xiāng jiāo', tip: '让宝宝练习“剥”的动作。', fact: '香蕉弯弯像小船，剥开皮就能吃。', sentence: '香蕉弯弯，像小船。' },
              { art: '🍓', word: '草莓', pinyin: 'cǎo méi', tip: '数数草莓上有几颗小籽。', fact: '草莓红红的，头顶还有一片小叶子。', sentence: '草莓红红，酸又甜。' },
              { art: '🍉', word: '西瓜', pinyin: 'xī guā', tip: '拍一拍，听听“咚咚”的声音。', fact: '西瓜外面是绿色的，切开里面是红色的。', sentence: '大西瓜，圆滚滚。' },
              { art: '🍇', word: '葡萄', pinyin: 'pú tao', tip: '一颗一颗数给宝宝听。', fact: '葡萄一串串长在藤上，有紫色也有绿色。', sentence: '葡萄一串串，甜甜的。' },
              { art: '🍊', word: '橘子', pinyin: 'jú zi', tip: '闻一闻橘子的香味。', fact: '橘子皮一剥开，满手都是香香的味。', sentence: '小橘子，香喷喷。' }
            ]
          },
          {
            id: 'color', name: '颜色', emoji: '🎨',
            cards: [
              { art: '🔴', word: '红色', pinyin: 'hóng sè', tip: '在家里找一件红色的东西。', fact: '红灯亮了要停下来，红色提醒我们注意安全。', sentence: '红红的，像小苹果。' },
              { art: '🟡', word: '黄色', pinyin: 'huáng sè', tip: '指指香蕉和太阳，都是黄色。', fact: '黄色亮亮的，看着让人心情很好。', sentence: '黄黄的，像小太阳。' },
              { art: '🔵', word: '蓝色', pinyin: 'lán sè', tip: '看看窗外，天空是什么颜色？', fact: '蓝色像大海和天空，安安静静的。', sentence: '蓝蓝的，像小天空。' },
              { art: '🟢', word: '绿色', pinyin: 'lǜ sè', tip: '摸摸家里的绿叶盆栽。', fact: '绿色是树叶和小草的颜色，春天最多。', sentence: '绿绿的，像小叶子。' },
              { art: '🟠', word: '橙色', pinyin: 'chéng sè', tip: '拿出一个橘子对照着看。', fact: '橙色是红色和黄色混在一起变出来的。', sentence: '橙橙的，像小橘子。' },
              { art: '🟣', word: '紫色', pinyin: 'zǐ sè', tip: '一起找找紫色的衣服。', fact: '紫色像葡萄，也像傍晚的天空。', sentence: '紫紫的，像小葡萄。' }
            ]
          },
          {
            id: 'vehicle', name: '车子', emoji: '🚗',
            cards: [
              { art: '🚗', word: '汽车', pinyin: 'qì chē', tip: '学一学汽车“嘀嘀”的声音。', fact: '汽车有四个轮子，坐车要系好安全带。', sentence: '小汽车，嘀嘀嘀。' },
              { art: '🚌', word: '公交车', pinyin: 'gōng jiāo chē', tip: '问宝宝：“我们在哪里坐过它？”', fact: '公交车停站上下人，要拉好扶手。', sentence: '大公交，慢慢开。' },
              { art: '🚲', word: '自行车', pinyin: 'zì xíng chē', tip: '手转圈，学车轮转起来。', fact: '骑自行车要戴头盔，慢慢骑。', sentence: '自行车，转呀转。' },
              { art: '✈️', word: '飞机', pinyin: 'fēi jī', tip: '张开手臂当翅膀飞一飞。', fact: '飞机在天上飞，云在它的下面。', sentence: '小飞机，飞高高。' },
              { art: '🚂', word: '火车', pinyin: 'huǒ chē', tip: '一起发出“呜——”的声音。', fact: '火车在铁轨上跑，一节连着一节。', sentence: '小火车，呜呜呜。' },
              { art: '🚑', word: '救护车', pinyin: 'jiù hù chē', tip: '告诉宝宝它去帮助生病的人。', fact: '救护车是白色的，会发出“呜哇呜哇”的声音。', sentence: '救护车，快帮忙。' }
            ]
          }
        ]
      },

      preschool: {
        title: '字词认知卡',
        mono: false,
        topics: [
          {
            id: 'animals', name: '动物字', emoji: '🐾',
            cards: [
              { art: '🐱', word: '猫', pinyin: 'māo', tip: '让宝宝用“猫”组一个词：小猫、猫咪。', fact: '“猫”是左右结构，左边是反犬旁，代表动物。', sentence: '小猫喵喵叫。' },
              { art: '🐶', word: '狗', pinyin: 'gǒu', tip: '指着卡片问：“小狗在做什么？”', fact: '“狗”也是反犬旁，和动物有关。', sentence: '小狗看家门。' },
              { art: '🐦', word: '鸟', pinyin: 'niǎo', tip: '张开手当翅膀，飞一飞。', fact: '“鸟”字上面像鸟头，下面像鸟身。', sentence: '小鸟飞高高。' },
              { art: '🐟', word: '鱼', pinyin: 'yú', tip: '用小手摆一摆，学鱼游。', fact: '“鱼”是最早的象形字之一。', sentence: '小鱼水里游。' },
              { art: '🐰', word: '兔', pinyin: 'tù', tip: '比一比兔耳朵，念一遍“兔”。', fact: '“兔”字上面是角，下面是腿和尾巴。', sentence: '小兔蹦蹦跳。' },
              { art: '🐴', word: '马', pinyin: 'mǎ', tip: '一起学马跑步的声音。', fact: '“马”字像一匹侧着跑的马。', sentence: '小马跑得快。' }
            ]
          },
          {
            id: 'nature', name: '自然字', emoji: '🌿',
            cards: [
              { art: '⛰️', word: '山', pinyin: 'shān', tip: '用手比三座山峰。', fact: '“山”是象形字，像高低起伏的山峰。', sentence: '大山高高的。' },
              { art: '💧', word: '水', pinyin: 'shuǐ', tip: '摸摸水杯，说“水是凉凉的”。', fact: '“水”字中间像一条流动的河。', sentence: '喝水身体好。' },
              { art: '🌸', word: '花', pinyin: 'huā', tip: '闻一闻花香，念“花”。', fact: '“花”上面是草字头，代表植物。', sentence: '花儿真好看。' },
              { art: '🌿', word: '草', pinyin: 'cǎo', tip: '带宝宝摸摸楼下的草地。', fact: '“草”也是草字头，和植物有关。', sentence: '小草绿绿的。' },
              { art: '🌳', word: '树', pinyin: 'shù', tip: '比一比树干的粗细。', fact: '“树”左边是木字旁，代表木头。', sentence: '大树高高长。' },
              { art: '☁️', word: '云', pinyin: 'yún', tip: '抬头看看天，云像什么？', fact: '“云”字上面两横，像天空中的云层。', sentence: '白云飘呀飘。' }
            ]
          },
          {
            id: 'life', name: '生活字', emoji: '🏠',
            cards: [
              { art: '🚪', word: '门', pinyin: 'mén', tip: '走到家门口，指一指“门”。', fact: '“门”是象形字，左右两扇像门板。', sentence: '打开门回家。' },
              { art: '🪟', word: '窗', pinyin: 'chuāng', tip: '看看窗外有什么。', fact: '“窗”字上面是穴宝盖，和空间有关。', sentence: '窗户亮堂堂。' },
              { art: '📖', word: '书', pinyin: 'shū', tip: '翻开一本书，告诉宝宝“这是书”。', fact: '“书”字像一只手拿着笔在写。', sentence: '一起看本书。' },
              { art: '✏️', word: '笔', pinyin: 'bǐ', tip: '拿笔在纸上画一条线。', fact: '“笔”上面是竹字头，最早的笔是竹杆做的。', sentence: '用笔画小花。' },
              { art: '🪑', word: '桌', pinyin: 'zhuō', tip: '拍拍桌子，听听声音。', fact: '“桌”下面是木字底，说明是木头做的。', sentence: '桌子放饭碗。' },
              { art: '💡', word: '灯', pinyin: 'dēng', tip: '关灯再开灯，感受“亮”和“暗”。', fact: '“灯”左边是火字旁，最早的灯是火。', sentence: '开灯看得清。' }
            ]
          }
        ]
      },

      kid: {
        title: '识字闯关',
        mono: false,
        topics: [
          {
            id: 'spring', name: '春天字词', emoji: '🌱',
            cards: [
              { art: '🌱', word: '春', pinyin: 'chūn', tip: '让孩子说说春天和冬天有什么不一样。', fact: '“春”字上面是草字头，下面是日，表示太阳照着小草。', sentence: '春天来了，小草绿了。' },
              { art: '🌬️', word: '风', pinyin: 'fēng', tip: '用手扇一扇，感受风。', fact: '“风”字里面有“乂”，像风吹动的样子。', sentence: '春风吹，风筝飞。' },
              { art: '🌸', word: '花', pinyin: 'huā', tip: '让孩子组词：花朵、花园、开花。', fact: '草字头代表植物，下面是“化”。', sentence: '春天的花开了。' },
              { art: '🌿', word: '草', pinyin: 'cǎo', tip: '数一数“草”有几笔。', fact: '“草”是上下结构，上面是草字头。', sentence: '小草偷偷冒出来。' },
              { art: '🌳', word: '树', pinyin: 'shù', tip: '找一找家里的“木”字旁。', fact: '木字旁的字，大多和树木、木头有关。', sentence: '大树长出新叶子。' },
              { art: '🌧️', word: '雨', pinyin: 'yǔ', tip: '下雨时听一听雨声，念“雨”。', fact: '“雨”字里的四个点，像落下来的雨滴。', sentence: '春雨沙沙地下。' }
            ]
          },
          {
            id: 'science', name: '科学字词', emoji: '🔬',
            cards: [
              { art: '💡', word: '光', pinyin: 'guāng', tip: '让孩子找一找房间里发光的东西。', fact: '光让我们看见世界，太阳是最重要的光源。', sentence: '阳光照进房间。' },
              { art: '🔊', word: '声', pinyin: 'shēng', tip: '轻轻拍手，说说声音从哪里来。', fact: '声音是由振动产生的，可以在空气里传播。', sentence: '声音有高有低。' },
              { art: '⚡', word: '电', pinyin: 'diàn', tip: '提醒孩子：插座不能用手碰。', fact: '电能让灯亮、让风扇转，但也很危险。', sentence: '电让灯泡亮起来。' },
              { art: '🧲', word: '磁', pinyin: 'cí', tip: '用磁铁吸一吸回形针。', fact: '磁铁能吸铁，同极相斥、异极相吸。', sentence: '磁铁吸住小铁钉。' },
              { art: '💪', word: '力', pinyin: 'lì', tip: '推一推椅子，感受“用力”。', fact: '力可以让物体动起来，也可以让物体停下来。', sentence: '用力推小车。' },
              { art: '☁️', word: '云', pinyin: 'yún', tip: '和孩子一起给云起名字。', fact: '云是水蒸气遇冷凝结成的小水滴。', sentence: '白云变成雨落下来。' }
            ]
          }
        ]
      }
    },

    /* ---------- 视频剧集 ---------- */
    videos: {
      pregnancy: [],
      baby: [
        {
          id: 'be1', title: '趴一趴，练抬头', emoji: '🐣', sec: 150, value: 15,
          line: '“小脖子有力气，慢慢抬起来”',
          scenes: [
            { emoji: '🐣', line: '“趴在软软的垫子上”' },
            { emoji: '👶', line: '“小脑袋抬起来一点点”' },
            { emoji: '🌟', line: '“看到妈妈的笑脸啦”' },
            { emoji: '💪', line: '“每天练三次，越来越有力气”' }
          ]
        },
        {
          id: 'be2', title: '翻身小练习', emoji: '🔄', sec: 120, value: 15,
          line: '“从躺到趴，轻轻翻过来”',
          scenes: [
            { emoji: '👶', line: '“小手小脚动一动”' },
            { emoji: '🔄', line: '“妈妈轻轻扶着肩膀”' },
            { emoji: '🧸', line: '“玩具在前面等宝宝”' },
            { emoji: '🎉', line: '“翻过来啦，真棒”' }
          ],
          quiz: { q: '宝宝练习翻身时，谁可以轻轻帮忙？', options: ['妈妈', '陌生人', '小狗', '电视'], answer: 0 }
        },
        {
          id: 'be3', title: '追视小游戏', emoji: '👀', sec: 100, value: 10,
          line: '“小眼睛跟着卡片走”',
          scenes: [
            { emoji: '👀', line: '“妈妈把卡片举在眼前”' },
            { emoji: '🎴', line: '“慢慢往左边移”' },
            { emoji: '🎴', line: '“再慢慢往右边移”' },
            { emoji: '😊', line: '“宝宝的眼光跟上来啦”' }
          ]
        }
      ],
      toddler: [
        {
          id: 'te1', title: '两只老虎', emoji: '🐯', sec: 130, value: 15,
          line: '“两只老虎，两只老虎，跑得快”',
          scenes: [
            { emoji: '🐯', line: '“两只老虎跑得快”' },
            { emoji: '🎵', line: '“一只没有耳朵”' },
            { emoji: '🎶', line: '“一只没有尾巴”' },
            { emoji: '👏', line: '“真奇怪，真奇怪”' }
          ],
          quiz: { q: '歌里唱的是几只老虎？', options: ['一只', '两只', '三只', '四只'], answer: 1 }
        },
        {
          id: 'te2', title: '小星星', emoji: '⭐', sec: 160, value: 15,
          line: '“一闪一闪亮晶晶，满天都是小星星”',
          scenes: [
            { emoji: '🌙', line: '“天黑了，星星出来了”' },
            { emoji: '⭐', line: '“一闪一闪亮晶晶”' },
            { emoji: '✨', line: '“挂在天空放光明”' },
            { emoji: '🌟', line: '“好像许多小眼睛”' }
          ],
          quiz: { q: '小星星像什么？', options: ['小眼睛', '小嘴巴', '小耳朵', '小脚丫'], answer: 0 }
        },
        {
          id: 'te3', title: '数鸭子', emoji: '🦆', sec: 145, value: 15,
          line: '“门前大桥下，游过一群鸭”',
          scenes: [
            { emoji: '🦆', line: '“游过一群小鸭子”' },
            { emoji: '🌉', line: '“桥下水面真热闹”' },
            { emoji: '🔢', line: '“快来快来数一数”' },
            { emoji: '🐤', line: '“二四六七八”' }
          ]
        },
        {
          id: 'te4', title: '找朋友', emoji: '🤝', sec: 125, value: 15,
          line: '“找呀找呀找朋友，敬个礼呀握握手”',
          scenes: [
            { emoji: '🧒', line: '“找呀找呀找朋友”' },
            { emoji: '👋', line: '“敬个礼，握握手”' },
            { emoji: '🤗', line: '“你是我的好朋友”' },
            { emoji: '🌈', line: '“再见，下次再玩”' }
          ]
        }
      ],
      preschool: [
        {
          id: 'pe1', title: '小种子旅行记', emoji: '🌱', sec: 252, value: 15,
          line: '“我好想看看外面的世界呀”',
          scenes: [
            { emoji: '🌱', line: '“春天醒来，种子伸了个懒腰”' },
            { emoji: '🌧️', line: '“下雨啦，种子喝饱了水”' },
            { emoji: '🌻', line: '“长成黄色的小花”' },
            { emoji: '🦋', line: '“蝴蝶来做客，一起喝花蜜”' }
          ],
          quiz: { q: '小种子是谁帮它搬家的？', options: ['风', '小鱼', '小狗', '汽车'], answer: 0 }
        },
        {
          id: 'pe2', title: '下雨啦，喝饱水', emoji: '🌧️', sec: 236, value: 15,
          line: '“咕嘟咕嘟，我喝饱啦”',
          scenes: [
            { emoji: '🌱', line: '“种子在土里等雨”' },
            { emoji: '🌧️', line: '“雨滴落在泥土上”' },
            { emoji: '💧', line: '“咕嘟咕嘟喝饱水”' },
            { emoji: '🌿', line: '“小芽冒出来了”' }
          ],
          quiz: { q: '小种子长大需要什么？', options: ['糖果', '水和阳光', '电视', '玩具'], answer: 1 }
        },
        {
          id: 'pe3', title: '我变成一朵小花', emoji: '🌻', sec: 228, value: 15,
          line: '“快看，我开出黄色的小花啦”',
          scenes: [
            { emoji: '🌿', line: '“小芽一天天长高”' },
            { emoji: '🌞', line: '“太阳照得暖暖的”' },
            { emoji: '🌻', line: '“开出黄色的小花”' },
            { emoji: '💛', line: '“花儿对着太阳笑”' }
          ],
          quiz: { q: '小种子最后变成了什么？', options: ['一棵大树', '一朵花', '一块石头', '一只蝴蝶'], answer: 1 }
        },
        {
          id: 'pe4', title: '蝴蝶来做客', emoji: '🦋', sec: 244, value: 15,
          line: '“你好呀，小蝴蝶，来喝点花蜜吧”',
          scenes: [
            { emoji: '🌻', line: '“小花在风里摇”' },
            { emoji: '🦋', line: '“蝴蝶飞过来啦”' },
            { emoji: '🍯', line: '“一起喝甜甜的花蜜”' },
            { emoji: '🌸', line: '“蝴蝶说：谢谢你”' }
          ],
          quiz: { q: '谁来找小花玩？', options: ['小蝴蝶', '小螃蟹', '小蚂蚁', '小乌龟'], answer: 0 }
        },
        {
          id: 'pe5', title: '秋天的礼物', emoji: '🍂', sec: 218, value: 15,
          line: '“我把种子送给风，让它去旅行”',
          scenes: [
            { emoji: '🍂', line: '“秋天到了，叶子黄了”' },
            { emoji: '🌰', line: '“小花结出了种子”' },
            { emoji: '🌬️', line: '“风把种子带走”' },
            { emoji: '🍁', line: '“种子去很远的地方旅行”' }
          ],
          quiz: { q: '种子是怎么去旅行的？', options: ['坐火车', '被风吹走', '游过去', '跳过去'], answer: 1 }
        },
        {
          id: 'pe6', title: '小种子又出发', emoji: '🌿', sec: 231, value: 15,
          line: '“明年春天，我们再见面哦”',
          scenes: [
            { emoji: '❄️', line: '“冬天种子睡在土里”' },
            { emoji: '🌱', line: '“春天又醒过来”' },
            { emoji: '🌞', line: '“新一轮旅行开始”' },
            { emoji: '🌻', line: '“明年春天，我们再见面”' }
          ],
          quiz: { q: '故事讲的是什么？', options: ['小种子的成长', '修房子', '做蛋糕', '踢足球'], answer: 0 }
        }
      ],
      kid: [
        {
          id: 'ke1', title: '火山喷发小实验', emoji: '🌋', sec: 240, value: 25,
          line: '“小苏打遇到白醋，泡泡喷出来啦”',
          scenes: [
            { emoji: '🧪', line: '“准备好小苏打和白醋”' },
            { emoji: '🌋', line: '“把材料放进火山口”' },
            { emoji: '💥', line: '“咕嘟咕嘟，泡泡喷发了”' },
            { emoji: '🔍', line: '“这就是酸碱反应”' }
          ],
          quiz: { q: '小实验里让泡泡喷出来的是？', options: ['小苏打+白醋', '糖+盐', '水+油', '牛奶+果汁'], answer: 0 }
        },
        {
          id: 'ke2', title: '静电魔法', emoji: '⚡', sec: 210, value: 20,
          line: '“气球在头发上蹭一蹭，能吸住纸片吗？”',
          scenes: [
            { emoji: '🎈', line: '“气球在头发上摩擦”' },
            { emoji: '🧲', line: '“纸片被吸过来啦”' },
            { emoji: '⚡', line: '“这就是静电”' },
            { emoji: '💡', line: '“冬天脱毛衣也会这样”' }
          ],
          quiz: { q: '气球摩擦后能吸住什么？', options: ['小纸片', '铁钉', '玻璃球', '木块'], answer: 0 }
        },
        {
          id: 'ke3', title: '彩虹牛奶', emoji: '🌈', sec: 220, value: 20,
          line: '“一滴洗洁精，颜色自己跑起来”',
          scenes: [
            { emoji: '🥛', line: '“把牛奶倒进盘子”' },
            { emoji: '🎨', line: '“滴上几种颜色的色素”' },
            { emoji: '💧', line: '“中间滴一滴洗洁精”' },
            { emoji: '🌈', line: '“颜色像彩虹一样散开”' }
          ],
          quiz: { q: '彩虹牛奶实验需要用到？', options: ['洗洁精', '沙子', '面团', '石头'], answer: 0 }
        },
        {
          id: 'ke4', title: '纸桥大力士', emoji: '🌉', sec: 200, value: 20,
          line: '“一张纸也能托起很多硬币”',
          scenes: [
            { emoji: '📄', line: '“一张平铺的纸托不住”' },
            { emoji: '📐', line: '“把纸折成波浪形”' },
            { emoji: '🪙', line: '“放上硬币试试看”' },
            { emoji: '🌉', line: '“纸桥变成大力士啦”' }
          ],
          quiz: { q: '怎样让纸桥更能承重？', options: ['折成波浪形', '弄湿它', '撕成碎片', '揉成团'], answer: 0 }
        }
      ]
    },

    /* ---------- 每日任务 ---------- */
    tasks: {
      pregnancy: [
        { id: 'p1', emoji: '🎧', title: '听胎教音乐 15 分钟', sub: '安抚情绪 · 推荐《小星星摇篮曲》', value: 20, go: 'audio' },
        { id: 'p2', emoji: '🚶', title: '散步 2000 步', sub: '饭后慢走，注意保暖', value: 20 },
        { id: 'p3', emoji: '📖', title: '给宝宝读一个小故事', sub: '爸爸也可以来读一段', value: 15, go: 'audio' },
        { id: 'p4', emoji: '💧', title: '喝够 8 杯水', sub: '每次点一下，记录一杯', value: 10 },
        { id: 'p5', emoji: '😴', title: '睡前 10 分钟放松呼吸', sub: '跟着音频做，更好入睡', value: 15, go: 'audio' }
      ],
      baby: [
        { id: 'b1', emoji: '🖤', title: '黑白卡追视 3 分钟', sub: '距离 20-30 厘米，左右慢慢移动', value: 20, go: 'flashcards' },
        { id: 'b2', emoji: '🧸', title: '趴一趴练抬头', sub: '每次 1 分钟，做 3 次', value: 20, go: 'video' },
        { id: 'b3', emoji: '🎶', title: '听摇篮曲哄睡', sub: '固定一首，宝宝会记住', value: 15, go: 'audio' },
        { id: 'b4', emoji: '🤱', title: '抚触按摩 5 分钟', sub: '手捂热了再轻轻按', value: 15 },
        { id: 'b5', emoji: '🗣️', title: '和宝宝说说话', sub: '做什么就说什么', value: 10 }
      ],
      toddler: [
        { id: 't1', emoji: '🐶', title: '图片认物卡 10 张', sub: '点一点会发音，宝宝自己也能玩', value: 20, go: 'flashcards' },
        { id: 't2', emoji: '🎵', title: '亲子儿歌律动', sub: '《两只老虎》边唱边拍手', value: 20, go: 'audio' },
        { id: 't3', emoji: '🌳', title: '户外活动 15 分钟', sub: '晒晒太阳，摸摸树叶', value: 20 },
        { id: 't4', emoji: '🥕', title: '自己吃完一顿饭', sub: '弄脏也没关系，鼓励为主', value: 15 },
        { id: 't5', emoji: '📚', title: '睡前故事一本', sub: '《小熊宝宝》系列任意一本', value: 15, go: 'video' }
      ],
      preschool: [
        { id: 'k1', emoji: '🎬', title: '看一集成长动画', sub: '《小种子旅行记》每集 8 分钟', value: 20, go: 'video' },
        { id: 'k2', emoji: '🔤', title: '认识 5 个字词卡', sub: '带拼音，跟着读一遍', value: 20, go: 'flashcards' },
        { id: 'k3', emoji: '✏️', title: '画一幅今天的画', sub: '画完拍照存进成长册', value: 15 },
        { id: 'k4', emoji: '🧹', title: '帮忙做一件小事', sub: '收玩具或摆碗筷', value: 15 },
        { id: 'k5', emoji: '💬', title: '复述今天的故事', sub: '问问“谁最勇敢”', value: 20, go: 'video' }
      ],
      kid: [
        { id: 'g1', emoji: '🌋', title: '做火山喷发小实验', sub: '小苏打 + 白醋，大人陪着', value: 25, go: 'video' },
        { id: 'g2', emoji: '📖', title: '自己读 10 分钟书', sub: '选一本想看的，不用家长陪', value: 20 },
        { id: 'g3', emoji: '🔤', title: '识字闯关 1 关', sub: '今天的新字：春 雨 花 草 树', value: 20, go: 'flashcards' },
        { id: 'g4', emoji: '🏃', title: '户外运动 30 分钟', sub: '跳绳或骑车都可以', value: 15 },
        { id: 'g5', emoji: '✍️', title: '写三句话日记', sub: '今天最高兴的一件事', value: 15 }
      ]
    },

    /* ---------- 商品 ---------- */
    categories: [
      { id: 'all', label: '全部' },
      { id: 'card', label: '认知卡' },
      { id: 'toy', label: '成长玩具' },
      { id: 'book', label: '绘本故事' },
      { id: 'course', label: '亲子课程' },
      { id: 'parent', label: '家长专区' }
    ],
    products: [
      {
        id: 1, cat: 'card', title: '森林动物认知卡', sub: '30 张 · 会发音', price: 500, emoji: '🦊',
        bg: '#FFEFE8', desc: '30 张高对比动物卡片，扫码即可听标准发音。适合 6 个月到 3 岁，亲子边指边读，每天认 5 张最轻松。',
        tags: ['6个月-3岁', '亲子共读', '带发音']
      },
      {
        id: 2, cat: 'toy', title: '小熊软胶积木', sub: '6 块 · 可咬磨牙', price: 1200, emoji: '🧸',
        bg: '#FFF1D6', desc: '食品级软胶材质，6 块大颗粒积木，圆角无毛刺。可以捏、可以咬、也可以叠高高，锻炼小手抓握。',
        tags: ['0-3岁', '安全材质', '抓握练习']
      },
      {
        id: 3, cat: 'book', title: '《晚安小熊》绘本', sub: '硬壳纸板书 1 本', price: 800, emoji: '📚',
        bg: '#E9F3FF', desc: '厚纸板设计，撕不烂、可擦洗。温馨的睡前故事，跟着小熊一起刷牙、盖被子、关灯说晚安。',
        tags: ['睡前故事', '纸板书', '亲子共读']
      },
      {
        id: 4, cat: 'course', title: '亲子律动体验课', sub: '线上 30 分钟 1 节', price: 1500, emoji: '🎵',
        bg: '#F1EBFF', desc: '专业早教老师带唱带跳，30 分钟亲子律动课。需要家长一起参与，跟着音乐拍手、转圈、学小动物。',
        tags: ['线上课', '亲子互动', '音乐启蒙']
      },
      {
        id: 5, cat: 'card', title: '水果蔬菜字词卡', sub: '50 张 · 带拼音', price: 900, emoji: '🍎',
        bg: '#FFEFE8', desc: '50 张水果蔬菜字词卡，正面图形、背面汉字和拼音。适合 3-6 岁识字启蒙，可配合 App 内卡片页一起使用。',
        tags: ['3-6岁', '带拼音', '识字启蒙']
      },
      {
        id: 6, cat: 'toy', title: '磁力拼图小火车', sub: '适合 3 岁以上', price: 1800, emoji: '🚂',
        bg: '#E7F8F3', desc: '磁力连接的小火车，可以自由拼成不同长度。车厢颜色鲜艳，边玩边认识颜色和排序。',
        tags: ['3岁以上', '磁力拼装', '颜色认知']
      },
      {
        id: 7, cat: 'book', title: '睡前故事音频包', sub: '20 个故事 · 永久听', price: 600, emoji: '🎧',
        bg: '#E9F3FF', desc: '20 个精选睡前故事，专业主播朗读，永久收听。包含《小熊宝宝》《月亮船》等经典内容，每天一个不重样。',
        tags: ['睡前故事', '音频', '永久有效']
      },
      {
        id: 8, cat: 'parent', title: '育儿专家 1 对 1', sub: '30 分钟线上咨询', price: 2400, emoji: '👩‍⚕️',
        bg: '#FFF1D6', desc: '30 分钟一对一线上咨询，可聊睡眠、喂养、情绪和早教安排。咨询前会先收集你的问题，给出可执行的小建议。',
        tags: ['家长专区', '1对1', '线上咨询']
      },
      {
        id: 9, cat: 'parent', title: '成长记录手册', sub: '打印版 · 顺丰包邮', price: 700, emoji: '📒',
        bg: '#F1EBFF', desc: '一本可以写、可以贴照片的成长记录手册。包含每月里程碑、第一次记录页和亲子活动清单。',
        tags: ['家长专区', '记录成长', '包邮']
      },
      {
        id: 10, cat: 'toy', title: '洗澡小黄鸭 3 只', sub: '防水 · 会叫', price: 480, emoji: '🦆',
        bg: '#E7F8F3', desc: '三只不同大小的洗澡小黄鸭，捏一捏会叫，防水材质不易进水。洗澡时间也能变成小游戏。',
        tags: ['0-3岁', '洗澡玩具', '防水']
      }
    ]
  };

  /* 为演示媒体统一补充公开示例音源/视频源，避免依赖本地大文件 */
  Object.keys(YY.CONTENT.tracks).forEach(function (stageKey) {
    YY.CONTENT.tracks[stageKey].forEach(function (track, i) {
      if (!track.src) track.src = AUDIO_SAMPLES[i % AUDIO_SAMPLES.length];
    });
  });
  Object.keys(YY.CONTENT.videos).forEach(function (stageKey) {
    YY.CONTENT.videos[stageKey].forEach(function (video) {
      if (!video.src) video.src = VIDEO_SAMPLE;
    });
  });
})();
