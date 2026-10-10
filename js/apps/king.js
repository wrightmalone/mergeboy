// Rescue the King: the long-term goal, and the gold mine. Each stage costs
// materials from the other games to reach, then plays as a pull-the-pin physics
// puzzle (pinsim.js). Cleared stages can be replayed for 💰 gold, which buys
// upgrades across every other game.
//
// The Knight (this game's bot) replays your highest cleared stage one pin per
// move, following the known solution. Tap "Watch" to see the run play out with
// real physics. Treasure Maps add gold to every run, yours or his.
(function () {
  const MB = window.MB;
  const HINT_COST = { gem: 2 }, KNIGHT_CUT = 0.5;
  const DEATHS = {
    burned: 'The King touched lava. 99% of players do this.',
    monster: 'A monster got the King. It was legally distinct, but still.',
    boom: 'The King exploded. That is not in the brochure.',
  };

  let root, view, sim, stageIdx, cell, ctx, canvas, acc, time, anims, effects, hinted, overShown;

  const T = () => MB.PinSim.T;

  // --- The Knight (bot) ------------------------------------------------------------
  // Gold per Knight run = what the stage's solution actually collects, simulated
  // once per stage.
  const goldCache = {};
  function stageGold(i) {
    if (goldCache[i] === undefined) {
      const st = MB.KING[i], run = new MB.PinSim(st, 1);
      const settle = () => { for (let n = 0; n < 4000 && !run.outcome && (n === 0 || !run.settled); n++) run.step(); };
      for (const id of st.solution) { run.pull(id); settle(); }
      goldCache[i] = run.gold;
    }
    return goldCache[i];
  }
  const knight = () => (MB.app('king').g ||= { stage: 0, pulled: 0 });
  const treasure = () => 1 + 0.25 * MB.up('king', 'maps');

  MB.registerBot('king', {
    act({ watched }) {
      if (!MB.state.king) return 'no cleared stages yet';
      if (watched && view === 'play') return 'waiting for you to finish your stage';
      const k = knight();
      if (k.stage >= MB.state.king) Object.assign(k, { stage: MB.state.king - 1, pulled: 0 });
      const sol = MB.KING[k.stage].solution;
      const pin = sol[k.pulled++];
      MB.gameEvent('king', { type: 'pull', stage: k.stage, pin });
      if (k.pulled >= sol.length) {
        // The Knight keeps half. He has a horse to feed.
        const gold = Math.round(stageGold(k.stage) * KNIGHT_CUT * treasure() * MB.outMult('king'));
        MB.give({ gold });
        MB.gameEvent('king', { type: 'run', stage: k.stage, gold });
        Object.assign(k, { stage: MB.state.king - 1, pulled: 0 });
      }
    },
  });

  // --- Stage map -----------------------------------------------------------------
  function showMap() {
    MB.busy.king = false;
    view = 'map';
    sim = null;
    const s = MB.state;
    const cards = MB.KING.map((st, i) => {
      const cleared = i < s.king, current = i === s.king;
      let action = '';
      if (cleared) action = `<button class="btn play" data-i="${i}">Replay for 💰</button>`;
      else if (current && s.kingPaid) action = `<button class="btn primary play" data-i="${i}">Play</button>`;
      else if (current) action = `<button class="btn primary send" data-i="${i}">Send ${MB.costText(st.cost)}</button>`;
      return `<div class="stage-card ${cleared ? 'cleared' : current ? 'current' : 'locked'}">
        <div class="stage-num">${cleared ? '✅' : current ? '🤴' : '🔒'}</div>
        <div class="stage-info"><b>${i + 1}. ${st.name}</b>
          <div class="small">${current || cleared ? st.peril : 'Stage locked.'}</div></div>
        ${action}
      </div>`;
    }).join('');
    const done = s.king >= MB.KING.length;
    const knightCard = MB.hasBot('king') ? `<div class="stage-card knight-card">
        <div class="stage-num">🗡️</div><div class="stage-info"><b>The Knight’s run</b><div class="small knight-status"></div></div>
        <button class="btn primary watch">Watch</button></div>` : '';
    root.innerHTML = `<div class="king-map">${knightCard}
      <p class="small center">${done
        ? '🤴🎉 The King is safe. Replay any stage for 💰. (He keeps falling back in.)'
        : 'Send materials from your other games to reach each stage, then pull the pins. Gold the King collects is yours. Cleared stages can be replayed for more.'}</p>
      ${cards}
      ${done ? '<button class="btn ending">Watch the ending again</button>' : ''}
    </div>`;
    root.querySelectorAll('.play').forEach(b => { b.onclick = () => play(+b.dataset.i); });
    root.querySelectorAll('.send').forEach(b => {
      b.onclick = () => {
        if (!MB.pay(MB.KING[+b.dataset.i].cost)) return;
        s.kingPaid = true;
        play(+b.dataset.i);
      };
    });
    root.querySelector('.ending')?.addEventListener('click', showEnding);
    root.querySelector('.watch')?.addEventListener('click', watch);
    refresh();
  }

  function refresh() {
    if (view !== 'map' || !root) return;
    root.querySelectorAll('.send').forEach(b => { b.disabled = !MB.can(MB.KING[+b.dataset.i].cost); });
    const status = root.querySelector('.knight-status');
    if (status) {
      const k = knight(), wait = MB.app('king').botWait;
      status.textContent = wait
        ? `💤 ${wait}`
        : `Stage ${k.stage + 1} · pin ${k.pulled + 1}/${MB.KING[k.stage].solution.length} · next pull in ${Math.ceil(MB.botEvery('king') * (1 - MB.botProgress('king')))}s`;
    }
  }

  // --- Playing a stage ----------------------------------------------------------
  function play(i) {
    setup(i, 'play');
  }

  // Watch the Knight's current run: rebuild its board, catch up on the pins he
  // already pulled, then follow his moves live.
  function watch() {
    const k = knight();
    if (k.stage >= MB.state.king) Object.assign(k, { stage: MB.state.king - 1, pulled: 0 });
    setup(k.stage, 'watch', 1);
    for (const id of MB.KING[k.stage].solution.slice(0, k.pulled)) {
      sim.pull(id);
      for (let n = 0; n < 4000 && !sim.outcome && (n === 0 || !sim.settled); n++) sim.step();
      sim.events.length = 0;
    }
    draw();
  }

  function setup(i, mode, seed) {
    MB.busy.king = false;
    view = mode;
    stageIdx = i;
    const st = MB.KING[i];
    sim = new MB.PinSim(st, seed);
    acc = time = 0;
    anims = [];
    effects = [];
    hinted = null;
    overShown = false;
    const watching = mode === 'watch';
    root.innerHTML = `<div class="king-play">
      <div class="king-title"><b>${watching ? '🗡️ ' : ''}${i + 1}. ${st.name}</b><span class="hud"></span></div>
      <div class="pin-stage"><canvas></canvas></div>
      <p class="small center">${watching
        ? 'The Knight is replaying this stage for gold, one pin at a time. You can’t help. He’s very proud.'
        : 'Tap a pin to pull it. Get the gold to the King. Kill every monster. Don’t kill the King.'}</p>
      <div class="row">
        <button class="btn back-map">‹ Stages</button>
        ${watching ? '' : `<button class="btn restart">↻ Restart</button>
        <button class="btn hint">💡 Hint · ${MB.costText(HINT_COST)}</button>`}
      </div>
      <div class="king-over" hidden></div>
    </div>`;
    canvas = root.querySelector('canvas');
    const width = Math.min(root.clientWidth || 340, 360);
    cell = Math.floor(width / sim.w);
    const dpr = window.devicePixelRatio || 1;
    canvas.width = cell * sim.w * dpr;
    canvas.height = cell * sim.h * dpr;
    canvas.style.width = `${cell * sim.w}px`;
    canvas.style.height = `${cell * sim.h}px`;
    ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    canvas.addEventListener('pointerdown', onTap);
    root.querySelector('.back-map').onclick = showMap;
    root.querySelector('.restart')?.addEventListener('click', () => play(i));
    root.querySelector('.hint')?.addEventListener('click', hint);
    hud();
    draw();
  }

  function onTap(e) {
    if (sim.outcome || view !== 'play') return;
    const r = canvas.getBoundingClientRect();
    const cx = Math.floor((e.clientX - r.left) / cell), cy = Math.floor((e.clientY - r.top) / cell);
    // Pins are one cell thick; accept taps a cell away.
    let best = null;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = cx + dx, y = cy + dy;
        if (sim.get(x, y) !== T().PIN) continue;
        const d = Math.abs(dx) + Math.abs(dy);
        if (!best || d < best.d) best = { id: sim.pinOf[sim.idx(x, y)], d };
      }
    }
    if (!best) return;
    const pin = sim.pins[best.id];
    anims.push({ cells: pin.cells, horizontal: pin.horizontal, label: MB.KING[stageIdx].labels?.[best.id], t: 0 });
    sim.pull(best.id);
    if (hinted === best.id) hinted = null;
  }

  function hint() {
    const next = MB.KING[stageIdx].solution.find(id => !sim.pins[id].pulled);
    if (!next || sim.outcome) return;
    if (!MB.pay(HINT_COST)) {
      MB.paywall({
        title: 'Need a hint? 💡',
        item: '💡 Hint',
        price: `💎 ${HINT_COST.gem} <small>($1.99)</small>`,
        options: [
          { metric: 'merge.slab', amount: 2, reward: { type: 'res', res: { gem: 2 } }, label: '+2 💎' },
          { metric: 'match3.win', amount: 1, reward: { type: 'res', res: { gem: 3 } }, label: '+3 💎' },
        ],
        wait: 'just think about it for a minute (the King can wait)',
      });
      return;
    }
    hinted = next;
    MB.toast('💡 The glowing pin is next. (Assuming you followed the plan so far.)');
  }

  function hud() {
    const el = root.querySelector('.hud');
    if (!el) return;
    const mons = sim.monstersLeft, skin = MB.KING[stageIdx].skin || '👹';
    el.textContent = `💰 ${sim.gold}/${sim.need}${mons ? `  ${skin} ×${mons}` : ''}`;
  }

  function update(dt) {
    if ((view !== 'play' && view !== 'watch') || !sim) return;
    time += dt;
    acc += dt;
    const tick = 1 / MB.PinSim.TICKS_PER_SEC;
    while (acc >= tick) {
      acc -= tick;
      sim.step();
      for (const ev of sim.events) effects.push({ ...ev, t: 0 });
      sim.events.length = 0;
    }
    for (const a of anims) a.t += dt;
    anims = anims.filter(a => a.t < 0.4);
    for (const f of effects) f.t += dt;
    effects = effects.filter(f => f.t < 0.8);
    hud();
    draw();
    if (view === 'watch') {
      // Let the physics finish before the Knight pulls his next pin.
      MB.busy.king = !sim.settled || anims.length > 0;
      return;
    }
    if (sim.outcome && !overShown) {
      overShown = true;
      setTimeout(() => { if (view === 'play' && root) finish(); }, sim.outcome === 'win' ? 500 : 900);
    }
  }

  function finish() {
    const s = MB.state, st = MB.KING[stageIdx], over = root.querySelector('.king-over');
    over.hidden = false;
    if (sim.outcome === 'lose') {
      const why = DEATHS[sim.dead] || (sim.monstersLeft
        ? 'Out of pins and the monsters are still there. The King refuses to come out.'
        : 'Out of pins and the King is still broke. He waited. And waited.');
      over.innerHTML = `<div class="over-card lose">
        <div class="over-big">💀</div><h3>LEVEL FAILED</h3><p>${why}</p>
        <p class="small">Only 1% of players solve this! (Your materials are safe.)</p>
        <button class="btn primary retry">↻ Try again</button></div>`;
      over.querySelector('.retry').onclick = () => play(stageIdx);
      return;
    }

    const earned = Math.round(sim.gold * treasure() * MB.outMult('king'));
    MB.give({ gold: earned });
    MB.app('king').crafts++;
    MB.track('king.win');
    const firstClear = stageIdx === s.king;
    const final = firstClear && stageIdx === MB.KING.length - 1;
    if (firstClear) {
      s.king++;
      s.kingPaid = false;
      MB.give({ gem: 3 });
    }
    over.innerHTML = `<div class="over-card win">
      <div class="over-big">🥳</div><h3>${firstClear ? 'STAGE CLEARED!' : 'TREASURE RUN!'}</h3>
      ${firstClear ? `<p>${st.win}</p>` : ''}
      <p class="reward">+${MB.fmt(earned)} 💰${firstClear ? ' · +3 💎' : ''}</p>
      ${firstClear && !final ? '<p class="small">Everything you and your bots earn is now 20% bigger.</p>' : ''}
      <div class="row"><button class="btn again">↻ Replay</button><button class="btn primary next">${final ? '👑 Ending' : 'Stages ›'}</button></div>
    </div>`;
    over.querySelector('.again').onclick = () => play(stageIdx);
    over.querySelector('.next').onclick = () => (final ? showEnding() : showMap());
  }

  // --- Rendering ------------------------------------------------------------------
  function draw() {
    const t = T(), c = cell;
    ctx.fillStyle = '#1b1428';
    ctx.fillRect(0, 0, sim.w * c, sim.h * c);

    for (let y = 0; y < sim.h; y++) {
      for (let x = 0; x < sim.w; x++) {
        const v = sim.get(x, y), px = x * c, py = y * c;
        if (v === t.WALL) {
          ctx.fillStyle = '#3a2c20';
          ctx.fillRect(px, py, c, c);
          ctx.fillStyle = '#4c3a2a';
          const off = y % 2 ? c / 2 : 0;
          ctx.fillRect(px + 1, py + 1, c - 2, c / 2 - 1);
          ctx.fillRect(px + 1 + off / 2, py + c / 2 + 1, c - 2 - off / 2, c / 2 - 2);
        } else if (v === t.WATER) {
          ctx.fillStyle = `hsl(${205 + 6 * Math.sin(time * 3 + x * 0.9 + y)}, 85%, 58%)`;
          ctx.fillRect(px, py, c, c);
        } else if (v === t.LAVA) {
          ctx.fillStyle = `hsl(${18 + 12 * Math.sin(time * 5 + x * 1.3 + y * 0.7)}, 100%, 52%)`;
          ctx.fillRect(px, py, c, c);
        } else if (v === t.STONE) {
          ctx.fillStyle = '#878494';
          roundRect(px + 1, py + 1, c - 2, c - 2, c / 4);
        } else if (v === t.GOLD) {
          ctx.fillStyle = '#ffd34d';
          ctx.strokeStyle = '#b8860b';
          ctx.lineWidth = Math.max(1, c / 10);
          ctx.beginPath();
          ctx.arc(px + c / 2, py + c / 2, c * 0.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }
    }

    const labels = MB.KING[stageIdx].labels || {};
    for (const pin of Object.values(sim.pins)) {
      if (!pin.pulled) drawPin(pin.cells, pin.horizontal, 0, 1, pin.id === hinted, labels[pin.id]);
    }
    for (const a of anims) drawPin(a.cells, a.horizontal, (a.t / 0.4) * c * 4, 1 - a.t / 0.4, false, a.label);
    if (view === 'watch') drawKnightCursor();

    const skin = MB.KING[stageIdx].skin || '👹';
    const kingFace = sim.dead ? '💀' : sim.outcome === 'win' ? '🥳' : '🤴';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let y = 0; y < sim.h; y++) {
      for (let x = 0; x < sim.w; x++) {
        const v = sim.get(x, y);
        const glyph = v === t.KING ? kingFace : v === t.MONSTER ? skin : v === t.BOMB ? '💣' : null;
        if (!glyph) continue;
        ctx.font = `${c * (v === t.BOMB ? 1 : 1.35)}px serif`;
        ctx.fillText(glyph, x * c + c / 2, y * c + c / 2 - (v === t.BOMB ? 0 : c * 0.12));
      }
    }

    for (const f of effects) {
      const k = f.t / 0.8, glyph = { gold: '✨', steam: '💨', burn: '🔥', boom: '💥', dead: '💥' }[f.type];
      ctx.globalAlpha = 1 - k;
      ctx.font = `${c * (f.type === 'boom' ? 4 * (0.5 + k) : 1)}px serif`;
      ctx.fillText(glyph, f.x * c + c / 2, f.y * c + c / 2 - k * c);
      ctx.globalAlpha = 1;
    }
  }

  // The Knight hovers over the pin he'll pull next, with a ring for his timer.
  function drawKnightCursor() {
    const next = sim.pins[MB.KING[stageIdx].solution[knight().pulled]];
    if (!next || next.pulled || MB.busy.king) return;
    const c = cell, xs = next.cells.map(p => p[0]), ys = next.cells.map(p => p[1]);
    const x = next.horizontal ? (Math.max(...xs) + 0.8) * c : (xs[0] + 0.5) * c;
    const y = next.horizontal ? (ys[0] + 0.5) * c : (Math.min(...ys) + 0.2) * c;
    ctx.save();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#0006';
    ctx.beginPath();
    ctx.arc(x, y, c * 0.75, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#ffcf3f';
    ctx.beginPath();
    ctx.arc(x, y, c * 0.75, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * MB.botProgress('king'));
    ctx.stroke();
    ctx.font = `${c * 1.1}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🗡️', x + c * 0.5, y - c * 0.8);
    ctx.restore();
  }

  function drawPin(cells, horizontal, slide, alpha, glow, label) {
    const c = cell;
    const xs = cells.map(p => p[0]), ys = cells.map(p => p[1]);
    const x0 = Math.min(...xs) * c, x1 = (Math.max(...xs) + 1) * c, y0 = Math.min(...ys) * c, y1 = (Math.max(...ys) + 1) * c;
    const th = c * 0.42;
    ctx.save();
    ctx.globalAlpha = alpha;
    if (horizontal) ctx.translate(slide, 0); else ctx.translate(0, -slide);
    if (glow) {
      ctx.shadowColor = '#7fffd4';
      ctx.shadowBlur = 10 + 6 * Math.sin(time * 8);
    }
    const grad = horizontal ? ctx.createLinearGradient(0, (y0 + y1) / 2 - th / 2, 0, (y0 + y1) / 2 + th / 2) : ctx.createLinearGradient((x0 + x1) / 2 - th / 2, 0, (x0 + x1) / 2 + th / 2, 0);
    grad.addColorStop(0, '#fff2a8');
    grad.addColorStop(1, '#c99a0e');
    ctx.fillStyle = grad;
    let hx, hy;
    if (horizontal) {
      roundRect(x0, (y0 + y1) / 2 - th / 2, x1 - x0, th, th / 2);
      hx = x1 - c * 0.2; hy = (y0 + y1) / 2;
    } else {
      roundRect((x0 + x1) / 2 - th / 2, y0, th, y1 - y0, th / 2);
      hx = (x0 + x1) / 2; hy = y0 + c * 0.2;
    }
    ctx.beginPath();
    ctx.arc(hx, hy, c * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8a6a08';
    ctx.lineWidth = Math.max(1, c / 12);
    ctx.stroke();
    if (label) {
      ctx.shadowBlur = 0;
      ctx.font = `bold ${Math.max(9, c * 0.55)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      // Horizontal: on the bar. Vertical: just above the head, clear of the rooms.
      const lx = horizontal ? (x0 + x1) / 2 : hx, ly = horizontal ? hy : y0 - c * 0.55;
      ctx.strokeText(label, lx, ly);
      ctx.fillText(label, lx, ly);
    }
    ctx.restore();
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h);
    ctx.fill();
  }

  function showEnding() {
    MB.state.won = true;
    MB.modal({
      cls: 'ending',
      title: '🤴 THE KING IS SAVED',
      body: `<p>You unscrewed the screws. You ground the thing. You merged the boy. You sliced it all. You pulled every pin.</p>
        <p>The King looks you in the eye and says:</p>
        <blockquote>“Thank you. Now please rate us 5 stars.”</blockquote>
        <p>Then he falls into a new ditch.</p>
        <p><b>Rescue the King 2</b> — coming soon.</p>
        <p class="small">Thanks for playing the MergeBoy prototype. Your bots will keep playing forever, and the King's stages are open for treasure runs.</p>`,
      buttons: [{ label: '⭐⭐⭐⭐⭐', primary: true }],
      onClose: () => { if (root) showMap(); },
    });
  }

  function onEvent(evt) {
    if (view !== 'watch' || !sim || evt.stage !== stageIdx) return;
    if (evt.type === 'pull' && sim.pins[evt.pin] && !sim.pins[evt.pin].pulled) {
      const pin = sim.pins[evt.pin];
      anims.push({ cells: pin.cells, horizontal: pin.horizontal, label: MB.KING[stageIdx].labels?.[evt.pin], t: 0 });
      sim.pull(evt.pin);
    } else if (evt.type === 'run') {
      const over = root.querySelector('.king-over');
      over.hidden = false;
      over.innerHTML = `<div class="over-card win"><div class="over-big">🗡️</div><h3>RUN COMPLETE</h3><p class="reward">+${MB.fmt(evt.gold)} 💰</p>
        <p class="small">The Knight starts his next run.</p></div>`;
      setTimeout(() => { if (view === 'watch' && root) watch(); }, 1600);
    }
  }

  MB.apps.king = {
    mount(el) { root = el; showMap(); },
    update,
    refresh,
    onEvent,
    unmount() { MB.busy.king = false; root = sim = null; view = null; },
  };
})();
