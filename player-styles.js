// NBA2K 风格分类数据（阶段1 外置）

var NBA2K_STYLE_CLASSES = [
  { key: 'sharpshooter_3', name: '三分神射手', icon: '🎯', score: function(a) { return a('threePT'); } },
  { key: 'mid_killer', name: '中距离杀手', icon: '🎯', score: function(a) { return a('MID'); } },
  { key: 'all_round_scorer', name: '全能得分手', icon: '🔥', score: function(a) { return (a('threePT') + a('MID') + a('FIN')) / 3; } },
  { key: 'slashing_finisher', name: '突破终结者', icon: '💥', score: function(a) { return (a('FIN') + a('DNK') + a('ATH')) / 3; } },
  { key: 'high_flyer', name: '运动扣将', icon: '✈️', score: function(a) { return (a('DNK') + a('ATH')) / 2; } },
  { key: 'playmaker', name: '组织核心', icon: '🎩', score: function(a) { return (a('PAS') + a('HAN')) / 2; } },
  { key: 'ball_handler', name: '控球大师', icon: '🌀', score: function(a) { return a('HAN'); } },
  { key: 'two_way', name: '攻防一体', icon: '🛡️', score: function(a) { return (a('FIN') + a('threePT') + a('PDEF') + a('IDEF')) / 4; } },
  { key: 'lockdown', name: '防守尖兵', icon: '🔒', score: function(a) { return (a('PDEF') + a('IDEF')) / 2; } },
  { key: 'rim_protector', name: '护框精英', icon: '🧱', score: function(a) { return (a('BLK') + a('IDEF')) / 2; } },
  { key: 'glass_cleaner', name: '篮板猛兽', icon: '💪', score: function(a) { return a('REB'); } },
  { key: 'interior_boss', name: '内线霸主', icon: '🗼', score: function(a) { return (a('STR') + a('REB') + a('BLK')) / 3; } },
  { key: 'stretch_big', name: '空间内线', icon: '🎈', score: function(a) { return (a('threePT') + a('REB')) / 2; } },
  { key: 'post_scorer', name: '背打得分手', icon: '🐂', score: function(a) { return (a('STR') + a('FIN') + a('MID')) / 3; } },
  { key: 'clutch', name: '关键先生', icon: '🧊', score: function(a) { return a('CLU'); } },
  { key: 'all_around', name: '全能战士', icon: '👑', score: function(a) { return (a('threePT') + a('MID') + a('FIN') + a('DNK') + a('HAN') + a('PAS') + a('PDEF') + a('IDEF') + a('BLK') + a('REB') + a('ATH') + a('STR') + a('CLU')) / 13; } },
  { key: 'skill_creator', name: '技术流大师', icon: '✨', score: function(a) { return (a('HAN') + a('PAS') + a('FIN')) / 3; } },
  { key: 'iso_scorer', name: '单打高手', icon: '🎪', score: function(a) { return (a('HAN') + a('threePT') + a('CLU')) / 3; } },
];
