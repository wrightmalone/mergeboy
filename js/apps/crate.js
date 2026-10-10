// Lucky Crate — a gacha box for gems. The odds are disclosed. Technically.
(function () {
  const MB = window.MB;
  const COST = { gem: 3 };
  let refs, opening = false, token = 0;

  function roll() {
    const total = MB.CRATE.reduce((sum, p) => sum + p.w, 0);
    let r = Math.random() * total;
    return MB.CRATE.find(p => (r -= p.w) < 0) || MB.CRATE[0];
  }

  function award(prize) {
    if (prize.give) {
      MB.give(prize.give);
      return prize.note || `+${MB.costText(prize.give)}`;
    }
    // A free level on a random upgrade you could otherwise buy (ignoring the price).
    const pool = MB.BOT_APPS.filter(id => MB.app(id).installed).flatMap(id =>
      MB.APPS[id].upgrades.filter(u => ['', 'poor'].includes(MB.upBlocker(id, u.id))).map(u => [id, u]));
    if (!pool.length) { MB.give({ gem: 3 }); return 'Nothing to upgrade yet, so: +3 💎'; }
    const [id, u] = pool[Math.floor(Math.random() * pool.length)];
    const a = MB.app(id);
    a.up = { ...a.up, [u.id]: MB.up(id, u.id) + 1 };
    return `${u.name} in ${MB.APPS[id].name} → Lv ${MB.up(id, u.id)}, free!`;
  }

  function open() {
    if (opening) return;
    if (!MB.pay(COST)) {
      MB.paywall({
        title: 'Not enough gems 💎',
        item: '💎💎💎 Gem Pouch',
        price: '$4.99',
        options: [
          { metric: 'army.win', amount: 1, reward: { type: 'res', res: { gem: 3 } }, label: '+3 💎' },
          { metric: 'slicer.slab', amount: 3, reward: { type: 'res', res: { gem: 2 } }, label: '+2 💎' },
          { metric: 'mob.wave', amount: 2, reward: { type: 'res', res: { gem: 2 } }, label: '+2 💎' },
          { metric: 'screw.plate', amount: 10, reward: { type: 'res', res: { gem: 1 } }, label: '+1 💎' },
        ],
      });
      return;
    }
    opening = true;
    const my = token;
    refs.btn.disabled = true;
    refs.result.innerHTML = '';
    refs.crate.classList.add('shake');
    setTimeout(() => {
      opening = false;
      if (my !== token) return;
      refs.crate.classList.remove('shake');
      const prize = roll(), note = award(prize);
      refs.result.innerHTML = `<div class="prize ${prize.rarity.toLowerCase()}">
        <div class="prize-icon">${prize.icon}</div>
        <div class="rarity">${prize.rarity}</div><b>${prize.name}</b>
        <div class="small">${note}</div></div>`;
      refs.btn.disabled = false;
    }, 1300);
  }

  MB.apps.crate = {
    mount(el) {
      token++;
      opening = false;
      const total = MB.CRATE.reduce((sum, p) => sum + p.w, 0);
      el.innerHTML = `<div class="crate-app">
        <div class="crate">🎁</div>
        <div class="crate-result"></div>
        <button class="btn primary open">Open crate · ${MB.costText(COST)}</button>
        <details class="odds"><summary>odds</summary>
          ${MB.CRATE.map(p => `<div>${p.icon} ${p.name} — ${((100 * p.w) / total).toFixed(1)}%</div>`).join('')}
        </details>
        <p class="small center">Gems come from ads, flawless slices, lucky screw levels and rescuing the King.</p>
      </div>`;
      refs = { crate: el.querySelector('.crate'), result: el.querySelector('.crate-result'), btn: el.querySelector('.open') };
      refs.btn.onclick = open;
    },
    unmount() { token++; refs = null; },
  };
})();
