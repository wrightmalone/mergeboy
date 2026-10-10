// Goose Master — a slot machine, honestly labelled. Parody of the spin-to-win
// village games. Spins never regenerate and are never sold: you earn them by
// winning in the other games. The odds are printed on the machine. There is no
// double-down bet. Hammers and pigs only "attack" an NPC goose, who is fine.
// Coins build a goose village; each building pays out gems, so this is the
// honest place gems come from. Spin Bot pulls the lever for you, but only ever
// spends spins you earned.
(function () {
  const MB = window.MB;
  const SYMBOLS = [
    { s: '🪙', w: 40, name: 'Coins' },
    { s: '🔨', w: 20, name: 'Hammer' },
    { s: '🐷', w: 15, name: 'Pig' },
    { s: '🛡️', w: 15, name: 'Shield' },
    { s: '🎰', w: 10, name: 'Spins' },
  ];
  const TOTAL = SYMBOLS.reduce((n, x) => n + x.w, 0);
  const VILLAGE = ['🏠', '🌳', '⛲', '🗿', '🏰'];
  const NOTES = [
    'Honk. Sorry about my village being in the way of your hammer. — Goose',
    'Honk honk. You raided my coins. I have more. I am a goose. — Goose',
    'No hard feelings. Literally none. I am an NPC. — Goose',
  ];
  // Spins come from winning (hand-played) in other games.
  const SPIN_SOURCES = { 'match3.win': 1, 'army.win': 1, 'king.win': 2, 'crowd.win': 1, 'merge.slab': 1, 'slicer.slab': 1, 'board.lap': 1 };

  let root, spinning = false, token = 0;
  const a = () => MB.app('spin');
  const init = () => { const s = a(); if (s.spins === undefined) { s.spins = 3; s.coins = 0; s.built = 0; s.village = 1; } };
  const itemCost = i => 50 * 2 ** i * a().village;

  MB.onTrack(metric => {
    if (!SPIN_SOURCES[metric] || !a().installed) return;
    init();
    a().spins += SPIN_SOURCES[metric];
  });

  MB.REWARDS.spins = r => {
    init();
    a().spins += r.n;
    return `+${r.n} 🎰 spins in Goose Master`;
  };

  const roll = () => {
    let r = Math.random() * TOTAL;
    return SYMBOLS.find(x => (r -= x.w) < 0) || SYMBOLS[0];
  };
  const pct = x => ((x.w / TOTAL) ** 3 * 100).toFixed(2);

  function payout(reels) {
    const [x, y, z] = reels.map(r => r.s);
    if (x === y && y === z) {
      switch (x) {
        case '🪙': return { coins: 50, text: 'JACKPOT! +50 🪙' };
        case '🔨': return { coins: 40, text: '🔨 You smashed the goose’s village. +40 🪙', note: true };
        case '🐷': return { coins: 60, text: '🐷 You raided the goose. +60 🪙', note: true };
        case '🛡️': return { gem: 1, text: '🛡️ Shield! There is nothing to defend against. Have a 💎.' };
        default: return { spins: 3, text: '🎰 +3 spins!' };
      }
    }
    const coins = reels.filter(r => r.s === '🪙').length;
    if (coins === 2) return { coins: 10, text: '+10 🪙' };
    return { coins: 2, text: '+2 🪙 (you always get something here)' };
  }

  function spinPaywall() {
    MB.paywall({
      title: 'OUT OF SPINS 🎰',
      item: '🎰 ×20 spins',
      price: '$1.99',
      options: [
        { metric: 'match3.win', amount: 1, reward: { type: 'spins', n: 3 }, label: '+3 spins' },
        { metric: 'army.win', amount: 1, reward: { type: 'spins', n: 3 }, label: '+3 spins' },
        { metric: 'board.lap', amount: 1, reward: { type: 'spins', n: 2 }, label: '+2 spins' },
        { metric: 'screw.plate', amount: 6, reward: { type: 'spins', n: 1 }, label: '+1 spin' },
      ],
      wait: 'just win anything, anywhere: every win elsewhere earns a spin',
    });
  }

  function render() {
    init();
    const s = a();
    root.innerHTML = `<div class="spin">
      <div class="machine">
        <div class="reels"><div class="reel">🎰</div><div class="reel">🎰</div><div class="reel">🎰</div></div>
        <div class="spin-msg">This is a slot machine. We told you.</div>
        <button class="btn primary spin-btn">SPIN · ${s.spins} left</button>
      </div>
      <div class="odds-board small">${SYMBOLS.map(x => `<span>${x.s}${x.s}${x.s} ${pct(x)}%</span>`).join('')}
        <span>Anything else: at least +2 🪙</span><span>No double-down. No bets. No paid spins.</span></div>
      <div class="goose-village">
        <div><b>Goose Village ${s.village}</b> · 🪙 ${MB.fmt(s.coins)}</div>
        <div class="vill">${VILLAGE.map((e, i) => `<span class="${i < s.built ? 'built' : ''}">${e}</span>`).join('')}</div>
        ${s.built < VILLAGE.length
          ? `<button class="btn build-btn">Build ${VILLAGE[s.built]} · ${MB.fmt(itemCost(s.built))} 🪙 → +2 💎</button>`
          : ''}
      </div>
      <p class="small center">Spins never regenerate and can’t be bought. Every win in another game earns one.</p>
    </div>`;
    root.querySelector('.spin-btn').onclick = spin;
    root.querySelector('.build-btn')?.addEventListener('click', build);
  }

  // Spin now; the view animates the reels from the event.
  function spinOnce(by) {
    init();
    const s = a();
    if (s.spins < 1) return 'no spins (win games elsewhere to earn them)';
    s.spins--;
    const reels = [roll(), roll(), roll()], p = payout(reels);
    if (p.coins) s.coins += Math.round(p.coins * MB.outMult('spin'));
    if (p.gem) MB.give({ gem: p.gem });
    if (p.spins) s.spins += p.spins;
    if (by === 'you') s.crafts++;
    MB.gameEvent('spin', { type: 'spin', reels: reels.map(r => r.s), text: p.text, note: p.note, by });
    return '';
  }

  MB.registerBot('spin', { act: () => spinOnce('bot') || undefined });

  function spin() {
    if (spinning) return;
    if (spinOnce('you')) spinPaywall();
  }

  async function animate(evt) {
    spinning = true;
    MB.busy.spin = true;
    const my = token, els = [...root.querySelectorAll('.reel')];
    els.forEach(e => e.classList.add('rolling'));
    for (let i = 0; i < 3; i++) {
      await new Promise(r => setTimeout(r, 450));
      if (my !== token) break;
      els[i].classList.remove('rolling');
      els[i].textContent = evt.reels[i];
    }
    spinning = false;
    MB.busy.spin = false;
    if (my !== token) return;
    render();
    root.querySelector('.spin-msg').textContent = `${evt.by === 'bot' ? '🤖 ' : ''}${evt.text}`;
    root.querySelectorAll('.reel').forEach((e, i) => { e.textContent = evt.reels[i]; });
    if (evt.note) MB.toast(`💌 ${NOTES[Math.floor(Math.random() * NOTES.length)]}`);
  }

  function build() {
    const s = a();
    if (s.built >= VILLAGE.length || s.coins < itemCost(s.built)) { MB.toast('Not enough 🪙. Spin more (win more elsewhere).'); return; }
    s.coins -= itemCost(s.built);
    s.built++;
    MB.give({ gem: 2 });
    if (s.built === VILLAGE.length) {
      MB.give({ gem: 5 });
      MB.modal({
        title: '🪿 VILLAGE COMPLETE!',
        body: `<p class="center reward">+7 💎 total</p><p class="small center">The goose moves to a bigger village. Prices double. The goose is thrilled.</p>`,
      });
      s.village++;
      s.built = 0;
    }
    render();
  }

  MB.apps.spin = {
    mount(el) { root = el; token++; spinning = false; MB.busy.spin = false; render(); },
    onEvent(evt) { if (root && evt.type === 'spin') animate(evt); },
    refresh() {
      if (!root || spinning) return;
      const btn = root.querySelector('.spin-btn');
      if (btn) btn.textContent = `SPIN · ${a().spins} left`;
    },
    unmount() { token++; MB.busy.spin = false; root = null; },
  };
})();
