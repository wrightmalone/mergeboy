// Last Army: Merge War — merge troops, then send the army at the next wave.
// Parody of the merge-army games whose ads show a crowd running through
// multiplier gates, and whose real game is timers and power packs.
//
// Recruits cost scrap and King's gold. Battles cost ⚡ energy. Losing a battle
// costs nothing else: your troops come home, no hospital timers. The "SO CLOSE!
// Buy a Power Pack" moment and running out of energy are errands in other games.
//
// The Drill Sergeant plays the same barracks: each order it merges a matching
// pair, recruits, or attacks when the army looks strong enough. You watch the
// battles play out. Upgrades: Boot Camp (recruits arrive as Guards), War Chest
// (+medals), and a faster Sergeant.
(function () {
  const MB = window.MB;
  const SIZE = 16, ENERGY_SECS = 6 * 60, BASE_ENERGY = 5;
  const RECRUIT = { scrap: 5, gold: 1 };
  const TIERS = [null,
    { e: '🧑‍🌾', n: 'Recruit' }, { e: '💂', n: 'Guard' }, { e: '🏹', n: 'Archer' }, { e: '🐎', n: 'Cavalry' },
    { e: '🚜', n: 'Tank (tractor)' }, { e: '🚁', n: 'Chopper' }, { e: '🛸', n: 'UFO?!' }];
  const MAX = TIERS.length - 1;
  const power = t => 10 * 3 ** (t - 1);
  const enemyPower = w => Math.round(30 * 1.5 ** (w - 1));
  const ENEMIES = ['🧟', '🧟‍♂️', '🧟‍♀️', '🦇', '👹', '🐉'];
  const SLEEP = ms => new Promise(r => setTimeout(r, ms));

  // --- Model ------------------------------------------------------------------------
  const a = () => MB.app('army');
  const maxEnergy = () => BASE_ENERGY + MB.buildingLevel('bakery');

  function init() {
    const s = a();
    if (!s.board) Object.assign(s, { board: Object.assign(Array(SIZE).fill(0), { 0: 1, 1: 1 }), wave: 1, energy: maxEnergy(), energyAt: 0, buff: 0 });
    while (s.energy < maxEnergy() && s.energyAt && Date.now() >= s.energyAt) {
      s.energy++;
      s.energyAt = s.energy < maxEnergy() ? s.energyAt + ENERGY_SECS * 1000 : 0;
    }
    if (s.energy < maxEnergy() && !s.energyAt) s.energyAt = Date.now() + ENERGY_SECS * 1000;
    return s;
  }

  const armyPower = () => Math.round(init().board.reduce((sum, t) => sum + (t ? power(t) : 0), 0) * MB.appBonus('army') * (1 + (a().buff || 0)));

  function recruit(by) {
    const b = init().board, slot = b.indexOf(0);
    if (slot < 0) return 'barracks full';
    if (!MB.pay(RECRUIT)) return `needs ${MB.costText(RECRUIT)}`;
    b[slot] = Math.random() < 0.2 * MB.up('army', 'drill') ? 2 : 1;
    MB.gameEvent('army', { type: 'board', pop: slot, by });
    return '';
  }

  function merge(i, j, by) {
    const b = init().board;
    if (i === j || !b[i] || b[i] !== b[j] || b[i] >= MAX) return false;
    b[j] = b[i] + 1;
    b[i] = 0;
    MB.gameEvent('army', { type: 'board', pop: j, by });
    return true;
  }

  // Resolve a battle now; the view animates it from the event.
  function battle(by) {
    const s = init();
    if (s.energy < 1) return 'no ⚡';
    if (!s.board.some(Boolean)) return 'no army';
    s.energy--;
    if (!s.energyAt) s.energyAt = Date.now() + ENERGY_SECS * 1000;
    const wave = s.wave, mine = armyPower() * (0.9 + Math.random() * 0.2), theirs = enemyPower(wave);
    s.buff = 0;
    const win = mine >= theirs;
    let medals = 0;
    if (win) {
      medals = Math.round((3 + wave) * (1 + 0.25 * MB.up('army', 'chest')) * MB.outMult('army'));
      MB.give({ medal: medals });
      s.wave++;
      if (by === 'you') {
        s.crafts++;
        MB.track('army.win');
      }
    }
    MB.gameEvent('army', { type: 'battle', wave, win, mine, theirs, medals, by });
    return '';
  }

  // Crowd Run survivors arrive as recruits. If the barracks is full, the
  // lowest matching pair auto-merges to make room. Returns how many got in.
  MB.armyAddRecruits = function (n) {
    const b = init().board;
    let added = 0;
    while (added < n) {
      let slot = b.indexOf(0);
      if (slot < 0) {
        let merged = false;
        for (let t = 1; t < MAX && !merged; t++) {
          const pair = b.flatMap((v, i) => (v === t ? [i] : [])).slice(0, 2);
          if (pair.length === 2) { b[pair[0]] = t + 1; b[pair[1]] = 0; merged = true; }
        }
        if (!merged) break;
        slot = b.indexOf(0);
      }
      b[slot] = 1;
      added++;
    }
    MB.gameEvent('army', { type: 'board' });
    return added;
  };

  // The Sergeant's next order: merge the lowest pair, else recruit, else attack
  // if the army is at least close to the enemy's power.
  function plan() {
    const s = init();
    for (let t = 1; t < MAX; t++) {
      const pair = s.board.flatMap((v, i) => (v === t ? [i] : [])).slice(0, 2);
      if (pair.length === 2) return { kind: 'merge', from: pair[0], to: pair[1] };
    }
    if (s.board.includes(0) && MB.can(RECRUIT)) return { kind: 'recruit' };
    if (armyPower() >= enemyPower(s.wave) * 0.95) return s.energy >= 1 ? { kind: 'battle' } : { kind: 'wait', why: 'no ⚡' };
    return { kind: 'wait', why: s.board.includes(0) ? `needs ${MB.costText(RECRUIT)}` : 'army too weak (needs a bigger merge)' };
  }

  MB.registerBot('army', {
    act() {
      const p = plan();
      if (p.kind === 'wait') return p.why;
      if (p.kind === 'merge') merge(p.from, p.to, 'bot');
      else if (p.kind === 'recruit') return recruit('bot') || undefined;
      else return battle('bot') || undefined;
    },
  });

  MB.REWARDS.energy = r => {
    init().energy = Math.min(maxEnergy() + 5, a().energy + r.n);
    return `+${r.n} ⚡ in Last Army`;
  };
  MB.REWARDS.armyBuff = r => {
    init().buff = Math.max(a().buff || 0, r.pct / 100);
    return `+${r.pct}% power on your next Last Army battle`;
  };

  const mmss = secs => `${Math.floor(Math.max(0, secs) / 60)}:${String(Math.floor(Math.max(0, secs) % 60)).padStart(2, '0')}`;

  function energyPaywall() {
    MB.paywall({
      title: 'OUT OF ENERGY ⚡',
      item: '⚡⚡⚡⚡⚡ Energy Refill',
      price: '$2.99',
      options: [
        { metric: 'match3.win', amount: 1, reward: { type: 'energy', n: 3 }, label: '+3 ⚡' },
        { metric: 'screw.plate', amount: 8, reward: { type: 'energy', n: 1 }, label: '+1 ⚡' },
        { metric: 'merge.slab', amount: 2, reward: { type: 'energy', n: 2 }, label: '+2 ⚡' },
        { metric: 'park.win', amount: 1, reward: { type: 'energy', n: 3 }, label: '+3 ⚡' },
      ],
      wait: `wait ${mmss((a().energyAt - Date.now()) / 1000)} for the next ⚡`,
    });
  }

  function powerPaywall(missing) {
    MB.paywall({
      title: 'SO CLOSE!!! 😤',
      item: `💪 Power Pack (+${missing}% power)`,
      price: '$4.99 <small>(was $49.99!!)</small>',
      options: [
        { metric: 'slicer.slab', amount: 3, reward: { type: 'armyBuff', pct: 25 }, label: '+25% power next battle' },
        { metric: 'king.win', amount: 1, reward: { type: 'armyBuff', pct: 50 }, label: '+50% power next battle' },
        { metric: 'mob.wave', amount: 2, reward: { type: 'armyBuff', pct: 30 }, label: '+30% power next battle' },
      ],
      wait: 'merge some more troops (it also works)',
    });
  }

  // --- View -------------------------------------------------------------------------
  let root, refs, sel, token = 0, queue = [], playing = false;

  function render() {
    const s = init(), enemy = enemyPower(s.wave);
    root.innerHTML = `<div class="army">
      <div class="army-hud">
        <span class="army-energy">⚡ ${s.energy}/${maxEnergy()}</span>
        <span class="army-next small">${s.energyAt ? `next ⚡ ${mmss((s.energyAt - Date.now()) / 1000)}` : 'energy full'}</span>
      </div>
      <div class="army-vs">
        <div><div class="small">YOUR ARMY</div><b class="army-power">${MB.fmt(armyPower())}</b>${s.buff ? ` <span class="good small">+${Math.round(s.buff * 100)}%</span>` : ''}</div>
        <div class="vs">VS</div>
        <div><div class="small">WAVE ${s.wave}</div><b>${MB.fmt(enemy)}</b> ${ENEMIES[(s.wave - 1) % ENEMIES.length]}</div>
      </div>
      <div class="battlefield" hidden></div>
      <div class="army-wrap"><div class="army-grid"></div><div class="bot-cursor" hidden><span>🫡</span><i></i></div></div>
      <div class="row">
        <button class="btn recruit">Recruit · ${MB.costText(RECRUIT)}</button>
        <button class="btn primary fight">⚔️ Battle · 1 ⚡</button>
      </div>
      <p class="small center">Merge two of the same troop to promote it. Each tier is 3× stronger.<br>Losing costs nothing but the ⚡. Nobody goes to a hospital.</p>
    </div>`;
    refs = { grid: root.querySelector('.army-grid'), field: root.querySelector('.battlefield'), wrap: root.querySelector('.army-wrap'), cursor: root.querySelector('.bot-cursor'), fightBtn: root.querySelector('.fight') };
    refs.grid.addEventListener('click', e => {
      const c = e.target.closest('.unit');
      if (c) tap(+c.dataset.i);
    });
    root.querySelector('.recruit').onclick = () => {
      const why = recruit('you');
      if (why === 'barracks full') MB.toast('Barracks full! Merge some troops. (Extra slots are not for sale.)');
      else if (why) MB.toast(`Recruits cost ${MB.costText(RECRUIT)}. The King pays in gold.`);
    };
    refs.fightBtn.onclick = () => {
      if (playing) return;
      const why = battle('you');
      if (why === 'no ⚡') energyPaywall();
      else if (why) MB.toast('You have no army. Recruit someone. Anyone.');
    };
    paintGrid();
  }

  function paintGrid(pop) {
    const b = init().board, p = MB.hasBot('army') ? plan() : null;
    refs.grid.innerHTML = b.map((t, i) => `<button class="unit ${t ? 'filled' : ''} ${sel === i ? 'sel' : ''} ${p?.kind === 'merge' && p.from === i ? 'bot-sel' : ''} ${pop === i ? 'pop' : ''} tier${t}" data-i="${i}">
      ${t ? `<span class="u-e">${TIERS[t].e}</span><span class="u-n">${TIERS[t].n}</span>` : ''}</button>`).join('');
  }

  function tap(i) {
    if (playing) return;
    const b = init().board, t = b[i];
    if (sel === null) { if (t) sel = i; }
    else if (sel === i) sel = null;
    else if (!t) { b[i] = b[sel]; b[sel] = 0; sel = null; }
    else if (t === b[sel] && merge(sel, i, 'you')) { sel = null; return; }
    else sel = i;
    paintGrid();
  }

  async function animateBattle(evt) {
    const s = init();
    const units = s.board.filter(Boolean).sort((x, y) => y - x).slice(0, 6).map(t => TIERS[t].e).join('') || '🧑‍🌾';
    const foes = ENEMIES[(evt.wave - 1) % ENEMIES.length].repeat(Math.min(6, 2 + Math.floor(evt.wave / 2)));
    refs.field.hidden = false;
    refs.field.innerHTML = `<div class="side mine">${units}</div><div class="clash">⚔️</div><div class="side foe">${foes}</div>
      <div class="bars"><div class="bar mine"><div></div></div><div class="bar foe"><div></div></div></div>`;
    const ratio = Math.min(evt.mine, evt.theirs) / Math.max(evt.mine, evt.theirs);
    await SLEEP(50);
    if (!refs) return;
    refs.field.querySelector('.bar.mine div').style.width = `${evt.win ? 100 - 60 * ratio : 0}%`;
    refs.field.querySelector('.bar.foe div').style.width = `${evt.win ? 0 : 100 - 60 * ratio}%`;
    await SLEEP(1500);
    if (!refs) return;
    if (evt.win && evt.by === 'you') {
      MB.modal({
        title: `🏆 WAVE ${evt.wave} DEFEATED`,
        body: `<p class="center reward">+${evt.medals} 🎖️</p><p class="small center">Your troops are fine. They were always going to be fine.</p>`,
      });
    } else if (evt.win) {
      MB.toast(`🫡 The Sergeant beat wave ${evt.wave}: +${evt.medals} 🎖️`);
    } else if (evt.by === 'you') {
      const missing = Math.ceil((evt.theirs / evt.mine - 1) * 100);
      if (missing <= 30) powerPaywall(missing);
      else MB.toast(`Defeat. You need about ${MB.fmt(evt.theirs - evt.mine)} more power. Merge up!`);
    } else {
      MB.toast(`🫡 The Sergeant lost to wave ${evt.wave}. Nobody was hurt. He’s regrouping.`);
    }
    render();
  }

  async function drain() {
    if (playing) return;
    playing = true;
    MB.busy.army = true;
    const my = token;
    while (queue.length && my === token && root) {
      const evt = queue.shift();
      if (evt.type === 'battle') {
        await animateBattle(evt);
      } else {
        render();
        paintGrid(evt.pop);
      }
    }
    playing = false;
    MB.busy.army = false;
  }

  MB.apps.army = {
    mount(el) { root = el; token++; queue = []; playing = false; MB.busy.army = false; sel = null; render(); },

    onEvent(evt) {
      queue.push(evt);
      drain();
    },

    update() {
      if (!refs || playing) { if (refs) refs.cursor.hidden = true; return; }
      const p = MB.hasBot('army') ? plan() : null;
      const el = p?.kind === 'merge' ? refs.grid.children[p.to] : p?.kind === 'recruit' ? refs.grid.children[init().board.indexOf(0)] : p?.kind === 'battle' ? refs.fightBtn : null;
      refs.cursor.hidden = !el;
      if (el) {
        const box = refs.wrap.getBoundingClientRect(), r = el.getBoundingClientRect();
        refs.cursor.style.left = `${r.left - box.left + r.width / 2}px`;
        refs.cursor.style.top = `${r.top - box.top + r.height / 2}px`;
        refs.cursor.style.setProperty('--p', MB.botProgress('army'));
      }
    },

    refresh() {
      if (!root || playing) return;
      const s = init();
      const next = root.querySelector('.army-next');
      if (next) next.textContent = s.energyAt ? `next ⚡ ${mmss((s.energyAt - Date.now()) / 1000)}` : 'energy full';
      const hud = root.querySelector('.army-energy');
      if (hud) hud.textContent = `⚡ ${s.energy}/${maxEnergy()}`;
    },

    unmount() { token++; MB.busy.army = false; root = refs = null; },
  };
})();
