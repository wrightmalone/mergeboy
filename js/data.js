// Static game data: resources, the apps on the phone, fake ads, crate prizes
// and store offers (the King's levels live in levels.js). Everything tunable lives here.
window.MB = { apps: {} };

MB.RES = {
  scrap: { name: 'Scrap', icon: '🔩' },
  dust: { name: 'Dust', icon: '💨' },
  slab: { name: 'Slabs', icon: '🧱' },
  block: { name: 'Blocks', icon: '🟫' },
  gold: { name: 'Gold', icon: '💰' },
  gem: { name: 'Gems', icon: '💎' },
};

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
};

// Order the automation simulation runs in, upstream first.
MB.CHAIN = ['screw', 'grinder', 'merge', 'slicer', 'king'];

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
  { id: 'starter', title: '🔥 STARTER PACK 🔥', sub: '92% OFF!!! Was 63 💎. Contains 50 🔩.', tag: 'BEST VALUE', cost: { gem: 5 }, give: { scrap: 50 }, once: true },
  { id: 'gems', title: 'Gem Mountain 💎', sub: '100 🟫 → 5 💎. Terrible rate. You should absolutely buy it.', cost: { block: 100 }, give: { gem: 5 } },
  { id: 'noads', title: 'Remove Ads Forever', sub: "Except the ones you choose to watch. You'll watch them.", tag: 'POPULAR', cost: { block: 250 }, once: true, effect: s => { s.adsRemoved = true; } },
  { id: 'pass', title: 'Battle Pass — Season 1', sub: 'Coming soon. Probably.', disabled: 'SOON™' },
  { id: 'double', title: 'Double Everything Forever', sub: 'Price: one (1) kidney.', disabled: '🫘 ×1' },
];
