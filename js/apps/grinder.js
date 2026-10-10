// Grind the Thing — hold to build pressure, keep the needle in the satisfying
// zone to grind scrap into dust. Too much pressure jams the machine.
(function () {
  const MB = window.MB;
  const GREEN = [0.55, 0.82], RED = 0.95, BATCH_SECS = 0.9, JAM_SECS = 2;
  const RISE = 0.6, FALL = 0.4;

  let refs, pressure, progress, jam, holding, angle;

  MB.apps.grinder = {
    mount(el) {
      pressure = progress = jam = angle = 0;
      holding = false;
      el.innerHTML = `<div class="grinder">
        <div class="hopper">Hopper: <b class="hop">0</b> 🔩 <span class="small">(2 per batch)</span></div>
        <div class="gear">⚙️</div>
        <div class="gauge">
          <div class="zone green" style="left:${GREEN[0] * 100}%;width:${(GREEN[1] - GREEN[0]) * 100}%"></div>
          <div class="zone red" style="left:${RED * 100}%;width:${(1 - RED) * 100}%"></div>
          <div class="needle"></div>
        </div>
        <div class="gauge-labels"><span>meh</span><span class="mid" style="left:${((GREEN[0] + GREEN[1]) / 2) * 100}%">✨ SATISFYING ✨</span><span>💥</span></div>
        <div class="meter grind-progress"><div></div></div>
        <button class="btn hold">HOLD TO GRIND</button>
        <p class="small center counter"></p>
      </div>`;
      const q = s => el.querySelector(s);
      refs = { hop: q('.hop'), gear: q('.gear'), needle: q('.needle'), bar: q('.grind-progress div'), btn: q('.hold'), counter: q('.counter') };
      const down = e => { e.preventDefault(); holding = true; refs.btn.classList.add('held'); };
      const up = () => { holding = false; refs.btn.classList.remove('held'); };
      refs.btn.addEventListener('pointerdown', down);
      for (const t of ['pointerup', 'pointerleave', 'pointercancel']) refs.btn.addEventListener(t, up);
      this.refresh();
    },

    update(dt) {
      if (jam > 0) {
        jam -= dt;
        pressure = Math.max(0, pressure - dt);
        refs.btn.textContent = jam > 0 ? '💥 JAMMED — unjamming…' : 'HOLD TO GRIND';
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

      const inGreen = jam <= 0 && pressure >= GREEN[0] && pressure <= GREEN[1];
      const recipe = MB.APPS.grinder.recipe;
      if (inGreen && MB.can(recipe.in)) {
        progress += dt / BATCH_SECS;
        if (progress >= 1) {
          progress = 0;
          MB.pay(recipe.in);
          const mult = MB.handMult('grinder');
          MB.give(recipe.out, mult);
          MB.app('grinder').crafts++;
          MB.floatFrom(refs.gear, `+${MB.costText({ dust: recipe.out.dust * mult })}`);
        }
      }

      angle += pressure * 900 * dt;
      refs.gear.style.transform = `rotate(${angle}deg)`;
      refs.gear.classList.toggle('happy', inGreen);
      refs.needle.style.left = `${pressure * 100}%`;
      refs.bar.style.width = `${progress * 100}%`;
    },

    refresh() {
      refs.hop.textContent = MB.fmt(MB.state.res.scrap);
      const empty = !MB.can(MB.APPS.grinder.recipe.in);
      refs.counter.textContent = empty
        ? 'Hopper empty. Go unscrew something.'
        : `Things ground: ${MB.fmt(MB.app('grinder').crafts)}. Number go up.`;
    },

    unmount() { refs = null; },
  };
})();
