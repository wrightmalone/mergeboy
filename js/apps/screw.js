// Screw Loose 3D — "remove the screw". Plates are stacked bars, each held by two
// screws. A screw only comes out if no higher plate covers it. Drop a plate, get
// scrap; drop them all for a clear bonus that grows with the number of plates.
// The top plate is always free, so every board is solvable.
//
// Model (persisted in MB.app('screw').g) + bot + view. Screwbot plays the same
// board you see: it picks a free screw, hovers over it while its timer fills,
// then unscrews it. Upgrades: more plates per board, golden ×3 plates, ✨ bonus
// boards (×4), and a faster bot.
(function () {
  const MB = window.MB;
  const W = 320, H = 320, BAR = 34, R = 10, NS = 'http://www.w3.org/2000/svg';
  const COLORS = ['#ff5d73', '#ffb84d', '#4dd2ff', '#9b7bff', '#5ee089', '#ff8fd8', '#ffd84d', '#7dd3fc'];
  const PLATE_SCRAP = 2, CLEAR_PER_PLATE = 2, GOLDEN_MULT = 3, BONUS_MULT = 4;
  const BONUS_EVERY = [Infinity, 6, 4, 3];   // by Bonus Boards level
  const REVEAL_MS = 900;

  // --- Model ------------------------------------------------------------------------
  const a = () => MB.app('screw');
  const g = () => a().g || newBoard(1);

  const screwOffset = (p, s) => (s ? 1 : -1) * (p.len / 2 - BAR / 2);
  const screwWorld = (p, s) => {
    const d = screwOffset(p, s);
    return [p.cx + Math.cos(p.ang) * d, p.cy + Math.sin(p.ang) * d];
  };
  function covers(p, x, y) {
    const dx = x - p.cx, dy = y - p.cy, c = Math.cos(p.ang), s = Math.sin(p.ang);
    const lx = dx * c + dy * s, ly = -dx * s + dy * c;
    return Math.abs(lx) <= p.len / 2 + R * 0.5 && Math.abs(ly) <= BAR / 2 + R * 0.5;
  }
  const blocked = (b, p, s) => {
    const [x, y] = screwWorld(p, s);
    return b.plates.some(q => q.id > p.id && !q.dropped && covers(q, x, y));
  };
  const freeScrews = b => b.plates.flatMap(p => (p.dropped ? [] : [0, 1].filter(s => p.screws[s] && !blocked(b, p, s)).map(s => [p.id, s])));

  function newBoard(level) {
    const n = Math.min(3 + Math.floor(level / 2), 8) + MB.up('screw', 'plates');
    const every = BONUS_EVERY[MB.up('screw', 'bonus')];
    const plates = [];
    for (let i = 0; i < n; i++) {
      const len = 120 + Math.random() * 120, ang = Math.random() * Math.PI;
      const hx = (Math.abs(Math.cos(ang)) * len) / 2 + BAR / 2;
      const hy = (Math.abs(Math.sin(ang)) * len) / 2 + BAR / 2;
      plates.push({
        id: i, len, ang,
        cx: hx + Math.random() * (W - 2 * hx),
        cy: hy + Math.random() * (H - 2 * hy),
        color: COLORS[i % COLORS.length],
        golden: Math.random() < 0.08 * MB.up('screw', 'golden'),
        screws: [true, true], dropped: false,
      });
    }
    const board = { level, plates, bonus: level % every === 0, botTarget: null, revealAt: Date.now() + (MB.watching('screw') ? REVEAL_MS : 0) };
    a().g = board;
    return board;
  }

  // Remove one screw. Returns 'stuck', 'gone' or 'ok'. `by` is 'you' or 'bot'.
  function unscrew(pid, s, by) {
    const b = g(), p = b.plates[pid];
    if (!p || p.dropped || !p.screws[s]) return 'gone';
    if (blocked(b, p, s)) return 'stuck';
    p.screws[s] = false;
    MB.gameEvent('screw', { type: 'unscrew', p: pid, s, by });
    if (!p.screws[0] && !p.screws[1]) dropPlate(b, p, by);
    return 'ok';
  }

  function dropPlate(b, p, by) {
    p.dropped = true;
    const mult = MB.outMult('screw') * (p.golden ? GOLDEN_MULT : 1) * (b.bonus ? BONUS_MULT : 1);
    const scrap = Math.round(PLATE_SCRAP * mult * 10) / 10;
    // Decide the board is clear before rewards or cross-game hooks run, so a
    // problem in either can never leave an empty board stuck on screen.
    const cleared = b.plates.every(q => q.dropped);
    MB.give({ scrap });
    MB.gameEvent('screw', { type: 'drop', p: p.id, scrap, golden: p.golden, by });
    if (by === 'you') {
      a().crafts++;
      MB.track('screw.plate');
    }
    if (cleared) clearBoard(b, by);
  }

  function clearBoard(b, by) {
    const bonus = Math.round(CLEAR_PER_PLATE * b.plates.length * MB.outMult('screw') * (b.bonus ? BONUS_MULT : 1));
    MB.give({ scrap: bonus });
    const gem = Math.random() < 0.15;
    if (gem) MB.give({ gem: 1 });
    MB.gameEvent('screw', { type: 'clear', level: b.level, plates: b.plates.length, bonus, gem, wasBonus: b.bonus, by });
    newBoard(b.level + 1);
  }

  // Screwbot: a free screw at random (it isn't clever), aimed at ahead of time
  // so you can see where it's going.
  function pickTarget(b) {
    const free = freeScrews(b);
    b.botTarget = free.length ? free[Math.floor(Math.random() * free.length)] : null;
  }

  MB.registerBot('screw', {
    act({ watched }) {
      const b = g();
      if (watched && Date.now() < b.revealAt) return 'next board';
      const t = b.botTarget;
      if (!t || b.plates[t[0]].dropped || !b.plates[t[0]].screws[t[1]] || blocked(b, b.plates[t[0]], t[1])) pickTarget(b);
      if (!b.botTarget) return 'no free screws';
      const [pid, s] = b.botTarget;
      b.botTarget = null;
      unscrew(pid, s, 'bot');
      pickTarget(g());
    },
  });

  // --- View -----------------------------------------------------------------------
  let root, svg, cursor, falling = [], groups = {}, shownLevel = 0, token = 0, revealTimer = null;

  const deg = rad => (rad * 180) / Math.PI;
  const transform = p => `translate(${p.cx} ${p.cy}) rotate(${deg(p.ang)})`;

  function draw() {
    const b = g();
    shownLevel = b.level;
    svg.innerHTML = '<defs><linearGradient id="gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3a0"/><stop offset="1" stop-color="#e0a800"/></linearGradient></defs>';
    groups = {};
    svg.classList.toggle('bonus-board', b.bonus);
    for (const p of b.plates) {
      if (p.dropped) continue;
      const el = document.createElementNS(NS, 'g');
      el.setAttribute('transform', transform(p));
      el.innerHTML =
        `<rect x="${-p.len / 2}" y="${-BAR / 2}" width="${p.len}" height="${BAR}" rx="${BAR / 2}" fill="${p.golden ? 'url(#gold)' : p.color}" stroke="${p.golden ? '#8a6a08' : 'rgba(0,0,0,.4)'}" stroke-width="2"/>` +
        (p.golden ? `<text y="5" text-anchor="middle" font-size="14" font-weight="800" fill="#5a4300">×${GOLDEN_MULT}</text>` : '') +
        [0, 1].map(s => `<circle cx="${screwOffset(p, s)}" r="${R + 2}" fill="rgba(0,0,0,.35)"/>`).join('') +
        [0, 1].filter(s => p.screws[s]).map(s => `<g transform="translate(${screwOffset(p, s)} 0)"><g class="screw" data-p="${p.id}" data-s="${s}">
            <circle r="${R + 6}" fill="transparent"/><circle class="head" r="${R}"/>
            <path d="M-5 0H5M0 -5V5" stroke="#4b4b57" stroke-width="2.5" stroke-linecap="round"/>
          </g></g>`).join('');
      groups[p.id] = el;
      svg.append(el);
    }
    root.querySelector('.screw-level').textContent = `${b.bonus ? '✨ BONUS ' : ''}LEVEL ${b.level}`;
    root.querySelector('.screw-sub').textContent = `${b.plates.length} plates · clear bonus ${Math.round(CLEAR_PER_PLATE * b.plates.length * (b.bonus ? BONUS_MULT : 1))} 🔩${b.bonus ? ' · everything ×4' : ''}`;
  }

  // Put an overlay element at board coordinates (x, y).
  function place(el, x, y) {
    const r = svg.getBoundingClientRect(), box = root.querySelector('.screw-wrap').getBoundingClientRect();
    el.style.left = `${r.left - box.left + (x / W) * r.width}px`;
    el.style.top = `${r.top - box.top + (y / H) * r.height}px`;
  }

  function onTap(e) {
    const sg = e.target.closest('.screw');
    if (!sg || Date.now() < g().revealAt) return;
    if (unscrew(+sg.dataset.p, +sg.dataset.s, 'you') === 'stuck') {
      sg.classList.remove('stuck');
      void sg.getBoundingClientRect();
      sg.classList.add('stuck');
      MB.floatText('stuck!', e.clientX, e.clientY, 'bad');
    }
  }

  MB.apps.screw = {
    mount(el) {
      root = el;
      token++;
      falling = [];
      el.innerHTML = `<div class="screw-app">
        <div class="screw-level"></div>
        <div class="small center screw-sub"></div>
        <div class="screw-wrap">
          <svg class="screw-board" viewBox="0 0 ${W} ${H}"></svg>
          <div class="bot-cursor" hidden><span>🤖</span><i></i></div>
        </div>
        <p class="small center">Tap a screw to remove it. Covered screws are stuck.<br>Drop every plate to clear the board.</p>
      </div>`;
      svg = el.querySelector('svg');
      cursor = el.querySelector('.bot-cursor');
      svg.addEventListener('pointerdown', onTap);
      draw();
    },

    onEvent(evt) {
      if (!svg) return;
      if (evt.type === 'unscrew') {
        const sg = svg.querySelector(`.screw[data-p="${evt.p}"][data-s="${evt.s}"]`);
        if (sg) {
          sg.classList.add('out');
          setTimeout(() => sg.remove(), 350);
        }
      } else if (evt.type === 'drop') {
        const p = g().plates[evt.p], el = groups[evt.p];
        if (el) falling.push({ el, cx: p.cx, cy: p.cy, ang: p.ang, vy: -80, spin: (Math.random() - 0.5) * 5 });
        const r = svg.getBoundingClientRect();
        MB.floatText(`+${MB.costText({ scrap: evt.scrap })}${evt.golden ? ' ✨' : ''}`, r.left + (p.cx / W) * r.width, r.top + (p.cy / H) * r.height);
      } else if (evt.type === 'clear') {
        MB.toast(`${evt.wasBonus ? '✨ BONUS ' : ''}LEVEL ${evt.level} CLEAR! ${evt.plates} plates → +${evt.bonus} 🔩${evt.gem ? ' +1 💎' : ''}${evt.by === 'bot' ? ' (Screwbot did it)' : ''}`);
        const my = token;
        clearTimeout(revealTimer);
        revealTimer = setTimeout(() => { if (my === token && svg) draw(); }, REVEAL_MS);
      }
    },

    update(dt) {
      for (const f of falling) {
        f.vy += 900 * dt;
        f.cy += f.vy * dt;
        f.ang += f.spin * dt;
        f.el.setAttribute('transform', transform(f));
        if (f.cy > H + 300) { f.el.remove(); f.gone = true; }
      }
      falling = falling.filter(f => !f.gone);

      // Screwbot's cursor hovers over its next screw while its timer fills.
      const b = g();
      if (MB.hasBot('screw') && !b.botTarget) pickTarget(b);
      const t = b.botTarget;
      const show = MB.hasBot('screw') && t && shownLevel === b.level && Date.now() >= b.revealAt;
      cursor.hidden = !show;
      if (show) {
        const [x, y] = screwWorld(b.plates[t[0]], t[1]);
        place(cursor, x, y);
        cursor.style.setProperty('--p', MB.botProgress('screw'));
      }
    },

    unmount() { token++; clearTimeout(revealTimer); root = svg = cursor = null; },
  };
})();
