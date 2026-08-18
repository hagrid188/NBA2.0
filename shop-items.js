// ============================================================
// shop-items.js —— 球员商店商品表（阶段2 外置，文案独立维护）
// 价格单位：万。球星年薪约 4000-5500 万，价格保持在“有分量但可负担”：
//   生活小件 30-800 万；团队互动 100-2500 万；贵重资产 1500 万-1.5 亿。
// 每赛季每种效果只能来自一件物品（先买锁定，同季其他同效果物品不可购，
//   提示“你已经有了这个效果”，新赛季刷新）。
// 分类 tab 内按价格升序
// tier: prestige=贵重（仅档次标识，不再计数/档案标签/彩蛋），normal=小件
// cat: life / team / collection / asset / charity
// perTeam=true 每队可购一次；requires 为解锁条件
// effects 键：coachTrust/lockerTrust/fame/mediaTrust/fanSupport/legacy/morale/chem/injuryRisk/formVariance
// ============================================================

var SHOP_ITEMS = [
  // ── 生活小件（normal，8 类核心效果各一件 + 人气/状态波动） ──
  { id: 'stylist', cat: 'life', tier: 'normal', emoji: '💈', name: '定制发型造型师', price: 50, perTeam: false, desc: '人气 +1', effects: { fame: 1 }, copy: '你的新发型上了热搜，解说员说你现在像在拍广告。' },
  { id: 'staff_redpacket', cat: 'life', tier: 'normal', emoji: '🧧', name: '给球童/工作人员发红包', price: 60, perTeam: false, desc: '球迷支持 +1', effects: { fanSupport: 1 }, copy: '球童们拿到红包后，捡球都跑得比平时快。' },
  { id: 'pet', cat: 'life', tier: 'normal', emoji: '🐕', name: '宠物犬', price: 80, perTeam: false, desc: '状态波动略降', effects: { formVariance: -1 }, copy: '它在你输球的晚上把脑袋枕在你腿上，比任何心理医生都管用。' },
  { id: 'home_party', cat: 'life', tier: 'normal', emoji: '🎉', name: '家庭烤肉派对', price: 400, perTeam: false, desc: '士气 +1', effects: { morale: 1 }, copy: '你把全队请到家里烤肉，烟火气盖过了更衣室里的闷气。那天之后，大家训练完都愿意多待十分钟。' },
  { id: 'billiards', cat: 'life', tier: 'normal', emoji: '🎱', name: '台球桌', price: 100, perTeam: false, desc: '化学 +1', effects: { chem: 1 }, copy: '客场归来后，队友们最爱在你家打台球。你输了就请吃夜宵——这是规矩。' },
  { id: 'snack_bar', cat: 'life', tier: 'normal', emoji: '🍬', name: '更衣室零食柜', price: 120, perTeam: false, desc: '更衣室信任 +1', effects: { lockerTrust: 1 }, copy: '更衣室角落里多了个永远补满的零食柜。深夜加练的队友说：这比任何团建都管用。' },
  { id: 'sauna', cat: 'life', tier: 'normal', emoji: '🧖', name: '家庭桑拿', price: 200, perTeam: false, desc: '伤病风险略降', effects: { injuryRisk: -1 }, copy: '赛后蒸十分钟，酸痛少一半。队医来参观后，认真地问你接不接受办卡。' },
  { id: 'social_team', cat: 'life', tier: 'normal', emoji: '📱', name: '社媒运营团队', price: 300, perTeam: false, desc: '媒体好感 +1', effects: { mediaTrust: 1 }, copy: '你的账号从“自己随手拍”变成专业运营。评论区开始说：这球员情商很高。' },
  { id: 'private_gym', cat: 'life', tier: 'normal', emoji: '🏟️', name: '专属训练馆', price: 550, perTeam: false, desc: '教练信任 +1', effects: { coachTrust: 1 }, copy: '你租下场馆旁的一间训练馆，把战术板、录像和加练都搬了进去。教练来过一次后，说下次战术课直接借你的场地。' },
  // ── 属性强化（独立 Tab，生涯一次，每赛季只能选一项；按影响高低定价：得分/组织影响越大越贵） ──
  { id: 'shooting_gym', cat: 'attr', tier: 'normal', emoji: '🎯', name: '投篮训练场', price: 800, perTeam: false, desc: '三分 +1', effects: { threePT: 1 }, copy: '你搭了一间只有篮筐和投篮机的训练场。没有观众，只有命中率在一天天说话。' },
  { id: 'mid_gym', cat: 'attr', tier: 'normal', emoji: '🎯', name: '中距离训练馆', price: 750, perTeam: false, desc: '中投 +1', effects: { MID: 1 }, copy: '肘区的每一次转身跳投，你都拆成三段来练。中距离不会说谎。' },
  { id: 'finish_gym', cat: 'attr', tier: 'normal', emoji: '🏋️', name: '终结训练房', price: 700, perTeam: false, desc: '终结 +1', effects: { FIN: 1 }, copy: '对抗垫、慢镜头、角度支架——你把自己篮下的每个动作都重新打磨了一遍。' },
  { id: 'dunk_gym', cat: 'attr', tier: 'normal', emoji: '🏀', name: '扣篮训练馆', price: 660, perTeam: false, desc: '扣篮 +1', effects: { DNK: 1 }, copy: '你包下球馆晚场，一遍遍练习起跳、折叠、砸框。隔扣之后，你还会朝篮架道一声谢谢。' },
  { id: 'handle_gym', cat: 'attr', tier: 'normal', emoji: '🤹', name: '运球训练馆', price: 650, perTeam: false, desc: '手感 +1', effects: { HAN: 1 }, copy: '运球从开球练到关灯。皮球在你手里越来越像身体的一部分。' },
  { id: 'pass_lab', cat: 'attr', tier: 'normal', emoji: '🧠', name: '战术传球实验室', price: 600, perTeam: false, desc: '传球 +1', effects: { PAS: 1 }, copy: '你请分析师把每场比赛的传球线路画成图，贴在墙上研究。篮球不只是投进，更是传到位。' },
  { id: 'athletic_center', cat: 'attr', tier: 'normal', emoji: '🏃', name: '运动训练中心', price: 570, perTeam: false, desc: '运动 +1', effects: { ATH: 1 }, copy: '冲刺梯、变向锥、弹力绳——你把速度和敏捷拆成小项，再拼装成更快的自己。' },
  { id: 'reb_gym', cat: 'attr', tier: 'normal', emoji: '🧲', name: '篮板训练场', price: 550, perTeam: false, desc: '篮板 +1', effects: { REB: 1 }, copy: '卡位、判断、二次起跳——篮板球是你用膝盖换来的资产。' },
  { id: 'def_gym', cat: 'attr', tier: 'normal', emoji: '🛡️', name: '防守训练馆', price: 500, perTeam: false, desc: '外防 +1', effects: { PDEF: 1 }, copy: '滑步、挤掩护、追防，你在防守端流下的汗不比得分少。' },
  { id: 'clutch_gym', cat: 'attr', tier: 'normal', emoji: '🔥', name: '关键球训练馆', price: 450, perTeam: false, desc: '关键 +1', effects: { CLU: 1 }, copy: '你把最后两分钟的攻防剪成集锦，一遍遍回放、预演、出手。压哨球练多了，心跳会慢下来。' },
  { id: 'rim_gym', cat: 'attr', tier: 'normal', emoji: '🚧', name: '护框训练馆', price: 400, perTeam: false, desc: '内防 +1', effects: { IDEF: 1 }, copy: '篮下是你的禁飞区。你请来助教反复模拟各种突破，直到你的站位变成一道墙。' },
  { id: 'strength_room', cat: 'attr', tier: 'normal', emoji: '💪', name: '力量训练房', price: 380, perTeam: false, desc: '力量 +1', effects: { STR: 1 }, copy: '杠铃片从轻到重排成一排。教练说：力量不会说谎，它会在对抗的最后一秒替你说话。' },
  { id: 'block_gym', cat: 'attr', tier: 'normal', emoji: '🧱', name: '封盖训练馆', price: 350, perTeam: false, desc: '盖帽 +1', effects: { BLK: 1 }, copy: '起跳时机、臂展角度、预判出手点——你把盖帽练成了一种条件反射。' },
  { id: 'legacy_donate', cat: 'life', tier: 'normal', emoji: '🏛️', name: '个人藏品捐赠', price: 800, perTeam: false, desc: '队史评价 +1', effects: { legacy: 1 }, copy: '你把生涯纪念品捐给球队博物馆。总经理说：你让这座城市的篮球史多了一页。' },

  // ── 团队互动（8 类核心效果各一件，每队可购一次，价格按影响递增） ──
  { id: 'coach_gift', cat: 'team', tier: 'normal', emoji: '🎁', name: '给教练组/后勤买礼物', price: 100, perTeam: true, desc: '教练信任 +1', effects: { coachTrust: 1 }, copy: '你给教练组和后勤团队每人准备了一份礼物。助教笑着说：下次战术会议给你留第一排。' },
  { id: 'team_gift', cat: 'team', tier: 'normal', emoji: '🎁', name: '给全队买礼物', price: 200, perTeam: true, desc: '更衣室信任 +1', effects: { lockerTrust: 1 }, copy: '圣诞和节日，每个人柜子前都会出现你的礼物。老将第一次主动跟你聊了五分钟，说：这更衣室有家的味道了。' },
  { id: 'fans_scarf', cat: 'team', tier: 'normal', emoji: '🧣', name: '球迷助威围巾', price: 300, perTeam: true, desc: '球迷支持 +1', effects: { fanSupport: 1 }, copy: '主场每个人脖子上都多了一条你的配色围巾。客队球员说：这片看台现在像一堵会喊的墙。' },
  { id: 'team_dinner_shop', cat: 'team', tier: 'normal', emoji: '🍽️', name: '请全队吃饭', price: 500, perTeam: true, desc: '士气 +1', effects: { morale: 1 }, copy: '你包下全城最好的餐厅，队友们吃到扶墙。账单很贵，但更衣室的声音从那天开始不一样了。' },
  { id: 'charity_match', cat: 'team', tier: 'normal', emoji: '🤝', name: '慈善赛组织', price: 800, perTeam: true, desc: '媒体好感 +1', effects: { mediaTrust: 1 }, copy: '全明星们来你的慈善赛捧场，门票收入全部捐出。赛后你被追着采访到半夜。' },
  { id: 'nutritionist', cat: 'team', tier: 'normal', emoji: '🥗', name: '营养师团队', price: 1000, perTeam: true, desc: '伤病风险略降', effects: { injuryRisk: -1 }, copy: '你的餐单精确到克。营养师说：你的身体现在是一台保养到位的机器。' },
  { id: 'facility', cat: 'team', tier: 'normal', emoji: '🏟️', name: '翻新球队训练设施', price: 1500, perTeam: true, desc: '化学 +1', effects: { chem: 1 }, copy: '新的力量房和恢复室剪彩那天，全队都来拍照。训练馆的墙上多了一块铭牌：由你冠名。' },
  { id: 'legacy_hall', cat: 'team', tier: 'normal', emoji: '🏛️', name: '冠名球队荣誉室', price: 2500, perTeam: true, desc: '队史评价 +1', effects: { legacy: 1 }, copy: '荣誉室里多了一面属于你的墙。总经理说：百年之后，后人会从这里认识你。' },

  // ── 贵重收藏（prestige，仅档次标识） ──
  { id: 'watch', cat: 'collection', tier: 'prestige', emoji: '⌚', name: '高端手表', price: 500, perTeam: false, desc: '贵重收藏', copy: '表盘在灯光下转出细碎的光。你把它戴去客场，队友说：这表够买我一年的鞋。' },
  { id: 'champ_ring', cat: 'collection', tier: 'prestige', emoji: '💍', name: '冠军戒指复刻', price: 1000, perTeam: false, desc: '贵重收藏', requires: function() { var h = (STATE.career && STATE.career.honors) || []; return h.some(function(x) { return (x.label || '').indexOf('总冠军') >= 0; }); }, lockHint: '需要先赢下总冠军', copy: '每一枚戒指都刻着那一年的城市与日期。你看着它们，像看着自己走过的路。' },
  { id: 'art', cat: 'collection', tier: 'prestige', emoji: '🖼️', name: '艺术品收藏', price: 2000, perTeam: false, desc: '贵重收藏', copy: '拍卖会上你举了一次牌。朋友说你被宰了，你说：它会涨的——像我的投篮一样。' },
  { id: 'jersey_wall', cat: 'collection', tier: 'prestige', emoji: '🧥', name: '亲签球衣墙', price: 3000, perTeam: false, desc: '贵重收藏', copy: '你收藏的球衣从墙上一直排到楼梯口。来家里的孩子问：这些都能要吗？你说：都能看。' },
  { id: 'whiskey_cellar', cat: 'collection', tier: 'prestige', emoji: '🥃', name: '珍藏酒窖', price: 3000, perTeam: false, desc: '贵重收藏', requires: function() { return !!(STATE.career && STATE.career.flags && STATE.career.flags.hennessyAd); }, lockHint: '需要先接下轩尼诗代言', copy: '酒窖里最显眼的位置放着那瓶签了名的联名款。轩尼诗的品牌方来参观时，笑着和你碰了一杯。' },

  // ── 资产（prestige，仅档次标识） ──
  { id: 'car', cat: 'asset', tier: 'prestige', emoji: '🏎️', name: '收藏级豪车', price: 1500, perTeam: false, desc: '资产', copy: '引擎声很轻，油门很重。你开着它在城市夜路上兜了一圈，像在拍自己的电影。' },
  { id: 'villa', cat: 'asset', tier: 'prestige', emoji: '🏖️', name: '度假别墅', price: 5000, perTeam: false, desc: '资产', copy: '海风、落地窗、一辆能停两台车的车库。你把钥匙扔给经纪人：休赛期的办公室。' },
  { id: 'mansion', cat: 'asset', tier: 'prestige', emoji: '🏠', name: '豪宅', price: 8000, perTeam: false, desc: '资产', copy: '搬进新家的第一个晚上，你站在落地窗前看整座城市。队友来暖房时只会说：哥，洗手间在哪？' },
  { id: 'jet', cat: 'asset', tier: 'prestige', emoji: '🛩️', name: '私人飞机', price: 12000, perTeam: false, desc: '资产', copy: '第一次坐进自己的飞机，你像个第一次进客舱的孩子。空姐问你要点什么，你说：先起飞。' },
  { id: 'yacht', cat: 'asset', tier: 'prestige', emoji: '⛵', name: '游艇', price: 15000, perTeam: false, desc: '资产', copy: '甲板很大，能站下整支球队。休赛期第一天，你在海上接到了经纪人的电话：他们想续约。' },

  // ── 慈善（prestige，仅档次标识） ──
  { id: 'court', cat: 'charity', tier: 'prestige', emoji: '🏀', name: '资助社区球场', price: 2000, perTeam: false, desc: '慈善', copy: '旧球场换上新地板的那天，孩子们在球场上疯跑。有人举着你的海报，上面写着：谢谢。' },
  { id: 'school', cat: 'charity', tier: 'prestige', emoji: '🏫', name: '建篮球学校/公益基金', price: 10000, perTeam: false, desc: '慈善', copy: '球馆里第一堂训练课，孩子们穿着崭新的队服。校长致辞时念了你的名字，全场都在鼓掌。' }
];
