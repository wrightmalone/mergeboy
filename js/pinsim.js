// Pull-the-pin physics for Rescue the King. A falling-sand grid: liquids flow,
// grains pile, lava + water make stone, lava burns monsters and sets off bombs,
// monsters walk toward the King, the King walks toward gold.
// Pure logic, no DOM, so levels can be verified headlessly (see tools/verify-levels.js).
(function (root) {
  const T = { EMPTY: 0, WALL: 1, PIN: 2, WATER: 3, LAVA: 4, STONE: 5, GOLD: 6, KING: 7, MONSTER: 8, BOMB: 9 };
  const CHARS = { '#': T.WALL, '.': T.EMPTY, ' ': T.EMPTY, '~': T.WATER, '^': T.LAVA, '%': T.STONE, '$': T.GOLD, K: T.KING, M: T.MONSTER, o: T.BOMB };
  const TICKS_PER_SEC = 20;
  const SETTLE_TICKS = 30;     // this long with nothing falling or reacting = settled
  const WALK_EVERY = 3;        // entities take a step every N ticks
  const BLAST_RADIUS = 2.5;

  const isLiquid = t => t === T.WATER || t === T.LAVA;
  const isGrain = t => t === T.GOLD || t === T.STONE || t === T.BOMB;
  const isPassable = t => t === T.EMPTY || t === T.WATER;

  // Small seeded PRNG so tests are reproducible.
  function rng(seed) {
    let s = seed >>> 0 || 1;
    return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
  }

  class PinSim {
    constructor(level, seed = Date.now()) {
      const map = level.map;
      this.w = Math.max(...map.map(r => r.length));
      this.h = map.length;
      this.t = new Uint8Array(this.w * this.h);
      this.pinOf = new Array(this.w * this.h).fill(null);
      this.moved = new Uint8Array(this.w * this.h);
      this.rand = rng(seed);
      this.pins = {};
      this.goldTotal = 0;
      for (let y = 0; y < this.h; y++) {
        for (let x = 0; x < this.w; x++) {
          const ch = map[y][x] || '#', i = this.idx(x, y);
          if (/[0-9]/.test(ch)) {
            this.t[i] = T.PIN;
            this.pinOf[i] = ch;
            (this.pins[ch] ||= { id: ch, cells: [], pulled: false }).cells.push([x, y]);
          } else {
            this.t[i] = CHARS[ch] ?? T.WALL;
            if (this.t[i] === T.GOLD) this.goldTotal++;
          }
        }
      }
      for (const p of Object.values(this.pins)) p.horizontal = new Set(p.cells.map(c => c[1])).size === 1;
      this.need = level.need ?? Math.ceil(this.goldTotal / 2);
      this.gold = 0;
      this.dead = null;          // death reason once the King dies
      this.outcome = null;       // 'win' | 'lose'
      this.tick = 0;
      this.quiet = 0;
      this.pulledAny = false;
      this.events = [];          // visual effects for the renderer to consume
    }

    idx(x, y) { return y * this.w + x; }
    get(x, y) { return x < 0 || y < 0 || x >= this.w || y >= this.h ? T.WALL : this.t[this.idx(x, y)]; }

    find(type) {
      const out = [];
      for (let i = 0; i < this.t.length; i++) if (this.t[i] === type) out.push([i % this.w, Math.floor(i / this.w)]);
      return out;
    }
    get king() { return this.find(T.KING)[0]; }
    get monstersLeft() { return this.find(T.MONSTER).length; }
    get pinsLeft() { return Object.values(this.pins).filter(p => !p.pulled).map(p => p.id); }

    pull(id) {
      const pin = this.pins[id];
      if (!pin || pin.pulled || this.outcome) return false;
      pin.pulled = true;
      for (const [x, y] of pin.cells) this.t[this.idx(x, y)] = T.EMPTY;
      this.pulledAny = true;
      this.quiet = 0;
      return true;
    }

    swap(x1, y1, x2, y2) {
      const a = this.idx(x1, y1), b = this.idx(x2, y2);
      [this.t[a], this.t[b]] = [this.t[b], this.t[a]];
      this.moved[b] = 1;
    }

    step() {
      if (this.outcome) return;
      this.tick++;
      this.moved.fill(0);
      let active = false;
      const ltr = this.tick % 2 === 0;

      // Particles, bottom-up so things fall one cell per tick.
      for (let y = this.h - 1; y >= 0; y--) {
        for (let k = 0; k < this.w; k++) {
          const x = ltr ? k : this.w - 1 - k, i = this.idx(x, y);
          if (this.moved[i]) continue;
          const c = this.t[i];
          if (isGrain(c)) active = this.stepGrain(x, y, c) || active;
          else if (c === T.WATER || (c === T.LAVA && this.tick % 2 === 0)) active = this.stepLiquid(x, y) || active;
        }
      }

      active = this.stepEntities() || active;
      active = this.react() || active;

      this.quiet = active ? 0 : this.quiet + 1;
      this.judge();
    }

    stepGrain(x, y, c) {
      const below = this.get(x, y + 1);
      if (below === T.EMPTY || isLiquid(below)) { this.swap(x, y, x, y + 1); return true; }
      if (c === T.BOMB) return false;
      const d = this.rand() < 0.5 ? -1 : 1;
      for (const dx of [d, -d]) {
        const diag = this.get(x + dx, y + 1), side = this.get(x + dx, y);
        if ((diag === T.EMPTY || isLiquid(diag)) && (side === T.EMPTY || isLiquid(side))) {
          this.swap(x, y, x + dx, y + 1);
          return true;
        }
      }
      return false;
    }

    stepLiquid(x, y) {
      if (this.get(x, y + 1) === T.EMPTY) { this.swap(x, y, x, y + 1); return true; }
      const d = this.rand() < 0.5 ? -1 : 1;
      for (const dx of [d, -d]) {
        if (this.get(x + dx, y + 1) === T.EMPTY && this.get(x + dx, y) === T.EMPTY) { this.swap(x, y, x + dx, y + 1); return true; }
      }
      // Sideways spreading doesn't count as activity, or a pool's surface
      // jitter would keep the level from ever settling.
      for (const dx of [d, -d]) {
        if (this.get(x + dx, y) === T.EMPTY) { this.swap(x, y, x + dx, y); return false; }
      }
      return false;
    }

    // Kings and monsters: fall, sink through water, and walk toward their target.
    stepEntities() {
      let active = false;
      const walkTick = this.tick % WALK_EVERY === 0;
      const entities = [...this.find(T.MONSTER).map(p => [...p, T.MONSTER]), ...this.find(T.KING).map(p => [...p, T.KING])];
      for (const [x, y, type] of entities) {
        if (type === T.KING && this.dead) continue;
        const below = this.get(x, y + 1);
        if (isPassable(below)) { this.swap(x, y, x, y + 1); active = true; continue; }
        if (!walkTick) continue;
        const target = type === T.KING ? this.nearestGold(x, y) : this.king;
        if (!target || (type === T.MONSTER && Math.abs(target[1] - y) > 2)) continue;
        const dir = Math.sign(target[0] - x);
        if (!dir) continue;
        const nx = x + dir, side = this.get(nx, y);
        let to = null;
        if (isPassable(side)) to = [nx, y];
        else if (isGrain(side) && isPassable(this.get(nx, y - 1)) && isPassable(this.get(x, y - 1))) to = [nx, y - 1];
        if (!to) continue;
        // The King is cowardly: he won't step next to lava or a monster.
        if (type === T.KING && this.danger(to[0], to[1])) continue;
        this.swap(x, y, to[0], to[1]);
        active = true;
      }
      return active;
    }

    nearestGold(x, y) {
      let best = null;
      for (const [gx, gy] of this.find(T.GOLD)) {
        if (Math.abs(gy - y) > 2) continue;
        if (!best || Math.abs(gx - x) < Math.abs(best[0] - x)) best = [gx, gy];
      }
      return best;
    }

    danger(x, y) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const n = this.get(x + dx, y + dy);
          if (n === T.LAVA || n === T.MONSTER) return true;
        }
      }
      return false;
    }

    react() {
      let active = false;
      const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      const N8 = [...N4, [1, 1], [1, -1], [-1, 1], [-1, -1]];
      for (let y = 0; y < this.h; y++) {
        for (let x = 0; x < this.w; x++) {
          const c = this.t[this.idx(x, y)];
          if (c === T.LAVA) {
            for (const [dx, dy] of N4) {
              const n = this.get(x + dx, y + dy);
              if (n === T.WATER) {
                this.t[this.idx(x, y)] = T.STONE;
                this.t[this.idx(x + dx, y + dy)] = T.EMPTY;
                this.events.push({ type: 'steam', x: x + dx, y: y + dy });
                active = true;
                break;
              }
              if (n === T.BOMB) { this.explode(x + dx, y + dy); active = true; break; }
            }
            if (this.t[this.idx(x, y)] !== T.LAVA) continue;
            for (const [dx, dy] of N8) {
              const n = this.get(x + dx, y + dy);
              if (n === T.MONSTER) {
                this.t[this.idx(x + dx, y + dy)] = T.EMPTY;
                this.events.push({ type: 'burn', x: x + dx, y: y + dy });
                active = true;
              } else if (n === T.KING && !this.dead) {
                this.kill('burned', x + dx, y + dy);
                active = true;
              }
            }
          } else if (c === T.KING && !this.dead) {
            for (const [dx, dy] of N8) {
              const n = this.get(x + dx, y + dy);
              if (n === T.GOLD) {
                this.t[this.idx(x + dx, y + dy)] = T.EMPTY;
                this.gold++;
                this.events.push({ type: 'gold', x: x + dx, y: y + dy });
                active = true;
              } else if (n === T.MONSTER) {
                this.kill('monster', x, y);
                active = true;
              }
            }
          }
        }
      }
      return active;
    }

    explode(cx, cy) {
      this.events.push({ type: 'boom', x: cx, y: cy });
      const r = Math.ceil(BLAST_RADIUS);
      for (let y = cy - r; y <= cy + r; y++) {
        for (let x = cx - r; x <= cx + r; x++) {
          if (Math.hypot(x - cx, y - cy) > BLAST_RADIUS) continue;
          const c = this.get(x, y);
          if (c === T.WALL || c === T.PIN) continue;
          if (c === T.KING) { if (!this.dead) this.kill('boom', x, y); continue; }
          this.t[this.idx(x, y)] = T.EMPTY;
        }
      }
    }

    kill(reason, x, y) {
      this.dead = reason;
      this.events.push({ type: 'dead', x, y });
    }

    judge() {
      if (this.dead) { this.outcome = 'lose'; return; }
      if (!this.pulledAny || this.quiet < SETTLE_TICKS) return;
      if (this.gold >= this.need && this.monstersLeft === 0) this.outcome = 'win';
      else if (!this.pinsLeft.length) this.outcome = 'lose';
    }

    get settled() { return this.quiet >= SETTLE_TICKS; }
  }

  PinSim.T = T;
  PinSim.TICKS_PER_SEC = TICKS_PER_SEC;
  root.PinSim = PinSim;
  if (typeof module !== 'undefined') module.exports = PinSim;
})(typeof window !== 'undefined' ? window.MB : globalThis);
