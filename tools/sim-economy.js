#!/usr/bin/env node
// Headless economy check: every production game installed with its intern at
// the given level, starting from zero resources, nobody playing by hand.
// Prints stockpiles and each intern's status (starved? unpaid?) over time, so
// you can see which game is the bottleneck.
// Usage: node tools/sim-economy.js [internLevel=1] [hours=1]
const path = require('path');

global.window = globalThis;  // the browser scripts write to window.MB
global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
require(path.join(__dirname, '../js/data.js'));
require(path.join(__dirname, '../js/levels.js'));
require(path.join(__dirname, '../js/state.js'));

const level = Number(process.argv[2] || 1), hours = Number(process.argv[3] || 1);
for (const id of MB.CHAIN) Object.assign(MB.app(id), { installed: true, auto: level });

const checkpoints = new Set([60, 600, 3600, 4 * 3600, 8 * 3600].filter(t => t <= hours * 3600).concat(hours * 3600));
for (let t = 1; t <= hours * 3600; t++) {
  MB.simulate(1, 1);
  if (!checkpoints.has(t)) continue;
  const stock = Object.entries(MB.state.res).map(([k, v]) => `${MB.RES[k].icon}${Math.round(v)}`).join(' ');
  const status = MB.CHAIN.map(id => `${MB.APPS[id].icon}${MB.app(id).starved ? '💤' : ''}${MB.app(id).unpaid ? '😒' : ''}`).join(' ');
  console.log(`${String(t / 60).padStart(5)} min  ${stock}\n           ${status}   (💤 starved for inputs, 😒 unpaid)`);
}
