/* ============================================================
 * NBA2.0 — 扩充事件库适配器
 * 把 Z 版 perfect-player-event-library 导出的 179 条赛季事件
 * (window.PERFECT_PLAYER_EXTRA_SEASON_EVENT_DEFINITIONS)
 * 转换为 D 盘主引擎(__ai_app.html)的 BRANCH_EVENTS 兼容 schema,
 * 并注入 D 盘事件源(getBranchEventSource),使其可在赛季中随机触发。
 *
 * 不修改主引擎核心代码:只包裹 getBranchEventSource。
 * 依赖 D 盘已定义的 addProfileDelta / addSeasonMod / getBranchEventById。
 * ============================================================ */
(function () {
  'use strict';

  var EXTRA_KEY = '__nba20_extra_events__';

  function getExtraSource() {
    return (window.PERFECT_PLAYER_EXTRA_SEASON_EVENT_DEFINITIONS) || [];
  }

  // 把单条 Z 版事件转换为 D 盘 schema
  function toBranchEvent(ev) {
    if (!ev || !ev.id) return null;
    // 属性/模组映射:profile→addProfileDelta, mods→addSeasonMod
    function makeApply(choice, family) {
      var prof = choice.profile || {};
      var mods = choice.mods || {};
      var resultText = choice.result || '';
      return function () {
        var parts = [];
        // 人格属性(跨季)
        Object.keys(prof).forEach(function (k) {
          var v = Number(prof[k]) || 0;
          if (v && typeof window.addProfileDelta === 'function') {
            try { window.addProfileDelta(k, v); } catch (e) {}
          }
        });
        // 当季模组
        Object.keys(mods).forEach(function (k) {
          var v = Number(mods[k]) || 0;
          if (v && typeof window.addSeasonMod === 'function') {
            try { window.addSeasonMod(k, v); } catch (e) {}
          }
        });
        return resultText;
      };
    }

    var choices = (ev.choices || []).map(function (c, i) {
      return {
        label: c.label,
        hint: c.hint || '',
        apply: makeApply(c, i)
      };
    });

    return {
      id: ev.id,
      branch: 'nba20_' + ev.id.replace(/^unique_/, ''),
      phase: 'season',
      slot: 'main',
      weight: 8,                       // 与 D 盘普通赛季事件接近的中等权重
      scenes: ev.scene ? [ev.scene] : [],
      title: ev.title || '赛季事件',
      body: ev.body || (ev.scene || ''),
      contextId: ev.contextId || null,
      choices: choices
    };
  }

  // 生成并缓存合并后的事件(去重:按 id)
  // ★ NBA2.0 根治：移除 getBranchEventById 去重——它内部调用已被包裹的 getBranchEventSource，
  //   会形成无限递归导致结果随机。Z 版事件 id 均带 unique_ 前缀，与 D 盘事件不会冲突，
  //   只在自己内部按 id 去重即可。
  function buildExtraEvents() {
    var cached = window[EXTRA_KEY];
    if (cached && cached.length) return cached;
    var src = getExtraSource();
    if (!src || !src.length) return cached || [];
    var out = [];
    var seen = {};
    src.forEach(function (ev) {
      try {
        var e = toBranchEvent(ev);
        if (!e) return;
        if (seen[e.id]) return;
        seen[e.id] = true;
        out.push(e);
      } catch (e2) {}
    });
    if (out.length) window[EXTRA_KEY] = out;
    return out;
  }

  // 包裹 getBranchEventSource:把扩充事件并入赛季事件池
  function install() {
    // 幂等:防止重复包裹(立即安装 + DOMContentLoaded 兜底两条路径)
    if (window.__NBA20_ADAPTER_INSTALLED__) return true;
    var orig = window.getBranchEventSource;
    if (typeof orig !== 'function') return false;
    window.getBranchEventSource = function () {
      var base = orig();
      try {
        var extra = buildExtraEvents();
        if (extra && extra.length) {
          // 仅并入"season"阶段;保留 base 原有顺序在前
          return base.concat(extra);
        }
      } catch (e) {}
      return base;
    };
    window.__NBA20_ADAPTER_INSTALLED__ = true;
    return true;
  }

  // 加载时立即安装(主引擎已同步加载完毕,getBranchEventSource 已存在);
  // 万一尚未就绪,注册 DOMContentLoaded 兜底
  var _installed = false;
  function tryInstall() {
    if (_installed) return;
    _installed = install();
  }
  tryInstall();
  if (!_installed && document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryInstall);
  }

  window.NBA20_EVENT_ADAPTER = {
    installed: function(){ return !!window.__NBA20_ADAPTER_INSTALLED__; },
    extraCount: function () { return buildExtraEvents().length; }
  };
})();
