// Clash of Kingdoms — base building with timers. Buildings turn resources from
// the other games into permanent boosts for them (see MB.BUILDINGS).
//
// The parody: upgrade timers, a builder limit, "ask your alliance for help",
// and a big "FINISH NOW 💎" button. The twist: there is nothing to buy.
// - Hustle: every hand-played action in ANY game knocks seconds off construction.
// - Alliance help: your interns are your alliance. Once per build they chip in.
// - Finish now: opens a paywall whose price is an errand in another game.
// Builds keep running while the game is closed.
(function () {
  const MB = window.MB;
  const MAX_SECS = 4 * 3600, HUSTLE_SECS = 10;
  const B = MB.BUILDINGS;
  let root;

  const a = () => MB.app('base');
  function init() {
    const s = a();
    if (!s.levels) { s.levels = { hall: 1 }; s.builds = []; s.banked = 0; }
  }
  const level = id => a().levels[id] || 0;
  const cost = id => Object.fromEntries(Object.entries(B[id].cost).map(([k, n]) => [k, Math.ceil(n * 1.7 ** level(id))]));
  const buildSecs = id => Math.min(MAX_SECS, B[id].secs * 3 ** level(id));
  const builders = () => (level('hall') >= 3 ? 2 : 1);
  const cap = id => (id === 'hall' ? B.hall.max : Math.min(B[id].max, level('hall') + 1));
  const buildOf = id => a().builds.find(b => b.id === id);

  function fmtTime(secs) {
    secs = Math.max(0, Math.ceil(secs));
    const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), sec = secs % 60;
    return h ? `${h}h ${m}m` : m ? `${m}m ${sec}s` : `${sec}s`;
  }

  // Every hand-played action anywhere speeds up all active construction.
  MB.onTrack(() => {
    init();
    for (const b of a().builds) b.endsAt -= HUSTLE_SECS * 1000;
  });

  // Finish builds whose time is up, even while the app is closed.
  MB.onTick(() => {
    init();
    const s = a(), now = Date.now();
    for (const b of [...s.builds]) {
      if (b.endsAt > now) continue;
      s.builds = s.builds.filter(x => x !== b);
      s.levels[b.id] = level(b.id) + 1;
      MB.toast(`🏗️ ${B[b.id].icon} ${B[b.id].name} reached Lv ${s.levels[b.id]}!`);
      MB.track('base.build');
      if (root) render();
    }
  });

  MB.REWARDS.speedup = r => {
    init();
    const s = a();
    const b = buildOf(r.build) || s.builds[0];
    if (!b) {
      s.banked += r.finish ? 3600 : r.secs;
      return `⏩ ${r.finish ? '1h' : fmtTime(r.secs)} banked for your next Clash of Kingdoms build`;
    }
    b.endsAt = r.finish ? Date.now() : b.endsAt - r.secs * 1000;
    return r.finish ? `⏩ ${B[b.id].name} finished!` : `⏩ ${B[b.id].name} −${fmtTime(r.secs)}`;
  };

  function upgrade(id) {
    init();
    const s = a();
    if (s.builds.length >= builders()) { MB.toast('All builders are busy. (A second builder is NOT $19.99. It comes with Town Hall Lv 3.)'); return; }
    if (level(id) >= cap(id)) { MB.toast(id === 'hall' ? 'Max level.' : 'Upgrade the Town Hall first.'); return; }
    if (!MB.pay(cost(id))) return;
    const secs = buildSecs(id), used = Math.min(s.banked, secs);
    s.banked -= used;
    s.builds.push({ id, endsAt: Date.now() + (secs - used) * 1000, total: secs, helped: false });
    render();
  }

  function help(id) {
    const b = buildOf(id);
    if (!b || b.helped) return;
    const interns = MB.CHAIN.reduce((n, app) => n + MB.app(app).auto, 0);
    const pct = Math.min(30, 2 * interns);
    if (!pct) { MB.toast('You have no alliance. Hire some interns. They count.'); return; }
    b.helped = true;
    b.endsAt -= ((b.endsAt - Date.now()) * pct) / 100;
    MB.toast(`🙋 Your ${interns} intern levels helped: −${pct}%. They are your alliance now.`);
    render();
  }

  function speedPaywall(id) {
    const b = buildOf(id);
    if (!b) return;
    const gems = Math.max(1, Math.ceil((b.endsAt - Date.now()) / 60000)) * 12;
    MB.paywall({
      title: 'FINISH NOW?! ⏩',
      item: `${B[id].icon} ${B[id].name} → Lv ${level(id) + 1}`,
      price: `💎 ${gems} <small>($${(gems / 25).toFixed(2)})</small>`,
      options: [
        { metric: 'match3.win', amount: 1, reward: { type: 'speedup', secs: 600, build: id }, label: '−10 min' },
        { metric: 'army.win', amount: 1, reward: { type: 'speedup', secs: 600, build: id }, label: '−10 min' },
        { metric: 'slicer.slab', amount: 3, reward: { type: 'speedup', secs: 300, build: id }, label: '−5 min' },
        { metric: 'king.win', amount: 1, reward: { type: 'speedup', finish: true, build: id }, label: 'Finish instantly' },
      ],
      wait: `wait ${fmtTime((b.endsAt - Date.now()) / 1000)} (every hand-played action anywhere takes ${HUSTLE_SECS}s off)`,
    });
  }

  function effect(id) {
    const def = B[id], lv = level(id);
    if (def.boosts) return `+${Math.round(def.perLevel * 100 * lv)}% ${def.boosts.map(app => MB.APPS[app].icon).join('')} (hands & interns)`;
    return def.desc;
  }

  function render() {
    init();
    const s = a();
    const village = Object.keys(B).map(id => `<span class="hut" title="${B[id].name}" style="font-size:${18 + 3 * Math.min(level(id), 8)}px">${level(id) ? B[id].icon : '🌱'}</span>`).join('');
    root.innerHTML = `<div class="base">
      <div class="village">${village}</div>
      <div class="base-hud small">👷 Builders busy: ${s.builds.length}/${builders()}${s.banked ? ` · ⏩ ${fmtTime(s.banked)} banked` : ''}
        <br>Every hand-played action in any game takes ${HUSTLE_SECS}s off construction.</div>
      ${Object.keys(B).map(id => {
        const def = B[id], b = buildOf(id), lv = level(id);
        let actions;
        if (b) {
          const left = (b.endsAt - Date.now()) / 1000, pct = 100 * (1 - left / b.total);
          actions = `<div class="meter"><div class="build-bar" data-id="${id}" style="width:${Math.max(0, Math.min(100, pct))}%"></div></div>
            <div class="build-row"><span class="small timer" data-id="${id}">⏳ ${fmtTime(left)}</span>
            <button class="btn small-btn help" data-id="${id}" ${b.helped ? 'disabled' : ''}>🙋 Help</button>
            <button class="btn primary small-btn speed" data-id="${id}">⏩ Finish</button></div>`;
        } else if (lv >= cap(id)) {
          actions = `<div class="small">${id === 'hall' || lv >= def.max ? 'Max level' : '🔒 Needs a higher Town Hall'}</div>`;
        } else {
          actions = `<button class="btn up" data-id="${id}">⬆️ Lv ${lv + 1} · ${MB.costText(cost(id))} · ⏱ ${fmtTime(buildSecs(id))}</button>`;
        }
        return `<div class="building ${b ? 'building-now' : ''}">
          <div class="b-icon">${def.icon}</div>
          <div class="b-info"><b>${def.name}</b> <span class="small">Lv ${lv}</span>
            <div class="small">${effect(id)}</div>${actions}</div>
        </div>`;
      }).join('')}
    </div>`;
    root.querySelectorAll('.up').forEach(btn => { btn.onclick = () => upgrade(btn.dataset.id); });
    root.querySelectorAll('.help').forEach(btn => { btn.onclick = () => help(btn.dataset.id); });
    root.querySelectorAll('.speed').forEach(btn => { btn.onclick = () => speedPaywall(btn.dataset.id); });
    refresh();
  }

  function refresh() {
    if (!root) return;
    root.querySelectorAll('.timer').forEach(el => {
      const b = buildOf(el.dataset.id);
      if (b) el.textContent = `⏳ ${fmtTime((b.endsAt - Date.now()) / 1000)}`;
    });
    root.querySelectorAll('.build-bar').forEach(el => {
      const b = buildOf(el.dataset.id);
      if (b) el.style.width = `${Math.max(0, Math.min(100, 100 * (1 - (b.endsAt - Date.now()) / 1000 / b.total)))}%`;
    });
    root.querySelectorAll('.up').forEach(btn => {
      const id = btn.dataset.id;
      btn.disabled = !MB.can(cost(id)) || a().builds.length >= builders();
    });
  }

  MB.apps.base = {
    mount(el) { root = el; render(); },
    refresh,
    unmount() { root = null; },
  };
})();
