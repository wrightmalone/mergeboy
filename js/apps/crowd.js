// Crowd Run 3D — the "pick the ×2 gate" runner from a thousand fake ads.
// Choose a gate each round, grow the crowd, beat the boss crowd at the end.
// Survivors march into Last Army as recruits (the ad was real all along).
// Losing at the boss offers a "revive" paywall — an errand, not a payment.
(function () {
  const MB = window.MB;
  const ROUNDS = 6, START = 5;
  const SLEEP = ms => new Promise(r => setTimeout(r, ms));
  let root, run, token = 0;

  const apply = (n, g) => Math.max(0, Math.round(g.op === '+' ? n + g.v : g.op === '-' ? n - g.v : g.op === '×' ? n * g.v : n / g.v));

  function gate() {
    const r = Math.random();
    if (r < 0.35) return { op: '+', v: 5 + Math.floor(Math.random() * 20) };
    if (r < 0.6) return { op: '×', v: 2 + Math.floor(Math.random() * 2) };
    if (r < 0.85) return { op: '-', v: 5 + Math.floor(Math.random() * 15) };
    return { op: '÷', v: 2 };
  }

  function newRun() {
    const rounds = Array.from({ length: ROUNDS }, () => [gate(), gate()]);
    // The boss is sized off the best possible route, so careless picks lose.
    let best = START;
    for (const [l, r] of rounds) best = Math.max(apply(best, l), apply(best, r));
    return { rounds, i: 0, crowd: START, boss: Math.max(8, Math.round(best * (0.45 + Math.random() * 0.2))), lvl: (MB.app('crowd').runs || 0) + 1 };
  }

  // Survivors join Last Army as recruits; extras (or a full barracks) become medals.
  MB.REWARDS.recruits = r => {
    const added = MB.armyAddRecruits ? MB.armyAddRecruits(r.n) : 0;
    const medals = Math.round((r.n - added) / 4);
    if (medals) MB.give({ medal: medals });
    return `${added ? `+${added} 🧑‍🌾 recruits in Last Army` : ''}${added && medals ? ' · ' : ''}${medals ? `+${medals} 🎖️` : ''}` || 'Your crowd wandered off';
  };

  function crowdEmoji(n) {
    const shown = Math.min(n, 30);
    return '🏃'.repeat(shown) + (n > 30 ? ` +${n - 30}` : '');
  }

  function render() {
    if (!run) {
      root.innerHTML = `<div class="crowd">
        <div class="crowd-title">RUN ${(MB.app('crowd').runs || 0) + 1}</div>
        <p class="center">Pick a gate each round. Grow your crowd. Beat the boss crowd.<br>
          <span class="small">Survivors join Last Army as recruits. Every run is free. There is no energy bar.</span></p>
        <button class="btn primary go">🏃 RUN!</button>
      </div>`;
      root.querySelector('.go').onclick = () => { run = newRun(); render(); };
      return;
    }
    const [l, r] = run.rounds[run.i] || [];
    root.innerHTML = `<div class="crowd">
      <div class="crowd-hud"><span>Round ${Math.min(run.i + 1, ROUNDS)}/${ROUNDS}</span><span>👹 Boss: ${run.boss}</span></div>
      <div class="track">
        ${l ? `<div class="gates"><button class="gate ${l.op === '-' || l.op === '÷' ? 'bad' : 'good'}" data-g="0">${l.op}${l.v}</button>
        <button class="gate ${r.op === '-' || r.op === '÷' ? 'bad' : 'good'}" data-g="1">${r.op}${r.v}</button></div>`
        : `<div class="boss">👹👹👹<div class="small">Boss crowd: ${run.boss}</div></div>`}
        <div class="crowd-count">${run.crowd}</div>
        <div class="crowd-people">${crowdEmoji(run.crowd)}</div>
      </div>
    </div>`;
    root.querySelectorAll('.gate').forEach(b => { b.onclick = () => pick(+b.dataset.g); });
  }

  async function pick(side) {
    const my = token, g = run.rounds[run.i][side];
    root.querySelectorAll('.gate').forEach(b => { b.disabled = true; });
    root.querySelector(`.gate[data-g="${side}"]`).classList.add('picked');
    await SLEEP(350);
    if (my !== token) return;
    run.crowd = apply(run.crowd, g);
    run.i++;
    render();
    if (run.crowd === 0) return finish(false);
    if (run.i >= ROUNDS) {
      await SLEEP(600);
      if (my === token) finish(run.crowd > run.boss);
    }
  }

  function finish(won) {
    const s = MB.app('crowd'), left = run.crowd - run.boss;
    s.runs = (s.runs || 0) + 1;
    if (won) {
      const n = Math.max(1, Math.round(left * MB.handMult('crowd')));
      const text = MB.REWARDS.recruits({ n });
      s.crafts++;
      MB.track('crowd.win');
      MB.modal({
        title: '🏆 BOSS CRUSHED!',
        body: `<p class="center reward">${left} survivors</p><p class="center">${text}</p><p class="small center">The ad was real all along.</p>`,
        onClose: () => { run = null; if (root) render(); },
      });
      return;
    }
    const revive = Math.max(3, Math.round(run.boss / 3));
    run = null;
    render();
    MB.paywall({
      title: 'REVIVE YOUR CROWD?! 😭',
      item: `🏃 ×${revive} survivors`,
      price: '$0.99',
      options: [
        { metric: 'merge.slab', amount: 1, reward: { type: 'recruits', n: revive }, label: `${revive} survivors → Last Army` },
        { metric: 'screw.plate', amount: 5, reward: { type: 'recruits', n: revive }, label: `${revive} survivors → Last Army` },
      ],
      wait: 'just run again (it’s free, there’s no energy bar)',
    });
  }

  MB.apps.crowd = {
    mount(el) { root = el; token++; run = null; render(); },
    unmount() { token++; root = null; run = null; },
  };
})();
