// ============================================================
// era-economics.js —— 历史时代经济系统（工资帽/合同规则/新秀薪资/底薪中产）
// 只影响历史时代（draftMode === 'historical'），现实模式完全不受影响。
// 单位：万（1 亿 = 10000）。
// 数据来源：Spotrac / RealGM 工资帽全表、cbafaq 新秀薪资表（1998-99~2004-05 全表）、
//           1995-97 状元首年薪资、公开报道的超长约（魔术师/拉里·约翰逊/韦伯/格伦·罗宾逊）。
// 设计口径：1984-94 无顶薪（球星可达帽的 40-55%）/ 1995-98 顶薪雏形（30-40%）/
//           1999+ 正式顶薪（帽的 25/30/35%，按 0-6/7-9/10+ 年服务年限）。
// ============================================================

/** 是否处于历史时代开局 */
function isEraEconomyActive() {
  return !!(typeof STATE !== 'undefined' && STATE && STATE.draftMode === 'historical'
    && STATE.eraStart != null && typeof getEraSeasonYear === 'function');
}

/** 当前历史时代赛季年份（1984 时代第 1 季 = 1984-85 赛季 → 返回 1984） */
function getEraEconomyYear() {
  var sc = (STATE.career && STATE.career.seasonCount) || 0;
  return getEraSeasonYear(STATE.eraStart, sc);
}

/** 历史平均工资（万/年）：1984-2001 为公开数据，之后按工资帽 × 9% 估算（近似） */
var ERA_AVG_SALARY = {
  1984: 33, 1985: 38.2, 1986: 43.1, 1987: 50.2, 1988: 57.5, 1989: 71.7,
  1990: 92.7, 1991: 110, 1992: 130, 1993: 150, 1994: 180, 1995: 200,
  1996: 230, 1997: 260, 1998: 300, 1999: 360, 2000: 420, 2001: 450
};
function getEraAvgSalary(year) {
  year = parseInt(year, 10) || 1984;
  if (ERA_AVG_SALARY[year]) return ERA_AVG_SALARY[year];
  if (year < 1984) return ERA_AVG_SALARY[1984];
  var cap = (typeof getEraSalaryCap === 'function') ? getEraSalaryCap(year) : 360;
  return Math.round(cap * 0.09 * 10) / 10;
}

/** 新秀首年薪资锚点（状元，万）：1995 起有真实薪资表，中间年份线性插值 */
var ERA_ROOKIE_SCALE_ANCHORS = {
  // ★ 真实新秀薪资表（状元首年，万）：1995-2004（2002/2003/2004 与真实 scale 一致，已核对）
  1995: 251.5, 1996: 297.8, 1997: 316.0, 1998: 327.0, 1999: 339.0,
  2000: 350.0, 2001: 361.0, 2002: 321.5, 2003: 334.9, 2004: 348.3
};

/** 顺位系数（相对状元，取 2003-04 届真实曲线，1-29 顺位） */
var ERA_PICK_FACTORS = [
  1, 0.895, 0.803, 0.724, 0.656, 0.596, 0.544, 0.498, 0.458, 0.435,
  0.413, 0.393, 0.373, 0.354, 0.337, 0.320, 0.304, 0.289, 0.276, 0.265,
  0.254, 0.244, 0.234, 0.225, 0.216, 0.209, 0.203, 0.201, 0.200
];

/** 状元首年薪资（万）：1995-2004 锚点间线性插值；2005 起按工资帽比例外推 */
function getEraRookieScale1(year) {
  year = parseInt(year, 10) || 1984;
  var years = Object.keys(ERA_ROOKIE_SCALE_ANCHORS).map(Number).sort(function(a, b) { return a - b; });
  if (year <= years[0]) return ERA_ROOKIE_SCALE_ANCHORS[years[0]];
  if (year >= years[years.length - 1]) {
    var lastY = years[years.length - 1];
    var lastV = ERA_ROOKIE_SCALE_ANCHORS[lastY];
    var lastCap = (typeof getEraSalaryCap === 'function') ? getEraSalaryCap(lastY) : 4384;
    var cap = (typeof getEraSalaryCap === 'function') ? getEraSalaryCap(year) : lastCap;
    // 2004→2025 实际涨幅约为帽涨幅的 1.2 倍（BRI 增速略快于帽）
    return Math.round(lastV * (cap / lastCap) * 1.2 * 10) / 10;
  }
  for (var i = 1; i < years.length; i++) {
    if (year <= years[i]) {
      var y0 = years[i - 1], y1 = years[i];
      var v0 = ERA_ROOKIE_SCALE_ANCHORS[y0], v1 = ERA_ROOKIE_SCALE_ANCHORS[y1];
      return Math.round((v0 + (v1 - v0) * (year - y0) / (y1 - y0)) * 10) / 10;
    }
  }
  return 348.3;
}

/** 历史时代新秀首年薪资（万）：
 *  1995 起按真实薪资表 × 顺位系数；1984-94 无标准表 → 平均工资 × 顺位系数（状元约 4 倍平均工资） */
function eraRookieSalary(year, pick) {
  year = parseInt(year, 10) || 1984;
  pick = parseInt(pick, 10) || 60;
  if (year >= 1995) {
    var s1 = getEraRookieScale1(year);
    if (pick >= 1 && pick <= 29) return Math.max(30, Math.round(s1 * ERA_PICK_FACTORS[pick - 1] / 5) * 5);
    // 次轮：约首轮末的 55%，接近当年底薪
    return Math.max(25, Math.round(s1 * 0.2 * 0.55 / 5) * 5);
  }
  // 1984-94：平均工资 × 顺位系数 × 2.7（乔丹 7 年 630 万、年均约 85 万 = 平均工资 ×2.7）
  var avg = getEraAvgSalary(year);
  var coef = (pick >= 1 && pick <= 29) ? (ERA_PICK_FACTORS[pick - 1] * 2.7) : 0.3;
  return Math.max(8, Math.round(avg * coef / 5) * 5);
}

/** 历史时代新秀合同年限：1984-94 超长约（高顺位 7-10、低顺位 3-6）；1995+ 首轮 4 年（2+2）/次轮 2 年 */
function eraRookieYears(year, pick) {
  year = parseInt(year, 10) || 1984;
  pick = parseInt(pick, 10) || 60;
  if (year <= 1994) {
    if (pick <= 5) return 8 + Math.floor(Math.random() * 3);   // 8-10
    if (pick <= 14) return 7 + Math.floor(Math.random() * 3);  // 7-9
    if (pick <= 30) return 4 + Math.floor(Math.random() * 3);  // 4-6
    return 2 + Math.floor(Math.random() * 3);                  // 2-4
  }
  return pick <= 30 ? 4 : 2;
}

/** 顶薪比例（%）：1984-94 无顶薪（40/45/55）；1995-98 顶薪雏形（30/35/40）；1999+ 正式（25/30/35） */
function eraMaxSalaryPct(year, serviceYears) {
  year = parseInt(year, 10) || 1984;
  var s = parseInt(serviceYears, 10) || 0;
  var idx = s <= 6 ? 0 : (s <= 9 ? 1 : 2);
  if (year <= 1994) return [45, 50, 60][idx]; // ★ 伯德/魔术师 ~50% 帽（180 万/360 万帽）
  if (year <= 1998) return [30, 35, 40][idx];
  return [25, 30, 35][idx];
}

/** NPC 服务年限估算：年龄 - 20 */
function eraNpcServiceYears(age) {
  return Math.max(0, (parseInt(age, 10) || 22) - 20);
}

/** 明星档比例（%）：顶薪与首发之间 */
function eraStarPct(year) {
  year = parseInt(year, 10) || 1984;
  if (year <= 1994) return 33;
  if (year <= 1998) return 27;
  return 26;
}

/** 历史时代底薪（万/年）：1984-94 平均工资 × 0.25；1995-2004 帽 × 1.0%；2005+ 帽 × 0.9% */
function eraMinSalary(year) {
  year = parseInt(year, 10) || 1984;
  if (year <= 1994) return Math.round(getEraAvgSalary(year) * 0.25);
  var cap = (typeof getEraSalaryCap === 'function') ? getEraSalaryCap(year) : 360;
  return Math.round(cap * (year <= 2004 ? 0.010 : 0.009));
}

/** 历史时代中产（万/年）：1998-99 起有中产特例，近似帽的 8.5-11% */
function eraMleSalary(year) {
  year = parseInt(year, 10) || 1984;
  var cap = (typeof getEraSalaryCap === 'function') ? getEraSalaryCap(year) : 360;
  if (year < 1998) return Math.round(cap * 0.10);
  if (year <= 2004) return Math.round(cap * 0.112);
  return Math.round(cap * 0.09);
}

/** 历史时代自由球员/续约合同年限：1984-94 长 6-8；1995-98 长 5-6；1999-04 长 6；2005+ 长 5（续约 6） */
function eraFreeAgentYears(year, age, longTerm) {
  year = parseInt(year, 10) || 1984;
  age = parseInt(age, 10) || 22;
  if (typeof isVeteranPhase === 'function' && isVeteranPhase(age)) return 1;
  if (year <= 1994) {
    if (longTerm === true) return 6 + Math.floor(Math.random() * 3);
    if (longTerm === false) return 2 + Math.floor(Math.random() * 2);
    if (age <= 26) return 6 + Math.floor(Math.random() * 3);
    if (age <= 32) return 4 + Math.floor(Math.random() * 3);
    return 2 + Math.floor(Math.random() * 2);
  }
  if (year <= 1998) {
    if (longTerm === true) return 5 + Math.floor(Math.random() * 2);
    if (longTerm === false) return 2 + Math.floor(Math.random() * 2);
    return 4 + Math.floor(Math.random() * 3);
  }
  if (year <= 2004) {
    if (longTerm === true) return 6;
    if (longTerm === false) return 2 + Math.floor(Math.random() * 2);
    return 4 + Math.floor(Math.random() * 3);
  }
  // 2005+
  if (longTerm === true) return 5;
  if (longTerm === false) return 2 + Math.floor(Math.random() * 2);
  if (age <= 30) return 3 + Math.floor(Math.random() * 3);
  return 2 + Math.floor(Math.random() * 3);
}

/** 历史时代按 OVR/年龄生成 NPC 年薪（万）：顶薪/明星/首发/中产/底薪 → 当年帽 × 比例 */
function eraSalaryByOvr(year, ovr, age) {
  year = parseInt(year, 10) || 1984;
  ovr = parseInt(ovr, 10) || 75;
  age = parseInt(age, 10) || 27;
  var cap = (typeof getEraSalaryCap === 'function') ? getEraSalaryCap(year) : 360;
  var svc = eraNpcServiceYears(age);
  var val;
  if (ovr >= 92) val = cap * eraMaxSalaryPct(year, svc) / 100;
  else if (ovr >= 89) val = cap * eraStarPct(year) / 100;
  else if (ovr >= 85) val = cap * 0.17;
  else if (ovr >= 78) val = cap * 0.10;
  else val = eraMinSalary(year);
  // 老将年龄封顶（与玩家报价一致）：37+ 中产档、39+ 底薪档
  if (age >= 39) val = eraMinSalary(year);
  else if (age >= 37) val = Math.min(val, cap * 0.10);
  return Math.max(eraMinSalary(year), Math.round(val / 5) * 5);
}

/** 历史时代 NPC 合同年限（年）：球星/核心长约，角色球员短约，老将期一律短约。
 *  1984-94 无年限限制（球星 5-8 / 轮换 2-6）；1995-2004 首轮 4-6 / 角色 1-4；
 *  2005+ 球星 3-5 / 角色 1-4。 */
function eraNpcContractYears(year, ovr, age, isCore) {
  year = parseInt(year, 10) || 1984;
  ovr = parseInt(ovr, 10) || 75;
  age = parseInt(age, 10) || 27;
  if (typeof isVeteranPhase === 'function' && isVeteranPhase(age)) return 1 + Math.floor(Math.random() * 2);
  var star = ovr >= 85 || (isCore && ovr >= 80);
  if (year <= 1994) {
    if (star) return 5 + Math.floor(Math.random() * 4);   // 5-8 年（伯德 7 年/乔丹 8 年同档）
    if (ovr >= 70 || age <= 26) return 3 + Math.floor(Math.random() * 4); // 3-6
    return 2 + Math.floor(Math.random() * 3);             // 2-4
  }
  if (year <= 2004) {
    if (star) return 4 + Math.floor(Math.random() * 3);   // 4-6（1999 CBA 上限 6 年）
    if (age <= 26) return 2 + Math.floor(Math.random() * 3);
    return 1 + Math.floor(Math.random() * 3);
  }
  // 2005+
  if (star) return 3 + Math.floor(Math.random() * 3);     // 3-5（2005 CBA 上限 5 年）
  if (age <= 26) return 2 + Math.floor(Math.random() * 3);
  return 1 + Math.floor(Math.random() * 3);
}

/** 年代化经济缩放系数：按当年平均工资 ÷ 现代基准（≈1300万） */
function eraPriceFactor(year) {
  year = parseInt(year, 10) || 1984;
  return getEraAvgSalary(year) / 1300;
}

/** 金额年代化：历史时代按 eraPriceFactor 缩放（保留至少 1 万，避免小额归零） */
function eraMoney(v) {
  v = Number(v) || 0;
  if (typeof isEraEconomyActive !== 'function' || !isEraEconomyActive()) return Math.round(v);
  var f = eraPriceFactor((typeof getEraEconomyYear === 'function') ? getEraEconomyYear() : 1984);
  var scaled = Math.round(v * f);
  if (v > 0) return Math.max(1, scaled);
  if (v < 0) return Math.min(-1, scaled);
  return 0;
}

/** 事件/物品年代门槛：返回最早可出现的年份（现实模式恒 0）；支持显式 ev.eraMinYear */
function getEventEraMinYear(ev) {
  if (!ev || typeof ev !== 'object') return 0;
  if (ev.eraMinYear != null) return ev.eraMinYear;
  if (ev.eraMin != null) return ev.eraMin; // ★ 故事事件使用 eraMin 字段（与 offseason 队列一致），统一生效
  if (typeof isEraEconomyActive !== 'function' || !isEraEconomyActive()) return 0;
  var text = String(ev.title || '') + String(ev.name || '') + String(ev.id || '') + String(ev.body || '') + String(ev.desc || '') + String(ev.copy || '');
  if (/(加密货币|比特币|币圈|crypto|加密币)/i.test(text)) return 2009;
  if (/(吐槽2K|2K评分|2K给|2K官方)/.test(text)) return 1999;
  if (/(蓝牙音箱|EDM|电音)/.test(text)) return 2005;
  if (/(社交媒体|社媒|推特|Twitter|Instagram|IG直播|TikTok|抖音|Twitch|网红|TMZ|表情包|虎扑直播|直播打游戏|微信|银行App|被Shaq|帕金斯|Perkins|Stephen A|勒布朗|杜兰特)/.test(text)) return 2006;
  return 0;
}

/** 事件/物品年代门槛过滤：当前年代 < 门槛则不出现 */
function isEventAllowedInEra(ev) {
  if (typeof isEraEconomyActive === 'function' && !isEraEconomyActive()) return true;
  var minY = getEventEraMinYear(ev);
  if (minY <= 0) return true;
  var y = (typeof getEraEconomyYear === 'function') ? getEraEconomyYear() : 0;
  return y >= minY;
}

/** 附加赛年代门槛：2019-20 赛季起才有附加赛（2020 年泡泡赛区首次引入）；此前前八直接进季后赛 */
function isPlayInEraEnabled() {
  if (typeof isEraEconomyActive === 'function' && !isEraEconomyActive()) return true;
  var y = (typeof getEraEconomyYear === 'function') ? getEraEconomyYear() : 0;
  return y >= 2019;
}
function getEraPlayoffMaxSeed() {
  return isPlayInEraEnabled() ? 10 : 8;
}

/** 日历年份：历史时代 = 时代起点 + 赛季数；现实 = 2025 + 赛季数（修复硬编码 2025） */
function getCalendarYearForSeasonCount(count) {
  count = parseInt(count, 10) || 0;
  if (typeof isEraEconomyActive === 'function' && isEraEconomyActive() && typeof getEraSeasonYear === 'function') {
    return getEraSeasonYear(STATE.eraStart, count);
  }
  return 2025 + count;
}
function getCalendarYearForSeasonNum(n) {
  n = parseInt(n, 10) || 1;
  // 赛季号 → 历法年份：历史模式 1984 时代第 1 季 = 1984-85；现实模式第 1 季 = 2026-27（历法 2026）
  if (typeof isEraEconomyActive === 'function' && isEraEconomyActive() && typeof getEraSeasonYear === 'function') {
    return getEraSeasonYear(STATE.eraStart, n - 1);
  }
  return 2025 + n;
}

/** 历史球员选秀年份（从 HISTORICAL_DRAFT_CLASSES 按 en 查找；找不到返回 null） */
function getEraPlayerDraftYear(en) {
  if (!en) return null;
  if (typeof HISTORICAL_DRAFT_CLASSES !== 'undefined') {
    var years = Object.keys(HISTORICAL_DRAFT_CLASSES);
    for (var i = 0; i < years.length; i++) {
      var list = HISTORICAL_DRAFT_CLASSES[years[i]] || [];
      for (var j = 0; j < list.length; j++) {
        if (list[j].en === en) return parseInt(years[i], 10);
      }
    }
  }
  // ★ 1984 时代之前的补充表（79-83 届球星）：HISTORICAL_DRAFT_CLASSES 从 1984 届才开始
  if (typeof ERA_PRE_DRAFT_YEARS !== 'undefined' && ERA_PRE_DRAFT_YEARS[en] != null) return ERA_PRE_DRAFT_YEARS[en];
  return null;
}

/** 历史时代核心球员年龄：按真实选秀年份估算（19-21 岁入盟）；无选秀数据返回 null */
function eraPlayerAgeByDraft(eraYear, en) {
  var eraY = parseInt(eraYear, 10) || 0;
  // 1) 优先按真实出生年（ERA_HISTORICAL_BIRTHS / 选秀表 birth）精确计算
  var by = null;
  if (typeof ERA_HISTORICAL_BIRTHS !== 'undefined' && ERA_HISTORICAL_BIRTHS[en] != null) by = parseInt(ERA_HISTORICAL_BIRTHS[en], 10);
  if (by == null && typeof HISTORICAL_DRAFT_CLASSES !== 'undefined') {
    try {
      var years = Object.keys(HISTORICAL_DRAFT_CLASSES);
      for (var i = 0; i < years.length; i++) {
        var list = HISTORICAL_DRAFT_CLASSES[years[i]] || [];
        for (var j = 0; j < list.length; j++) {
          if (list[j] && list[j].en === en && list[j].birth != null) { by = parseInt(list[j].birth, 10); break; }
        }
        if (by != null) break;
      }
    } catch(e) {}
  }
  if (by != null) {
    var a0 = eraY - by;
    if (a0 >= 16 && a0 <= 50) return a0;
  }
  // 2) 回退：按真实选秀年份估算（19-21 岁入盟）
  var dy = getEraPlayerDraftYear(en);
  if (dy == null) return null;
  var age = eraY - dy + 19 + Math.floor(Math.random() * 3);
  return Math.max(19, Math.min(45, age));
}

/** 统一薪资档位基准（万）：现实模式返回原 cfg.salaryBase；历史模式按当年帽 × 时代比例 */
function getSalaryBases() {
  if (isEraEconomyActive()) {
    var year = getEraEconomyYear();
    var cap = (typeof getEraSalaryCap === 'function') ? getEraSalaryCap(year) : 360;
    var svc = (STATE.career && STATE.career.seasonCount) || 0;
    var maxPct = eraMaxSalaryPct(year, svc);
    return {
      max: { minOvr: 92, base: cap * maxPct / 100, pct: maxPct },
      star: { minOvr: 89, base: cap * eraStarPct(year) / 100 },
      starter: { minOvr: 85, base: cap * 0.17 },
      mid: { minOvr: 78, base: cap * 0.10 },
      min: { minOvr: 0, base: eraMinSalary(year) }
    };
  }
  var cfg = getEconCfg();
  return cfg.salaryBase || {};
}

// ============================================================
// 历史真实合同锚点（万美元/年）：各时代核心球星真实年薪与年限（搜索自公开资料）
// 其余球员由 eraNpcContractYears / eraSalaryByOvr 公式按时代生成
// ============================================================
var HISTORICAL_REAL_CONTRACTS = {
  1984: {
    'Magic Johnson': { years: 3, salary: 250 },
    'Kareem Abdul-Jabbar': { years: 2, salary: 153 },
    'James Worthy': { years: 3, salary: 90 },
    'Byron Scott': { years: 2, salary: 65 },
    'Michael Cooper': { years: 2, salary: 60 },
    'Larry Bird': { years: 2, salary: 180 },
    'Kevin McHale': { years: 2, salary: 100 },
    'Robert Parish': { years: 2, salary: 95 },
    'Dennis Johnson': { years: 2, salary: 60 },
    'Danny Ainge': { years: 2, salary: 40 },
    'Moses Malone': { years: 2, salary: 212 },
    'Julius Erving': { years: 2, salary: 105 },
    'Maurice Cheeks': { years: 2, salary: 50 },
    'Isiah Thomas': { years: 3, salary: 70 },
    'Sidney Moncrief': { years: 2, salary: 85 },
    'Adrian Dantley': { years: 2, salary: 80 },
    'Alex English': { years: 2, salary: 75 },
    'George Gervin': { years: 2, salary: 70 },
    'Bernard King': { years: 2, salary: 80 },
    'Ralph Sampson': { years: 3, salary: 130 },
    'Clyde Drexler': { years: 3, salary: 85 },
    'Dominique Wilkins': { years: 3, salary: 95 },
    'Charles Barkley': { years: 3, salary: 95 },
    'John Stockton': { years: 3, salary: 70 },
    'Hakeem Olajuwon': { years: 3, salary: 80 }
  },
  1996: {
    'Michael Jordan': { years: 2, salary: 3014 },
    'Scottie Pippen': { years: 1, salary: 225 },
    'Dennis Rodman': { years: 1, salary: 900 },
    'Toni Kukoc': { years: 2, salary: 396 },
    'Ron Harper': { years: 2, salary: 384 },
    'Karl Malone': { years: 3, salary: 466 },
    'John Stockton': { years: 2, salary: 600 },
    'Jeff Hornacek': { years: 2, salary: 240 },
    'David Robinson': { years: 2, salary: 995 },
    'Sean Elliott': { years: 2, salary: 350 },
    'Hakeem Olajuwon': { years: 2, salary: 966 },
    'Charles Barkley': { years: 2, salary: 322 },
    'Clyde Drexler': { years: 2, salary: 400 },
    'Patrick Ewing': { years: 2, salary: 2050 },
    'Allan Houston': { years: 3, salary: 500 },
    'Gary Payton': { years: 2, salary: 1051 },
    'Shawn Kemp': { years: 4, salary: 1050 },
    "Shaquille O'Neal": { years: 4, salary: 1071 },
    'Eddie Jones': { years: 2, salary: 500 },
    'Allen Iverson': { years: 3, salary: 226 },
    'Jerry Stackhouse': { years: 3, salary: 250 },
    'Kevin Garnett': { years: 1, salary: 186 },
    'Reggie Miller': { years: 2, salary: 500 },
    'Rik Smits': { years: 2, salary: 500 },
    'Grant Hill': { years: 2, salary: 500 },
    'Tim Hardaway': { years: 3, salary: 800 },
    'Alonzo Mourning': { years: 3, salary: 900 },
    'Anfernee Hardaway': { years: 3, salary: 900 },
    'Dikembe Mutombo': { years: 3, salary: 800 },
    'Vin Baker': { years: 3, salary: 600 }
  },
  2003: {
    "Shaquille O'Neal": { years: 2, salary: 2650 },
    'Kobe Bryant': { years: 2, salary: 1350 },
    'Karl Malone': { years: 1, salary: 150 },
    'Gary Payton': { years: 1, salary: 490 },
    'Derek Fisher': { years: 2, salary: 300 },
    'Tim Duncan': { years: 4, salary: 1268 },
    'Tony Parker': { years: 2, salary: 125 },
    'Manu Ginobili': { years: 2, salary: 87 },
    'Bruce Bowen': { years: 2, salary: 300 },
    'Kevin Garnett': { years: 3, salary: 2800 },
    'Latrell Sprewell': { years: 2, salary: 1200 },
    'Sam Cassell': { years: 2, salary: 500 },
    'Tracy McGrady': { years: 2, salary: 1358 },
    "Jermaine O'Neal": { years: 3, salary: 1050 },
    'Ron Artest': { years: 2, salary: 400 },
    'Reggie Miller': { years: 2, salary: 550 },
    'Jamaal Tinsley': { years: 2, salary: 300 },
    'Jason Kidd': { years: 3, salary: 1326 },
    'Kenyon Martin': { years: 3, salary: 700 },
    'LeBron James': { years: 4, salary: 402 },
    'Dwyane Wade': { years: 4, salary: 284 },
    'Carmelo Anthony': { years: 4, salary: 338 },
    'Chris Bosh': { years: 4, salary: 324 },
    'Yao Ming': { years: 3, salary: 386 },
    'Steve Francis': { years: 2, salary: 1000 },
    'Allen Iverson': { years: 2, salary: 1623 },
    'Vince Carter': { years: 2, salary: 1100 },
    'Dirk Nowitzki': { years: 3, salary: 900 },
    'Steve Nash': { years: 3, salary: 700 },
    'Ben Wallace': { years: 3, salary: 500 },
    'Chauncey Billups': { years: 3, salary: 500 },
    'Richard Hamilton': { years: 3, salary: 500 },
    'Rasheed Wallace': { years: 2, salary: 1300 },
    'Pau Gasol': { years: 3, salary: 470 },
    'Chris Webber': { years: 3, salary: 1500 }
  }
};

/** 查询历史真实合同（无则返回 null） */
function getHistoricalRealContract(era, en) {
  try {
    var t = HISTORICAL_REAL_CONTRACTS[String(era)] || null;
    if (!t) return null;
    return t[en] || null;
  } catch (e) { return null; }
}
