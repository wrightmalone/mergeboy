// Static game data: resources, the apps on the phone, fake ads, crate prizes
// and store offers (the King's levels live in levels.js). Everything tunable lives here.
window.MB = { apps: {} };

MB.RES = {
  scrap: { name: 'Scrap', icon: '🔩' },
  dust: { name: 'Dust', icon: '💨' },
  slab: { name: 'Slabs', icon: '🧱' },
  block: { name: 'Blocks', icon: '🟫' },
  gold: { name: 'Gold', icon: '💰' },
  star: { name: 'Stars', icon: '⭐' },
  medal: { name: 'Medals', icon: '🎖️' },
  gem: { name: 'Gems', icon: '💎' },
};

// The one real-money thing in the game: an optional tip jar. Empty = "coming soon".
MB.COFFEE_URL = '';

// Every game on the phone. Games with a `recipe` produce something and can be
// played by hand, then (once mastered) automated by an intern.
//
// The games are deliberately interdependent so none of them goes stale:
// - `recipe.in`: what the game consumes (the production chain).
// - `salary`: what its intern is paid per run, always another game's resource.
//   A paid intern works 2x; unpaid, they quiet-quit at 1x. Salaries form a loop:
//   screw <- dust <- grinder <- slabs <- merge <- blocks <- slicer <- gold <- king <- scrap <- screw.
// - `upgrade`: [resource, base, fromLevel] — each upgrade costs other games' resources,
//   growing 1.6x per level after `fromLevel`.
// Manual play stays worth it: hand-played output is multiplied by (1 + intern level)
// and the King bonus, and a game's intern works 2x while you have that game open.
// `install` is the "download size" (null = preinstalled). One automation level
// runs the recipe `autoRate` times per second.
MB.APPS = {
  screw: {
    name: 'Screw Loose 3D', icon: '🪛', color: 'linear-gradient(135deg,#ff6a3d,#ffb347)',
    tagline: '🔥 ONLY 1% CAN BEAT LEVEL 3!! 🔥', rating: '4.8',
    install: null,
    recipe: { in: {}, out: { scrap: 2 } },
    autoRate: 0.4, mastery: 12, masteryUnit: 'plates dropped',
    intern: 'Screwdriver Intern',
    salary: { dust: 0.1 },
    upgrade: [['scrap', 20, 0], ['block', 4, 1], ['gold', 5, 3]],
  },
  grinder: {
    name: 'Grind the Thing', icon: '⚙️', color: 'linear-gradient(135deg,#5a5f73,#9aa3b5)',
    tagline: 'Incremental. Satisfying. Forever. 😌', rating: '4.6',
    install: { scrap: 20 },
    recipe: { in: { scrap: 2 }, out: { dust: 1 } },
    autoRate: 0.4, mastery: 8, masteryUnit: 'batches ground',
    intern: 'Grind Intern',
    salary: { slab: 0.02 },
    upgrade: [['dust', 8, 0], ['slab', 2, 1], ['gold', 5, 3]],
  },
  merge: {
    name: 'Merge Boy', icon: '👦', color: 'linear-gradient(135deg,#7b4dff,#d36bff)',
    tagline: 'Merge to unlock the TRUTH 👀', rating: '4.9',
    install: { dust: 10 },
    recipe: { in: { dust: 8 }, out: { slab: 1 } },
    autoRate: 0.05, mastery: 3, masteryUnit: 'slabs merged',
    intern: 'Merge Intern',
    salary: { block: 0.5 },
    upgrade: [['slab', 2, 0], ['block', 5, 1], ['gold', 8, 3]],
  },
  slicer: {
    name: 'Slice It All!', icon: '🔪', color: 'linear-gradient(135deg,#00b4d8,#48e5c2)',
    tagline: 'So satisfying!!! 🤤 (results may vary)', rating: '4.7',
    install: { slab: 2 },
    recipe: { in: { slab: 1 }, out: { block: 3 } },
    autoRate: 0.05, mastery: 4, masteryUnit: 'slabs sliced',
    intern: 'Knife Intern',
    salary: { gold: 0.2 },
    upgrade: [['block', 6, 0], ['dust', 20, 1], ['gold', 10, 3]],
  },
  king: {
    name: 'Rescue the King', icon: '🤴', color: 'linear-gradient(135deg,#ffcf3f,#ff8a00)',
    tagline: 'He needs YOUR help!!! 😱', rating: '4.9',
    install: null,
    recipe: { in: {}, out: { gold: 2 } },
    autoRate: 0.04, mastery: 3, masteryUnit: 'levels won',
    intern: 'Knight',
    salary: { scrap: 3 },
    upgrade: [['gold', 10, 0], ['slab', 3, 1], ['block', 15, 2]],
  },
  match3: {
    name: 'Match Royale', icon: '🍬', color: 'linear-gradient(135deg,#ff5fa2,#a855f7)',
    tagline: '🍭 LEVEL 2 IS IMPOSSIBLE!! (it is not)', rating: '4.8',
    install: { scrap: 40 },
    recipe: { in: {}, out: { star: 1 } },
    autoRate: 0.05, mastery: 3, masteryUnit: 'levels cleared',
    intern: 'Candy Intern',
    salary: { medal: 0.2 },
    upgrade: [['star', 10, 0], ['dust', 20, 1], ['gold', 10, 3]],
  },
  army: {
    name: 'Last Army: Merge War', icon: '🪖', color: 'linear-gradient(135deg,#4d7c0f,#a3a33a)',
    tagline: '⚔️ 99% CAN’T BEAT WAVE 5!! ⚔️', rating: '4.4',
    install: { gold: 20 },
    recipe: { in: { scrap: 2 }, out: { medal: 1 } },
    autoRate: 0.05, mastery: 3, masteryUnit: 'battles won',
    intern: 'Drill Sergeant',
    salary: { star: 0.25 },
    upgrade: [['medal', 5, 0], ['gold', 10, 1], ['star', 10, 2]],
  },
  crowd: {
    name: 'Crowd Run 3D', icon: '🏃', color: 'linear-gradient(135deg,#0ea5e9,#f43f5e)',
    tagline: '🏃 ONLY GENIUSES PICK THE RIGHT GATE!!', rating: '4.3',
    install: { medal: 3 },
  },
  spin: {
    name: 'Goose Master', icon: '🎰', color: 'linear-gradient(135deg,#f59e0b,#dc2626)',
    tagline: '🎰 SPIN TO WIN!! (it is a slot machine. we told you.)', rating: '3.9',
    install: { star: 3 },
  },
  base: {
    name: 'Clash of Kingdoms', icon: '🏰', color: 'linear-gradient(135deg,#2563eb,#60a5fa)',
    tagline: '🏰 BUILD YOUR EMPIRE (timers included)', rating: '4.5',
    install: { block: 10, star: 5 },
  },
  crate: {
    name: 'Lucky Crate', icon: '🎁', color: 'linear-gradient(135deg,#ff4d8d,#ff9a5a)',
    tagline: 'Odds disclosed (in very small text)', rating: '4.2',
    install: { gem: 1 },
  },
  store: {
    name: 'VIP Store', icon: '👑', color: 'linear-gradient(135deg,#1d1d1d,#6b5b2a)',
    tagline: '⏰ EXCLUSIVE DEALS — ENDS SOON (it never ends)', rating: '1.3',
    install: null,
  },
  coffee: {
    name: 'Dev Coffee', icon: '☕', color: 'linear-gradient(135deg,#7c4a1e,#d6a066)',
    tagline: 'The only real-money button in here. Optional.', rating: '5.0',
    install: null,
  },
};

// Clash of Kingdoms: buildings turn resources into permanent boosts for the
// other games. Upgrading to level L+1 costs `cost` × 1.7^L and takes
// `secs` × 3^L seconds (capped at 4 hours). There are no gem speed-ups: every
// hand-played action in any game knocks a few seconds off construction, and
// errands can finish builds outright.
MB.BUILDINGS = {
  hall: { name: 'Town Hall', icon: '🏛️', cost: { block: 20, star: 10, medal: 5 }, secs: 30, max: 8,
    desc: 'Other buildings can go one level above it. Level 3 hires a second builder.' },
  workshop: { name: 'Workshop', icon: '🔧', cost: { scrap: 60, slab: 3 }, secs: 20, max: 10, boosts: ['screw', 'grinder'], perLevel: 0.15 },
  lab: { name: 'Lab', icon: '🧪', cost: { dust: 40, block: 10 }, secs: 20, max: 10, boosts: ['merge', 'slicer'], perLevel: 0.15 },
  treasury: { name: 'Treasury', icon: '🏦', cost: { gold: 20, star: 5 }, secs: 30, max: 10, boosts: ['king', 'match3'], perLevel: 0.15 },
  barracks: { name: 'Barracks', icon: '⚔️', cost: { medal: 6, block: 10 }, secs: 30, max: 10, boosts: ['army'], perLevel: 0.15 },
  bakery: { name: 'Candy Factory', icon: '🍭', cost: { star: 15, dust: 20 }, secs: 30, max: 10,
    desc: '+1 max ❤️ in Match Royale and +1 max ⚡ in Last Army per level.' },
  dorms: { name: 'Intern Dorms', icon: '🛏️', cost: { slab: 5, gold: 15 }, secs: 30, max: 5,
    desc: 'Every intern’s salary −10% per level.' },
};

// Things you can be asked to do in a game, used by errands (see errands.js).
// Only hand-played actions count; interns don't run your errands.
MB.METRICS = {
  'screw.plate': { app: 'screw', text: n => `Drop ${n} plate${n > 1 ? 's' : ''} in Screw Loose 3D` },
  'grinder.batch': { app: 'grinder', text: n => `Grind ${n} batch${n > 1 ? 'es' : ''} in Grind the Thing` },
  'merge.slab': { app: 'merge', text: n => `Merge ${n} slab${n > 1 ? 's' : ''} in Merge Boy` },
  'slicer.slab': { app: 'slicer', text: n => `Slice ${n} slab${n > 1 ? 's' : ''} in Slice It All!` },
  'king.win': { app: 'king', text: n => `Win ${n} Rescue the King stage${n > 1 ? 's' : ''} (replays count)` },
  'match3.win': { app: 'match3', text: n => `Clear ${n} Match Royale level${n > 1 ? 's' : ''}` },
  'army.win': { app: 'army', text: n => `Win ${n} battle${n > 1 ? 's' : ''} in Last Army` },
  'crowd.win': { app: 'crowd', text: n => `Beat ${n} boss crowd${n > 1 ? 's' : ''} in Crowd Run 3D` },
  'base.build': { app: 'base', text: n => `Finish ${n} upgrade${n > 1 ? 's' : ''} in Clash of Kingdoms` },
};

// Order the automation simulation runs in, upstream first.
MB.CHAIN = ['screw', 'grinder', 'merge', 'slicer', 'king', 'match3', 'army'];

// Interstitial ads. Each frame is [scene, caption]. `app` = which game it advertises.
MB.ADS = [
  { app: 'screw', frames: [['🟥🔩🟥\n🟦🔩🟦', '99% FAIL LEVEL 3!!'], ['🟥🔩🟥\n🟦  🟦', 'He removed the WRONG screw 😱'], ['💥🟥🟦💥', 'NOOOOOO'], ['🤔🪛', 'Can YOU do better?']] },
  { app: 'king', frames: [['💧\n━📌━\n🔥\n━📌━\n🤴', 'SAVE THE KING!!'], ['🔥\n🤴', 'He pulled the wrong pin 😭'], ['🫠', 'Only 2% of players can do this!'], ['🤴❓', 'Help him!! Download now']] },
  { app: 'grinder', frames: [['🪨', 'Satisfying...'], ['⚙️🪨', 'So satisfying...'], ['⚙️💨', 'SO satisfying 🤤'], ['📈', 'Number go up. Install now.']] },
  { app: 'merge', frames: [['🐜', 'Lv 1'], ['🐈', 'Lv 30'], ['🦖', 'Lv 500'], ['🐉👑', 'Lv 999 — how far can YOU merge?']] },
  { app: 'slicer', frames: [['🍉🔪', 'So satisfying!!!'], ['🍉🔪🍉', 'Slice EVERYTHING'], ['🚗🔪', 'Even this?!'], ['🔪', '(results may vary)']] },
  { app: null, frames: [['👨😐', 'My dad was bored...'], ['👨📱', 'Then he found this game'], ['👨🤩', 'Now he plays 19 hours a day'], ['🏠', "We haven't seen him since March"]] },
  { app: null, frames: [['🐲⚔️🏰✨', 'EPIC cinematic battles!'], ['🟦⬜🟦\n⬜🟦⬜', 'Actual gameplay:'], ['🟦🟦🟦', 'match 3.'], ['⭐⭐⭐⭐⭐', 'Rated 4.9 by 12 bots']] },
  { app: null, frames: [['2 + 2 = ?', 'Only GENIUSES can solve this!'], ['2 + 2 = 22', '...'], ['❌❌❌', 'Players are FURIOUS!!'], ['🧠', "Prove you're smarter. Install now!"]] },
];

// Lucky Crate prize table; `w` is the weight.
MB.CRATE = [
  { w: 40, rarity: 'Common', name: 'A Rock', icon: '🪨', give: { scrap: 1 }, note: "It's a rock. Worth 1 scrap." },
  { w: 25, rarity: 'Common', name: 'Dust Bunny', icon: '🐰', give: { dust: 5 } },
  { w: 15, rarity: 'Rare', name: 'Slab of Meh', icon: '🧱', give: { slab: 2 } },
  { w: 12, rarity: 'Rare', name: "Box o' Blocks", icon: '📦', give: { block: 10 } },
  { w: 7, rarity: 'Epic', name: 'Golden Intern', icon: '🧑‍💼', intern: true },
  { w: 1, rarity: 'LEGENDARY', name: 'Mythic Rock', icon: '🌟', give: { scrap: 1 }, note: 'It glows. It is still a rock.' },
];

MB.OFFERS = [
  { id: 'starter', title: '🔥 STARTER PACK 🔥', sub: '92% OFF!!! Was 63 💎. (It was never 63 💎. We made that up, like they do.) Contains 50 🔩.', tag: 'BEST VALUE', cost: { gem: 5 }, give: { scrap: 50 }, once: true },
  { id: 'gems', title: 'Gem Mountain 💎', sub: '100 🟫 → 5 💎. Terrible rate. You should absolutely buy it.', cost: { block: 100 }, give: { gem: 5 } },
  { id: 'noads', title: 'Remove Ads Forever', sub: "Except the ones you choose to watch. You'll watch them.", tag: 'POPULAR', cost: { block: 250 }, once: true, effect: s => { s.adsRemoved = true; } },
  { id: 'pass', title: 'Battle Pass — Season 1', sub: 'Coming soon. Probably.', disabled: 'SOON™' },
  { id: 'double', title: 'Double Everything Forever', sub: 'Price: one (1) kidney.', disabled: '🫘 ×1' },
  { id: 'coffee', title: '☕ Buy the dev a coffee', sub: 'The only real-money item on this phone. Gives you nothing in-game.', tag: 'HONEST', open: 'coffee' },
];
