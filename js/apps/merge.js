// Merge Boy — spend dust to spawn specks, merge matching tiles upward, and tap a
// finished SLAB to collect it. Tap a tile to select it, then tap a match.
//
// Merge Bot plays the same board: each move it collects a SLAB, merges the
// lowest matching pair, or spawns a speck. Its cursor shows the move it's about
// to make. Upgrades: spawns that start as Clumps, more slabs per SLAB, a faster
// bot.
(function () {
  const MB = window.MB;
  const SIZE = 16, MAX = 4, SPAWN_COST = { dust: 1 };
  const TIERS = [null,
    { name: 'Speck', glyph: '·', bg: '#5b4b42' },
    { name: 'Clump', glyph: '●', bg: '#87684f' },
    { name: 'Chunk', glyph: '⬢', bg: '#b88d5e' },
    { name: 'SLAB', glyph: '🧱', bg: '#f0b43c' }];
  const LINES = [
    'Merge 2 things. Get 1 thing. Math!',
    'Level 999 has a SECRET 👀',
    "I'm Merge Boy. I merge. It's my whole thing.",
    'What if we merged... two specks? 😳',
    'Only 1% can merge all the way to SLAB!!',
    'Please tap the slab. I need this.',
  ];

  // --- Model ------------------------------------------------------------------------
  const a = () => MB.app('merge');
  const board = () => (a().board ||= Array(SIZE).fill(0));

  function collect(i, by) {
    const b = board();
    if (b[i] !== MAX) return false;
    b[i] = 0;
    const slab = Math.round((1 + MB.up('merge', 'yield')) * MB.outMult('merge') * 10) / 10;
    MB.give({ slab });
    if (by === 'you') {
      a().crafts++;
      MB.track('merge.slab');
    }
    MB.gameEvent('merge', { type: 'collect', i, slab, by });
    return true;
  }

  function merge(i, j, by) {
    const b = board();
    if (i === j || !b[i] || b[i] !== b[j] || b[i] >= MAX) return false;
    b[j] = b[i] + 1;
    b[i] = 0;
    MB.gameEvent('merge', { type: 'merge', i, j, by });
    return true;
  }

  function spawn(by) {
    const b = board(), empty = b.flatMap((t, i) => (t ? [] : [i]));
    if (!empty.length) return 'board full';
    if (!MB.pay(SPAWN_COST)) return 'needs 💨';
    const i = empty[Math.floor(Math.random() * empty.length)];
    b[i] = Math.random() < 0.2 * MB.up('merge', 'clumps') ? 2 : 1;
    MB.gameEvent('merge', { type: 'spawn', i, by });
    return '';
  }

  // Merge Bot's next move: collect, else merge the lowest pair, else spawn.
  function plan() {
    const b = board();
    const slab = b.indexOf(MAX);
    if (slab >= 0) return { kind: 'collect', to: slab };
    for (let t = 1; t < MAX; t++) {
      const pair = b.flatMap((v, i) => (v === t ? [i] : [])).slice(0, 2);
      if (pair.length === 2) return { kind: 'merge', from: pair[0], to: pair[1] };
    }
    if (!b.includes(0)) return { kind: 'stuck', why: 'board full' };
    if (!MB.can(SPAWN_COST)) return { kind: 'stuck', why: 'needs 💨' };
    return { kind: 'spawn' };
  }

  MB.registerBot('merge', {
    act() {
      const p = plan();
      a().botPlan = null;
      if (p.kind === 'stuck') return p.why;
      if (p.kind === 'collect') collect(p.to, 'bot');
      else if (p.kind === 'merge') merge(p.from, p.to, 'bot');
      else {
        const why = spawn('bot');
        if (why) return why;
      }
      a().botPlan = plan();
    },
  });

  // --- View -----------------------------------------------------------------------
  let refs, sel;

  function render() {
    const b = board(), p = MB.hasBot('merge') ? a().botPlan || plan() : null;
    refs.grid.innerHTML = b.map((tier, i) => {
      const t = TIERS[tier];
      const botFrom = p?.kind === 'merge' && p.from === i;
      return `<button class="cell ${tier ? 'filled' : ''} ${tier === MAX ? 'max' : ''} ${sel === i ? 'sel' : ''} ${botFrom ? 'bot-sel' : ''}" data-i="${i}"
        ${t ? `style="background:${t.bg}"` : ''}>${t ? `<span class="glyph">${t.glyph}</span><span class="tname">${tier === MAX ? 'TAP!' : t.name}</span>` : ''}</button>`;
    }).join('');
  }

  function say(line) { refs.bubble.textContent = line; }

  function tapCell(i, e) {
    a().botPlan = null;   // your move may change what the bot should do next
    const b = board(), tier = b[i];
    if (tier === MAX) {
      sel = null;
      collect(i, 'you');
      say(LINES[Math.floor(Math.random() * LINES.length)]);
    } else if (sel === null) {
      if (tier) sel = i;
    } else if (sel === i) {
      sel = null;
    } else if (!tier) {
      b[i] = b[sel];
      b[sel] = 0;
      sel = null;
    } else if (tier === b[sel] && merge(sel, i, 'you')) {
      sel = null;
      return;
    } else {
      sel = i;
    }
    render();
  }

  function spawnClick(times) {
    a().botPlan = null;
    for (let n = 0; n < times; n++) {
      const why = spawn('you');
      if (why === 'board full') { MB.toast('Board full! Merge something. (Or buy more space for $49.99.)'); break; }
      if (why) { MB.toast('Need 1 💨 per speck. Go grind the thing.'); break; }
    }
  }

  function cellRect(i) {
    const c = refs.grid.children[i];
    if (!c) return null;
    const box = refs.wrap.getBoundingClientRect(), r = c.getBoundingClientRect();
    return [r.left - box.left + r.width / 2, r.top - box.top + r.height / 2];
  }

  MB.apps.merge = {
    mount(el) {
      sel = null;
      el.innerHTML = `<div class="merge-app">
        <div class="merge-boy"><span class="boy">👦</span><div class="bubble"></div></div>
        <div class="merge-wrap"><div class="merge-grid"></div><div class="bot-cursor" hidden><span>🤖</span><i></i></div></div>
        <div class="row">
          <button class="btn primary spawn1">Spawn speck · 1 💨</button>
          <button class="btn spawn4">×4</button>
        </div>
        <p class="small center">Speck → Clump → Chunk → SLAB. 8 💨 per slab, if you're efficient.</p>
      </div>`;
      refs = { grid: el.querySelector('.merge-grid'), bubble: el.querySelector('.bubble'), wrap: el.querySelector('.merge-wrap'), cursor: el.querySelector('.bot-cursor') };
      refs.grid.addEventListener('click', e => {
        const cell = e.target.closest('.cell');
        if (cell) tapCell(+cell.dataset.i, e);
      });
      el.querySelector('.spawn1').onclick = () => spawnClick(1);
      el.querySelector('.spawn4').onclick = () => spawnClick(4);
      say(LINES[0]);
      render();
    },

    onEvent(evt) {
      if (!refs) return;
      render();
      const c = refs.grid.children[evt.type === 'merge' ? evt.j : evt.i];
      if (evt.type === 'merge' || evt.type === 'spawn') c?.classList.add('pop');
      if (evt.type === 'collect' && c) MB.floatFrom(c, `+${MB.costText({ slab: evt.slab })}${evt.by === 'bot' ? ' 🤖' : ''}`);
    },

    update() {
      if (!refs) return;
      const p = MB.hasBot('merge') ? (a().botPlan ||= plan()) : null;
      const target = p && (p.kind === 'collect' || p.kind === 'merge' ? p.to : p.kind === 'spawn' ? board().indexOf(0) : -1);
      const at = target >= 0 ? cellRect(target) : null;
      refs.cursor.hidden = !at;
      if (at) {
        const [x, y] = at;
        refs.cursor.style.left = `${x}px`;
        refs.cursor.style.top = `${y}px`;
        refs.cursor.style.setProperty('--p', MB.botProgress('merge'));
      }
    },

    refresh() {
      // Keep the bot's "from" highlight in step with its plan.
      if (refs && MB.hasBot('merge')) {
        const p = a().botPlan, marked = refs.grid.querySelector('.bot-sel');
        if ((p?.kind === 'merge' ? p.from : -1) !== (marked ? +marked.dataset.i : -1)) render();
      }
    },

    unmount() { refs = null; },
  };
})();
