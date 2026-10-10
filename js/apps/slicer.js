// Slice It All! — a knife sweeps across the slab; tap to cut at each marker.
// Perfect cuts give bonus blocks; an all-perfect slab gives a gem.
//
// Knife Bot cuts the same slab you see: one cut per move, aimed at the next
// marker with a shaky hand (Steady Hand makes it land more PERFECTs). It loads
// a new slab when the last one is done. Upgrades: steadier hand, more cuts per
// slab (+1 block each), a faster bot.
(function () {
  const MB = window.MB;
  const PERFECT = 0.02, GOOD = 0.06, LOAD = { slab: 1 }, BASE_CUTS = 3;

  // --- Model ------------------------------------------------------------------------
  const a = () => MB.app('slicer');
  const s = () => (a().g ||= { loaded: false, cuts: [] });
  const cutCount = () => BASE_CUTS + MB.up('slicer', 'cuts');

  function load() {
    const st = s();
    if (st.loaded) return true;
    if (!MB.pay(LOAD)) return false;
    Object.assign(st, { loaded: true, cuts: [], n: cutCount() });
    MB.gameEvent('slicer', { type: 'load' });
    return true;
  }

  function cut(pos, by) {
    const st = s();
    if (!st.loaded) return;
    const t = (st.cuts.length + 1) / (st.n + 1), d = Math.abs(pos - t);
    const q = d < PERFECT ? 'perfect' : d < GOOD ? 'good' : 'meh';
    st.cuts.push({ pos, q });
    MB.gameEvent('slicer', { type: 'cut', pos, q, by });
    if (st.cuts.length >= st.n) finish(by);
  }

  function finish(by) {
    const st = s(), perfects = st.cuts.filter(c => c.q === 'perfect').length;
    const block = Math.round((st.n + perfects) * MB.outMult('slicer') * 10) / 10;
    const flawless = perfects === st.n;
    MB.give({ block });
    if (flawless) MB.give({ gem: 1 });
    if (by === 'you') {
      a().crafts++;
      MB.track('slicer.slab');
    }
    st.loaded = false;
    MB.gameEvent('slicer', { type: 'done', block, flawless, by });
  }

  // Knife Bot aims at the next marker; how close it lands depends on Steady Hand.
  function botCut() {
    const st = s(), t = (st.cuts.length + 1) / (st.n + 1), steady = MB.up('slicer', 'steady');
    const r = Math.random();
    const err = r < 0.1 + 0.15 * steady ? Math.random() * PERFECT * 0.9
      : r < 0.55 + 0.08 * steady ? PERFECT + Math.random() * (GOOD - PERFECT)
        : GOOD + Math.random() * 0.08;
    cut(Math.min(0.99, Math.max(0.01, t + (Math.random() < 0.5 ? -err : err))), 'bot');
  }

  MB.registerBot('slicer', {
    act() {
      if (!s().loaded) return load() ? undefined : 'needs 🧱';
      botCut();
    },
  });

  // --- View -----------------------------------------------------------------------
  let refs, phase, wait, streak;

  const knifePos = () => 1 - Math.abs((phase % 2) - 1);
  const speed = () => 0.7 + 0.08 * Math.min(streak, 6);

  function setMsg(text, cls = '') {
    refs.msg.textContent = text;
    refs.msg.className = `slice-msg ${cls}`;
  }

  function drawSlab() {
    const st = s();
    refs.bar.querySelectorAll('.cut, .target').forEach(n => n.remove());
    refs.bar.classList.toggle('empty', !st.loaded);
    refs.btn.textContent = st.loaded ? '🔪 SLICE!' : 'Load a slab · 1 🧱';
    if (!st.loaded) return;
    const n = st.n;
    for (let i = st.cuts.length; i < n; i++) {
      refs.bar.append(MB.h(`<div class="target ${i === st.cuts.length ? 'next' : ''}" style="left:${((i + 1) / (n + 1)) * 100}%"></div>`));
    }
    for (const c of st.cuts) refs.bar.append(MB.h(`<div class="cut ${c.q}" style="left:${c.pos * 100}%"></div>`));
  }

  function slice() {
    if (!s().loaded) {
      if (!load()) setMsg('No slabs! Merge Boy is waiting for you.');
      return;
    }
    if (wait > 0) return;
    cut(knifePos(), 'you');
  }

  MB.apps.slicer = {
    mount(el) {
      phase = 0;
      streak = 0;
      wait = 0;
      el.innerHTML = `<div class="slicer">
        <div class="slice-stage"><div class="slab-bar"><div class="knife">🔪</div><div class="bot-cursor" hidden><span>🤖</span><i></i></div></div></div>
        <div class="slice-msg"></div>
        <button class="btn primary slice-btn"></button>
        <p class="small center">Tap the slab or the button. Cut at the glowing line.<br>1 🟫 per cut, +1 per perfect cut.</p>
      </div>`;
      refs = { bar: el.querySelector('.slab-bar'), knife: el.querySelector('.knife'), msg: el.querySelector('.slice-msg'), btn: el.querySelector('.slice-btn'), cursor: el.querySelector('.bot-cursor') };
      refs.btn.onclick = slice;
      refs.bar.addEventListener('pointerdown', e => { e.preventDefault(); slice(); });
      setMsg(s().loaded ? 'Cut at the glowing line!' : MB.state.res.slab >= 1 ? 'Load a slab to begin. So satisfying.' : 'No slabs! Merge Boy is waiting for you.');
      drawSlab();
    },

    onEvent(evt) {
      if (!refs) return;
      if (evt.type === 'load') setMsg('Cut at the glowing line!');
      if (evt.type === 'cut') setMsg(`${{ perfect: 'PERFECT!! 🤤', good: 'Good!', meh: 'Meh. Close enough.' }[evt.q]}${evt.by === 'bot' ? ' (Knife Bot)' : ''}`, evt.q);
      if (evt.type === 'done') {
        const text = `+${evt.block} 🟫${evt.flawless ? ' +1 💎 FLAWLESS!!!' : ''}`;
        streak = evt.flawless ? streak + 1 : 0;
        MB.floatFrom(refs.bar, text);
        setMsg(text, 'perfect');
        // Your slab: auto-load the next one after a beat, like before.
        if (evt.by === 'you') wait = 1.1;
      }
      drawSlab();
    },

    update(dt) {
      phase += dt * speed();
      const st = s(), bot = MB.hasBot('slicer');
      refs.knife.style.left = `${knifePos() * 100}%`;
      refs.knife.hidden = !st.loaded;
      if (wait > 0 && (wait -= dt) <= 0) load();
      // Knife Bot's cursor waits over the next marker.
      refs.cursor.hidden = !(bot && st.loaded);
      if (bot && st.loaded) {
        refs.cursor.style.left = `${((st.cuts.length + 1) / (st.n + 1)) * 100}%`;
        refs.cursor.style.top = '50%';
        refs.cursor.style.setProperty('--p', MB.botProgress('slicer'));
      }
    },

    unmount() { refs = null; },
  };
})();
