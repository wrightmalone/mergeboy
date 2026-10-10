// Bots and upgrades.
//
// A bot really plays its game: every `MB.botEvery(id)` seconds it makes one
// move on the same game state you see, through the game's own rules. While the
// app is open you watch it move (one move at a time, between animations).
// While it's closed, it keeps playing headlessly, so offline progress is real
// play, not a formula.
//
// Each game registers its bot with MB.registerBot(id, { act }) where
// act({ watched }) makes one move and returns nothing, or returns a short
// reason string ("needs 🔩") when it can't move right now.
//
// Upgrades (data in MB.APPS[id].upgrades) are always paid for in other games'
// currencies. Games read their levels with MB.up(id, upgradeId).
(function () {
  const MB = window.MB;
  const MAX_ACTS_PER_TICK = 30;
  const impls = {};

  MB.registerBot = (id, impl) => { impls[id] = impl; };

  // --- Upgrades ---------------------------------------------------------------
  MB.up = (id, uid) => MB.app(id).up?.[uid] || 0;
  MB.upDef = (id, uid) => MB.APPS[id].upgrades.find(u => u.id === uid);

  MB.upCost = function (id, uid) {
    const lv = MB.up(id, uid), cost = {};
    for (const [res, base, from] of MB.upDef(id, uid).cost) {
      if (lv >= from) cost[res] = Math.ceil(base * 1.6 ** (lv - from));
    }
    return cost;
  };

  // Why an upgrade can't be bought right now ('' if it can).
  MB.upBlocker = function (id, uid) {
    const def = MB.APPS[id], u = MB.upDef(id, uid), a = MB.app(id);
    if (MB.up(id, uid) >= u.max) return 'max';
    if (uid === 'bot' && a.crafts < def.mastery) return 'mastery';
    if (uid === 'speed' && !MB.up(id, 'bot')) return 'nobot';
    if (!MB.can(MB.upCost(id, uid))) return 'poor';
    return '';
  };

  MB.upAvailable = id => (MB.APPS[id].upgrades || []).filter(u => !MB.upBlocker(id, u.id)).length;

  MB.buyUp = function (id, uid) {
    if (MB.upBlocker(id, uid) || !MB.pay(MB.upCost(id, uid))) return false;
    const a = MB.app(id);
    a.up = { ...a.up, [uid]: MB.up(id, uid) + 1 };
    if (uid === 'bot') a.botT = 0;
    return true;
  };

  // --- Bots ---------------------------------------------------------------------
  MB.hasBot = id => MB.up(id, 'bot') > 0 && MB.app(id).installed;
  MB.botEvery = function (id) {
    const bot = MB.APPS[id].bot;
    return Math.max(bot.min, (bot.every * 0.8 ** MB.up(id, 'speed')) / (1 + 0.1 * MB.buildingLevel('garage')));
  };
  MB.botProgress = id => Math.min(1, (MB.app(id).botT || 0) / MB.botEvery(id));

  // Views set MB.busy[id] while an animation plays so a watched bot waits for it.
  MB.busy = {};

  MB.runBots = function (dt, maxActs = MAX_ACTS_PER_TICK) {
    for (const id of MB.BOT_APPS) {
      if (!MB.hasBot(id) || !impls[id]) continue;
      const a = MB.app(id), every = MB.botEvery(id), watched = MB.watching(id);
      if (watched && MB.busy[id]) continue;
      a.botT = (a.botT || 0) + dt;
      let n = 0;
      while (a.botT >= every && n < maxActs) {
        let wait;
        try {
          wait = impls[id].act({ watched });
        } catch (err) {
          console.error(`bot ${id} failed`, err);
          wait = 'confused';
        }
        if (typeof wait === 'string') {   // can't move right now: say why, retry next tick
          a.botWait = wait;
          a.botT = every;
          break;
        }
        a.botWait = '';
        a.botT -= every;
        n++;
        // On screen, one move at a time so you can follow it.
        if (watched) { a.botT = Math.min(a.botT, every / 2); break; }
      }
      if (n >= maxActs) a.botT = Math.min(a.botT, every);
    }
  };

  // Game models tell the open view what just happened so it can animate it.
  MB.gameEvent = (id, evt) => {
    if (MB.watching(id)) MB.currentApp().mod.onEvent?.(evt);
  };
})();
