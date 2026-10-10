// Boot, game loop, offline progress and the daily login bonus.
(function () {
  const MB = window.MB;
  const MAX_OFFLINE_SECS = 8 * 3600;

  function fmtDuration(secs) {
    const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60);
    return h ? `${h}h ${m}m` : m ? `${m}m` : `${Math.floor(secs)}s`;
  }

  // Advance the factory in 1s chunks so upstream output can feed downstream
  // games within a long gap.
  function advance(secs, mult) {
    for (let t = secs; t > 0; t -= 1) MB.simulate(Math.min(1, t), mult);
  }

  // Run the interns for the time the game was closed.
  function catchUp() {
    const s = MB.state;
    const secs = Math.min((Date.now() - s.lastSeen) / 1000, MAX_OFFLINE_SECS);
    s.lastSeen = Date.now();
    if (secs < 10 || !MB.CHAIN.some(id => MB.app(id).auto)) return;
    const before = { ...s.res };
    advance(secs, 1);
    const lines = Object.keys(MB.RES)
      .map(k => [k, Math.floor(s.res[k]) - Math.floor(before[k])])
      .filter(([, d]) => d)
      .map(([k, d]) => `<div class="gain ${d > 0 ? 'good' : 'bad'}">${d > 0 ? '+' : '−'}${MB.fmt(Math.abs(d))} ${MB.RES[k].icon} ${MB.RES[k].name}</div>`);
    if (!lines.length) return;
    MB.modal({
      title: '📬 While you were away…',
      body: `<p>Your interns kept playing for ${fmtDuration(secs)}.</p><div class="gains">${lines.join('')}</div><p class="small">They did not enjoy it either.</p>`,
      buttons: [{ label: 'Collect', primary: true }],
    });
  }

  function loginBonus() {
    const s = MB.state, today = new Date().toDateString();
    if (s.login.day === today) return;
    const yesterday = new Date(Date.now() - 86_400_000).toDateString();
    s.login.streak = s.login.day === yesterday ? s.login.streak + 1 : 1;
    s.login.day = today;
    const day = s.login.streak, reward = { scrap: 10 * Math.min(day, 7) };
    MB.give(reward);
    MB.modal({
      title: `🎉 DAY ${day} LOGIN BONUS!! 🎉`,
      body: `<div class="login-days">${[1, 2, 3, 4, 5, 6, 7].map(d => `<span class="${d <= Math.min(day, 7) ? 'got' : ''}">${d}</span>`).join('')}</div>
        <p class="center">+${MB.costText(reward)}</p>
        <p class="small center">Come back tomorrow for slightly more! Don't break the streak. We're watching.</p>`,
      buttons: [{ label: 'CLAIM!!!', primary: true }],
    });
  }

  function intro() {
    if (MB.state.introSeen) return;
    MB.state.introSeen = true;
    MB.modal({
      title: '📱 Welcome to your phone',
      body: `<p>Every game on here is the game from the ad. Each one makes something the next one needs.</p>
        <p class="chain">🪛 → 🔩 → ⚙️ → 💨 → 👦 → 🧱 → 🔪 → 🟫 → 🤴</p>
        <p>Play them. Master them. Then hire an intern to play them for you.</p>
        <p>Somewhere in here, a King needs rescuing.</p>`,
      buttons: [{ label: "Let's grind", primary: true }],
    });
  }

  function clock() {
    const d = new Date();
    MB.$('#clock').textContent = `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  // Animation loop: only drives the open game's visuals and manual play.
  let lastFrame = performance.now();
  function frame(now) {
    const dt = Math.min(0.1, (now - lastFrame) / 1000);
    lastFrame = now;
    MB.currentApp()?.mod.update?.(dt);
    requestAnimationFrame(frame);
  }

  // Factory loop: runs on wall-clock time so automation keeps going even when
  // the browser throttles timers in a background tab.
  let lastTick = Date.now(), saveT = 0;
  function tick() {
    const now = Date.now(), secs = Math.min((now - lastTick) / 1000, MAX_OFFLINE_SECS);
    lastTick = now;
    advance(secs);
    MB.state.lastSeen = now;
    MB.renderResBar();
    MB.updateHome();
    MB.renderAutoPanel();
    MB.currentApp()?.mod.refresh?.();
    clock();
    if ((saveT += secs) >= 5) {
      saveT = 0;
      MB.save();
    }
  }

  MB.renderResBar();
  MB.showHome();
  clock();
  intro();
  catchUp();
  loginBonus();
  requestAnimationFrame(frame);
  setInterval(tick, 250);

  document.addEventListener('visibilitychange', () => { if (document.hidden) MB.save(); });
  window.addEventListener('pagehide', () => MB.save());
})();
