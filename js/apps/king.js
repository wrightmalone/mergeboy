// Rescue the King — the long-term goal. Each stage: deliver materials from the
// production chain, then pull the pins in the right order.
(function () {
  const MB = window.MB;
  let root, step, failed;

  function sceneHtml(st, interactive) {
    return `<div class="pin-scene ${interactive ? '' : 'preview'}">${st.layout.map(item => typeof item === 'string'
      ? `<div class="chamber">${item}</div>`
      : `<button class="pin" data-pin="${item.pin}" ${interactive ? '' : 'disabled'}>
           <span class="pin-bar"><span class="pin-head"></span></span>
           <span class="pin-label">${item.pin} · ${item.label}</span>
         </button>`).join('')}</div>`;
  }

  function render() {
    const s = MB.state;
    if (s.king >= MB.KING.length) {
      root.innerHTML = `<div class="king center">
        <div class="king-path">${MB.KING.map(() => '✅').join('')}</div>
        <div class="king-big">🤴🎉</div>
        <h3>The King is safe.</h3><p>For now.</p>
        <button class="btn primary again">Watch the ending again</button>
      </div>`;
      root.querySelector('.again').onclick = showEnding;
      return;
    }

    const st = MB.KING[s.king];
    const path = MB.KING.map((_, j) => (j < s.king ? '✅' : j === s.king ? '🤴' : '⬜')).join('');
    root.innerHTML = `<div class="king">
      <div class="king-path">${path}</div>
      <h3>Stage ${s.king + 1}: ${st.name}</h3>
      <p class="peril">${st.peril}</p>
      ${sceneHtml(st, s.kingPaid)}
      <div class="king-foot"></div>
    </div>`;

    const foot = root.querySelector('.king-foot');
    if (!s.kingPaid) {
      foot.innerHTML = `<p>To reach him you'll need <b>${MB.costText(st.cost)}</b>.</p>
        <button class="btn primary send">Send materials</button>
        <p class="small">The King cannot wait! (He can, actually. Take your time.)</p>`;
      const send = foot.querySelector('.send');
      send.disabled = !MB.can(st.cost);
      send.onclick = () => {
        if (!MB.pay(st.cost)) return;
        s.kingPaid = true;
        startPuzzle();
      };
    } else {
      startPuzzle();
    }
  }

  function startPuzzle() {
    step = 0;
    failed = false;
    if (!root.querySelector('.pin-scene:not(.preview)')) {
      root.querySelector('.pin-scene').outerHTML = sceneHtml(MB.KING[MB.state.king], true);
    }
    root.querySelector('.king-foot').innerHTML = '<p class="center"><b>Pull the pins in the right order.</b><br><span class="small">99% of players fail this level!</span></p>';
    root.querySelector('.pin-scene').addEventListener('click', e => {
      const pin = e.target.closest('.pin');
      if (pin) pull(pin);
    });
  }

  function pull(pinEl) {
    const st = MB.KING[MB.state.king], id = pinEl.dataset.pin;
    if (failed || pinEl.classList.contains('pulled')) return;
    pinEl.classList.add('pulled');
    if (st.answer[step] !== id) {
      failed = true;
      const foot = root.querySelector('.king-foot');
      foot.innerHTML = `<div class="fail">❌ ${st.fails[id] || 'That was not the right pin. The King is having a bad day.'}</div>
        <p class="small center">Only 1% of players get this right! (Your materials are safe.)</p>
        <button class="btn primary retry">Try again</button>`;
      foot.querySelector('.retry').onclick = render;
      return;
    }
    if (++step === st.answer.length) succeed(st);
  }

  function succeed(st) {
    const s = MB.state;
    s.king++;
    s.kingPaid = false;
    const final = s.king >= MB.KING.length;
    if (!final) MB.give({ gem: 3 });
    MB.modal({
      title: final ? '👑 Final stage cleared!' : '👑 Stage cleared!',
      body: `<p>${st.win}</p>${final ? '' : '<p class="small">Reward: +3 💎 · every intern now works 20% faster.</p>'}`,
      buttons: [{ label: 'Continue', primary: true }],
      onClose: () => {
        if (final) showEnding();
        if (root) render();
      },
    });
  }

  function showEnding() {
    MB.state.won = true;
    MB.modal({
      cls: 'ending',
      title: '🤴 THE KING IS SAVED',
      body: `<p>You unscrewed the screws. You ground the thing. You merged the boy. You sliced it all. You pulled every pin.</p>
        <p>The King looks you in the eye and says:</p>
        <blockquote>“Thank you. Now please rate us 5 stars.”</blockquote>
        <p>Then he falls into a new ditch.</p>
        <p><b>Rescue the King 2</b> — coming soon.</p>
        <p class="small">Thanks for playing the MergeBoy prototype. Your interns will keep playing forever.</p>`,
      buttons: [{ label: '⭐⭐⭐⭐⭐', primary: true }],
    });
  }

  MB.apps.king = {
    mount(el) { root = el; render(); },
    refresh() {
      const send = root?.querySelector('.send');
      if (send) send.disabled = !MB.can(MB.KING[MB.state.king].cost);
    },
    unmount() { root = null; },
  };
})();
