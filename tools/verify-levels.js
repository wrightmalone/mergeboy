#!/usr/bin/env node
// Headless check for Rescue the King levels.
// For every stage: the listed solution must win on every seed, and we report
// which other pin orders win or lose so traps can be confirmed.
// Usage: node tools/verify-levels.js [stageNumber] [--show[=pinOrder]]
//   --show prints the grid after each pin of the solution (or the given order).
const path = require('path');

global.window = globalThis;  // the browser scripts write to window.MB
require(path.join(__dirname, '../js/data.js'));
require(path.join(__dirname, '../js/levels.js'));
const PinSim = require(path.join(__dirname, '../js/pinsim.js'));
const MB = window.MB;

const SEEDS = 25;
const MAX_TICKS = 4000;

// Pull pins in order, each after the previous one settles; stop at an outcome.
function play(level, order, seed) {
  const sim = new PinSim(level, seed);
  let ticks = 0;
  const run = () => {
    let n = 0;
    while (!sim.outcome && (n === 0 || !sim.settled) && n < MAX_TICKS) { sim.step(); n++; }
    ticks += n;
  };
  for (const id of order) {
    if (sim.outcome) break;
    sim.pull(id);
    run();
  }
  run();
  return { outcome: sim.outcome || 'pending', dead: sim.dead, gold: sim.gold, need: sim.need, total: sim.goldTotal, monsters: sim.monstersLeft, ticks };
}

function permutations(items) {
  if (items.length <= 1) return [items];
  return items.flatMap((x, i) => permutations([...items.slice(0, i), ...items.slice(i + 1)]).map(p => [x, ...p]));
}

function summarize(level, order) {
  const results = Array.from({ length: SEEDS }, (_, s) => play(level, order, s + 1));
  const wins = results.filter(r => r.outcome === 'win').length;
  const why = {};
  for (const r of results) if (r.outcome !== 'win') why[r.dead || `${r.outcome}(gold ${r.gold}/${r.need}, monsters ${r.monsters})`] = (why[r.dead || `${r.outcome}(gold ${r.gold}/${r.need}, monsters ${r.monsters})`] || 0) + 1;
  const golds = results.map(r => r.gold);
  return { wins, why, goldRange: `${Math.min(...golds)}-${Math.max(...golds)}/${results[0].total}`, secs: Math.max(...results.map(r => r.ticks)) / PinSim.TICKS_PER_SEC };
}

const GLYPH = { 0: '.', 1: '#', 2: '=', 3: '~', 4: '^', 5: '%', 6: '$', 7: 'K', 8: 'M', 9: 'o' };
function show(level, order) {
  const sim = new PinSim(level, 1);
  const snap = label => {
    const rows = [];
    for (let y = 0; y < sim.h; y++) rows.push(Array.from({ length: sim.w }, (_, x) => GLYPH[sim.get(x, y)]).join(''));
    console.log(`   -- ${label} (gold ${sim.gold}, ${sim.dead || sim.outcome || 'running'})\n   ` + rows.join('\n   '));
  };
  for (const id of order) {
    sim.pull(id);
    let n = 0;
    while (!sim.outcome && (n === 0 || !sim.settled) && n < MAX_TICKS) { sim.step(); n++; }
    snap(`after pin ${id}`);
    if (sim.outcome) break;
  }
}

const args = process.argv.slice(2);
const only = Number(args.find(a => /^\d+$/.test(a))) || null;
const showArg = args.find(a => a.startsWith('--show'));
const showOrder = showArg === undefined ? undefined : showArg.split('=')[1] || '';
let failed = false;
MB.KING.forEach((level, i) => {
  if (only && only !== i + 1) return;
  const pins = [...new Set(level.map.join('').match(/[0-9]/g))].sort();
  const sol = summarize(level, level.solution);
  const ok = sol.wins === SEEDS;
  if (!ok) failed = true;
  console.log(`\n${ok ? '✅' : '❌'} Stage ${i + 1}: ${level.name}  solution ${level.solution.join('→')}  wins ${sol.wins}/${SEEDS}  gold ${sol.goldRange} (need ${new PinSim(level, 1).need})  ~${sol.secs.toFixed(1)}s`);
  if (!ok) console.log('   failures:', sol.why);
  if (only && showOrder !== undefined) show(level, showOrder ? showOrder.split('') : level.solution);
  for (const order of permutations(pins)) {
    if (order.join() === level.solution.join()) continue;
    const r = summarize(level, order);
    const tag = r.wins === SEEDS ? 'WINS' : r.wins === 0 ? 'loses' : `flaky ${r.wins}/${SEEDS}`;
    console.log(`   ${order.join('→').padEnd(10)} ${tag.padEnd(10)} ${r.wins < SEEDS ? JSON.stringify(r.why) : ''}`);
  }
});
process.exit(failed ? 1 : 0);
