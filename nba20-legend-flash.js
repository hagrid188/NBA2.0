/* ============================================================
 * NBA2.0 球队历史名宿（抽到新球队后弹窗：可选其属性）
 * 触发：STATE.currentTeam 被设为新队时调用 offerHistoricLegendPick(team)
 * 概率：10% 触发（不刷屏）
 * 体验：弹模态显示 1-3 位该队/联盟历史名人，可"选他"取其一项属性，或"跳过"
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

  // 给指定队抽 3 位名人（按 OVR 排序+随机扰动）
  function pickLegendsForTeam(team, count) {
    count = count || 3;
    var pool = buildPool();
    if (!pool.length) return [];
    var tn = norm(team);
    // 优先：队 ID 完全匹配 / 中文队名匹配
    var matched = pool.filter(function (p) {
      if (norm(p.team) === tn || norm(p.teamId) === tn) return true;
      var cn = (typeof getTeamName === 'function') ? getTeamName(team) : '';
      return norm(p.team) === norm(cn) || norm(p.teamCn) === norm(cn);
    });
    if (matched.length < count) {
      // 不足则补：从 pool 中按 OVR 排序抽
      var topByOvr = pool.slice().sort(function (a, b) { return (parseInt(b.ovr) || 0) - (parseInt(a.ovr) || 0); });
      topByOvr.forEach(function (p) { if (matched.indexOf(p) < 0 && matched.length < count + 2) matched.push(p); });
    }
    // 排序：超巨（95+）优先，再按 ovr 降序，再随机
    matched.sort(function (a, b) {
      var oa = parseInt(a.ovr) || 0, ob = parseInt(b.ovr) || 0;
      if (oa >= 95 && ob < 95) return -1;
      if (ob >= 95 && oa < 95) return 1;
      if (oa !== ob) return ob - oa;
      return Math.random() - 0.5;
    });
    return matched.slice(0, count);
  }

  // 计算该名人某项属性的值（用他的 attrs 字段或 OVR 推算）
  function attrOfLegend(p, key) {
    if (p && p.attrs && typeof p.attrs[key] === 'number') {
      return p.attrs[key];
    }
    // 退化：用 OVR 推算（13 项基础属性 ±5 浮动）
    var base = parseInt(p && p.ovr) || 80;
    var delta = Math.floor(Math.random() * 10) - 5;
    return Math.max(50, Math.min(99, base + delta));
  }

  // 弹模态
  function showLegendModal(team) {
    var legends = pickLegendsForTeam(team, 3);
    if (!legends.length) return;

    var teamName = (typeof getTeamName === 'function') ? getTeamName(team) : team;
    var old = document.getElementById('nba20-legend-modal');
    if (old) old.remove();

    var html = '<div class="team-picker-overlay" id="nba20-legend-modal">';
    html += '<div class="team-picker-modal" style="max-width:360px;">';
    html += '<div class="team-picker-header"><span>🏀 ' + teamName + ' 队史名宿</span><button class="btn btn-secondary btn-sm" style="font-size:11px;padding:4px 8px;min-height:24px;" onclick="document.getElementById(\'nba20-legend-modal\').remove()">跳过</button></div>';
    html += '<div style="padding:6px 12px;font-size:11px;color:var(--text-dim);border-bottom:1px solid var(--border-light);">球队历史上有这些名宿曾在队中效力过——要不要从他们身上挑一项属性？</div>';
    html += '<div style="padding:8px 12px;max-height:55vh;overflow-y:auto;">';
    legends.forEach(function (p, idx) {
      var name = (p.cn || p.name || '').trim();
      var ovr = parseInt(p.ovr) || 0;
      var pos = p.pos || '—';
      var era = p.era || p.draftYear || '';
      var topAttr = guessTopAttr(p);
      var topVal = attrOfLegend(p, topAttr);
      html += '<div style="display:flex;align-items:center;gap:8px;padding:8px;border:1px solid var(--border-light);border-radius:8px;margin-bottom:6px;background:var(--bg-card);">'
        + '<div style="width:34px;height:34px;border-radius:50%;background:#f7a600;color:#fff;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;">' + (idx + 1) + '</div>'
        + '<div style="flex:1;min-width:0;">'
        + '<div style="font-weight:700;color:var(--text);font-size:13px;">' + name + (era ? ' <span style="font-size:10px;color:var(--text-dim);font-weight:400;">· ' + era + '</span>' : '') + '</div>'
        + '<div style="font-size:11px;color:var(--text-dim);">' + pos + ' · OVR ' + ovr + '</div>'
        + '<div style="font-size:11px;color:var(--orange);margin-top:2px;">最强：' + topAttr + ' (' + topVal + ')</div>'
        + '</div>'
        + '<button class="btn btn-primary btn-sm" style="font-size:11px;padding:6px 8px;min-height:28px;" onclick="window.NBA20_LEGEND_FLASH.pickLegend(\'' + p.name.replace(/'/g, '\\\'') + '\',\'' + (p.team || '') + '\',\'' + topAttr + '\',' + topVal + ')">选他</button>'
        + '</div>';
    });
    html += '</div></div></div>';
    document.body.insertAdjacentHTML('beforeend', html);
  }

  // 推断名人最强属性
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

  // 用户选了某位名人：把他的最强属性锁定给玩家
  window.NBA20_LEGEND_FLASH = {
    installed: true,
    version: '2026.08.18-2',
    pickLegend: function (playerName, team, attrKey, attrVal) {
      try {
        // 关闭模态
        var m = document.getElementById('nba20-legend-modal');
        if (m) m.remove();
        // 直接给玩家锁定该属性（绕过老虎机/位置衰减流程）
        if (typeof STATE === 'undefined') return;
        // 如果该属性已被锁定，覆盖（提示）
        if (STATE.attrs && STATE.attrs[attrKey] !== null && STATE.attrs[attrKey] !== undefined) {
          if (typeof showToast === 'function') showToast('⚠️ ' + attrKey + ' 已被锁定，跳过名宿赠送');
          return;
        }
        // 写入
        STATE.attrs[attrKey] = attrVal;
        STATE.attrSlots[attrKey] = {
          player: playerName + '（历史名宿）',
          team: team,
          value: attrVal,
          raw: attrVal,
          penalty: 1.0,
          fromLegend: true
        };
        STATE.lockedCount = (STATE.lockedCount || 0) + 1;
        if (typeof showToast === 'function') {
          showToast('🎁 获得 ' + playerName + ' 的 ' + attrKey + ' (' + attrVal + ')');
        }
        // 触发 UI 更新
        try { if (typeof renderLeftAttrs === 'function') renderLeftAttrs(); } catch (e) {}
        try { if (typeof renderProgress === 'function') renderProgress(); } catch (e) {}
        try { if (typeof renderAttrSlots === 'function') renderAttrSlots(); } catch (e) {}
        // 已锁够 13 项直接揭晓
        try {
          if (STATE.lockedCount >= 13 && typeof revealPlayer === 'function') revealPlayer();
        } catch (e) {}
      } catch (e) {}
    }
  };

  // 入口：每次设置新球队时调
  window.offerHistoricLegendPick = function (team) {
    try {
      if (!team) return;
      // ★ NBA2.0：10% 触发（不刷屏，每队每档只刷一次）
      if (Math.random() >= 0.1) return;
      if (!STATE._legendShownTeams) STATE._legendShownTeams = {};
      if (STATE._legendShownTeams[team]) return;
      STATE._legendShownTeams[team] = true;
      // 延迟一下，让玩家先看到球队被抽到的反馈
      setTimeout(function () { showLegendModal(team); }, 800);
    } catch (e) {}
  };
})();