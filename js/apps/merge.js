// Merge Boy — spend dust to spawn specks, merge matching tiles upward, and tap a
// finished SLAB to collect it. Tap a tile to select it, then tap a match.
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

  let refs, board, sel;

  function render() {
    refs.grid.innerHTML = '';
    board.forEach((tier, i) => {
      const t = TIERS[tier];
      const cell = MB.h(`<button class="cell ${tier ? 'filled' : ''} ${tier === MAX ? 'max' : ''} ${sel === i ? 'sel' : ''}" data-i="${i}"></button>`);
      if (t) {
        cell.style.background = t.bg;
        cell.innerHTML = `<span class="glyph">${t.glyph}</span><span class="tname">${tier === MAX ? 'TAP!' : t.name}</span>`;
      }
      refs.grid.append(cell);
    });
  }

  function say(line) { refs.bubble.textContent = line; }

  function tapCell(i, e) {
    const tier = board[i];
    if (tier === MAX) {
      board[i] = 0;
      sel = null;
      const mult = MB.handMult('merge');
      MB.give(MB.APPS.merge.recipe.out, mult);
      MB.app('merge').crafts++;
      MB.floatText(`+${MB.costText({ slab: mult })}`, e.clientX, e.clientY);
      say(LINES[Math.floor(Math.random() * LINES.length)]);
    } else if (sel === null) {
      if (tier) sel = i;
    } else if (sel === i) {
      sel = null;
    } else if (!tier) {
      board[i] = board[sel];
      board[sel] = 0;
      sel = null;
    } else if (tier === board[sel]) {
      board[i] = tier + 1;
      board[sel] = 0;
      sel = null;
      render();
      refs.grid.children[i].classList.add('pop');
      return;
    } else {
      sel = i;
    }
    render();
  }

  function spawn(times) {
    let spawned = 0;
    for (let n = 0; n < times; n++) {
      const empty = board.flatMap((t, i) => (t ? [] : [i]));
      if (!empty.length) { MB.toast('Board full! Merge something. (Or buy more space for $49.99.)'); break; }
      if (!MB.pay(SPAWN_COST)) { MB.toast('Need 1 💨 per speck. Go grind the thing.'); break; }
      board[empty[Math.floor(Math.random() * empty.length)]] = 1;
      spawned++;
    }
    if (spawned) render();
  }

  MB.apps.merge = {
    mount(el) {
      const a = MB.app('merge');
      board = a.board ||= Array(SIZE).fill(0);
      sel = null;
      el.innerHTML = `<div class="merge-app">
        <div class="merge-boy"><span class="boy">👦</span><div class="bubble"></div></div>
        <div class="merge-grid"></div>
        <div class="row">
          <button class="btn primary spawn1">Spawn speck · 1 💨</button>
          <button class="btn spawn4">×4</button>
        </div>
        <p class="small center">Speck → Clump → Chunk → SLAB. 8 💨 per slab, if you're efficient.</p>
      </div>`;
      refs = { grid: el.querySelector('.merge-grid'), bubble: el.querySelector('.bubble') };
      refs.grid.addEventListener('click', e => {
        const cell = e.target.closest('.cell');
        if (cell) tapCell(+cell.dataset.i, e);
      });
      el.querySelector('.spawn1').onclick = () => spawn(1);
      el.querySelector('.spawn4').onclick = () => spawn(4);
      say(LINES[0]);
      render();
    },
    unmount() { refs = null; },
  };
})();
