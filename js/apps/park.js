// Car Park Jam — "empty the car park". Every car faces a way; tap it and it
// drives straight ahead. If the road to the edge is clear, it escapes (+🔑);
// if not, it bumps whatever's in the way and stays put. Empty the lot for a
// bonus. A car leaving never blocks anyone, so a lot is solvable exactly when
// repeatedly removing escapable cars empties it; every lot is checked first.
//
// Valet Bot (this game's bot) tries one car per move: a random one (so it bumps
// a lot), unless Parking Sensors teach it to pick cars that can leave.
// Upgrades: smarter picks, bigger lots (+1 🔑 per car), a faster bot.
(function () {
  const MB = window.MB;
  const N = 6, BASE_CARS = 6;
  const PAINT = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#f97316', '#ec4899', '#14b8a6', '#f8fafc', '#64748b', '#84cc16', '#06b6d4'];
  const STEP = { L: [-1, 0], R: [1, 0], U: [0, -1], D: [0, 1] };

  // --- Model ------------------------------------------------------------------------
  const a = () => MB.app('park');
  const carCount = () => BASE_CARS + 2 * MB.up('park', 'lot');
  const cellsOf = c => (c.dir === 'L' || c.dir === 'R' ? [[c.x, c.y], [c.x + 1, c.y]] : [[c.x, c.y], [c.x, c.y + 1]]);

  function occupied(cars, except) {
    const set = new Set();
    for (const c of cars) if (c !== except) for (const [x, y] of cellsOf(c)) set.add(`${x},${y}`);
    return set;
  }

  // Can this car drive straight off the lot right now?
  function canLeave(cars, car) {
    const taken = occupied(cars, car), [dx, dy] = STEP[car.dir];
    const cells = cellsOf(car);
    let [x, y] = dx + dy > 0 ? cells[1] : cells[0];
    for (x += dx, y += dy; x >= 0 && y >= 0 && x < N && y < N; x += dx, y += dy) {
      if (taken.has(`${x},${y}`)) return false;
    }
    return true;
  }

  function solvable(cars) {
    let left = cars.slice();
    for (;;) {
      const free = left.find(c => canLeave(left, c));
      if (!free) return !left.length;
      left = left.filter(c => c !== free);
    }
  }

  function newLot() {
    const want = carCount();
    for (;;) {
      const cars = [];
      for (let tries = 0; cars.length < want && tries < 400; tries++) {
        const horiz = Math.random() < 0.5;
        const car = {
          id: cars.length,
          x: Math.floor(Math.random() * (horiz ? N - 1 : N)),
          y: Math.floor(Math.random() * (horiz ? N : N - 1)),
          dir: horiz ? (Math.random() < 0.5 ? 'L' : 'R') : (Math.random() < 0.5 ? 'U' : 'D'),
          color: PAINT[cars.length % PAINT.length],
        };
        const taken = occupied(cars);
        if (cellsOf(car).some(([x, y]) => taken.has(`${x},${y}`))) continue;
        cars.push(car);
      }
      // A real jam: full lot, solvable, and not everyone can just leave.
      if (cars.length === want && solvable(cars) && cars.some(c => !canLeave(cars, c))) {
        a().g = { cars, total: want };
        a().botCar = null;
        return;
      }
    }
  }

  const lot = () => {
    if (!a().g) newLot();
    return a().g;
  };

  // Tap a car: it escapes, or it bumps. Returns true if it escaped.
  function drive(id, by) {
    const g = lot(), car = g.cars.find(c => c.id === id);
    if (!car) return false;
    a().botCar = null;
    if (!canLeave(g.cars, car)) {
      MB.gameEvent('park', { type: 'bump', id, by });
      return false;
    }
    g.cars = g.cars.filter(c => c !== car);
    const key = Math.round(MB.outMult('park') * 10) / 10;
    MB.give({ key });
    MB.gameEvent('park', { type: 'exit', car, key, by });
    if (!g.cars.length) {
      const bonus = Math.round((g.total / 2) * MB.outMult('park'));
      MB.give({ key: bonus });
      if (by === 'you') {
        a().crafts++;
        MB.track('park.win');
      }
      newLot();
      MB.gameEvent('park', { type: 'empty', bonus, by });
    }
    return true;
  }

  // Valet Bot: a car that can leave (with Parking Sensors), or any car.
  function botPick() {
    const g = lot();
    const free = g.cars.filter(c => canLeave(g.cars, c));
    const pool = Math.random() < 0.3 + 0.17 * MB.up('park', 'eyes') && free.length ? free : g.cars;
    return pool[Math.floor(Math.random() * pool.length)]?.id ?? null;
  }

  MB.registerBot('park', {
    act() {
      const s = a(), g = lot();
      const id = s.botCar != null && g.cars.some(c => c.id === s.botCar) ? s.botCar : botPick();
      s.botCar = null;
      if (id == null) return 'empty lot';
      drive(id, 'bot');
    },
  });

  // --- View -------------------------------------------------------------------------
  let root, busy = false, token = 0;
  const ROT = { L: 'scaleX(1)', R: 'scaleX(-1)', U: 'rotate(90deg)', D: 'rotate(-90deg)' };
  const ARROW = { L: '◀', R: '▶', U: '▲', D: '▼' };

  function carHtml(c, extra = '') {
    const horiz = c.dir === 'L' || c.dir === 'R';
    return `<button class="car ${extra}" data-id="${c.id}" style="left:${(c.x / N) * 100}%;top:${(c.y / N) * 100}%;width:${((horiz ? 2 : 1) / N) * 100}%;height:${((horiz ? 1 : 2) / N) * 100}%;--paint:${c.color}">
      <span class="car-emoji" style="transform:${ROT[c.dir]}">🚗</span><span class="car-arrow">${ARROW[c.dir]}</span></button>`;
  }

  function render() {
    const g = lot(), plan = MB.hasBot('park') ? (a().botCar ??= botPick()) : null;
    root.innerHTML = `<div class="park">
      <div class="park-hud"><span>🚗 ${g.cars.length}/${g.total} left</span><span>Empty it → +${Math.round(g.total / 2)} 🔑 bonus</span></div>
      <div class="lot">${g.cars.map(c => carHtml(c, plan === c.id ? 'bot-pick' : '')).join('')}
        ${plan != null ? '<div class="bot-cursor"><span>🤵</span><i></i></div>' : ''}</div>
      <p class="small center">Tap a car to drive it the way it’s facing. Blocked cars just bump. Each car out is +1 🔑.</p>
      <button class="btn skip">New car park</button>
    </div>`;
    root.querySelector('.lot').addEventListener('click', e => {
      const c = e.target.closest('.car');
      if (c && !busy) drive(+c.dataset.id, 'you');
    });
    root.querySelector('.skip').onclick = () => { newLot(); render(); };
    placeCursor();
  }

  function placeCursor() {
    const cur = root?.querySelector('.lot .bot-cursor'), car = root?.querySelector('.car.bot-pick');
    if (!cur || !car) return;
    cur.style.left = `calc(${car.style.left} + ${car.style.width} / 2)`;
    cur.style.top = `calc(${car.style.top} + ${car.style.height} / 2)`;
    cur.style.setProperty('--p', MB.botProgress('park'));
  }

  MB.apps.park = {
    mount(el) { root = el; token++; busy = false; MB.busy.park = false; render(); },

    onEvent(evt) {
      if (!root) return;
      if (evt.type === 'bump') {
        const el = root.querySelector(`.car[data-id="${evt.id}"]`);
        el?.classList.remove('bump');
        void el?.offsetWidth;
        el?.classList.add('bump');
        if (evt.by === 'bot') MB.floatFrom(el, 'bump! 🤦', 'bad');
      } else if (evt.type === 'exit') {
        const el = root.querySelector(`.car[data-id="${evt.car.id}"]`);
        if (el) {
          const [dx, dy] = STEP[evt.car.dir];
          el.style.transform = `translate(${dx * 400}%, ${dy * 400}%)`;
          el.classList.add('leaving');
          MB.floatFrom(el, `+${evt.key} 🔑`);
        }
        busy = true;
        MB.busy.park = true;
        const my = token;
        setTimeout(() => {
          if (my !== token) return;
          busy = false;
          MB.busy.park = false;
          render();
        }, 380);
      } else if (evt.type === 'empty') {
        if (evt.by === 'you') MB.modal({ title: '🅿️ CAR PARK EMPTY!', body: `<p class="center reward">+${evt.bonus} 🔑 bonus</p><p class="small center">Only 2% of players can do this. (Everyone can do this.)</p>` });
        else MB.toast(`🤵 Valet Bot emptied a car park: +${evt.bonus} 🔑`);
      }
    },

    update() { placeCursor(); },

    unmount() { token++; MB.busy.park = false; root = null; },
  };
})();
