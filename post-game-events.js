// ============================================================
// Post-game random events (Phase 2 extraction)
// EVENT_REGISTRY + event logic; loaded in original position
// ============================================================

var EVENT_REGISTRY = [];

// ============================================================
// ★ 伤病恢复周期（现实恢复天数 → 缺阵场数）
//   场均间隔约 2.1 天/场（常规赛 82 场 ≈ 173 天）；赛季末受伤会自然跨入季后赛缺阵。
//   格式：[minDays, maxDays, severity, forbidPlay(重伤禁止带伤出战)]
// ============================================================
var AVG_DAYS_PER_GAME = 2.1;
var INJURY_DAYS_BY_ID = {
  injury_back: [3, 7, 'minor', false],
  injury_concussion: [7, 14, 'major', true],            // 脑震荡协议：禁止带伤
  injury_knee_sprain: [10, 21, 'medium', false],
  injury_shoulder: [14, 28, 'medium', false],
  injury_flu: [3, 7, 'minor', false],
  injury_fasciitis: [10, 21, 'medium', false],
  injury_quad: [14, 28, 'medium', false],
  injury_wrist: [7, 14, 'minor', false],
  injury_food_poison_hospital: [3, 7, 'minor', false],
  injury_groin: [10, 21, 'medium', false],
  injury_calf_cramp: [3, 7, 'minor', false],
  injury_eye: [7, 14, 'minor', false],
  injury_rib: [14, 21, 'medium', false],
  injury_knee_effusion: [14, 28, 'medium', false],
  injury_tooth: [3, 10, 'minor', false],
  injury_major_hamstring: [42, 70, 'major', true],       // 腿筋三级拉伤 6-10 周
  injury_major_foot_fracture: [60, 90, 'major', true],   // 应力性骨折 8-13 周
  injury_ankle_sprain: [10, 21, 'medium', false],        // 脚踝扭伤 1.5-3 周（NBA 最高发）
  injury_finger: [7, 14, 'minor', false],                // 手指骨折/脱位 1-2 周
  injury_nose_fracture: [7, 14, 'minor', false],         // 鼻梁骨折 1-2 周（可戴面具复出）
  injury_achilles_tendinitis: [10, 28, 'medium', false], // 跟腱炎 1.5-4 周（疲劳积累）
  injury_patellar_tendinitis: [7, 21, 'medium', false],  // 髌腱炎/跳跃膝 1-3 周
  injury_elbow: [7, 14, 'minor', false],                 // 肘部滑囊炎/挫伤 1-2 周
  injury_hip_flexor: [10, 21, 'medium', false],          // 髋部屈肌拉伤 1.5-3 周
  injury_toe_fracture: [7, 21, 'medium', false],         // 脚趾骨折/严重挫伤 1-3 周
  injury_neck: [3, 7, 'minor', false],                   // 颈部扭伤/落枕 3-7 天
  injury_bagel: [7, 14, 'minor', false],                 // 切百吉饼割伤手指 1-2 周
  injury_lego: [3, 7, 'minor', false],                   // 踩到乐高积木 3-7 天
  injury_shower_slip: [7, 14, 'medium', false],          // 浴室滑倒 1-2 周
  injury_sneeze: [7, 14, 'medium', false],               // 打喷嚏拉伤肋间肌 1-2 周
  injury_bend_over: [3, 10, 'minor', false],             // 弯腰闪到腰 3-10 天
  injury_champagne: [3, 10, 'minor', false],             // 香槟瓶塞崩到眼睛 3-10 天
  injury_dog: [7, 21, 'medium', false],                  // 被自家狗绊倒 1-3 周
  injury_celebration: [7, 14, 'minor', false],           // 庆祝动作拉伤腹股沟 1-2 周
  injury_locker_door: [3, 7, 'minor', false],            // 更衣室门夹手指 3-7 天
  injury_buffet: [3, 7, 'minor', false],                 // 自助餐吃出急性肠胃炎 3-7 天
  injury_major_achilles: [180, 300, 'major', true],      // 跟腱断裂 6-10 个月（赛季报销）
  injury_major_acl: [200, 330, 'major', true],           // 前十字韧带撕裂 7-11 个月（赛季报销）
  injury_major_jones_fracture: [84, 120, 'major', true], // 琼斯骨折 12-17 周
  injury_major_rotator_cuff: [120, 180, 'major', true],  // 肩袖撕裂 4-6 个月
  injury_major_pectoral: [120, 180, 'major', true],      // 胸肌撕裂 4-6 个月
  injury_major_dvt: [60, 90, 'major', true],             // 深静脉血栓 2-3 个月（生涯级风险）
  injury_major_meniscus_surgery: [90, 150, 'major', true], // 半月板手术 3-5 个月
  injury_teammate_punch: [3, 7, 'minor', false],              // 训练冲突被队友挥拳 3-7 天
};
function getInjurySpec(id) { return INJURY_DAYS_BY_ID[id] || null; }
function injuryDaysToGames(days) { return Math.max(1, Math.ceil((days || 0) / AVG_DAYS_PER_GAME)); }

/** ★ 玩家当前状态（事件 condition 用）：连胜/连败、胜率、合同剩余、季后赛边缘、士气/化学 */
function buildUserEventState() {
  var st = STATE.season && STATE.season.standings && STATE.season.standings[STATE.careerTeam];
  var ev = STATE.season && STATE.season.events;
  return {
    streak: st ? (st.streak || '') : '',
    streakLen: st ? (st.streakLen || 0) : 0,
    pct: (st && (st.wins + st.losses) > 0) ? st.wins / (st.wins + st.losses) : 0.5,
    wins: st ? (st.wins || 0) : 0,
    losses: st ? (st.losses || 0) : 0,
    ovr: STATE.finalOVR || 0,
    age: (STATE.career && STATE.career.currentAge) || 22,
    contractLeft: (STATE.career && STATE.career.contract) || 0,
    isPlayoffs: !!STATE.season.isPlayoffs,
    morale: ev ? (ev.moraleBonus || 0) : 0,
    chemistry: ev ? (ev.teamChemistry || 0) : 0,
    seed: (function() { try { return getConferenceSeed(STATE.careerTeam); } catch(e) { return 0; } })(),
  };
}

/** ★ 事件短期效果（未来 N 天/场 的化学/士气加成），比赛模拟中读取 */
function tickPendingMods() {
  var ev = STATE.season && STATE.season.events;
  if (!ev || !ev.pendingMods || ev.pendingMods.length === 0) return;
  ev.pendingMods = ev.pendingMods.filter(function(m) {
    m.gamesLeft--;
    return m.gamesLeft > 0;
  });
}
function getPendingModsSum(ev) {
  var chem = 0, morale = 0;
  (ev && ev.pendingMods || []).forEach(function(m) { chem += (m.chem || 0); morale += (m.morale || 0); });
  return { chem: chem, morale: morale };
}

function applyHooks(hookName, arg) {
  for (var i = 0; i < EVENT_REGISTRY.length; i++) {
    var e = EVENT_REGISTRY[i];
    if (e.hooks && e.hooks[hookName]) {
      arg = e.hooks[hookName](arg);
    }
  }
  return arg;
}

/** ★ 事件后果统一处理：伤病/禁赛/化学士气短期效果/属性小加成（choice 事件共用） */
function getChainFlags() {
  var c = STATE.career;
  if (!c) return null;
  c.flags = c.flags || {};
  return c.flags;
}

/** ★ 关键连锁节点写入生涯历史（仅里程碑事件使用，与 recordBranchChoice 同结构） */
function recordChainMilestone(title, choiceLabel, msg) {
  var c = STATE.career;
  if (!c) return;
  c.branchHistory = c.branchHistory || [];
  var text = msg || title;
  try { if (typeof sanitizePlayerFacingText === 'function') text = sanitizePlayerFacingText(text); } catch(e) {}
  c.branchHistory.push({
    seasonNum: c.seasonCount || 0,
    phase: 'season',
    branch: 'chain_events',
    eventId: 'chain_milestone',
    event: title,
    choice: choiceLabel || '',
    result: text
  });
}

function applyEventConsequence(d, ctx, opts) {
  if (!d) return null;
  // ★ 经济层：事件加钱/扣钱（_money: { delta, reason, lockHint? }）
  if (d._money) {
    try {
      if (typeof addMoney === 'function') {
        var _mok = addMoney(d._money.delta, d._money.reason || '事件收支');
        if (!_mok && typeof showMoneyToast === 'function') showMoneyToast('⚠️ ' + (d._money.lockHint || '余额不足，收支未生效'));
      }
    } catch(e) {}
  }
  var o = opts || {};
  var _injGames = null, _injDays = null, _injSev = null, _injForbid = null;
  if (d._consequence === 'injury') {
    var _spec = getInjurySpec(d.id);
    _injDays = _spec
      ? (_spec[0] + Math.floor(Math.random() * (_spec[1] - _spec[0] + 1)))
      : ((d._games || 1) * AVG_DAYS_PER_GAME);
    _injGames = injuryDaysToGames(_injDays);
    _injSev = _spec ? _spec[2] : (d._majorInjury ? 'major' : 'minor');
    _injForbid = _spec ? !!_spec[3] : !!d._majorInjury;
    d._games = _injGames;
  }
  if (!o.noResolve) {
    d.title = resolveEventVars(d.title, ctx, d);
    d.body = resolveEventVars(d.body, ctx, d);
    d.desc = resolveEventVars(d.desc, ctx, d);
  }
  if (!o.noTimeline && STATE.season && STATE.season.events && STATE.season.events.storyTimeline) {
    STATE.season.events.storyTimeline.push({ gameNum: STATE.season.games.length, title: d.title, desc: d.desc, emoji: d.emoji });
    STATE.season.events.lastTriggerGameNum = STATE.season.games.length;
    if (STATE.season.isPlayoffs) STATE.season.events.playoffEventCount++;
  }
  if (d._consequence === 'injury' && STATE.season && STATE.season.events) {
    STATE.season.events.injuryGamesLeft += _injGames;
    STATE.season.events.injury = {
      id: d.id, name: d.title || '伤病', severity: _injSev,
      daysLeft: _injDays, gamesLeft: _injGames,
      forbidPlay: _injForbid,
      injuredAt: STATE.season.games.length
    };
    if (d._majorInjury || _injSev === 'major') {
      STATE.season.events.majorInjuryThisSeason = true;
      // ★ 经济层：重伤手术费（年薪 × 2%）——余额充足则手术缩短恢复期 1/3；不足则保守治疗
      try {
        if (typeof addMoney === 'function' && typeof getEconCfg === 'function' && typeof getCurrentSalary === 'function') {
          var _surgFee = Math.round(getCurrentSalary() * (getEconCfg().surgeryFeeRate || 0.02));
          var _injuryObj = STATE.season.events.injury || {};
          if (_surgFee > 0 && addMoney(-_surgFee, '伤病手术费')) {
            var _cut = getEconCfg().surgeryRecoveryCut || (1 / 3);
            var _reduced = Math.max(0, Math.round(_injGames * (1 - _cut)));
            STATE.season.events.injuryGamesLeft = Math.max(0, STATE.season.events.injuryGamesLeft - (_injGames - _reduced));
            _injuryObj.gamesLeft = _reduced;
            _injuryObj.surgery = { fee: _surgFee, conservative: false };
            if (typeof showMoneyToast === 'function') showMoneyToast('🏥 手术成功 · 费用 ' + fmtMoney(_surgFee) + '，恢复期缩短');
          } else {
            _injuryObj.surgery = { fee: _surgFee, conservative: true };
            if (typeof showMoneyToast === 'function') showMoneyToast('🏥 手术费 ' + fmtMoney(_surgFee) + ' 不足，选择保守治疗（恢复期更长）');
          }
        }
      } catch(e) {}
      // ★ 赛季级重伤 → 开启“恢复期抉择 → 复出”连锁（下一赛季推进）
      if (d._majorInjury) {
        var _flI = getChainFlags();
        if (_flI) _flI.injuryChain = { season: (STATE.career && STATE.career.seasonCount) || 0, stage: 'rehab', choice: null, pending: true };
      }
    }
  }
  if (d._consequence === 'suspension' && STATE.season && STATE.season.events) {
    STATE.season.events.suspensionGamesLeft += (d._games || 1);
    // ★ 禁赛计数 → “复出首战 / 再犯警告”连锁
    var _flS = getChainFlags();
    if (_flS) {
      var _sc = _flS.suspChain = _flS.suspChain || {};
      _sc.count = (_sc.count || 0) + 1;
      _sc.season = (STATE.career && STATE.career.seasonCount) || 0;
      _sc.returnPending = true;
    }
  }
  // ★ NPC 禁赛/缺阵：写入 _npcOuts 管线，影响该队后续比赛战力（choice 事件承诺队友/对手禁赛时使用）
  if (d._npcOuts && STATE.season) {
    try {
      if (typeof ensureNpcOuts === 'function') ensureNpcOuts();
      var outsMap = STATE.season._npcOuts || (STATE.season._npcOuts = {});
      var npcList = Array.isArray(d._npcOuts) ? d._npcOuts : [d._npcOuts];
      npcList.forEach(function(ns) {
        if (!ns) return;
        var teamKey = null;
        if (ns.team === 'self' || ns.team === 'user') teamKey = STATE.careerTeam;
        else if (ns.team === 'opponent' && ctx && ctx.game && ctx.game.opponent) teamKey = ctx.game.opponent;
        else if (ns.team) teamKey = ns.team;
        if (!teamKey) return;
        var games = Math.max(1, parseInt(ns.games, 10) || 1);
        var penalty = ns.penalty != null ? parseFloat(ns.penalty) : 2.5;
        var label = ns.label || ((ns.team === 'self' || ns.team === 'user') ? '队友禁赛' : '对手禁赛');
        var cur = outsMap[teamKey];
        if (cur && cur.gamesLeft > 0) {
          cur.gamesLeft = Math.max(cur.gamesLeft, games);
          cur.penalty = Math.max(cur.penalty || 0, penalty);
          cur.reason = 'suspension';
          cur.name = label;
        } else {
          outsMap[teamKey] = { name: label, gamesLeft: games, penalty: penalty, reason: 'suspension' };
        }
      });
    } catch(e) {}
  }
  // ★ 通用连锁状态合并：d._chain = { key, data }，data 可为函数(ctx)
  if (d._chain && STATE.career) {
    var _flC = getChainFlags();
    if (_flC) {
      var _cKey = d._chain.key;
      var _cData = typeof d._chain.data === 'function' ? d._chain.data(ctx) : d._chain.data;
      if (_cKey && _cData) {
        var _cObj = _flC[_cKey] = _flC[_cKey] || {};
        for (var _ck in _cData) _cObj[_ck] = _cData[_ck];
      }
    }
  }
  if (d._mods && d._mods.games && (d._mods.chem || d._mods.morale)) {
    var _chemV = d._mods.chem || 0;
    // ★ 更衣室信任≥5：正向化学效果额外+1
    if (_chemV > 0 && STATE.career && STATE.career.profile && (STATE.career.profile.lockerRoomTrust || 0) >= 5) _chemV += 1;
    STATE.season.events.pendingMods = STATE.season.events.pendingMods || [];
    STATE.season.events.pendingMods.push({
      gamesLeft: d._mods.games, chem: _chemV, morale: d._mods.morale || 0, desc: d.title || ''
    });
  }
  if (d._attrDelta && STATE.attrs) {
    Object.keys(d._attrDelta).forEach(function(k) {
      STATE.attrs[k] = Math.max(40, Math.min(99, (parseInt(STATE.attrs[k]) || 40) + (d._attrDelta[k] || 0)));
    });
    try { STATE.finalOVR = calcOVR(STATE.attrs); } catch(e) {}
  }
  return d;
}

function showEventModal(data, callback) {
  if (!data) { if (callback) callback(); return; }
  var overlay = document.createElement('div');
  overlay.className = 'team-picker-overlay';
  overlay.id = 'eventOverlay';
  var bodyHtml = '';
  if (data.choices && data.choices.length) {
    bodyHtml += '<div style="font-size:11px;color:var(--orange);font-weight:700;margin-bottom:6px;">重点</div>';
    bodyHtml += '<div style="font-size:13px;color:var(--text);line-height:1.7;margin-bottom:12px;">' + String(data.body || '').replace(/\n/g, '<br>') + '</div>';
    bodyHtml += '<div style="font-size:11px;color:var(--orange);font-weight:700;margin-bottom:6px;">选择</div>';
    data.choices.forEach(function(ch, ci) {
      // ★ 本地实装：选项锁定（余额不足/条件不满足 → 禁用 + lockHint），与分支事件同一套机制
      var locked = false;
      if (ch && typeof ch.requires === 'function') {
        try { locked = !ch.requires(data._ctx || null); } catch(e) { locked = true; }
      }
      var lockHint = locked ? (ch.lockHint || '条件未满足，暂时无法选择') : '';
      var btnStyle = 'width:100%;margin-bottom:8px;justify-content:flex-start;text-align:left;' + (locked ? 'opacity:.45;cursor:not-allowed;' : '');
      var onclick = locked ? '' : 'onclick="window.__choosePostGameEvent(' + ci + ')"';
      bodyHtml += '<button class="btn btn-secondary btn-sm" style="' + btnStyle + '" ' + onclick + (locked ? ' disabled' : '') + '>' + ch.label + (ch.hint ? '<span style="display:block;font-size:11px;font-family:var(--font-body);font-weight:400;opacity:.75;margin-left:4px;">' + (locked ? lockHint : ch.hint) + '</span>' : '') + '</button>';
    });
  } else {
    bodyHtml += '<div style="font-size:11px;color:var(--orange);font-weight:700;margin-bottom:6px;">重点</div>';
    bodyHtml += '<div style="font-size:13px;color:var(--text);line-height:1.7;margin-bottom:12px;">' + String(data.body || '').replace(/\n/g, '<br>') + '</div>';
    if (data.detail) {
      bodyHtml += '<div style="font-size:12px;color:var(--text-muted);margin:6px 0 12px;">' + data.detail + '</div>';
    }
    bodyHtml += '<button class="btn btn-primary btn-sm" id="eventCloseBtn" style="width:100%;">' + (data.btnText || '我知道了') + '</button>';
  }
  overlay.innerHTML =
    '<div class="team-picker-modal">' +
      '<div class="team-picker-header"><span>' + (data.emoji ? data.emoji + ' ' : '') + (data.title || '事件') + '</span></div>' +
      '<div style="padding:14px 14px 12px;max-height:62vh;overflow-y:auto;">' + bodyHtml + '</div>' +
    '</div>';
  document.body.appendChild(overlay);
  if (data.choices && data.choices.length) {
    window.__pendingPostGameEvent = { data: data, callback: callback };
    window.__choosePostGameEvent = function(ci) {
      var pending = window.__pendingPostGameEvent;
      if (!pending) return;
      var q = pending.data;
      var ch = q.choices && q.choices[ci];
      if (!ch) return;
      // ★ 本地实装：点击二次校验（防止绕过锁定）
      if (typeof ch.requires === 'function') {
        var _ok = false;
        try { _ok = !!ch.requires(q._ctx || null); } catch(e) { _ok = false; }
        if (!_ok) return;
      }
      var outcome = null;
      try { outcome = ch.apply ? ch.apply(q._ctx || null) : null; } catch(e) { outcome = null; }
      var showText = ch.resultText || (outcome && outcome._resultText) || '';
      if (outcome && outcome._consequence) {
        try { applyEventConsequence(outcome, q._ctx || null, { noTimeline: true }); } catch(e) {}
      } else if (outcome && (outcome._mods || outcome._attrDelta)) {
        try { applyEventConsequence(outcome, q._ctx || null, { noTimeline: true }); } catch(e) {}
      }
      var overlayEl = document.getElementById('eventOverlay');
      if (overlayEl) {
        overlayEl.innerHTML =
          '<div class="team-picker-modal">' +
            '<div class="team-picker-header"><span>' + ((outcome && outcome.emoji) ? outcome.emoji + ' ' : (q.emoji ? q.emoji + ' ' : '')) + ((outcome && outcome.title) ? outcome.title : q.title) + '</span></div>' +
            '<div style="padding:14px 14px 12px;max-height:62vh;overflow-y:auto;">' +
              '<div style="font-size:11px;color:var(--orange);font-weight:700;margin-bottom:6px;">结果</div>' +
              '<div style="font-size:13px;color:var(--text);line-height:1.7;margin-bottom:12px;">' + (showText || (outcome && outcome.body) || '你做出了选择。') + '</div>' +
              '<button class="btn btn-primary btn-sm" id="eventCloseBtn" style="width:100%;">我知道了</button>' +
            '</div>' +
          '</div>';
        document.getElementById('eventCloseBtn').onclick = function() {
          overlayEl.remove();
          window.__pendingPostGameEvent = null;
          if (pending.callback) pending.callback();
        };
      }
    };
    return;
  }
  document.getElementById('eventCloseBtn').onclick = function() {
    overlay.remove();
    if (callback) callback();
  };
}
function getInjuryPlaySeverity(ev) {
  // ★ 严重度优先取伤病详情（按现实恢复周期定义），无详情时回退按剩余场数估算
  if (ev && ev.injury && ev.injury.severity) return ev.injury.severity;
  var left = ev && ev.injuryGamesLeft ? ev.injuryGamesLeft : 0;
  if ((ev && ev.majorInjuryThisSeason && left >= 12) || left >= 20) return 'major';
  if (left >= 8) return 'medium';
  return 'minor';
}

function getInjuryPlayLabel(severity) {
  if (severity === 'major') return '重伤';
  if (severity === 'medium') return '明显伤病';
  return '轻伤';
}

function getInjuryPlayStatFactor(severity) {
  if (severity === 'major') return 0.66;
  if (severity === 'medium') return 0.78;
  return 0.86;
}

function getInjuryPlayWinMultiplier(severity) {
  if (severity === 'major') return 0.86;
  if (severity === 'medium') return 0.92;
  return 0.96;
}

function buildHurtAttrs(attrs, severity) {
  var factor = severity === 'major' ? 0.72 : (severity === 'medium' ? 0.82 : 0.9);
  var hurt = {};
  for (var k in attrs) {
    if (!Object.prototype.hasOwnProperty.call(attrs, k)) continue;
    var v = parseInt(attrs[k]);
    hurt[k] = isNaN(v) ? attrs[k] : Math.max(35, Math.round(50 + (v - 50) * factor));
  }
  return hurt;
}

function scaleHurtStats(stats, severity) {
  var factor = getInjuryPlayStatFactor(severity);
  var minsFactor = severity === 'major' ? 0.58 : (severity === 'medium' ? 0.68 : 0.78);
  var out = {};
  for (var k in stats) out[k] = stats[k];
  ['pts','reb','ast','stl','blk','tov','fgm','fga','ftm','fta','threeM','threeA'].forEach(function(k) {
    out[k] = Math.max(0, Math.round((out[k] || 0) * factor));
  });
  out.fga = Math.max(1, out.fga || 1);
  out.fgm = Math.min(out.fgm || 0, out.fga);
  out.threeA = Math.min(out.threeA || 0, out.fga);
  out.threeM = Math.min(out.threeM || 0, out.threeA);
  out.fta = Math.max(0, out.fta || 0);
  out.ftm = Math.min(out.ftm || 0, out.fta);
  out.mins = Math.max(8, Math.round((stats.mins || 28) * minsFactor));
  // ★ 带伤缩放后仍保持 得分 = 2×命中 + 三分命中 + 罚球命中
  if (typeof syncScoreComponents === 'function') {
    var _sy = syncScoreComponents(out.pts, out.fgm, out.fga, out.threeM, out.threeA, out.ftm, out.fta);
    out.fgm = _sy.fgm; out.threeM = _sy.threeM; out.ftm = _sy.ftm;
  }
  out.playedThroughInjury = true;
  out.injurySeverity = severity;
  return out;
}

function maybeWorsenInjuryAfterPlaying(ev, severity) {
  if (!ev) return '';
  var risk = severity === 'major' ? 0.28 : (severity === 'medium' ? 0.18 : 0.1);
  if (Math.random() >= risk) return '';
  // ★ 按现实恢复周期追加：重伤 14-28 天、轻中伤 7-14 天（换算为场数）
  var extraDays = severity === 'major'
    ? (14 + Math.floor(Math.random() * 15))
    : (7 + Math.floor(Math.random() * 8));
  var extra = injuryDaysToGames(extraDays);
  if (severity === 'major' && Math.random() < 0.08) {
    extra = Math.max(extra, getSeasonEndingInjuryGamesLeft());
    ev.majorInjuryThisSeason = true;
    if (ev.injury) ev.injury.forbidPlay = true; // 重伤加重后禁止再带伤
  }
  ev.injuryGamesLeft = Math.max(ev.injuryGamesLeft || 0, 0) + extra;
  ev.injuryReason = (ev.injuryReason || '伤病') + '（带伤出战后加重）';
  if (ev.injury) {
    ev.injury.daysLeft = (ev.injury.daysLeft || 0) + extraDays;
    ev.injury.gamesLeft = ev.injuryGamesLeft;
  }
  if (ev.storyTimeline) {
    ev.storyTimeline.push({ gameNum: STATE.season.games.length, title: '带伤出战后伤情加重', desc: '追加休战 ' + extra + ' 场', emoji: '🏥' });
  }
  return '伤情赛后出现反应，追加休战 ' + extra + ' 场。';
}

function isKeyInjuredRegularGame(game, gameIndex, totalGames) {
  if (!STATE.season || !STATE.careerTeam) return false;
  var ev = STATE.season.events || {};
  if ((ev.regularPlayThroughPromptCount || 0) >= 1) return false;
  var leftIncludingToday = Math.max(0, totalGames - gameIndex);
  if (leftIncludingToday > 12) return false;
  var seed = getConferenceSeed(STATE.careerTeam);
  if (seed >= 7 && seed <= 11) return true;
  if (leftIncludingToday <= 5 && seed >= 5 && seed <= 12) return true;
  return false;
}

function isKeyInjuredPlayoffGame(round, gameNum, winsA, winsB) {
  var nextGame = gameNum + 1;
  if (round === 3) return true;
  if (nextGame >= 7) return true;
  if (winsA === 3 || winsB === 3) return true;
  return nextGame >= 5;
}

function shouldOfferPlayThroughInjury(key, isRegular) {
  var ev = STATE.season && STATE.season.events;
  if (!ev || ev.injuryGamesLeft <= 0 || ev.suspensionGamesLeft > 0) return false;
  // ★ 重伤（手术/骨折/脑震荡等）禁止带伤出战，只能休战
  if (ev.injury && ev.injury.forbidPlay) return false;
  ev.playThroughPrompted = ev.playThroughPrompted || {};
  if (ev.playThroughPrompted[key]) return false;
  ev.playThroughPrompted[key] = true;
  if (isRegular) ev.regularPlayThroughPromptCount = (ev.regularPlayThroughPromptCount || 0) + 1;
  return true;
}

function showPlayThroughInjuryModal(ctx, onRest, onPlay) {
  var ev = STATE.season && STATE.season.events ? STATE.season.events : {};
  var severity = getInjuryPlaySeverity(ev);
  var label = getInjuryPlayLabel(severity);
  var statDrop = Math.round((1 - getInjuryPlayStatFactor(severity)) * 100);
  var riskText = severity === 'major' ? '恶化风险较高' : (severity === 'medium' ? '存在恶化风险' : '小概率加重');
  var overlay = document.createElement('div');
  overlay.className = 'team-picker-overlay';
  overlay.id = 'playThroughInjuryOverlay';
  overlay.innerHTML =
    '<div class="team-picker-modal">' +
      '<div class="team-picker-header"><span>🏥 关键场次 · 带伤出战？</span></div>' +
      '<div style="padding:14px 14px 12px;">' +
        '<div style="font-size:11px;color:var(--orange);font-weight:700;margin-bottom:6px;">伤情</div>' +
        '<div style="font-size:13px;color:var(--text);line-height:1.7;margin-bottom:12px;">' +
          (ctx && ctx.desc ? ctx.desc : '球队马上要打一场关键比赛。') +
          '<br><br>当前伤情：' + label + '，预计还需休战 ' + (ev.injuryGamesLeft || 0) + ' 场。带伤出战会让本场表现下降约 ' + statDrop + '%，并且' + riskText + '。' +
          ((ev.injury && ev.injury.surgery) ? '<br><br><span style="color:var(--gold);">💊 治疗方案：' + (ev.injury.surgery.conservative ? '保守治疗（免费，恢复期更长）' : ('手术治疗（费用 ' + fmtMoney(ev.injury.surgery.fee) + '，恢复期已缩短）')) + ' · 余额 ' + fmtMoney(ensureEconomyState().money) + '</span>' : '') +
        '</div>' +
        '<button class="btn btn-primary btn-sm" id="playInjuryBtn" style="width:100%;margin-bottom:8px;background:var(--red);">带伤出战</button>' +
        '<button class="btn btn-secondary btn-sm" id="restInjuryBtn" style="width:100%;">休战养伤</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);
  document.getElementById('restInjuryBtn').onclick = function() {
    overlay.remove();
    if (onRest) onRest();
  };
  document.getElementById('playInjuryBtn').onclick = function() {
    overlay.remove();
    if (onPlay) onPlay(severity);
  };
}
function renderEventStatus() {
  var ev = STATE.season.events;
  if (!ev) return '';
  var parts = [];
  if (ev.suspensionGamesLeft > 0) parts.push('<span style="color:var(--red);font-weight:600;">🔇 禁赛 ' + ev.suspensionGamesLeft + ' 场</span>');
  if (ev.injuryGamesLeft > 0) parts.push('<span style="color:var(--red);font-weight:600;">🏥 伤病 ' + ev.injuryGamesLeft + ' 场</span>');
  if (parts.length === 0) return '';
  return '<div id="eventStatusBar" style="text-align:center;padding:2px 10px 4px;font-size:11px;background:var(--bg-card);border:1px solid var(--border);border-top:none;border-radius:0 0 8px 8px;display:flex;gap:12px;justify-content:center;">' + parts.join('') + '</div>';
}

var _lastGameCtx = null;

// ━━━ Variable resolution for events ━━━
var TEAM_NAMES_EV = {
  ATL:'老鹰', BOS:'凯尔特人', BKN:'篮网', CHA:'黄蜂', CHI:'公牛',
  CLE:'骑士', DAL:'独行侠', DEN:'掘金', DET:'活塞', GSW:'勇士',
  HOU:'火箭', IND:'步行者', LAC:'快船', LAL:'湖人', MEM:'灰熊',
  MIA:'热火', MIL:'雄鹿', MIN:'森林狼', NOP:'鹈鹕', NYK:'尼克斯',
  OKC:'雷霆', ORL:'魔术', PHI:'76人', PHX:'太阳', POR:'开拓者',
  SAC:'国王', SAS:'马刺', TOR:'猛龙', UTA:'爵士', WAS:'奇才',
};

function getTeamTopPlayer(teamAbbr) {
  var players = (typeof NBA2K_DATA !== 'undefined' && NBA2K_DATA[teamAbbr]) || 
                (typeof NBA2K_ALLTIME_DATA !== 'undefined' && NBA2K_ALLTIME_DATA[teamAbbr + '_HIST']);
  if (!players || !players.length) return null;
  var top = players[0];
  for (var i = 1; i < players.length; i++) {
    if ((players[i].ovr || 0) > (top.ovr || 0)) top = players[i];
  }
  return top;
}

function resolveEventVars(str, ctx, evData) {
  if (!str) return str;
  var teamAbbr = ctx && ctx.game && ctx.game.opponent;
  var topPlayer = teamAbbr ? getTeamTopPlayer(teamAbbr) : null;
  var playerName = topPlayer ? (topPlayer.cname || topPlayer.name) : '对手球员';
  var teamName = teamAbbr ? ((typeof getTeamName === 'function') ? getTeamName(teamAbbr) : teamAbbr) : '对手球队';
  return str
    .replace(/\{对手球员\}/g, playerName)
    .replace(/\{对手球队\}/g, teamName)
    .replace(/\{队友\}/g, playerName)
    .replace(/\{n\}/g, (evData && evData._games) || '');
}

function getAgeBasedInjuryRate() {
  var age = (STATE.career && STATE.career.currentAge) ? STATE.career.currentAge : 22;
  // ★ H2：年轻球员不再“完全免疫伤病”，22-25 岁给低概率（约每季 12%-25% 受伤一次），26+ 保持原曲线
  if (age <= 22) return 0.2;
  if (age <= 25) return 0.35;
  if (age <= 28) return 0.4;
  if (age <= 31) return 0.8;
  if (age <= 34) return 1.4;
  if (age <= 37) return 2.2;
  if (age <= 40) return 3.2;
  return 4.5;
}

function getDurabilityFactor() {
  // ★ 身体耐久：ATH（运动能力）+ STR（力量）→ 0~1（50 属性为 0，99 为 1）
  var _at = 0, _st = 0;
  try {
    _at = parseInt((STATE.attrs && STATE.attrs.ATH) || 0) || 0;
    _st = parseInt((STATE.attrs && STATE.attrs.STR) || 0) || 0;
  } catch(e) {}
  return Math.max(0, Math.min(1, ((_at + _st) / 2 - 50) / 49));
}
function getInjuryLoadFactor(mins) {
  // ★ 上场时间负荷：以 34 分钟为基准，每多 1 分钟 +0.8%（高使用率更易受伤）
  var _m = Math.max(20, Math.min(44, parseInt(mins) || 34));
  return 1 + (_m - 34) * 0.008;
}
function getSeasonInjuryEventRate(mins) {
  var ev = STATE.season && STATE.season.events;
  var bonus = ev ? ((ev.injuryRiskBonus || 0) * 0.7 + (ev.staminaLoad || 0)) : 0; // ★ 伤病风险加成×0.7（削弱极端档），体能负担保持原样
  // ★ 属性耐久：年龄风险最多-45%，隐性加成最多-50%缓解
  var _dur = getDurabilityFactor();
  var _ageRate = getAgeBasedInjuryRate() * (1 - 0.45 * _dur);
  var _bonusEff = bonus * (1 - 0.5 * _dur);
  return Math.max(0, Math.min(12, (_ageRate + _bonusEff) * getInjuryLoadFactor(mins)));
}

function getMajorInjuryEventRate(mins) {
  // ★ 重伤为「受伤命中后转重伤」的条件概率（%）：年轻几乎不重伤，34 岁后概率上升，
  //   全 99 生涯约 1-2 次（生涯级大伤），低耐久球员风险更高
  var age = (STATE.career && STATE.career.currentAge) ? STATE.career.currentAge : 22;
  var base = 5;
  if (age >= 40) base = 22;
  else if (age >= 36) base = 16;
  else if (age >= 32) base = 10;
  else if (age >= 26) base = 5;
  var ev = STATE.season && STATE.season.events;
  var bonus = ev ? ((ev.injuryRiskBonus || 0) * 0.7 + (ev.staminaLoad || 0) * 0.06) : 0; // ★ 伤病风险加成×0.7，体能负担小幅影响重伤率
  // ★ 属性耐久：重伤受属性影响（年龄风险最多 -30%）
  var _dur = getDurabilityFactor();
  var _ageRate = base * (1 - 0.3 * _dur);
  var _bonusEff = bonus * (1 - 0.5 * _dur);
  return Math.max(2, Math.min(30, (_ageRate + _bonusEff) * getInjuryLoadFactor(mins)));
}

function isInjuryEventDef(e) {
  return !!(e && e.id && e.id.indexOf('injury_') === 0);
}

function isMajorInjuryEventDef(e) {
  return !!(e && e.majorInjury);
}

function getSeasonEndingInjuryGamesLeft() {
  if (STATE.season && STATE.season.isPlayoffs) return 28;
  var schedule = STATE.season && STATE.season.schedule ? STATE.season.schedule : [];
  var remaining = 0;
  for (var i = 0; i < schedule.length; i++) {
    if (!schedule[i].simulated) remaining++;
  }
  return Math.max(1, remaining);
}

function isSuspensionEventDef(e) {
  return !!(e && e.id && e.id.indexOf('susp_') === 0);
}

function pickWeightedEvent(candidates) {
  if (!candidates || candidates.length === 0) return null;
  var totalWeight = 0;
  for (var ci = 0; ci < candidates.length; ci++) {
    totalWeight += candidates[ci].weight || 1;
  }
  var roll = Math.random() * totalWeight;
  var cum = 0;
  for (var cj = 0; cj < candidates.length; cj++) {
    cum += candidates[cj].weight || 1;
    if (roll < cum) return candidates[cj];
  }
  return candidates[candidates.length - 1];
}

function checkRandomEvents(game, result, stats) {
  var ev = STATE.season.events;
  if (!ev) return null;
  if (ev.suspensionGamesLeft > 0 || ev.injuryGamesLeft > 0) return null;

  // ★ 全季比赛事件上限（默认 2=原版，可在 game-config 的 EVENT_RULES.matchEventMax 调整）
  var _maxMatch = (SIM_CONFIG.EVENT_RULES && SIM_CONFIG.EVENT_RULES.matchEventMax) || 2;
  if (!STATE.season.isPlayoffs && ev.storyTimeline.length >= _maxMatch) return null;
  // 季后赛最多触发 2 个
  if (STATE.season.isPlayoffs && ev.playoffEventCount >= 2) return null;

  // 冷却检查：距上次事件至少间隔 10 场
  if (ev.lastTriggerGameNum != null) {
    var gamesSince = STATE.season.games.length - ev.lastTriggerGameNum;
    if (gamesSince < 10) return null;
  }

  _lastGameCtx = { game: game, result: result, stats: stats, userState: buildUserEventState() };
  var ctx = _lastGameCtx;

  // ★ 事件池：伤病（原版）、重伤、禁赛、冲突、花絮
  var pools = { flavor: [], conflict: [], suspension: [], injury: [], major: [] };
  for (var i = 0; i < EVENT_REGISTRY.length; i++) {
    var e = EVENT_REGISTRY[i];
    try {
      if (!e.condition(ctx)) continue;
      // ★ 年代门槛：现代梗事件（社媒/直播/2K/加密等）在旧年代不出现
      if (typeof isEventAllowedInEra === 'function' && !isEventAllowedInEra(e)) continue;
      if (e.id.indexOf('injury_major_') === 0) pools.major.push(e);
      else if (e.id.indexOf('injury_') === 0) pools.injury.push(e);
      else if (e.id.indexOf('susp_') === 0) pools.suspension.push(e);
      else if (e.id.indexOf('fight_') === 0) pools.conflict.push(e);
      else pools.flavor.push(e);
    } catch(ex) {}
  }

  // ★ 伤病线：完全原版 injuryRate（injuryMult=1），含重伤分支；
  //   ★ 事件线（花絪/冲突/禁赛）：独立判定，默认 eventMult=1.6 → 生涯约 3 次；
  //   ★ 同一事件单季不重复触发（triggeredIds，跨季重置）。
  var injuryRate = getSeasonInjuryEventRate(ctx && ctx.stats ? ctx.stats.mins : null);
  var _er = SIM_CONFIG.EVENT_RULES || {};
  var injuryMult = _er.injuryMult != null ? _er.injuryMult : 1;
  var eventMult = _er.eventMult != null ? _er.eventMult : 1.6;
  var injuryHit = Math.random() * 100 < injuryRate * injuryMult;
  var baseEventRate = (_er.baseEventRate != null) ? _er.baseEventRate : 0.7; // ★ 事件线独立基准率（年轻期也能触发，伤病线不受影响）
  var eventHit = Math.random() * 100 < Math.max(baseEventRate, injuryRate) * eventMult;
  if (!injuryHit && !eventHit) return null;
  var picked = null;
  if (injuryHit) {
    // 原版伤病线（含重伤）
    var canMajor = pools.major.length > 0 && !ev.majorInjuryThisSeason;
    var majorRate = canMajor ? getMajorInjuryEventRate(ctx && ctx.stats ? ctx.stats.mins : null) : 0;
    if (canMajor && Math.random() * 100 < majorRate) picked = pickWeightedEvent(pools.major);
    else picked = pickWeightedEvent(pools.injury);
  }
  if (!picked && eventHit) {
    // ★ 事件线：按球队状态分花絪/冲突/禁赛（禁赛整体调小，只有差状态才明显）
    var evState = getTeamEventState();
    var _ratio = (_er.catRatio && _er.catRatio[evState.tone])
      || { suspension: 0.12, conflict: 0.18, flavor: 0.70 };
    // ★ 更衣室信任≥5：冲突类概率下调30%（转移到花絮）
    var _lrt = (STATE.career && STATE.career.profile && STATE.career.profile.lockerRoomTrust) || 0;
    if (_lrt >= 5) {
      var _cut = _ratio.conflict * 0.3;
      _ratio = { suspension: _ratio.suspension, conflict: _ratio.conflict - _cut, flavor: _ratio.flavor + _cut };
    }
    var catRoll = Math.random();
    if (catRoll < _ratio.suspension) picked = pickWeightedEvent(pools.suspension);
    else if (catRoll < _ratio.suspension + _ratio.conflict) picked = pickWeightedEvent(pools.conflict);
    else picked = pickWeightedEvent(pools.flavor);
  }
  // ★ 单季不重复：同一事件本季已触发过则不触发（保留新鲜感；跨季由 events 重置）
  if (picked && _er.noRepeatInSeason !== false) {
    var _trIds = ev.triggeredIds || (ev.triggeredIds = []);
    if (_trIds.indexOf(picked.id) >= 0) picked = null;
    else _trIds.push(picked.id);
  }

  if (picked) {
      // ★ NBA 名场面：重大腿部伤病被选中时，优先弹出“跟腱/背伤罚球”抉择（iconic-events.js 提供）
      try {
        if (typeof window.__wrapLegInjuryEvent === 'function') {
          var _legWrap = window.__wrapLegInjuryEvent(picked, ctx);
          if (_legWrap) picked = _legWrap;
        }
      } catch(e) {}
      var d = picked.execute(ctx);
      if (d) {
        d.id = d.id || picked.id;
        // ★ 选项事件：先返回问题，选择后再应用后果
        if (d.choices && d.choices.length) {
          d._ctx = ctx;
          // ★ 选项事件同样计入赛季事件上限 / 冷却 / 季后计数（后果应用时 noTimeline，避免重复入账）
          ev.storyTimeline = ev.storyTimeline || [];
          ev.storyTimeline.push({ gameNum: STATE.season.games.length, title: d.title, desc: d.desc || d.title, emoji: d.emoji });
          ev.lastTriggerGameNum = STATE.season.games.length;
          if (STATE.season.isPlayoffs) ev.playoffEventCount++;
          return d;
        }
        // ★ 普通事件：走统一后果管线
        applyEventConsequence(d, ctx, {});
        return d;
      }
  }
  return null;
}
/** ★ 球队状态判定：连胜/连败、战绩、士气、化学 → good / bad / neutral */
function getTeamEventState() {
  var st = STATE.season && STATE.season.standings && STATE.season.standings[STATE.careerTeam];
  var ev = STATE.season && STATE.season.events;
  var streakLen = st ? (st.streakLen || 0) : 0;
  var streak = st ? st.streak : '';
  var wins = st ? (st.wins || 0) : 0;
  var losses = st ? (st.losses || 0) : 0;
  var pct = (wins + losses) > 0 ? wins / (wins + losses) : 0.5;
  var morale = ev ? (ev.moraleBonus || 0) : 0;
  var chem = ev ? (ev.teamChemistry || 0) : 0;
  var good = (streak === 'W' && streakLen >= 3) || pct >= 0.6 || morale >= 2;
  var bad = (streak === 'L' && streakLen >= 3) || pct < 0.4 || morale <= -2 || chem <= -2;
  return { tone: good ? 'good' : (bad ? 'bad' : 'neutral'), streak: streak, streakLen: streakLen, pct: pct };
}


// ━━━ 类别 1：🥊 斗殴冲突 ━━━

// ── 1. 恶意犯规爆发冲突 ──
EVENT_REGISTRY.push({
  id: 'fight_hard_foul',
  name: '恶意犯规爆发冲突',
  weight: 15,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'💢', title:'恶意犯规爆发冲突', body:'对手在一次快攻中从侧面狠狠撞向正在上篮的你，你整个人横着摔出了场外，背部重重砸在地板上。你躺在地上缓了两秒，然后爬起来直接冲向了那个球员。两人头顶头对峙，口水几乎喷到对方脸上，队友和裁判飞扑过来把你们隔开。裁判回看录像后给了对方一个一级恶意犯规，也给了你一个技术犯规。赛后联盟追加处罚，你被禁赛1场。赛后采访你说："我接受他的犯规，不接受他的态度。"', desc:'恶意犯规冲突', _consequence:'suspension', _games:1, _mods:{ games:5, chem:-2, morale:-1 } };
  },
});







// ── 5. 板凳清空 ──
EVENT_REGISTRY.push({
  id: 'fight_bench_clearing',
  name: '板凳清空',
  weight: 10,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'🌪️', title:'板凳清空', body:'一次快攻中对手从背后将你一把拉下，你的身体失控后撞翻了场边的技术台。你的队友立刻冲上去推了对方一把，对方替补席所有人站了起来冲上场。十多个人挤在中圈互相推搡，场面一度完全失控。教练们冲进球场把自家球员往回拉，安保人员组成人墙把两队隔开。混乱持续了整整五分钟。赛后联盟开出了总额超过500万美元的罚单，你被禁赛5场。', desc:'板凳清空禁赛', _consequence:'suspension', _games:5, _mods:{ games:5, chem:-3, morale:-2 }, _chain:{ key:'conflictChain', data:function(_ctx){ return { team:(_ctx && _ctx.game && _ctx.game.opponent) || '', step:'brawl', season:(STATE.career && STATE.career.seasonCount) || 0, pending:true }; } } };
  },
});







// ── 9. 累积技犯被驱逐 ──
EVENT_REGISTRY.push({
  id: 'fight_tech_escalation',
  name: '累积技犯被驱逐',
  weight: 12,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'🔥', title:'累积技犯被驱逐', body:'你第一节吃到了一个技术犯规，心里一直憋着一股火。第三节你被吹了一个进攻犯规后终于爆发了——你把球狠狠砸在地板上，球弹起来飞上了观众席。裁判立刻吹了你第二个技术犯规，举起右手做出驱逐手势。你愣住了，然后开始朝裁判走去，队友赶紧抱住你。"别！别！他把你驱逐了！你再过去又要追加禁赛！"你被队友们架着走向更衣室，全场响起了震天的嘘声。赛后联盟果然追加处罚，你被禁赛多场。', desc:'技犯被驱逐', _consequence:'suspension', _games:(1 + Math.floor(Math.random() * 2)) };
  },
});





// ── 12. 和裁判争论被驱逐 ──
EVENT_REGISTRY.push({
  id: 'fight_ref_dispute',
  name: '和裁判争论被驱逐',
  weight: 2,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'👨‍⚖️', title:'和裁判争论被驱逐', body:'裁判在比赛最后时刻吹了你一次进攻犯规，这直接葬送了你们反超的机会。你疯了，你追着裁判从后场一路说到前场。"那个球我根本没有动！是他自己倒的！"裁判没有理你，但你一直在说。裁判终于忍无可忍，转身给了你一个技术犯规。你的队友赶紧把你拉开，但你还在回头喊："你今晚的吹罚简直是犯罪！"赛后联盟对你处以25,000美元罚款，你认了。', desc:'和裁判争论' };
  },
});

// ── 13. 报复性恶犯 ──
EVENT_REGISTRY.push({
  id: 'fight_dirty_play',
  name: '报复性恶犯',
  weight: 12,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'🪚', title:'报复性恶犯', body:'你的队友在一次上篮中被对手从空中硬生生拉了下来，摔在地上半天没起来。裁判只吹了一个普通犯规。你火了。下一回合防守中，你直接一肩膀撞向了持球的对方球员——动作不大，但足够狠。他摔倒在地，球丢了。裁判给了你一个一级恶意犯规。你走下球场时，你的队友拍了拍你的肩膀："兄弟，够意思。"你回头看了一眼对面愤怒的教练席，觉得值了。赛后联盟回看录像，认为动作具有明显报复性，对你追加禁赛。', desc:'报复恶犯', _consequence:'suspension', _games:(1 + Math.floor(Math.random() * 2)) };
  },
});





// ━━━ 类别 2：💬 垃圾话/心理战 ━━━



// ── 17. 罚球线念咒语 ──
EVENT_REGISTRY.push({
  id: 'trash_free_throw',
  name: '罚球线念咒语',
  weight: 2,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'🗣️', title:'罚球线念咒语', body:'对方的罚球手站在线上，你站在罚球区旁边用刚好能让他听到的声音碎碎念："你妈妈在观众席看着你呢——她希望你罚进——但我知道你罚不进——你每次都罚不进——"他用一个深呼吸打断了你的节奏，球在篮筐上弹了两下——进了。他转头对你说："谢谢你的鼓励，我一般罚球时脑子空空的，你给了我一个分心的理由——我在想我妈。"你决定下次换个策略。', desc:'罚球念咒语' };
  },
});

















// ── 26. 偷听战术 ──
EVENT_REGISTRY.push({
  id: 'trash_timeout',
  name: '偷听战术',
  weight: 2,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'⏸️', title:'偷听战术', body:'对方叫了一个暂停，你假装漫不经心地往他们的替补席方向走了几步——你听到对方主教练正在布置针对你的防守战术。你还没听到关键部分就被安保人员发现了。"你在干什么？""呃...我在喝水。"你被礼貌但坚定地请回了自己的半场。下半场你发现他们的防守确实变了——你把偷听到的那半截战术结合自己的判断，找到了破解方法。赛后教练问你："你怎么知道他们会包夹你？"你神秘地笑了一下。', desc:'偷听战术' };
  },
});









// ━━━ 类别 3：🤣 搞笑/囧事 ━━━



// ── 32. 鞋掉了继续打 ──
EVENT_REGISTRY.push({
  id: 'shoe_off',
  name: '鞋掉了继续打',
  weight: 2,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'👟', title:'鞋掉了继续打', body:'你在一次快攻中突然感觉脚下一轻——左脚的鞋被踩掉了！你犹豫了不到半秒，然后光着一只脚继续运球推进，一个变向过掉防守人，上篮命中！替补席全部站起来笑疯了。回放镜头反复播放你的"独脚上篮"，解说员笑得上气不接下气。', desc:'鞋掉了上篮' };
  },
});

// ── 33. 球砸裁判后脑 ──
EVENT_REGISTRY.push({
  id: 'ball_hit_ref',
  name: '球砸裁判后脑',
  weight: 2,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'🎾', title:'球砸裁判后脑', body:'你奋力将球传向底角的队友，结果用力过猛轨迹偏高——球直接旋转着砸在了裁判的后脑勺上，发出了一声沉闷的"咚"！裁判的哨子飞了出去，他转过头来一脸懵逼地看着你。全场陷入了两秒钟的沉默，然后爆发出震天的笑声。你赶紧举起双手："对不起！对不起！我不是故意的！"', desc:'砸裁判后脑' };
  },
});

// ── 34. 球衣穿反上场 ──
EVENT_REGISTRY.push({
  id: 'jersey_wrong',
  name: '球衣穿反上场',
  weight: 1,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'👕', title:'球衣穿反上场', body:'你从更衣室冲出来准备上场，总觉得哪里不对劲。直到你看到对面的球员在偷笑，你低头一看——你的球衣穿反了！全场球迷爆笑，你的队友笑到蹲在地上拍地板。你红着脸跑回更衣室，更衣室里传来了你队友们更加肆无忌惮的笑声。', desc:'球衣穿反' };
  },
});

// ── 35. 替补席睡着被拍 ──
EVENT_REGISTRY.push({
  id: 'sleep_on_bench',
  name: '替补席睡着被拍',
  weight: 2,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'💤', title:'替补席睡着被拍', body:'比赛早早进入垃圾时间，你坐在替补席的末端百无聊赖。第三节结束时你打了一个哈欠，然后闭上了眼睛——等醒来时发现摄像机正对着你，你的打瞌睡画面正在球馆大屏幕上循环播放。全场一阵哄笑。队友捅了捅你的肩膀："哥们，你火了。"', desc:'替补睡觉' };
  },
});

// ── 36. 洗澡滑倒扭伤 ──
EVENT_REGISTRY.push({
  id: 'shower_slip',
  name: '洗澡滑倒扭伤',
  weight: 2,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'🚿', title:'洗澡滑倒扭伤', body:'赛后你哼着小曲走进淋浴间，刚迈出一步脚底一滑——你以极其狼狈的姿势四脚朝天摔倒在地！队友们听到巨响冲进来，看到你赤身裸体躺在地上呻吟，笑得差点背过气去。队医检查后确认只是轻微扭伤，但这事在更衣室被笑了整整一个赛季。', desc:'洗澡滑倒' };
  },
});



// ── 39. 吃坏肚子 ──
EVENT_REGISTRY.push({
  id: 'food_poisoning',
  name: '吃坏肚子',
  weight: 2,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'🤢', title:'吃坏肚子', body:'赛前你在客场城市尝试了一家当地特色餐厅——然后你就后悔了。第一节中段你的肚子开始咕噜咕噜叫，第二节你已经往卫生间跑了三趟。每次回到场上你的脸色都苍白得像一张纸。教练不得不减少你的上场时间。赛后你发誓以后客场只吃赛前营养餐。', desc:'吃坏肚子' };
  },
});

// ── 40. 热身扣飞 ──
EVENT_REGISTRY.push({
  id: 'warmup_dunk_fail',
  name: '热身扣飞',
  weight: 2,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'😅', title:'热身扣飞', body:'赛前热身时你打算用一个360度转身扣篮点燃全场气氛。你助跑、起跳、转体——然后球直接砸在了篮筐后沿弹飞了，你以一个尴尬的姿势摔倒在地。现场观众发出了善意的笑声，你的队友们假装不认识你。你爬起来拍了拍球衣，假装什么都没发生。', desc:'热身扣飞' };
  },
});

// ── 41. 砸到自己教练 ──
EVENT_REGISTRY.push({
  id: 'pass_hit_coach',
  name: '砸到自己教练',
  weight: 2,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'🎯', title:'砸到自己教练', body:'你试图用一个背后传球找到底角的队友，结果球飞向了替补席——不偏不倚正中正在指挥的主教练的后脑勺。战术板飞了出去，笔在空中画了一道完美的弧线。教练转过头来，表情复杂地看着你。你缩了缩脖子："呃...我在找底角的射手？"', desc:'砸教练' };
  },
});


// ── 43. 传球砸到摄影师 ──
EVENT_REGISTRY.push({
  id: 'hit_photographer',
  name: '传球砸到摄影师',
  weight: 2,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'📸', title:'传球砸到摄影师', body:'你奋力追一个快要出界的球，鱼跃飞身把球捞回场内——然后整个人砸在了底线旁边的摄影师身上。价值五万美金的摄影器材哗啦啦倒了一地。摄影师从设备下面探出头来，给你竖了一个大拇指："好球！"', desc:'砸摄影师' };
  },
});

// ── 44. 踩到毛巾滑倒 ──
EVENT_REGISTRY.push({
  id: 'towel_slip',
  name: '踩到毛巾滑倒',
  weight: 1,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'🧹', title:'踩到毛巾滑倒', body:'你在底线跑位时一脚踩到了保洁人员刚刚拖地留下的湿毛巾——你双脚向前劈叉滑出两米远，以一个标准的"一字马"姿势停在界外。观众们笑得前仰后合，你感觉自己的腹股沟在发出抗议。你扶着腰站起来，听到解说员说："他可能需要去练练瑜伽了。"', desc:'踩毛巾滑倒' };
  },
});




// ── 47. 庆祝过度撞倒教练 ──
EVENT_REGISTRY.push({
  id: 'celebrate_coach',
  name: '庆祝过度撞倒教练',
  weight: 2,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'🎉', title:'庆祝过度撞倒教练', body:'你命中了压哨绝杀！兴奋过度的你张开双臂在场上狂奔，在冲向替补席的庆祝中你直接撞翻了正在激动鼓掌的主教练。六十多岁的老教练被你撞得在地上滚了一圈，战术板飞出老远。你赶紧把他拉起来，他一边笑一边骂："臭小子，我这把老骨头差点被你拆了！"', desc:'撞倒教练' };
  },
});

// ── 48. 赛后采访翻车 ──
EVENT_REGISTRY.push({
  id: 'reporter_interview',
  name: '赛后采访翻车',
  weight: 2,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'🎤', title:'赛后采访翻车', body:'赛后一位漂亮的女记者把麦克风伸到你面前："今晚的表现太棒了！你有什么想对球迷说的吗？"你本想回答"我们会继续努力"，但从嘴里蹦出来的却是——"今晚的披萨很好吃。"记者愣住了，你愣住了，摄影师在镜头后面憋笑憋到发抖。这段采访在NBA官方账号上被反复播放。', desc:'采访翻车' };
  },
});

// ━━━ 类别 4：📱 社交媒体 ━━━

// ── 49. 手滑点赞争议帖 ──
EVENT_REGISTRY.push({
  id: 'like_controversy',
  name: '手滑点赞争议帖',
  weight: 2,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'❤️', title:'手滑点赞争议帖', body:'深夜刷手机的你手滑点赞了一条"XXX是史上最被高估的球员"的推特——更糟的是，这条推说的正是你现在球队的当家球星。第二天训练时队内的气氛微妙得像是在走钢丝。你赶紧取消了赞，但截图已经传遍全网。你花了整整一周才重新赢得队友的信任。', desc:'手滑点赞' };
  },
});

// ── 50. IG直播泄露队友吐槽教练 ──
EVENT_REGISTRY.push({
  id: 'ig_live_leak',
  name: 'IG直播泄露队友吐槽教练',
  weight: 2,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'📱', title:'IG直播泄露队友吐槽教练', body:'你和队友在更衣室闲聊时打开了IG直播，你忘了跟粉丝们打招呼就把手机放在了储物柜上。然后你的队友大声抱怨道："那个老头的战术简直是狗屎！"——而"那个老头"正是50米外正在接受采访的主教练。球队公关火速冲进来关掉了直播。罚款25,000美元。', desc:'直播泄露' };
  },
});

// ── 51. 吐槽2K评分 ──
EVENT_REGISTRY.push({
  id: 'tweet_2k',
  name: '吐槽2K评分',
  weight: 2,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'🎮', title:'吐槽2K评分', body:'你在推特上发了一条："2K给我这个评分是在开玩笑吗？"配上一个笑哭的表情。两分钟后2K官方账号回复："打出来再说话。"这条互动迅速获得了10万点赞，球迷们分成两派疯狂争论你究竟值多少分。2K的市场部高兴坏了——免费的流量啊。', desc:'吐槽2K' };
  },
});

// ── 52. ESPN专访说"我奶奶" ──
EVENT_REGISTRY.push({
  id: 'espn_grandma',
  name: 'ESPN专访说"我奶奶"',
  weight: 2,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'🎙️', title:'ESPN专访说"我奶奶"', body:'ESPN记者在专访中问你："谁是你遇到过最难防的球员？"你本来想回答勒布朗或者杜兰特，但嘴一快蹦出来一句——"我奶奶。她年轻的时候打街球可厉害了。"这段采访播出后，你奶奶的旧照片被网友翻了出来，她还真的接到了电视台的电话邀请做节目。你奶奶比你还出名了。', desc:'我奶奶梗' };
  },
});

// ── 53. 被Shaq点名五大囧 ──
EVENT_REGISTRY.push({
  id: 'shaq_five',
  name: '被Shaq点名五大囧',
  weight: 2,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'🎬', title:'被Shaq点名五大囧', body:'沙奎尔·奥尼尔在TNT的《五大囧》节目中播放了你的"精彩"镜头——你在无人防守的情况下试图来一个大风车扣篮，结果球直接飞出了场外。Shaq笑得从椅子上摔了下来，全美观众都在看你的笑话。你的电话被朋友的短信塞爆了。不过——黑红也是红，对吧？', desc:'五大囧' };
  },
});

// ── 54. 和网红约会曝光 ──
EVENT_REGISTRY.push({
  id: 'date_netcelebrity',
  name: '和网红约会曝光',
  weight: 2,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'🌹', title:'和网红约会曝光', body:'八卦媒体TMZ拍到你和一位拥有500万粉丝的知名网红在洛杉矶的高档餐厅共进晚餐。你们相谈甚欢的照片瞬间引爆社交媒体。你的IG粉丝一夜之间暴涨50万，评论区充满了羡慕嫉妒恨。第二天训练你迟到了——因为太多人@你看评论。', desc:'网红约会' };
  },
});


// ── 56. 点赞球迷照片 ──
EVENT_REGISTRY.push({
  id: 'like_fan_photo',
  name: '点赞球迷照片',
  weight: 2,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'💕', title:'点赞球迷照片', body:'你闲着无聊翻IG时给一张美女粉丝的照片点了赞——结果那个粉丝是你队友的女朋友。队友在训练中用杀人的眼神看了你一整天。你赶紧解释这是个意外，然后请全队吃了顿和牛才平息了这件事。', desc:'点赞翻车' };
  },
});

// ── 57. 直播打游戏爆粗 ──
EVENT_REGISTRY.push({
  id: 'game_live_curse',
  name: '直播打游戏爆粗',
  weight: 2,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'🎮', title:'直播打游戏爆粗', body:'你在Twitch直播打《使命召唤》，被一个12岁的小孩连续杀了八次后你对着麦克风疯狂爆粗。你完全忘了你的直播间里有3000个观众。弹幕瞬间被"LMAO"和"录屏了"刷屏。联盟以"不当言论"为由对你罚款15,000美元。那个12岁的小孩后来成了你的固定游戏搭子。', desc:'直播爆粗' };
  },
});

// ── 58. 被做成表情包 ──
EVENT_REGISTRY.push({
  id: 'meme',
  name: '被做成表情包',
  weight: 2,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'😂', title:'被做成表情包', body:'你那尴尬瞬间的高清截图已经在互联网上病毒式传播了。朋友们把各种版本的表情包发到你的手机上——《还珠格格》版的、漫威版的、甚至还有猫猫版的。你决定坦然接受，把最好笑的一张设成了自己的推特头像。球迷们感动落泪："他懂梗！"', desc:'表情包' };
  },
});


// ── 60. TikTok跳舞爆火 ──
EVENT_REGISTRY.push({
  id: 'tiktok_dance',
  name: 'TikTok跳舞爆火',
  weight: 2,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'💃', title:'TikTok跳舞爆火', body:'你一时兴起在TikTok上发了一段自己跳"黑桃A"舞蹈的视频——第二天一看，播放量2000万。队友们在你背后模仿你的舞步，全队都学会了那个动作。你从一个职业篮球运动员变成了——一个会跳舞的职业篮球运动员。', desc:'TikTok爆火' };
  },
});

// ── 61. 被Kendrick Perkins怒批 ──
EVENT_REGISTRY.push({
  id: 'kendrick_perkins',
  name: '被Kendrick Perkins怒批',
  weight: 2,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'🎙️', title:'被Kendrick Perkins怒批', body:'ESPN名嘴肯德里克·帕金斯在节目中扯着嗓子喊："这个家伙根本就不配首发！我奶奶防他都比他自己防得好！"这段视频在更衣室里被队友们反复播放，所有人都在看你尴尬的表情。你决定用下一场比赛的表现来回应——或者至少让帕金斯闭嘴。', desc:'Perkins怒批' };
  },
});

// ── 62. Stephen A.Smith狂吹你 ──
EVENT_REGISTRY.push({
  id: 'stephen_a',
  name: 'Stephen A.Smith狂吹你',
  weight: 2,
  condition: (ctx) => { var _a = STATE.career && STATE.career.currentAge ? STATE.career.currentAge : 99; return _a <= 25; }, // “这个年轻人是联盟的未来”
  execute: (ctx) => {
    return { emoji:'🗣️', title:'Stephen A.Smith狂吹你', body:'Stephen A.Smith在《First Take》节目中用他标志性的咆哮风格大喊："我告诉过你们！我！早！就！说！过！这个年轻人是联盟的未来！如果你不同意——你就是个傻子！大傻子！"你坐在更衣室里看这段视频，嘴角忍不住上扬。这段视频被你的队友设为手机铃声。', desc:'Smith狂吹' };
  },
});

// ━━━ 类别 5：🏠 更衣室 ━━━



// ── 64. 飞机扑克输钱 ──
EVENT_REGISTRY.push({
  id: 'poker_on_plane',
  name: '飞机扑克输钱',
  weight: 2,
  condition: (ctx) => true,
  execute: (ctx) => {
    var _pkAmt = Math.round((typeof getCurrentSalary === 'function' ? getCurrentSalary() : 0) / 24);
    return { emoji:'🃏', title:'飞机扑克输钱', body:'球队包机上，你和三个队友围在一起打德州扑克。今晚你的运气差到了极点——两对碰上葫芦，葫芦碰上四条，四条碰上同花顺。当你在最后一局连底裤都快输掉的时候，你意识到他们三个在串通出千。但你已经输了半个月的工资（' + fmtMoney(_pkAmt) + '）。', desc:'扑克输钱', _money: { delta: -_pkAmt, reason: '飞机扑克输钱', lockHint: '余额不足，这局算你欠着' } };
  },
});




// ── 67. 偷穿教练西装 ──
EVENT_REGISTRY.push({
  id: 'coach_suit',
  name: '偷穿教练西装',
  weight: 2,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'👔', title:'偷穿教练西装', body:'更衣室里没人，你好奇地穿上了主教练挂在衣架上的定制西装。你正对着镜子摆pose的时候——教练推门进来了。你穿着他那件明显小了两号、腋下已经崩线了的西装，尴尬地站在原地。教练看了你三秒钟："训练加罚100趟折返跑。还有——西装干洗费从你工资里扣。"', desc:'偷穿西装', _money: { delta: -(typeof eraMoney === 'function' ? eraMoney(2) : 2), reason: '西装干洗费' } };
  },
});

// ── 68. 请全队吃大餐 ──
EVENT_REGISTRY.push({
  id: 'team_dinner',
  name: '请全队吃大餐',
  weight: 2,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'🍖', title:'请全队吃大餐', body:'你宣布今晚请全队去全城最贵的牛排馆吃饭。队友们欢呼着把你抛了起来——字面意义上的那种。账单来了，六位数（' + fmtMoney(typeof eraMoney === 'function' ? eraMoney(50) : 50) + '）。你看着账单数字，强装镇定地刷了卡。回到公寓你打开银行App，默默更新了手机壁纸："我会赚钱的。"', desc:'请客吃饭', _mods:{ games:5, chem:2, morale:2 }, _money: { delta: -(typeof eraMoney === 'function' ? eraMoney(50) : 50), reason: '请全队吃大餐' } }; // ★ 短期效果：未来5场化学+2/士气+2
  },
});

// ── 69. 老将请你回家吃饭 ──
EVENT_REGISTRY.push({
  id: 'veteran_dinner',
  name: '老将请你回家吃饭',
  weight: 2,
  condition: (ctx) => !!(STATE.career && STATE.career.seasonCount === 0), // 新秀赛季限定：文案明确“好好享受你的新秀赛季吧”
  execute: (ctx) => {
    return { emoji:'🍳', title:'老将请你回家吃饭', body:'球队的老将今天邀请你去他家吃晚饭。他的妻子做了一桌丰盛的家常菜，你们边吃边聊他年轻时的故事。"你知道吗，我当年也像你一样，觉得自己无所不能。"他喝了一口红酒，眼神有些迷离，"好好享受你的新秀赛季吧，它比你想象的要短得多。"', desc:'老将请客' };
  },
});




// ── 72. 更衣室放歌被投诉 ──
EVENT_REGISTRY.push({
  id: 'music_war',
  name: '更衣室放歌被投诉',
  weight: 2,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'🎵', title:'更衣室放歌被投诉', body:'今天轮到你当更衣室DJ。你信心满满地播放了自己精心准备的歌单——结果第一首重低音EDM响起来的时候，一个队友直接拔掉了蓝牙音箱的插头。"第17遍了！你上周就放这首歌！"然后音箱主权被一个老将夺走，他开始播放2000年代的R&B，全场满意地点头。你默默收起了你的手机。', desc:'放歌被投诉' };
  },
});

// ── 73. 带队友玩新游戏 ──
EVENT_REGISTRY.push({
  id: 'game_night',
  name: '带队友玩新游戏',
  weight: 2,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'🎮', title:'带队友玩新游戏', body:'你带了一台Switch到客场，和队友们在酒店房间里玩了三个小时的《马里奥赛车》。竞争异常激烈——打赌输掉的人要在明天的训练中穿着粉红色袜子跑全场。目前战况胶着，情绪高涨。酒店隔壁房间的客人敲了两次门投诉噪音了。', desc:'玩游戏' };
  },
});

// ── 74. 更衣室消失的球鞋 ──
EVENT_REGISTRY.push({
  id: 'missing_shoes',
  name: '更衣室消失的球鞋',
  weight: 2,
  condition: (ctx) => !!(STATE.career && STATE.career.seasonCount === 0), // 新秀限定：“新秀需要学会保护自己的东西”
  execute: (ctx) => {
    return { emoji:'👟', title:'更衣室消失的球鞋', body:'训练结束后你发现你新买的那双限量版球鞋不见了。你焦急地在更衣室里翻遍了每一个角落。最后你发现——球队的老将把它藏在了天花板的通风管道里，因为"新秀需要学会保护自己的东西"。你把鞋子拿出来的时候里面被塞了一双他脱下来的旧袜子。', desc:'球鞋失踪' };
  },
});

// ── 75. 和保安成为朋友 ──
EVENT_REGISTRY.push({
  id: 'friend_security',
  name: '和保安成为朋友',
  weight: 2,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'🛡️', title:'和保安成为朋友', body:'球场的老保安迈克是个六十多岁的黑人老头，他在这个球馆工作了三十年。每次你来加练到深夜，他总会给你留门，然后给你讲他年轻时见过的那些传奇球星。"乔丹当年在这块场地上得了63分——我亲眼看到的。你也有那个范儿，小子。"', desc:'保安朋友' };
  },
});


// ━━━ 类别 6：🎯 名场面 ━━━

















// ── 92. 不看人背传绝杀助攻 ──
EVENT_REGISTRY.push({
  id: 'behind_the_back',
  name: '不看人背传绝杀助攻',
  weight: 1,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'🙈', title:'不看人背传绝杀助攻', body:'比赛还剩5秒，比分打平。你持球单打，吸引了双人包夹。在即将被逼入死角的瞬间，你跳起来做了一个标准的投篮动作——防守球员全部起跳封盖——但你在空中把球收回腰间，用一个背后不看人传球把球送到了底角空位队友的手中。球在空中划出一道直线——队友接球、起跳、出手——红灯亮起——球进！绝杀！你被队友们压在身下疯狂庆祝。回放镜头里看到球在空中的时候，你的视线根本没有看向底角。队友赛后说："他怎么知道我在那里？他甚至没看我！"你说："我就是知道。"', desc:'背传绝杀' };
  },
});

// ── 93. 打电话庆祝 ──
EVENT_REGISTRY.push({
  id: 'gamemom_call',
  name: '打电话庆祝',
  weight: 2,
  condition: (ctx) => { var _s = STATE.career && STATE.career.seasonCount; return _s != null && _s <= 3; }, // “职业生涯的第一个绝杀球”
  execute: (ctx) => {
    return { emoji:'📞', title:'打电话庆祝', body:'你命中了职业生涯的第一个绝杀球。全场欢呼声中，你没有像其他人一样疯狂奔跑庆祝。你冷静地走到场边，拿起工作人员的手机——给你妈妈打了一个微信电话。电话接通了，屏幕那边你妈正在家里尖叫，背景里你爸在沙发上跳来跳去。"妈，看到了吗？""看到了看到了！我儿子！绝杀！"全场观众通过大屏幕看到了这一幕，欢呼声变成了温暖的掌声。赛后这段视频在社交媒体上获得了一千万播放量。', desc:'打电话庆祝' };
  },
});

// ── 94. 毛巾盖头绝杀 ──
EVENT_REGISTRY.push({
  id: 'towel_celebration',
  name: '毛巾盖头绝杀',
  weight: 1,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'🧣', title:'毛巾盖头绝杀', body:'终场哨响，你的绝杀球在空中划过一道弧线——球还在空中的时候，你已经转身从替补席队友手里抓了一条毛巾盖在了头上，然后背对着篮筐举起了双手。球进的瞬间，你头上盖着毛巾，双臂张开，像一个即将登台的拳击冠军。这张照片毫无悬念地登上了第二天所有体育媒体的封面。标题赫然写着："Ice in his veins." 赛后记者问你怎么敢在球进之前就开始庆祝，你说："我投出去的那个瞬间就知道了。"', desc:'毛巾绝杀' };
  },
});

// ── 95. 拿走比赛用球 ──
EVENT_REGISTRY.push({
  id: 'record_milestone_ball',
  name: '拿走比赛用球',
  weight: 2,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'🏀', title:'拿走比赛用球', body:'比赛结束后你发现技术台的工作人员正在用一个标记笔在比赛用球上写字。他们走到你面前，把球递给你——"这是你的比赛用球，今晚你创造了职业生涯新高。"你接过球，感受着它熟悉的纹理。这颗球见证了你的某一个巅峰夜晚。你把它夹在腋下，就像抱着一颗宝石。回到更衣室后，你找了一支笔，在球上写下了日期和你的数据。未来有一天，它会出现在你书房最显眼的位置。', desc:'拿走比赛球' };
  },
});

// ── 96. 三分命中后摇头 ──
EVENT_REGISTRY.push({
  id: 'three_point_celebration',
  name: '三分命中后摇头',
  weight: 2,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'🔥', title:'三分命中后摇头', body:'你命中了连续第三记三分。退防的过程中你一边摇头一边面无表情地看着对手的替补席。你的表情在说："太简单了。太他妈简单了。"你的冷漠庆祝比任何怒吼都更具杀伤力。对手叫了暂停，你走下球场时队友拍了拍你的胸口，你依然面无表情——直到你坐回替补席，才终于忍不住笑出来。', desc:'三分摇头' };
  },
});

// ━━━ 类别 7：🍀 场外生活 ━━━


// ── 98. 参加社区慈善活动 ──
EVENT_REGISTRY.push({
  id: 'charity',
  name: '参加社区慈善活动',
  weight: 1,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'❤️', title:'参加社区慈善活动', body:'球队组织了一次社区服务活动，你去了一所小学和孩子们一起打篮球、发午餐。一个黑人小女孩拉住你的手说："我以后也要打篮球，像你一样。"你蹲下来告诉她："你会比我更好的。"活动结束时校长送了你一筐孩子们手绘的感谢卡。你把它们全部带回了家，贴在书房的墙上。', desc:'慈善活动' };
  },
});


// ── 100. 投资加密货币亏钱 ──
EVENT_REGISTRY.push({
  id: 'crypto_loss',
  name: '投资加密货币亏钱',
  weight: 2,
  condition: (ctx) => true,
  execute: (ctx) => {
    var _crAmt = Math.round((typeof getCurrentSalary === 'function' ? getCurrentSalary() : 0) / 24 * 0.8);
    return { emoji:'📉', title:'投资加密货币亏钱', body:'你的理财顾问推荐了一个"稳赚不赔"的加密货币项目。你把半个月的薪水投了进去——然后第二天那个币跌了80%，直接蒸发' + fmtMoney(_crAmt) + '。你盯着手机屏幕上血红色的数字，感觉心脏停跳了一拍。你的队友在更衣室里安慰你："没事兄弟，大家都亏过。"你默默决定以后只买国债。', desc:'加密币亏钱', _money: { delta: -_crAmt, reason: '投资加密货币亏钱', lockHint: '余额不足，只能眼睁睁看着币归零' } };
  },
});

// ── 100b. 投资回报到账（平衡加密币亏钱） ──
EVENT_REGISTRY.push({
  id: 'investment_return',
  name: '投资回报到账',
  weight: 1,
  condition: (ctx) => true,
  execute: (ctx) => {
    var cfg = (typeof getEconCfg === 'function') ? getEconCfg() : {};
    var em = cfg.eventMoney || {};
    var amt = Math.round(em.investmentWin || 200);
    if (typeof eraMoney === 'function') amt = eraMoney(amt);
    return { emoji:'📈', title:'投资回报到账', body:'去年你随手投的一笔项目今年突然开花结果。理财顾问的电话听起来比平时热情了十倍："先生，你的账户多了 ' + fmtMoney(amt) + '。"你挂了电话，默默把理财顾问的名字存成了"财神爷"。', desc:'投资回报', _money: { delta: amt, reason: '投资回报' } };
  },
});

// ── 101. 开超跑被交警拦下 ──
EVENT_REGISTRY.push({
  id: 'lambo_ticket',
  name: '开超跑被交警拦下',
  weight: 2,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'🚗', title:'开超跑被交警拦下', body:'你开着新买的荧光绿兰博基尼在高速上被交警拦了下来。"知道为什么拦你吗？""呃...开太快了？"交警面无表情地说："你的车牌过期三个月了。"你尴尬地挠了挠头。你收到了两张罚单：逾期未注册 + 不按规定悬挂号牌。第二天你把车开去做了全车贴膜——换成了哑光黑，低调一点。', desc:'超跑被拦' };
  },
});


// ── 103. 赞助商递上代言定金（原送豪车改造：车是试驾车，不发资产） ──
EVENT_REGISTRY.push({
  id: 'sponsor_car',
  name: '赞助商递上代言定金',
  weight: 1,
  condition: (ctx) => true,
  execute: (ctx) => {
    var cfg = (typeof getEconCfg === 'function') ? getEconCfg() : {};
    var em = cfg.eventMoney || {};
    var biz = (STATE.career && STATE.career.profile) ? (STATE.career.profile.businessValue || 0) : 0;
    var amt = Math.min((em.sponsorDepositBase || 300) + biz * (em.sponsorDepositPerBiz || 20), em.sponsorDepositCap || 600);
    if (typeof eraMoney === 'function') amt = eraMoney(amt);
    if (STATE.career && STATE.career.profile) STATE.career.profile.businessValue += 1;
    return { emoji:'🏎️', title:'赞助商递上代言定金', body:'一家知名运动品牌在你连续爆发的第三场比赛后联系了你的经纪人——他们约你在品牌中心见面，门口停着一辆定制版保时捷Taycan。你坐进车里捣鼓着那块巨大的中控屏幕，像个孩子一样兴奋。但车是试驾车，真正递到你面前的是一份合作意向书和一笔 ' + fmtMoney(amt) + ' 的代言定金。<br><br>效果：代言定金入账；商业价值+1。', desc:'赞助商代言定金', _money: { delta: amt, reason: '代言合作定金' } };
  },
});

// ── 104. 老家亲戚来要票 ──
EVENT_REGISTRY.push({
  id: 'relatives_tickets',
  name: '老家亲戚来要票',
  weight: 2,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'🎫', title:'老家亲戚来要票', body:'你的电话响了——是你十几年没联系过的表舅。寒暄了几句之后他终于说出了目的："那个...下周六的比赛能搞到几张票吗？你表弟想去看。"你无奈地订了四张票放在前台。赛后你的亲戚们围着你拍了一百张合影，你表舅的儿子说："你是我们家最出名的人了！"', desc:'亲戚要票' };
  },
});


// ── 106. 养了一只宠物 ──
EVENT_REGISTRY.push({
  id: 'pet_dog',
  name: '养了一只宠物',
  weight: 2,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'🐕', title:'养了一只宠物', body:'你在宠物店看到了一只金毛幼犬，它用那双湿漉漉的眼睛看了你一眼——你沦陷了。十五分钟后你抱着一个毛茸茸的小家伙走出了宠物店，后座上多了一堆狗粮和玩具。从此你家多了一个在你训练回家后会疯狂摇尾巴迎接你的小生命。', desc:'养宠物' };
  },
});

// ── 107. 学吉他/开演唱会 ──
EVENT_REGISTRY.push({
  id: 'learn_guitar',
  name: '学吉他/开演唱会',
  weight: 2,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'🎸', title:'学吉他/开演唱会', body:'休赛期你迷上了吉他。你报了一个月的速成班，每天苦练四个小时。赛季开始后的球队年会上，你抱着吉他为全队弹唱了一首《Wonderwall》。虽然有几个音跑了，但你的勇气赢得了全队的掌声。主教练拍了拍你的肩膀说："球打得好，歌嘛——还有进步空间。"', desc:'学吉他' };
  },
});

// ── 108. 参与电影客串 ──
EVENT_REGISTRY.push({
  id: 'movie_cameo',
  name: '参与电影客串',
  weight: 1,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'🎬', title:'参与电影客串', body:'一部好莱坞大片正在你的城市取景拍摄，导演是你的球迷。他在IG上私信你邀请你客串一个角色——"只需要你走过镜头，说一句台词。"你在片场待了三个小时就完成了戏份。电影上映那天你包场请全队去看。当你在荧幕上出现说出那句"把球给我"时，你的队友们在电影院里发出了震天的欢呼声。', desc:'电影客串' };
  },
});

// ━━━ 类别 8：👻 玄学/奇闻 ━━━


// ── 110. 幸运袜子不能洗 ──
EVENT_REGISTRY.push({
  id: 'lucky_socks',
  name: '幸运袜子不能洗',
  weight: 2,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'🧦', title:'幸运袜子不能洗', body:'那场你拿到赛季新高的时候穿的是什么袜子你还记得。那之后的每一场比赛你都要找出同一双袜子——即使它已经穿了整整两周没洗了。它的气味已经成了一个独立的存在。你的队友拒绝和你坐同一排座椅。但你不在乎——只要它能带来好运，它臭它的，你赢你的。', desc:'幸运袜' };
  },
});





// ── 114. 球队包机延误 ──
EVENT_REGISTRY.push({
  id: 'flight_delay',
  name: '球队包机延误',
  weight: 2,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'✈️', title:'球队包机延误', body:'打完客场比赛后你们赶往机场，发现包机因为机械故障需要延迟五个小时。全队被困在机场VIP候机室里——有人在打牌，有人在睡觉，有人在反复刷着凌晨两点的航班信息。你们在凌晨四点才到达下一个客场城市。明天的比赛所有人都在揉眼睛打哈欠。背靠背本来就难，这下更难了。', desc:'包机延误' };
  },
});



// ── 116. 幸运手链丢了 ──
EVENT_REGISTRY.push({
  id: 'lucky_bracelet',
  name: '幸运手链丢了',
  weight: 2,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'📿', title:'幸运手链丢了', body:'你突然发现一直戴着的那条外婆送的幸运手链不见了！你在更衣室里翻了个底朝天——训练包、衣柜、昨天穿的衣服——都没有。你打电话问保洁，翻遍了昨天的球场区域。最终你发现它卡在了你的车座缝隙里。你如释重负地把它重新戴在手上，拍拍它："别再乱跑了。"', desc:'手链丢了' };
  },
});


// ── 118. 球场停电 ──
EVENT_REGISTRY.push({
  id: 'power_outage',
  name: '球场停电',
  weight: 1,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'⚡', title:'球场停电', body:'第三节打到一半，球馆的灯光突然熄灭——全部。包括应急灯。球馆陷入了一片彻底的黑暗。观众们先是惊呼，然后纷纷打开了手机手电筒，球馆里出现了数千支像萤火虫一样的光点。球员们站在原地不知所措。裁判宣布比赛暂停。15分钟后电力恢复，但节奏已经完全被打断了。', desc:'球场停电' };
  },
});

// ━━━ 类别 9：🦠 伤病 ━━━




// ── 122. 背部痉挛 ──
EVENT_REGISTRY.push({
  id: 'injury_back',
  name: '背部痉挛',
  weight: 15,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'💆', title:'背部痉挛', body:'你刚做了一个变向动作，突然感觉下背部像被电击了一样——肌肉完全锁死了。你僵在原地动弹不得，连呼吸都小心翼翼。队医把你扶到训练室，你趴在按摩床上发出了痛苦的呻吟。队医说："背部痉挛，至少休息几天。我知道你不愿意，但你的身体替你做了决定。"你没法反驳。', desc:'背部痉挛', _consequence:'injury', _games:(1 + Math.floor(Math.random() * 2)) };
  },
});

// ── 123. 脑震荡 ──
EVENT_REGISTRY.push({
  id: 'injury_concussion',
  name: '脑震荡',
  weight: 10,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'😵', title:'脑震荡', body:'你在争抢篮板时和对手的脑袋撞在了一起——一声闷响后你眼前一黑。你摔倒在地上，看什么都是双层的。队友的脸在你面前晃来晃去，但你听不清他们在说什么。队医用手电筒照了照你的瞳孔："可能脑震荡，必须离场。"你被送去医院做CT检查，头上缠着纱布的照片很快出现在了新闻上。', desc:'脑震荡', _consequence:'injury', _games:(5 + Math.floor(Math.random() * 6)) };
  },
});

// ===== 新增禁赛/伤病事件（来自 新增禁赛伤病事件_30条_v1.md） =====

// ── S1. 赛后停车场冲突 ──
EVENT_REGISTRY.push({
  id: 'susp_parking_fight',
  name: '赛后停车场冲突',
  weight: 15,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'🚗', title:'赛后停车场冲突', body:'赛后你在球员停车场被对方球员的言语激怒，两人从互喷升级为肢体冲突。你一拳挥过去正中对方下巴，保安和队友飞扑过来把你们拉开。这一幕被球迷用手机全程录下上传到社交平台。联盟以"损害联盟形象"为由对你处以禁赛{n}场的处罚。你在发布会上道了歉，但那一拳的视频已经被做成了GIF。', desc:'停车场斗殴禁赛', _consequence:'suspension', _games:(3 + Math.floor(Math.random() * 3)) };
  },
});

// ── S2. 脚踢替补席椅子 ──
EVENT_REGISTRY.push({
  id: 'susp_kick_chair',
  name: '脚踢替补席椅子',
  weight: 15,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'🪑', title:'脚踢替补席椅子', body:'你在一次争议吹罚后被换下场，怒火中烧的你一脚踢飞了替补席的折叠椅。椅子飞出去砸到了场边一位球迷的膝盖。虽然你立刻上前道歉，但联盟以"危险行为危害观众安全"为由对你处以禁赛{n}场的处罚。球队内部也对你进行了罚款。', desc:'怒踢椅子禁赛', _consequence:'suspension', _games:(1 + Math.floor(Math.random() * 2)) };
  },
});

// ── S3. 赛后发布会嘲讽对手 ──
EVENT_REGISTRY.push({
  id: 'susp_press_taunt',
  name: '赛后发布会嘲讽对手',
  weight: 15,
  condition: (ctx) => !!(ctx.stats && (ctx.stats.pts || 0) >= 25),
  execute: (ctx) => {
    return { emoji:'🎙️', title:'赛后发布会嘲讽对手', body:'赛后发布会上，记者问你对今晚对位球员的表现有什么看法。你对着麦克风不屑地说："他？他就不该在这个联盟打球。"这句话迅速引爆了社交媒体。联盟第二天宣布，因"公开贬低其他球员"对你处以禁赛{n}场的处罚。你后悔已经来不及了。', desc:'发布会不当言论禁赛', _consequence:'suspension', _games:1 };
  },
});

// ── S4. 比赛中推搡裁判 ──
EVENT_REGISTRY.push({
  id: 'susp_push_ref',
  name: '比赛中推搡裁判',
  weight: 15,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'👨‍⚖️', title:'比赛中推搡裁判', body:'裁判的一次误判让你彻底失控。你冲到裁判面前，用手指着他的鼻子怒吼，在他转身离开时你伸手推了他一把——虽然力度不大，但裁判立刻转身给你一个二级恶意犯规外加驱逐出场。联盟对"肢体接触裁判"零容忍，宣布对你禁赛{n}场并罚款50,000美元。', desc:'推搡裁判禁赛', _consequence:'suspension', _games:(3 + Math.floor(Math.random() * 3)) };
  },
});

// ── S5. 药检阳性 ──
EVENT_REGISTRY.push({
  id: 'susp_doping',
  name: '药检阳性',
  weight: 15,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'💊', title:'药检阳性', body:'联盟随机药检的结果出来了——你的样本中含有违禁物质。你在社交媒体上声明是"误服了含有违禁成分的补剂"，但联盟依然按照规定对你处以禁赛{n}场的处罚。你的名声受到了严重打击，赞助商也在观望。', desc:'药检阳性禁赛', _consequence:'suspension', _games:(5 + Math.floor(Math.random() * 6)) };
  },
});

// ── S6. 与队友训练中斗殴 ──
EVENT_REGISTRY.push({
  id: 'susp_teammate_fight',
  name: '与队友训练中斗殴',
  weight: 15,
  condition: (ctx) => !!(ctx.userState && ((ctx.userState.streak === 'L' && ctx.userState.streakLen >= 2) || ctx.userState.pct < 0.45)),
  execute: (ctx) => {
    return { emoji:'👊', title:'与队友训练中斗殴', body:'训练赛中你和队友因为一个犯规动作爆发了冲突。两人从互骂升级到互相推搡，最后你一拳打在了他的颧骨上。教练和助教把你们拉开，队友捂着脸去了医务室。球队管理层震怒，内部处罚你禁赛{n}场。更衣室的气氛降到了冰点。', desc:'内讧斗殴禁赛', _consequence:'suspension', _games:(2 + Math.floor(Math.random() * 3)) };
  },
});

// ── S8. 赛后拒绝接受采访 ──
EVENT_REGISTRY.push({
  id: 'susp_refuse_interview',
  name: '赛后拒绝接受采访',
  weight: 15,
  condition: (ctx) => !!(ctx.result && ctx.result.won === false),
  execute: (ctx) => {
    return { emoji:'🚫', title:'赛后拒绝接受采访', body:'输掉关键比赛后你心情糟糕透顶。场边记者拦住你要求赛后采访，你一把推开麦克风冷冷地说了一句"没什么好说的"然后径直走回更衣室。联盟规定球员必须接受赛后采访，你因此被罚款25,000美元（' + fmtMoney(typeof eraMoney === 'function' ? eraMoney(2.5) : 2.5) + '）并禁赛{n}场。', desc:'罢采禁赛', _consequence:'suspension', _games:1, _money: { delta: -(typeof eraMoney === 'function' ? eraMoney(2.5) : 2.5), reason: '联盟罚款（罢采）' } };
  },
});

// ── S9. 与球迷发生冲突 ──
EVENT_REGISTRY.push({
  id: 'susp_fan_conflict',
  name: '与球迷发生冲突',
  weight: 15,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'😡', title:'与球迷发生冲突', body:'客队球迷在你走出球员通道时朝你泼了一杯饮料。你瞬间暴怒，翻过围栏冲向那名球迷——安保人员及时拦住了你，但这一幕已经被摄像机全程记录。联盟决定对你处以禁赛{n}场的处罚。你在社交媒体上道了歉，但那个翻围栏的画面已经传遍了全网。', desc:'球迷冲突禁赛', _consequence:'suspension', _games:(2 + Math.floor(Math.random() * 3)) };
  },
});

// ── S10. 赛后与对手更衣室对峙 ──
EVENT_REGISTRY.push({
  id: 'susp_locker_confront',
  name: '赛后与对手更衣室对峙',
  weight: 15,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'🚪', title:'赛后与对手更衣室对峙', body:'终场哨响后你依然对对方球员的一个脏动作耿耿于怀。你穿过球员通道直接冲进了对方的更衣室——你踹开门，指着那个球员大喊："你有种当面做一次！"双方球员和教练组乱成一团。联盟以"闯入对方更衣室"为由对你禁赛{n}场。', desc:'更衣室对峙禁赛', _consequence:'suspension', _games:(3 + Math.floor(Math.random() * 3)) };
  },
});

// ── S11. 社交媒体发布不当言论 ──
EVENT_REGISTRY.push({
  id: 'susp_social_media',
  name: '社交媒体发布不当言论',
  weight: 15,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'🐦', title:'社交媒体发布不当言论', body:'深夜你在推特上发了一条吐槽联盟裁判的推文——"这个联盟的裁判水平连高中联赛都不如"。第二天这条推文引爆了舆论。联盟办公室迅速做出反应，以"公开诋毁联盟官员"为由对你处以禁赛{n}场的处罚。你删掉了推文，但截图已经被所有人看过了。', desc:'社媒不当言论禁赛', _consequence:'suspension', _games:(1 + Math.floor(Math.random() * 2)) };
  },
});

// ── S15. 危险动作锁喉对手 ──
EVENT_REGISTRY.push({
  id: 'susp_choke',
  name: '危险动作锁喉对手',
  weight: 15,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'🫀', title:'危险动作锁喉对手', body:'在一次争抢中你和对方球员纠缠在一起。情绪失控的你伸手卡住了对手的脖子——虽然只持续了两秒钟，但这个画面看起来极其恶劣。裁判和队友立刻把你拉开，对方球员倒地咳嗽。联盟回看录像后认定这是"暴力行为"，对你处以禁赛{n}场的重罚。', desc:'锁喉禁赛', _consequence:'suspension', _games:(4 + Math.floor(Math.random() * 4)) };
  },
});

// ── I1. 训练中膝盖扭伤 ──
EVENT_REGISTRY.push({
  id: 'injury_knee_sprain',
  name: '训练中膝盖扭伤',
  weight: 15,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'🦵', title:'训练中膝盖扭伤', body:'队内训练赛中你在做变向动作时突然感觉右膝传来一声闷响——你的膝盖在无对抗的情况下扭了一下。你痛苦地倒在地上，双手捂着膝盖。队医和教练冲了上来。MRI检查结果显示内侧副韧带拉伤，队医宣布你需要休养{n}场。', desc:'膝盖扭伤', _consequence:'injury', _games:(5 + Math.floor(Math.random() * 6)) };
  },
});

// ── I2. 肩膀脱臼 ──
EVENT_REGISTRY.push({
  id: 'injury_shoulder',
  name: '肩膀脱臼',
  weight: 15,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'🦴', title:'肩膀脱臼', body:'你在一次凶狠的拼抢中重重摔倒在地，左肩先着地——一阵剧痛从肩膀传来，你发现自己的左臂完全使不上力了。你试图活动肩膀，但每动一下都疼得龇牙咧嘴。队医检查后说肩膀脱臼了，需要休养{n}场。', desc:'肩膀脱臼', _consequence:'injury', _games:(4 + Math.floor(Math.random() * 5)) };
  },
});

// ── I3. 流感缺席 ──
EVENT_REGISTRY.push({
  id: 'injury_flu',
  name: '流感缺席',
  weight: 15,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'🤒', title:'流感缺席', body:'早上醒来你感觉浑身发冷、肌肉酸痛，体温计显示39.5度。队医检查后说你得了季节性流感，不建议你参加比赛。你躺在公寓的床上裹着被子瑟瑟发抖，手机屏幕上不断弹出队友们发来的"早日康复"。你至少需要休养{n}场。', desc:'流感缺阵', _consequence:'injury', _games:(1 + Math.floor(Math.random() * 3)) };
  },
});

// ── I4. 足底筋膜炎 ──
EVENT_REGISTRY.push({
  id: 'injury_fasciitis',
  name: '足底筋膜炎',
  weight: 15,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'🦶', title:'足底筋膜炎', body:'最近你的脚后跟在每天早上起床时都痛得像踩在钉子上。热身之后疼痛会减轻，但比赛后又会加重。队医诊断你患上了足底筋膜炎，建议你休息一段时间以免恶化。你不得不接受休养{n}场的康复计划。', desc:'足底筋膜炎', _consequence:'injury', _games:(3 + Math.floor(Math.random() * 4)) };
  },
});

// ── I6. 大腿肌肉拉伤 ──
EVENT_REGISTRY.push({
  id: 'injury_quad',
  name: '大腿肌肉拉伤',
  weight: 15,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'🦵', title:'大腿肌肉拉伤', body:'你在一次全力冲刺中突然感觉大腿前侧像被撕裂了一样——你立刻慢下来一瘸一拐地走向场边。你试图在边线上拉伸后继续比赛，但每发力一步都钻心地疼。队医宣布大腿肌肉二级拉伤，需要休养{n}场。', desc:'大腿拉伤', _consequence:'injury', _games:(5 + Math.floor(Math.random() * 6)) };
  },
});

// ── I7. 手腕扭伤 ──
EVENT_REGISTRY.push({
  id: 'injury_wrist',
  name: '手腕扭伤',
  weight: 15,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'✋', title:'手腕扭伤', body:'你在一次摔倒时本能地用手撑地——手腕传来一阵剧痛。你甩了甩手想继续打，但每次投篮发力时手腕都会剧烈疼痛。你的命中率明显下降，教练最终决定让你轮休。队医给你缠上了护腕，建议休养{n}场。', desc:'手腕扭伤', _consequence:'injury', _games:(2 + Math.floor(Math.random() * 3)) };
  },
});

// ── I8. 食物中毒住院 ──
EVENT_REGISTRY.push({
  id: 'injury_food_poison_hospital',
  name: '食物中毒住院',
  weight: 15,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'🏥', title:'食物中毒住院', body:'深夜你被剧烈的胃痛和呕吐惊醒。你冲到卫生间吐了三次，整个人虚脱到站不稳。经纪人连夜把你送到急诊室，医生诊断为急性肠胃炎（食物中毒），需要住院观察。你至少缺席{n}场比赛。', desc:'食物中毒', _consequence:'injury', _games:(2 + Math.floor(Math.random() * 3)) };
  },
});

// ── I9. 腹股沟拉伤 ──
EVENT_REGISTRY.push({
  id: 'injury_groin',
  name: '腹股沟拉伤',
  weight: 15,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'🤕', title:'腹股沟拉伤', body:'你在一次防守滑步中突然感觉大腿根部一阵撕裂感——你立刻停下来扶着腰，表情痛苦。腹股沟拉伤是运动员最烦人的伤病之一，虽然不算严重但非常容易复发。队医建议你休养{n}场以避免变成慢性伤病。', desc:'腹股沟拉伤', _consequence:'injury', _games:(3 + Math.floor(Math.random() * 4)) };
  },
});

// ── I10. 小腿肌肉痉挛 ──
EVENT_REGISTRY.push({
  id: 'injury_calf_cramp',
  name: '小腿肌肉痉挛',
  weight: 15,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'🦵', title:'小腿肌肉痉挛', body:'第四节刚开始你的小腿突然抽筋了——肌肉硬得像一块石头，你痛得单膝跪地。队医上场给你拉伸，但每次你试图跑动时都会再次抽筋。教练无奈地把你换下。赛后队医说你严重脱水，需要休息{n}场来恢复。', desc:'小腿痉挛', _consequence:'injury', _games:(1 + Math.floor(Math.random() * 2)) };
  },
});

// ── I11. 眼角膜擦伤 ──
EVENT_REGISTRY.push({
  id: 'injury_eye',
  name: '眼角膜擦伤',
  weight: 15,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'👁️', title:'眼角膜擦伤', body:'争抢篮板时对方的手指直接戳进了你的眼睛——你惨叫一声捂着眼睛蹲在地上。泪水不停地流，你几乎睁不开那只眼睛。队医检查后发现你的眼角膜被划伤了，至少需要休养{n}场来恢复视力。', desc:'眼角膜擦伤', _consequence:'injury', _games:(2 + Math.floor(Math.random() * 3)) };
  },
});

// ── I12. 肋骨挫伤 ──
EVENT_REGISTRY.push({
  id: 'injury_rib',
  name: '肋骨挫伤',
  weight: 15,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'🩻', title:'肋骨挫伤', body:'你被对方一肘重重击中了侧腹部——你当场感觉呼吸都困难了。你捂着肋骨弯着腰，每一次深呼吸都伴随着刺痛。队医检查后说肋骨骨膜挫伤，虽然没有骨折但非常疼。你被列入每日观察名单，最终决定休养{n}场。', desc:'肋骨挫伤', _consequence:'injury', _games:(3 + Math.floor(Math.random() * 4)) };
  },
});

// ── I13. 膝盖积液 ──
EVENT_REGISTRY.push({
  id: 'injury_knee_effusion',
  name: '膝盖积液',
  weight: 15,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'🦵', title:'膝盖积液', body:'你的膝盖在最近几场比赛中越来越肿胀，每次弯曲都发出咯吱咯吱的声音。队医抽取了膝盖里的积液，足足抽出了20毫升黄色液体。他严肃地告诉你必须休息，否则会发展成慢性滑膜炎。你接受了休养{n}场的建议。', desc:'膝盖积液', _consequence:'injury', _games:(4 + Math.floor(Math.random() * 4)) };
  },
});

// ── I14. 牙槽骨折 ──
EVENT_REGISTRY.push({
  id: 'injury_tooth',
  name: '牙槽骨折',
  weight: 15,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'🦷', title:'牙槽骨折', body:'你在争抢中被对方肘部击中了嘴巴——你吐出了半颗牙齿和一嘴血。队医把你带到更衣室止血，牙医检查后发现牙槽骨有轻微骨折。你需要在休赛期做牙科手术，目前只能吃流食。你缺席{n}场比赛。', desc:'牙齿受伤', _consequence:'injury', _games:(1 + Math.floor(Math.random() * 3)) };
  },
});

// ── I15. 腿筋三级拉伤（重伤） ──
EVENT_REGISTRY.push({
  id: 'injury_major_hamstring',
  name: '腿筋三级拉伤',
  weight: 1,
  majorInjury: true,
  condition: (ctx) => true,
  execute: (ctx) => {
    var games = 22 + Math.floor(Math.random() * 12);
    return { emoji:'🏥', title:'腿筋三级拉伤', body:'你在一次反击冲刺中突然停住，右手立刻摸向大腿后侧。回放里没有对抗，只有你起速那一下身体明显一顿。MRI结果显示腿筋三级拉伤，队医给出的恢复周期接近两个月。球队宣布你将缺席{n}场比赛，所有训练计划都要重新排。', desc:'腿筋三级拉伤', _consequence:'injury', _games:games, _majorInjury:true };
  },
});

// ── I16. 足部应力性骨折（重伤） ──
EVENT_REGISTRY.push({
  id: 'injury_major_foot_fracture',
  name: '足部应力性骨折',
  weight: 1,
  majorInjury: true,
  condition: (ctx) => true,
  execute: (ctx) => {
    var games = 32 + Math.floor(Math.random() * 14);
    return { emoji:'🩼', title:'足部应力性骨折', body:'最近几周你的脚一直隐隐作痛，你以为只是疲劳，直到一次落地后疼痛直接钻到脚背。进一步检查显示足部出现应力性骨折，队医要求你立刻停止高强度训练。你至少要休养{n}场比赛，这段时间只能做低冲击康复。', desc:'足部应力性骨折', _consequence:'injury', _games:games, _majorInjury:true };
  },
});

// ── I17. 膝盖半月板手术（赛季级重伤） ──
EVENT_REGISTRY.push({
  id: 'injury_major_meniscus_surgery',
  name: '膝盖半月板手术',
  weight: 1,
  majorInjury: true,
  condition: (ctx) => true,
  execute: (ctx) => {
    var games = getSeasonEndingInjuryGamesLeft();
    return { emoji:'🚑', title:'膝盖半月板手术', body:'你在一次急停转身后坐在地上很久没有起来。队友围过来时，你只是摇头。检查结果出来后，更衣室安静得可怕：半月板撕裂，需要手术处理。球队随后宣布你将缺席本赛季剩余比赛，接下来的一切都从康复室重新开始。', desc:'膝盖半月板手术', _consequence:'injury', _games:games, _majorInjury:true };
  },
});

// ── I18. 脚踝扭伤 ──
EVENT_REGISTRY.push({
  id: 'injury_ankle_sprain',
  name: '脚踝扭伤',
  weight: 15,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'🦶', title:'脚踝扭伤', body:'防守端你横移去追持球人，一脚踩在了对方脚面上，脚踝瞬间向内翻成直角。你听见"咔"的一声脆响，整个人摔倒在地，捂着脚踝打滚。队医跑上场喷了冷冻喷雾，把你扶到板凳席评估。X光显示没有骨折，但韧带明显拉伤。队医摇摇头："至少{n}场。"你骂了一句，把毛巾摔在椅子上。', desc:'脚踝扭伤', _consequence:'injury', _games:(4 + Math.floor(Math.random() * 4)) };
  },
});

// ── I19. 手指骨折 ──
EVENT_REGISTRY.push({
  id: 'injury_finger',
  name: '手指骨折',
  weight: 15,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'🖐️', title:'手指骨折', body:'一次封盖中你的手指戳在了篮筐和球之间的缝隙里，回放里能看到指尖明显弯了一下。你咬着牙把手指掰回原位继续打，直到投篮时整根手指钻心地疼。队医拍了X光：无名指骨裂，需要夹板固定。你看着受伤的手直叹气——坏消息是，这是你的投篮手。', desc:'手指骨折', _consequence:'injury', _games:(3 + Math.floor(Math.random() * 3)) };
  },
});

// ── I20. 鼻梁骨折 ──
EVENT_REGISTRY.push({
  id: 'injury_nose_fracture',
  name: '鼻梁骨折',
  weight: 15,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'👃', title:'鼻梁骨折', body:'争抢篮板时对方一肘结结实实砸在你的面门上，你眼前一黑，鼻腔里涌出一股热流。低头一看，球衣前襟已经被鼻血染红。队医用棉球塞住你的鼻子，医生诊断鼻梁骨裂。球队连夜给你定制了一副透明面具——戴上之后你看起来像个外星人，队友笑称你是"塑料面具侠"。', desc:'鼻梁骨折', _consequence:'injury', _games:(2 + Math.floor(Math.random() * 4)) };
  },
});

// ── I21. 跟腱炎 ──
EVENT_REGISTRY.push({
  id: 'injury_achilles_tendinitis',
  name: '跟腱炎',
  weight: 15,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'🩹', title:'跟腱炎', body:'最近你总觉得脚后跟上方的跟腱又紧又痛，早晨起床踩地那一下尤其明显。队医检查后叹了口气："跟腱炎，这玩意儿最怕拖着。"他给你安排了冰敷、按摩和超声波治疗，宣布你需要休息一段时间。你看着赛程表上密密麻麻的比赛，第一次觉得休赛期那么遥远。', desc:'跟腱炎', _consequence:'injury', _games:(4 + Math.floor(Math.random() * 6)) };
  },
});

// ── I22. 髌腱炎 ──
EVENT_REGISTRY.push({
  id: 'injury_patellar_tendinitis',
  name: '髌腱炎',
  weight: 15,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'🦵', title:'髌腱炎', body:'你的膝盖下方越来越痛，每次起跳落地都像被针扎。队医按了按你的髌腱，你倒吸一口凉气。"跳跃膝，典型的老毛病。"他给你戴上髌骨带，建议减少训练量。你试着做了个热身扣篮，落地时膝盖一软，差点跪在场中央。队医在旁幽幽地说："再扣一个试试？"', desc:'髌腱炎', _consequence:'injury', _games:(3 + Math.floor(Math.random() * 5)) };
  },
});

// ── I23. 肘部滑囊炎 ──
EVENT_REGISTRY.push({
  id: 'injury_elbow',
  name: '肘部滑囊炎',
  weight: 15,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'💪', title:'肘部滑囊炎', body:'一次倒地扑球时你的肘部重重磕在地板上，当时只觉得麻。第二天起床，肘关节肿成了半个小馒头，弯都弯不动。队医用针筒抽出一管淡黄色的积液，你看着那管液体，决定以后倒地时改用屁股着陆。', desc:'肘部滑囊炎', _consequence:'injury', _games:(2 + Math.floor(Math.random() * 4)) };
  },
});

// ── I24. 髋部屈肌拉伤 ──
EVENT_REGISTRY.push({
  id: 'injury_hip_flexor',
  name: '髋部屈肌拉伤',
  weight: 15,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'🦿', title:'髋部屈肌拉伤', body:'一次全力冲刺加速时，你的髋部传来一阵撕裂感，像有人从里面扯了你一把。你立刻减速，一瘸一拐走到场边。队医检查后确认髋部屈肌拉伤，并特意提醒你："以后热身别偷懒。"你想起自己确实跳过了好几次拉伸——理亏，沉默。', desc:'髋部拉伤', _consequence:'injury', _games:(3 + Math.floor(Math.random() * 5)) };
  },
});

// ── I25. 脚趾骨折 ──
EVENT_REGISTRY.push({
  id: 'injury_toe_fracture',
  name: '脚趾骨折',
  weight: 15,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'🦶', title:'脚趾骨折', body:'一次卡位时队友的大脚结结实实踩在你的脚趾上，你惨叫一声跪了下去。脱下球鞋一看，大脚趾已经肿成了紫茄子。X光显示骨裂。队医说有人会打封闭硬撑，但建议你休养。你看着肿起来的脚趾，决定听取建议——脚趾虽小，疼起来真要命。', desc:'脚趾骨折', _consequence:'injury', _games:(2 + Math.floor(Math.random() * 5)) };
  },
});

// ── I26. 颈部扭伤（落枕） ──
EVENT_REGISTRY.push({
  id: 'injury_neck',
  name: '颈部扭伤',
  weight: 15,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'🧣', title:'颈部扭伤', body:'昨晚你睡姿极其嚣张——脖子拧成90度趴着睡了一整夜。早上醒来，脖子僵得像个雕塑，转头只能连身体一起转。队医给你做了理疗，宣布你因"落枕"缺席。你成为更衣室最新笑料，队友们在你背后模仿你歪着脖子走路的样子。', desc:'颈部扭伤', _consequence:'injury', _games:(1 + Math.floor(Math.random() * 2)) };
  },
});

// ── I27. 切百吉饼割伤手指（离谱） ──
EVENT_REGISTRY.push({
  id: 'injury_bagel',
  name: '切百吉饼割伤手指',
  weight: 8,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'🥯', title:'切百吉饼割伤手指', body:'早餐时你决定亲自切一个百吉饼——这不是你第一次拿刀，但绝对是最后一次。刀锋顺着面包表面滑开，精准地切进了你的左手食指。你看着血流如注的手指，在手机镜头前强装镇定，但社交媒体已经炸了："NBA全明星被百吉饼击倒！"队医缝了三针，宣布你缺席{n}场。', desc:'百吉饼割伤', _consequence:'injury', _games:(2 + Math.floor(Math.random() * 3)) };
  },
});

// ── I28. 踩到乐高积木（离谱） ──
EVENT_REGISTRY.push({
  id: 'injury_lego',
  name: '踩到乐高积木',
  weight: 8,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'🧱', title:'踩到乐高积木', body:'深夜你摸黑去厨房喝水，一脚踩在了侄子扔在地上的乐高积木上。那一瞬间，你的惨叫惊醒了整栋楼，也惊动了球队管理层——你捂着脚单脚跳了十分钟，脚底淤伤严重。队医的官方诊断是"乐高综合症"，队友们送了你一整盒乐高作为慰问礼物。', desc:'乐高踩伤', _consequence:'injury', _games:(1 + Math.floor(Math.random() * 2)) };
  },
});

// ── I29. 浴室滑倒（离谱） ──
EVENT_REGISTRY.push({
  id: 'injury_shower_slip',
  name: '浴室滑倒',
  weight: 8,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'🚿', title:'浴室滑倒', body:'客场酒店的浴室没有防滑垫，你洗完澡光脚踩上瓷砖，脚下一滑，整个人重重摔在浴缸边沿，膝盖撞得青紫。你趴在地上缓了五分钟才爬起来，第一反应是打开手机搜索"酒店浴室滑倒索赔"。队医宣布你缺席，伤情报告上写的是"淋浴事故"——你恨不得找个地缝钻进去。', desc:'浴室滑倒', _consequence:'injury', _games:(2 + Math.floor(Math.random() * 4)) };
  },
});

// ── I30. 打喷嚏拉伤肋间肌（离谱） ──
EVENT_REGISTRY.push({
  id: 'injury_sneeze',
  name: '打喷嚏拉伤肋间肌',
  weight: 8,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'🤧', title:'打喷嚏拉伤肋间肌', body:'一个再普通不过的早晨，你打了个惊天动地的喷嚏——然后肋间肌就拉伤了。你连呼吸都痛，更别提转身、弯腰、穿袜子。队医听完你的受伤过程，憋笑憋得满脸通红："年度最佳受伤姿势。"你缩在沙发上用吸管喝水，感觉自己像个易碎品。', desc:'喷嚏拉伤', _consequence:'injury', _games:(2 + Math.floor(Math.random() * 3)) };
  },
});

// ── I31. 弯腰闪到腰（离谱） ──
EVENT_REGISTRY.push({
  id: 'injury_bend_over',
  name: '弯腰闪到腰',
  weight: 8,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'🙃', title:'弯腰闪到腰', body:'你弯腰去捡地上的袜子——就只是捡个袜子。腰部传来"咔"的一声，你整个人僵在原地，保持弯腰姿势动弹不得，像一尊雕塑。队友路过看你半天没直起身，关切地问："需要帮忙吗？"你缓缓摇头，眼角有泪。队医诊断急性腰扭伤，建议你以后用脚趾夹袜子。', desc:'弯腰闪腰', _consequence:'injury', _games:(1 + Math.floor(Math.random() * 3)) };
  },
});

// ── I32. 香槟瓶塞崩到眼睛（离谱） ──
EVENT_REGISTRY.push({
  id: 'injury_champagne',
  name: '香槟瓶塞崩到眼睛',
  weight: 8,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'🍾', title:'香槟瓶塞崩到眼睛', body:'球队庆祝胜利，你负责开那瓶香槟。你摇晃得太猛，瓶塞"砰"的一声弹射而出，精准命中你的右眼。你捂着眼睛蹲在地上，眼泪哗哗地流。队医检查发现眼角膜擦伤，建议休息。第二天新闻标题：《香槟击败球星》——你发誓以后只喝开好的。', desc:'香槟崩眼', _consequence:'injury', _games:(1 + Math.floor(Math.random() * 3)) };
  },
});

// ── I33. 被自家狗绊倒（离谱） ──
EVENT_REGISTRY.push({
  id: 'injury_dog',
  name: '被自家狗绊倒',
  weight: 8,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'🐕', title:'被自家狗绊倒', body:'你家的金毛在你进门时热情扑上来迎接，你为了接住它后退一步，脚后跟撞上台阶，整个人向后摔了个四脚朝天，手腕撑地。狗还一脸无辜地摇着尾巴。队医诊断手腕扭伤，球队公告写着"居家意外"。你接受采访时的原话是："别问，问就是爱。"', desc:'被狗绊倒', _consequence:'injury', _games:(2 + Math.floor(Math.random() * 4)) };
  },
});

// ── I34. 庆祝太猛拉伤腹股沟（离谱） ──
EVENT_REGISTRY.push({
  id: 'injury_celebration',
  name: '庆祝拉伤腹股沟',
  weight: 8,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'🤸', title:'庆祝拉伤腹股沟', body:'你投进压哨绝杀，兴奋地跳上技术台对着全场怒吼——落地时脚下一滑，腹股沟传来一阵撕扯感。你维持着"王者之姿"走下球场，表情管理近乎完美，只有队医看见你扶着大腿内侧龇牙咧嘴。赛后诊断：庆祝过度导致腹股沟拉伤。媒体评价：史上最昂贵的装逼。', desc:'庆祝拉伤', _consequence:'injury', _games:(2 + Math.floor(Math.random() * 3)) };
  },
});

// ── I35. 更衣室门夹手指（离谱） ──
EVENT_REGISTRY.push({
  id: 'injury_locker_door',
  name: '更衣室门夹手指',
  weight: 8,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'🚪', title:'更衣室门夹手指', body:'训练结束你最后一个离开更衣室，转身关门时一阵穿堂风把厚重的铁门猛推回来，你的手指被结结实实夹在门缝里。你疼得原地起跳，把队友刚拖干的地板又弄湿了一片。队医检查后确认手指挫伤加指甲淤血，建议休息。你对着指甲上的淤青看了整整十分钟，怀疑人生。', desc:'门夹手指', _consequence:'injury', _games:(1 + Math.floor(Math.random() * 2)) };
  },
});

// ── I36. 自助餐吃出急性肠胃炎（离谱） ──
EVENT_REGISTRY.push({
  id: 'injury_buffet',
  name: '自助餐急性肠胃炎',
  weight: 8,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'🦞', title:'自助餐急性肠胃炎', body:'客场夜宵，你对着自助餐台的帝王蟹、生蚝、刺身连吃了五盘，还打包了一份回房间。凌晨三点，你的胃开始造反，上吐下泻到虚脱。经纪人给你送来电解质水和蒙脱石散，队医宣布你因"赛前饮食失控"缺席。你躺在床上发誓：下次最多吃四盘。', desc:'自助餐肠胃炎', _consequence:'injury', _games:(1 + Math.floor(Math.random() * 2)) };
  },
});

// ── I37. 跟腱断裂（赛季级重伤） ──
EVENT_REGISTRY.push({
  id: 'injury_major_achilles',
  name: '跟腱断裂',
  weight: 1,
  majorInjury: true,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'🩼', title:'跟腱断裂', body:'一次无对抗的起跳落地后，你突然感觉脚后跟像被人从后面踢了一脚，随即一阵剧痛传来。你试图站起来，但脚后跟完全使不上力，你脸色煞白地躺在地上。队医做了简单的触诊测试后示意担架进场。MRI结果出来那一刻，更衣室安静得可怕：跟腱断裂。球队随后宣布你将缺席本赛季剩余比赛。康复之路从现在开始，一天一天地爬回来。', desc:'跟腱断裂（赛季报销）', _consequence:'injury', _games:getSeasonEndingInjuryGamesLeft(), _majorInjury:true, _mods:{ games:10, chem:-2, morale:-2 } };
  },
});

// ── I38. 前十字韧带撕裂（赛季级重伤） ──
EVENT_REGISTRY.push({
  id: 'injury_major_acl',
  name: '前十字韧带撕裂',
  weight: 1,
  majorInjury: true,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'🦴', title:'前十字韧带撕裂', body:'一次变向突破中，你的膝盖传来"咔嚓"一声脆响，你整个人栽倒在地，抱着膝盖发出压抑的嘶吼。队医检查后表情凝重，做了抽屉测试后摇了摇头。MRI确认：前十字韧带完全撕裂。这是篮球运动员最害怕的诊断之一。手术排上了日程，你将在康复室里度过接下来的几个月。所有人都在说"慢慢来"，但你知道，这条路只能自己走。', desc:'前十字韧带撕裂（赛季报销）', _consequence:'injury', _games:getSeasonEndingInjuryGamesLeft(), _majorInjury:true, _mods:{ games:10, chem:-2, morale:-2 } };
  },
});

// ── I39. 琼斯骨折（第五跖骨） ──
EVENT_REGISTRY.push({
  id: 'injury_major_jones_fracture',
  name: '琼斯骨折',
  weight: 1,
  majorInjury: true,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'🩻', title:'琼斯骨折', body:'训练中你的脚突然一阵剧痛，你以为是鞋带系太紧，脱鞋一看，第五跖骨位置已经肿了起来。X光显示第五跖骨骨折——就是著名的"琼斯骨折"，曾经终结过无数球星的全明星赛季。队医的表情很凝重，你被立刻安排手术。医生说恢复期以月为单位计算，你看着球鞋柜，叹了口气。', desc:'琼斯骨折（第五跖骨）', _consequence:'injury', _games:getSeasonEndingInjuryGamesLeft(), _majorInjury:true };
  },
});

// ── I40. 肩袖撕裂（需手术） ──
EVENT_REGISTRY.push({
  id: 'injury_major_rotator_cuff',
  name: '肩袖撕裂',
  weight: 1,
  majorInjury: true,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'💪', title:'肩袖撕裂', body:'一次对抗上篮时，对方狠狠切在你扬起的胳膊上，你听到肩膀深处传来一声闷响。起初你以为是普通挫伤，但第二天胳膊完全抬不起来。核磁共振显示肩袖撕裂。队医建议手术修复，这意味着漫长的康复。你开始练习用左手吃饭、洗脸、打字——人生技能点突然+1。', desc:'肩袖撕裂（需手术）', _consequence:'injury', _games:getSeasonEndingInjuryGamesLeft(), _majorInjury:true };
  },
});

// ── I41. 胸肌撕裂（需手术） ──
EVENT_REGISTRY.push({
  id: 'injury_major_pectoral',
  name: '胸肌撕裂',
  weight: 1,
  majorInjury: true,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'🦾', title:'胸肌撕裂', body:'你试图在快攻中完成一记势大力沉的战斧扣篮，起跳发力的一瞬间，胸口传来撕裂般的剧痛，球脱手飞出界外。你捂着胸口跪在地上，呼吸都变得小心翼翼。检查结果：胸肌肌腱撕裂，需要手术。队医说这是力量型球员的"职业病"。你躺在床上，开始怀念那些能随便做俯卧撑的日子。', desc:'胸肌撕裂（需手术）', _consequence:'injury', _games:getSeasonEndingInjuryGamesLeft(), _majorInjury:true };
  },
});

// ── I42. 深静脉血栓（生涯级风险） ──
EVENT_REGISTRY.push({
  id: 'injury_major_dvt',
  name: '深静脉血栓',
  weight: 1,
  majorInjury: true,
  condition: (ctx) => true,
  execute: (ctx) => {
    return { emoji:'🩸', title:'深静脉血栓', body:'你发现自己的小腿莫名其妙地肿胀发红，摸上去还有发热感。球队医生神色凝重地安排你做超声检查，结果出来时他的表情让你心里一沉：深静脉血栓。这意味着血液在静脉里凝结成块，随时可能脱落——这是最危险的伤病之一。你开始每天注射抗凝药物，队医严肃地告诉你，接下来的恢复期必须以安全为第一。', desc:'深静脉血栓（生涯级风险）', _consequence:'injury', _games:getSeasonEndingInjuryGamesLeft(), _majorInjury:true, _mods:{ games:10, chem:-2, morale:-2 } };
  },
});

// ━━━ 新事件：旧东家重逢（选项事件） ━━━
EVENT_REGISTRY.push({
  id: 'old_team_reunion',
  name: '旧东家重逢',
  weight: 12,
  condition: (ctx) => {
    var c = STATE.career;
    if (!c || !c.mobility) return false;
    var opp = ctx && ctx.game && ctx.game.opponent;
    if (!opp) return false;
    var teams = c.mobility.freeAgencyTeams || [];
    if (teams.indexOf(opp) < 0) return false;
    if (STATE.season && STATE.season.events && STATE.season.events.lastOldTeamGame != null) {
      var since = (STATE.season.games || []).length - STATE.season.events.lastOldTeamGame;
      if (since < 4) return false;
    }
    return true;
  },
  execute: (ctx) => {
    var opp = ctx && ctx.game && ctx.game.opponent;
    var teamName = ((typeof getTeamName === 'function') ? getTeamName(opp) : opp) || opp;
    return {
      emoji: '🏳️',
      title: '旧东家重逢',
      body: '对面是' + teamName + '——你曾经把这件球衣穿在身上的球队。赛前热身时，他们那个跟你一起打过球的老队友朝你点了点头，没有更多表示。你站在中圈，能听到客场球迷压低的议论声。这座城市曾经为你欢呼，也曾经目送你离开。',
      choices: [
        { label: '冷漠路过，专注比赛', hint: '媒体好感+1，教练信任+1，双方和平', apply: function(_c) {
          addProfileDelta('mediaTrust', 1);
          addProfileDelta('coachTrust', 1);
          var _flR = getChainFlags(); if (_flR) _flR.reunionChain = { team: (_c && _c.game && _c.game.opponent) || '', attitude: 'cold', season: (STATE.career && STATE.career.seasonCount) || 0, pending: true };
          return { emoji: '🤝', title: '旧东家重逢：各为其主', body: '你没有回应任何旧情，只把球衣拉链拉到最高，走上球场。那晚的每一次防守沟通，你都比平时更专注。赛后对方老队友拍了拍你的背：打得不错。你点了点头——有些告别，不需要重提。<br><br>效果：媒体好感+1；教练信任+1。' };
        }},
        { label: '赛后放下狠话', hint: '冲突风险：可能禁赛；若忍住则关键球+1', apply: function(_c) {
          var _flR = getChainFlags(); if (_flR) _flR.reunionChain = { team: (_c && _c.game && _c.game.opponent) || '', attitude: 'trash', season: (STATE.career && STATE.career.seasonCount) || 0, pending: true };
          var r = Math.random();
          if (r < 0.5) {
            addAttrDelta('CLU', 1); STATE.finalOVR = calcOVR(STATE.attrs);
            addProfileDelta('controversy', 1);
            return { emoji: '🗣️', title: '旧东家重逢：狠话成真', body: '你在采访里说：离开不是我的损失。这话当晚就上了头条，第二天训练时队友都在笑。你把这股火气全部带进了比赛——下一场关键回合，你出手的手比任何时候都稳。<br><br>效果：关键球+1；争议+1。' };
          }
          return { emoji: '🔇', title: '旧东家重逢：言论过界', body: '你越说越激动，提到了旧队的更衣室往事。赛后联盟以不当言论为由开出罚单，你被禁赛1场，更衣室里安静了一整天。<br><br>效果：禁赛1场；化学-2；士气-1。', _consequence: 'suspension', _games: 1, _mods: { games: 5, chem: -2, morale: -1 } };
        }},
        { label: '用表现回应', hint: '本场数据提升，化学+2，更衣室更信任你', apply: function(_c) {
          var boost = { games: 5, chem: 2, morale: 1 };
          addProfileDelta('lockerRoomTrust', 1);
          addProfileDelta('mediaTrust', 1);
          var _flR = getChainFlags(); if (_flR) _flR.reunionChain = { team: (_c && _c.game && _c.game.opponent) || '', attitude: 'performance', season: (STATE.career && STATE.career.seasonCount) || 0, pending: true };
          return { emoji: '🔥', title: '旧东家重逢：用表现说话', body: '你没有说一句话。那场比赛你打出了赛季代表作之一，第四节每一个关键回合都把球按进篮筐。赛后老队友苦笑：你当初就该这样打。你回了一句：现在这样也不晚。<br><br>效果：球队化学+2、士气+1（未来5场）；更衣室信任+1；媒体好感+1。', _mods: boost };
        }}
      ]
    };
  },
});

// ━━━ 新事件：季后赛刷分羞辱（选项事件） ━━━
EVENT_REGISTRY.push({
  id: 'playoff_stuffing',
  name: '季后赛刷分',
  weight: 9,
  condition: (ctx) => {
    if (!STATE.season || !STATE.season.isPlayoffs) return false;
    var r = ctx && ctx.result ? ctx.result : null;
    var g = ctx && ctx.game ? ctx.game : null;
    var s = ctx && ctx.stats ? ctx.stats : null;
    var myScore = null, oppScore = null;
    if (r && typeof r.scoreA === 'number' && typeof r.scoreB === 'number') { myScore = r.scoreA; oppScore = r.scoreB; }
    else if (g && typeof g.scoreA === 'number' && typeof g.scoreB === 'number') { myScore = g.scoreA; oppScore = g.scoreB; }
    var pts = s ? (s.pts || 0) : 0;
    if (pts >= 32) return true;
    if (myScore != null && oppScore != null && myScore - oppScore >= 15 && pts >= 25) return true;
    return false;
  },
  execute: (ctx) => {
    return {
      emoji: '📊',
      title: '季后赛刷分？',
      body: '比赛已经失去悬念，但你手感正烫。教练看了一眼替补席，又看了一眼你：要不要下来休息？你明白他的意思——剩下的时间，刷分已经不影响结果。但你心里有另一个声音：对面替补席的表情，值得再看一会儿。',
      choices: [
        { label: '收手，尊重比赛', hint: '媒体好感+1，更衣室好评', apply: function() {
          addProfileDelta('mediaTrust', 1);
          addProfileDelta('coachTrust', 1);
          return { emoji: '🧊', title: '季后赛：收手', body: '你主动走向替补席，把最后几分钟留给了年轻人。赛后对方教练在新闻发布会上说：他比他的数据更值得尊重。<br><br>效果：媒体好感+1；教练信任+1。' };
        }},
        { label: '继续刷，打崩对面心态', hint: '数据+，争议+1，媒体好感-1', apply: function() {
          addProfileDelta('controversy', 1);
          addProfileDelta('mediaTrust', -1);
          var boost = { games: 3, morale: 1 };
          return { emoji: '😤', title: '季后赛：刷分', body: '你打满了剩余时间，把个人数据顶到赛季新高。赛后采访区的问题从“怎么赢的”变成了“为什么这么打”。你只回了一句：季后赛每一分都算数。<br><br>效果：数据大幅提升；争议+1；媒体好感-1；士气+1（未来3场）。', _mods: boost };
        }},
        { label: '朝对面替补席做手势', hint: '冲突风险：可能禁赛或引发斗殴', apply: function() {
          var r = Math.random();
          if (r < 0.45) {
            return { emoji: '🤬', title: '季后赛：手势升级', body: '你朝对面替补席比了个手势。裁判立刻给了你技术犯规，赛后联盟追加处罚，你被禁赛1场。球队赢球，更衣室却没人庆祝。<br><br>效果：禁赛1场；化学-1；媒体好感-1。', _consequence: 'suspension', _games: 1, _mods: { games: 4, chem: -1, morale: -1 } };
          }
          addProfileDelta('controversy', 1);
          return { emoji: '😎', title: '季后赛：回应挑衅', body: '你朝对面替补席摊了摊手，对方主力冲上来和你顶牛，被队友隔开。裁判各给一个技术犯规，比赛继续。赛后所有人都在讨论你——虽然有些人摇头。<br><br>效果：争议+1；无禁赛。' };
        }}
      ]
    };
  },
});

// ━━━ 新事件：队友与对手冲突（选项事件，可升级奥本山） ━━━
EVENT_REGISTRY.push({
  id: 'teammate_conflict_choice',
  name: '队友与对手冲突',
  weight: 10,
  condition: (ctx) => {
    var r = ctx && ctx.result ? ctx.result : null;
    if (!r || r.won) return false;
    var games = STATE.season && STATE.season.games ? STATE.season.games.length : 0;
    if (games < 15) return false;
    if (STATE.season && STATE.season.events && STATE.season.events.lastTeammateConflict != null) {
      var since = games - STATE.season.events.lastTeammateConflict;
      if (since < 10) return false;
    }
    return true;
  },
  execute: (ctx) => {
    return {
      emoji: '💢',
      title: '队友与对手冲突',
      body: '第四节还剩两分钟，你的队友在一次上篮中被对手一把拉下来。两个人在地板上扭成一团，裁判冲过来把两边分开。你的队友站起来瞪着对面，又回头看了你一眼——所有人都在等你表态。',
      choices: [
        { label: '转头就走，假装没看见', hint: '不卷入冲突，但队友会失望', apply: function() {
          addProfileDelta('coachTrust', -1);
          addProfileDelta('lockerRoomTrust', -1);
          var r2 = Math.random();
          if (r2 < 0.35) {
            return { emoji: '🚶', title: '冲突：冷处理', body: '你转身走向替补席，接过毛巾擦汗。赛后更衣室很安静，你的队友没有再提起那件事，但你注意到他换衣服时没看你一眼。<br><br>效果：更衣室信任-1；教练信任-1。' };
          }
          return { emoji: '🚶', title: '冲突：置身事外', body: '你没有参与。赛后更衣室里有人低声说：至少他保住了自己。你听到那句话，没有反驳。<br><br>效果：更衣室信任-1；教练信任-1。' };
        }},
        { label: '嘲讽对方主力', hint: '帮队友出头，但可能禁赛', apply: function() {
          var r = Math.random();
          if (r < 0.4) {
            return { emoji: '🎤', title: '冲突：嘲讽压制', body: '你走到对面主力面前，居高临下地笑了笑：就这？他脸色变了，但裁判及时把你们隔开。赛后联盟以煽动冲突为由处罚，你被禁赛1场。<br><br>效果：禁赛1场；化学-1；更衣室信任+1。', _consequence: 'suspension', _games: 1, _mods: { games: 4, chem: -1, morale: -1 } };
          }
          addProfileDelta('lockerRoomTrust', 1);
          addProfileDelta('controversy', 1);
          return { emoji: '🎤', title: '冲突：一句话熄火', body: '你走到对面主力面前说了句什么。他的表情从愤怒变成错愕，最后被队友拉走。你的队友拍了拍你的肩膀：兄弟，够了。<br><br>效果：更衣室信任+1；争议+1；无禁赛。' };
        }},
        { label: '为队友出头', hint: '更衣室信任大涨；有小概率升级成板凳清空级斗殴', apply: function() {
          var r = Math.random();
          if (r < 0.22) {
            var injGames = 3 + Math.floor(Math.random() * 3);
            return { emoji: '🌪️', title: '冲突升级：奥本山时刻', body: '你冲上去推开对手，两边替补席瞬间清空。混战持续了四分钟，安保把你和队友拽开时，你发现自己的手指肿了。赛后联盟开出重罚：你被禁赛5场，另有多名队友被禁赛，对方也有球员被禁赛；你手指伤势要休战几天。<br><br>效果：禁赛5场；队友多人禁赛2-3场；对手多人禁赛2-3场；手指伤缺阵；球队化学-4；士气-3。', _consequence: 'suspension', _games: 5, _mods: { games: 8, chem: -4, morale: -3 }, _npcOuts: [ { team: 'self', games: (2 + Math.floor(Math.random() * 2)), penalty: 4, label: '队友多人禁赛' }, { team: 'opponent', games: (2 + Math.floor(Math.random() * 2)), penalty: 3.5, label: '对手多人禁赛' } ], _chain:{ key:'conflictChain', data:function(_ctx){ return { team:(_ctx && _ctx.game && _ctx.game.opponent) || '', step:'brawl', season:(STATE.career && STATE.career.seasonCount) || 0, pending:true }; } } };
          }
          addProfileDelta('lockerRoomTrust', 2);
          addProfileDelta('coachTrust', 2);
          var boost = { games: 5, chem: 2, morale: 1 };
          return { emoji: '🛡️', title: '冲突：挺身而出', body: '你挡在队友面前，和对方主力顶牛了几秒，然后被裁判拉开。赛后队友在更衣室站起来说：这赛季，我们为他拼命。教练什么都没说，只是拍了拍你的肩膀。<br><br>效果：更衣室信任+2；教练信任+2；球队化学+2、士气+1（未来5场）。', _mods: boost };
        }}
      ]
    };
  },
});

// ━━━ 新事件：梗 · 空砍群群主 ━━━
EVENT_REGISTRY.push({
  id: 'meme_empty_night',
  name: '空砍之夜',
  weight: 6,
  condition: (ctx) => {
    var r = ctx && ctx.result ? ctx.result : null;
    var s = ctx && ctx.stats ? ctx.stats : null;
    if (!r || r.won) return false;
    if (!s || (s.pts || 0) < 35) return false;
    return true;
  },
  execute: (ctx) => {
    return { emoji: '📉', title: '空砍之夜', body: '你打出了赛季最佳数据，但球队还是输了。赛后评论区全是同一条评论：“群主辛苦了。”你关掉手机，决定下赛季把群解散。', desc: '空砍群群主', _mods: { games: 2, morale: -1 }, _chain: { key: 'emptyNightChain', data: function() {
      var _flE = getChainFlags(); if (!_flE) return {};
      var _ec = _flE.emptyNightChain = _flE.emptyNightChain || { count: 0, stage: 'idle', season: 0 };
      _ec.count = (_ec.count || 0) + 1;
      _ec.season = (STATE.career && STATE.career.seasonCount) || 0;
      if (_ec.count >= 2 && _ec.stage === 'idle') _ec.stage = 'media_watch';
      if (_ec.count >= 3 && _ec.stage === 'media_watch') _ec.stage = 'coach_talk_ready';
      return {};
    } } };
  },
});

// ━━━ 新事件：梗 · 关键球打铁 ━━━
EVENT_REGISTRY.push({
  id: 'meme_clutch_brick',
  name: '关键球打铁',
  weight: 6,
  condition: (ctx) => {
    var r = ctx && ctx.result ? ctx.result : null;
    if (!r || r.won) return false;
    var s = ctx && ctx.stats ? ctx.stats : null;
    if (!s || (s.pts || 0) < 25) return false;
    var games = STATE.season && STATE.season.games ? STATE.season.games.length : 0;
    return games >= 20;
  },
  execute: (ctx) => {
    return { emoji: '🔔', title: '关键球打铁', body: '最后一攻，球在你手里。你运到罚球线，急停，出手——哐。哨响。赛后你把自己关在训练馆加练到深夜，助教说：他投到第三十个才回家。', desc: '关键球打铁', _mods: { games: 2, morale: -1 } };
  },
});

// ━━━ 新事件：梗 · 三节打卡 ━━━
EVENT_REGISTRY.push({
  id: 'meme_three_quarter',
  name: '三节打卡',
  weight: 5,
  condition: (ctx) => {
    var r = ctx && ctx.result ? ctx.result : null;
    if (!r || !r.won) return false;
    var s = ctx && ctx.stats ? ctx.stats : null;
    if (!s || (s.pts || 0) < 30) return false;
    return true;
  },
  execute: (ctx) => {
    return { emoji: '🧊', title: '三节打卡', body: '第四节你一直坐在替补席上，喝着佳得乐看对面挣扎。记者赛后问你：第四节是不是太轻松了？你说：是。', desc: '三节打卡下班' };
  },
});

// ━━━ 新事件：利拉德时刻（选项事件） ━━━
EVENT_REGISTRY.push({
  id: 'dame_time',
  name: '利拉德时刻',
  weight: 8,
  condition: (ctx) => {
    var r = ctx && ctx.result ? ctx.result : null;
    var g = ctx && ctx.game ? ctx.game : null;
    var s = ctx && ctx.stats ? ctx.stats : null;
    var a = (r && typeof r.scoreA === 'number') ? r.scoreA : (g ? g.scoreA : null);
    var b = (r && typeof r.scoreB === 'number') ? r.scoreB : (g ? g.scoreB : null);
    if (a == null || b == null) return false;
    if (Math.abs(a - b) > 5) return false;
    if (!s || (s.pts || 0) < 25) return false;
    return true;
  },
  execute: (ctx) => {
    return {
      emoji: '⌚',
      title: '利拉德时刻',
      body: '比赛最后三分钟，分差始终没有拉开。你一直在要球，也一直顶着防守出手。终场哨响，所有人都在问同一个问题：那个回合，该不该由你来打？',
      choices: [
        { label: '就是我，把球给我', hint: '命中：关键球+1；打铁：士气-1、媒体压力+1', apply: function() {
          if (Math.random() < 0.55) {
            addProfileDelta('mediaTrust', 1);
            return { emoji: '🔥', title: '利拉德时刻：一剑封喉', body: '你把比赛扛在肩上，关键回合手起刀落。赛后媒体把这场比赛剪成了你的个人集锦。<br><br>效果：关键球+1；媒体好感+1。', _attrDelta: { CLU: 1 } };
          }
          if (STATE.season && STATE.season.events) STATE.season.events.mediaPressure = Math.min(10, (STATE.season.events.mediaPressure || 0) + 1);
          return { emoji: '😤', title: '利拉德时刻：打铁', body: '你出手了，球砸在篮筐后沿弹出来。赛后更衣室很安静，有人说：下次传出去吧。你点点头，但心里知道，下一次你还是会投。<br><br>效果：士气-1（未来3场）；媒体压力+1。', _mods: { games: 3, morale: -1 } };
        }},
        { label: '把球交给队友', hint: '化学+、更衣室信任+', apply: function() {
          addProfileDelta('lockerRoomTrust', 1);
          return { emoji: '🤝', title: '利拉德时刻：信任', body: '关键回合你把球传了出去，队友完成终结。赛后他主动找你击掌：下一次，换我传给你。<br><br>效果：球队化学+1（未来5场）；更衣室信任+1。', _mods: { games: 5, chem: 1 } };
        }}
      ]
    };
  },
});

// ━━━ 新事件：三双诱惑（选项事件） ━━━
EVENT_REGISTRY.push({
  id: 'triple_double_temptation',
  name: '三双诱惑',
  weight: 7,
  condition: (ctx) => {
    var r = ctx && ctx.result ? ctx.result : null;
    var g = ctx && ctx.game ? ctx.game : null;
    var s = ctx && ctx.stats ? ctx.stats : null;
    if (!r || !r.won) return false;
    var a = (r && typeof r.scoreA === 'number') ? r.scoreA : (g ? g.scoreA : null);
    var b = (r && typeof r.scoreB === 'number') ? r.scoreB : (g ? g.scoreB : null);
    if (a == null || b == null || (a - b) < 10) return false;
    if (!s) return false;
    if ((s.pts || 0) < 10 || (s.reb || 0) < 8 || (s.ast || 0) < 8) return false;
    return true;
  },
  execute: (ctx) => {
    return {
      emoji: '🔢',
      title: '三双诱惑',
      body: '比分已经拉开，你只差两个篮板和两个助攻就能拿到三双。教练看过来：要不要下场休息？你的眼睛盯着技术台的数据屏。',
      choices: [
        { label: '留在场上，刷出三双', hint: '人气+、争议+、体能负担+；化学略降', apply: function() {
          addProfileDelta('fame', 1);
          addProfileDelta('controversy', 1);
          if (STATE.season && STATE.season.events) STATE.season.events.staminaLoad = Math.min(5, (STATE.season.events.staminaLoad || 0) + 1);
          return { emoji: '📊', title: '三双到手', body: '你多打了三分钟，把篮板和助攻补齐。赛后数据页亮起三双标志，评论区一半在吹你，一半在说：垃圾时间刷的。<br><br>效果：人气+1；争议+1；体能负担+1；球队化学-1（未来3场）。', _mods: { games: 3, chem: -1 } };
        }},
        { label: '主动下场，把时间留给队友', hint: '教练信任+、更衣室信任+', apply: function() {
          addProfileDelta('coachTrust', 1);
          addProfileDelta('lockerRoomTrust', 1);
          return { emoji: '🪑', title: '三双让给数据', body: '你走回替补席，把最后几分钟让给年轻队友。赛后教练在新闻发布会上主动提到你的选择。<br><br>效果：教练信任+1；更衣室信任+1；球队化学+1（未来5场）。', _mods: { games: 5, chem: 1 } };
        }}
      ]
    };
  },
});

// ━━━ 新事件：得分王冲刺（选项事件，仅常规赛） ━━━
EVENT_REGISTRY.push({
  id: 'scoring_title_sprint',
  name: '得分王冲刺',
  weight: 8,
  condition: (ctx) => {
    if (STATE.season && STATE.season.isPlayoffs) return false;
    var ps = STATE.season && STATE.season.playerStats;
    var played = (ps && ps.games) || 0;
    if (played < 58) return false;
    var totalGames = (STATE.season && STATE.season.schedule && STATE.season.schedule.length) || 82;
    if ((STATE.season.games || []).length < Math.round(totalGames * 0.85)) return false;
    var avgPts = ps.pts / played;
    if (avgPts < 26) return false;
    return true;
  },
  execute: (ctx) => {
    return {
      emoji: '💯',
      title: '得分王冲刺',
      body: '常规赛只剩最后十几场，你的场均得分正卡在得分王争夺线上。媒体开始算数：这赛季，你场均需要再拿多少分。',
      choices: [
        { label: '全力刷分，把得分王拿下', hint: '剩余赛程得分+8%；争议+、媒体好感-', apply: function() {
          if (STATE.season && STATE.season.events) STATE.season.events.scoringPush = { gamesLeft: 8, boost: 0.08 };
          addProfileDelta('controversy', 1);
          addProfileDelta('mediaTrust', -1);
          var _flSc = getChainFlags(); if (_flSc) _flSc.scoringRace = { season: (STATE.career && STATE.career.seasonCount) || 0, active: true, pending: true };
          return { emoji: '🏹', title: '得分王冲刺：火力全开', body: '最后几周你几乎包揽了每一次出手。有人骂你独，但数据榜上的名字开始往上爬。<br><br>效果：剩余赛程场均得分+8%；争议+1；媒体好感-1；球队化学-1（未来3场）。', _mods: { games: 3, chem: -1 } };
        }},
        { label: '团队优先，顺其自然', hint: '教练信任+、化学+', apply: function() {
          addProfileDelta('coachTrust', 1);
          return { emoji: '🎯', title: '得分王冲刺：顺其自然', body: '你没有改变打法，继续分享球。教练在更衣室里说：这样的球员，才能带队走得更远。<br><br>效果：教练信任+1；球队化学+1（未来5场）。', _mods: { games: 5, chem: 1 } };
        }}
      ]
    };
  },
});

// ━━━ 新事件：绝杀庆祝（选项事件） ━━━
EVENT_REGISTRY.push({
  id: 'game_winner_celebration',
  name: '绝杀庆祝',
  weight: 8,
  condition: (ctx) => {
    var r = ctx && ctx.result ? ctx.result : null;
    var g = ctx && ctx.game ? ctx.game : null;
    var s = ctx && ctx.stats ? ctx.stats : null;
    if (!r || !r.won) return false;
    var a = (r && typeof r.scoreA === 'number') ? r.scoreA : (g ? g.scoreA : null);
    var b = (r && typeof r.scoreB === 'number') ? r.scoreB : (g ? g.scoreB : null);
    if (a == null || b == null || (a - b) > 3) return false;
    if (!s || (s.pts || 0) < 25) return false;
    return true;
  },
  execute: (ctx) => {
    return {
      emoji: '📣',
      title: '绝杀庆祝',
      body: '终场前你的投篮命中，比分定格。全场沸腾，队友朝你冲过来。你也想冲上看台——但联盟办公室的罚款单是真实存在的。',
      choices: [
        { label: '激情庆祝，这是我们的主场', hint: '士气+、人气+；小概率技术犯规/禁赛', apply: function() {
          addProfileDelta('fame', 1);
          if (Math.random() < 0.25) {
            return { emoji: '🚨', title: '庆祝过火', body: '你冲上看台和球迷撞胸，又跳上技术台。裁判吹了技术犯规，赛后联盟追加禁赛1场。更衣室没人庆祝——除了你的数据页。<br><br>效果：禁赛1场；球队化学-1、士气-1（未来4场）。', _consequence: 'suspension', _games: 1, _mods: { games: 4, chem: -1, morale: -1 } };
          }
          return { emoji: '🔥', title: '绝杀庆祝', body: '你捶胸、怒吼、和每个队友撞肩。主场大屏反复回放你的绝杀，下一场比赛的球票一小时内售罄。<br><br>效果：人气+1；士气+2（未来3场）。', _mods: { games: 3, morale: 2 } };
        }},
        { label: '低调离场，像赢过很多次一样', hint: '媒体好感+', apply: function() {
          addProfileDelta('mediaTrust', 1);
          return { emoji: '🤐', title: '绝杀后的沉默', body: '你只是握了握拳，转身走回更衣室。记者追上来，你说：下一场见。这个画面第二天出现在所有报纸上。<br><br>效果：媒体好感+1。' };
        }}
      ]
    };
  },
});

// ━━━ 新事件：流感之战（选项事件，仅季后赛） ━━━
EVENT_REGISTRY.push({
  id: 'flu_game',
  name: '流感之战',
  weight: 10,
  condition: (ctx) => {
    if (!STATE.season || !STATE.season.isPlayoffs) return false;
    return true;
  },
  execute: (ctx) => {
    var r = ctx && ctx.result ? ctx.result : null;
    var won = !!(r && r.won);
    var body = won
      ? '赛前你烧到38度，队医建议你休息。你灌了两瓶葡萄糖就上了场——第四节你几乎站不稳，但比赛赢了。'
      : '赛前你烧到38度，队医建议你休息。你灌了两瓶葡萄糖就上了场——你打完整场，球队还是输了。';
    return {
      emoji: '🤒',
      title: '流感之战',
      body: body,
      choices: [
        { label: '赛后把故事讲出去', hint: won ? '媒体好感+、人气+；体能负担+' : '媒体好感+、人气+；媒体压力+', apply: function() {
          addProfileDelta('mediaTrust', won ? 2 : 1);
          addProfileDelta('fame', 2);
          if (STATE.season && STATE.season.events) STATE.season.events.staminaLoad = Math.min(5, (STATE.season.events.staminaLoad || 0) + 1);
          if (!won && STATE.season && STATE.season.events) STATE.season.events.mediaPressure = Math.min(10, (STATE.season.events.mediaPressure || 0) + 1);
          var _flF = getChainFlags(); if (_flF) _flF.fluChain = { season: (STATE.career && STATE.career.seasonCount) || 0, told: true, pending: true, gameNum: (STATE.season && STATE.season.games) ? STATE.season.games.length : 0 };
          return { emoji: '🏆', title: won ? '流感之战：传奇' : '流感之战：悲壮', body: won ? '故事很快传遍联盟：带病作战，拿下关键胜利。你的名字和“流感之战”一起上了头条。<br><br>效果：媒体好感+2；人气+2；体能负担+1。' : '你没有提发烧的事，但赛后照片里你嘴唇发白。记者挖出队医的记录，舆论分成两派：硬汉，还是鲁莽？<br><br>效果：媒体好感+1；人气+2；媒体压力+1；体能负担+1。' };
        }},
        { label: '轻描淡写，不卖惨', hint: '媒体好感+', apply: function() {
          addProfileDelta('mediaTrust', 1);
          var _flF2 = getChainFlags(); if (_flF2) _flF2.fluChain = { season: (STATE.career && STATE.career.seasonCount) || 0, told: false, pending: false };
          return { emoji: '🤫', title: '流感之战：轻描淡写', body: '赛后记者问你状态怎么样，你说：有点感冒，小事。没有渲染，没有剧本。<br><br>效果：媒体好感+1。' };
        }}
      ]
    };
  },
});

// ━━━ 连锁事件：冲突再遇（奥本山/板凳清空后，面对同一对手） ━━━
EVENT_REGISTRY.push({
  id: 'chain_conflict_rematch',
  name: '冲突后续：再遇',
  weight: 20,
  condition: (ctx) => {
    var _fl = STATE.career && STATE.career.flags;
    var cc = _fl && _fl.conflictChain;
    if (!cc || cc.pending !== true || cc.step !== 'brawl') return false;
    if (!STATE.season || STATE.season.isPlayoffs) return false;
    var opp = ctx && ctx.game && ctx.game.opponent;
    return !!opp && opp === cc.team;
  },
  execute: (ctx) => {
    var opp = ctx && ctx.game && ctx.game.opponent;
    var teamName = ((typeof getTeamName === 'function') ? getTeamName(opp) : opp) || opp;
    return {
      emoji: '⚔️',
      title: '冲突后续：再遇',
      body: '你们又一次和' + teamName + '相遇。上一次的混战还历历在目，对方球员在赛前热身时一直盯着你这边。裁判组今天特意安排了三位资深裁判。',
      choices: [
        { label: '强势对抗，报上次的仇', hint: '士气+、争议+；小概率再次冲突', apply: function() {
          var _flA = getChainFlags();
          if (_flA && _flA.conflictChain) { _flA.conflictChain.pending = false; _flA.conflictChain.step = 'grudge'; }
          addProfileDelta('controversy', 1);
          if (0.3 > Math.random()) {
            return { emoji: '💥', title: '再遇：旧怨复燃', body: '比赛没打三分钟，你和对方主力就顶在一起。裁判分开你们时，全场都在嘘。赛后联盟开出罚单，你被追加警告一次。\n\n效果：士气+2（未来3场）；争议+2；再犯警告+1。', _mods: { games: 3, morale: 2 } };
          }
          return { emoji: '🔥', title: '再遇：你赢了气势', body: '那场比赛你打得很凶，每一个防守回合都贴在对方主力身上。赛后他没有再看你，你赢了气势，也赢了比赛。\n\n效果：士气+2（未来3场）；争议+1。', _mods: { games: 3, morale: 2 } };
        }},
        { label: '场上和解，一码归一码', hint: '化学+、媒体好感+；旧怨翻篇', apply: function() {
          var _flB = getChainFlags();
          if (_flB && _flB.conflictChain) { _flB.conflictChain.pending = false; _flB.conflictChain.step = 'done'; }
          addProfileDelta('mediaTrust', 1);
          return { emoji: '🤝', title: '再遇：翻篇', body: '赛前你和对方主力握手时多停留了一秒。那场比赛双方都打得很干净，赛后他主动过来碰拳。\n\n效果：媒体好感+1；球队化学+1（未来5场）。', _mods: { games: 5, chem: 1 } };
        }},
        { label: '保持距离，专注比赛', hint: '教练信任+', apply: function() {
          var _flC = getChainFlags();
          if (_flC && _flC.conflictChain) { _flC.conflictChain.pending = false; _flC.conflictChain.step = 'done'; }
          addProfileDelta('coachTrust', 1);
          return { emoji: '🧊', title: '再遇：公事公办', body: '你没有回应任何挑衅，全场比赛只做自己的事。赛后教练说：这才是职业球员该有的样子。\n\n效果：教练信任+1。' };
        }}
      ]
    };
  },
});

// ━━━ 连锁事件：季后赛旧怨（冲突未和解且季后赛再遇） ━━━
EVENT_REGISTRY.push({
  id: 'chain_conflict_playoff',
  name: '季后赛：旧怨',
  weight: 24,
  condition: (ctx) => {
    var _fl = STATE.career && STATE.career.flags;
    var cc = _fl && _fl.conflictChain;
    if (!cc || cc.step !== 'grudge') return false;
    if (!STATE.season || !STATE.season.isPlayoffs) return false;
    var opp = ctx && ctx.game && ctx.game.opponent;
    return !!opp && opp === cc.team;
  },
  execute: (ctx) => {
    var won = !!(ctx && ctx.result && ctx.result.won);
    var opp = ctx && ctx.game && ctx.game.opponent;
    var teamName = ((typeof getTeamName === 'function') ? getTeamName(opp) : opp) || opp;
    return {
      emoji: '🌩️',
      title: '季后赛：旧怨',
      body: '季后赛把一切恩怨放大。你又一次站上' + teamName + '的对面，上一段冲突留下的火药味还没散。媒体把这轮系列赛命名为“宿怨对决”。',
      choices: [
        { label: '用胜利终结恩怨', hint: '赢下比赛则写入生涯里程碑', apply: function() {
          var _flP = getChainFlags();
          if (_flP && _flP.conflictChain) { _flP.conflictChain.pending = false; _flP.conflictChain.step = 'settled'; }
          addProfileDelta('mediaTrust', 1);
          if (won) recordChainMilestone('季后赛宿怨对决：用胜利终结恩怨', '用胜利终结恩怨', '季后赛里你亲手淘汰了那个和你结下梁子的对手。赛后他走过球员通道，没有回头。你的名字被写进了这轮系列赛的叙事里。');
          return { emoji: '🏁', title: won ? '旧怨：胜负已分' : '旧怨：你输了这一回合', body: won ? '你赢了。赛后他没有和你握手，但你不需要他点头。这轮系列赛之后，恩怨翻篇。\n\n效果：媒体好感+1；士气+2（未来3场）。' : '你输了这一回合，但系列赛还没结束。更衣室里没人提恩怨，所有人都在想下一场怎么打。\n\n效果：媒体好感+1；媒体压力+1。', _mods: won ? { games: 3, morale: 2 } : { games: 3, morale: -1 } };
        }},
        { label: '专注系列赛，不谈恩怨', hint: '教练信任+、更衣室更稳', apply: function() {
          var _flQ = getChainFlags();
          if (_flQ && _flQ.conflictChain) { _flQ.conflictChain.pending = false; _flQ.conflictChain.step = 'settled'; }
          addProfileDelta('coachTrust', 1);
          addProfileDelta('lockerRoomTrust', 1);
          return { emoji: '🎯', title: '旧怨：公事公办', body: '你没有给媒体任何谈资。系列赛的每一分钟你都在做正确的事，队友说：他就是为这种舞台生的。\n\n效果：教练信任+1；更衣室信任+1。' };
        }}
      ]
    };
  },
});

// ━━━ 连锁事件：旧东家媒体追问（放狠话后） ━━━
EVENT_REGISTRY.push({
  id: 'chain_reunion_media',
  name: '旧东家：媒体追问',
  weight: 16,
  condition: (ctx) => {
    var _fl = STATE.career && STATE.career.flags;
    var rc = _fl && _fl.reunionChain;
    if (!rc || rc.pending !== true) return false;
    if (rc.attitude !== 'trash') return false;
    if (!STATE.season || STATE.season.isPlayoffs) return false;
    var games = (STATE.season.games || []).length;
    if (games < 30) return false;
    return true;
  },
  execute: (ctx) => {
    return {
      emoji: '🎙️',
      title: '旧东家：媒体追问',
      body: '全明星周末前，记者把话筒递到你面前：你上次说“离开不是我的损失”，现在两队又要碰面了，你后悔吗？镜头后面，那个城市的所有媒体都在等你的答案。',
      choices: [
        { label: '坚持态度，球场见分晓', hint: '争议+；下次交锋火药味更浓', apply: function() {
          var _flA = getChainFlags();
          if (_flA && _flA.reunionChain) { _flA.reunionChain.attitude = 'trash_escalated'; _flA.reunionChain.pending = false; }
          addProfileDelta('controversy', 1);
          addProfileDelta('fame', 1);
          return { emoji: '🗣️', title: '追问：态度不变', body: '你看着镜头：我为什么要后悔？球场会替我把话说完。这段采访当晚播放量破百万。\n\n效果：争议+1；人气+1。' };
        }},
        { label: '话锋一转，淡化处理', hint: '媒体好感+', apply: function() {
          var _flB = getChainFlags();
          if (_flB && _flB.reunionChain) { _flB.reunionChain.attitude = 'cooled'; _flB.reunionChain.pending = false; }
          addProfileDelta('mediaTrust', 1);
          return { emoji: '😌', title: '追问：点到为止', body: '你笑了笑：那时候年轻，现在只想打球。记者没再追问，第二天头条变成了“他长大了”。\n\n效果：媒体好感+1。' };
        }}
      ]
    };
  },
});

// ━━━ 连锁事件：季后赛回归战（对旧东家） ━━━
EVENT_REGISTRY.push({
  id: 'chain_reunion_playoff',
  name: '季后赛：回归战',
  weight: 22,
  condition: (ctx) => {
    var _fl = STATE.career && STATE.career.flags;
    var rc = _fl && _fl.reunionChain;
    if (!rc || rc.pending !== false) return false;
    if (rc.attitude !== 'trash' && rc.attitude !== 'trash_escalated') return false;
    if (!STATE.season || !STATE.season.isPlayoffs) return false;
    var opp = ctx && ctx.game && ctx.game.opponent;
    return !!opp && opp === rc.team && !rc.playoffDone;
  },
  execute: (ctx) => {
    var won = !!(ctx && ctx.result && ctx.result.won);
    var opp = ctx && ctx.game && ctx.game.opponent;
    var teamName = ((typeof getTeamName === 'function') ? getTeamName(opp) : opp) || opp;
    return {
      emoji: '🏟️',
      title: '季后赛：回归战',
      body: '季后赛的抽签把' + teamName + '送到了你面前。这座城市曾以嘘声送你离开，现在全队都在看：你会怎么回应。',
      choices: [
        { label: '把这里当成主场来打', hint: won ? '写入生涯里程碑' : '输球则舆论压力上升', apply: function() {
          var _flA = getChainFlags();
          if (_flA && _flA.reunionChain) _flA.reunionChain.playoffDone = true;
          addProfileDelta('controversy', 1);
          if (won) recordChainMilestone('季后赛回归战：反客为主', '把这里当成主场来打', '季后赛回到旧主主场，你打出了生涯代表作之一。那座城市的嘘声在终场前变成了沉默，你的名字被他们讨论了整整一个夏天。');
          return { emoji: won ? '👑' : '😔', title: won ? '回归战：反客为主' : '回归战：失手', body: won ? '你赢了，而且赢得漂亮。赛后你只是朝客队更衣室方向点了点头。那座球馆的嘘声，终场前变成了沉默。\n\n效果：争议+1；士气+2（未来3场）。' : '你打得很努力，但那一晚手感不属于你。赛后网上的评论一半在嘲讽，一半在说：这才是他想离开的原因？\n\n效果：争议+1；媒体压力+1。', _mods: won ? { games: 3, morale: 2 } : { games: 3, morale: -1 } };
        }},
        { label: '平常心，只当一场普通季后赛', hint: '媒体好感+、更衣室稳定', apply: function() {
          var _flB = getChainFlags();
          if (_flB && _flB.reunionChain) _flB.reunionChain.playoffDone = true;
          addProfileDelta('mediaTrust', 1);
          return { emoji: '🧊', title: '回归战：平常心', body: '你拒绝把这场比赛特殊化。赛后记者问你有何感想，你说：就是一场季后赛，我每一场都这么打。\n\n效果：媒体好感+1；更衣室信任+1。' };
        }}
      ]
    };
  },
});

// ━━━ 连锁事件：空砍媒体炒作（第二次空砍后） ━━━
EVENT_REGISTRY.push({
  id: 'chain_empty_media',
  name: '空砍：舆论发酵',
  weight: 18,
  condition: (ctx) => {
    var _fl = STATE.career && STATE.career.flags;
    var ec = _fl && _fl.emptyNightChain;
    if (!ec || ec.stage !== 'media_watch') return false;
    if (!STATE.season || STATE.season.isPlayoffs) return false;
    return (STATE.season.games || []).length >= 20;
  },
  execute: (ctx) => {
    return {
      emoji: '📰',
      title: '空砍：舆论发酵',
      body: '“数据刷子”这个词第一次出现在关于你的标题里。评论区吵成一片：有人说你是在为数据打球，有人说球队配不上你。训练馆的电视上循环播着你的空砍集锦。',
      choices: [
        { label: '公开反驳，数据就是实力', hint: '争议+；媒体好感-', apply: function() {
          var _flA = getChainFlags();
          if (_flA && _flA.emptyNightChain) _flA.emptyNightChain.stage = 'coach_talk_ready';
          addProfileDelta('controversy', 2);
          addProfileDelta('mediaTrust', -1);
          return { emoji: '🎤', title: '空砍：正面硬刚', body: '你在发布会上说：我拿这些分的时候，球队输了，这是事实；但我拿不到这些分的时候，球队更赢不了。这段发言被剪成了各种标题。\n\n效果：争议+2；媒体好感-1。' };
        }},
        { label: '沉默，用下一场说话', hint: '媒体压力+；更衣室信任+', apply: function() {
          var _flB = getChainFlags();
          if (_flB && _flB.emptyNightChain) _flB.emptyNightChain.stage = 'coach_talk_ready';
          if (STATE.season && STATE.season.events) STATE.season.events.mediaPressure = Math.min(10, (STATE.season.events.mediaPressure || 0) + 1);
          addProfileDelta('lockerRoomTrust', 1);
          return { emoji: '🤐', title: '空砍：沉默', body: '你没有回应任何质疑。第二天训练结束，队友拍了拍你的肩膀：别理那些评论。你点了点头，继续加练。\n\n效果：媒体压力+1；更衣室信任+1。' };
        }},
        { label: '自嘲一下，把梗接住', hint: '人气+；争议+', apply: function() {
          var _flC = getChainFlags();
          if (_flC && _flC.emptyNightChain) _flC.emptyNightChain.stage = 'coach_talk_ready';
          addProfileDelta('fame', 1);
          addProfileDelta('controversy', 1);
          return { emoji: '😂', title: '空砍：自嘲', body: '你在社交媒体上发了一条：群主本人，今晚准时营业。评论区的画风瞬间从骂战变成了玩梗。\n\n效果：人气+1；争议+1。' };
        }}
      ]
    };
  },
});

// ━━━ 连锁事件：空砍教练谈话（第三次空砍后） ━━━
EVENT_REGISTRY.push({
  id: 'chain_empty_coach',
  name: '空砍：教练谈话',
  weight: 20,
  condition: (ctx) => {
    var _fl = STATE.career && STATE.career.flags;
    var ec = _fl && _fl.emptyNightChain;
    if (!ec || ec.stage !== 'coach_talk_ready' || ec.talkDone) return false;
    if (!STATE.season || STATE.season.isPlayoffs) return false;
    return true;
  },
  execute: (ctx) => {
    return {
      emoji: '📋',
      title: '空砍：教练谈话',
      body: '教练把你叫进办公室，关上门。他指了指战术板：你的数据很好看，但我们连败了。他把笔放下来：现在，我要听你的答案。',
      choices: [
        { label: '继续打自己的，数据会说话', hint: '保持个人数据；化学下降', apply: function() {
          var _flA = getChainFlags();
          if (_flA && _flA.emptyNightChain) { _flA.emptyNightChain.stage = 'done'; _flA.emptyNightChain.talkDone = true; }
          addProfileDelta('controversy', 1);
          return { emoji: '💪', title: '谈话：我行我素', body: '你对教练说：数据不是终点，但我相信只要继续打，胜利会来。教练看了你很久：那就用比赛证明。\n\n效果：争议+1；球队化学-2（未来5场）。', _mods: { games: 5, chem: -2 } };
        }},
        { label: '调整打法，更多带动队友', hint: '化学+；个人得分预期略降', apply: function() {
          var _flB = getChainFlags();
          if (_flB && _flB.emptyNightChain) { _flB.emptyNightChain.stage = 'done'; _flB.emptyNightChain.talkDone = true; _flB.emptyNightChain.playmaker = true; }
          addProfileDelta('coachTrust', 1);
          return { emoji: '🔄', title: '谈话：改变打法', body: '你接受了建议：接下来几场你会更多地寻找队友，把球权重新分配给正确的人。教练点了点头：这才是我想听的。\n\n效果：教练信任+1；球队化学+2（未来5场）。', _mods: { games: 5, chem: 2 } };
        }}
      ]
    };
  },
});

// ━━━ 连锁事件：得分王收官之争（全力刷分后的最后两场） ━━━
EVENT_REGISTRY.push({
  id: 'chain_scoring_finale',
  name: '得分王：收官之争',
  weight: 22,
  condition: (ctx) => {
    var _fl = STATE.career && STATE.career.flags;
    var sr = _fl && _fl.scoringRace;
    if (!sr || sr.active !== true || sr.pending !== true) return false;
    if (!STATE.season || STATE.season.isPlayoffs) return false;
    var total = (STATE.season.schedule || []).length || 82;
    var played = (STATE.season.games || []).length;
    if (played > total - 2) return false;
    if (played < total - 6) return false;
    var ps = STATE.season.playerStats;
    if (!ps || !ps.games) return false;
    if (ps.pts / ps.games < 26) return false;
    return true;
  },
  execute: (ctx) => {
    return {
      emoji: '🏁',
      title: '得分王：收官之争',
      body: '常规赛还剩最后两场，你和得分榜第一名的差距只有零点几分。媒体已经把“得分王之争”定为本赛季常规赛最大悬念，最后一个比赛日，你们甚至可能同时开球。',
      choices: [
        { label: '收官战火力全开', hint: '最后2场得分+10%；争议+', apply: function() {
          var _flA = getChainFlags();
          if (_flA && _flA.scoringRace) _flA.scoringRace.pending = false;
          if (STATE.season && STATE.season.events) STATE.season.events.scoringPush = { gamesLeft: 2, boost: 0.10 };
          addProfileDelta('controversy', 1);
          return { emoji: '🚀', title: '收官：最后一搏', body: '最后两场，你几乎每一次出手都在为得分王而战。观众席上有人举着你的得分数据牌，解说员的声音都哑了。\n\n效果：最后2场得分+10%；争议+1；球队化学-1（未来3场）。', _mods: { games: 3, chem: -1 } };
        }},
        { label: '顺其自然，把胜负放第一', hint: '教练信任+', apply: function() {
          var _flB = getChainFlags();
          if (_flB && _flB.scoringRace) _flB.scoringRace.pending = false;
          addProfileDelta('coachTrust', 1);
          return { emoji: '🎯', title: '收官：顺其自然', body: '你没有为了数据改变比赛方式。最后一战该传的球照传，该投的球照投。教练在更衣室里说：数据会来的，赢球才是真的。\n\n效果：教练信任+1；球队化学+1（未来5场）。', _mods: { games: 5, chem: 1 } };
        }}
      ]
    };
  },
});

// ━━━ 连锁事件：流感复发（季后赛带病作战后） ━━━
EVENT_REGISTRY.push({
  id: 'chain_flu_relapse',
  name: '流感：复发',
  weight: 18,
  condition: (ctx) => {
    var _fl = STATE.career && STATE.career.flags;
    var fc = _fl && _fl.fluChain;
    if (!fc || fc.told !== true || fc.pending !== true) return false;
    if (!STATE.season || !STATE.season.isPlayoffs) return false;
    if (fc.season !== ((STATE.career && STATE.career.seasonCount) || 0)) return false;
    var games = (STATE.season.games || []).length;
    if (games - (fc.gameNum || 0) < 3) return false;
    return true;
  },
  execute: (ctx) => {
    var won = !!(ctx && ctx.result && ctx.result.won);
    return {
      emoji: '🤧',
      title: '流感：复发',
      body: won ? '这场你赢了，但回到更衣室后你又开始咳嗽。队医皱着眉：上次就该休息。他指了指体温计：38.5度。' : '赛后你瘫在更衣室的椅子上，烧没有退，反而更高了。队医说：再这样下去，系列赛你可能会报销。',
      choices: [
        { label: '继续硬扛，系列赛不能少我', hint: won ? '媒体好感+；伤病风险+' : '媒体好感+；伤病风险+', apply: function() {
          var _flA = getChainFlags();
          if (_flA && _flA.fluChain) { _flA.fluChain.pending = false; }
          addProfileDelta('mediaTrust', 1);
          if (STATE.season && STATE.season.events) STATE.season.events.staminaLoad = Math.min(5, (STATE.season.events.staminaLoad || 0) + 1);
          return { emoji: '🔥', title: won ? '流感：死战不退' : '流感：悲壮', body: won ? '你打完针，第二天继续首发。系列赛还没结束，你告诉自己：等赢下再病。\n\n效果：媒体好感+1；体能负担+1。' : '你坚持出战，比赛输了，赛后你几乎站不稳。舆论一半夸你硬，一半骂你不负责任。\n\n效果：媒体好感+1；体能负担+1；媒体压力+1。' };
        }},
        { label: '接受队医建议，休息一场', hint: '健康优先；媒体好感略降', apply: function() {
          var _flB = getChainFlags();
          if (_flB && _flB.fluChain) { _flB.fluChain.pending = false; }
          addProfileDelta('mediaTrust', -1);
          if (STATE.season && STATE.season.events) STATE.season.events.staminaLoad = Math.max(0, (STATE.season.events.staminaLoad || 0) - 1);
          return { emoji: '🛌', title: '流感：休息', body: '你缺席了下一场。队医说这是正确决定，你看着更衣室里的球衣，第一次觉得“正确”这个词这么难听。\n\n效果：媒体好感-1；体能负担-1。' };
        }}
      ]
    };
  },
});

// ━━━ 连锁事件：禁赛复出首战 ━━━
EVENT_REGISTRY.push({
  id: 'chain_susp_return',
  name: '禁赛：复出首战',
  weight: 20,
  condition: (ctx) => {
    var _fl = STATE.career && STATE.career.flags;
    var sc = _fl && _fl.suspChain;
    if (!sc || sc.returnPending !== true) return false;
    // ★ 修复：禁赛必须发生在当季，避免上赛季被禁赛、下赛季才出现“复出”事件
    var _curS = (STATE.career && STATE.career.seasonCount) || 0;
    if ((sc.season || 0) !== _curS) return false;
    var ev = STATE.season && STATE.season.events;
    if (!ev || ev.suspensionGamesLeft > 0) return false;
    if (STATE.season && STATE.season.isPlayoffs) return false;
    return true;
  },
  execute: (ctx) => {
    var won = !!(ctx && ctx.result && ctx.result.won);
    var _flR = getChainFlags();
    if (_flR && _flR.suspChain) _flR.suspChain.returnPending = false;
    if (won) {
      addProfileDelta('mediaTrust', 1);
      return { emoji: '💥', title: '复出：王者归来', body: '禁赛结束后你回到球场，第一场比赛就打出爆炸表现。解说员用了三次“他回来了”。赛后更衣室的广播里，全场都在喊你的名字。\n\n效果：媒体好感+1；士气+2（未来3场）。', _mods: { games: 3, morale: 2 } };
    }
    if (STATE.season && STATE.season.events) STATE.season.events.mediaPressure = Math.min(10, (STATE.season.events.mediaPressure || 0) + 1);
    return { emoji: '🐢', title: '复出：慢热', body: '禁赛让比赛感觉有点陌生，你复出首战打得挣扎，赛后媒体开始讨论：他是不是被禁赛影响了状态？你没有回应，只是加练到深夜。\n\n效果：媒体压力+1；士气-1（未来3场）。', _mods: { games: 3, morale: -1 } };
  },
});

// ━━━ 连锁事件：禁赛再犯警告（单季第二次禁赛后） ━━━
EVENT_REGISTRY.push({
  id: 'chain_susp_warning',
  name: '联盟：警告',
  weight: 18,
  condition: (ctx) => {
    var _fl = STATE.career && STATE.career.flags;
    var sc = _fl && _fl.suspChain;
    if (!sc || sc.count < 2 || sc.warningGiven) return false;
    if (((sc.season || 0) !== ((STATE.career && STATE.career.seasonCount) || 0))) return false;
    if (!STATE.season || STATE.season.isPlayoffs) return false;
    return true;
  },
  execute: (ctx) => {
    return {
      emoji: '⚠️',
      title: '联盟：警告',
      body: '联盟办公室的正式信函送到了球队。这是你本赛季第二次被禁赛，信里用很客气的措辞提醒你：再犯，季后赛也不会被宽容。',
      choices: [
        { label: '收敛行为，专注篮球', hint: '媒体好感+；避免后续风险', apply: function() {
          var _flA = getChainFlags();
          if (_flA && _flA.suspChain) { _flA.suspChain.warningGiven = true; _flA.suspChain.playoffRisk = false; }
          addProfileDelta('mediaTrust', 1);
          return { emoji: '😇', title: '警告：收敛', body: '你把信折好收进柜子。接下来的比赛你打得干净利落，裁判看到你都点了点头。\n\n效果：媒体好感+1；未来再犯风险降低。' };
        }},
        { label: '不服，继续按自己的方式打球', hint: '争议+；若季后赛再犯将面临重罚', apply: function() {
          var _flB = getChainFlags();
          if (_flB && _flB.suspChain) { _flB.suspChain.warningGiven = true; _flB.suspChain.playoffRisk = true; }
          addProfileDelta('controversy', 1);
          return { emoji: '😤', title: '警告：我行我素', body: '你把信丢进垃圾桶，训练照常。媒体拍到你把信扔掉的瞬间，评论区炸了：有人叫好，有人说你不尊重联盟。\n\n效果：争议+1；季后赛再犯将面临重罚。' };
        }}
      ]
    };
  },
});

// ━━━ 连锁事件：重伤恢复期抉择（赛季报销后的新赛季初） ━━━
EVENT_REGISTRY.push({
  id: 'chain_injury_rehab',
  name: '伤病：恢复期抉择',
  weight: 20,
  condition: (ctx) => {
    var _fl = STATE.career && STATE.career.flags;
    var ic = _fl && _fl.injuryChain;
    if (!ic || ic.stage !== 'rehab' || ic.pending !== true) return false;
    if (!STATE.season || STATE.season.isPlayoffs) return false;
    var curSeason = (STATE.career && STATE.career.seasonCount) || 0;
    if (curSeason <= ic.season) return false;
    var games = (STATE.season.games || []).length;
    return games >= 3 && games <= 12;
  },
  execute: (ctx) => {
    return {
      emoji: '🏥',
      title: '伤病：恢复期抉择',
      body: '新赛季开始前，你的康复报告已经归档。队医给了你两个方案：提前加入对抗训练，或者按原计划慢养。训练馆的灯每天亮到很晚，你站在两个方案之间。',
      choices: [
        { label: '提前加练，抢回失去的时间', hint: '复出有概率爆发；也有再伤风险', apply: function() {
          var _flA = getChainFlags();
          if (_flA && _flA.injuryChain) { _flA.injuryChain.stage = 'return_ready'; _flA.injuryChain.choice = 'aggressive'; }
          addProfileDelta('controversy', 1);
          return { emoji: '💪', title: '恢复：提前加练', body: '你提前两周开始对抗训练。复健师拦不住你，只能在旁边盯紧每一次落地。你比计划更早站上球场——代价是你的身体会告诉你。\n\n效果：争议+1；复出可能爆发，也可能再伤。' };
        }},
        { label: '按计划康复，把伤养透', hint: '复出状态稳定；恢复期更长', apply: function() {
          var _flB = getChainFlags();
          if (_flB && _flB.injuryChain) { _flB.injuryChain.stage = 'return_ready'; _flB.injuryChain.choice = 'conservative'; }
          addProfileDelta('coachTrust', 1);
          return { emoji: '🩹', title: '恢复：按计划', body: '你耐心地走完每一阶段。队医在报告上签了“完全康复”，你踏上球场那天，状态比想象中更稳。\n\n效果：教练信任+1；复出状态稳定。' };
        }}
      ]
    };
  },
});

// ━━━ 连锁事件：重伤复出首战 ━━━
EVENT_REGISTRY.push({
  id: 'chain_injury_return',
  name: '伤病：复出首战',
  weight: 22,
  condition: (ctx) => {
    var _fl = STATE.career && STATE.career.flags;
    var ic = _fl && _fl.injuryChain;
    if (!ic || ic.stage !== 'return_ready' || ic.returned) return false;
    if (!STATE.season || STATE.season.isPlayoffs) return false;
    var games = (STATE.season.games || []).length;
    return games >= 8;
  },
  execute: (ctx) => {
    var won = !!(ctx && ctx.result && ctx.result.won);
    var _flR = getChainFlags();
    if (_flR && _flR.injuryChain) _flR.injuryChain.returned = true;
    if (_flR && _flR.injuryChain && _flR.injuryChain.choice === 'aggressive') {
      if (0.5 > Math.random()) {
        addProfileDelta('fame', 2);
        addProfileDelta('mediaTrust', 1);
        return { emoji: '🦅', title: '复出：王者归来', body: won ? '复出首战，你打出了久违的统治级表现。解说员说：他好像比受伤前更强了。赛后更衣室里，队友把比赛用球塞到你怀里。\n\n效果：人气+2；媒体好感+1。' : '复出首战你手感火热，但球队输球了。你走进更衣室时没有低头，你知道自己已经回来了。\n\n效果：人气+2；媒体好感+1。' };
      }
      if (STATE.season && STATE.season.events) STATE.season.events.mediaPressure = Math.min(10, (STATE.season.events.mediaPressure || 0) + 1);
      return { emoji: '⚠️', title: '复出：身体报警', body: '复出首战你打了38分钟，第四节感觉大腿内侧一阵紧绷。队医赛后检查后说：只是疲劳，但这是个信号。你扶着墙走出球馆，心里清楚：那次提前加练，欠下的债开始还了。\n\n效果：媒体压力+1；伤病风险上升。' };
    }
    addProfileDelta('coachTrust', 1);
    addProfileDelta('mediaTrust', 1);
    return { emoji: '🧭', title: '复出：稳稳归来', body: '复出首战你没有追求数据，把每一分钟都打得很稳。教练赛后说：欢迎回来。这句话，你等了很久。\n\n效果：教练信任+1；媒体好感+1；士气+1（未来3场）。', _mods: { games: 3, morale: 1 } };
  },
});

// ━━━ 连锁事件：巨星联手后·磨合（加盟招募球队后） ━━━
EVENT_REGISTRY.push({
  id: 'chain_kd_chemistry',
  name: '联手：磨合',
  weight: 18,
  condition: (ctx) => {
    var _fl = STATE.career && STATE.career.flags;
    if (!_fl || _fl.kdChemistryDone) return false;
    var target = _fl.superstarRecruitTargetTeam;
    if (!target || STATE.careerTeam !== target) return false;
    if (_fl.superstarRecruitInterest !== 'serious') return false;
    if (!STATE.season || STATE.season.isPlayoffs) return false;
    return (STATE.season.games || []).length >= 15;
  },
  execute: (ctx) => {
    return {
      emoji: '🤝',
      title: '联手：磨合',
      body: '赛季打了一个月，你和那位招募你的搭档之间的配合还没有形成默契。媒体开始拿你们的出手数做文章，更衣室里也出现了两种声音：球权到底该偏向谁？',
      choices: [
        { label: '主动让出部分球权，先建立信任', hint: '化学+；个人数据预期略降', apply: function() {
          var _flA = getChainFlags();
          if (_flA) _flA.kdChemistryDone = true;
          addProfileDelta('lockerRoomTrust', 1);
          return { emoji: '🔄', title: '联手：先信任', body: '你主动减少了持球，把更多回合让给他。最初几场你的数据下降了，但球队开始赢球，更衣室的气氛也变了。\n\n效果：更衣室信任+1；球队化学+2（未来5场）。', _mods: { games: 5, chem: 2 } };
        }},
        { label: '按自己的节奏打，他该适应我', hint: '个人数据稳定；化学略降', apply: function() {
          var _flB = getChainFlags();
          if (_flB) _flB.kdChemistryDone = true;
          addProfileDelta('controversy', 1);
          return { emoji: '🎯', title: '联手：各打各的', body: '你没有改变打法。数据依然漂亮，但两人同时在场时，进攻经常陷入单打。解说员开始用“双核未通电”形容这支球队。\n\n效果：争议+1；球队化学-2（未来5场）。', _mods: { games: 5, chem: -2 } };
        }}
      ]
    };
  },
});

// ━━━ 连锁事件：巨星联手后·季后赛正名 ━━━
EVENT_REGISTRY.push({
  id: 'chain_kd_playoff',
  name: '联手：季后赛正名',
  weight: 24,
  condition: (ctx) => {
    var _fl = STATE.career && STATE.career.flags;
    if (!_fl || _fl.kdPlayoffDone) return false;
    var target = _fl.superstarRecruitTargetTeam;
    if (!target || STATE.careerTeam !== target) return false;
    if (_fl.superstarRecruitInterest !== 'serious') return false;
    if (!STATE.season || !STATE.season.isPlayoffs) return false;
    return true;
  },
  execute: (ctx) => {
    var won = !!(ctx && ctx.result && ctx.result.won);
    return {
      emoji: '🏆',
      title: '联手：季后赛正名',
      body: '季后赛来了。所有人都在等着看：你和那位招募你的搭档，到底能不能一起赢球。赛前更衣室里，他看了你一眼：准备好了吗？',
      choices: [
        { label: '让比赛说话，一起赢下这轮', hint: '赢下本轮则写入生涯里程碑', apply: function() {
          var _flA = getChainFlags();
          if (_flA) _flA.kdPlayoffDone = true;
          if (won) recordChainMilestone('巨星联手：季后赛正名', '让比赛说话，一起赢下这轮', '季后赛里，你和招募你的巨星搭档打出真正的默契，赢下了关键系列赛。质疑声变成了欢呼声，这笔“联手”被写进了那一年季后赛的叙事。');
          return { emoji: won ? '🤜🤛' : '😤', title: won ? '联手：胜利宣言' : '联手：出师不利', body: won ? '你们赢了。赛后他主动和你撞拳，更衣室里第一次有人喊出“我们要夺冠”。\n\n效果：士气+2（未来3场）；媒体好感+1。' : '你们输了这一场，但系列赛没有结束。他在更衣室说：下一场，我跟着你打。\n\n效果：士气-1（未来3场）；媒体压力+1。', _mods: won ? { games: 3, morale: 2 } : { games: 3, morale: -1 } };
        }},
        { label: '把球权交给他，我来做防守苦工', hint: '更衣室信任+；舆论压力下降', apply: function() {
          var _flB = getChainFlags();
          if (_flB) _flB.kdPlayoffDone = true;
          addProfileDelta('lockerRoomTrust', 1);
          addProfileDelta('mediaTrust', 1);
          return { emoji: '🛡️', title: '联手：甘当绿叶', body: '这轮系列赛你主动承担起防守任务，把球权让给他。媒体开始重新评价这笔联手：不是争球权，是在争冠军。\n\n效果：更衣室信任+1；媒体好感+1。' };
        }}
      ]
    };
  },
});

// ━━━ 连锁事件：留守补强·承诺兑现检测（留守母队后的赛季中） ━━━
EVENT_REGISTRY.push({
  id: 'chain_fa_promise',
  name: '留守：补强兑现',
  weight: 18,
  condition: (ctx) => {
    var _fl = STATE.career && STATE.career.flags;
    if (!_fl || !_fl.faPromise || _fl.faPromise.done) return false;
    if (!STATE.season || STATE.season.isPlayoffs) return false;
    return (STATE.season.games || []).length >= 30;
  },
  execute: (ctx) => {
    var st = STATE.season && STATE.season.standings && STATE.season.standings[STATE.careerTeam];
    var wins = st ? (st.wins || 0) : 0;
    var losses = st ? (st.losses || 0) : 0;
    var pct = (wins + losses) > 0 ? wins / (wins + losses) : 0.5;
    var _flP = getChainFlags();
    if (_flP && _flP.faPromise) _flP.faPromise.done = true;
    if (pct >= 0.55) {
      addProfileDelta('loyalty', 2);
      addProfileDelta('mediaTrust', 1);
      return { emoji: '📈', title: '留守：管理层兑现承诺', body: '赛季过半，球队的战绩比上赛季明显提升，管理层也确实在交易截止日前做了补强。你看着更衣室里那些新面孔，想起了那句“把阵容修好，我留在这里打到底”。\n\n效果：忠诚+2；媒体好感+1。' };
    }
    addProfileDelta('loyalty', -1);
    addProfileDelta('lockerRoomTrust', -1);
    if (STATE.season && STATE.season.events) STATE.season.events.mediaPressure = Math.min(10, (STATE.season.events.mediaPressure || 0) + 1);
    return { emoji: '📉', title: '留守：承诺落空', body: '赛季过半，管理层承诺的补强没有兑现，战绩也没有起色。更衣室里开始有人低声讨论明年的事，你没有接话，但那份信任已经出现了裂痕。\n\n效果：忠诚-1；更衣室信任-1；媒体压力+1。' };
  },
});
