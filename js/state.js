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
  // Each rescued stage makes every intern (and your own hands) 20% faster.
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
  MB.costText = cost => Object.entries(cost).map(([k, n]) => `${Number.isInteger(n) ? MB.fmt(n) : MB.fmtRate(n)} ${MB.RES[k].icon}`).join(' ');

  // How many times `cost` can be paid from the current stockpile.
  MB.affordable = function (cost) {
    let n = Infinity;
    for (const [k, amt] of Object.entries(cost)) n = Math.min(n, Math.floor(MB.state.res[k] / amt + 1e-9));
    return n;
  };

  MB.autoCost = function (id) {
    const lv = MB.app(id).auto, cost = {};
    for (const [res, base, from] of MB.APPS[id].upgrade) {
      if (lv >= from) cost[res] = Math.ceil(base * 1.6 ** (lv - from));
    }
    return cost;
  };

  // Hand-played output scales with the intern's level (better tools) and the
  // King's bonus, so playing by hand always out-earns that game's intern.
  MB.handMult = id => Math.round((1 + MB.app(id).auto) * MB.autoMult() * MB.boostMult() * 10) / 10;
  MB.watching = id => MB.currentApp?.()?.id === id;

  // Base runs per second, before salary. Interns work 2x while you watch.
  MB.runsPerSec = id => MB.APPS[id].autoRate * MB.app(id).auto * MB.autoMult() * (MB.watching(id) ? 2 : 1);

  MB.canUpgrade = function (id) {
    const def = MB.APPS[id], a = MB.app(id);
    return !!def.recipe && a.installed && a.crafts >= def.mastery && MB.can(MB.autoCost(id));
  };

  MB.kingReady = function () {
    const s = MB.state;
    return s.king < MB.KING.length && (s.kingPaid || MB.can(MB.KING[s.king].cost));
  };

  // Advance every automated game by dt seconds. Runs are batched so long
  // offline catch-ups stay cheap. Each run an intern can be paid for earns a
  // bonus run (paid = 2x). Salaries are settled for every game first, so a
  // downstream game can't eat a resource before its upstream intern is paid.
  // A game that can't afford its inputs is starved.
  MB.simulate = function (dt, outMult = MB.boostMult()) {
    const res = MB.state.res, plans = [];
    for (const id of MB.CHAIN) {
      const a = MB.app(id);
      if (!a.installed || !a.auto) continue;
      a.acc += MB.runsPerSec(id) * dt;
      const runs = Math.floor(a.acc);
      if (!runs) continue;
      a.acc -= runs;
      const salary = MB.APPS[id].salary, salaried = Math.min(runs, MB.affordable(salary));
      for (const [r, n] of Object.entries(salary)) res[r] -= n * salaried;
      plans.push({ id, runs, salary, salaried });
    }
    for (const { id, runs, salary, salaried } of plans) {
      const def = MB.APPS[id], a = MB.app(id);
      const k = Math.min(runs + salaried, MB.affordable(def.recipe.in));
      const unused = salaried - Math.max(0, k - runs);
      for (const [r, n] of Object.entries(salary)) res[r] += n * unused;  // refund pay for runs that didn't happen
      a.starved = k < runs + salaried;
      a.unpaid = salaried < runs;
      for (const [r, n] of Object.entries(def.recipe.in)) res[r] -= n * k;
      MB.give(def.recipe.out, k * outMult);
    }
  };
})();
