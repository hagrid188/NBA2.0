/**
 * ============================================================
 *  BuildPlayer 模拟配置模块
 *  所有可调参数集中在此，方便你以后调整游戏平衡
 * ============================================================
 */
const SIM_CONFIG = {

  // ============================================================
  // 1. 建球员阶段参数
  // ============================================================
  BUILD: {
    /** 总属性数 */
    TOTAL_ATTRS: 13,

    /** Classic 模式重roll次数 */
    CLASSIC_REROLLS: 3,

    /** 每支球队 roster 展示上限（不够的用实际人数） */
    ROSTER_SHOW_MAX: 15,

    /** 属性值范围 */
    ATTR_MIN: 25,
    ATTR_MAX: 99,

    /** 同属性位置衰减开关（已由“选择我的位置”页面 UI 控制，默认开启；
     *  此字段仅作兼容保留，实际判定读 STATE.posPenalty） */
    CROSS_POS_PENALTY: true,
  },

  // ============================================================
  // 1.5 各位置属性平均值（从真实NBA2K数据计算，用于跨位置衰减）
  // 公式: 衰减系数 = min(1.0, 你的位置该属性平均值 / 来源位置该属性平均值)
  // ============================================================
  POS_AVG: {
    PG: { threePT: 79.2, MID: 79.5, FIN: 82.5, DNK: 57.9, HAN: 85.2, PAS: 79.4, PDEF: 69.5, IDEF: 42.0, BLK: 44.6, REB: 52.2, ATH: 82.1, STR: 50.7, CLU: 73.6 },
    SG: { threePT: 79.8, MID: 77.2, FIN: 82.5, DNK: 71.3, HAN: 83.0, PAS: 71.7, PDEF: 69.6, IDEF: 48.3, BLK: 45.5, REB: 51.9, ATH: 79.6, STR: 53.7, CLU: 70.5 },
    SF: { threePT: 78.4, MID: 75.6, FIN: 82.5, DNK: 73.5, HAN: 82.8, PAS: 65.2, PDEF: 71.1, IDEF: 58.7, BLK: 50.5, REB: 57.3, ATH: 77.3, STR: 58.2, CLU: 62.5 },
    PF: { threePT: 76.2, MID: 71.4, FIN: 83.4, DNK: 75.8, HAN: 83.4, PAS: 62.4, PDEF: 67.6, IDEF: 68.1, BLK: 59.7, REB: 66.4, ATH: 73.7, STR: 66.4, CLU: 71.1 },
    C:  { threePT: 62.4, MID: 70.7, FIN: 86.4, DNK: 73.2, HAN: 80.3, PAS: 53.0, PDEF: 50.8, IDEF: 72.8, BLK: 72.7, REB: 77.0, ATH: 59.4, STR: 74.7, CLU: 64.9 },
  },

  // ============================================================
  // 2. 属性中文名映射
  // ============================================================
  ATTR_CN: {
    threePT: '三分',
    MID:     '中投',
    FIN:     '终结',
    DNK:     '扣篮',
    HAN:     '手感',
    PAS:     '传球',
    PDEF:    '外防',
    IDEF:    '内防',
    BLK:     '盖帽',
    REB:     '篮板',
    ATH:     '运动',
    STR:     '力量',
    CLU:     '关键',
  },

  /** 属性简短说明（hover 时显示） */
  ATTR_DESC: {
    threePT: '三分投篮能力',
    MID:     '中距离投篮能力',
    FIN:     '篮下终结能力',
    DNK:     '扣篮能力',
    HAN:     '控球与接球手感',
    PAS:     '传球精准度',
    PDEF:    '外线防守能力',
    IDEF:    '内线防守能力',
    BLK:     '盖帽能力',
    REB:     '篮板能力',
    ATH:     '运动能力（速度/敏捷）',
    STR:     '力量对抗能力',
    CLU:     '关键球能力',
  },

  /** 属性列表（顺序决定 UI 排列） */
  ATTR_LIST: [
    'threePT', 'MID', 'FIN', 'DNK', 'HAN', 'PAS',
    'PDEF', 'IDEF', 'BLK', 'REB', 'ATH', 'STR', 'CLU'
  ],

  /** 数字→字母等级转换 */
  GRADE: {
    /** 根据数值返回 { letter, color } */
    getGrade(val) {
      if (val >= 95) return { letter: 'A+', color: '#ff6b6b' };
      if (val >= 90) return { letter: 'A',  color: '#ff8787' };
      if (val >= 85) return { letter: 'A-', color: '#ffa07a' };
      if (val >= 80) return { letter: 'B+', color: '#ffd43b' };
      if (val >= 75) return { letter: 'B',  color: '#ffd43b' };
      if (val >= 70) return { letter: 'B-', color: '#ffd43b' };
      if (val >= 65) return { letter: 'C+', color: '#69db7c' };
      if (val >= 60) return { letter: 'C',  color: '#69db7c' };
      if (val >= 55) return { letter: 'C-', color: '#69db7c' };
      if (val >= 50) return { letter: 'D+', color: '#74c0fc' };
      if (val >= 45) return { letter: 'D',  color: '#74c0fc' };
      if (val >= 40) return { letter: 'D-', color: '#74c0fc' };
      return { letter: 'F', color: '#868e96' };
    },
    /** OVR 等级 */
    getOvrGrade(ovr) {
      if (ovr >= 95) return '超级巨星';
      if (ovr >= 85) return '全明星';
      if (ovr >= 75) return '首发';
      if (ovr >= 65) return '轮换';
      return '边缘';
    },
  },

  // ============================================================
  // 3. 位置与 Archetype 判定
  // ============================================================
  POSITIONS: {
    PG: '控球后卫',
    SG: '得分后卫',
    SF: '小前锋',
    PF: '大前锋',
    C:  '中锋',
  },

  POS_LIST: ['PG', 'SG', 'SF', 'PF', 'C'],

  /** OVR 计算公式：各属性对每个位置的权重 */
  OVR_WEIGHTS: {
    PG: { threePT: 0.10, MID: 0.10, FIN: 0.08, DNK: 0.04, HAN: 0.14, PAS: 0.14, PDEF: 0.10, IDEF: 0.04, BLK: 0.02, REB: 0.04, ATH: 0.08, STR: 0.04, CLU: 0.08 },
    SG: { threePT: 0.12, MID: 0.12, FIN: 0.10, DNK: 0.06, HAN: 0.10, PAS: 0.08, PDEF: 0.10, IDEF: 0.04, BLK: 0.02, REB: 0.04, ATH: 0.08, STR: 0.04, CLU: 0.10 },
    SF: { threePT: 0.10, MID: 0.10, FIN: 0.10, DNK: 0.08, HAN: 0.08, PAS: 0.06, PDEF: 0.10, IDEF: 0.08, BLK: 0.04, REB: 0.06, ATH: 0.08, STR: 0.06, CLU: 0.06 },
    PF: { threePT: 0.08, MID: 0.06, FIN: 0.12, DNK: 0.06, HAN: 0.06, PAS: 0.04, PDEF: 0.10, IDEF: 0.12, BLK: 0.08, REB: 0.10, ATH: 0.06, STR: 0.08, CLU: 0.04 },
    C:  { threePT: 0.04, MID: 0.04, FIN: 0.14, DNK: 0.06, HAN: 0.04, PAS: 0.04, PDEF: 0.08, IDEF: 0.14, BLK: 0.12, REB: 0.12, ATH: 0.04, STR: 0.10, CLU: 0.04 },
  },

  // ============================================================
  // 4. 赛季模拟参数 — 你可以随意调整
  // ============================================================
  SEASON: {
    /** 常规赛总场次 */
    GAMES: 82,

    /** 单节分钟数（用于统计） */
    QUARTER_MINUTES: 12,

    /** 模拟速度（毫秒/场） */
    SIM_SPEED_FAST: 50,
    SIM_SPEED_NORMAL: 800,
    SIM_SPEED_DETAIL: 2500,

    /** 季后赛晋级条件（胜场数） */
    PLAYOFF_WIN_REQUIRED: 4,
  },

  /** 球队实力维度权重 */
  TEAM_POWER: {
    offense:  { threePT: 0.20, MID: 0.15, FIN: 0.20, PAS: 0.15, HAN: 0.10, DNK: 0.10, ATH: 0.10 },
    defense:  { PDEF: 0.25, IDEF: 0.25, BLK: 0.15, REB: 0.15, ATH: 0.10, STR: 0.10 },
    athletic: { ATH: 0.30, DNK: 0.20, STR: 0.20, FIN: 0.15, threePT: 0.15 },
    clutch:   { CLU: 0.40, threePT: 0.20, MID: 0.20, PAS: 0.20 },
    depth:    {},  // 板凳平均 OVR，特殊处理
  },

  /** 单节分数计算基础值 */
  QUARTER_BASE_PTS: 24,

  /** 各维度对得分的影响系数 */
  QUARTER_FACTORS: {
    offense:  1.0,
    defense:  -0.7,
    athletic: 0.3,
    clutch:   0.2,
    home:     0.05,  // 主场加成
  },

  /** 随机事件概率（每节） */
  EVENTS: {
    /** 球员爆发概率 */
    HOT_STREAK_CHANCE: 0.08,
    /** 爆发时单节得分加成 */
    HOT_STREAK_BONUS: { min: 4, max: 12 },
    
    /** 主力受伤概率（每场） */
    INJURY_CHANCE: 0.03,
    /** 受伤缺席场次 */
    INJURY_GAMES: { min: 3, max: 15 },
    
    /** 交易概率（每10场检测一次） */
    TRADE_CHANCE: 0.02,
    
    /** 冷门概率（弱队赢强队） */
    UPSET_CHANCE: 0.10,
    /** 冷门时弱队加成 */
    UPSET_BONUS: 0.15,

    /** 绝杀概率 */
    BUZZER_BEATER_CHANCE: 0.05,
  },

  /** 你的球员数据生成系数 */
  PLAYER_STATS: {
    /** 各位置球权占比 */
    USAGE: { PG: 0.20, SG: 0.21, SF: 0.18, PF: 0.16, C: 0.17 },

    /** ★ 模块三：使用率上限与当家球星球权加成 */
    USAGE_CAP: 2.2,
    ROLE_FACTOR: 1.18,
    /** ★ 新秀赛季球权加成：第一年 87 OVR 也能打出 15-20 分（现实顶级新秀第一年即高球权） */
    ROOKIE_USAGE: { PG: 1.08, SG: 1.15, SF: 1.25, PF: 1.30, C: 1.35 },
    ROOKIE_PLAYOFF_USAGE_RETAIN: 0.45,
    ROOKIE_PTS_FLOOR: { SF: 14, PF: 14, C: 13 },
    YOUNG_BY_POS: { SF: 0.95, PF: 0.95, C: 0.95 },
    PEAK_CONVERGE: { PG: 0.95, SG: 0.89, SF: 1.0, PF: 1.0, C: 1.0 },
    // Regular-season appearance caps for veteran load management.
    LOAD_MGMT: {
      PG: { 35: 80, 36: 78, 37: 76, 38: 74, 39: 74, 40: 74, 41: 74, 42: 74 },
      SG: { 35: 80, 36: 78, 37: 76, 38: 74, 39: 74, 40: 74, 41: 74, 42: 74 },
      SF: { 38: 76, 39: 76, 40: 76, 41: 76, 42: 76 },
      PF: { 38: 76, 39: 76, 40: 76, 41: 76, 42: 76 },
      C:  { 38: 76, 39: 76, 40: 76, 41: 76, 42: 76 },
    },
    TARGETING: {
      studiedBase: 0.92, studiedStep: 0.02, studiedMin: 0.88,
      targeted: 0.95, maxCombined: 0.90,
      adjustOption: 0.96, hardOption: 0.92, offBallOption: 0.95,
      passOption: 0.95, ignoreOption: 0.93,
    },

    /** ★ 模块三/四：年龄数据曲线（巅峰加成） */
    PEAK: { young: 0.94, primeStart: 26, primeEnd: 31, primeFactor: 1.08, midStart: 32, midEnd: 34, midFactor: 0.99, lateFactor: 0.88 },

    /** ★ 玩家专属年龄曲线：巅峰延长到 26-34（NPC 仍走上方 PEAK），
     *  35-37 平缓过渡，38-40 暮年严重下滑（与 NPC 同等衰退幅度） */
    PLAYER_PEAK: {
      young: 0.92, primeStart: 25, primeEnd: 34, primeFactor: 1.08,
      midStart: 35, midEnd: 36, midFactor: 0.96,
      lateStart: 37, lateByAge: { 37: 0.90, 38: 0.86, 39: 0.82, 40: 0.78, 41: 0.74, 42: 0.70 },
      lateFactor: 0.80,
    },

    /** ★ 老将赛季场均下限（38+ 平滑退化）：玩家历史顶级一档，末期保持稳定输出。
     *  按位置×年龄给“目标场均”，单场下限 = 目标 × 0.88（留波动），命中数由 syncScoreComponents 自动回算 */
    VET_FLOOR: {
      PG: { 36: { pts: 25, ast: 8 }, 37: { pts: 23, ast: 8 }, 38: { pts: 20, ast: 8 }, 39: { pts: 19, ast: 8 }, 40: { pts: 18, ast: 8 }, 41: { pts: 18, ast: 8 }, 42: { pts: 17, ast: 8 } },
      SG: { 36: { pts: 26 }, 37: { pts: 24 }, 38: { pts: 22 }, 39: { pts: 21 }, 40: { pts: 20 }, 41: { pts: 19 }, 42: { pts: 18 } },
      SF: { 36: { pts: 22 }, 37: { pts: 20 }, 38: { pts: 18 }, 39: { pts: 17 }, 40: { pts: 16 }, 41: { pts: 15 }, 42: { pts: 14 } },
      PF: { 36: { pts: 21, reb: 9 }, 37: { pts: 19, reb: 9 }, 38: { pts: 17, reb: 9 }, 39: { pts: 16, reb: 9 }, 40: { pts: 15, reb: 9 }, 41: { pts: 15, reb: 8 }, 42: { pts: 14, reb: 8 } },
      C:  { 36: { pts: 20, reb: 11 }, 37: { pts: 18, reb: 11 }, 38: { pts: 16, reb: 10 }, 39: { pts: 15, reb: 10 }, 40: { pts: 14, reb: 10 }, 41: { pts: 13, reb: 9 }, 42: { pts: 13, reb: 9 } }
    },

    /** ★ 每季状态分布：低迷年/平常年/爆发年
     *  低迷年 20%（扩大低迷期，约 28-30 分赛季）；上端明显收窄（偏强 ≤1.03、爆发 ≤1.05），
     *  巅峰 35+ 赛季从约 7% 降到约 2-3%，均值约 0.99（生涯场均略降约 0.2-0.3） */
    SEASON_FORM_DIST: [
      { p: 0.20, min: 0.88, max: 0.95 },   // 低迷年 20%
      { p: 0.60, min: 0.99, max: 1.02 },   // 平常年 60%
      { p: 0.15, min: 1.005, max: 1.03 },  // 偏强年 15%
      { p: 0.05, min: 1.03, max: 1.05 },   // 爆发年 5%
    ],

    /** ★ 签名赛季/爆炸赛季（整季）分层：仅巅峰窗口 26-34 触发，按位置只推本位置签名项 */
    SEASON_TIER: {
      signature: {
        chance: 0.35, minOvr: 92, halfBelow: 90, halfChance: 1, halfMult: 0.5,
        // 按位置主项整季加成：PG 签名助 12-13、SG/SF 签名得分 33、C 签名板 15-16、PF 13-14
        mult: {
          PG: { pts: 1.18, ast: 1.25 },
          SG: { pts: 1.11, ast: 1.30 },
          SF: { pts: 1.10, ast: 1.80, reb: 1.18 },
          PF: { pts: 1.15, reb: 1.18, ast: 1.90 },
          C:  { pts: 1.15, reb: 1.35, ast: 2.00 },
        },
        typeWeights: {
          PG: { pts: 0.55, ast: 0.45 }, SG: { pts: 0.75, ast: 0.25 }, SF: { pts: 0.4, ast: 0.45, reb: 0.15 },
          PF: { reb: 0.4, ast: 0.45, pts: 0.15 }, C: { reb: 0.45, pts: 0.2, ast: 0.35 },
        },
      },
      explosive: {
        chance: 0.02, minOvr: 95, halfBelow: 90, halfChance: 0.5, halfMult: 0.7,
        // 爆炸赛季：分位 36+、PG 16+助、内线 18+板（约 1/6 生涯）
        mult: {
          PG: { pts: 1.28, ast: 1.55 },
          SG: { pts: 1.05 },
          SF: { pts: 1.10 },
          PF: { pts: 1.18, reb: 1.50 },
          C:  { pts: 1.18, reb: 1.60 },
        },
        typeWeights: {
          PG: { pts: 0.6, ast: 0.4 }, SG: { pts: 1.0 }, SF: { pts: 1.0 },
          PF: { pts: 0.5, reb: 0.5 }, C: { pts: 0.45, reb: 0.55 },
        },
        ptsCap: 64, rebCap: 30, astCap: 22,
      },
    },

    /** ★ 模块三/四：篮板/助攻基准系数（玩家） */
    REB_BASE: 11.5,
    AST_BASE: 9.3,
    /** ★ 模块四：NPC 基准系数（略低于玩家，保持主角略强） */
    NPC_REB_BASE: 12,
    NPC_AST_BASE: 10.5,

    /** ★ 位置专业化：非主项属性效率帽（全 99 也受位置限制） */
    POS_CAP: {
      // ★ NBA2.0：软化非主项属性帽——保留位置专业化，但让高能力球员不被压死（可全能，只是相对少一点）
      PG: { REB: 80, STR: 82 },
      SG: { REB: 82, PAS: 88, STR: 82 },
      SF: { REB: 88, PAS: 93 },
      PF: { PAS: 92, HAN: 82, threePT: 88 },
      C:  { PAS: 84, HAN: 80, threePT: 84, PDEF: 90 },
    },
    /** ★ 位置抢断/盖帽数据天花板（全 99 也不偏离位置现实） */
    POS_STAT_CAP: {
      PG: { stl: 3.0, blk: 1.5 },
      SG: { stl: 2.8, blk: 1.5 },
      SF: { stl: 2.5, blk: 2.0 },
      PF: { stl: 2.2, blk: 3.2 },
      C:  { stl: 2.0, blk: 4.7 },
    },
    /** ★ 各位置抢断/盖帽数据系数（全 99 生涯均值≈现实顶级+10%，不再人人撞天花板） */
    STL_COEFF: { PG: 2.0, SG: 1.8, SF: 1.6, PF: 1.35, C: 1.3 },
    BLK_COEFF: { PG: 0.8, SG: 0.7, SF: 1.0, PF: 1.85, C: 2.9 },
    /** ★ 主项最终倍率（全 99 巅峰期：PG 助≈13、C 板≈15、PF 板≈13，其余略高于顶级） */
    MAIN_BOOST: {
      PG: { pts: 1.05, ast: 1.05, reb: 1.10 },
      SG: { pts: 1.05, ast: 1.15, reb: 1.10 },
      SF: { pts: 1.04, reb: 1.10, ast: 1.12 },
      PF: { pts: 1.03, reb: 0.88, ast: 1.15 },
      C:  { pts: 1.05, reb: 0.98, ast: 1.22 },
    },
    /** ★ 常规赛得分总量控制（全 99 巅峰期场均≈现实顶级+：SG≈33、PG≈33、SF≈32、PF≈31、C≈32） */
    PTS_SCALE: {
      // ★ H2 校准：位置专业化——SG 巅峰≈33、PG≈29、SF≈30、PF≈27、C≈29（内线保留得分王窗口）
      PG: 0.66, SG: 0.71, SF: 0.72, PF: 0.85, C: 0.80,
    },
    /** ★ 动态单场上限（收紧）：助攻上限 = 场均助×1.5+3（封顶18）、篮板上限 = 场均板×1.3+4（封顶20），
     *  防止“大号三双”（如小前锋 33/15/16）频繁出现 */
    DYNAMIC_CAP: {
      // ★ 修复：原公式 板/助×1.3/1.5+4/3 会把高板中锋钉死在 11 板（自洽下限），
      //  改为 ×1.8+5，封顶 20 板 / 18 助，既防离谱大号三双又让 99 档 C 场均 15-16 板自然兑现
      astMult: 1.8, astAdd: 5, astMax: 18, astMin: 9,
      rebMult: 1.8, rebAdd: 5, rebMax: 20, rebMin: 10,
    },
    /** ★ 三双抑制（非主职维度）：SG/SF/PF/C 普通场出现“三双苗头”时按概率收敛助攻，
     *  生涯三双按“现实各位置顶级球员频率略高”标定（99 档 SG≈12、SF≈40、PF≈24、C≈22 次）；
     *  生涯之夜不受影响，保留稀有爆炸场 */
    TRIPLE_SUPPRESS: {
      PG: { p: 0.4, scale: 0.85 },
      SG: { p: 0.65, scale: 0.85 },
      SF: { p: 0.94, scale: 0.75 },
      PF: { p: 0.98, scale: 0.8 },
      C:  { p: 0.96, scale: 0.8 },
    },
    /** ★ 三双追逐（玩家专属）：接近三双（板/助 ≥8）时按位置概率把短板推上 10，
     *  生涯三双≈现实各位置顶级球员频率略高（99 档 PG≈26、SG≈12、SF≈40、PF≈24、C≈22 次） */
    TRIPLE_CHASE: {
      PG: { p: 0.22, rebMax: 12, astMax: 12 },
      SG: { p: 0.06, rebMax: 12, astMax: 12 },
      SF: { p: 0.005, rebMax: 12, astMax: 12 },
      PF: { p: 0.02, rebMax: 12, astMax: 12 },
      C:  { p: 0.05, rebMax: 12, astMax: 12 },
    },
    /** ★ H3 附带：内线大号两双（30+20）收敛——普通场 30+20 降频（生涯 1-2 次），生涯之夜保留 */
    BIG_DOUBLE_SUPPRESS: {
      PF: { p: 0.7, scale: 0.85 },
      C:  { p: 0.85, scale: 0.85 },
    },
    /** ★ 新秀期压制（方案C）：第一季单场状态 ×0.90、第二季 ×0.96、第三季起正常 */
    ROOKIE_FORM: [0.90, 0.96, 1],
    SHOT_PROFILE_CAP: { three: 0.52, mid: 0.58, fin: 0.72, volumePenalty: 0.004 },
    /** ★ 生涯之夜：巅峰期稀有爆炸场（生涯 1-2 次） */
    CAREER_NIGHT: {
      chance: 0.0025,      // 每场触发概率（≈每季 18%，巅峰 7 年期望 ~1.3 次）
      maxPerCareer: 2,
      minAge: 25, maxAge: 32,
      minOvr: 90,          // ★ OVR<90 不触发生涯之夜（低综评打不出“生涯级”爆炸场）
      // ★ OVR 分级：95+ 全量；90-94 打折（触发率 ×0.6、幅度 ×0.85、上限 62/22/18）
      ovrTiers: [
        { min: 95, chanceMul: 1.0, boostMul: 1.0, ptsCap: 75, rebCap: 28, astCap: 24 },
        { min: 90, chanceMul: 0.6, boostMul: 0.85, ptsCap: 62, rebCap: 22, astCap: 18 },
      ],
      ptsCap: 75, rebCap: 28, astCap: 24,
      ptsMult: [1.9, 2.2], rebMult: [1.6, 1.8], astMult: [1.6, 1.8],
      shotBoost: [1.08, 1.12],
      // 爆炸类型权重：scorer 得分型 / rebounder 篮板型 / allround 全面型
      typeWeights: { PG: { scorer: 0.6, allround: 0.4 }, SG: { scorer: 0.8, allround: 0.2 }, SF: { scorer: 0.4, allround: 0.6 }, PF: { rebounder: 0.6, scorer: 0.25, allround: 0.15 }, C: { rebounder: 0.65, scorer: 0.2, allround: 0.15 } },
    },
    /** ★ 单场状态分布（最佳数据自然分布，不再每季撞上限） */
    STATE_DIST: [
      { p: 0.805, min: 0.85, max: 1.15 },
      { p: 0.15, min: 1.15, max: 1.35 },
      { p: 0.04, min: 1.30, max: 1.50 },   // ★ 爆发场：5%→4%、幅度收敛
      { p: 0.005, min: 1.45, max: 1.65 },  // ★ 超神场：1%→0.5%、幅度收敛
    ],
    /** ★ 季后赛收敛分布（小样本下不再爆场失真） */
    PLAYOFF_DIST: [
      { p: 0.92, min: 0.90, max: 1.08 },
      { p: 0.06, min: 1.08, max: 1.20 },
      { p: 0.02, min: 1.20, max: 1.35 },
    ],

    /** 各位置的数据缩放（pts基准=1.0，其他数据相对pts的比例） */
    POS_SCALE: {
      PG: { pts: 1.0, reb: 0.55, ast: 1.00, stl: 0.18, blk: 0.04, tov: 1.0 },
      SG: { pts: 1.0, reb: 0.55, ast: 0.48, stl: 0.18, blk: 0.06, tov: 1.0 },
      SF: { pts: 1.0, reb: 0.80, ast: 0.44, stl: 0.16, blk: 0.08, tov: 1.0 },
      PF: { pts: 1.0, reb: 0.92, ast: 0.40, stl: 0.12, blk: 0.12, tov: 1.0 },
      C:  { pts: 1.0, reb: 1.00, ast: 0.38, stl: 0.08, blk: 0.15, tov: 1.0 },
    },

    /** 按位置的属性→数据映射（不同位置权重不同） */
    FACTORS: {
      PG: {
        pts: { FIN: 0.25, threePT: 0.20, MID: 0.20, DNK: 0.10, ATH: 0.10, PAS: 0.15 },
        reb: { REB: 0.40, STR: 0.20, ATH: 0.20 },
        ast: { PAS: 0.45, HAN: 0.25, ATH: 0.15, threePT: 0.15 },
        stl: { PDEF: 0.40, ATH: 0.25, HAN: 0.20 },
        blk: { BLK: 0.30, IDEF: 0.20, ATH: 0.10 },
        tov: { HAN: -0.35, PAS: -0.30, ATH: -0.15 },
      },
      SG: {
        pts: { FIN: 0.28, threePT: 0.22, MID: 0.20, DNK: 0.12, ATH: 0.10, PAS: 0.08 },
        reb: { REB: 0.40, STR: 0.20, ATH: 0.20 },
        ast: { PAS: 0.35, HAN: 0.20, ATH: 0.15, threePT: 0.10 },
        stl: { PDEF: 0.40, ATH: 0.25, HAN: 0.15 },
        blk: { BLK: 0.30, IDEF: 0.20, ATH: 0.10 },
        tov: { HAN: -0.35, PAS: -0.30, ATH: -0.15 },
      },
      SF: {
        pts: { FIN: 0.28, threePT: 0.18, MID: 0.18, DNK: 0.15, ATH: 0.12, STR: 0.09 },
        reb: { REB: 0.45, STR: 0.25, ATH: 0.15 },
        ast: { PAS: 0.25, HAN: 0.15, ATH: 0.10 },
        stl: { PDEF: 0.40, ATH: 0.20, HAN: 0.15 },
        blk: { BLK: 0.35, IDEF: 0.25, ATH: 0.10 },
        tov: { HAN: -0.30, PAS: -0.25, ATH: -0.15 },
      },
      PF: {
        pts: { FIN: 0.32, DNK: 0.18, MID: 0.15, threePT: 0.12, STR: 0.13, ATH: 0.10 },
        reb: { REB: 0.45, STR: 0.25, ATH: 0.15, IDEF: 0.15 },
        ast: { PAS: 0.15, HAN: 0.08, ATH: 0.05 },
        stl: { PDEF: 0.30, ATH: 0.15, HAN: 0.10 },
        blk: { BLK: 0.40, IDEF: 0.30, ATH: 0.10 },
        tov: { STR: -0.20, HAN: -0.20, PAS: -0.15 },
      },
      C: {
        pts: { FIN: 0.35, DNK: 0.20, MID: 0.12, STR: 0.15, threePT: 0.08, ATH: 0.10 },
        reb: { REB: 0.50, STR: 0.25, ATH: 0.10, IDEF: 0.15 },
        ast: { PAS: 0.15, HAN: 0.08, ATH: 0.05 },
        stl: { PDEF: 0.20, ATH: 0.10, HAN: 0.08 },
        blk: { BLK: 0.45, IDEF: 0.30, ATH: 0.08 },
        tov: { STR: -0.20, HAN: -0.15, PAS: -0.10 },
      },
    },

  /** 数据随机浮动范围 */
  RANDOM_RANGE: 0.20,
  },

  /** ★ 联盟经济层（阶段1-3：薪水/报价/奖金/手术费/工资帽预留）
   *  金额单位统一为「万」（如 10000 = 1 亿）
   *  税率与团队费率按现实比例简化：税后约 47.5%，团队维护 10%（经纪人+训练+公关） */
  SIM_ECONOMY: {
    taxRate: 0.525,            // 税率：实发 = 年薪 × (1-taxRate)
    teamFeeRate: 0.10,         // 团队维护费（按税前年薪）
    /** 报价档位（按 OVR/年龄/荣誉，最终年薪 = 基准 × 球队修正） */
    salaryBase: {
      max:    { minOvr: 92, base: 5200 },   // 顶薪基准（万/年）
      star:   { minOvr: 89, base: 4000 },   // ★ 明星档（89-91，介于顶薪与首发之间）
      starter:{ minOvr: 85, base: 3200 },   // 首发
      mid:    { minOvr: 78, base: 1800 },   // 中产
      min:    { minOvr: 0,  base: 600 },    // 底薪/轮换
    },
    /** ★ 老将年龄封顶（保留“不给顶薪”底线，缓和降薪）：
     *  35-36 → 首发档（OVR≥88 老将球星可到明星档）、37-38 → 中产档、39+ → 底薪档；
     *  年龄系数同步缓和：35→0.90、36→0.85、37→0.80、38→0.70、39→0.60、40→0.50 */
    veteranStarOvr: 88,
    /** ★ 年薪年度上涨（现实中每年必然提高，只涨不跌，涨幅柔和贴近现实）：
     *  每年涨幅 = 最低涨幅 + 波动（确定性波动，随赛季推进复利）
     *  参考现实：NBA 顶薪约按工资帽比例增长，历史年均约 2-3%，故年涨幅定 1.5%-3% */
    salaryYearMin: 0.015,          // 每年最低涨幅 +1.5%
    salaryYearFluct: [0, 0.015],   // 涨幅波动 +0%~+1.5%（合计每年 +1.5%~+3%，柔和不夸张）
    /** ★ 新档初始资金（万）：新秀签约金/积蓄，让玩家开局就能体验商店 */
    initialMoney: 50,
    /** 弱队/摆烂队补强溢价（按球队近季胜率：越弱溢价越高） */
    weakTeamPremium: { winPct: 0.45, maxPremium: 0.30 },
    /** 大市场：底薪换商业（报价打 9 折，但商业价值补偿）；小球市：高薪吸引（+10%） */
    bigMarketDiscount: 0.90,
    smallMarketPremium: 1.10,
    /** 顶薪封顶基准（第 0 季）：实际封顶 = 基准 × 年薪年度上涨因子（随时间同步上涨） */
    maxSalaryCap: 6000,
    /** 新秀合同基准（按顺位） */
    rookieSalary: { lottery: 1200, first: 900, second: 500, undrafted: 300 },
    /** 奖项奖金（万） */
    awardBonus: {
      champion: 45,      // 总冠军（每人）
      mvp: 30,
      dpoy: 20,
      scoring: 15,
      rebounding: 15,
      assisting: 15,
      allNBA: 10,
      roty: 10,
      sixthman: 8,
      allRookie: 5,
    },
    /** 手术费：年薪 × 手术FeeRate；恢复期缩短 1/3 */
    surgeryFeeRate: 0.02,
    surgeryRecoveryCut: 1 / 3,
    /** 事件金额常量（万） */
    eventMoney: {
      pokerHalfMonth: 1 / 24,      // 扑克输钱：半月工资（×年薪）
      cryptoHalfMonth: 1 / 24,     // 加密币：半月薪水 × 0.8（亏 80%）
      cryptoLossPct: 0.8,
      fineInterview: 2.5,          // 罢采罚款 2.5 万
      dryClean: 2,                 // 西装干洗 2 万
      teamDinner: 50,              // 赛季内请全队吃大餐 50 万
      schoolDonation: 80,          // 资助学校 80 万
      sponsorDepositBase: 300,     // 赞助商代言定金底价
      sponsorDepositPerBiz: 20,    // 每点商业价值 +20 万，上限 600 万
      sponsorDepositCap: 600,
      hennessyBase: 500,           // 轩尼诗代言费底价
      hennessyPerBiz: 50,          // 每点商业价值 +50 万，上限 1500 万
      hennessyCap: 1500,
      adBase: 300,                 // 广告拍摄签约金底价
      adPerBiz: 30,                // 每点商业价值 +30 万，上限 1000 万
      adCap: 1000,
      investmentWin: 200,          // 投资回报上限 200 万
      investmentLose: 120,         // 投资亏损下限 120 万
    },
    /** 工资帽/奢侈税（阶段3 启用；单位：万） */
    capStart: 14000,               // 初始工资帽 1.4 亿
    capGrowth: 0.015,              // 兜底年增长（getSalaryCap 实际按年薪上涨因子同步）
    luxuryTaxLine: 17000,          // 奢侈税线 1.7 亿
    tradeMatchPct: 0.20,           // 交易薪金匹配 ±20%
    birdYears: 2,                  // 效力满 2 年获得鸟权（可超帽续约）
  },

  /** ★ 比赛模拟平衡（贴近现实 + 玩家球队加成）
   *  winDivisor 越大强队优势越小；winMax 单场胜率上限（原 0.85 过于确定）；
   *  seedBonusFactor 首轮种子加成（原 0.4×顺位差过大）；
   *  playerTeamBoost 玩家所在球队净效率加成（提升玩家球队竞争力，不过分） */
  SIM_BALANCE: {
    winDivisor: 33,        // ★ 方案D：45→33（取中间），平衡黑八与强队统治
    winMin: 0.12,          // ★ NBA2.0：爆冷下限保留（弱队仍能赢），但压低
    winMax: 0.78,          // ★ NBA2.0：强队上限放宽（统治力更明显）
    seedBonusFactor: 0.33, // first-round seed-gap net-rating bonus
    // 1v8 high-seed game floor; Monte Carlo target is a 7%-8% black-eight rate.
    oneVsEightHighSeedFloor: 0.725,
    regularWinMax: 0.78,
    playoffWinMax: 0.75,
    firstRoundHighSeedFloor: { oneVsEight: 0.725, twoVsSeven: 0.67 },
    playerTeamBoost: 2.9,  // ★ 玩家历史最强档：常规赛净效率加成提升
    // ★ H5：玩家净效率加成按 OVR 分级（≤80 无、81-85 小幅、86-90 中、91-94 高、95+ 满档），避免低档无脑 55+ 胜
    playerBoostByOvr: [ { min: 95, boost: 2.9 }, { min: 91, boost: 2.4 }, { min: 86, boost: 0.6 }, { min: 81, boost: 0.4 }, { min: 0, boost: 0 } ],
    playoffBoostMul: 1.12, // ★ 季后赛玩家球队额外净效率 ×1.12
    dynastyFatigue: { streak2: 0.7, streak3: 1.4 }, // ★ 连冠疲劳：2 连冠净效率 -0.7、3 连冠额外 -1.4
    /** ★ 主场优势：主队净效率加成（≈ +4% 胜率）；背靠背惩罚（≈ -2.7%） */
    homeAdv: 0.7, // ★ A：主场优势贴近现实（主客场差约 +8%，原 1.35 实测 15% 偏高）
    b2bPenalty: 0.88,
    /** ★ NPC 伤病：每队每场小概率核心缺阵 3-10 场（按 OVR 惩罚净效率） */
    npcInjury: { chance: 0.018, minGames: 3, maxGames: 10, minOvr: 78, starPenalty: 2.9, midPenalty: 1.85, rolePenalty: 1.15 },
    /** ★ 老将轮休：33+ 岁 85+ 综评球员约 10% 概率轮休（净效率惩罚） */
    npcRest: { chance: 0.10, minAge: 33, minOvr: 85, penalty: 1.85 },
    /** ★ 星缘加成：玩家与 OVR≥90 球星联手时额外净效率加成
     *  oneStar 1 名球星；multiStar 2 名及以上（封顶，防无脑抱团） */
    starSynergy: { oneStar: 1.08, multiStar: 1.85, minStarOvr: 90 },
  },

  /** 奖项判定阈值 */
  AWARDS: {
    MVP:       { stat: 'pts', weight: 0.6, teamWeight: 0.4 },
    DPOY:      { stat: 'blk', weight: 0.4, teamWeight: 0.3, secondary: 'stl', weight2: 0.3 },
    SCORING:   { stat: 'pts', weight: 1.0 },
    CLUTCH:    { stat: 'clutch_pct', weight: 1.0 },
    ROOKIE:    { stat: 'pts', weight: 0.6, teamWeight: 0.4 },
  },

  /** ★ 奖项评选（贴合现实 + 玩家作为主角略强于历史顶级） */
  AWARD_RULES: {
    /** ★ NPC 奖项数据估算缩放：整体下调约 10%，给 90-95 综评玩家更多 MVP/最佳阵容/数据王机会
     *  只影响奖项评选（MVP/全明星/最佳阵容/数据王），不影响比赛模拟、FMVP、DPOY 竞争 */
    npcEstScale: { pts: 0.88, reb: 1.04, ast: 1.08 },
    /** ★ 玩家“成长兑现”档位统一为 90/92/95/98/99 五档（其他奖项概率不变，各档沿用原倍率值）
     *  95 档才真正进入 MVP 竞争，95→99 期望逐级增加，99 档生涯 MVP 约 6.5 次 */
    userGrowthBonus: { ovr90: 0.75, ovr92: 0.85, ovr95: 1.15, ovr98: 1.2, ovr99: 1.32 }, // ★ H1：95 档才真正进入 MVP 竞争
    MVP: {
      dataWeight: { pts: 1.0, reb: 0.45, ast: 0.40, stl: 0.25, blk: 0.30 },
      ovrFactor: 0.05,
      heroBonus: 1.18,          // ★ H1：主角评分加成（NPC 无此加成）
      topN: 7,                  // ★ 评分前 7 进票池（90-95 档更易进入竞争行列）
      dominanceWin: 0.56,       // ★ 评分第一且领先 ≥10%（99 档生涯期望 ≈6.5）
      closeWin: 0.46,           // ★ 评分第一但领先 <10%
      secondWin: 0.14,          // 评分第二
      thirdWin: 0.08,           // 评分第三
      fourthWin: 0.05,          // ★ 新增：评分第四（90-95 档爆冷窗口）
      fifthWin: 0.04,           // ★ 新增：评分第五
      sixthWin: 0.02,           // ★ 新增：评分第六
      minAvgPts: 20,            // ★ 场均得分硬门槛：低于 20 分不进入 MVP 评选
      streakMul: [1, 0.85, 0.7, 0.6, 0.55, 0.5, 0.45], // 连庄递减（解除硬封顶，确保 99 档生涯期望约 6.5 次）
      npcStreakMul: [1, 0.7, 0.45, 0.3],               // ★ D：NPC MVP 连庄递进衰减（2连 ×0.7 / 3连 ×0.45 / 4连+ ×0.3）
      starOvrGate: 90,                                  // ★ E：星秀 MVP 门槛 88 → 90（推迟到第3季左右进入竞争）
      // ★ NPC 生涯年：OVR≥90 的顶级球星每季 15% 概率数据爆发（×1.05-1.12），与玩家合理争 MVP
      npcCareerYear: { chance: 0.12, min: 1.05, max: 1.10 },
  // 玩家年龄放宽（GOAT 线）：≤34 全、35-36 ×0.1（乔丹 35 岁先例）、37+ 归零
      age: { cutoff34: 1, cutoff36: 0.1, cutoff38: 0, cutoff39: 0 },
      // ★ 新秀赛季保留冲击 MVP 窗口（玩家设定比历史顶级更强），但概率×0.25
      rookieMul: 0.25,
      // ★ M1：峰值期（OVR≥98 且场均≥20 分）MVP 权重提高×1.35，让 96 开局成长到 99 后稳定争 MVP
      peakMul: 1.35,
      // ★ 战绩种子系数进一步调平：1-2 →1.12、3-4 →1.06、5-6 →1.0、7-8 →0.9、9+ →0.8（约基奇式中游种子也能拿 MVP）
      seed: [[2, 1.12], [4, 1.06], [6, 1.0], [8, 0.9], [99, 0.8]],
    },
    // ★ M5：数据王竞争位置系数（让 SG/SF/PF/C 有小概率拿助攻王、PG 有小概率拿得分王，仅用于排名/获奖判定，不改场均数据）
    titlePosFactor: {
      scoring: { PG: 1.05, SG: 1.0, SF: 1.0, PF: 1.0, C: 1.0 },
      rebounding: { PG: 1.15, SG: 1.10, SF: 1.10, PF: 1.0, C: 1.0 },
      assisting: { PG: 1.0, SG: 1.18, SF: 1.22, PF: 1.35, C: 1.45 },
    },
    FMVP: {
      tierHigh: 0.995,  // 总决赛 ≥25 分或三双（GOAT 线：夺冠基本锁 FMVP）
      tierMidHigh: 0.98, // 20-25 分
      tierMid: 0.88,    // 15-20 分（表现一般仍大概率拿到）
      tierLow: 0.45,    // <15 分（表现拉胯仍有小概率爆冷）
  // 玩家年龄放宽：≤36 全、38 岁 ×0.25（卡里姆先例）、39+ 归零
      age: { cutoff36: 1, cutoff38: 0.25, cutoff39: 0 },
    },
    DPOY: {
      firstWin: 0.48,   // ★ H4：防守数据顶级（防内线垄断）
      secondTier: 0.35,  // ★ 提高：防守数据 3.2-3.55（SG/SF 外线抢断手更有机会）
      thirdTier: 0.30,   // ★ 提高：防守数据 2.8-3.2（90-95 档外线抢断手也有真实机会）
      lowTier: 0.20,     // ★ 提高：防守数据 2.2-2.8（低档后卫仍保留 DPOY 窗口）
      // ★ 位置系数：内线（PF/C）最高，小前锋次之（高于后卫、低于内线），后卫为内线约一半：PF/C > SF > PG/SG
      posFactor: { PG: 0.45, SG: 0.55, SF: 0.8, PF: 1.0, C: 1.0 },
      streakMul: [1, 0.85, 0.72, 0.62, 0.56, 0.52, 0.5],
      teamFactor: { good: 1.2, mid: 1.0, bad: 0.8 }, // ★ 弱队防守者也保留机会（原 0.7）
      // 玩家年龄放宽：≤34 全、35-36 ×0.5、37+ ×0.25
      age: { cutoff34: 1, cutoff36: 0.4, cutoff37: 0.15 },
      // ★ 新秀赛季可冲击 DPOY（玩家设定比历史顶级更强），但概率×0.25 降低
      rookieMul: 0.25,
    },
    /** ★ 数据王“竞逐制”：与联盟领头羊的差距 ≤8% 正常竞争、≤16% 小概率爆冷，
     *  让 90-95 档也有真实机会（99 档领先时近乎锁定，但仍保留 NPC 爆冷空间） */
    // ★ 已停用：数据王（得分/篮板/助攻王）已改为“确定性排名制”，场均最高者直接获奖，以下竞逐参数不再读取（保留备查）
  titleRace: {
      leadWin: 0.82, band: 0.08, bandWin: 0.82, darkHorseBand: 0.16, darkHorseWin: 0.10,
      // ★ 得分王专属竞逐：期望与助攻王相近（99 档各位置约 6.5-7.5 次/生涯）
      scoring: {
        leadWin: 0.9, band: 0.12, bandWin: 0.9, darkHorseBand: 0.28, darkHorseWin: 0.32,
        boost: { ovr90: 1.35, ovr92: 1.7, ovr95: 2.0, ovr98: 1.75, ovr99: 1.45 },
        posFactor: { PG: 0.75, SG: 0.9, SF: 1.05, PF: 1.3, C: 1.15 },
      },
    },
  },

  /** ★ 比赛事件规则：伤病线完全原版（injuryMult=1）；事件线（花絪/冲突/禁赛）独立判定，
   *  默认 eventMult=1.6 → 生涯约 3 次；同一事件单季不重复触发；按球队状态分配，禁赛整体调小 */
  EVENT_RULES: {
    matchEventMax: 2,
    matchCooldown: 10,
    injuryMult: 0.7,
    eventMult: 1.9,
    noRepeatInSeason: true,
    baseEventRate: 0.7, // ★ 事件线独立基准率：年轻期（年龄基准0）也能触发花絮/冲突/禁赛
    catRatio: {
      neutral: { suspension: 0.12, conflict: 0.18, flavor: 0.70 },
      good:    { suspension: 0.05, conflict: 0.10, flavor: 0.85 },
      bad:     { suspension: 0.20, conflict: 0.30, flavor: 0.50 },
    },
  },

  // ============================================================
  // 5. 联盟结构 — NBA东西部+分区
  // ============================================================
  CONFERENCE: {
    EAST: ['ATL','BOS','BKN','CHA','CHI','CLE','DET','IND','MIA','MIL','NYK','ORL','PHI','TOR','WAS'],
    WEST: ['DAL','DEN','GSW','HOU','LAC','LAL','MEM','MIN','NOP','OKC','PHX','POR','SAC','SAS','UTA'],
  },

  DIVISIONS: {
    Atlantic:    ['BOS','NYK','PHI','TOR','BKN'],
    Central:     ['CHI','CLE','DET','IND','MIL'],
    Southeast:   ['ATL','CHA','MIA','ORL','WAS'],
    Northwest:   ['DEN','MIN','OKC','POR','UTA'],
    Pacific:     ['GSW','LAC','LAL','PHX','SAC'],
    Southwest:   ['DAL','HOU','MEM','NOP','SAS'],
  },

  /** 各球队缩写→全名 */
  TEAM_NAMES: {
    ATL:'老鹰', BOS:'凯尔特人', BKN:'篮网', CHA:'黄蜂', CHI:'公牛',
    CLE:'骑士', DAL:'独行侠', DEN:'掘金', DET:'活塞', GSW:'勇士',
    HOU:'火箭', IND:'步行者', LAC:'快船', LAL:'湖人', MEM:'灰熊',
    MIA:'热火', MIL:'雄鹿', MIN:'森林狼', NOP:'鹈鹕', NYK:'尼克斯',
    OKC:'雷霆', ORL:'魔术', PHI:'76人', PHX:'太阳', POR:'开拓者',
    SAC:'国王', SAS:'马刺', TOR:'猛龙', UTA:'爵士', WAS:'奇才',
  },

  // ============================================================
  // 6. 新模拟引擎参数
  // ============================================================
  /** 比赛节奏 — 决定每队场均回合数 */
  PACE: {
    base: 100,          // 联盟平均节奏
    teamRange: 8,       // 各队节奏差异 ±8
  },

  /** 命中率基准（基于属性） */
  SHOOTING: {
    // ★ 模块三：命中率基准贴近 NBA 现实（顶级球员之上一些，不失控）
    threePT: { base: 0.32, attrFactor: 0.0020, max: 0.43, min: 0.26, eliteAt: 90, eliteBonus: 0.0008 },
    MID:     { base: 0.39, attrFactor: 0.0022, max: 0.52, min: 0.30, eliteAt: 90, eliteBonus: 0.0008 },
    FIN:     { base: 0.55, attrFactor: 0.0020, max: 0.70, min: 0.45, eliteAt: 90, eliteBonus: 0.0010 },
    FT:      { base: 0.75, attrFactor: 0.0020, max: 0.98, min: 0.55, eliteAt: 90, eliteBonus: 0.0015 },
  },

  /** 投篮分布（各位置出手占比） */
  SHOT_DIST: {
    PG: { threePT: 0.35, MID: 0.25, FIN: 0.25, FT: 0.15 },
    SG: { threePT: 0.38, MID: 0.22, FIN: 0.22, FT: 0.18 },
    SF: { threePT: 0.30, MID: 0.20, FIN: 0.30, FT: 0.20 },
    PF: { threePT: 0.20, MID: 0.18, FIN: 0.38, FT: 0.24 },
    C:  { threePT: 0.08, MID: 0.18, FIN: 0.48, FT: 0.25 },
  },

  /** 每节时长（秒）*/
  QUARTER_SECONDS: 720,

  /** 节奏事件 */
  MOMENTUM: {
    /** 最大 momentum 加成 */
    maxBonus: 1.15,
    /** 每节 momentum 衰减 */
    decayPerQuarter: 0.3,
    /** 大比分领先时的松懈 */
    complacencyThreshold: 15,
    complacencyFactor: 0.92,
  },
};

// 确保 SIM_CONFIG 全局可用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SIM_CONFIG;
}
