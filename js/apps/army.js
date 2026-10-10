// Last Army: Merge War — merge troops, then send the army at the next wave.
// Parody of the merge-army games whose ads show a crowd running through
// multiplier gates, and whose real game is timers and power packs.
//
// Recruits cost scrap and King's gold. Battles cost ⚡ energy. Losing a battle
// costs nothing else: your troops come home, no hospital timers. The "SO CLOSE!
// Buy a Power Pack" moment and running out of energy are errands in other games.
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

  let root, refs, sel, fighting = false, token = 0;

  const a = () => MB.app('army');
  const maxEnergy = () => BASE_ENERGY + MB.buildingLevel('bakery');

  function init() {
    const s = a();
    if (!s.board) { s.board = Array(SIZE).fill(0); s.board[0] = 1; s.board[1] = 1; s.wave = 1; s.energy = maxEnergy(); s.energyAt = 0; s.buff = 0; }
    while (s.energy < maxEnergy() && s.energyAt && Date.now() >= s.energyAt) {
      s.energy++;
      s.energyAt = s.energy < maxEnergy() ? s.energyAt + ENERGY_SECS * 1000 : 0;
    }
    if (s.energy < maxEnergy() && !s.energyAt) s.energyAt = Date.now() + ENERGY_SECS * 1000;
  }

  const armyPower = () => Math.round(a().board.reduce((sum, t) => sum + (t ? power(t) : 0), 0) * MB.appBonus('army') * (1 + (a().buff || 0)));

  // Crowd Run survivors arrive as recruits. If the barracks is full, the
  // lowest matching pair auto-merges to make room. Returns how many got in.
  MB.armyAddRecruits = function (n) {
    init();
    const b = a().board;
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
    if (root) render();
    return added;
  };

  MB.REWARDS.energy = r => {
    init();
    a().energy = Math.min(maxEnergy() + 5, a().energy + r.n);
    return `+${r.n} ⚡ in Last Army`;
  };
  MB.REWARDS.armyBuff = r => {
    init();
    a().buff = Math.max(a().buff || 0, r.pct / 100);
    return `+${r.pct}% power on your next Last Army battle`;
  };

  function energyPaywall() {
    MB.paywall({
      title: 'OUT OF ENERGY ⚡',
      item: '⚡⚡⚡⚡⚡ Energy Refill',
      price: '$2.99',
      options: [
        { metric: 'match3.win', amount: 1, reward: { type: 'energy', n: 3 }, label: '+3 ⚡' },
        { metric: 'screw.plate', amount: 8, reward: { type: 'energy', n: 1 }, label: '+1 ⚡' },
        { metric: 'merge.slab', amount: 2, reward: { type: 'energy', n: 2 }, label: '+2 ⚡' },
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
      ],
      wait: 'merge some more troops (it also works)',
    });
  }

  const mmss = secs => `${Math.floor(Math.max(0, secs) / 60)}:${String(Math.floor(Math.max(0, secs) % 60)).padStart(2, '0')}`;

  function render() {
    init();
    const s = a();
    const enemy = enemyPower(s.wave);
    root.innerHTML = `<div class="army">
      <div class="army-hud">
        <span>⚡ ${s.energy}/${maxEnergy()}</span>
        <span class="army-next small">${s.energyAt ? `next ⚡ ${mmss((s.energyAt - Date.now()) / 1000)}` : 'energy full'}</span>
      </div>
      <div class="army-vs">
        <div><div class="small">YOUR ARMY</div><b class="army-power">${MB.fmt(armyPower())}</b>${s.buff ? ` <span class="good small">+${Math.round(s.buff * 100)}%</span>` : ''}</div>
        <div class="vs">VS</div>
        <div><div class="small">WAVE ${s.wave}</div><b>${MB.fmt(enemy)}</b> ${ENEMIES[(s.wave - 1) % ENEMIES.length]}</div>
      </div>
      <div class="battlefield" hidden></div>
      <div class="army-grid"></div>
      <div class="row">
        <button class="btn recruit">Recruit · ${MB.costText(RECRUIT)}</button>
        <button class="btn primary fight">⚔️ Battle · 1 ⚡</button>
      </div>
      <p class="small center">Merge two of the same troop to promote it. Each tier is 3× stronger.<br>Losing costs nothing but the ⚡. Nobody goes to a hospital.</p>
    </div>`;
    refs = { grid: root.querySelector('.army-grid'), field: root.querySelector('.battlefield') };
    refs.grid.addEventListener('click', e => {
      const c = e.target.closest('.unit');
      if (c) tap(+c.dataset.i);
    });
    root.querySelector('.recruit').onclick = recruit;
    root.querySelector('.fight').onclick = fight;
    paintGrid();
  }

  function paintGrid() {
    const b = a().board;
    refs.grid.innerHTML = b.map((t, i) => `<button class="unit ${t ? 'filled' : ''} ${sel === i ? 'sel' : ''} tier${t}" data-i="${i}">
      ${t ? `<span class="u-e">${TIERS[t].e}</span><span class="u-n">${TIERS[t].n}</span>` : ''}</button>`).join('');
  }

  function tap(i) {
    if (fighting) return;
    const b = a().board, t = b[i];
    if (sel === null) { if (t) sel = i; }
    else if (sel === i) sel = null;
    else if (!t) { b[i] = b[sel]; b[sel] = 0; sel = null; }
    else if (t === b[sel] && t < MAX) {
      b[i] = t + 1;
      b[sel] = 0;
      sel = null;
      render();
      refs.grid.children[i].classList.add('pop');
      return;
    } else sel = i;
    paintGrid();
  }

  function recruit() {
    const b = a().board, empty = b.flatMap((t, i) => (t ? [] : [i]));
    if (!empty.length) { MB.toast('Barracks full! Merge some troops. (Extra slots are not for sale.)'); return; }
    if (!MB.pay(RECRUIT)) { MB.toast(`Recruits cost ${MB.costText(RECRUIT)}. The King pays in gold.`); return; }
    b[empty[0]] = 1;
    render();
  }

  async function fight() {
    if (fighting) return;
    init();
    const s = a();
    if (s.energy < 1) return energyPaywall();
    if (!s.board.some(Boolean)) { MB.toast('You have no army. Recruit someone. Anyone.'); return; }
    s.energy--;
    if (!s.energyAt) s.energyAt = Date.now() + ENERGY_SECS * 1000;
    fighting = true;
    const my = token;
    const mine = armyPower() * (0.9 + Math.random() * 0.2), theirs = enemyPower(s.wave);
    s.buff = 0;
    const units = s.board.filter(Boolean).sort((x, y) => y - x).slice(0, 6).map(t => TIERS[t].e).join('');
    const foes = ENEMIES[(s.wave - 1) % ENEMIES.length].repeat(Math.min(6, 2 + Math.floor(s.wave / 2)));
    refs.field.hidden = false;
    refs.field.innerHTML = `<div class="side mine">${units}</div><div class="clash">⚔️</div><div class="side foe">${foes}</div>
      <div class="bars"><div class="bar mine"><div></div></div><div class="bar foe"><div></div></div></div>`;
    const win = mine >= theirs;
    // Both bars drain; the loser's empties.
    const ratio = Math.min(mine, theirs) / Math.max(mine, theirs);
    await new Promise(r => setTimeout(r, 50));
    refs.field.querySelector('.bar.mine div').style.width = `${win ? 100 - 60 * ratio : 0}%`;
    refs.field.querySelector('.bar.foe div').style.width = `${win ? 0 : 100 - 60 * ratio}%`;
    await new Promise(r => setTimeout(r, 1500));
    fighting = false;
    if (my !== token) return;
    if (win) {
      const medals = Math.round((3 + s.wave) * MB.handMult('army'));
      MB.give({ medal: medals });
      s.crafts++;
      MB.track('army.win');
      MB.modal({
        title: `🏆 WAVE ${s.wave} DEFEATED`,
        body: `<p class="center reward">+${medals} 🎖️</p><p class="small center">Your troops are fine. They were always going to be fine.</p>`,
        onClose: () => { if (root) render(); },
      });
      s.wave++;
    } else {
      const missing = Math.ceil((theirs / mine - 1) * 100);
      render();
      if (missing <= 30) powerPaywall(missing);
      else MB.toast(`Defeat. You need about ${MB.fmt(theirs - mine)} more power. Merge up!`);
    }
  }

  MB.apps.army = {
    mount(el) { root = el; token++; fighting = false; sel = null; render(); },
    refresh() {
      if (!root || fighting) return;
      init();
      const s = a();
      const next = root.querySelector('.army-next');
      if (next) next.textContent = s.energyAt ? `next ⚡ ${mmss((s.energyAt - Date.now()) / 1000)}` : 'energy full';
      const hud = root.querySelector('.army-hud span');
      if (hud) hud.textContent = `⚡ ${s.energy}/${maxEnergy()}`;
    },
    unmount() { token++; root = refs = null; },
  };
})();
