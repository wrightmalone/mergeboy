// Match Royale — match 3. Swap neighbours to line up 3+ of a kind. Tiles are
// the other games' resources: matching them pays out a little of each, and ⭐
// count toward the level goal. 4+ in a row makes a 🚀 that clears its row.
//
// The parody: lives, a move limit, "so close! +5 moves" and boosters. None of it
// costs money. Out of lives / moves / hammers opens a paywall whose price is an
// errand in another game. A level you leave mid-way is saved, so you can go run
// the errand and come back to the same board. Losing never takes back what you
// matched.
//
// Candy Bot plays the same level you see, one swap per move (it doesn't use
// lives: bots are immortal). Matches resolve instantly in the model; the view
// replays each cascade frame as animation. Upgrades: Star Sense (smarter swaps),
// Extra Moves, and a faster bot.
(function () {
  const MB = window.MB;
  const N = 7, BASE_MOVES = 20, LIFE_SECS = 10 * 60, BASE_LIVES = 5;
  const KINDS = ['scrap', 'dust', 'slab', 'block', 'gold', 'star'];
  const PAY = { scrap: 1, dust: 0.5, slab: 0.1, block: 0.25, gold: 0.25, star: 0.5 };
  const CHEERS = ['Satisfying!', 'Engagement!', 'Retention!', 'Monetizable!', 'Whale-tastic!'];
  const SLEEP = ms => new Promise(r => setTimeout(r, ms));

  // --- Model ------------------------------------------------------------------------
  const a = () => MB.app('match3');
  const maxLives = () => BASE_LIVES + MB.buildingLevel('bakery');
  const goal = lvl => Math.min(6 + 2 * lvl, 40);
  const moves = () => BASE_MOVES + 3 * MB.up('match3', 'moves');

  // Lives come back one at a time while you're away.
  function regen() {
    const s = a();
    if (s.lives === undefined) Object.assign(s, { lives: maxLives(), lifeAt: 0, lvl: 1, hammers: 1 });
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

  // Every legal swap: [i, j, stars it would match].
  function legalSwaps(b) {
    const out = [];
    for (let i = 0; i < N * N; i++) {
      for (const j of [i + 1, i + N]) {
        if ((j === i + 1 && j % N === 0) || j >= N * N) continue;
        const found = runs(swapped(b, i, j));
        if (found.length) out.push([i, j, found.flat().filter(x => swapped(b, i, j)[x].k === 'star').length]);
      }
    }
    return out;
  }
  const hasMove = b => legalSwaps(b).length > 0;
  const adjacent = (i, j) => (Math.abs(i - j) === 1 && Math.floor(i / N) === Math.floor(j / N)) || Math.abs(i - j) === N;

  function startLevel() {
    regen();
    a().play = { board: newBoard(), moves: moves(), stars: 0, need: goal(a().lvl) };
  }

  // Clear the given cells (plus rocket rows), pay out, drop and refill.
  // Returns one animation frame.
  function clearCells(play, clear, rockets = []) {
    const before = play.board.slice();
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
    const mult = MB.outMult('match3'), gains = {};
    for (const i of clear) {
      const k = play.board[i].k;
      if (k === 'star') play.stars++;
      gains[k] = (gains[k] || 0) + PAY[k] * mult;
      play.board[i] = null;
    }
    MB.give(gains);
    for (const r of rockets) play.board[r.i] = { k: r.k, rocket: true };
    for (let x = 0; x < N; x++) {
      const col = [];
      for (let y = N - 1; y >= 0; y--) if (play.board[y * N + x]) col.push(play.board[y * N + x]);
      for (let y = N - 1, c = 0; y >= 0; y--, c++) play.board[y * N + x] = col[c] || { k: rand() };
    }
    return { before, clear: [...clear], after: play.board.slice() };
  }

  // Resolve every cascade after a swap or smash. Returns the frames to animate.
  function cascade(play, focus) {
    const frames = [];
    for (let combo = 1; ; combo++) {
      const found = runs(play.board);
      if (!found.length) break;
      const rockets = found.filter(run => run.length >= 4).map(run => {
        const spot = run.includes(focus) ? focus : run[Math.floor(run.length / 2)];
        return { i: spot, k: play.board[spot].k };
      });
      const frame = clearCells(play, new Set(found.flat()), rockets);
      if (combo > 1) frame.cheer = CHEERS[Math.min(combo - 2, CHEERS.length - 1)];
      frames.push(frame);
    }
    if (!hasMove(play.board)) {
      play.board = newBoard();
      frames.push({ before: play.board, clear: [], after: play.board.slice(), cheer: 'No moves! Shuffling (for free)' });
    }
    return frames;
  }

  // Make a swap (if it matches). Returns false for an illegal swap.
  function swap(i, j, by) {
    const play = a().play;
    if (!play || play.moves <= 0 || !adjacent(i, j)) return false;
    const next = swapped(play.board, i, j);
    if (!runs(next).length) return false;
    play.board = next;
    play.moves--;
    const frames = cascade(play, j);
    MB.gameEvent('match3', { type: 'move', i, j, frames, by });
    afterMove(by);
    return true;
  }

  function smash(i) {
    const play = a().play;
    if (!play || !(a().hammers > 0)) return;
    a().hammers--;
    const frames = [clearCells(play, new Set([i])), ...cascade(play, null)];
    MB.gameEvent('match3', { type: 'move', i, j: i, frames, by: 'you' });
    afterMove('you');
  }

  // Win, or out of moves. Bots never lose lives; your near-misses pause for the
  // "+5 moves" paywall instead of ending.
  function afterMove(by) {
    const s = a(), play = s.play;
    if (play.stars >= play.need) {
      const lvl = s.lvl, bonus = Math.round((5 + Math.floor(lvl / 2)) * MB.outMult('match3'));
      MB.give({ star: bonus });
      s.lvl++;
      s.play = null;
      if (by === 'you') {
        s.crafts++;
        MB.track('match3.win');
      }
      MB.gameEvent('match3', { type: 'win', lvl, bonus, by });
    } else if (play.moves <= 0) {
      if (by === 'bot') {
        s.play = null;
        MB.gameEvent('match3', { type: 'botfail' });
      } else {
        MB.gameEvent('match3', { type: 'outofmoves', near: play.stars >= play.need - 6 });
      }
    }
  }

  // Candy Bot: random legal swap, or (with Star Sense) the one with most ⭐.
  function botPick(play) {
    const options = legalSwaps(play.board);
    if (!options.length) return null;
    if (Math.random() < 0.25 + 0.18 * MB.up('match3', 'smarts')) return options.reduce((best, o) => (o[2] > best[2] ? o : best));
    return options[Math.floor(Math.random() * options.length)];
  }

  MB.registerBot('match3', {
    act() {
      const s = a();
      if (!s.play) {
        startLevel();
        MB.gameEvent('match3', { type: 'start' });
        return;
      }
      if (s.play.moves <= 0) return 'your level is paused (out of moves)';
      const still = s.botPick && runs(swapped(s.play.board, s.botPick[0], s.botPick[1])).length;
      const pick = still ? s.botPick : botPick(s.play);
      s.botPick = null;
      if (!pick) return 'no moves';
      swap(pick[0], pick[1], 'bot');
    },
  });

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

  // --- View -------------------------------------------------------------------------
  let root, refs, sel, mode, drag, token = 0, queue = [], playing = false;

  function showLobby() {
    regen();
    refs = null;
    const s = a();
    const next = s.lifeAt ? `Next ❤️ in ${mmss(Math.max(0, (s.lifeAt - Date.now()) / 1000))}` : 'Lives full';
    root.innerHTML = `<div class="m3-lobby">
      <div class="m3-level">LEVEL ${s.lvl}</div>
      <div class="m3-lives">${'❤️'.repeat(s.lives)}${'🤍'.repeat(Math.max(0, maxLives() - s.lives))}</div>
      <div class="small center m3-next">${next}</div>
      <p class="center">Collect <b>${goal(s.lvl)} ⭐</b> in <b>${moves()}</b> moves.<br>
        <span class="small">Matching 🔩💨🧱🟫💰 pays out that resource, win or lose.</span></p>
      <button class="btn primary m3-play">${s.play ? '▶ Resume level' : s.lives ? '▶ Play' : '💔 Out of lives'}</button>
      <div class="row"><span class="small">🔨 Hammers: ${s.hammers || 0}</span></div>
      ${MB.hasBot('match3') ? '<p class="small center">🤖 Candy Bot starts its own level when there isn’t one. It doesn’t use lives.</p>' : ''}
    </div>`;
    root.querySelector('.m3-play').onclick = () => {
      regen();
      if (a().play) return showBoard();
      if (!a().lives) return livesPaywall();
      startLevel();
      showBoard();
    };
  }

  function showBoard() {
    sel = null;
    mode = null;
    root.innerHTML = `<div class="m3">
      <div class="m3-hud"><span class="m3-moves"></span><span class="m3-goal"></span></div>
      <div class="m3-cheer"></div>
      <div class="m3-wrap"><div class="m3-grid"></div><div class="bot-cursor" hidden><span>🤖</span><i></i></div></div>
      <div class="row">
        <button class="btn m3-pause">⏸ Lobby</button>
        <button class="btn m3-hammer"></button>
        <button class="btn m3-quit">🏳️ Give up</button>
      </div>
    </div>`;
    refs = {
      grid: root.querySelector('.m3-grid'), wrap: root.querySelector('.m3-wrap'), cursor: root.querySelector('.bot-cursor'),
      moves: root.querySelector('.m3-moves'), goal: root.querySelector('.m3-goal'), cheer: root.querySelector('.m3-cheer'), hammer: root.querySelector('.m3-hammer'),
    };
    refs.grid.addEventListener('pointerdown', onDown);
    refs.grid.addEventListener('pointermove', onMove);
    refs.grid.addEventListener('pointerup', onUp);
    root.querySelector('.m3-pause').onclick = showLobby;
    root.querySelector('.m3-quit').onclick = () => giveUp(false);
    refs.hammer.onclick = () => {
      if (!(a().hammers > 0)) return hammerPaywall();
      mode = mode === 'hammer' ? null : 'hammer';
      paint();
    };
    paint();
  }

  function paint(board = a().play?.board, clearing = new Set(), dropping = new Set()) {
    const play = a().play;
    if (!refs || !board) return;
    if (play) {
      refs.moves.textContent = `Moves: ${play.moves}`;
      refs.goal.textContent = `⭐ ${Math.min(play.stars, play.need)}/${play.need}`;
    }
    refs.hammer.textContent = mode === 'hammer' ? '🔨 Tap a tile…' : `🔨 ×${a().hammers || 0}`;
    refs.hammer.classList.toggle('active', mode === 'hammer');
    refs.grid.innerHTML = board.map((t, i) => `<div class="m3-tile ${t.rocket ? 'rocket' : ''} ${sel === i ? 'sel' : ''}
      ${clearing.has(i) ? 'clearing' : ''} ${dropping.has(i) ? 'dropping' : ''}" data-i="${i}">${MB.RES[t.k].icon}</div>`).join('');
  }

  function cheer(text) {
    if (!refs || !text) return;
    refs.cheer.textContent = text;
    refs.cheer.classList.remove('show');
    void refs.cheer.offsetWidth;
    refs.cheer.classList.add('show');
  }

  // Model events are animated strictly in order.
  async function drain() {
    if (playing) return;
    playing = true;
    MB.busy.match3 = true;
    const my = token;
    while (queue.length && my === token) {
      const evt = queue.shift();
      if (evt.type === 'start') { if (root) showBoard(); continue; }
      if (evt.type === 'move' && refs) {
        for (const f of evt.frames) {
          paint(f.before, new Set(f.clear));
          await SLEEP(f.clear.length ? 220 : 0);
          if (my !== token || !refs) break;
          paint(f.after, new Set(), new Set(f.after.map((t, i) => (t !== f.before[i] ? i : -1)).filter(i => i >= 0)));
          cheer(f.cheer);
          await SLEEP(200);
        }
        paint();
      } else if (evt.type === 'win') {
        if (evt.by === 'bot') {
          MB.toast(`🍬 Candy Bot cleared level ${evt.lvl}: +${evt.bonus} ⭐`);
          if (root) showLobby();
        } else {
          MB.modal({
            title: `🎉 LEVEL ${evt.lvl} CLEAR!`,
            body: `<p class="center reward">+${evt.bonus} ⭐</p><p class="small center">No lives were harmed. Everything you matched is already yours.</p>`,
            buttons: [{ label: 'Next level', primary: true }],
            onClose: () => { if (root) showLobby(); },
          });
        }
      } else if (evt.type === 'botfail') {
        MB.toast('🍬 Candy Bot ran out of moves. It doesn’t lose lives. It just starts over.');
        if (root) showLobby();
      } else if (evt.type === 'outofmoves') {
        if (evt.near) movesPaywall();
        else giveUp(true);
      }
    }
    playing = false;
    MB.busy.match3 = false;
  }

  // --- Input: drag to swap, or tap two neighbours ---------------------------------
  const cellAt = e => {
    const el = e.target.closest('.m3-tile');
    return el ? +el.dataset.i : null;
  };

  function trySwap(i, j) {
    if (playing) return;
    a().botPick = null;
    if (!swap(i, j, 'you')) {
      refs.grid.children[i]?.classList.add('nope');
      refs.grid.children[j]?.classList.add('nope');
    }
  }

  function onDown(e) {
    if (playing) return;
    const i = cellAt(e);
    if (i === null) return;
    if (mode === 'hammer') { mode = null; smash(i); return; }
    drag = { i, x: e.clientX, y: e.clientY, done: false };
  }

  function onMove(e) {
    if (!drag || drag.done || playing) return;
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
    if (!drag || playing) { drag = null; return; }
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

  MB.apps.match3 = {
    mount(el) {
      root = el;
      token++;
      queue = [];
      playing = false;
      MB.busy.match3 = false;
      regen();
      if (a().play) showBoard(); else showLobby();
    },

    onEvent(evt) {
      queue.push(evt);
      drain();
    },

    update() {
      // Candy Bot's cursor rests on the tile it's about to swap.
      if (!refs) return;
      const s = a(), show = MB.hasBot('match3') && s.play && s.play.moves > 0 && !playing;
      if (show && !s.botPick) s.botPick = botPick(s.play);
      refs.cursor.hidden = !(show && s.botPick);
      if (show && s.botPick) {
        const c = refs.grid.children[s.botPick[0]], box = refs.wrap.getBoundingClientRect(), r = c?.getBoundingClientRect();
        if (r) {
          refs.cursor.style.left = `${r.left - box.left + r.width / 2}px`;
          refs.cursor.style.top = `${r.top - box.top + r.height / 2}px`;
          refs.cursor.style.setProperty('--p', MB.botProgress('match3'));
        }
      }
    },

    refresh() {
      if (!root) return;
      // A level started (by Candy Bot) while we were on the lobby: show it.
      if (!refs && a().play && !playing) { showBoard(); return; }
      const next = root.querySelector('.m3-next');
      if (next) {
        regen();
        const s = a();
        next.textContent = s.lifeAt ? `Next ❤️ in ${mmss(Math.max(0, (s.lifeAt - Date.now()) / 1000))}` : 'Lives full';
        root.querySelector('.m3-lives').textContent = '❤️'.repeat(s.lives) + '🤍'.repeat(Math.max(0, maxLives() - s.lives));
      }
      // An errand may have added moves while we were away from this level.
      const play = a().play;
      if (play && refs && !playing && refs.moves.textContent !== `Moves: ${play.moves}`) paint();
    },

    unmount() { token++; MB.busy.match3 = false; root = refs = null; },
  };
})();
