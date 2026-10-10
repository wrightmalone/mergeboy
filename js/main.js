// Boot, game loop, offline progress and the daily login bonus.
(function () {
  const MB = window.MB;
  const MAX_OFFLINE_SECS = 8 * 3600;

  function fmtDuration(secs) {
    const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60);
    return h ? `${h}h ${m}m` : m ? `${m}m` : `${Math.floor(secs)}s`;
  }

  // Let the bots keep playing for a long gap, in short chunks so one game's
  // output can feed another's within the gap. Offline, a bot makes at most one
  // move every 2 seconds (it keeps catch-up quick, and we say so).
  const OFFLINE_CHUNK = 30, OFFLINE_MOVES_PER_CHUNK = 15;
  function advance(secs) {
    for (let t = secs; t > 0; t -= OFFLINE_CHUNK) MB.runBots(Math.min(OFFLINE_CHUNK, t), OFFLINE_MOVES_PER_CHUNK);
  }

  // Let the bots play for the time the game was closed.
  function catchUp() {
    const s = MB.state;
    const secs = Math.min((Date.now() - s.lastSeen) / 1000, MAX_OFFLINE_SECS);
    s.lastSeen = Date.now();
    if (secs < 10 || !MB.BOT_APPS.some(MB.hasBot)) return;
    const before = { ...s.res };
    advance(secs);
    const lines = Object.keys(MB.RES)
      .map(k => [k, Math.floor(s.res[k]) - Math.floor(before[k])])
      .filter(([, d]) => d)
      .map(([k, d]) => `<div class="gain ${d > 0 ? 'good' : 'bad'}">${d > 0 ? '+' : '−'}${MB.fmt(Math.abs(d))} ${MB.RES[k].icon} ${MB.RES[k].name}</div>`);
    if (!lines.length) return;
    MB.modal({
      title: '📬 While you were away…',
      body: `<p>Your bots kept playing for ${fmtDuration(secs)}.</p><div class="gains">${lines.join('')}</div><p class="small">Every move was a real move on the real board. (Offline, we count up to 8 hours, and each bot makes at most one move every 2 seconds. We tell you that.)</p>`,
      buttons: [{ label: 'Collect', primary: true }],
    });
  }

  // Streaks pause instead of resetting: miss a week, pick up where you left off.
  function loginBonus() {
    const s = MB.state, today = new Date().toDateString();
    if (s.login.day === today) return;
    s.login.streak += 1;
    s.login.day = today;
    const day = s.login.streak, reward = { scrap: 10 * Math.min(day, 7) };
    MB.give(reward);
    MB.modal({
      title: `🎉 DAY ${day} LOGIN BONUS!! 🎉`,
      body: `<div class="login-days">${[1, 2, 3, 4, 5, 6, 7].map(d => `<span class="${d <= Math.min(day, 7) ? 'got' : ''}">${d}</span>`).join('')}</div>
        <p class="center">+${MB.costText(reward)}</p>
        <p class="small center">Miss a day? Your streak just pauses. It never resets. No notifications, either.</p>`,
      buttons: [{ label: 'CLAIM!!!', primary: true }],
    });
  }

  // One gentle nudge per session, the opposite of a retention hook.
  const BREAK_AFTER_MS = 20 * 60 * 1000, sessionStart = Date.now();
  let breakShown = false;
  function breakReminder() {
    if (breakShown || Date.now() - sessionStart < BREAK_AFTER_MS || MB.modalOpen()) return;
    breakShown = true;
    MB.modal({
      title: '🧘 You’ve been playing for 20 minutes',
      body: '<p>Stretch? Drink some water? Your bots will keep playing while you’re gone, and nothing here expires.</p>',
      buttons: [{ label: 'Good idea', primary: true }],
    });
  }

  function intro() {
    if (MB.state.introSeen) return;
    MB.state.introSeen = true;
    MB.modal({
      title: '📱 Welcome to your phone',
      body: `<p>Every game on here is the game from the ad. Each one makes something the next one needs.</p>
        <p class="chain">🪛 → 🔩 → ⚙️ → 💨 → 👦 → 🧱 → 🔪 → 🟫 → 🤴</p>
        <p>Play them. Master them. Then hire a bot to play them for you, very slowly at first. Upgrades cost the <i>other</i> games’ currencies.</p>
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
    MB.runBots(secs);
    for (const fn of MB.tickers) fn();
    MB.state.lastSeen = now;
    MB.renderResBar();
    MB.updateHome();
    MB.renderAutoPanel();
    MB.currentApp()?.mod.refresh?.();
    clock();
    breakReminder();
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

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { MB.save(); return; }
    // Bots kept playing headlessly while we were hidden; redraw the open game from its state.
    const cur = MB.currentApp();
    if (cur) MB.openApp(cur.id);
  });
  window.addEventListener('pagehide', () => MB.save());
})();
