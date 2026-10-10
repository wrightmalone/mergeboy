// Dev Coffee — the only real-money thing in the game, and it buys nothing.
(function () {
  const MB = window.MB;

  MB.apps.coffee = {
    mount(el) {
      const link = MB.COFFEE_URL
        ? `<a class="btn primary coffee-btn" href="${MB.COFFEE_URL}" target="_blank" rel="noopener">☕ Buy the dev a coffee</a>`
        : '<button class="btn primary coffee-btn" disabled>☕ Coffee link coming soon</button>';
      el.innerHTML = `<div class="coffee">
        <div class="coffee-cup">☕</div>
        <h3>This game will never ask you for money.</h3>
        <p>Every "buy" button on this phone is a joke. Out of lives? Speed up a timer? Need a power pack?
          You go play one of the other games instead. That's the whole game.</p>
        <ul class="promises">
          <li>No real-money purchases. No gems for sale. Ever.</li>
          <li>No timers you can only skip by paying.</li>
          <li>No limited-time offers. Nothing expires.</li>
          <li>Losing never takes away what you earned.</li>
          <li>The only ads are fake, and they're the joke.</li>
          <li>The crate's odds are printed right on it.</li>
        </ul>
        <p>If you enjoyed it and want to say thanks, you can tip the developer below.
          It gives you <b>nothing</b> in-game. No badge, no gems, no VIP. That's the point.</p>
        ${link}
      </div>`;
    },
  };
})();
