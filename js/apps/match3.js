// Match Royale — match 3. Swap neighbours to line up 3+ of a kind. Tiles are
// the other games' resources: matching them pays out a little of each, and ⭐
// count toward the level goal. 4+ in a row makes a 🚀 that clears its row.
//
// The parody: lives, a move limit, "so close! +5 moves" and boosters. None of it
// costs money. Out of lives / moves / hammers opens a paywall whose price is an
// errand in another game. A level you leave mid-way is saved, so you can go run
// the errand and come back to the same board. Losing never takes back what you
// matched.
(function () {
  const MB = window.MB;
  const N = 7, MOVES = 20, LIFE_SECS = 10 * 60, BASE_LIVES = 5;
  const KINDS = ['scrap', 'dust', 'slab', 'block', 'gold', 'star'];
  const PAY = { scrap: 1, dust: 0.5, slab: 0.1, block: 0.25, gold: 0.25 };
  const CHEERS = ['Satisfying!', 'Engagement!', 'Retention!', 'Monetizable!', 'Whale-tastic!'];
  const SLEEP = ms => new Promise(r => setTimeout(r, ms));

  let root, refs, busy, sel, mode, drag, token = 0;

  const a = () => MB.app('match3');
  const maxLives = () => BASE_LIVES + MB.buildingLevel('bakery');
  const goal = lvl => Math.min(6 + 2 * lvl, 40);

  // Lives come back one at a time while you're away.
  function regen() {
    const s = a();
    if (s.lives === undefined) { s.lives = maxLives(); s.lifeAt = 0; s.lvl = 1; s.hammers = 1; }
    while (s.lives < maxLives() && s.lifeAt && Date.now() >= s.lifeAt) {
      s.lives++;
      s.lifeAt = s.lives < maxLives() ? s.lifeAt + LIFE_SECS * 1000 : 0;
    }
    if (s.lives < maxLives() && !s.lifeAt) s.lifeAt = Date.now() + LIFE_SECS * 1000;
  }

  function loseLife() {
    regen();
    const s = a();
    s.lives = Math.max(0, s.lives - 1);
    if (!s.lifeAt) s.lifeAt = Date.now() + LIFE_SECS * 1000;
  }

  const mmss = secs => `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, '0')}`;

  // --- Rewards that errands can grant -------------------------------------------
  MB.REWARDS.lives = r => {
    regen();
    const s = a();
    s.lives = Math.min(maxLives(), s.lives + r.n);
    if (s.lives >= maxLives()) s.lifeAt = 0;
    return r.n >= maxLives() ? 'Lives refilled in Match Royale ❤️' : `+${r.n} ❤️ in Match Royale`;
  };
  MB.REWARDS.moves = r => {
    const play = a().play;
    if (!play) return MB.REWARDS.lives({ n: 1 });
    play.moves += r.n;
    return `+${r.n} moves on your paused Match Royale level`;
  };
  MB.REWARDS.hammer = r => {
    regen();
    a().hammers = (a().hammers || 0) + r.n;
    return `+${r.n} 🔨 in Match Royale`;
  };

  function livesPaywall() {
    regen();
    MB.paywall({
      title: 'OUT OF LIVES 😭',
      item: '❤️'.repeat(maxLives()),
      price: '$0.99',
      options: [
        { metric: 'screw.plate', amount: 6, reward: { type: 'lives', n: 1 }, label: '+1 ❤️' },
        { metric: 'grinder.batch', amount: 5, reward: { type: 'lives', n: 2 }, label: '+2 ❤️' },
        { metric: 'king.win', amount: 1, reward: { type: 'lives', n: 99 }, label: 'Full ❤️' },
      ],
      wait: `wait ${mmss((a().lifeAt - Date.now()) / 1000)} for the next life, like a reasonable person`,
    });
  }

  function movesPaywall() {
    MB.paywall({
      title: 'SO CLOSE!!! 😱',
      item: '➕5 moves',
      price: '$0.99',
      options: [
        { metric: 'slicer.slab', amount: 2, reward: { type: 'moves', n: 5 }, label: '+5 moves' },
        { metric: 'army.win', amount: 1, reward: { type: 'moves', n: 5 }, label: '+5 moves' },
        { metric: 'screw.plate', amount: 4, reward: { type: 'moves', n: 3 }, label: '+3 moves' },
      ],
      wait: 'give up (you keep everything you matched)',
    });
  }

  function hammerPaywall() {
    MB.paywall({
      title: 'Out of hammers 🔨',
      item: '🔨🔨🔨 Hammer Bundle',
      price: '$1.99',
      options: [
        { metric: 'grinder.batch', amount: 6, reward: { type: 'hammer', n: 1 }, label: '+1 🔨' },
        { metric: 'merge.slab', amount: 2, reward: { type: 'hammer', n: 2 }, label: '+2 🔨' },
      ],
    });
  }

  // --- Board logic -----------------------------------------------------------------
  const rand = () => KINDS[Math.floor(Math.random() * KINDS.length)];
  const at = (b, x, y) => (x < 0 || y < 0 || x >= N || y >= N ? null : b[y * N + x]);

  function newBoard() {
    const b = [];
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        let k;
        do k = rand();
        while ((at(b, x - 1, y)?.k === k && at(b, x - 2, y)?.k === k) || (at(b, x, y - 1)?.k === k && at(b, x, y - 2)?.k === k));
        b.push({ k });
      }
    }
    return hasMove(b) ? b : newBoard();
  }

  // Runs of 3+ in rows and columns: [[indices...], ...]
  function runs(b) {
    const out = [];
    for (const horiz of [true, false]) {
      for (let a1 = 0; a1 < N; a1++) {
        let run = [];
        for (let a2 = 0; a2 <= N; a2++) {
          const i = horiz ? a1 * N + a2 : a2 * N + a1;
          const t = a2 < N ? b[i] : null;
          if (t && run.length && b[run[0]].k === t.k) run.push(i);
          else {
            if (run.length >= 3) out.push(run);
            run = t ? [i] : [];
          }
        }
      }
    }
    return out;
  }

  function swapped(b, i, j) {
    const c = b.slice();
    [c[i], c[j]] = [c[j], c[i]];
    return c;
  }

  function hasMove(b) {
    for (let i = 0; i < N * N; i++) {
      for (const j of [i + 1, i + N]) {
        if ((j === i + 1 && j % N === 0) || j >= N * N) continue;
        if (runs(swapped(b, i, j)).length) return true;
      }
    }
    return false;
  }

  const adjacent = (i, j) => (Math.abs(i - j) === 1 && Math.floor(i / N) === Math.floor(j / N)) || Math.abs(i - j) === N;

  // --- Rendering -------------------------------------------------------------------
  function showLobby() {
    regen();
    const s = a();
    const next = s.lifeAt ? `Next ❤️ in ${mmss(Math.max(0, (s.lifeAt - Date.now()) / 1000))}` : 'Lives full';
    root.innerHTML = `<div class="m3-lobby">
      <div class="m3-level">LEVEL ${s.lvl}</div>
      <div class="m3-lives">${'❤️'.repeat(s.lives)}${'🤍'.repeat(Math.max(0, maxLives() - s.lives))}</div>
      <div class="small center m3-next">${next}</div>
      <p class="center">Collect <b>${goal(s.lvl)} ⭐</b> in <b>${MOVES}</b> moves.<br>
        <span class="small">Matching 🔩💨🧱🟫💰 pays out that resource, win or lose.</span></p>
      <button class="btn primary m3-play">${s.play ? '▶ Resume level' : s.lives ? '▶ Play' : '💔 Out of lives'}</button>
      <div class="row"><span class="small">🔨 Hammers: ${s.hammers || 0}</span></div>
    </div>`;
    root.querySelector('.m3-play').onclick = () => {
      regen();
      if (a().play) return showBoard();
      if (!a().lives) return livesPaywall();
      a().play = { board: newBoard(), moves: MOVES, stars: 0, need: goal(a().lvl) };
      showBoard();
    };
  }

  function showBoard() {
    sel = null;
    mode = null;
    busy = false;
    root.innerHTML = `<div class="m3">
      <div class="m3-hud"><span class="m3-moves"></span><span class="m3-goal"></span></div>
      <div class="m3-cheer"></div>
      <div class="m3-grid"></div>
      <div class="row">
        <button class="btn m3-pause">⏸ Lobby</button>
        <button class="btn m3-hammer"></button>
        <button class="btn m3-quit">🏳️ Give up</button>
      </div>
    </div>`;
    refs = { grid: root.querySelector('.m3-grid'), moves: root.querySelector('.m3-moves'), goal: root.querySelector('.m3-goal'), cheer: root.querySelector('.m3-cheer'), hammer: root.querySelector('.m3-hammer') };
    refs.grid.addEventListener('pointerdown', onDown);
    refs.grid.addEventListener('pointermove', onMove);
    refs.grid.addEventListener('pointerup', onUp);
    root.querySelector('.m3-pause').onclick = showLobby;
    root.querySelector('.m3-quit').onclick = giveUp;
    refs.hammer.onclick = () => {
      if (!(a().hammers > 0)) return hammerPaywall();
      mode = mode === 'hammer' ? null : 'hammer';
      paint();
    };
    paint();
  }

  function paint(clearing = new Set(), dropping = new Set()) {
    const play = a().play;
    if (!refs || !play) return;
    refs.moves.textContent = `Moves: ${play.moves}`;
    refs.goal.textContent = `⭐ ${Math.min(play.stars, play.need)}/${play.need}`;
    refs.hammer.textContent = mode === 'hammer' ? '🔨 Tap a tile…' : `🔨 ×${a().hammers || 0}`;
    refs.hammer.classList.toggle('active', mode === 'hammer');
    refs.grid.innerHTML = play.board.map((t, i) => `<div class="m3-tile ${t.rocket ? 'rocket' : ''} ${sel === i ? 'sel' : ''}
      ${clearing.has(i) ? 'clearing' : ''} ${dropping.has(i) ? 'dropping' : ''}" data-i="${i}">${MB.RES[t.k].icon}</div>`).join('');
  }

  // --- Input: drag to swap, or tap two neighbours ---------------------------------
  function cellAt(e) {
    const el = e.target.closest('.m3-tile');
    return el ? +el.dataset.i : null;
  }

  function onDown(e) {
    if (busy) return;
    const i = cellAt(e);
    if (i === null) return;
    if (mode === 'hammer') { smash(i); return; }
    drag = { i, x: e.clientX, y: e.clientY, done: false };
  }

  function onMove(e) {
    if (!drag || drag.done || busy) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
    drag.done = true;
    const x = drag.i % N, y = Math.floor(drag.i / N);
    const [tx, ty] = Math.abs(dx) > Math.abs(dy) ? [x + Math.sign(dx), y] : [x, y + Math.sign(dy)];
    if (tx < 0 || ty < 0 || tx >= N || ty >= N) return;
    sel = null;
    trySwap(drag.i, ty * N + tx);
  }

  function onUp(e) {
    if (!drag || busy) { drag = null; return; }
    const tapped = !drag.done;
    drag = null;
    if (!tapped) return;
    const i = cellAt(e);
    if (i === null) return;
    if (sel !== null && adjacent(sel, i)) {
      const from = sel;
      sel = null;
      trySwap(from, i);
    } else {
      sel = sel === i ? null : i;
      paint();
    }
  }

  async function trySwap(i, j) {
    const play = a().play, my = token;
    if (!play || play.moves <= 0) return;
    busy = true;
    const next = swapped(play.board, i, j);
    if (!runs(next).length) {
      refs.grid.children[i]?.classList.add('nope');
      refs.grid.children[j]?.classList.add('nope');
      await SLEEP(250);
      busy = false;
      if (my === token) paint();
      return;
    }
    play.board = next;
    play.moves--;
    await resolve(j, my);
  }

  async function smash(i) {
    const play = a().play, my = token;
    if (!(a().hammers > 0) || !play) return;
    a().hammers--;
    mode = null;
    busy = true;
    await clearCells(new Set([i]), my);
    await resolve(null, my);
  }

  // Clear matches, drop tiles, refill, repeat until stable.
  async function resolve(focus, my) {
    let combo = 0;
    for (;;) {
      const play = a().play;
      if (my !== token || !play) return;
      const found = runs(play.board);
      if (!found.length) break;
      combo++;
      const clear = new Set(found.flat());
      const rockets = [];
      for (const run of found) {
        if (run.length < 4) continue;
        const spot = run.includes(focus) ? focus : run[Math.floor(run.length / 2)];
        rockets.push({ i: spot, k: play.board[spot].k });
      }
      await clearCells(clear, my, rockets);
      if (combo > 1) cheer(CHEERS[Math.min(combo - 2, CHEERS.length - 1)]);
    }
    const play = a().play;
    if (my !== token || !play) return;
    if (!hasMove(play.board)) {
      cheer('No moves! Shuffling (for free)');
      play.board = newBoard();
    }
    busy = false;
    paint();
    checkEnd();
  }

  async function clearCells(clear, my, rockets = []) {
    const play = a().play;
    // Rockets caught in the blast clear their whole row.
    let grew = true;
    while (grew) {
      grew = false;
      for (const i of [...clear]) {
        if (!play.board[i]?.rocket) continue;
        const row = Math.floor(i / N);
        for (let x = 0; x < N; x++) {
          if (!clear.has(row * N + x)) { clear.add(row * N + x); grew = true; }
        }
      }
    }
    paint(clear);
    await SLEEP(220);
    if (my !== token) return;
    const mult = MB.handMult('match3'), gains = {};
    for (const i of clear) {
      const k = play.board[i].k;
      if (k === 'star') play.stars++;
      else gains[k] = (gains[k] || 0) + PAY[k] * mult;
      play.board[i] = null;
    }
    MB.give(gains);
    for (const r of rockets) play.board[r.i] = { k: r.k, rocket: true };
    // Gravity and refill.
    const dropping = new Set();
    for (let x = 0; x < N; x++) {
      const col = [];
      for (let y = N - 1; y >= 0; y--) if (play.board[y * N + x]) col.push(play.board[y * N + x]);
      for (let y = N - 1, c = 0; y >= 0; y--, c++) {
        const i = y * N + x;
        const t = col[c] || { k: rand() };
        if (t !== play.board[i]) dropping.add(i);
        play.board[i] = t;
      }
    }
    paint(new Set(), dropping);
    await SLEEP(200);
  }

  function cheer(text) {
    if (!refs) return;
    refs.cheer.textContent = text;
    refs.cheer.classList.remove('show');
    void refs.cheer.offsetWidth;
    refs.cheer.classList.add('show');
  }

  function checkEnd() {
    const s = a(), play = s.play;
    if (!play) return;
    if (play.stars >= play.need) return win();
    if (play.moves <= 0) {
      if (play.stars >= play.need - 6) movesPaywall();
      else giveUp(true);
    }
  }

  function win() {
    const s = a(), lvl = s.lvl;
    const bonus = Math.round((5 + Math.floor(lvl / 2)) * MB.handMult('match3'));
    MB.give({ star: bonus });
    s.lvl++;
    s.crafts++;
    s.play = null;
    MB.track('match3.win');
    MB.modal({
      title: `🎉 LEVEL ${lvl} CLEAR!`,
      body: `<p class="center reward">+${bonus} ⭐</p><p class="small center">No lives were harmed. Everything you matched is already yours.</p>`,
      buttons: [{ label: 'Next level', primary: true }],
      onClose: () => { if (root) showLobby(); },
    });
  }

  function giveUp(outOfMoves) {
    const s = a();
    if (!s.play) return;
    s.play = null;
    loseLife();
    MB.modal({
      title: outOfMoves ? 'Out of moves 😵' : 'Level abandoned',
      body: `<p>−1 ❤️. You keep everything you matched.</p><p class="small">(In other games you'd lose your boosters too. Here, nothing else happens.)</p>`,
      onClose: () => { if (root) showLobby(); },
    });
  }

  MB.apps.match3 = {
    mount(el) {
      root = el;
      token++;
      regen();
      if (a().play) showBoard(); else showLobby();
    },
    refresh() {
      if (!root) return;
      const next = root.querySelector('.m3-next');
      if (next) {
        regen();
        const s = a();
        next.textContent = s.lifeAt ? `Next ❤️ in ${mmss(Math.max(0, (s.lifeAt - Date.now()) / 1000))}` : 'Lives full';
        root.querySelector('.m3-lives').textContent = '❤️'.repeat(s.lives) + '🤍'.repeat(Math.max(0, maxLives() - s.lives));
      }
      // An errand may have added moves while we were away from this level.
      const play = a().play;
      if (play && refs && !busy && refs.moves.textContent !== `Moves: ${play.moves}`) paint();
    },
    unmount() { token++; root = refs = null; },
  };
})();
