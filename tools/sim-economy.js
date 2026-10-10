#!/usr/bin/env node
// Headless economy check: every bot game installed with its bot hired and the
// given number of speed upgrades, starting from a small stockpile, nobody
// playing by hand. The bots run their real game logic (the same code as the
// page), so this shows what each game actually produces and which bots stall.
// Usage: node tools/sim-economy.js [speedLevel=0] [hours=1] [kingStagesCleared=3]
const path = require('path');

global.window = globalThis;  // the browser scripts write to window.MB
global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const load = f => require(path.join(__dirname, '..', f));
['js/data.js', 'js/levels.js', 'js/pinsim.js', 'js/state.js', 'js/errands.js', 'js/bots.js'].forEach(load);
// Views are never mounted here; give the few shell helpers models might touch a no-op.
Object.assign(MB, { toast() {}, modal() {}, floatText() {}, floatFrom() {}, currentApp: () => null });
for (const id of MB.BOT_APPS) load(`js/apps/${id}.js`);

const speed = Number(process.argv[2] || 0), hours = Number(process.argv[3] || 1), stages = Number(process.argv[4] || 3);
MB.state.king = stages;
for (const k of Object.keys(MB.RES)) MB.state.res[k] = 50;
for (const id of MB.BOT_APPS) Object.assign(MB.app(id), { installed: true, up: { bot: 1, speed } });

const start = { ...MB.state.res };
const t0 = Date.now();
const report = t => {
  const gained = Object.keys(MB.RES).map(k => `${MB.RES[k].icon}${Math.round(MB.state.res[k] - start[k])}`).join(' ');
  const stalled = MB.BOT_APPS.filter(id => MB.app(id).botWait).map(id => `${MB.APPS[id].icon} ${MB.app(id).botWait}`);
  console.log(`${String(t / 3600).padStart(4)}h  ${gained}`);
  if (stalled.length) console.log(`       waiting: ${stalled.join(' · ')}`);
};
for (let t = 30; t <= hours * 3600; t += 30) {
  MB.runBots(30, 1000);
  if (t % 3600 === 0 || t === hours * 3600) report(t);
}
console.log(`(${((Date.now() - t0) / 1000).toFixed(1)}s of real time)`);
