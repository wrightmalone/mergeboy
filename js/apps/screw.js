// Screw Loose 3D — "remove the screw". Plates are stacked bars, each held by two
// screws. A screw only comes out if no higher plate covers it. Drop a plate,
// get scrap. The top plate is always free, so every level is solvable.
(function () {
  const MB = window.MB;
  const W = 320, H = 320, BAR = 34, R = 10, NS = 'http://www.w3.org/2000/svg';
  const COLORS = ['#ff5d73', '#ffb84d', '#4dd2ff', '#9b7bff', '#5ee089', '#ff8fd8', '#ffd84d', '#7dd3fc'];

  let root, svg, plates, levelNum, token = 0;

  const deg = rad => (rad * 180) / Math.PI;
  const transform = p => `translate(${p.cx} ${p.cy}) rotate(${deg(p.ang)})`;
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
  const blocked = (p, x, y) => plates.some(q => q.id > p.id && !q.falling && covers(q, x, y));

  function newLevel() {
    const a = MB.app('screw');
    levelNum = (a.level || 0) + 1;
    const n = Math.min(3 + Math.floor(levelNum / 2), 8);
    plates = [];
    for (let i = 0; i < n; i++) {
      const len = 120 + Math.random() * 120, ang = Math.random() * Math.PI;
      const hx = (Math.abs(Math.cos(ang)) * len) / 2 + BAR / 2;
      const hy = (Math.abs(Math.sin(ang)) * len) / 2 + BAR / 2;
      plates.push({
        id: i, len, ang,
        cx: hx + Math.random() * (W - 2 * hx),
        cy: hy + Math.random() * (H - 2 * hy),
        color: COLORS[i % COLORS.length],
        screws: [true, true], falling: false, gone: false, vy: 0, spin: 0,
      });
    }
    root.querySelector('.screw-level').textContent = `LEVEL ${levelNum}`;
    draw();
  }

  function draw() {
    svg.innerHTML = '';
    for (const p of plates) {
      const g = document.createElementNS(NS, 'g');
      g.setAttribute('transform', transform(p));
      g.innerHTML =
        `<rect x="${-p.len / 2}" y="${-BAR / 2}" width="${p.len}" height="${BAR}" rx="${BAR / 2}" fill="${p.color}" stroke="rgba(0,0,0,.4)" stroke-width="2"/>` +
        [0, 1].map(s => `<circle cx="${screwOffset(p, s)}" r="${R + 2}" fill="rgba(0,0,0,.35)"/>`).join('') +
        [0, 1].map(s => `<g transform="translate(${screwOffset(p, s)} 0)"><g class="screw" data-p="${p.id}" data-s="${s}">
            <circle r="${R + 6}" fill="transparent"/>
            <circle class="head" r="${R}"/>
            <path d="M-5 0H5M0 -5V5" stroke="#4b4b57" stroke-width="2.5" stroke-linecap="round"/>
          </g></g>`).join('');
      p.g = g;
      svg.append(g);
    }
  }

  function onTap(e) {
    const sg = e.target.closest('.screw');
    if (!sg) return;
    const p = plates[+sg.dataset.p], s = +sg.dataset.s;
    if (!p.screws[s] || p.falling) return;
    const [x, y] = screwWorld(p, s);
    if (blocked(p, x, y)) {
      sg.classList.remove('stuck');
      void sg.getBoundingClientRect();
      sg.classList.add('stuck');
      MB.floatText('stuck!', e.clientX, e.clientY, 'bad');
      return;
    }
    p.screws[s] = false;
    sg.classList.add('out');
    setTimeout(() => sg.remove(), 350);
    if (!p.screws[0] && !p.screws[1]) dropPlate(p, e);
  }

  function dropPlate(p, e) {
    p.falling = true;
    p.vy = -80;
    p.spin = (Math.random() - 0.5) * 5;
    const a = MB.app('screw'), out = MB.APPS.screw.recipe.out, mult = MB.boostMult();
    MB.give(out, mult);
    a.crafts++;
    MB.floatText(`+${MB.costText({ scrap: out.scrap * mult })}`, e.clientX, e.clientY);
    if (plates.every(q => q.falling)) levelClear();
  }

  function levelClear() {
    const a = MB.app('screw'), my = token;
    a.level = levelNum;
    const bonus = 3 * MB.boostMult();
    MB.give({ scrap: bonus });
    let msg = `LEVEL ${levelNum} CLEAR! Only 1% made it! +${bonus} 🔩`;
    if (Math.random() < 0.15) {
      MB.give({ gem: 1 });
      msg += ' +1 💎';
    }
    MB.toast(msg);
    setTimeout(() => { if (my === token) newLevel(); }, 900);
  }

  MB.apps.screw = {
    mount(el) {
      root = el;
      token++;
      el.innerHTML = `<div class="screw-app">
        <div class="screw-level"></div>
        <svg class="screw-board" viewBox="0 0 ${W} ${H}"></svg>
        <p class="small center">Tap a screw to remove it. Covered screws are stuck.<br>Drop every plate to clear the level.</p>
      </div>`;
      svg = el.querySelector('svg');
      svg.addEventListener('pointerdown', onTap);
      newLevel();
    },
    update(dt) {
      for (const p of plates) {
        if (!p.falling || p.gone) continue;
        p.vy += 900 * dt;
        p.cy += p.vy * dt;
        p.ang += p.spin * dt;
        p.g.setAttribute('transform', transform(p));
        if (p.cy > H + 300) { p.gone = true; p.g.remove(); }
      }
    },
    unmount() { token++; root = svg = null; },
  };
})();
