// VIP Store — parody in-app purchases, paid in game resources.
(function () {
  const MB = window.MB;
  let root;

  function render() {
    const s = MB.state;
    root.innerHTML = `<div class="store">
      <div class="timer-banner">⏰ DEALS END IN 00:0${Math.floor(Math.random() * 9) + 1}:59 ⏰</div>
      <p class="small center">(They don’t. This timer resets every time you open the store. So do theirs.)</p>
      ${MB.OFFERS.map(o => {
        const owned = o.once && s.bought[o.id];
        const price = o.open ? 'Open' : o.disabled || (owned ? 'OWNED' : MB.costText(o.cost));
        return `<div class="offer ${owned ? 'owned' : ''}">
          ${o.tag ? `<span class="offer-tag">${o.tag}</span>` : ''}
          <div><b>${o.title}</b><div class="small">${o.sub}</div></div>
          <button class="btn primary buy" data-id="${o.id}" ${o.disabled || owned ? 'disabled' : ''}>${price}</button>
        </div>`;
      }).join('')}
      <p class="small center">All prices are in resources you earn by playing. No real money, ever.</p>
    </div>`;
    root.querySelectorAll('.buy').forEach(b => {
      const o = MB.OFFERS.find(x => x.id === b.dataset.id);
      b.onclick = () => (o.open ? MB.openApp(o.open) : buy(o.id));
    });
    refresh();
  }

  function buy(id) {
    const o = MB.OFFERS.find(x => x.id === id);
    if ((o.once && MB.state.bought[id]) || !MB.pay(o.cost)) return;
    MB.state.bought[id] = true;
    if (o.give) MB.give(o.give);
    o.effect?.(MB.state);
    MB.toast(`🧾 Purchased: ${o.title}. Thank you, valued whale.`);
    render();
  }

  function refresh() {
    root?.querySelectorAll('.buy').forEach(b => {
      const o = MB.OFFERS.find(x => x.id === b.dataset.id);
      if (!o.open && !o.disabled && !(o.once && MB.state.bought[o.id])) b.disabled = !MB.can(o.cost);
    });
  }

  MB.apps.store = {
    mount(el) { root = el; render(); },
    refresh,
    unmount() { root = null; },
  };
})();
