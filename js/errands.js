// Errands: the non-predatory replacement for every paywall.
//
// Wherever the games this parodies would stop you and ask for money (out of
// lives, speed up a timer, out of energy, "so close! buy power"), we open a
// parody purchase screen whose price is crossed out and replaced with an errand
// in a *different* game: "Drop 6 plates in Screw Loose 3D → +1 ❤️".
//
// Games report hand-played actions with MB.track(metric, n). Interns don't run
// errands. Reward types are registered by the game that grants them (MB.REWARDS),
// so an errand saved overnight still pays out after a reload.
(function () {
  const MB = window.MB;
  const MAX_ACTIVE = 4;
  const listeners = [];

  MB.REWARDS = {
    res: r => { MB.give(r.res); return `+${MB.costText(r.res)}`; },
  };

  // Subscribe to every hand-played action (the base builder uses this for "hustle").
  MB.onTrack = fn => listeners.push(fn);

  MB.track = function (metric, n = 1) {
    // One game's listener failing must never break the game that reported the action.
    for (const fn of listeners) {
      try { fn(metric, n); } catch (err) { console.error('MB.track listener failed', metric, err); }
    }
    for (const e of [...MB.state.errands]) {
      if (e.metric !== metric) continue;
      e.progress = Math.min(e.amount, e.progress + n);
      if (e.progress >= e.amount) complete(e);
    }
  };

  function complete(e) {
    MB.state.errands = MB.state.errands.filter(x => x !== e);
    const text = MB.REWARDS[e.reward.type]?.(e.reward) || e.label;
    MB.toast(`📋 Errand done! ${text}`);
  }

  MB.errandText = e => MB.METRICS[e.metric].text(e.amount);

  MB.addErrand = function (o) {
    const list = MB.state.errands;
    const same = list.find(e => e.metric === o.metric && JSON.stringify(e.reward) === JSON.stringify(o.reward));
    if (same) return true;
    if (list.length >= MAX_ACTIVE) {
      MB.toast(`You already have ${MAX_ACTIVE} errands. Finish one first. (No, you can't pay to skip.)`);
      return false;
    }
    list.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, metric: o.metric, amount: o.amount, progress: 0, reward: o.reward, label: o.label });
    return true;
  };

  // A parody purchase screen. `options` are errands: { metric, amount, reward, label }.
  // Options in games you haven't installed yet are hidden.
  MB.paywall = function ({ title, item, price, options, wait }) {
    const shown = options.filter(o => MB.app(MB.METRICS[o.metric].app).installed);
    const body = MB.h(`<div class="paywall">
      <div class="pw-item">${item}</div>
      <div class="pw-price"><s>${price}</s><span>FREE*</span></div>
      <p class="small center">*This is where the games we're parodying would ask for money.
        Here, you go play something else instead:</p>
      <div class="pw-options">${shown.map((o, i) => `<button class="pw-opt" data-i="${i}">
          <span class="pw-task">${MB.APPS[MB.METRICS[o.metric].app].icon} ${MB.METRICS[o.metric].text(o.amount)}</span>
          <span class="pw-reward">→ ${o.label}</span></button>`).join('')}</div>
      ${wait ? `<p class="small center">…or ${wait}.</p>` : ''}
    </div>`);
    MB.modal({
      cls: 'paywall-modal',
      title,
      body,
      buttons: [{ label: 'Never mind' }],
      onOpen: (_, close) => {
        body.querySelectorAll('.pw-opt').forEach(btn => {
          btn.onclick = () => {
            const o = shown[+btn.dataset.i];
            if (!MB.addErrand(o)) return;
            close();
            MB.toast(`📋 Errand accepted: ${MB.METRICS[o.metric].text(o.amount)}`);
            MB.openApp(MB.METRICS[o.metric].app);
          };
        });
      },
    });
  };

  // Errands that belong to (are completed in) a given app, for the in-app strip.
  MB.errandsIn = app => MB.state.errands.filter(e => MB.METRICS[e.metric].app === app);

  MB.errandRow = e => `<div class="errand">
      <div class="errand-text">${MB.APPS[MB.METRICS[e.metric].app].icon} ${MB.errandText(e)} <b>→ ${e.label}</b></div>
      <div class="meter"><div style="width:${(100 * e.progress) / e.amount}%"></div></div>
      <div class="small">${e.progress}/${e.amount}</div>
    </div>`;
})();
