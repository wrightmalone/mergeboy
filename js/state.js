// Save state, resource helpers and the automation simulation.
(function () {
  const MB = window.MB;
  const SAVE_KEY = 'mergeboy.save.v1';

  function fresh() {
    return {
      res: Object.fromEntries(Object.keys(MB.RES).map(k => [k, 0])),
      apps: {},          // id -> { installed, auto, crafts, acc, starved, ...per-game data }
      king: 0,           // rescue stages completed
      kingPaid: false,   // current stage's materials delivered; puzzle pending
      boostUntil: 0,
      adsRemoved: false,
      bought: {},
      lastAdAt: Date.now(),
      lastSeen: Date.now(),
      login: { day: '', streak: 0 },
      introSeen: false,
      won: false,
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const base = fresh();
        const s = Object.assign(base, JSON.parse(raw));
        s.res = Object.assign(fresh().res, s.res);
        return s;
      }
    } catch (e) { /* storage blocked or corrupt save: start fresh */ }
    return fresh();
  }

  MB.state = load();

  MB.save = function () {
    MB.state.lastSeen = Date.now();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(MB.state)); } catch (e) { /* ignore */ }
  };

  MB.reset = function () {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
    MB.state = fresh();
    MB.save = () => {};  // don't let the unload handler re-save the old state
    location.reload();
  };

  MB.app = function (id) {
    return MB.state.apps[id] ||= { installed: !MB.APPS[id].install, auto: 0, crafts: 0, acc: 0, starved: false };
  };

  MB.can = cost => Object.entries(cost).every(([k, n]) => MB.state.res[k] >= n);

  MB.pay = function (cost) {
    if (!MB.can(cost)) return false;
    for (const [k, n] of Object.entries(cost)) MB.state.res[k] -= n;
    return true;
  };

  MB.give = function (out, mult = 1) {
    for (const [k, n] of Object.entries(out)) MB.state.res[k] += n * mult;
  };

  MB.boostMult = () => (Date.now() < MB.state.boostUntil ? 2 : 1);
  // Each rescued stage makes every intern 20% faster.
  MB.autoMult = () => 1 + 0.2 * Math.min(MB.state.king, MB.KING.length);

  MB.fmt = function (n) {
    n = Math.floor(n);
    if (n < 1000) return String(n);
    const units = ['K', 'M', 'B', 'T'];
    let i = -1;
    while (n >= 1000 && i < units.length - 1) { n /= 1000; i++; }
    return n.toFixed(n < 10 ? 1 : 0) + units[i];
  };
  MB.fmtRate = n => (n < 10 ? n.toFixed(2).replace(/\.?0+$/, '') : MB.fmt(n));
  MB.costText = cost => Object.entries(cost).map(([k, n]) => `${MB.fmt(n)} ${MB.RES[k].icon}`).join(' ');

  MB.runsPerSec = id => MB.APPS[id].autoRate * MB.app(id).auto * MB.autoMult();

  MB.canUpgrade = function (id) {
    const def = MB.APPS[id], a = MB.app(id);
    return !!def.recipe && a.installed && a.crafts >= def.mastery && MB.can(def.autoCost(a.auto));
  };

  MB.kingReady = function () {
    const s = MB.state;
    return s.king < MB.KING.length && (s.kingPaid || MB.can(MB.KING[s.king].cost));
  };

  // Advance every automated game by dt seconds. Runs are batched so long
  // offline catch-ups stay cheap; a game that can't afford its inputs is starved.
  MB.simulate = function (dt, outMult = MB.boostMult()) {
    for (const id of MB.CHAIN) {
      const def = MB.APPS[id], a = MB.app(id);
      if (!a.installed || !a.auto) continue;
      a.acc += MB.runsPerSec(id) * dt;
      const runs = Math.floor(a.acc);
      if (!runs) continue;
      let affordable = Infinity;
      for (const [k, n] of Object.entries(def.recipe.in)) affordable = Math.min(affordable, Math.floor(MB.state.res[k] / n));
      const k = Math.min(runs, affordable);
      a.starved = k < runs;
      for (const [r, n] of Object.entries(def.recipe.in)) MB.state.res[r] -= n * k;
      MB.give(def.recipe.out, k * outMult);
      a.acc -= runs;
    }
  };
})();
