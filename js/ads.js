// Fake interstitial ads. They pop up when opening apps (unless removed in the
// VIP Store), and can be watched on purpose for a 2× boost.
(function () {
  const MB = window.MB;
  const COOLDOWN_MS = 75_000, CHANCE = 0.35, SKIP_AFTER = 5;

  MB.ads = {
    maybe(then) {
      const s = MB.state;
      if (s.adsRemoved || Date.now() - s.lastAdAt < COOLDOWN_MS || Math.random() > CHANCE) return then();
      this.show(then);
    },

    show(then, { reward = { gem: 1 } } = {}) {
      MB.state.lastAdAt = Date.now();
      const ad = MB.ADS[Math.floor(Math.random() * MB.ADS.length)];
      const body = MB.h(`<div class="ad">
        <div class="ad-top"><span class="ad-tag">AD</span><span class="ad-timer">${SKIP_AFTER}</span><button class="ad-x" hidden aria-label="Close ad">✕</button></div>
        <div class="ad-scene"></div>
        <div class="ad-cap"></div>
        <button class="btn primary ad-install">INSTALL NOW</button>
        <div class="ad-foot">Gameplay may not reflect actual gameplay. Actual game may not exist.</div>
      </div>`);
      const $ = sel => body.querySelector(sel);

      MB.modal({
        cls: 'ad-modal', body, buttons: [],
        onOpen: (_, close) => {
          let frame = 0, left = SKIP_AFTER, dodged = false;
          const showFrame = () => {
            const [scene, cap] = ad.frames[frame++ % ad.frames.length];
            $('.ad-scene').textContent = scene;
            $('.ad-cap').textContent = cap;
            $('.ad-scene').classList.remove('pop');
            void $('.ad-scene').offsetWidth;
            $('.ad-scene').classList.add('pop');
          };
          showFrame();
          const frames = setInterval(showFrame, 1300);
          const countdown = setInterval(() => {
            $('.ad-timer').textContent = --left;
            if (left > 0) return;
            clearInterval(countdown);
            $('.ad-timer').hidden = true;
            $('.ad-x').hidden = false;
          }, 1000);

          $('.ad-x').onclick = () => {
            // The close button runs away once, sometimes. As is tradition.
            if (!dodged && Math.random() < 0.5) {
              dodged = true;
              $('.ad-x').classList.add('dodge');
              return;
            }
            clearInterval(frames);
            close();
            MB.give(reward);
            if (Object.keys(reward).length) MB.toast(`Thanks for watching! +${MB.costText(reward)}`);
            then?.();
          };
          $('.ad-install').onclick = () => MB.toast(ad.app
            ? 'You already have this game. You have ALL the games.'
            : 'This game does not exist. Like most of the ones in ads.');
        },
      });
    },
  };
})();
