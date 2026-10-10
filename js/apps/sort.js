// Potion Sort — the "sort the liquid" vial puzzle. Pour the top colour of one
// vial onto a matching colour (or into an empty vial) until every vial holds a
// single colour. Sorted puzzles pay 🧪 potions, one per colour.
//
// Every puzzle is checked solvable with a small solver before it's dealt. Pour
// Bot (this game's bot) pours one vial per move: a random legal pour, unless its
// Chemistry Degree lets it follow the solver. Random pours can paint it into a
// corner; then it shrugs and starts over. Upgrades: smarter pours, more colours
// (+1 potion each), a faster bot.
(function () {
  const MB = window.MB;
  const CAP = 4, EMPTY_VIALS = 2, BASE_COLORS = 4, SOLVER_NODES = 20000;
  const COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#f97316', '#ec4899', '#14b8a6'];

  // --- Model ------------------------------------------------------------------------
  const a = () => MB.app('sort');
  const colorCount = () => Math.min(COLORS.length, BASE_COLORS + MB.up('sort', 'colors'));

  const top = v => v[v.length - 1];
  const solved = vials => vials.every(v => !v.length || (v.length === CAP && v.every(c => c === v[0])));

  // Can we pour from i to j? (A full single-colour vial never moves; pouring a
  // uniform vial into an empty one is pointless.)
  function canPour(vials, i, j) {
    const from = vials[i], to = vials[j];
    if (i === j || !from.length || to.length >= CAP) return false;
    if (to.length && top(to) !== top(from)) return false;
    if (!to.length && from.every(c => c === from[0])) return false;
    return true;
  }

  function pour(vials, i, j) {
    const from = vials[i], to = vials[j], c = top(from);
    let n = 0;
    while (from.length && top(from) === c && to.length < CAP) { to.push(from.pop()); n++; }
    return n;
  }

  const clone = vials => vials.map(v => v.slice());
  const key = vials => vials.map(v => v.join(',')).sort().join('|');

  // Depth-first search for a solution; returns the list of [i, j] pours or null.
  function solve(start) {
    const seen = new Set();
    let nodes = 0;
    const dfs = (vials, path) => {
      if (solved(vials)) return path;
      if (++nodes > SOLVER_NODES) return null;
      const k = key(vials);
      if (seen.has(k)) return null;
      seen.add(k);
      for (let i = 0; i < vials.length; i++) {
        for (let j = 0; j < vials.length; j++) {
          if (!canPour(vials, i, j)) continue;
          const next = clone(vials);
          pour(next, i, j);
          const found = dfs(next, [...path, [i, j]]);
          if (found) return found;
        }
      }
      return null;
    };
    return dfs(clone(start), []);
  }

  function deal() {
    const n = colorCount();
    for (;;) {
      const units = [];
      for (let c = 0; c < n; c++) for (let k = 0; k < CAP; k++) units.push(c);
      for (let i = units.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [units[i], units[j]] = [units[j], units[i]];
      }
      const vials = Array.from({ length: n }, (_, i) => units.slice(i * CAP, (i + 1) * CAP));
      for (let e = 0; e < EMPTY_VIALS; e++) vials.push([]);
      if (!solved(vials) && solve(vials)) return vials;
    }
  }

  const puzzle = () => {
    const s = a();
    if (!s.g) s.g = { vials: deal(), start: null, n: 0 };
    if (!s.g.start) { s.g.start = clone(s.g.vials); s.g.n = colorCount(); }
    return s.g;
  };

  function newPuzzle() {
    const vials = deal();
    a().g = { vials, start: clone(vials), n: colorCount() };
    a().botMove = null;
  }

  // Pour i → j. Returns false if it isn't a legal pour.
  function doPour(i, j, by) {
    const p = puzzle();
    if (!canPour(p.vials, i, j)) return false;
    pour(p.vials, i, j);
    a().botMove = null;
    MB.gameEvent('sort', { type: 'pour', i, j, by });
    if (solved(p.vials)) {
      const potion = Math.round(p.n * MB.outMult('sort'));
      MB.give({ potion });
      if (by === 'you') {
        a().crafts++;
        MB.track('sort.win');
      }
      newPuzzle();
      MB.gameEvent('sort', { type: 'solved', potion, by });
    }
    return true;
  }

  function legalPours(vials) {
    const out = [];
    for (let i = 0; i < vials.length; i++) for (let j = 0; j < vials.length; j++) if (canPour(vials, i, j)) out.push([i, j]);
    return out;
  }

  // Pour Bot's next pour: the solver's (with Chemistry Degree) or any legal one.
  function botPick() {
    const p = puzzle(), options = legalPours(p.vials);
    if (!options.length) return null;
    if (Math.random() < 0.2 + 0.2 * MB.up('sort', 'brains')) {
      const plan = solve(p.vials);
      if (plan?.length) return plan[0];
    }
    return options[Math.floor(Math.random() * options.length)];
  }

  MB.registerBot('sort', {
    act() {
      const s = a();
      const p = puzzle();
      const planned = s.botMove && canPour(p.vials, s.botMove[0], s.botMove[1]) ? s.botMove : botPick();
      s.botMove = null;
      p.botPours = (p.botPours || 0) + 1;
      // Stuck, or wandering in circles: shrug and deal a fresh puzzle.
      if (!planned || p.botPours > 60) {
        newPuzzle();
        MB.gameEvent('sort', { type: 'reset', by: 'bot' });
        return;
      }
      doPour(planned[0], planned[1], 'bot');
    },
  });

  // --- View -------------------------------------------------------------------------
  let root, sel = null;

  function render() {
    const p = puzzle(), plan = MB.hasBot('sort') ? (a().botMove ||= botPick()) : null;
    root.innerHTML = `<div class="sort">
      <div class="sort-hud"><span>${p.n} colours · ${p.vials.length} vials</span><span>Solve → +${p.n} 🧪</span></div>
      <div class="vials">${p.vials.map((v, i) => `<button class="vial ${sel === i ? 'sel' : ''} ${plan && plan[0] === i ? 'bot-from' : ''} ${plan && plan[1] === i ? 'bot-to' : ''}" data-i="${i}">
        ${Array.from({ length: CAP }, (_, k) => `<span class="liquid" style="background:${v[k] === undefined ? 'transparent' : COLORS[v[k]]}"></span>`).reverse().join('')}
        ${plan && plan[1] === i ? '<span class="vial-bot">🤖<i></i></span>' : ''}
      </button>`).join('')}</div>
      <div class="row">
        <button class="btn restart">↻ Restart puzzle</button>
        <button class="btn primary skip">New puzzle</button>
      </div>
      <p class="small center">Tap a vial, then tap where to pour. Only onto the same colour, or into an empty vial.</p>
    </div>`;
    root.querySelector('.vials').addEventListener('click', e => {
      const v = e.target.closest('.vial');
      if (v) tap(+v.dataset.i);
    });
    root.querySelector('.restart').onclick = () => {
      const pz = puzzle();
      pz.vials = clone(pz.start);
      a().botMove = null;
      sel = null;
      render();
    };
    root.querySelector('.skip').onclick = () => { newPuzzle(); sel = null; render(); };
  }

  function tap(i) {
    if (sel === null) {
      if (puzzle().vials[i].length) sel = i;
    } else if (sel === i) {
      sel = null;
    } else {
      const from = sel;
      sel = null;
      if (!doPour(from, i, 'you')) {
        root.querySelector(`.vial[data-i="${i}"]`)?.classList.add('nope');
        sel = puzzle().vials[i].length ? i : null;
        setTimeout(() => root && render(), 250);
        return;
      }
      return;
    }
    render();
  }

  MB.apps.sort = {
    mount(el) { root = el; sel = null; render(); },

    onEvent(evt) {
      if (!root) return;
      if (evt.type === 'pour' && evt.by === 'bot' && sel !== null) sel = null;
      render();
      if (evt.type === 'solved') {
        if (evt.by === 'you') MB.modal({ title: '🧪 SORTED!', body: `<p class="center reward">+${evt.potion} 🧪</p><p class="small center">So relaxing. So satisfying. So free.</p>` });
        else MB.toast(`🤖 Pour Bot sorted a puzzle: +${evt.potion} 🧪`);
      } else if (evt.type === 'reset') {
        MB.toast('🤖 Pour Bot painted itself into a corner. It’s starting over.');
      }
    },

    update() {
      const ring = root?.querySelector('.vial-bot');
      if (ring) ring.style.setProperty('--p', MB.botProgress('sort'));
    },

    unmount() { root = null; },
  };
})();
