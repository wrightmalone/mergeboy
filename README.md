# MergeBoy

Every predatory mobile game from the ads, on one fake phone, feeding each other.

Each app is a parody of a game you've seen advertised. Each one produces a
resource the next one needs. You play each game by hand until you've
"mastered" it, then hire an intern to play it for you forever. The interns
keep the factory running (even while the game is closed), but every game keeps
needing the others, and playing by hand always beats automation. All of it
feeds the big goal: **Rescue the King**.

## Run it

No build step. Open `index.html` directly, or serve the folder:

```bash
python3 -m http.server 8123
```

Progress saves to `localStorage`. The ⟲ button in the dock resets it.

## The games

| App | Parody of | You do | Makes |
| --- | --- | --- | --- |
| 🪛 Screw Loose 3D | "Remove the screw" puzzles | Unscrew plates in the right order; covered screws are stuck | 🔩 Scrap |
| ⚙️ Grind the Thing | Incremental grinder / ASMR ads | Hold to keep the pressure needle in the satisfying zone without jamming | 🔩 → 💨 Dust |
| 👦 Merge Boy | Merge games | Spawn specks, merge Speck → Clump → Chunk → SLAB | 💨 → 🧱 Slabs |
| 🔪 Slice It All! | Slicing games | Time three cuts per slab; perfects give bonus blocks | 🧱 → 🟫 Blocks |
| 🤴 Rescue the King | Pull-the-pin ads | Real pull-the-pin physics puzzles (water, lava, gold, monsters, bombs) | 💰 Gold + the main goal |
| 🍬 Match Royale | Candy Crush / Royal Match | Match 3 with lives, moves and boosters (all parody) | ⭐ Stars + a bit of everything |
| 🪖 Last Army: Merge War | Top War / Last War | Merge troops, battle waves | 🎖️ Medals |
| 🏃 Crowd Run 3D | Count Masters (the Last War ad) | Pick ×2 / +N gates, beat the boss crowd | Recruits for Last Army |
| 🎰 Goose Master | Coin Master | An honestly labelled slot machine; spins only from wins elsewhere | 💎 Gems (via goose village) |
| 🏰 Clash of Kingdoms | Clash of Clans / 4X | Timed building upgrades with no gem skips | Permanent boosts for every other game |

Supporting apps:

- **Lucky Crate**: gacha for 💎, with odds disclosed.
- **VIP Store**: parody IAPs priced in resources.
- **Dev Coffee**: the only real-money button, and it buys nothing.
- **Fake interstitial ads**: pop up when you open apps. Their close button sometimes runs away. You
  can also watch them on purpose for 2× production.
- **Login bonus** (streaks pause, never reset), **offline earnings** (8h cap, stated) and a 3%
  battery.

## Errands: the paywall replacement

This game never asks for money. Wherever the games it parodies would show a purchase screen (out
of lives, "+5 moves", out of energy, "FINISH NOW 💎", "SO CLOSE! Power Pack"), MergeBoy shows the
same screen with the price crossed out. Instead of paying, you pick an **errand** in a *different*
game:

> Drop 6 plates in Screw Loose 3D → +1 ❤️ in Match Royale

Errands appear on the home screen and inside the game where you do them. The reward lands back
where you came from; a paused Match Royale level is still waiting for its extra moves. See
[docs/PROPOSAL.md](docs/PROPOSAL.md) for how all the games link together, and
[docs/RESEARCH.md](docs/RESEARCH.md) for the predatory games and patterns this parodies.

## The economy: no game ever goes stale

Each game is needed by the others for the whole run, not just early on:

- **Production chain**: 🔩 → 💨 → 🧱 → 🟫, consumed down the line, plus 🟫/🧱/💨/🔩 to
  reach each King stage.
- **Salaries form a loop.** Each intern is paid per run in *another* game's
  resource: Screw ← 💨, Grinder ← 🧱, Merge ← 🟫, Slicer ← 💰, King's Knight ← 🔩,
  Candy Intern ← 🎖️, Drill Sergeant ← ⭐.
  A paid intern works 2×; an unpaid one quiet-quits at 1×. The end of the chain
  pays the start, and the King's gold pays the slicer.
- **Upgrades cost other games' resources.** For example, Screw Lv2 needs 🟫 Blocks
  from the end of the chain, and Lv4+ of every intern needs 💰 Gold from the King.
- **Manual play always wins.** Hand-played output is ×(1 + intern level) ×
  King bonus, so playing a game yourself always beats its intern. While a game
  is open, its intern also works 2× ("👀 the boss is watching").
- **Clash of Kingdoms** turns ⭐ 🎖️ 🟫 💰 into permanent +% boosts for the other games. Every
  hand-played action anywhere speeds up its build timers.
- **Rescue the King** pays out the gold the King collects. Cleared stages can be
  replayed for more, or farmed by a Knight intern. Each first clear makes every
  intern (and your hands) 20% faster.

### Progression loop

1. **Install** an app by paying its "download size" in upstream resources.
2. **Master** it: reach N manual crafts.
3. **Automate** it by hiring an intern. Each level adds a fixed number of runs
   per second, and cost grows 1.6× per level.
4. Keep interns **paid** and **fed**. Starved (💤) or unpaid (😒) interns show
   you which other game needs attention, so you jump in and play it by hand.

## Rescue the King levels

`js/pinsim.js` is a small falling-sand simulation. Liquids flow; gold, stone
and bombs pile up; water + lava → stone; lava burns monsters and detonates
bombs; monsters walk toward the King; the King walks toward gold but won't step
next to lava. A stage is won when the King has collected `need` gold, every
monster is dead and everything has settled.

Levels are ASCII maps in `js/levels.js`. Check them headlessly:

```bash
node tools/verify-levels.js
```

```bash
node tools/verify-levels.js 7 --show
```

The first command checks that every stage's `solution` wins on 25 random seeds
and lists which other pin orders win or lose, so you can confirm the traps
work. The second prints the grid after each pin of a stage's solution.

## Code layout

```
index.html, styles.css
js/data.js        tunables: resources, apps (recipes, salaries, upgrade costs), ads, crate, store
js/levels.js      Rescue the King stages (ASCII maps, costs, solutions)
js/pinsim.js      pull-the-pin physics (pure logic, runs in Node too)
js/state.js       save/load, resource helpers, automation simulation
js/ui.js          phone shell: home screen, app views, automation panel, modals
js/ads.js         fake interstitials
js/errands.js     errands + the parody paywall (MB.track, MB.paywall, MB.REWARDS)
js/apps/*.js      one file per game: mount(el), update(dt), refresh(), unmount()
js/main.js        boot, factory tick (wall-clock), animation loop, offline catch-up
tools/            verify-levels.js (headless level checker), sim-economy.js (intern-only economy run)
docs/             PROPOSAL.md (how the games link), RESEARCH.md (predatory games & patterns)
```

To add a game:

1. Add an entry to `MB.APPS`. If it has a `recipe`, also add it to `MB.CHAIN`.
2. Create `js/apps/<id>.js` that registers `MB.apps[<id>]`.
3. Add its script tag to `index.html`.

To link it to the others:

- Call `MB.track('<id>.<action>')` on hand-played wins, and add the metric to `MB.METRICS`.
- Use `MB.paywall({...})` wherever a predatory game would ask for money.

## Ideas for more games

See [docs/PROPOSAL.md](docs/PROPOSAL.md#proposed-next).
