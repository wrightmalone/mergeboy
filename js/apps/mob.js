// Mob Gates 3D — the ad, not the game. A cannon at the bottom fires little blue
// units up the screen; they pass through gates (×2, +5, ÷2…) that multiply them,
// and smash into the red horde marching down. Stop the wave before it reaches
// your wall. Stopped waves drop 🦴 bones.
//
// You aim by dragging and fire by holding. The Auto-Cannon (this game's bot)
// fires one shot per move, aiming at a random gate unless Gate Sense teaches it
// to pick the best one. While you watch, every shot is simulated for real.
// While the app is closed, the bot's shots count toward the wave by their
// expected strength (no physics), and the horde never breaks through.
// Upgrades: faster fire, smarter aim, stronger gates, bigger shots.
(function () {
  const MB = window.MB;
  const W = 320, H = 460, WALL_Y = 405, CANNON_Y = 430;
  const UNIT_SPEED = 230, RED_SPEED = 26, HIT = 9, MAX_UNITS = 350;
  const MANUAL_EVERY = 0.28, WALL_HP = 10;

  // --- Model ------------------------------------------------------------------------
  const a = () => MB.app('mob');
  const g = () => (a().g ||= { wave: 1, dmg: 0 });
  const waveSize = w => 10 + 6 * w;
  const isBoss = w => w % 5 === 0;
  const bossHp = w => 25 + 6 * w;
  const shotUnits = () => 1 + MB.up('mob', 'squad');
  const boost = () => MB.up('mob', 'gates');

  // Two rows of gates for each wave; one "bad" gate shows up some of the time.
  function gatesFor(wave) {
    const rand = n => Math.floor(Math.random() * n);
    const good = () => (Math.random() < 0.5 ? { op: '×', v: 2 + rand(2) } : { op: '+', v: 3 + rand(6) });
    const bad = () => (Math.random() < 0.5 ? { op: '÷', v: 2 } : { op: '-', v: 1 });
    const rows = [300, 190];
    return rows.flatMap((y, r) => {
      const n = r === 0 ? 2 : 3, w = W / n;
      const badAt = Math.random() < 0.6 ? rand(n) : -1;
      return Array.from({ length: n }, (_, i) => ({ id: `${r}-${i}`, y, x0: i * w + 6, x1: (i + 1) * w - 6, ...(i === badAt ? bad() : good()) }));
    });
  }
  const gateValue = gt => (gt.op === '×' ? gt.v + boost() : gt.op === '+' ? 1 + (gt.v + 2 * boost()) / 4 : gt.op === '÷' ? 0.5 : 0);

  function rewardWave(wave, by) {
    const bones = Math.round((3 + wave) * (isBoss(wave) ? 3 : 1) * MB.outMult('mob'));
    MB.give({ bone: bones });
    if (by === 'you') {
      a().crafts++;
      MB.track('mob.wave');
    }
    g().wave++;
    g().dmg = 0;
    MB.gameEvent('mob', { type: 'wave', wave, bones, by });
    return bones;
  }

  // The Auto-Cannon's aim: the best gate (with Gate Sense) or any gate.
  function botAim(gates) {
    const first = gates.filter(gt => gt.y === 300);
    const pick = Math.random() < 0.25 + 0.17 * MB.up('mob', 'aim')
      ? first.reduce((b, gt) => (gateValue(gt) > gateValue(b) ? gt : b))
      : first[Math.floor(Math.random() * first.length)];
    return (pick.x0 + pick.x1) / 2 + (Math.random() - 0.5) * 30;
  }

  MB.registerBot('mob', {
    act({ watched }) {
      if (watched) {
        MB.gameEvent('mob', { type: 'botshot' });
        return;
      }
      // Off screen: count the shot's expected strength toward the wave.
      const st = g(), gates = gatesFor(st.wave);
      const first = gates.filter(gt => gt.y === 300), second = gates.filter(gt => gt.y === 190);
      const avg = list => list.reduce((s, gt) => s + gateValue(gt), 0) / list.length;
      const smart = 0.25 + 0.17 * MB.up('mob', 'aim');
      const firstMult = smart * Math.max(...first.map(gateValue)) + (1 - smart) * avg(first);
      st.dmg += shotUnits() * firstMult * avg(second) * 0.35;
      const need = waveSize(st.wave) + (isBoss(st.wave) ? bossHp(st.wave) : 0);
      if (st.dmg >= need) rewardWave(st.wave, 'bot');
    },
  });

  // --- View (the real-time simulation) ---------------------------------------------
  let root, canvas, ctx, raf = null, sim = null, pointer = null, fireT = 0, token = 0;

  function newWave() {
    const st = g();
    sim = {
      wave: st.wave, gates: gatesFor(st.wave), units: [], reds: [], spawned: 0, toSpawn: waveSize(st.wave),
      boss: isBoss(st.wave) ? { x: W / 2, y: -30, hp: bossHp(st.wave), max: bossHp(st.wave) } : null,
      spawnT: 0, wall: WALL_HP, cannonX: W / 2, aimX: W / 2, youShot: false, over: 0, msg: '',
    };
  }

  function fire(x, by) {
    if (!sim || sim.over) return;
    if (by === 'you') sim.youShot = true;
    const n = shotUnits();
    for (let i = 0; i < n && sim.units.length < MAX_UNITS; i++) {
      sim.units.push({ x: x + (i - (n - 1) / 2) * 7, y: CANNON_Y - 14, passed: {} });
    }
  }

  function step(dt) {
    const s = sim;
    if (s.over) {
      if ((s.over -= dt) <= 0) newWave();
      return;
    }
    // Cannon glides toward its aim.
    s.cannonX += (s.aimX - s.cannonX) * Math.min(1, dt * 10);

    // Spawn the horde in a trickle from the top.
    s.spawnT -= dt;
    if (s.spawned < s.toSpawn && s.spawnT <= 0) {
      s.spawnT = 0.35;
      const cluster = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < cluster && s.spawned < s.toSpawn; i++, s.spawned++) {
        s.reds.push({ x: 20 + Math.random() * (W - 40), y: -10 - Math.random() * 20 });
      }
    }

    // Units fly up, pass through gates (once each), and hit reds.
    const add = [];
    for (const u of s.units) {
      const prevY = u.y;
      u.y -= UNIT_SPEED * dt;
      for (const gt of s.gates) {
        if (u.passed[gt.id] || prevY < gt.y || u.y >= gt.y || u.x < gt.x0 || u.x > gt.x1) continue;
        u.passed[gt.id] = true;
        if (gt.op === '×' || gt.op === '+') {
          const extra = gt.op === '×' ? gt.v + boost() - 1 : gt.v + 2 * boost();
          for (let k = 0; k < extra && s.units.length + add.length < MAX_UNITS; k++) {
            add.push({ x: Math.min(gt.x1, Math.max(gt.x0, u.x + (Math.random() - 0.5) * 26)), y: u.y - Math.random() * 10, passed: { ...u.passed } });
          }
        } else if (gt.op === '-' || (gt.op === '÷' && Math.random() < 0.5)) {
          u.dead = true;
        }
      }
      if (u.y < -10) u.dead = true;
    }
    s.units.push(...add);

    for (const r of s.reds) {
      r.y += RED_SPEED * dt;
      if (r.y >= WALL_Y) {
        r.dead = true;
        s.wall--;
      }
    }
    if (s.boss) {
      s.boss.y += RED_SPEED * 0.6 * dt;
      if (s.boss.y >= WALL_Y) { s.wall = 0; }
    }

    // Collisions: one unit takes out one red (or one boss hit point).
    for (const u of s.units) {
      if (u.dead) continue;
      if (s.boss && s.boss.hp > 0 && Math.hypot(u.x - s.boss.x, u.y - s.boss.y) < 26) {
        u.dead = true;
        s.boss.hp--;
        continue;
      }
      for (const r of s.reds) {
        if (r.dead || Math.abs(u.x - r.x) > HIT || Math.abs(u.y - r.y) > HIT) continue;
        u.dead = r.dead = true;
        break;
      }
    }
    s.units = s.units.filter(u => !u.dead);
    s.reds = s.reds.filter(r => !r.dead);
    if (s.boss && s.boss.hp <= 0) s.boss = null;

    if (s.wall <= 0) {
      s.over = 1.6;
      s.msg = '💥 THE HORDE BROKE THROUGH 💥';
      MB.toast('The horde broke through. Nothing was lost. Try that wave again!');
    } else if (s.spawned >= s.toSpawn && !s.reds.length && !s.boss) {
      const bones = rewardWave(s.wave, s.youShot ? 'you' : 'bot');
      s.over = 1.2;
      s.msg = `WAVE ${s.wave} STOPPED! +${bones} 🦴`;
    }
  }

  function draw() {
    const s = sim;
    ctx.clearRect(0, 0, W, H);
    // Road
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#3b0d0d');
    grad.addColorStop(0.5, '#1e293b');
    grad.addColorStop(1, '#0f2a4a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    // Wall
    ctx.fillStyle = '#64748b';
    ctx.fillRect(0, WALL_Y + 6, W, 6);
    for (let i = 0; i < WALL_HP; i++) {
      ctx.fillStyle = i < s.wall ? '#22c55e' : '#ef444455';
      ctx.fillRect(8 + i * 14, H - 12, 10, 6);
    }
    // Gates
    for (const gt of s.gates) {
      const good = gt.op === '×' || gt.op === '+';
      ctx.fillStyle = good ? 'rgba(34,197,94,.35)' : 'rgba(239,68,68,.35)';
      ctx.strokeStyle = good ? '#4ade80' : '#f87171';
      ctx.lineWidth = 2;
      ctx.fillRect(gt.x0, gt.y - 14, gt.x1 - gt.x0, 28);
      ctx.strokeRect(gt.x0, gt.y - 14, gt.x1 - gt.x0, 28);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = gt.op === '×' ? `×${gt.v + boost()}` : gt.op === '+' ? `+${gt.v + 2 * boost()}` : `${gt.op}${gt.v}`;
      ctx.fillText(label, (gt.x0 + gt.x1) / 2, gt.y);
    }
    // Horde
    ctx.fillStyle = '#ef4444';
    for (const r of s.reds) {
      ctx.beginPath();
      ctx.arc(r.x, r.y, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    if (s.boss) {
      ctx.font = '40px serif';
      ctx.fillText('👹', s.boss.x, s.boss.y);
      ctx.fillStyle = '#0008';
      ctx.fillRect(s.boss.x - 30, s.boss.y - 34, 60, 6);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(s.boss.x - 30, s.boss.y - 34, (60 * s.boss.hp) / s.boss.max, 6);
    }
    // Units
    ctx.fillStyle = '#60a5fa';
    for (const u of s.units) {
      ctx.beginPath();
      ctx.arc(u.x, u.y, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
    // Cannon
    ctx.font = '30px serif';
    ctx.fillText(MB.hasBot('mob') && !pointer ? '🎯' : '🔫', s.cannonX, CANNON_Y);
    if (MB.hasBot('mob') && !pointer) {
      ctx.strokeStyle = '#ffcf3f';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(s.cannonX, CANNON_Y, 20, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * MB.botProgress('mob'));
      ctx.stroke();
    }
    // HUD
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`WAVE ${s.wave}${isBoss(s.wave) ? ' · BOSS' : ''}`, 8, 14);
    ctx.textAlign = 'right';
    ctx.fillText(`🔴 ${s.toSpawn - s.spawned + s.reds.length}`, W - 8, 14);
    if (s.over) {
      ctx.textAlign = 'center';
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.fillText(s.msg, W / 2, H / 2);
    }
  }

  function loop(now) {
    const my = token;
    let last = now;
    const tick = t => {
      if (my !== token) return;
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      if (pointer) {
        sim.aimX = pointer.x;
        if ((fireT -= dt) <= 0) {
          fireT = MANUAL_EVERY * 0.8 ** MB.up('mob', 'speed');
          fire(sim.cannonX, 'you');
        }
      }
      step(dt);
      draw();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }

  function toLocal(e) {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W };
  }

  MB.apps.mob = {
    mount(el) {
      root = el;
      token++;
      el.innerHTML = `<div class="mob">
        <canvas width="${W}" height="${H}"></canvas>
        <p class="small center">Hold and drag to aim and fire. Green gates multiply your units; red gates eat them.
          Stop every red before it reaches your wall.</p>
      </div>`;
      canvas = el.querySelector('canvas');
      ctx = canvas.getContext('2d');
      canvas.addEventListener('pointerdown', e => { canvas.setPointerCapture(e.pointerId); pointer = toLocal(e); });
      canvas.addEventListener('pointermove', e => { if (pointer) pointer = toLocal(e); });
      for (const t of ['pointerup', 'pointercancel']) canvas.addEventListener(t, () => { pointer = null; });
      newWave();
      loop(performance.now());
    },

    onEvent(evt) {
      if (!sim) return;
      if (evt.type === 'botshot' && !pointer) {
        sim.aimX = botAim(sim.gates);
        // Fire where it's aiming (the cannon glides there as the shot leaves).
        fire(sim.aimX, 'bot');
      }
    },

    unmount() { token++; cancelAnimationFrame(raf); root = canvas = ctx = sim = null; pointer = null; },
  };
})();
