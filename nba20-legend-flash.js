/* ============================================================
 * NBA2.0 球队历史名宿（直接混入该队球员列表）
 * 触发：抽到/重抽新球队时 offerHistoricLegendPick(team)，20% 概率
 * 效果：往 STATE.currentTeam 的阵容里注入 1 位历史名宿（带 fromLegend 标记），
 *       玩家照常点选球员锁属性，无需新弹窗。
 * ============================================================ */
(function () {
  'use strict';

  var LEGEND_POOL = [];
  function buildPool() {
    if (typeof HISTORICAL_PLAYERS === 'undefined' || !Array.isArray(HISTORICAL_PLAYERS)) return [];
    if (LEGEND_POOL.length) return LEGEND_POOL;
    LEGEND_POOL = HISTORICAL_PLAYERS.filter(function (p) {
      var ovr = parseInt(p && p.ovr) || 0;
      return ovr >= 80 && (p.cn || p.name);
    });
    return LEGEND_POOL;
  }

  function norm(s) { return String(s || '').replace(/\s+/g, '').toLowerCase(); }

  // 为指定队挑 1 位名人（优先该队史，其次按 OVR 抽联盟名宿）
  function pickLegendForTeam(team) {
    var pool = buildPool();
    if (!pool.length) return null;
    var tn = norm(team);
    var cn = (typeof getTeamName === 'function') ? getTeamName(team) : '';
    var matched = pool.filter(function (p) {
      if (norm(p.team) === tn || norm(p.teamId) === tn) return true;
      return norm(p.team) === norm(cn) || norm(p.teamCn) === norm(cn);
    });
    var src = matched.length ? matched : pool;
    // 超巨优先（95+），再按 OVR 降序，再随机扰动
    var sorted = src.slice().sort(function (a, b) {
      var oa = parseInt(a.ovr) || 0, ob = parseInt(b.ovr) || 0;
      if (oa >= 95 && ob < 95) return -1;
      if (ob >= 95 && oa < 95) return 1;
      if (oa !== ob) return ob - oa;
      return Math.random() - 0.5;
    });
    return sorted[0] || null;
  }

  function guessTopAttr(p) {
    if (p && p.attrs) {
      var best = null, bestV = -1;
      Object.keys(p.attrs).forEach(function (k) {
        var v = parseInt(p.attrs[k]) || 0;
        if (v > bestV) { bestV = v; best = k; }
      });
      if (best) return best;
    }
    var pos = p && p.pos ? String(p.pos).split('/')[0].trim() : '';
    var map = { PG: 'PAS', SG: 'threePT', SF: 'threePT', PF: 'DNK', C: 'DNK' };
    return map[pos] || 'threePT';
  }

  function attrOfLegend(p, key) {
    if (p && p.attrs && typeof p.attrs[key] === 'number') return p.attrs[key];
    var base = parseInt(p && p.ovr) || 80;
    var delta = Math.floor(Math.random() * 10) - 5;
    return Math.max(50, Math.min(99, base + delta));
  }

  // 主入口：抽到新队后调用，20% 概率把名宿塞进该队阵容
  window.offerHistoricLegendPick = function (team) {
    try {
      if (!team) return;
      if (Math.random() >= 0.2) return; // ★ NBA2.0：20% 概率
      if (!STATE._legendInjected) STATE._legendInjected = {};
      if (STATE._legendInjected[team]) return; // 每队每档只注入一次
      var p = pickLegendForTeam(team);
      if (!p) return;
      var topAttr = guessTopAttr(p);
      var topVal = attrOfLegend(p, topAttr);
      var pos = p.pos || 'SF';
      // 构造一名"球员"塞进该队名单（保留原名 + fromLegend 标记）
      // 13 项属性按 OVR 推导（像真名宿：有强有弱，玩家可任选一项）
      var ovrBase = parseInt(p.ovr) || 85;
      var ATTRS = ['threePT', 'MID', 'FIN', 'DNK', 'HAN', 'PAS', 'PDEF', 'IDEF', 'BLK', 'REB', 'ATH', 'STR', 'CLU'];
      var _attrs = {};
      var _topIdx = ATTRS.indexOf(topAttr);
      ATTRS.forEach(function (k, idx) {
        if (p.attrs && typeof p.attrs[k] === 'number') { _attrs[k] = p.attrs[k]; return; }
        // 最强项 +5，相邻位置 +2，其余在 OVR 附近浮动
        var off = 0;
        if (idx === _topIdx) off = 6;
        else if (idx === _topIdx + 1 || idx === _topIdx - 1) off = 3;
        _attrs[k] = Math.max(50, Math.min(99, ovrBase + off + (Math.floor(Math.random() * 7) - 3)));
      });
      var legendPlayer = {
        name: p.name || (p.cn || '历史名宿'),
        nameEN: p.name || '',
        cname: p.cn || p.name || '历史名宿',
        pos: pos,
        ovr: ovrBase,
        fromLegend: true,
        legendOf: (typeof getTeamName === 'function') ? getTeamName(team) : team,
        attrs: _attrs,
        threePT: _attrs.threePT, MID: _attrs.MID, FIN: _attrs.FIN, DNK: _attrs.DNK, HAN: _attrs.HAN,
        PAS: _attrs.PAS, PDEF: _attrs.PDEF, IDEF: _attrs.IDEF, BLK: _attrs.BLK, REB: _attrs.REB,
        ATH: _attrs.ATH, STR: _attrs.STR, CLU: _attrs.CLU,
      };
      // 塞进该队阵容
      if (!NBA2K_DATA[team]) NBA2K_DATA[team] = [];
      NBA2K_DATA[team].push(legendPlayer);
      STATE._legendInjected[team] = true;
      // 清阵容缓存，让列表重新渲染（在 offerHistoricLegendPick 被调用的钩子之后主流程会刷新）
      try { if (typeof clearLineupCache === 'function') clearLineupCache(); } catch (e) {}
      try { if (typeof showTeamRoster === 'function') showTeamRoster(team); } catch (e) {}
    } catch (e) {}
  };

  window.NBA20_LEGEND_FLASH = { installed: true, version: '2026.08.18-3' };
})();