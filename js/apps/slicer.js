// Slice It All! — a knife sweeps across the slab; tap to cut at each marker.
// Three cuts per slab. Perfect cuts give bonus blocks; three perfects give a gem.
(function () {
  const MB = window.MB;
  const TARGETS = [0.25, 0.5, 0.75], PERFECT = 0.02, GOOD = 0.06;

  let refs, phase, mode, cuts, wait, streak;

  const knifePos = () => 1 - Math.abs((phase % 2) - 1);
  const speed = () => 0.7 + 0.08 * Math.min(streak, 6);

  function setMsg(text, cls = '') {
    refs.msg.textContent = text;
    refs.msg.className = `slice-msg ${cls}`;
  }

  function drawSlab() {
    refs.bar.querySelectorAll('.cut, .target').forEach(n => n.remove());
    refs.bar.classList.toggle('empty', mode === 'empty');
    if (mode === 'empty') return;
    TARGETS.forEach((t, i) => {
      if (i < cuts.length) return;
      refs.bar.append(MB.h(`<div class="target ${i === cuts.length ? 'next' : ''}" style="left:${t * 100}%"></div>`));
    });
    for (const c of cuts) refs.bar.append(MB.h(`<div class="cut ${c.q}" style="left:${c.pos * 100}%"></div>`));
  }

  function load() {
    if (!MB.pay(MB.APPS.slicer.recipe.in)) {
      mode = 'empty';
      setMsg('No slabs! Merge Boy is waiting for you.');
    } else {
      mode = 'cutting';
      cuts = [];
      setMsg('Cut at the glowing line!');
    }
    refs.btn.textContent = mode === 'empty' ? 'Load a slab · 1 🧱' : '🔪 SLICE!';
    drawSlab();
  }

  function slice() {
    if (mode === 'empty') return load();
    if (mode !== 'cutting') return;
    const pos = knifePos(), d = Math.abs(pos - TARGETS[cuts.length]);
    const q = d < PERFECT ? 'perfect' : d < GOOD ? 'good' : 'meh';
    cuts.push({ pos, q });
    setMsg({ perfect: 'PERFECT!! 🤤', good: 'Good!', meh: 'Meh. Close enough.' }[q], q);
    drawSlab();
    if (cuts.length === TARGETS.length) finish();
  }

  function finish() {
    const perfects = cuts.filter(c => c.q === 'perfect').length;
    const mult = MB.handMult('slicer');
    const blocks = Math.round((MB.APPS.slicer.recipe.out.block + perfects) * mult * 10) / 10;
    MB.give({ block: blocks });
    MB.app('slicer').crafts++;
    let text = `+${blocks} 🟫`;
    if (perfects === TARGETS.length) {
      MB.give({ gem: 1 });
      text += ' +1 💎  FLAWLESS!!!';
      streak++;
    } else {
      streak = perfects ? streak : 0;
    }
    MB.floatFrom(refs.bar, text);
    setMsg(text, 'perfect');
    mode = 'done';
    wait = 1.1;
  }

  MB.apps.slicer = {
    mount(el) {
      phase = 0;
      streak = 0;
      mode = 'empty';
      cuts = [];
      el.innerHTML = `<div class="slicer">
        <div class="slice-stage"><div class="slab-bar"><div class="knife">🔪</div></div></div>
        <div class="slice-msg"></div>
        <button class="btn primary slice-btn"></button>
        <p class="small center">Tap the slab or the button. 3 cuts per slab.<br>Base 3 🟫 per slab, +1 per perfect cut.</p>
      </div>`;
      refs = { bar: el.querySelector('.slab-bar'), knife: el.querySelector('.knife'), msg: el.querySelector('.slice-msg'), btn: el.querySelector('.slice-btn') };
      refs.btn.onclick = slice;
      refs.bar.addEventListener('pointerdown', e => { e.preventDefault(); slice(); });
      refs.btn.textContent = 'Load a slab · 1 🧱';
      setMsg(MB.state.res.slab >= 1 ? 'Load a slab to begin. So satisfying.' : 'No slabs! Merge Boy is waiting for you.');
      drawSlab();
    },
    update(dt) {
      phase += dt * speed();
      refs.knife.style.left = `${knifePos() * 100}%`;
      refs.knife.hidden = mode !== 'cutting';
      if (mode === 'done' && (wait -= dt) <= 0) load();
    },
    unmount() { refs = null; },
  };
})();
