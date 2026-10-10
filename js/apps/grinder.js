// Grind the Thing — hold to build pressure, keep the needle in the satisfying
// zone to grind scrap into dust. Too much pressure jams the machine.
//
// Grindbot holds the button for you: you can watch its arm on the button, the
// needle settle into the zone and the batch bar fill over its (long) timer.
// Grabbing the button yourself is always faster. Upgrades: more dust per batch,
// a wider sweet spot for your hands, and a faster bot.
(function () {
  const MB = window.MB;
  const RED = 0.95, BATCH_SECS = 0.9, JAM_SECS = 2, RISE = 0.6, FALL = 0.4;
  const BATCH = { scrap: 2 };

  // --- Model ------------------------------------------------------------------------
  const a = () => MB.app('grinder');
  const green = () => {
    const w = 0.03 * MB.up('grinder', 'zone');
    return [0.55 - w, 0.82 + w];
  };

  // Grind one batch: 2 🔩 → (1 + Finer Grit) 💨.
  function grind(by) {
    if (!MB.pay(BATCH)) return false;
    const dust = Math.round((1 + MB.up('grinder', 'yield')) * MB.outMult('grinder') * 10) / 10;
    MB.give({ dust });
    if (by === 'you') {
      a().crafts++;
      MB.track('grinder.batch');
    }
    MB.gameEvent('grinder', { type: 'batch', dust, by });
    return true;
  }

  MB.registerBot('grinder', {
    act() {
      if (!MB.can(BATCH)) return 'needs 🔩';
      grind('bot');
    },
  });

  // --- View -----------------------------------------------------------------------
  let refs, pressure, progress, jam, holding, angle;

  function zoneHtml() {
    const [g0, g1] = green();
    return `<div class="zone green" style="left:${g0 * 100}%;width:${(g1 - g0) * 100}%"></div>
      <div class="zone red" style="left:${RED * 100}%;width:${(1 - RED) * 100}%"></div><div class="needle"></div>`;
  }

  MB.apps.grinder = {
    mount(el) {
      pressure = progress = jam = angle = 0;
      holding = false;
      const [g0, g1] = green();
      el.innerHTML = `<div class="grinder">
        <div class="hopper">Hopper: <b class="hop">0</b> 🔩 <span class="small">(2 per batch)</span></div>
        <div class="gear">⚙️</div>
        <div class="gauge">${zoneHtml()}</div>
        <div class="gauge-labels"><span>meh</span><span class="mid" style="left:${((g0 + g1) / 2) * 100}%">✨ SATISFYING ✨</span><span>💥</span></div>
        <div class="meter grind-progress"><div></div></div>
        <div class="hold-wrap"><button class="btn hold">HOLD TO GRIND</button><span class="bot-arm" hidden>🦾</span></div>
        <p class="small center counter"></p>
      </div>`;
      const q = s => el.querySelector(s);
      refs = { hop: q('.hop'), gear: q('.gear'), gauge: q('.gauge'), needle: q('.needle'), bar: q('.grind-progress div'), btn: q('.hold'), arm: q('.bot-arm'), counter: q('.counter') };
      const down = e => { e.preventDefault(); holding = true; refs.btn.classList.add('held'); };
      const up = () => { holding = false; refs.btn.classList.remove('held'); };
      refs.btn.addEventListener('pointerdown', down);
      for (const t of ['pointerup', 'pointerleave', 'pointercancel']) refs.btn.addEventListener(t, up);
      this.refresh();
    },

    onEvent(evt) {
      if (refs && evt.type === 'batch') MB.floatFrom(refs.gear, `+${MB.costText({ dust: evt.dust })}${evt.by === 'bot' ? ' 🦾' : ''}`);
    },

    update(dt) {
      const [g0, g1] = green();
      const botOn = MB.hasBot('grinder') && !holding && jam <= 0 && MB.can(BATCH);
      if (jam > 0) {
        jam -= dt;
        pressure = Math.max(0, pressure - dt);
      } else if (botOn) {
        // Grindbot eases the needle into the zone and keeps it there.
        const target = (g0 + g1) / 2 + Math.sin(Date.now() / 300) * 0.04;
        pressure += (target - pressure) * Math.min(1, dt * 3);
      } else {
        pressure += (holding ? RISE : -FALL) * dt;
        pressure = Math.min(1, Math.max(0, pressure));
        if (pressure >= RED) {
          jam = JAM_SECS;
          progress = 0;
          holding = false;
          refs.btn.classList.remove('held');
          MB.floatFrom(refs.gear, '💥 JAMMED', 'bad');
        }
      }

      const inGreen = jam <= 0 && pressure >= g0 && pressure <= g1;
      if (!botOn && inGreen && holding && MB.can(BATCH)) {
        progress += dt / BATCH_SECS;
        if (progress >= 1) {
          progress = 0;
          grind('you');
        }
      }

      angle += pressure * 900 * dt;
      refs.gear.style.transform = `rotate(${angle}deg)`;
      refs.gear.classList.toggle('happy', inGreen);
      refs.needle.style.left = `${pressure * 100}%`;
      // Your batch bar while you hold; Grindbot's (slow) timer otherwise.
      refs.bar.style.width = `${(botOn ? MB.botProgress('grinder') : progress) * 100}%`;
      refs.arm.hidden = !botOn;
      refs.btn.classList.toggle('held', holding || botOn);
      refs.btn.textContent = jam > 0 ? '💥 JAMMED — unjamming…' : botOn ? 'GRINDBOT IS HOLDING IT' : 'HOLD TO GRIND';
    },

    refresh() {
      if (!refs) return;
      refs.hop.textContent = MB.fmt(MB.state.res.scrap);
      // The Wider Sweet Spot upgrade can change the zone while we're open.
      const [g0, g1] = green(), zone = refs.gauge.querySelector('.green');
      if (zone && zone.style.width !== `${(g1 - g0) * 100}%`) {
        refs.gauge.innerHTML = zoneHtml();
        refs.needle = refs.gauge.querySelector('.needle');
      }
      refs.counter.textContent = !MB.can(BATCH)
        ? 'Hopper empty. Go unscrew something.'
        : `Things ground: ${MB.fmt(a().crafts)}. Number go up.`;
    },

    unmount() { refs = null; },
  };
})();
