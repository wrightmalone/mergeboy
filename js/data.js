// Static game data: resources, the apps on the phone, the King's rescue stages,
// fake ads and crate prizes. Everything tunable lives here.
window.MB = { apps: {} };

MB.RES = {
  scrap: { name: 'Scrap', icon: '🔩' },
  dust: { name: 'Dust', icon: '💨' },
  slab: { name: 'Slabs', icon: '🧱' },
  block: { name: 'Blocks', icon: '🟫' },
  gem: { name: 'Gems', icon: '💎' },
};

// Every game on the phone. Games with a `recipe` are links in the production
// chain: they can be played by hand, and once mastered, automated. `install` is
// the "download size" paid to unlock the app (null = preinstalled).
// One automation level runs the recipe `autoRate` times per second.
MB.APPS = {
  screw: {
    name: 'Screw Loose 3D', icon: '🪛', color: 'linear-gradient(135deg,#ff6a3d,#ffb347)',
    tagline: '🔥 ONLY 1% CAN BEAT LEVEL 3!! 🔥', rating: '4.8',
    install: null,
    recipe: { in: {}, out: { scrap: 2 } },
    autoRate: 0.4, mastery: 12, masteryUnit: 'plates dropped',
    intern: 'Screwdriver Intern',
    autoCost: lv => ({ scrap: Math.ceil(20 * 1.6 ** lv) }),
  },
  grinder: {
    name: 'Grind the Thing', icon: '⚙️', color: 'linear-gradient(135deg,#5a5f73,#9aa3b5)',
    tagline: 'Incremental. Satisfying. Forever. 😌', rating: '4.6',
    install: { scrap: 20 },
    recipe: { in: { scrap: 2 }, out: { dust: 1 } },
    autoRate: 0.4, mastery: 8, masteryUnit: 'batches ground',
    intern: 'Grind Intern',
    autoCost: lv => ({ dust: Math.ceil(8 * 1.6 ** lv) }),
  },
  merge: {
    name: 'Merge Boy', icon: '👦', color: 'linear-gradient(135deg,#7b4dff,#d36bff)',
    tagline: 'Merge to unlock the TRUTH 👀', rating: '4.9',
    install: { dust: 10 },
    recipe: { in: { dust: 8 }, out: { slab: 1 } },
    autoRate: 0.05, mastery: 3, masteryUnit: 'slabs merged',
    intern: 'Merge Intern',
    autoCost: lv => ({ slab: Math.ceil(2 * 1.6 ** lv) }),
  },
  slicer: {
    name: 'Slice It All!', icon: '🔪', color: 'linear-gradient(135deg,#00b4d8,#48e5c2)',
    tagline: 'So satisfying!!! 🤤 (results may vary)', rating: '4.7',
    install: { slab: 2 },
    recipe: { in: { slab: 1 }, out: { block: 3 } },
    autoRate: 0.05, mastery: 4, masteryUnit: 'slabs sliced',
    intern: 'Knife Intern',
    autoCost: lv => ({ block: Math.ceil(6 * 1.6 ** lv) }),
  },
  king: {
    name: 'Rescue the King', icon: '🤴', color: 'linear-gradient(135deg,#ffcf3f,#ff8a00)',
    tagline: 'He needs YOUR help!!! 😱', rating: '4.9',
    install: null,
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
MB.CHAIN = ['screw', 'grinder', 'merge', 'slicer'];

// The larger goal. Each stage: deliver materials, then solve a pull-the-pin
// puzzle. `layout` is the scene top-to-bottom; `answer` is the pin order that
// works; any other pin pulled is a failure with its `fails` line.
MB.KING = [
  {
    name: 'The Ditch', cost: { scrap: 25 },
    peril: 'The King has fallen into a ditch. Again.',
    layout: ['💰💰💰💰', { pin: 'A', label: 'holds the gold' }, '🤴 ⬇️ (ditch)'],
    answer: ['A'],
    win: 'Gold pours into the ditch. The King floats up on a pile of money, as kings do.',
    fails: {},
  },
  {
    name: 'Lava Moat', cost: { dust: 15 },
    peril: 'The King is trapped beneath a chamber of lava. He has made some choices.',
    layout: ['💧💧💧💧', { pin: 'A', label: 'holds the water' }, '🔥🔥🔥🔥', { pin: 'B', label: 'holds the lava' }, '🤴'],
    answer: ['A', 'B'],
    win: 'Water + lava = rock. The rock lands next to the King. He stands on it. Science!',
    fails: { B: 'You dropped lava on the King. 99% of players do this.' },
  },
  {
    name: 'Shark Bridge', cost: { slab: 3 },
    peril: 'The King is standing on a trapdoor above a shark pit. Nobody knows why.',
    layout: ['🤴', { pin: 'A', label: "the King's trapdoor" }, '🦈🦈🦈🦈', { pin: 'B', label: 'the shark drain' }, '🕳️ (sewer)'],
    answer: ['B', 'A'],
    win: 'The sharks drain into the sewer. The King drops into an empty pit, which is an improvement.',
    fails: { A: 'The King joined the sharks. They seem to be getting along, honestly.' },
  },
  {
    name: 'Tower of Peril', cost: { block: 20 },
    peril: 'The King is locked in a cage under a bomb. The bomb is under some water.',
    layout: ['💧💧💧', { pin: 'A', label: 'holds the water' }, '💣', { pin: 'B', label: 'holds the bomb' }, '🤴🔒', { pin: 'C', label: 'the cage door' }],
    answer: ['A', 'B', 'C'],
    win: 'Wet bomb. Sad bomb. Harmless bomb. The King strolls out of the cage.',
    fails: {
      B: 'The bomb landed on the King. 💥 He is now abstract art.',
      C: 'The cage opened directly under a live bomb. Bold.',
    },
  },
  {
    name: 'The Dragon (Legally Distinct)', cost: { block: 60, slab: 10 },
    peril: 'A dragon guards the exit. The King owes it money.',
    layout: ['💰💰💰', { pin: 'A', label: 'holds the treasure' }, '🐉', { pin: 'B', label: 'holds the dragon' }, '🤴', { pin: 'C', label: 'the exit' }],
    answer: ['A', 'C'],
    win: 'The dragon is distracted by the gold. The King tiptoes out. Debt: still unpaid.',
    fails: {
      B: 'You released the dragon. Onto the King. Why would you do that.',
      C: 'The King walked out just as the dragon woke up. Should have distracted it first.',
    },
  },
  {
    name: 'Treasure Trap', cost: { block: 180, dust: 300 },
    peril: 'The King is surrounded by gold. He is fine with this. He should not be.',
    layout: ['💰💰💰💰', { pin: 'A', label: 'GOLD' }, '💎💎💎', { pin: 'B', label: 'MORE GOLD' }, '🤴', { pin: 'C', label: 'the King' }],
    answer: ['C'],
    win: 'The King leaves the treasure behind. Growth.',
    fails: {
      A: 'The King was crushed by his own wealth. Poetic, really.',
      B: 'The King was crushed by his own wealth. Poetic, really.',
    },
  },
  {
    name: 'The Throne Room', cost: { block: 600, gem: 10 },
    peril: 'The final room. The throne awaits. So does a very aggressive pop-up.',
    layout: ['👑 THRONE', { pin: 'A', label: 'Rescue the King' }, '🤴', { pin: 'B', label: '🔥 50% OFF GEMS 🔥' }],
    answer: ['A'],
    win: 'The King rises to his throne.',
    fails: { B: 'Purchase failed: insufficient dignity. Also, the King fell into a pit.' },
  },
];

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
