// Landlord GO! — a board-game lap, parodying the dice-and-landmarks games.
// Dice never regenerate and are never sold: you earn them by winning in the
// other games. The roll multiplier stops at ×3 and says what it does. Heists
// only rob the goose. Sticker duplicates trade in, so the album always finishes.
// Landing on tiles pays out the factory's resources; landmarks (paid in blocks
// and gold) raise payouts and, once all four stand, move you to a richer board.
// Roll Bot rolls for you, but only ever spends dice you earned.
(function () {
  const MB = window.MB;
  const SIDE = 6, START_DICE = 10;
  const SLEEP = ms => new Promise(r => setTimeout(r, ms));

  // 20 tiles around a 6×6 square, starting at GO in the bottom-right corner.
  const TILES = [
    { t: 'go', e: '🏁', n: 'GO' },
    { t: 'prop', e: '🔩', res: 'scrap', amt: 6 },
    { t: 'chance', e: '❓', n: 'Chance' },
    { t: 'prop', e: '🔩', res: 'scrap', amt: 6 },
    { t: 'tax', e: '🧾', n: 'Tax' },
    { t: 'jail', e: '🚔', n: 'Jail' },
    { t: 'prop', e: '💨', res: 'dust', amt: 3 },
    { t: 'sticker', e: '🃏', n: 'Stickers' },
    { t: 'prop', e: '💨', res: 'dust', amt: 3 },
    { t: 'heist', e: '🏦', n: 'Goose Bank' },
    { t: 'parking', e: '🅿️', n: 'Free Parking' },
    { t: 'prop', e: '🧱', res: 'slab', amt: 0.5 },
    { t: 'chance', e: '❓', n: 'Chance' },
    { t: 'prop', e: '🧱', res: 'slab', amt: 0.5 },
    { t: 'heist', e: '🏦', n: 'Goose Bank' },
    { t: 'gojail', e: '👮', n: 'Go to Jail' },
    { t: 'prop', e: '🟫', res: 'block', amt: 2 },
    { t: 'sticker', e: '🃏', n: 'Stickers' },
    { t: 'prop', e: '💰', res: 'gold', amt: 3 },
    { t: 'tax', e: '🧾', n: 'Tax' },
  ];
  const JAIL = 5;
  const LANDMARKS = [
    { e: '🏠', n: 'Goose Cottage' }, { e: '🏨', n: 'Hotel Honk' }, { e: '🗼', n: 'Honk Tower' }, { e: '🏟️', n: 'Goose Stadium' },
  ];
  const STICKERS = [
    { e: '🦆', w: 10 }, { e: '🐸', w: 10 }, { e: '🦔', w: 10 }, { e: '🦦', w: 8 }, { e: '🦥', w: 8 }, { e: '🦩', w: 6 },
    { e: '🦚', w: 3, gold: true }, { e: '🦜', w: 3, gold: true }, { e: '🪿', w: 2, gold: true },
  ];
  const DUPES_PER_PICK = 3;
  const CHANCE = [
    { text: 'The goose sends a fruit basket. 🧺', give: { star: 3 } },
    { text: 'Bank error in YOUR favor (for once).', give: { gold: 10 } },
    { text: 'You found a screw on the street.', give: { scrap: 10 } },
    { text: 'Your bots unionized. Good for them.', give: { gem: 1 } },
    { text: 'Sticker pack in the mail!', stickers: 2 },
    { text: 'Roll again, on the house.', dice: 1 },
  ];
  // Dice come from winning (hand-played) in other games.
  const DICE_SOURCES = { 'match3.win': 3, 'army.win': 3, 'king.win': 3, 'crowd.win': 2, 'base.build': 2, 'merge.slab': 1, 'slicer.slab': 1 };

  let root, rolling = false, token = 0;
  const a = () => MB.app('board');
  function init() {
    const s = a();
    if (s.dice === undefined) Object.assign(s, { dice: START_DICE, pos: 0, mult: 1, level: 1, built: 0, laps: 0, album: {}, dupes: 0, albums: 0 });
  }
  const payMult = () => a().level * (1 + 0.25 * a().built) * a().mult * MB.outMult('board');
  const landmarkCost = i => ({ block: 20 * 2 ** i * a().level, gold: 15 * 2 ** i * a().level });

  MB.onTrack(metric => {
    if (!DICE_SOURCES[metric] || !a().installed) return;
    init();
    a().dice += DICE_SOURCES[metric];
  });

  MB.REWARDS.dice = r => {
    init();
    a().dice += r.n;
    return `+${r.n} 🎲 in Landlord GO!`;
  };

  function dicePaywall() {
    MB.paywall({
      title: 'OUT OF DICE 🎲',
      item: '🎲 ×50 dice',
      price: '$4.99 <small>(roll ×1000 not included)</small>',
      options: [
        { metric: 'match3.win', amount: 1, reward: { type: 'dice', n: 5 }, label: '+5 🎲' },
        { metric: 'army.win', amount: 1, reward: { type: 'dice', n: 5 }, label: '+5 🎲' },
        { metric: 'screw.plate', amount: 8, reward: { type: 'dice', n: 2 }, label: '+2 🎲' },
      ],
      wait: 'win anything, anywhere: every win elsewhere earns dice',
    });
  }

  // --- Stickers ---------------------------------------------------------------------
  function pullSticker() {
    const total = STICKERS.reduce((n, x) => n + x.w, 0);
    let r = Math.random() * total;
    return STICKERS.find(x => (r -= x.w) < 0) || STICKERS[0];
  }

  function giveStickers(n) {
    const s = a(), got = [];
    for (let i = 0; i < n; i++) {
      const st = pullSticker();
      got.push(st.e);
      if (s.album[st.e]) s.dupes++;
      else s.album[st.e] = 1;
    }
    checkAlbum();
    return got.join('');
  }

  function checkAlbum() {
    const s = a();
    if (!STICKERS.every(x => s.album[x.e])) return;
    s.albums++;
    s.album = {};
    MB.give({ gem: 10, star: 30 });
    MB.gameEvent('board', { type: 'album' });
  }

  function pickSticker(e) {
    const s = a();
    if (s.dupes < DUPES_PER_PICK || s.album[e]) return;
    s.dupes -= DUPES_PER_PICK;
    s.album[e] = 1;
    MB.toast(`🃏 Traded ${DUPES_PER_PICK} duplicates for ${e}. No gold-sticker lottery here.`);
    checkAlbum();
    render();
  }

  // --- Board ------------------------------------------------------------------------
  // Grid cell (x, y) for tile i, walking from the bottom-right corner clockwise
  // in screen terms: left along the bottom, up the left side, right along the
  // top, then down the right side.
  function cellOf(i) {
    const n = SIDE - 1;
    if (i <= n) return [n - i, n];
    if (i <= 2 * n) return [0, n - (i - n)];
    if (i <= 3 * n) return [i - 2 * n, 0];
    return [n, i - 3 * n];
  }

  function land(i) {
    const s = a(), tile = TILES[i], m = payMult();
    switch (tile.t) {
      case 'prop': {
        const amt = Math.round(tile.amt * m * 10) / 10;
        MB.give({ [tile.res]: amt });
        return `+${MB.costText({ [tile.res]: amt })}`;
      }
      case 'go': {
        const amt = Math.round(10 * m);
        MB.give({ gold: amt });
        return `Landed on GO! +${amt} 💰`;
      }
      case 'chance': {
        const c = CHANCE[Math.floor(Math.random() * CHANCE.length)];
        let extra = '';
        if (c.give) { MB.give(c.give); extra = ` +${MB.costText(c.give)}`; }
        if (c.stickers) extra = ` ${giveStickers(c.stickers)}`;
        if (c.dice) { s.dice += c.dice; extra = ' +1 🎲'; }
        return `❓ ${c.text}${extra}`;
      }
      case 'tax':
        MB.give({ gem: 1 });
        return '🧾 Tax audit! The goose checks your receipts. All fine. +1 💎 for honesty.';
      case 'jail':
        return '🚔 Just visiting. (Jail here is just a room.)';
      case 'gojail':
        s.pos = JAIL;
        return '👮 Go to Jail! It’s just a room. You leave next roll. Nothing is lost.';
      case 'heist': {
        const amt = Math.round(15 * m);
        MB.give({ gold: amt });
        return `🏦 You heisted the Goose Bank: +${amt} 💰. The goose has insurance.`;
      }
      case 'parking': {
        const amt = Math.round(5 * m);
        MB.give({ star: amt });
        return `🅿️ Free Parking: +${amt} ⭐`;
      }
      case 'sticker':
        return `🃏 Sticker pack: ${giveStickers(2)}`;
      default:
        return '';
    }
  }

  // Roll now; the view walks the token along the path from the event.
  function rollOnce(by) {
    init();
    const s = a();
    if (s.dice < s.mult) return 'no dice (win games elsewhere to earn them)';
    s.dice -= s.mult;
    const d1 = 1 + Math.floor(Math.random() * 6), d2 = 1 + Math.floor(Math.random() * 6);
    const path = [];
    for (let step = 0; step < d1 + d2; step++) {
      s.pos = (s.pos + 1) % TILES.length;
      path.push(s.pos);
      if (s.pos === 0) {
        s.laps++;
        if (by === 'you') MB.track('board.lap');
        if (step < d1 + d2 - 1) MB.give({ gold: Math.round(5 * payMult()) });
      }
    }
    const text = land(s.pos);
    if (by === 'you') s.crafts++;
    MB.gameEvent('board', { type: 'roll', d1, d2, path, text, by });
    return '';
  }

  MB.registerBot('board', { act: () => rollOnce('bot') || undefined });

  function roll() {
    if (rolling) return;
    if (rollOnce('you')) dicePaywall();
  }

  async function animate(evt) {
    rolling = true;
    MB.busy.board = true;
    const my = token, dice = root.querySelector('.bl-dice');
    dice.classList.add('shaking');
    await SLEEP(450);
    if (my === token) {
      dice.classList.remove('shaking');
      dice.textContent = `${'⚀⚁⚂⚃⚄⚅'[evt.d1 - 1]} ${'⚀⚁⚂⚃⚄⚅'[evt.d2 - 1]}`;
      for (const pos of evt.path) {
        moveToken(pos);
        await SLEEP(110);
        if (my !== token) break;
      }
    }
    rolling = false;
    MB.busy.board = false;
    if (my !== token) return;
    render();
    root.querySelector('.bl-msg').textContent = `${evt.by === 'bot' ? '🤖 ' : ''}${evt.d1 + evt.d2}! ${evt.text}`;
  }

  function moveToken(pos = a().pos) {
    const [x, y] = cellOf(pos);
    const t = root.querySelector('.bl-token');
    if (t) { t.style.gridColumn = x + 1; t.style.gridRow = y + 1; }
  }

  function build() {
    const s = a();
    if (s.built >= LANDMARKS.length || !MB.pay(landmarkCost(s.built))) return;
    s.built++;
    if (s.built === LANDMARKS.length) {
      MB.give({ gem: 5 });
      MB.modal({
        title: `🏙️ BOARD ${s.level} COMPLETE!`,
        body: '<p class="center reward">+5 💎</p><p class="small center">On to a richer board. Payouts go up. Nothing you built is lost.</p>',
      });
      s.level++;
      s.built = 0;
    } else {
      MB.toast(`${LANDMARKS[s.built - 1].e} ${LANDMARKS[s.built - 1].n} built! Payouts +25%.`);
    }
    render();
  }

  function render() {
    init();
    const s = a();
    const cells = TILES.map((tile, i) => {
      const [x, y] = cellOf(i);
      return `<div class="bl-tile blt-${tile.t}" style="grid-column:${x + 1};grid-row:${y + 1}" title="${tile.n || MB.RES[tile.res].name}">${tile.e}</div>`;
    }).join('');
    const [tx, ty] = cellOf(s.pos);
    const next = s.built < LANDMARKS.length ? LANDMARKS[s.built] : null;
    root.innerHTML = `<div class="board-lap">
      <div class="bl-hud"><span>🎲 ${s.dice}</span><span>Board ${s.level} · Lap ${s.laps}</span></div>
      <div class="bl-board">
        ${cells}
        <div class="bl-token" style="grid-column:${tx + 1};grid-row:${ty + 1}">🎩</div>
        <div class="bl-center">
          <div class="bl-landmarks">${LANDMARKS.map((l, i) => `<span class="${i < s.built ? 'built' : ''}">${l.e}</span>`).join('')}</div>
          <div class="bl-dice">🎲 🎲</div>
          <button class="btn primary bl-roll">ROLL · ${s.mult} 🎲</button>
          <button class="btn bl-mult">Multiplier ×${s.mult}</button>
        </div>
      </div>
      <div class="bl-msg small center">Dice come only from winning in the other games.</div>
      <p class="small center">×${s.mult} spends ${s.mult} dice for ×${s.mult} payouts: the same value per die, just faster.
        Theirs go to ×1000 so you run out sooner. Ours stops at ×3.</p>
      ${next ? `<button class="btn bl-build">Build ${next.e} ${next.n} · ${MB.costText(landmarkCost(s.built))}</button>` : ''}
      <div class="bl-album">
        <div><b>📒 Goose & Friends</b> · album ${s.albums + 1} <span class="small">· duplicates: ${s.dupes} (${DUPES_PER_PICK} = pick any)</span></div>
        <div class="bl-stickers">${STICKERS.map(x => `<button class="bl-sticker ${s.album[x.e] ? 'have' : ''} ${x.gold ? 'gold' : ''}" data-e="${x.e}" ${s.album[x.e] || s.dupes < DUPES_PER_PICK ? 'disabled' : ''}>${x.e}</button>`).join('')}</div>
        <div class="small">Gold stickers are rarer, but ${DUPES_PER_PICK} duplicates always buy any missing one. Every album finishes.</div>
      </div>
    </div>`;
    root.querySelector('.bl-roll').onclick = roll;
    root.querySelector('.bl-mult').onclick = () => { a().mult = (a().mult % 3) + 1; render(); };
    root.querySelector('.bl-build')?.addEventListener('click', build);
    root.querySelectorAll('.bl-sticker').forEach(b => { b.onclick = () => pickSticker(b.dataset.e); });
    refresh();
  }

  function refresh() {
    if (!root || rolling) return;
    const s = a();
    const hud = root.querySelector('.bl-hud span');
    if (hud) hud.textContent = `🎲 ${s.dice}`;
    const b = root.querySelector('.bl-build');
    if (b && s.built < LANDMARKS.length) b.disabled = !MB.can(landmarkCost(s.built));
  }

  MB.apps.board = {
    mount(el) { root = el; token++; rolling = false; MB.busy.board = false; render(); },
    onEvent(evt) {
      if (root && evt.type === 'roll') animate(evt);
      if (evt.type === 'album') {
        MB.modal({
          title: '📒 ALBUM COMPLETE!',
          body: '<p class="center reward">+10 💎 · +30 ⭐</p><p class="small center">The goose frames it. You start a fresh album. Duplicates kept their value.</p>',
        });
      }
    },
    refresh,
    unmount() { token++; MB.busy.board = false; root = null; },
  };
})();
