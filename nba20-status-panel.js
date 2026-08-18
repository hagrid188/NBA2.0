/* ============================================================
 * NBA2.0 状态面板补丁（追加式，不动主引擎）
 * 4 区块：竞技状态 / 球队关系（含默契） / 舆论环境 / 生涯影响
 * 在生涯面板里调用 renderPlayerStateStrip() 即可渲染。
 * ============================================================ */
(function () {
  'use strict';

  // 状态数值读取（兼容我们的 profile 字段；缺失视为 0）
  function getProf() {
    var c = STATE && STATE.career;
    return (c && c.profile) || {};
  }
  function getMobility() {
    var c = STATE && STATE.career;
    return (c && c.mobility) || {};
  }
  function getSeasonMods() {
    try {
      if (typeof getPendingModsSum === 'function' && STATE.season && STATE.season.events) {
        return getPendingModsSum(STATE.season.events) || {};
      }
    } catch (e) {}
    return {};
  }

  // 单项取值：value 在 [-10, 10] 显示 +N/-N / 0（N5）
  function fmtVal(v) {
    var n = Number(v) || 0;
    if (Math.abs(n) < 0.05) return '0';
    return (n > 0 ? '+' : '') + Math.round(n);
  }
  function levelOf(v) {
    var n = Number(v) || 0;
    if (n >= 7) return ['极佳', 'good'];
    if (n >= 4) return ['良好', 'good'];
    if (n >= 1) return ['平稳', 'good'];
    if (n >= -3) return ['承压', 'alert'];
    if (n >= -6) return ['紧张', 'alert'];
    return ['危机', 'alert'];
  }
  function descOf(key, v) {
    var n = Number(v) || 0;
    var d = {
      // 竞技状态
      pressure: n > 0 ? '提高事件风险与负面状态触发' : '事件触发更稳',
      fatigue: n > 0 ? '直接降低防守；低负荷可减免老将衰退' : '防守与对抗更稳',
      morale: n > 0 ? '直接提升球队进攻与防守效率' : '球队效率下滑',
      form: n > 0 ? '改变每场比赛结果的波动幅度' : '比赛波动收窄',
      injuryRisk: n > 0 ? '影响伤病概率；低风险可减免老将衰退' : '伤病概率较低',
      // 球队关系
      teamChem: '属性越高的阵容默契越好（详见球队默契）',
      coachTrust: n > 0 ? '影响首发、时间、交易、续约' : '教练席紧张',
      lockerTrust: n > 0 ? '提升进攻，降低交易与裁员风险' : '更衣室不稳定',
      leadership: n > 0 ? '提升球队攻防并帮助竞争首发' : '球队更衣室沉默',
      loyalty: n > 0 ? '降低主动交易风险，提高母队续约率' : '球队担心你离队',
      // 舆论环境
      mediaPress: n > 0 ? '降低进攻效率并增加心理压力' : '媒体环境轻松',
      mediaTrust: n > 0 ? '降低比赛波动并增加自由市场报价' : '媒体不看好',
      controversy: n > 0 ? '增加波动、交易与裁员风险，降低续约' : '舆论稳定',
      fanSupport: n > 0 ? '降低裁员风险，提高续约和市场热度' : '球迷冷落',
      fame: n > 0 ? '提高自由市场热度与报价数量' : '关注度低',
      // 生涯影响
      businessValue: n > 0 ? '提高续约率与自由市场报价数量' : '商业价值一般',
      chinaPop: n > 0 ? '提高公众影响力与自由市场热度' : '国内曝光低',
      legacy: n > 0 ? '生涯末段额外加成（传奇声望）' : '生涯尚需累积',
    };
    return d[key] || '';
  }

  // 区块定义（顺序、字段、名称）
  var GROUPS = [
    {
      key: 'condition', icon: '🔥', title: '竞技状态',
      // 压力/体能/士气/波动/伤病 我们没 profile 字段 → 用 mods 或 0 兜底
      fields: [
        { id: 'pressure', label: '压力', value: function () { return getSeasonMods().mediaPressure || 0; } },
        { id: 'fatigue', label: '体能负荷', value: function () { return -(getSeasonMods().staminaLoad || 0); } },
        { id: 'morale', label: '士气', value: function () { return getProf().morale || 0; } },
        { id: 'form', label: '状态波动', value: function () { return getSeasonMods().formVariance || 0; } },
        { id: 'injuryRisk', label: '伤病风险', value: function () { return getSeasonMods().injuryRiskBonus || 0; } },
      ],
    },
    {
      key: 'team', icon: '🤝', title: '球队关系',
      fields: [
        { id: 'teamChem', label: '球队默契', value: function () {
          try {
            var c = calcTeamChemistry(STATE.careerTeam, STATE.position, STATE.finalOVR, STATE.attrs);
            return Math.round((c.score - 50) / 5); // 50→0，100→10
          } catch (e) { return 0; }
        } },
        { id: 'coachTrust', label: '教练信任', value: function () { return getProf().coachTrust || 0; } },
        { id: 'lockerTrust', label: '更衣室信任', value: function () { return getProf().lockerRoomTrust || 0; } },
        { id: 'leadership', label: '领导力', value: function () { return getProf().leadership || 0; } },
        { id: 'loyalty', label: '忠诚', value: function () { return getProf().loyalty || 0; } },
      ],
    },
    {
      key: 'media', icon: '📰', title: '舆论环境',
      fields: [
        { id: 'mediaPress', label: '媒体压力', value: function () { return getProf().mediaPressure || 0; } },
        { id: 'mediaTrust', label: '媒体信任', value: function () { return getProf().mediaTrust || 0; } },
        { id: 'controversy', label: '争议', value: function () { return getProf().controversy || 0; } },
        { id: 'fanSupport', label: '球迷支持', value: function () { return getProf().fanSupport || 0; } },
        { id: 'fame', label: '人气', value: function () { return getProf().fame || 0; } },
      ],
    },
    {
      key: 'career', icon: '🏆', title: '生涯影响',
      fields: [
        { id: 'businessValue', label: '商业价值', value: function () { return getProf().businessValue || 0; } },
        { id: 'chinaPop', label: '中国人气', value: function () { return getProf().chinaPopularity || 0; } },
        { id: 'legacy', label: '传奇声望', value: function () { return getProf().legacyBonus || 0; } },
      ],
    },
  ];

  function groupOverall(g) {
    // 区块总评：基于各子项均值
    var sum = 0, cnt = 0;
    g.fields.forEach(function (f) {
      try { var v = Number(f.value()) || 0; sum += v; cnt++; } catch (e) {}
    });
    var avg = cnt ? sum / cnt : 0;
    if (avg >= 5) return ['极佳', 'good'];
    if (avg >= 2) return ['良好', 'good'];
    if (avg >= -1) return ['平稳', 'good'];
    if (avg >= -4) return ['承压', 'alert'];
    return ['危机', 'alert'];
  }

  // 主渲染：返回状态条 HTML
  function renderPlayerStateStrip() {
    if (!STATE || !STATE.career) return '';
    var html = '<div id="player-state-strip" class="player-state-strip">';
    html += '<div class="player-state-groups">';
    GROUPS.forEach(function (g) {
      var ov = groupOverall(g);
      html += '<div class="player-state-group ' + ov[1] + '">';
      html += '<div class="player-state-group-title"><span class="pgs-icon">' + g.icon + '</span>' + g.title + '<span class="pgs-overall ' + ov[1] + '">' + ov[0] + '</span></div>';
      g.fields.forEach(function (f) {
        var v, lv;
        try { v = Number(f.value()) || 0; } catch (e) { v = 0; }
        lv = levelOf(v);
        html += '<div class="player-state-detail ' + lv[1] + '">'
          + '<div class="player-state-label">' + f.label + '</div>'
          + '<div class="player-state-value">' + fmtVal(v) + '</div>'
          + '<div class="player-state-desc">' + lv[0] + ' · ' + descOf(f.id, v) + '</div>'
          + '</div>';
      });
      html += '</div>';
    });
    html += '</div>';
    // 球队默契专门展开区（用户可展开查看详情 + 涨落趋势）
    try {
      var chem = calcTeamChemistry(STATE.careerTeam, STATE.position, STATE.finalOVR, STATE.attrs);
      html += '<details class="player-state-details">'
        + '<summary>🤝 球队默契（展开：' + chem.score + '% · ' + chem.label + '）</summary>'
        + '<div style="font-size:10px;color:var(--text-dim);padding:6px 4px 2px;line-height:1.6;">'
        + '位置适配 <b>' + chem.fit + '</b> · 属性互补 <b>' + chem.complement + '</b> · 阵容默契 <b>' + chem.stability + '</b> · 融入 <b>' + chem.personal + '</b><br>'
        + '<span style="color:var(--text-muted);">球队默契 80+ 进入争冠区间；90+ 是真正的王朝球队。胜场越多默契越涨，输球过多则会下滑。</span>'
        + '</div></details>';
    } catch (e) {}
    html += '</div>';
    return html;
  }

  // 暴露到全局（让主引擎 DOM 拼接时能调用）
  window.renderPlayerStateStrip = renderPlayerStateStrip;
  window.refreshPlayerStateStripLive = function () {
    var current = document.getElementById('player-state-strip');
    if (!current) return;
    var htmlText = renderPlayerStateStrip();
    if (!htmlText) return;
    current.outerHTML = htmlText;
  };

  // 提供 CSS（补丁自带的样式，避免依赖主文件是否补过）
  function ensureCss() {
    if (document.getElementById('nba20-state-css')) return;
    var s = document.createElement('style');
    s.id = 'nba20-state-css';
    s.textContent = ''
      + '.player-state-strip{margin:6px 10px;padding:7px;background:var(--bg-card);border:1.5px solid var(--border);border-radius:10px}'
      + '.player-state-groups{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}'
      + '.player-state-group{background:var(--bg);border:1px solid var(--border-light);border-radius:8px;padding:6px 4px}'
      + '.player-state-group-title{font-size:11px;font-weight:700;color:var(--text);display:flex;align-items:center;gap:4px;margin-bottom:4px;padding:0 2px}'
      + '.pgs-icon{font-size:12px}'
      + '.pgs-overall{margin-left:auto;font-size:10px;padding:1px 5px;border-radius:8px;font-weight:700}'
      + '.pgs-overall.good{background:rgba(76,175,125,.15);color:var(--green)}'
      + '.pgs-overall.alert{background:rgba(224,93,93,.15);color:var(--red)}'
      + '.player-state-detail{display:grid;grid-template-columns:42px 28px minmax(0,1fr);align-items:start;gap:3px;padding:3px 0;border-top:1px dashed var(--border-light)}'
      + '.player-state-detail:first-of-type{border-top:0}'
      + '.player-state-detail .player-state-label{font-size:9px;color:var(--text-dim);text-align:left;white-space:normal}'
      + '.player-state-detail .player-state-value{font-size:11px;text-align:right;font-weight:700;color:var(--text)}'
      + '.player-state-detail.good .player-state-value{color:var(--green)}'
      + '.player-state-detail.alert .player-state-value{color:var(--red)}'
      + '.player-state-detail .player-state-desc{font-size:9px;color:var(--text-muted);line-height:1.35}'
      + '.player-state-details{margin-top:6px;border-top:1px solid var(--border-light);padding:0 4px}'
      + '.player-state-details>summary{padding:7px 3px 1px;cursor:pointer;list-style:none;text-align:center;font-size:10px;font-weight:700;color:var(--orange)}'
      + '.player-state-details>summary::-webkit-details-marker{display:none}'
      + '@media(max-width:420px){.player-state-groups{grid-template-columns:1fr 1fr}.player-state-detail{grid-template-columns:38px 26px minmax(0,1fr)}}';
    document.head.appendChild(s);
  }
  ensureCss();

  // 标记就绪
  window.NBA20_STATUS_PANEL = { installed: true, version: '2026.08.18-1' };
})();