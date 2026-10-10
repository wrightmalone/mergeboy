// Static game data: resources, the apps on the phone (with their bots and
// upgrades), buildings, errand metrics, fake ads, crate prizes and store offers.
// The King's levels live in levels.js. Everything tunable lives here.
window.MB = { apps: {} };

MB.RES = {
  scrap: { name: 'Scrap', icon: '🔩' },
  dust: { name: 'Dust', icon: '💨' },
  slab: { name: 'Slabs', icon: '🧱' },
  block: { name: 'Blocks', icon: '🟫' },
  gold: { name: 'Gold', icon: '💰' },
  star: { name: 'Stars', icon: '⭐' },
  medal: { name: 'Medals', icon: '🎖️' },
  bone: { name: 'Bones', icon: '🦴' },
  potion: { name: 'Potions', icon: '🧪' },
  key: { name: 'Keys', icon: '🔑' },
  gem: { name: 'Gems', icon: '💎' },
};

// The one real-money thing in the game: an optional tip jar. Empty = "coming soon".
MB.COFFEE_URL = '';

// Every game on the phone.
//
// Games with a `bot` can hire one once you've mastered them by hand. The bot
// really plays the game, one move every `bot.every` seconds, on the same board
// you see, so you can watch it (and it keeps playing while the app is closed).
// It starts slow on purpose. Speed upgrades never take it below `bot.min`
// seconds a move: roughly as fast as the game can visibly play out.
//
// `upgrades` make the game (and its bot) better. They are always paid for with
// OTHER games' currencies, so every game keeps feeding the others:
//   { id, name, desc, max, cost: [[resource, base, fromLevel], ...] }
// A cost line kicks in at `fromLevel` and grows 1.6x per level after that.
// Every bot game has `bot` (hire) and `speed` (each level: moves 20% sooner);
// the rest are specific to the game and read by its code with MB.up(app, id).
// `install` is the "download size" (null = preinstalled).
MB.APPS = {
  screw: {
    name: 'Screw Loose 3D', icon: '🪛', color: 'linear-gradient(135deg,#ff6a3d,#ffb347)',
    tagline: '🔥 ONLY 1% CAN BEAT LEVEL 3!! 🔥', rating: '4.8',
    install: null,
    mastery: 12, masteryUnit: 'plates dropped',
    bot: { name: 'Screwbot', icon: '🤖', every: 15, min: 0.5, verb: 'unscrews one free screw' },
    upgrades: [
      { id: 'bot', name: 'Hire Screwbot', desc: 'A bot that unscrews one screw every 15s. Slowly. So slowly.', max: 1, cost: [['dust', 5, 0]] },
      { id: 'speed', name: 'Oiled Servos', desc: 'Screwbot moves 20% sooner.', max: 12, cost: [['dust', 8, 0], ['slab', 1, 2], ['potion', 2, 5]] },
      { id: 'plates', name: 'Bigger Boards', desc: '+1 plate per board. The clear bonus grows with every plate.', max: 5, cost: [['block', 3, 0], ['key', 2, 2]] },
      { id: 'golden', name: 'Golden Plates', desc: '+8% chance a plate is golden and pays ×3.', max: 5, cost: [['gold', 5, 0], ['bone', 3, 2]] },
      { id: 'bonus', name: 'Bonus Boards', desc: 'Every few boards is a ✨ bonus board paying ×4 (more often each level).', max: 3, cost: [['star', 5, 0], ['medal', 3, 1]] },
    ],
  },
  grinder: {
    name: 'Grind the Thing', icon: '⚙️', color: 'linear-gradient(135deg,#5a5f73,#9aa3b5)',
    tagline: 'Incremental. Satisfying. Forever. 😌', rating: '4.6',
    install: { scrap: 20 },
    mastery: 8, masteryUnit: 'batches ground',
    bot: { name: 'Grindbot', icon: '🦾', every: 20, min: 1, verb: 'grinds one batch (2 🔩 → 💨)' },
    upgrades: [
      { id: 'bot', name: 'Hire Grindbot', desc: 'Holds the button for you. One batch every 20s.', max: 1, cost: [['scrap', 30, 0]] },
      { id: 'speed', name: 'Stronger Grip', desc: 'Grindbot moves 20% sooner.', max: 12, cost: [['scrap', 25, 0], ['block', 2, 2], ['key', 2, 5]] },
      { id: 'yield', name: 'Finer Grit', desc: '+1 💨 per batch.', max: 3, cost: [['slab', 2, 0], ['bone', 3, 1]] },
      { id: 'zone', name: 'Wider Sweet Spot', desc: 'The satisfying zone gets wider (for your hands).', max: 3, cost: [['star', 3, 0]] },
    ],
  },
  merge: {
    name: 'Merge Boy', icon: '👦', color: 'linear-gradient(135deg,#7b4dff,#d36bff)',
    tagline: 'Merge to unlock the TRUTH 👀', rating: '4.9',
    install: { dust: 10 },
    mastery: 3, masteryUnit: 'slabs merged',
    bot: { name: 'Merge Bot', icon: '🤖', every: 12, min: 0.6, verb: 'makes one move (spawn, merge or collect)' },
    upgrades: [
      { id: 'bot', name: 'Hire Merge Bot', desc: 'Spawns, merges and collects. One move every 12s.', max: 1, cost: [['scrap', 40, 0]] },
      { id: 'speed', name: 'Quick Fingers', desc: 'Merge Bot moves 20% sooner.', max: 12, cost: [['scrap', 30, 0], ['block', 3, 2], ['potion', 2, 5]] },
      { id: 'clumps', name: 'Clumpier Dust', desc: '+20% chance a spawn is already a Clump.', max: 4, cost: [['block', 4, 0], ['gold', 5, 2]] },
      { id: 'yield', name: 'Dense Slabs', desc: '+1 🧱 per collected SLAB.', max: 2, cost: [['potion', 2, 0], ['medal', 3, 1]] },
    ],
  },
  slicer: {
    name: 'Slice It All!', icon: '🔪', color: 'linear-gradient(135deg,#00b4d8,#48e5c2)',
    tagline: 'So satisfying!!! 🤤 (results may vary)', rating: '4.7',
    install: { slab: 2 },
    mastery: 4, masteryUnit: 'slabs sliced',
    bot: { name: 'Knife Bot', icon: '🤖', every: 10, min: 0.6, verb: 'makes one cut (not very accurately)' },
    upgrades: [
      { id: 'bot', name: 'Hire Knife Bot', desc: 'Makes one cut every 10s. Aims vaguely.', max: 1, cost: [['slab', 3, 0]] },
      { id: 'speed', name: 'Sharper Blade', desc: 'Knife Bot cuts 20% sooner.', max: 12, cost: [['slab', 2, 0], ['gold', 4, 2], ['bone', 3, 5]] },
      { id: 'steady', name: 'Steady Hand', desc: 'Knife Bot lands more PERFECT cuts.', max: 5, cost: [['dust', 15, 0], ['star', 4, 2]] },
      { id: 'cuts', name: 'More Cuts', desc: '+1 cut per slab (+1 🟫 base).', max: 3, cost: [['scrap', 50, 0], ['key', 3, 1]] },
    ],
  },
  king: {
    name: 'Rescue the King', icon: '🤴', color: 'linear-gradient(135deg,#ffcf3f,#ff8a00)',
    tagline: 'He needs YOUR help!!! 😱', rating: '4.9',
    install: null,
    mastery: 3, masteryUnit: 'levels won',
    bot: { name: 'Knight', icon: '🗡️', every: 8, min: 3, verb: 'pulls one pin on a cleared stage' },
    upgrades: [
      { id: 'bot', name: 'Hire a Knight', desc: 'Replays your cleared stages for gold, one pin every 8s. Keeps half (horse).', max: 1, cost: [['block', 10, 0]] },
      { id: 'speed', name: 'Swift Steed', desc: 'The Knight pulls 20% sooner.', max: 12, cost: [['block', 8, 0], ['medal', 3, 2], ['potion', 3, 5]] },
      { id: 'maps', name: 'Treasure Maps', desc: '+25% 💰 from every stage.', max: 5, cost: [['slab', 3, 0], ['star', 5, 2]] },
    ],
  },
  match3: {
    name: 'Match Royale', icon: '🍬', color: 'linear-gradient(135deg,#ff5fa2,#a855f7)',
    tagline: '🍭 LEVEL 2 IS IMPOSSIBLE!! (it is not)', rating: '4.8',
    install: { scrap: 40 },
    mastery: 3, masteryUnit: 'levels cleared',
    bot: { name: 'Candy Bot', icon: '🤖', every: 6, min: 1.2, verb: 'makes one swap' },
    upgrades: [
      { id: 'bot', name: 'Hire Candy Bot', desc: 'Makes one swap every 6s. Bots don’t use lives (they’re immortal).', max: 1, cost: [['gold', 10, 0]] },
      { id: 'speed', name: 'Sugar Rush', desc: 'Candy Bot swaps 20% sooner.', max: 12, cost: [['gold', 8, 0], ['bone', 3, 2], ['key', 3, 5]] },
      { id: 'smarts', name: 'Star Sense', desc: 'Candy Bot looks for ⭐ matches more often.', max: 4, cost: [['dust', 20, 0], ['key', 3, 2]] },
      { id: 'moves', name: 'Extra Moves', desc: '+3 moves on every level.', max: 3, cost: [['block', 5, 0], ['medal', 3, 1]] },
    ],
  },
  army: {
    name: 'Last Army: Merge War', icon: '🪖', color: 'linear-gradient(135deg,#4d7c0f,#a3a33a)',
    tagline: '⚔️ 99% CAN’T BEAT WAVE 5!! ⚔️', rating: '4.4',
    install: { gold: 20 },
    mastery: 3, masteryUnit: 'battles won',
    bot: { name: 'Drill Sergeant', icon: '🫡', every: 10, min: 1.5, verb: 'recruits, merges or attacks' },
    upgrades: [
      { id: 'bot', name: 'Hire Drill Sergeant', desc: 'Recruits, merges and battles. One order every 10s.', max: 1, cost: [['star', 8, 0]] },
      { id: 'speed', name: 'Louder Whistle', desc: 'The Sergeant acts 20% sooner.', max: 12, cost: [['star', 6, 0], ['potion', 3, 2], ['bone', 4, 5]] },
      { id: 'drill', name: 'Boot Camp', desc: '+20% chance a recruit arrives as a Guard.', max: 4, cost: [['scrap', 60, 0], ['key', 3, 2]] },
      { id: 'chest', name: 'War Chest', desc: '+25% 🎖️ per win.', max: 5, cost: [['gold', 10, 0], ['bone', 4, 2]] },
    ],
  },
  mob: {
    name: 'Mob Gates 3D', icon: '🚪', color: 'linear-gradient(135deg,#2563eb,#ef4444)',
    tagline: '🔥 ONLY 1% CAN STOP THE HORDE!! 🔥', rating: '4.2',
    install: { medal: 8 },
    mastery: 3, masteryUnit: 'waves stopped',
    bot: { name: 'Auto-Cannon', icon: '🎯', every: 1.5, min: 0.15, verb: 'aims and fires' },
    upgrades: [
      { id: 'bot', name: 'Auto-Cannon', desc: 'Aims and fires on its own. Fires every 1.5s. Aims like the ad.', max: 1, cost: [['medal', 5, 0]] },
      { id: 'speed', name: 'Rapid Fire', desc: 'Your cannon (and the Auto-Cannon) fires 20% faster.', max: 12, cost: [['medal', 4, 0], ['dust', 20, 2], ['star', 5, 5]] },
      { id: 'aim', name: 'Gate Sense', desc: 'The Auto-Cannon aims for the best gate more often.', max: 4, cost: [['star', 5, 0], ['slab', 3, 2]] },
      { id: 'gates', name: 'Better Gates', desc: 'Gates multiply more (×2 becomes ×3…).', max: 3, cost: [['gold', 8, 0], ['block', 6, 1]] },
      { id: 'squad', name: 'Bigger Shots', desc: '+1 unit per shot.', max: 3, cost: [['scrap', 80, 0], ['potion', 3, 1]] },
    ],
  },
  sort: {
    name: 'Potion Sort', icon: '🧪', color: 'linear-gradient(135deg,#06b6d4,#a855f7)',
    tagline: '🧪 99% CAN’T SORT LEVEL 4!! (relaxing)', rating: '4.7',
    install: { bone: 8 },
    mastery: 3, masteryUnit: 'puzzles sorted',
    bot: { name: 'Pour Bot', icon: '🤖', every: 6, min: 1, verb: 'pours one vial' },
    upgrades: [
      { id: 'bot', name: 'Hire Pour Bot', desc: 'Pours one vial every 6s. Not always into the right one.', max: 1, cost: [['bone', 5, 0]] },
      { id: 'speed', name: 'Steady Pour', desc: 'Pour Bot pours 20% sooner.', max: 12, cost: [['bone', 4, 0], ['scrap', 50, 2], ['medal', 3, 5]] },
      { id: 'brains', name: 'Chemistry Degree', desc: 'Pour Bot makes smarter pours.', max: 4, cost: [['star', 5, 0], ['gold', 8, 2]] },
      { id: 'colors', name: 'More Colors', desc: '+1 color per puzzle (+1 🧪 per vial sorted).', max: 3, cost: [['slab', 3, 0], ['key', 3, 1]] },
    ],
  },
  park: {
    name: 'Car Park Jam', icon: '🚗', color: 'linear-gradient(135deg,#f97316,#64748b)',
    tagline: '🚗 ONLY 2% CAN ESCAPE THE CAR PARK!!', rating: '4.5',
    install: { potion: 8 },
    mastery: 3, masteryUnit: 'lots emptied',
    bot: { name: 'Valet Bot', icon: '🤵', every: 8, min: 1, verb: 'tries to drive one car out' },
    upgrades: [
      { id: 'bot', name: 'Hire Valet Bot', desc: 'Tries one car every 8s. Sometimes the wrong one.', max: 1, cost: [['potion', 5, 0]] },
      { id: 'speed', name: 'Valet Training', desc: 'Valet Bot tries 20% sooner.', max: 12, cost: [['potion', 4, 0], ['block', 4, 2], ['star', 5, 5]] },
      { id: 'eyes', name: 'Parking Sensors', desc: 'Valet Bot picks cars that can actually leave more often.', max: 4, cost: [['medal', 4, 0], ['dust', 20, 2]] },
      { id: 'lot', name: 'Bigger Lots', desc: '+2 cars per lot (+1 🔑 per car).', max: 3, cost: [['gold', 8, 0], ['bone', 4, 1]] },
    ],
  },
  crowd: {
    name: 'Crowd Run 3D', icon: '🏃', color: 'linear-gradient(135deg,#0ea5e9,#f43f5e)',
    tagline: '🏃 ONLY GENIUSES PICK THE RIGHT GATE!!', rating: '4.3',
    install: { medal: 3 },
    mastery: 3, masteryUnit: 'bosses beaten',
    bot: { name: 'Run Bot', icon: '🤖', every: 5, min: 1, verb: 'picks one gate' },
    upgrades: [
      { id: 'bot', name: 'Hire Run Bot', desc: 'Picks a gate every 5s. Can’t do maths.', max: 1, cost: [['medal', 3, 0]] },
      { id: 'speed', name: 'Running Shoes', desc: 'Run Bot picks 20% sooner.', max: 12, cost: [['bone', 3, 0], ['dust', 15, 2]] },
      { id: 'sense', name: 'Times Tables', desc: 'Run Bot picks the better gate more often.', max: 4, cost: [['star', 4, 0], ['potion', 2, 2]] },
      { id: 'start', name: 'Bigger Start', desc: '+5 runners at the start of every run.', max: 4, cost: [['scrap', 40, 0], ['key', 2, 2]] },
    ],
  },
  spin: {
    name: 'Goose Master', icon: '🎰', color: 'linear-gradient(135deg,#f59e0b,#dc2626)',
    tagline: '🎰 SPIN TO WIN!! (it is a slot machine. we told you.)', rating: '3.9',
    install: { star: 3 },
    mastery: 5, masteryUnit: 'spins',
    bot: { name: 'Spin Bot', icon: '🤖', every: 10, min: 2, verb: 'spends one of your spins' },
    upgrades: [
      { id: 'bot', name: 'Hire Spin Bot', desc: 'Pulls the lever for you when you have spins. Still only spins you earned.', max: 1, cost: [['star', 10, 0]] },
      { id: 'speed', name: 'Lever Grease', desc: 'Spin Bot pulls 20% sooner.', max: 6, cost: [['bone', 3, 0], ['gold', 8, 2]] },
    ],
  },
  board: {
    name: 'Landlord GO!', icon: '🎲', color: 'linear-gradient(135deg,#16a34a,#facc15)',
    tagline: '🎲 ROLL THE DICE!! (dice sold separately) (they are not sold)', rating: '4.1',
    install: { block: 15, gold: 10 },
    mastery: 5, masteryUnit: 'rolls',
    bot: { name: 'Roll Bot', icon: '🤖', every: 10, min: 2, verb: 'rolls one of your dice' },
    upgrades: [
      { id: 'bot', name: 'Hire Roll Bot', desc: 'Rolls for you when you have dice. Still only dice you earned.', max: 1, cost: [['block', 20, 0]] },
      { id: 'speed', name: 'Loaded Wrist', desc: 'Roll Bot rolls 20% sooner. (The dice are not loaded.)', max: 6, cost: [['potion', 3, 0], ['medal', 4, 2]] },
    ],
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

// Apps that can hire a bot, in the order bots take their turns.
MB.BOT_APPS = Object.keys(MB.APPS).filter(id => MB.APPS[id].bot);

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
  treasury: { name: 'Treasury', icon: '🏦', cost: { gold: 20, star: 5 }, secs: 30, max: 10, boosts: ['king', 'match3', 'board'], perLevel: 0.15 },
  barracks: { name: 'Barracks', icon: '⚔️', cost: { medal: 6, block: 10 }, secs: 30, max: 10, boosts: ['army', 'mob', 'crowd'], perLevel: 0.15 },
  apothecary: { name: 'Apothecary', icon: '⚗️', cost: { potion: 6, gold: 10 }, secs: 30, max: 10, boosts: ['sort', 'park'], perLevel: 0.15 },
  bakery: { name: 'Candy Factory', icon: '🍭', cost: { star: 15, dust: 20 }, secs: 30, max: 10,
    desc: '+1 max ❤️ in Match Royale and +1 max ⚡ in Last Army per level.' },
  garage: { name: 'Bot Garage', icon: '🔋', cost: { slab: 5, gold: 15, key: 3 }, secs: 30, max: 5,
    desc: 'Every bot moves 10% sooner per level.' },
};

// Things you can be asked to do in a game, used by errands (see errands.js).
// Only hand-played actions count; bots don't run your errands.
MB.METRICS = {
  'screw.plate': { app: 'screw', text: n => `Drop ${n} plate${n > 1 ? 's' : ''} in Screw Loose 3D` },
  'grinder.batch': { app: 'grinder', text: n => `Grind ${n} batch${n > 1 ? 'es' : ''} in Grind the Thing` },
  'merge.slab': { app: 'merge', text: n => `Merge ${n} slab${n > 1 ? 's' : ''} in Merge Boy` },
  'slicer.slab': { app: 'slicer', text: n => `Slice ${n} slab${n > 1 ? 's' : ''} in Slice It All!` },
  'king.win': { app: 'king', text: n => `Win ${n} Rescue the King stage${n > 1 ? 's' : ''} (replays count)` },
  'match3.win': { app: 'match3', text: n => `Clear ${n} Match Royale level${n > 1 ? 's' : ''}` },
  'army.win': { app: 'army', text: n => `Win ${n} battle${n > 1 ? 's' : ''} in Last Army` },
  'board.lap': { app: 'board', text: n => `Pass GO ${n} time${n > 1 ? 's' : ''} in Landlord GO!` },
  'mob.wave': { app: 'mob', text: n => `Stop ${n} wave${n > 1 ? 's' : ''} in Mob Gates 3D` },
  'sort.win': { app: 'sort', text: n => `Sort ${n} puzzle${n > 1 ? 's' : ''} in Potion Sort` },
  'park.win': { app: 'park', text: n => `Empty ${n} car park${n > 1 ? 's' : ''} in Car Park Jam` },
  'crowd.win': { app: 'crowd', text: n => `Beat ${n} boss crowd${n > 1 ? 's' : ''} in Crowd Run 3D` },
  'base.build': { app: 'base', text: n => `Finish ${n} upgrade${n > 1 ? 's' : ''} in Clash of Kingdoms` },
};

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
  { w: 7, rarity: 'Epic', name: 'Golden Wrench', icon: '🔧', wrench: true },
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
