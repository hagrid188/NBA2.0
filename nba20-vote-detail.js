/* ============================================================
 * NBA2.0 选票详情补丁
 * 在 MVP/最佳阵容/最佳防守阵容等颁奖弹窗里，点击奖项可展开看具体选票
 * （如 MVP 第 1 选票给了谁、第 2 给了谁...）
 * 数据源：window.PERFECT_PLAYER_AWARD_ENGINE 已经在运行，可以从 STATE.season.awards 里拿到详情
 * ============================================================ */
(function () {
  'use strict';

  // 选票详情生成（尽量从引擎拿真实选票，没有就退化为合成）
  function getVoteDetail(awardName) {
    try {
      var s = STATE && STATE.season;
      if (!s || !s.awards) return null;
      var found = null;
      for (var i = 0; i < s.awards.length; i++) {
        var a = s.awards[i];
        if (a && a.label === awardName) { found = a; break; }
      }
      if (!found) return null;
      // Z 版奖项已经在 awards里写 ballot/votes
      if (found.votes && Array.isArray(found.votes) && found.votes.length) {
        return found.votes;
      }
      // 退化：用决赛模拟器退一点评分
      return null;
    } catch (e) { return null; }
  }

  // 用模拟方式合成"5 张第 1 名选票 + 2 张第 2 名选票"之类（备用）
  function syntheticVotes(awardName, topName, candidates) {
    // candidates = [{name, ovr}, ...]
    var ballots = [];
    if (candidates && candidates.length > 1) {
      for (var i = 0; i < 5; i++) {
        ballots.push(candidates.slice(0, 3));
      }
    }
    return ballots;
  }

  // 渲染：附加到奖项弹窗
  function attachVoteDetail(label) {
    var dlg = document.body.querySelector('[id*="award"], [class*="award-modal"], [class*="champion"]');
    if (!dlg) return;
    var votes = getVoteDetail(label);
    if (!votes || !votes.length) {
      // 没数据时不显示，避免空盒子
      return;
    }
    var wrap = document.createElement('div');
    wrap.style.cssText = 'margin-top:8px;padding:6px 10px;background:var(--bg);border:1px solid var(--border);border-radius:8px;font-size:11px;';
    var html = '<div style="font-weight:700;color:var(--orange);margin-bottom:4px;">📊 选票详情</div>';
    votes.forEach(function (ballot, idx) {
      if (!ballot) return;
      var names = (ballot.points ? ballot.points.map(function (p) {
        return (p && p.name) ? p.name : (p && p.player ? (p.player.cn || p.player.name) : '?');
      }) : []);
      html += '<div style="display:flex;align-items:center;gap:6px;padding:2px 0;border-bottom:1px dashed var(--border-light);">'
        + '<span style="color:var(--text-dim);width:36px;">第' + (idx + 1) + '票</span>'
        + '<span style="flex:1;">' + (names.length ? names.join('、') : '—') + '</span>'
        + '</div>';
    });
    wrap.innerHTML = html;
    dlg.appendChild(wrap);
  }

  // 暴露 hook
  window.NBA20_VOTE_DETAIL = {
    installed: true,
    attachVoteDetail: attachVoteDetail,
    getVoteDetail: getVoteDetail,
  };
})();