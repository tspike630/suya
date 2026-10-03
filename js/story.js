function say(who, text, mode = "box") {
  return { op: "say", who, text, mode };
}

function lines(who, texts, mode = "box") {
  return texts.map((text) => say(who, text, mode));
}

function choice(who, prompt, options) {
  return { op: "choice", who, prompt, options };
}

export const items = {
  ruler: {
    name: "八尺戒尺",
    text: "八尺长的戒尺，收不短。物理课上量得出谁在走神，也量得出这间屋子有多窄。",
  },
  hetianxia: {
    name: "抽不完的和天下",
    text: "一包和天下。抽掉一根，盒子里又是满的。",
  },
  key: {
    name: "钥匙",
    text: "看似有些老旧的一把钥匙，不知是谁落下的。",
  },
};

export const startingItems = ["ruler", "hetianxia"];

export const people = {
  粟牙: { portrait: "assets/characters/suya.png", sprite: "assets/sprites/suya.png" },
  域零: { portrait: "assets/characters/yuling.png", sprite: "assets/sprites/yuling.png" },
  雪兰: { portrait: "assets/characters/xuelan.png", sprite: "assets/sprites/xuelan.png" },
  林桔: { portrait: "assets/characters/linju.png", sprite: "assets/sprites/linju.png" },
  兮: { portrait: "assets/characters/xi.png" },
};

export const tracks = {
  title: "assets/bgm/theme.mp3",
  ward: "assets/bgm/whisper.mp3",
  corridor: "assets/bgm/obe.mp3",
  yard: "assets/bgm/crystal.mp3",
  star: "assets/bgm/theme.mp3",
};

export const scenes = {
  ward: {
    name: "雪兰的病房",
    rain: "window",
    spots: [
      { id: "board", label: "备课", x: 14, y: 38, script: "instruction", kind: "object" },
      { id: "kit", label: "戒尺和烟", script: "kit", kind: "person", who: "粟牙" },
      { id: "yuling", label: "域零", x: 70, y: 62, script: "wake", kind: "person", who: "域零" },
      { id: "bed", label: "病床", x: 28, y: 70, script: "bed", kind: "object" },
      { id: "to-corridor", label: "走廊", x: 88, y: 48, go: "corridor", kind: "door" },
    ],
  },
  corridor: {
    name: "三楼走廊",
    rain: "soft",
    spots: [
      { id: "clock", label: "时钟", x: 38, y: 30, script: "clock", kind: "object" },
      { id: "ac", label: "空调", x: 22, y: 34, script: "ac", kind: "object" },
      { id: "glass", label: "玻璃", x: 74, y: 36, script: "glass", kind: "object" },
      { id: "stain", label: "告示", x: 58, y: 32, script: "stain", kind: "object" },
      { id: "painting", label: "画", x: 30, y: 52, script: "painting", kind: "object" },
      { id: "xi", label: "兮的病房", x: 50, y: 42, script: "xiDoor", kind: "door" },
      { id: "rhythm", label: "空走廊", x: 62, y: 72, script: "shuttle", kind: "object" },
      { id: "kit", label: "戒尺和烟", script: "kit", kind: "person", who: "粟牙" },
      { id: "to-ward", label: "雪兰的病房", x: 16, y: 58, go: "ward", kind: "door" },
      { id: "to-yard", label: "后院", x: 84, y: 58, go: "yard", kind: "door" },
    ],
  },
  yard: {
    name: "后院",
    rain: "soft",
    spots: [
      { id: "to-hall", label: "回走廊", x: 12, y: 58, go: "corridor", kind: "door" },
      { id: "wall", label: "围墙", x: 50, y: 36, script: "wall", kind: "object" },
      { id: "yuling-yard", label: "域零", x: 36, y: 64, script: "yulingRain", kind: "person", who: "域零", hide: "yuling-yard" },
      { id: "linju", label: "林桔", x: 68, y: 66, script: "linju", kind: "person", who: "林桔" },
      { id: "kit", label: "戒尺和烟", script: "kit", kind: "person", who: "粟牙" },
      { id: "key", label: "地上的东西", x: 58, y: 80, script: "yardKey", kind: "object", hide: "key" },
    ],
  },
  star: {
    name: "画中世界",
    rain: "soft",
    spots: [
      { id: "back-hall", label: "回走廊", x: 10, y: 84, go: "corridor", kind: "door" },
      { id: "mild", label: "细雨", x: 28, y: 86, weather: "mild", kind: "object" },
      { id: "heavy", label: "暴雨", x: 78, y: 86, weather: "heavy", kind: "object" },
      { id: "yushit", label: "域零", x: 18, y: 46, script: "yushit", kind: "echo", seen: "yushit", who: "域零" },
      { id: "yustar2", label: "域零 · 雷", x: 32, y: 30, script: "yustar2", kind: "echo", seen: "yustar2", who: "域零" },
      { id: "yustar3", label: "域零 · 星", x: 14, y: 20, script: "yustar3", kind: "echo", seen: "yustar3", who: "域零" },
      { id: "yustar4", label: "域零 · 雨", x: 34, y: 16, script: "yustar4", kind: "echo", seen: "yustar4", who: "域零" },
      { id: "yustar5", label: "雪兰 · 一", x: 24, y: 72, script: "yustar5", kind: "echo", seen: "yustar5", who: "雪兰" },
      { id: "yustar6", label: "雪兰 · 二", x: 36, y: 62, script: "yustar6", kind: "echo", seen: "yustar6", who: "雪兰" },
      { id: "yustar7", label: "雪兰 · 三", x: 48, y: 52, script: "yustar7", kind: "echo", seen: "yustar7", who: "雪兰" },
      { id: "yustar8", label: "雪兰 · 四", x: 60, y: 42, script: "yustar8", kind: "echo", seen: "yustar8", who: "雪兰" },
      { id: "yustar9", label: "雪兰 · 五", x: 72, y: 32, script: "yustar9", kind: "echo", seen: "yustar9", who: "雪兰" },
      { id: "yustar10", label: "雪兰 · 六", x: 84, y: 22, script: "yustar10", kind: "echo", seen: "yustar10", who: "雪兰" },
      { id: "xstar", label: "兮", x: 50, y: 24, script: "xstar", kind: "echo", seen: "xstar", who: "兮" },
      { id: "toyou", label: "？", x: 64, y: 14, script: "toyou", kind: "echo", seen: "toyou" },
      { id: "kit", label: "戒尺和烟", script: "kit", kind: "person", who: "粟牙" },
    ],
  },
};

export const scripts = {
  wake: [
    say("域零", "粟牙，粟牙..."),
    say("域零", "醒醒..."),
    {
      op: "if",
      key: "test",
      equals: true,
      then: [
        say("域零", "你还有一叠卷子没改..."),
        say("域零", "你还不能睡..."),
        { op: "flag", key: "test", value: false },
      ],
      else: [
        say("粟牙", "我这是...？"),
        say("域零", "已经是晚上了，粟牙。", "immerse"),
        say("域零", "教案压在八尺戒尺下面。那包和天下还是满的。", "immerse"),
        say("域零", "物理老师的聘书...还有三个月就要到期了吧？", "immerse"),
        say("粟牙", "嗯...是啊。"),
        say("粟牙", "戒尺还是八尺。烟也还抽不完。"),
        say("粟牙", "这么说来，所剩的时间不多了。"),
        { op: "flag", key: "test", value: true },
      ],
    },
  ],
  bed: [
    say("旁白", "（看起来是一张很舒适的病床。八尺戒尺靠在床边，比床还长。）"),
    choice("旁白", "在床上休息一下吗？", [
      {
        label: "休息",
        then: [
          say("旁白", "你感到放松，视野渐渐地消失...", "immerse"),
          { op: "wait", ms: 1600, fx: "sleep" },
          say("旁白", "虽然但是不是在这里保存存档的呢。", "immerse"),
        ],
      },
      { label: "算了", then: [] },
    ]),
  ],
  instruction: [
    {
      op: "doc",
      title: "物理教师备忘",
      lines: [
        "粟牙。物理教师。",
        "随身两件：八尺戒尺，抽不完的和天下。",
        "戒尺收不短。烟抽完了还会再满。课不会。",
        "讲完牛顿，人可以先走。重力不等人。",
      ],
    },
  ],
  clock: [say("", "时钟停在了3点00分。这个点，物理课该下课了。", "spy")],
  ac: [say("", "空调里好像散发出某些奇怪的味道...像是和天下，又湿了一层。", "spy")],
  kit: [
    say("粟牙", "当物理老师，我只认两样东西。"),
    say("粟牙", "八尺戒尺。抽不完的和天下。"),
    { op: "item", id: "ruler" },
    { op: "item", id: "hetianxia" },
  ],
  glass: [say("", "玻璃上的反光里似乎有着些异样的东西...", "spy")],
  stain: [say("", "上面的字被褐色液体遮盖住了...", "spy")],
  xiDoor: [say("", "兮的病房", "spy")],
  wall: [say("", "明明墙外是一条河，放眼望去却看不见彼岸。", "spy")],
  painting: [
    say("", "看起来是一副普通的画。", "spy"),
    say("", "但是仔细一看好像有个奇怪的通道...", "spy"),
    { op: "wait", ms: 1500, fx: "paint" },
    choice("", "是否从通道进入？", [
      { label: "是", then: [{ op: "go", to: "star" }] },
      {
        label: "否",
        then: [say("", "这幅画有些蹊跷地仿佛告诉你下次再来。", "spy")],
      },
    ]),
  ],
  shuttle: [
    ...lines("旁白", [
      "即将进行“走廊蹦迪”（划掉）游戏测试。",
      "当屏幕下方的圆圈移动到左侧的红色横杆时（踩点时机）。",
      "按下Z键/空格键，或单击鼠标/轻触屏幕。",
      "那么，我们开始吧。",
    ]),
    { op: "rhythm" },
  ],
  yardKey: [
    say("", "这里好像有着什么东西...", "spy"),
    { op: "hide", id: "key" },
    { op: "item", id: "key" },
  ],
  yulingRain: [
    say("域零", "粟牙...？你也来这里避雨？"),
    ...lines("粟牙", [
      "跑几步就到室内了，你怎么在树下避雨呢，快进来吧。",
      "况且，这雨下个不停，根本不停歇...",
      "这些植物倒好，似乎丝毫没有受到影响。",
    ]),
    say("域零", "没关系，我喜欢这样看着这个院子。"),
    ...lines("粟牙", ["风也挺大的，把雨给刮进来了。", "你的衣服都湿透了。"]),
    ...lines("域零", [
      "先关心你自己吧，粟牙。",
      "我不在意...",
      "这场雨就像是在为我哭泣一样...",
      "我感到很安慰。",
      "怎么说呢，这个院子的景色总能让人回想起过去。",
      "靠着这棵大树，我在想。",
      "她是不是也靠着大树避雨呢？",
      "她在哪里？",
      "唉...",
    ]),
    say("粟牙", "这把伞给你。戒尺太长，撑不进来。"),
    say("域零", "你又点了一根和天下。"),
    say("粟牙", "抽不完。"),
    ...lines("域零", ["不必了，你自己没有伞吧。", "我没关系的。"]),
    { op: "hide", id: "yuling-yard" },
    say("粟牙", "......"),
  ],
  linju: [
    ...lines("粟牙", ["（这眼神也太明显了吧...）", "（口袋里又鼓起一包和天下。先把伞递出去。）", "你要一起搭伞吗？"]),
    say("林桔", "...嗯？...不用，不用的。"),
    say("粟牙", "可是，这雨也下得挺大的。"),
    say("林桔", "没关系啦，因为我...嗯..."),
    ...lines("粟牙", ["（原来是比较害羞吗。）", "那这样吧，这把伞给你，我冲回去就好。"]),
    ...lines("林桔", ["！！！", "...不用的，真的不用..."]),
    say("粟牙", "没关系。"),
    ...lines("林桔", ["...", "那个...", "你不介意的话...", "我们...那个...可以一起走吗？"]),
    say("粟牙", "当然可以。"),
  ],
  yushit: [
    { op: "mark", id: "yushit" },
    say("域零", "粟牙，是你来了。"),
    say("域零", "八尺戒尺也带进画里了。烟还在烧。"),
    choice("域零", "你不觉得这里有些异样吗？", [
      { label: "有些奇怪", then: [say("域零", "嗯，换谁来看，都觉得奇怪。")] },
      {
        label: "还好吧",
        then: [...lines("域零", ["...是吗。", "其实我是能感觉到异样的。"])],
      },
    ]),
    ...lines("域零", [
      "星空中降落着零零星星的雨点，你觉得是为什么呢？",
      "雨珠缓缓滚落我的脸颊，我却感受不到一丝寒意。",
      "没错，这些雨珠还夹着一点温暖。",
      "就仿佛，刚才谁的眼眶中溢出来一般。",
      "在这充满未知的星空之中，有的只是无尽的黑暗，杂糅着一丝微光的黑暗。",
      "可是...",
      "象征希望的星星。",
      "近在咫尺，却远在天涯。",
    ]),
  ],
  yustar2: [
    { op: "mark", id: "yustar2" },
    choice("域零", "粟牙，你害怕雷电吗？", [
      {
        label: "害怕",
        then: [...lines("域零", ["哈哈，我也有些害怕。", "总觉得雷鸣声有些令人心情烦躁。", "但是..."])],
      },
      {
        label: "不害怕",
        then: [
          ...lines("域零", [
            "或许你已经思考过雷鸣的含义了吧...",
            "又或许...不知什么时候。",
            "你已经开始对事物渐渐麻木了呢...",
          ]),
        ],
      },
    ]),
    say("粟牙", "我在课堂上讲过闪电。真打下来的时候，八尺戒尺帮不上忙。"),
    ...lines("域零", [
      "静静地感受雷鸣的节律...",
      "或许它是人们所畏惧的事物...",
      "但是，对身处黑暗的人们来说...",
      "或许是瞬时的希望。",
      "雷鸣再度将他们从沉睡中唤醒...",
      "他们再一次看到光明。",
      "哪怕是忍着痛楚抓握那带刺的黎明。",
    ]),
  ],
  yustar3: [
    { op: "mark", id: "yustar3" },
    ...lines("域零", [
      "星空没有边际...这里充满着无限的希望和可能。",
      "若是茫茫迷失在星空之中，无论怎么伸手...",
      "哪怕一点点星光...",
      "都会自然而然地从手指间流去。",
      "那道光...",
      "又什么时候属于我呢。",
    ]),
  ],
  yustar4: [
    { op: "mark", id: "yustar4" },
    ...lines("域零", [
      "雨丝只是悄悄地，静静地...",
      "洒在这星空里，不去打扰每一颗星辰。",
      "最后再消失得无影无踪...",
      "没有人会记得...",
      "曾经遥远的星空中下过一场温柔的细雨。",
    ]),
  ],
  yustar5: [
    { op: "mark", id: "yustar5" },
    ...lines("雪兰", [
      "回过神时，我已经在大雨之中。",
      "雨唰唰的声响，终于让我静下心来。",
      "站在白雾茫茫的十字路口前，我不知道自己还有何处可逃。",
      "似乎一切都离我那样遥远，伸出自己的双手却似乎看不见它。",
      "对面的红灯熄灭，我漫无目的地向路的另一边走去。",
    ]),
  ],
  yustar6: [
    { op: "mark", id: "yustar6" },
    ...lines("雪兰", [
      "回过神时，我已经在大雨之中。",
      "雨沙沙的噪声让我的情绪的波澜更加汹涌。",
      "雨无情的吵闹声掩过了我焦虑的喘息声，似乎感觉不到自己还在呼吸。",
      "止步在白雾茫茫的十字路口，我不知道自己是否应该放弃。",
      "对面的绿灯闪起，我带着一丝侥幸的答案走向路的另一边。",
    ]),
  ],
  yustar7: [
    { op: "mark", id: "yustar7" },
    ...lines("雪兰", [
      "我心不在焉地走着，凉意渐渐的刺痛着我的神经。",
      "一瞬的交会，我同他错过。",
      "一瞬的交会，我同她错过。",
      "思绪凌乱，我选择就此与他错过，或者，这只是一种不切实际的幻想——他也走在雨林之中。",
      "我应该确实看见了她，但她不可能走在这雨中，应该是这样的，一定是这样，可是为什么脚步不由自主的缓慢下来？",
    ]),
  ],
  yustar8: [
    { op: "mark", id: "yustar8" },
    ...lines("雪兰", [
      "话已在嘴边，又不愿冒险撕破一瞬的幻梦，但他隐隐的脚步声已在身后消失殆尽。",
      "如果不是她，我又为什么而在坚持，想要放弃，胆怯的接受这个幻梦，尽管它只是梦，但她的声音戛然无踪。",
      "我又向前走去。",
      "我又向前走去。",
      "转身。",
      "转身。",
      "他好像就在路的另一边，他好像在看着我。",
      "她好像就在路的另一边，她好像在看着我。",
    ]),
  ],
  yustar9: [
    { op: "mark", id: "yustar9" },
    ...lines("雪兰", [
      "绿灯此刻也消失不见，红灯在灰蒙的十字路口上分外显眼。",
      "他（她）用唇语说着些什么，他（她）的脸颊上有一丝暖流。",
      "一瞬的对视。他（她）好像看见他（她）的双眸中映出他（她）的模样。",
      "他（她）将手牵向挥舞着雨丝的半空，他（她）静静地站在雨中。",
      "他（她）静静地站在雨中。",
      "他（她）静静地站在雨中。",
      "他（她）静静地站在雨中。",
    ]),
  ],
  yustar10: [
    { op: "mark", id: "yustar10" },
    ...lines("雪兰", [
      "绿灯。",
      "即便这只是一场终会醒来的梦...",
      "他（她）依然选择在此刻沉迷于幻境中...",
      "他（她）只需要一点点的幻想就好，只需要一点点...",
    ]),
    { op: "ending" },
  ],
  xstar: [
    { op: "mark", id: "xstar" },
    ...lines("兮", [
      "一面镜子顷刻间摔落...",
      "伴着清脆的响声，碎片散了一地。",
      "我试图伸手拾起那碎片...",
      "但不久碎片又砸回地面...",
      "变得粉碎。",
      "鲜红色液滴也在此刻降落在地面上。",
      "无数的碎片...",
      "映出的是无数的虚空。",
      "虚空中似乎有着什么，但怎么也看不清。",
    ]),
  ],
  toyou: [
    { op: "mark", id: "toyou" },
    ...lines("？", [
      "我们不是神",
      "我们无法用全知视角观察这个世界",
      "人们也不是神",
      "你无法让人们观察你的世界",
      "能让人们观察你世界的人",
      "只有你自己",
    ]),
  ],
};
