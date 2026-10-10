// Crowd Run 3D — the "pick the ×2 gate" runner from a thousand fake ads.
// Choose a gate each round, grow the crowd, beat the boss crowd at the end.
// Survivors march into Last Army as recruits (the ad was real all along).
// Losing at the boss offers a "revive" paywall — an errand, not a payment.
//
// Run Bot plays the same run: one gate per move, picked at random unless Times
// Tables teaches it to compare. Upgrades: smarter picks, a bigger starting
// crowd, a faster bot.
(function () {
  const MB = window.MB;
  const ROUNDS = 6, START = 5;

  // --- Model ------------------------------------------------------------------------
  const a = () => MB.app('crowd');
  const apply = (n, g) => Math.max(0, Math.round(g.op === '+' ? n + g.v : g.op === '-' ? n - g.v : g.op === '×' ? n * g.v : n / g.v));

  function gate() {
    const r = Math.random();
    if (r < 0.35) return { op: '+', v: 5 + Math.floor(Math.random() * 20) };
    if (r < 0.6) return { op: '×', v: 2 + Math.floor(Math.random() * 2) };
    if (r < 0.85) return { op: '-', v: 5 + Math.floor(Math.random() * 15) };
    return { op: '÷', v: 2 };
  }

  function start(by) {
    const crowd = START + 5 * MB.up('crowd', 'start');
    const rounds = Array.from({ length: ROUNDS }, () => [gate(), gate()]);
    // The boss is sized off the best possible route, so careless picks lose.
    let best = crowd;
    for (const [l, r] of rounds) best = Math.max(apply(best, l), apply(best, r));
    a().run = { rounds, i: 0, crowd, boss: Math.max(8, Math.round(best * (0.45 + Math.random() * 0.2))) };
    a().botSide = null;
    MB.gameEvent('crowd', { type: 'start', by });
  }

  function pick(side, by) {
    const run = a().run;
    if (!run || run.i >= ROUNDS) return;
    run.crowd = apply(run.crowd, run.rounds[run.i][side]);
    run.i++;
    a().botSide = null;
    MB.gameEvent('crowd', { type: 'pick', side, by });
    if (run.crowd === 0 || run.i >= ROUNDS) finish(run.crowd > run.boss, by);
  }

  function finish(won, by) {
    const s = a(), run = s.run;
    s.run = null;
    s.runs = (s.runs || 0) + 1;
    if (won) {
      const n = Math.max(1, Math.round((run.crowd - run.boss) * MB.outMult('crowd')));
      const text = MB.REWARDS.recruits({ n });
      if (by === 'you') {
        s.crafts++;
        MB.track('crowd.win');
      }
      MB.gameEvent('crowd', { type: 'win', survivors: run.crowd - run.boss, text, by });
    } else {
      MB.gameEvent('crowd', { type: 'lose', revive: Math.max(3, Math.round(run.boss / 3)), by });
    }
  }

  // Run Bot: random gate, unless Times Tables kicks in and it picks the bigger one.
  function botSide(run) {
    const [l, r] = run.rounds[run.i];
    if (Math.random() < 0.1 + 0.15 * MB.up('crowd', 'sense')) return apply(run.crowd, l) >= apply(run.crowd, r) ? 0 : 1;
    return Math.random() < 0.5 ? 0 : 1;
  }

  MB.registerBot('crowd', {
    act() {
      const s = a();
      if (!s.run) return start('bot');
      pick(s.botSide ?? botSide(s.run), 'bot');
    },
  });

  // Survivors join Last Army as recruits; extras (or a full barracks) become medals.
  MB.REWARDS.recruits = r => {
    const added = MB.armyAddRecruits ? MB.armyAddRecruits(r.n) : 0;
    const medals = Math.round((r.n - added) / 4);
    if (medals) MB.give({ medal: medals });
    return `${added ? `+${added} 🧑‍🌾 recruits in Last Army` : ''}${added && medals ? ' · ' : ''}${medals ? `+${medals} 🎖️` : ''}` || 'Your crowd wandered off';
  };

  // --- View -------------------------------------------------------------------------
  let root;

  function crowdEmoji(n) {
    const shown = Math.min(n, 30);
    return '🏃'.repeat(shown) + (n > 30 ? ` +${n - 30}` : '');
  }

  function render() {
    const s = a(), run = s.run;
    if (!run) {
      root.innerHTML = `<div class="crowd">
        <div class="crowd-title">RUN ${(s.runs || 0) + 1}</div>
        <p class="center">Pick a gate each round. Grow your crowd. Beat the boss crowd.<br>
          <span class="small">Survivors join Last Army as recruits. Every run is free. There is no energy bar.</span></p>
        <button class="btn primary go">🏃 RUN!</button>
      </div>`;
      root.querySelector('.go').onclick = () => start('you');
      return;
    }
    const [l, r] = run.rounds[run.i] || [];
    // Show which gate the bot is about to take.
    if (MB.hasBot('crowd') && l && s.botSide == null) s.botSide = botSide(run);
    const mark = MB.hasBot('crowd') ? s.botSide : null;
    root.innerHTML = `<div class="crowd">
      <div class="crowd-hud"><span>Round ${Math.min(run.i + 1, ROUNDS)}/${ROUNDS}</span><span>👹 Boss: ${run.boss}</span></div>
      <div class="track">
        ${l ? `<div class="gates">${[l, r].map((g, i) => `<button class="gate ${g.op === '-' || g.op === '÷' ? 'bad' : 'good'} ${mark === i ? 'bot-pick' : ''}" data-g="${i}">${g.op}${g.v}${mark === i ? '<span class="gate-bot">🤖</span>' : ''}</button>`).join('')}</div>`
          : `<div class="boss">👹👹👹<div class="small">Boss crowd: ${run.boss}</div></div>`}
        <div class="crowd-count">${run.crowd}</div>
        <div class="crowd-people">${crowdEmoji(run.crowd)}</div>
      </div>
    </div>`;
    root.querySelectorAll('.gate').forEach(b => { b.onclick = () => pick(+b.dataset.g, 'you'); });
  }

  MB.apps.crowd = {
    mount(el) { root = el; render(); },

    onEvent(evt) {
      if (!root) return;
      render();
      if (evt.type === 'win') {
        if (evt.by === 'you') {
          MB.modal({
            title: '🏆 BOSS CRUSHED!',
            body: `<p class="center reward">${evt.survivors} survivors</p><p class="center">${evt.text}</p><p class="small center">The ad was real all along.</p>`,
          });
        } else {
          MB.toast(`🤖 Run Bot beat the boss: ${evt.text}`);
        }
      } else if (evt.type === 'lose') {
        if (evt.by === 'bot') {
          MB.toast('🤖 Run Bot lost to the boss. It can’t do maths. It’s running again.');
          return;
        }
        MB.paywall({
          title: 'REVIVE YOUR CROWD?! 😭',
          item: `🏃 ×${evt.revive} survivors`,
          price: '$0.99',
          options: [
            { metric: 'merge.slab', amount: 1, reward: { type: 'recruits', n: evt.revive }, label: `${evt.revive} survivors → Last Army` },
            { metric: 'screw.plate', amount: 5, reward: { type: 'recruits', n: evt.revive }, label: `${evt.revive} survivors → Last Army` },
          ],
          wait: 'just run again (it’s free, there’s no energy bar)',
        });
      }
    },

    update() {
      // The bot's chosen gate fills up as its next move approaches.
      const g = root?.querySelector('.gate.bot-pick');
      if (g) g.style.setProperty('--p', MB.botProgress('crowd'));
    },

    unmount() { root = null; },
  };
})();
