// Phone shell: resource bar, home screen, app views, automation panel, modals.
(function () {
  const MB = window.MB;
  const $ = (sel, root = document) => root.querySelector(sel);
  MB.$ = $;

  MB.h = function (html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  };

  MB.toast = function (msg) {
    const el = MB.h('<div class="toast"></div>');
    el.textContent = msg;
    $('#toasts').append(el);
    setTimeout(() => el.classList.add('out'), 2200);
    setTimeout(() => el.remove(), 2600);
  };

  // Floating "+2 🔩" at a viewport position.
  MB.floatText = function (text, x, y, cls = '') {
    const phone = $('#phone').getBoundingClientRect();
    const el = MB.h(`<div class="float ${cls}"></div>`);
    el.textContent = text;
    el.style.left = `${x - phone.left}px`;
    el.style.top = `${y - phone.top}px`;
    $('#phone').append(el);
    setTimeout(() => el.remove(), 1000);
  };
  MB.floatFrom = function (el, text, cls) {
    const r = el.getBoundingClientRect();
    MB.floatText(text, r.left + r.width / 2, r.top + r.height / 3, cls);
  };

  // --- Modals: shown one at a time, queued -----------------------------------
  const queue = [];
  let openModal = null;

  MB.modal = function (opts) {
    queue.push(opts);
    if (!openModal) nextModal();
  };
  MB.modalOpen = () => !!openModal;

  function nextModal() {
    const opts = queue.shift();
    if (!opts) { openModal = null; return; }
    const el = MB.h(`<div class="modal-back"><div class="modal ${opts.cls || ''}">
      <h2 ${opts.title ? '' : 'hidden'}></h2><div class="modal-body"></div><div class="modal-buttons"></div>
    </div></div>`);
    $('h2', el).textContent = opts.title || '';
    const body = $('.modal-body', el);
    if (typeof opts.body === 'string') body.innerHTML = opts.body;
    else if (opts.body) body.append(opts.body);
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      el.remove();
      opts.onClose?.();
      nextModal();
    };
    for (const b of opts.buttons || [{ label: 'OK', primary: true }]) {
      const btn = MB.h(`<button class="btn ${b.primary ? 'primary' : ''}"></button>`);
      btn.textContent = b.label;
      btn.disabled = !!b.disabled;
      btn.onclick = () => { if (b.onClick?.() !== false) close(); };
      $('.modal-buttons', el).append(btn);
    }
    $('#modal-root').append(el);
    openModal = el;
    opts.onOpen?.(el, close);
  }

  // --- Resource bar --------------------------------------------------------------
  MB.renderResBar = function () {
    const bar = $('#resbar');
    if (!bar.childElementCount) {
      for (const [k, r] of Object.entries(MB.RES)) {
        bar.append(MB.h(`<div class="res" data-res="${k}" title="${r.name}"><span>${r.icon}</span><b>0</b></div>`));
      }
    }
    for (const el of bar.children) {
      const n = MB.state.res[el.dataset.res];
      $('b', el).textContent = MB.fmt(n);
      el.classList.toggle('zero', n < 1);
    }
    const boosted = MB.boostMult() > 1;
    bar.classList.toggle('boosted', boosted);
  };

  // --- Home screen -----------------------------------------------------------------
  MB.showHome = function () {
    MB.closeApp();
    const screen = $('#screen');
    screen.innerHTML = '';
    const home = MB.h(`<div class="home">
      <button class="widget" data-app="king"></button>
      <div class="grid"></div>
      <div class="dock">
        <button class="btn boost"></button>
        <button class="btn ghost reset" title="Reset save" aria-label="Reset save">⟲</button>
      </div>
    </div>`);
    for (const [id, def] of Object.entries(MB.APPS)) {
      $('.grid', home).append(MB.h(`<button class="icon" data-app="${id}">
        <div class="tile" style="background:${def.color}"><span class="emoji">${def.icon}</span><span class="badge"></span></div>
        <div class="label">${def.name}</div>
      </button>`));
    }
    home.addEventListener('click', e => {
      const a = e.target.closest('[data-app]');
      if (a) MB.tapApp(a.dataset.app);
    });
    $('.boost', home).onclick = MB.watchBoostAd;
    $('.reset', home).onclick = () => MB.modal({
      title: 'Reset everything?',
      body: 'All progress, interns and the King go back to zero.',
      buttons: [{ label: 'Cancel' }, { label: 'Reset', onClick: MB.reset }],
    });
    screen.append(home);
    MB.updateHome();
  };

  MB.updateHome = function () {
    const home = $('#screen .home');
    if (!home) return;
    for (const icon of home.querySelectorAll('.icon')) {
      const id = icon.dataset.app, def = MB.APPS[id], a = MB.app(id);
      let badge = '';
      if (!a.installed) badge = MB.can(def.install) ? 'GET' : '';
      else if (def.recipe) {
        if (a.auto) badge = a.starved ? '💤' : '⚙︎';
        if (MB.canUpgrade(id)) badge = '!';
      } else if (id === 'king' && MB.kingReady()) badge = '!';
      const b = $('.badge', icon);
      b.textContent = badge;
      b.className = `badge${badge ? ' on' : ''}${badge === '⚙︎' ? ' spin' : ''}${badge === '💤' ? ' sleep' : ''}`;
      icon.classList.toggle('locked', !a.installed);
    }

    const s = MB.state, w = $('.widget', home);
    if (s.king >= MB.KING.length) {
      w.innerHTML = '<span class="w-icon">🤴</span><div><b>The King is safe.</b><div class="small">For now.</div></div>';
    } else {
      const st = MB.KING[s.king];
      const need = s.kingPaid ? 'Materials delivered. Pull the pins!' : `Needs ${MB.costText(st.cost)}`;
      w.innerHTML = `<span class="w-icon">🤴</span><div><b>Rescue the King</b> · Stage ${s.king + 1}/${MB.KING.length}
        <div class="small">${st.name} — ${need}</div>
        <div class="meter"><div style="width:${(100 * s.king) / MB.KING.length}%"></div></div></div>`;
    }

    const boost = $('.boost', home);
    const left = Math.ceil((s.boostUntil - Date.now()) / 1000);
    boost.textContent = left > 0 ? `⚡ 2× ACTIVE — ${left}s (watch more to stack)` : '📺 Watch ad: 2× everything for 60s';
    boost.classList.toggle('active', left > 0);
  };

  MB.tapApp = function (id) {
    const def = MB.APPS[id], a = MB.app(id);
    if (!a.installed) return storePage(id);
    MB.ads.maybe(() => MB.openApp(id));
  };

  function storePage(id) {
    const def = MB.APPS[id];
    MB.modal({
      cls: 'listing-modal',
      body: `<div class="listing">
          <div class="tile big" style="background:${def.color}"><span class="emoji">${def.icon}</span></div>
          <div><b>${def.name}</b>
            <div class="small">★ ${def.rating} · Contains ads · In-app purchases</div>
            <div class="tagline">${def.tagline}</div></div>
        </div>
        <p>Download size: <b>${MB.costText(def.install)}</b></p>`,
      buttons: [
        { label: 'Not now' },
        {
          label: 'GET', primary: true, disabled: !MB.can(def.install),
          onClick: () => {
            if (!MB.pay(def.install)) return;
            MB.app(id).installed = true;
            MB.toast(`✅ ${def.name} installed. It has requested access to your contacts.`);
            const icon = $(`#screen .icon[data-app="${id}"]`);
            icon?.classList.add('installing');
            MB.updateHome();
          },
        },
      ],
    });
  }

  // --- App view --------------------------------------------------------------------
  let current = null;  // { id, mod, view }

  MB.openApp = function (id) {
    MB.closeApp();
    const def = MB.APPS[id];
    const screen = $('#screen');
    screen.innerHTML = '';
    const view = MB.h(`<div class="appview" data-app="${id}">
      <header class="apphead" style="background:${def.color}">
        <button class="back" aria-label="Home">‹</button>
        <span class="appname">${def.icon} ${def.name}</span>
        <span class="stars">★ ${def.rating}</span>
      </header>
      <div class="tagline-banner">${def.tagline}</div>
      <div class="app-body"></div>
      ${def.recipe ? '<div class="auto-panel"></div>' : ''}
    </div>`);
    $('.back', view).onclick = MB.showHome;
    screen.append(view);
    current = { id, mod: MB.apps[id], view };
    current.mod.mount($('.app-body', view));
    MB.renderAutoPanel();
  };

  MB.closeApp = function () {
    current?.mod.unmount?.();
    current = null;
  };
  MB.currentApp = () => current;

  MB.renderAutoPanel = function () {
    const panel = current && $('.auto-panel', current.view);
    if (!panel) return;
    const id = current.id, def = MB.APPS[id], a = MB.app(id);
    if (!panel.childElementCount) {
      panel.innerHTML = '<div class="auto-info"></div><div class="meter"><div></div></div><button class="btn primary auto-btn"></button>';
      $('.auto-btn', panel).onclick = () => MB.buyAuto(id);
    }
    const mastered = a.crafts >= def.mastery;
    const info = $('.auto-info', panel), meter = $('.meter', panel), btn = $('.auto-btn', panel);
    const cost = def.autoCost(a.auto);
    meter.hidden = mastered;
    if (!mastered) {
      info.innerHTML = `<b>🎓 Mastery</b> ${a.crafts}/${def.mastery} ${def.masteryUnit}
        <div class="small">Prove you can do it. Then never do it again.</div>`;
      $('div', meter).style.width = `${(100 * a.crafts) / def.mastery}%`;
    } else if (!a.auto) {
      info.innerHTML = '<b>🎓 Mastered!</b> <span class="small">You have earned the right to stop playing this.</span>';
    } else {
      const runs = MB.runsPerSec(id);
      const outs = Object.entries(def.recipe.out).map(([k, n]) => `${MB.fmtRate(runs * n * MB.boostMult())} ${MB.RES[k].icon}/s`).join(' ');
      const ins = Object.entries(def.recipe.in).map(([k, n]) => `${MB.fmtRate(runs * n)} ${MB.RES[k].icon}/s`).join(' ');
      const status = a.starved
        ? `<span class="bad">💤 Starved — needs more ${Object.keys(def.recipe.in).map(k => MB.RES[k].icon).join('')}</span>`
        : '<span class="good">✅ Playing itself</span>';
      info.innerHTML = `<b>🤖 Automated · Lv ${a.auto}</b> ${status}
        <div class="small">Makes ${outs}${ins ? ` · eats ${ins}` : ''}</div>`;
    }
    btn.textContent = a.auto ? `⬆️ Upgrade to Lv ${a.auto + 1} — ${MB.costText(cost)}` : `🤖 Hire ${def.intern} — ${MB.costText(cost)}`;
    btn.disabled = !mastered || !MB.can(cost);
  };

  MB.buyAuto = function (id) {
    const def = MB.APPS[id], a = MB.app(id);
    if (a.crafts < def.mastery || !MB.pay(def.autoCost(a.auto))) return;
    a.auto++;
    if (a.auto === 1) {
      MB.modal({
        title: '🤖 Automated!',
        body: `<p><b>${def.name}</b> now plays itself.</p><p>You never have to open it again.</p><p class="small">(You will anyway.)</p>`,
      });
    } else {
      MB.toast(`⬆️ ${def.intern} promoted to Lv ${a.auto}. No raise.`);
    }
    MB.renderAutoPanel();
  };

  MB.watchBoostAd = function () {
    MB.ads.show(() => {
      MB.state.boostUntil = Math.max(Date.now(), MB.state.boostUntil) + 60_000;
      MB.toast('⚡ 2× everything for 60 seconds!');
    }, { reward: {} });
  };
})();
