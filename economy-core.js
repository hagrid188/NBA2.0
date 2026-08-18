// ============================================================
// economy-core.js —— 经济逻辑（阶段 A：从 __ai_app.html 外置）
// 薪资档位/报价/工资帽/球队薪资总额/奖金/结算/金额格式化。
// 只依赖 game-config.js(SIM_CONFIG) 与 era-economics.js(时代分支)，均为调用时引用。
// ============================================================


function getEconCfg() {
  return (SIM_CONFIG && SIM_CONFIG.SIM_ECONOMY) || {};
}


function ensureEconomyState() {
  var c = STATE.career || {};
  if (c.money == null) c.money = 0;
  if (c.earnings == null) c.earnings = 0;
  if (c.spent == null) c.spent = 0;
  if (c.teamFees == null) c.teamFees = 0;
  if (c.surgeryCost == null) c.surgeryCost = 0;
  if (c.charityTotal == null) c.charityTotal = 0;
  if (!Array.isArray(c.purchases)) c.purchases = [];
  if (!Array.isArray(c.assets)) c.assets = [];
  if (!Array.isArray(c.moneyLog)) c.moneyLog = [];
  if (c.currentSalary == null) c.currentSalary = 0;
  if (!c.flags) c.flags = {};
  if (!c.flags.teamTreat) c.flags.teamTreat = {};
  return c;
}


function addMoney(delta, reason) {
  var c = ensureEconomyState();
  delta = Math.round(Number(delta) || 0);
  if (!delta) return true;
  if (delta < 0 && c.money + delta < 0) return false;
  c.money += delta;
  if (delta > 0) c.earnings += delta; else c.spent += -delta;
  if (reason) {
    c.moneyLog.push({ t: Date.now(), delta: delta, reason: reason });
    if (c.moneyLog.length > 200) c.moneyLog = c.moneyLog.slice(-200);
  }
  return true;
}


function getCurrentSalary() {
  return ensureEconomyState().currentSalary || 0;
}


function fmtMoney(v) {
  v = Math.round(Number(v) || 0);
  var neg = v < 0;
  var a = Math.abs(v);
  if (a >= 10000) {
    // 以“百分之一亿”为单位保留 2 位小数精度，避免浮点误差（10050万 → 1.01亿）
    var yi = Math.round(a / 100) / 100;
    var s = (yi % 1 === 0) ? String(yi) : String(yi).replace(/\.?0+$/, '');
    return (neg ? '-' : '') + s + '亿';
  }
  return (neg ? '-' : '') + a + '万';
}


function econFluctVal(seed, salt, min, max) {
  var s = String(seed || '') + '|' + (salt != null ? salt : '');
  var h = 0;
  for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 997;
  return min + (h % 1000) / 1000 * (max - min);
}


function getSalaryYearFactor(seed) {
  var cfg = getEconCfg();
  var season = (STATE.career && STATE.career.seasonCount) || 0;
  var min = (cfg.salaryYearMin != null) ? cfg.salaryYearMin : 0.02;
  var fl = cfg.salaryYearFluct || [0, 0.04];
  var rate = min + econFluctVal(seed, season, fl[0], fl[1]);
  return Math.pow(1 + rate, season);
}


/** ★ 2026-08-17：老将薪资平滑曲线（OVR × 上季得分 × 年龄），替代硬档位“39+ 底薪” */
function getSmoothSalaryFactors(age, ovr, ppg) {
  age = parseInt(age, 10) || 27;
  ovr = parseInt(ovr, 10) || 75;
  var ageF = 1;
  if (age <= 22) ageF = 0.6;
  else if (age <= 25) ageF = 0.8;
  else if (age <= 32) ageF = 1.0;
  else if (age <= 34) ageF = 0.97;
  else if (age <= 35) ageF = 0.92;
  else if (age <= 36) ageF = 0.86;
  else if (age <= 37) ageF = 0.80;
  else if (age <= 38) ageF = 0.74;
  else if (age <= 39) ageF = 0.68;
  else if (age <= 40) ageF = 0.62;
  else if (age <= 41) ageF = 0.57;
  else ageF = 0.52;
  var ovrF = ovr >= 99 ? 1.25 : ovr >= 97 ? 1.18 : ovr >= 95 ? 1.12 : ovr >= 93 ? 1.06 : ovr >= 91 ? 1.0 : ovr >= 89 ? 0.94 : ovr >= 87 ? 0.88 : ovr >= 85 ? 0.82 : 0.75;
  var scoreF = 1;
  ppg = parseFloat(ppg) || 0;
  if (ppg >= 30) scoreF = 1.35;
  else if (ppg >= 26) scoreF = 1.25;
  else if (ppg >= 22) scoreF = 1.15;
  else if (ppg >= 18) scoreF = 1.05;
  else if (ppg >= 14) scoreF = 0.95;
  else if (ppg > 0) scoreF = 0.85;
  var maxCapMul = 1;
  if (age >= 35) maxCapMul = age >= 41 ? 0.55 : age >= 39 ? 0.65 : age >= 37 ? 0.80 : 0.92;
  return { ageF: ageF, ovrF: ovrF, scoreF: scoreF, maxCapMul: maxCapMul };
}
/** 上季场均得分（用户取真实；NPC 用 OVR 估算） */
function getLastSeasonPpg(p, ovr) {
  try {
    if (!p && STATE && STATE.career && Array.isArray(STATE.career.seasons) && STATE.career.seasons.length) {
      var _last = STATE.career.seasons[STATE.career.seasons.length - 1];
      if (_last && _last.playerStats && _last.playerStats.games > 0) return _last.playerStats.pts / _last.playerStats.games;
    }
  } catch(e) {}
  var o = parseInt(ovr, 10) || 75;
  return Math.round((o - 50) * 0.42 + 10);
}

function estimatePlayerSalary(p, age, ovr) {
  var cfg = getEconCfg();
  var eraMode = (typeof isEraEconomyActive === 'function') && isEraEconomyActive();
  var sb = getSalaryBases();
  var ov = parseInt(ovr != null ? ovr : (p && p.ovr)) || 75;
  var ag = age != null ? age : ((p && p._age) || 27);
  var base = sb.min ? sb.min.base : 600, type = 'min';
  if (ov >= ((sb.max && sb.max.minOvr) || 92)) { base = sb.max.base; type = 'max'; }
  else if (ov >= ((sb.star && sb.star.minOvr) || 89)) { base = sb.star.base; type = 'star'; }
  else if (ov >= ((sb.starter && sb.starter.minOvr) || 85)) { base = sb.starter.base; type = 'starter'; }
  else if (ov >= ((sb.mid && sb.mid.minOvr) || 78)) { base = sb.mid.base; type = 'mid'; }
  // ★ 2026-08-17：老将薪资平滑曲线（OVR × 上季得分 × 年龄），替代硬档位“39+ 底薪”
  var _sf = getSmoothSalaryFactors(ag, ov, getLastSeasonPpg(p, ov));
  var ageF = _sf.ageF, ovrF = _sf.ovrF, scoreF = _sf.scoreF;
  var salary = base * ageF * ovrF * scoreF;
  // 老将顶薪软上限（保留不给顶薪底线）
  if (ag >= 35 && sb.max && sb.max.base) salary = Math.min(salary, sb.max.base * _sf.maxCapMul);
  // ★ 年度上涨（只涨不跌）：按赛季复利；历史时代帽已按真实轨迹变化，不再叠加年涨因子
  if (!eraMode) salary *= getSalaryYearFactor(p ? (p.name || p.cname || 'npc') : 'npc');
  if (p && p.contractType === 'rookie') {
    if (eraMode && typeof eraRookieSalary === 'function') {
      var _eraRY = (typeof getEraEconomyYear === 'function') ? getEraEconomyYear() : 1984;
      salary = eraRookieSalary(_eraRY, (p && p._draftPick) || 15);
    } else {
      var rs = cfg.rookieSalary || {};
      var pk = p._pickType || p.type || '';
      salary = rs[pk] || rs.first || 900;
    }
  }
  // ★ 已写入的真实合同薪资（现役 REAL_CONTRACTS / 历史 HISTORICAL_REAL_CONTRACTS）直接保留，不再取整或套下限
  if (p && typeof p.salary === 'number' && p.salary > 0) return Math.round(p.salary);
  var _floor = (sb.min && sb.min.base) || 600;
  // ★ 2026-08-17：舍入粒度按时代——历史时代 5 万（底薪 8-44 万，50 万粒度会归 0 或虚高），现代 50 万
  var _gran = (typeof isEraEconomyActive === 'function') && isEraEconomyActive() ? 5 : 50;
  return Math.max(_floor, Math.round(salary / _gran) * _gran);
}


function getTeamPayroll(team) {
  var roster = (NBA2K_DATA && NBA2K_DATA[team]) || [];
  var total = 0;
  roster.forEach(function(p) {
    if (!p || p._isUser) return;
    var age = typeof getLeaguePlayerAge === 'function' ? getLeaguePlayerAge(p) : (p._age || 27);
    total += estimatePlayerSalary(p, age, p.ovr);
  });
  return Math.round(total);
}

/** 球队帽下空间（万）：负数 = 超帽；不统计玩家（玩家薪资单列） */
function getCapSpace(team) {
  var cap = (typeof getSalaryCap === 'function') ? getSalaryCap() : 14000;
  var payroll = getTeamPayroll(team);
  // ★ NBA2.0：王朝制裁——连续夺冠球队帽下空间下调（1冠-500 / 2冠-1200 / 3冠+ -2000 万）
  var _strk = (typeof getTeamChampStreak === 'function') ? getTeamChampStreak(team) : 0;
  var _dynPen = _strk >= 3 ? 2000 : _strk === 2 ? 1200 : _strk === 1 ? 500 : 0;
  return cap - payroll - _dynPen;
}

/** 奢侈税线（万）：简化 = 工资帽 × 1.25（可用 SIM_ECONOMY.luxuryMult 覆盖），返回 { line, payroll, over } */
function getLuxuryStatus(team) {
  var cfg = getEconCfg();
  var cap = (typeof getSalaryCap === 'function') ? getSalaryCap() : 14000;
  var mult = (cfg && cfg.luxuryMult) || 1.25;
  var line = Math.round(cap * mult);
  var payroll = getTeamPayroll(team);
  return { line: line, payroll: payroll, over: payroll > line };
}


function getSalaryCap() {
  var cfg = getEconCfg();
  // ★ 历史时代：工资帽按真实历史轨迹（1984=360万 → 1997=2690万 → 2018=10180万 → 之后+3%/年外推）
  if (STATE && STATE.draftMode === 'historical' && typeof getEraSalaryCap === 'function') {
    var sc = (STATE.career && STATE.career.seasonCount) || 0;
    var yr = parseInt(STATE.eraStart || 1984, 10) + sc;
    return Math.round(getEraSalaryCap(yr));
  }
  // ★ 现实模式：工资帽与年薪年度上涨同步（只涨不跌，涨幅一致），避免帽与薪水脱节
  return Math.round((cfg.capStart || 14000) * getSalaryYearFactor('cap'));
}


function computeOfferSalary(team, myOvr, myAge, role, needStrength, biz, opts) {
  var cfg = getEconCfg();
  var eraMode = (typeof isEraEconomyActive === 'function') && isEraEconomyActive();
  var sb = getSalaryBases();
  opts = opts || {};
  var base = 0, type = 'min';
  if (role === '巨星联手' || myOvr >= ((sb.max && sb.max.minOvr) || 92)) { base = sb.max.base; type = 'max'; }
  else if (myOvr >= ((sb.star && sb.star.minOvr) || 89)) { base = sb.star.base; type = 'star'; }
  else if (myOvr >= ((sb.starter && sb.starter.minOvr) || 85)) { base = sb.starter.base; type = 'starter'; }
  else if (myOvr >= ((sb.mid && sb.mid.minOvr) || 78)) { base = sb.mid.base; type = 'mid'; }
  else { base = sb.min.base; type = 'min'; }
  // ★ 2026-08-17：老将薪资平滑曲线（OVR × 上季得分 × 年龄），替代硬档位“39+ 底薪”
  var _sf = getSmoothSalaryFactors(myAge, myOvr, getLastSeasonPpg(null, myOvr));
  var ageF = _sf.ageF, ovrF = _sf.ovrF, scoreF = _sf.scoreF;
  var salary = base * ageF * ovrF * scoreF;
  // 老将顶薪软上限（保留不给顶薪底线）
  if (myAge >= 35 && sb.max && sb.max.base) salary = Math.min(salary, sb.max.base * _sf.maxCapMul);
  // ★ 年度上涨（只涨不跌）：按赛季复利，同一球队报价显示与签约一致
  if (!eraMode) salary *= getSalaryYearFactor(team + (opts.renew ? '-renew' : ''));
  if (!opts.noTeamFactor) {
    // 弱队/摆烂队补强溢价
    var rec = typeof getLastSeasonRecord === 'function' ? getLastSeasonRecord(team) : null;
    var winPct = rec && (rec.wins + rec.losses) > 0 ? rec.wins / (rec.wins + rec.losses) : 0.5;
    var wp = cfg.weakTeamPremium || {};
    if (winPct < (wp.winPct || 0.45)) {
      var prem = (wp.maxPremium || 0.30) * Math.min(1, ((wp.winPct || 0.45) - winPct) / (wp.winPct || 0.45));
      salary *= 1 + prem;
    }
    // 大市场折扣 / 小球市溢价
    if (ECON_BIG_MARKET.indexOf(team) >= 0) salary *= (cfg.bigMarketDiscount || 0.90);
    else salary *= (cfg.smallMarketPremium || 1.10);
    // 位置缺口加成
    if (needStrength != null && needStrength >= 10) salary *= 1.08;
  }
  // ★ 2026-08-17：老将期（短约）不再压档——维持 OVR 档位类型，仅由顶薪软上限控制（平滑降薪）
  // ★ 顶薪封顶：现实模式随年度上涨因子同步；历史时代按当年帽 × 顶薪比例
  if (eraMode && typeof eraMaxSalaryPct === 'function' && typeof getEraEconomyYear === 'function') {
    var _eraCapMax = (typeof getEraSalaryCap === 'function') ? getEraSalaryCap(getEraEconomyYear()) : 360;
    var _eraSvc = (STATE.career && STATE.career.seasonCount) || 0;
    salary = Math.min(salary, _eraCapMax * eraMaxSalaryPct(getEraEconomyYear(), _eraSvc) / 100);
  } else {
    salary = Math.min(salary, (cfg.maxSalaryCap || 6000) * getSalaryYearFactor('maxcap'));
  }
  // ★ 2026-08-17：底薪下限 + 舍入粒度按时代（修复历史时代老将 0 薪水）
  var _floor2 = 600, _gran2 = 50;
  try {
    if ((typeof isEraEconomyActive === 'function') && isEraEconomyActive()) {
      var _yrE2 = (typeof getEraEconomyYear === 'function') ? getEraEconomyYear() : 1984;
      if (typeof eraMinSalary === 'function') _floor2 = eraMinSalary(_yrE2);
      _gran2 = 5;
    } else {
      _floor2 = (sb.min && sb.min.base) || 600;
      _gran2 = 50;
    }
  } catch(e) {}
  var _annual2 = Math.max(_floor2, Math.round(salary / _gran2) * _gran2);
  return { annualSalary: _annual2, salaryType: type };
}


function grantAwardMoney() {
  var cfg = getEconCfg();
  var bonus = cfg.awardBonus || {};
  var awards = (STATE.season && STATE.season.awards) || [];
  var granted = [];
  awards.forEach(function(a) {
    if (!a || !a.isUser || !a.act) return;
    var amt = bonus[a.act];
    if (!amt) return;
    // ★ 历史时代：奖项奖金按年代缩放
    var _amt2 = (typeof eraMoney === 'function') ? eraMoney(amt) : amt;
    if (addMoney(_amt2, '奖项奖金：' + (a.label || a.act))) granted.push({ act: a.act, label: a.label, amt: _amt2 });
  });
  return granted;
}


function settleAnnualSalary(force) {
  var c = ensureEconomyState();
  var seasonKey = 'S' + (c.seasonCount || 0);
  if (!force && c._salarySettledSeason === seasonKey) return null;
  c._salarySettledSeason = seasonKey;
  var gross = getCurrentSalary();
  // ★ 2026-08-17：0 薪水防御（旧存档/异常）：按当年底薪兜底结算
  try {
    if (!(gross > 0)) {
      if ((typeof isEraEconomyActive === 'function') && isEraEconomyActive() && typeof eraMinSalary === 'function' && typeof getEraEconomyYear === 'function') {
        gross = eraMinSalary(getEraEconomyYear());
      } else {
        var _cfgG = getEconCfg();
        gross = (_cfgG.salaryBase && _cfgG.salaryBase.min && _cfgG.salaryBase.min.base) || 600;
      }
    }
  } catch(e) {}
  var cfg = getEconCfg();
  var tax = Math.round(gross * (cfg.taxRate || 0.525));
  var team = Math.round(gross * (cfg.teamFeeRate || 0.10));
  var net = gross - tax - team;
  addMoney(net, '年薪结算（税后与团队维护后）');
  c.teamFees += team;
  var bonus = grantAwardMoney();
  var sum = { gross: gross, tax: tax, team: team, net: net, bonus: bonus };
  STATE._salarySettlement = sum;
  return sum;
}


var ECON_BIG_MARKET = ['LAL', 'NYK', 'GSW', 'MIA', 'CHI', 'BOS', 'DAL', 'HOU', 'PHI', 'TOR'];


// ============ 合并自 league-economy.js ============

// ============================================================
// league-economy.js —— 联盟经济/自由市场（阶段 A：从 __ai_app.html 外置）
// NPC 合同年限 / 自由市场签约分配。依赖 era-economics.js(时代合同)、
// rngNext / canPlayPosition / isFreshlySigned 等主块函数（调用时引用）。
// ============================================================


function randomContractByAge(age, p) {
  // ★ 历史时代：NPC 续约按时代合同规则（1984-94 球星 5-8 / 1999-04 4-6 / 2005+ 3-5）
  if (typeof isEraEconomyActive === 'function' && isEraEconomyActive() && typeof eraNpcContractYears === 'function') {
    var _yC = (typeof getEraEconomyYear === 'function') ? getEraEconomyYear() : 1984;
    var _ovC = (p && p.ovr) || 75;
    return eraNpcContractYears(_yC, _ovC, age, _ovC >= 85);
  }
  if (age <= 23) return 2 + Math.floor(rngNext() * 3);
  if (age <= 26) return 2 + Math.floor(rngNext() * 2);
  if (age <= 30) return 1 + Math.floor(rngNext() * 3);
  if (age <= 33) return 1 + Math.floor(rngNext() * 2);
  return 1;
}


/** ★ 2026-08-17：统计球队非玩家 90+ 球星数（球星抱团平衡用） */
function countTeamStars(t) {
  var n = 0;
  try {
    ((NBA2K_DATA && NBA2K_DATA[t]) || []).forEach(function(p) {
      if (p && !p._isUser && (parseInt(p.ovr, 10) || 0) >= 90) n++;
    });
  } catch(e) {}
  return n;
}

function countTeamElite(t, minOvr) {
  var n = 0, floor = minOvr == null ? 86 : minOvr;
  try { ((NBA2K_DATA && NBA2K_DATA[t]) || []).forEach(function(p) { if (p && !p._isUser && (parseInt(p.ovr, 10) || 0) >= floor) n++; }); } catch(e) {}
  return n;
}

function assignFreeAgents() {
  var pool = STATE._freeAgentPool || [];
  // ★ 修复：自由市场池内退役球员不再被签约（退役名单/真实退役年/超龄）
  if (pool.length) {
    var _yrF = (STATE && STATE.eraStart && typeof getEraSeasonYear === 'function') ? getEraSeasonYear(parseInt(STATE.eraStart, 10), (STATE.career ? STATE.career.seasonCount : 0) || 0) : null;
    pool = pool.filter(function(fa) {
      if (!fa) return false;
      try {
        var _fEN = fa.nameEN || fa.name || '';
        var _fN = String(_fEN).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]/g, ' ').replace(/\s+/g, ' ').trim();
        if (STATE.career && Array.isArray(STATE.career.retiredPlayers) && STATE.career.retiredPlayers.indexOf(_fN) >= 0) return false;
        if (_yrF != null && typeof getHistoricalRetireYear === 'function') {
          var _ry = getHistoricalRetireYear(fa);
          if (_ry != null && _yrF >= _ry) return false;
        }
        if (typeof getLeaguePlayerAge === 'function' && getLeaguePlayerAge(fa) >= 40) return false;
        // ★ 年代校验：FA 池球员选秀年 > 当前赛季年 → 剔除（未来届/同名错配不入自由市场）
        if (fa._draftYear != null && STATE && STATE.eraStart != null && typeof getEraSeasonYear === 'function') {
          var _faYear = getEraSeasonYear(parseInt(STATE.eraStart, 10), (STATE.career ? STATE.career.seasonCount : 0) || 0);
          if (parseInt(fa._draftYear, 10) > _faYear) return false;
        }
      } catch(e) {}
      return true;
    });
    STATE._freeAgentPool = pool;
  }
  if (pool.length === 0) return;

  if (!STATE._leagueChanges) STATE._leagueChanges = {};
  if (!STATE._leagueChanges.freeSignings) STATE._leagueChanges.freeSignings = [];

  console.log('[FA] 自由球员分配:', pool.length, '人');

  pool.sort(function(a, b) { return b.ovr - a.ovr; });
  var st = STATE._prevStandings;
  var teams = getEraTeamPool().sort(function(a, b) {
    var aw = (st && st[a] && st[a].wins) || 0, al = (st && st[a] && st[a].losses) || 0;
    var bw = (st && st[b] && st[b].wins) || 0, bl = (st && st[b] && st[b].losses) || 0;
    var wpA = (aw + al > 0 ? aw / (aw + al) : 0.5), wpB = (bw + bl > 0 ? bw / (bw + bl) : 0.5);
    // ★ NBA2.0：弱队优先补强——战绩差(胜率低)的球队先签自由球员，
    //   让魔术/鹈鹕这类弱队能真正引进好球员（保留防球星扎堆：3+ 星球队仍靠后）
    var sA = countTeamStars(a), sB = countTeamStars(b);
    // ★ NBA2.0：王朝制裁——连续夺冠球队签约优先级大幅靠后（获得好帮手机会减少）
    var _strkA = (typeof getTeamChampStreak === 'function') ? getTeamChampStreak(a) : 0;
    var _strkB = (typeof getTeamChampStreak === 'function') ? getTeamChampStreak(b) : 0;
    var keyA = (1 - wpA) + (sA >= 3 ? -0.20 : 0) + (sA >= 4 ? -0.15 : 0) - _strkA * 0.30;
    var keyB = (1 - wpB) + (sB >= 3 ? -0.20 : 0) + (sB >= 4 ? -0.15 : 0) - _strkB * 0.30;
    return keyB - keyA;
  });

  // 本轮自由市场已签约 OVR ≥ 86 的球队（防扎堆）
  var starSignedTeams = {};

  pool.forEach(function(fa) {
    // Every free-agent signing receives a fresh, positive contract. The old code only assigned one in historical mode.
    var faAge = (typeof getLeaguePlayerAge === 'function') ? getLeaguePlayerAge(fa) : 27;
    if (typeof isEraEconomyActive === 'function' && isEraEconomyActive() && typeof eraNpcContractYears === 'function') {
      fa.contract = eraNpcContractYears((typeof getEraEconomyYear === 'function') ? getEraEconomyYear() : 1984, fa.ovr || 75, faAge, (fa.ovr || 0) >= 85);
    } else {
      fa.contract = randomContractByAge(faAge, fa);
    }
    fa.contract = Math.max(1, Math.floor(Number(fa.contract) || 1));
    if (!fa._origTeam) console.log('[FA] 无_origTeam:', (fa.cname||fa.name), 'ovr:', fa.ovr);
    var pos = (fa.pos || 'SF').split('/')[0].trim();
    for (var ti = 0; ti < teams.length; ti++) {
      var t = teams[ti];
      if (t === fa._origTeam) { console.log('[FA] 跳过回原队:', (fa.cname||fa.name), fa._origTeam); continue; }
      if (fa.ovr > 86) {
        if (starSignedTeams[t]) { console.log('[FA] 该队已签球星，跳过:', (fa.cname||fa.name), t); continue; }
        if (countTeamStars(t) >= 3 || countTeamElite(t, 86) >= 4) { console.log('[FA] 该队已满 5 星，跳过:', (fa.cname||fa.name), t); continue; } // ★ 2026-08-17：单队上限 5 名 90+
        var hasStar = false;
        (NBA2K_DATA[t] || []).forEach(function(p) {
          if (p !== fa && !p._isUser && canPlayPosition(p.pos || '', pos) && p.ovr >= 84) hasStar = true;
        });
        if (hasStar) continue;
      }
      var roster = NBA2K_DATA[t];
      if (!roster || roster.length >= 18) continue;
      var posCount = 0;
      roster.forEach(function(p) {
        if (canPlayPosition(p.pos || '', pos)) posCount++;
      });
      if (posCount < 2) {
        try { ensureDualPos(fa); } catch(e) {}
        roster.push(fa);
        fa._faSigned = true;
        fa._justSigned = true;
        fa._justSignedSeason = STATE.career ? (STATE.career.seasonCount || 0) : 0;
        if (fa.ovr > 86) starSignedTeams[t] = true;
        STATE._leagueChanges.freeSignings.push({ name: fa.cname || fa.name, nameEN: fa.name, from: fa._origTeam, to: t, ovr: fa.ovr });
        if (t === STATE.careerTeam) {
          if (!STATE._leagueChanges.teamChanges) STATE._leagueChanges.teamChanges = {};
          STATE._leagueChanges.teamChanges[t] = STATE._leagueChanges.teamChanges[t] || { retired: [], rookies: [] };
          STATE._leagueChanges.teamChanges[t].rookies.push(fa.cname || fa.name);
        }
        return;
      }
    }
    // fallback
    for (var fi = 0; fi < teams.length; fi++) {
      var fb = teams[fi];
      if (fb === fa._origTeam) { console.log('[FA] fallback跳过回原队:', (fa.cname||fa.name), fa._origTeam); continue; }
      if (fa.ovr > 86) {
        if (starSignedTeams[fb]) continue;
        if (countTeamStars(fb) >= 3 || countTeamElite(fb, 86) >= 4) continue; // ★ 2026-08-17：单队上限 5 名 90+
        var hasStarFB = false;
        (NBA2K_DATA[fb] || []).forEach(function(p) {
          if (p !== fa && !p._isUser && p.ovr >= 84) hasStarFB = true;
        });
        if (hasStarFB) continue;
      }
      var fbRoster = NBA2K_DATA[fb];
      if (fbRoster && fbRoster.length < 18) {
        fbRoster.push(fa);
        fa._faSigned = true;
        fa._justSigned = true;
        fa._justSignedSeason = STATE.career ? (STATE.career.seasonCount || 0) : 0;
        if (fa.ovr > 86) starSignedTeams[fb] = true;
        STATE._leagueChanges.freeSignings.push({ name: fa.cname || fa.name, nameEN: fa.name, from: fa._origTeam, to: fb, ovr: fa.ovr });
        break;
      }
    }
  });

  // ★ 保留未签约自由球员（被裁/合同到期未签可跨赛季等待），仅清理已签约与超龄球员
  STATE._freeAgentPool = (STATE._freeAgentPool || []).filter(function(fa) {
    if (!fa) return false;
    if (fa._faSigned) return false;
    try { if (typeof getLeaguePlayerAge === 'function' && getLeaguePlayerAge(fa) >= 40) return false; } catch(e) {}
    return true;
  });
  // 上限：自由市场最多保留 120 人（正常赛季稳态约 78-83 人，120 留足缓冲；对运行/存档影响极小），超出丢弃最低 OVR（公告记录）
  if (STATE._freeAgentPool.length > 120) {
    STATE._freeAgentPool.sort(function(a, b) { return (parseInt(b.ovr, 10) || 0) - (parseInt(a.ovr, 10) || 0); });
    var _faDrop = STATE._freeAgentPool.slice(120);
    STATE._freeAgentPool = STATE._freeAgentPool.slice(0, 120);
    if (_faDrop.length && STATE._leagueChanges) {
      STATE._leagueChanges.faDropped = STATE._leagueChanges.faDropped || [];
      _faDrop.forEach(function(d) { STATE._leagueChanges.faDropped.push({ name: d.cname || d.name, ovr: d.ovr }); });
    }
  }
}
