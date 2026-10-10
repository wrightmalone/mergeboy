// Save state, resource helpers and multipliers.
(function () {
  const MB = window.MB;
  const SAVE_KEY = 'mergeboy.save.v2';  // v2: bots + upgrades replaced interns

  function fresh() {
    return {
      res: Object.fromEntries(Object.keys(MB.RES).map(k => [k, 0])),
      apps: {},          // id -> { installed, crafts, up: {upgrade levels}, botT, g: game state, ... }
      king: 0,           // rescue stages completed
      kingPaid: false,   // current stage's materials delivered; puzzle pending
      boostUntil: 0,
      adsRemoved: false,
      bought: {},
      errands: [],       // see errands.js
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

  // Called every factory tick (~4x a second) by main.js.
  MB.tickers = [];
  MB.onTick = fn => MB.tickers.push(fn);

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
    return MB.state.apps[id] ||= { installed: !MB.APPS[id].install, crafts: 0, up: {}, botT: 0 };
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
  // Each rescued stage makes everything you (and your bots) earn 20% bigger.
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

  // Multiplier on everything a game pays out, by hand or by bot: the King's
  // bonus, Clash of Kingdoms buildings, and the 2× ad boost.
  MB.outMult = id => Math.round(MB.autoMult() * MB.appBonus(id) * MB.boostMult() * 100) / 100;
  // A game is being watched only if it's open on a visible page. Hidden tabs
  // pause animation, so bots there play headlessly instead.
  MB.watching = id => typeof document !== 'undefined' && !document.hidden && MB.currentApp?.()?.id === id;

  // Clash of Kingdoms buildings boost the other games (see MB.BUILDINGS).
  MB.buildingLevel = id => MB.app('base').levels?.[id] || 0;
  MB.appBonus = function (id) {
    let bonus = 1;
    for (const [bid, b] of Object.entries(MB.BUILDINGS)) {
      if (b.boosts?.includes(id)) bonus += b.perLevel * MB.buildingLevel(bid);
    }
    return bonus;
  };

  MB.kingReady = function () {
    const s = MB.state;
    return s.king < MB.KING.length && (s.kingPaid || MB.can(MB.KING[s.king].cost));
  };
})();
