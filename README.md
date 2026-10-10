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

Supporting apps:

- **Lucky Crate**: gacha for 💎, with odds disclosed in very small text.
- **VIP Store**: parody IAPs priced in resources, including Remove Ads.
- **Fake interstitial ads**: pop up when you open apps. Their close button sometimes runs away. You
  can also watch them on purpose for 2× production.
- **Login bonus, offline earnings and a 3% battery.**

## The economy: no game ever goes stale

Each game is needed by the others for the whole run, not just early on:

- **Production chain**: 🔩 → 💨 → 🧱 → 🟫, consumed down the line, plus 🟫/🧱/💨/🔩 to
  reach each King stage.
- **Salaries form a loop.** Each intern is paid per run in *another* game's
  resource: Screw ← 💨, Grinder ← 🧱, Merge ← 🟫, Slicer ← 💰, King's Knight ← 🔩.
  A paid intern works 2×; an unpaid one quiet-quits at 1×. The end of the chain
  pays the start, and the King's gold pays the slicer.
- **Upgrades cost other games' resources.** For example, Screw Lv2 needs 🟫 Blocks
  from the end of the chain, and Lv4+ of every intern needs 💰 Gold from the King.
- **Manual play always wins.** Hand-played output is ×(1 + intern level) ×
  King bonus, so playing a game yourself always beats its intern. While a game
  is open, its intern also works 2× ("👀 the boss is watching").
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
js/apps/*.js      one file per game: mount(el), update(dt), refresh(), unmount()
js/main.js        boot, factory tick (wall-clock), animation loop, offline catch-up
tools/            verify-levels.js (headless level checker)
```

To add a game: add an entry to `MB.APPS` (and to `MB.CHAIN` if it has a
`recipe`), then create `js/apps/<id>.js` that registers `MB.apps[<id>]`.

## Ideas for more games

- **Count Masters** (crowd runner through ×2 / −10 gates): multiplies a resource
  batch, sometimes by 0.
- **Parking Jam / Water Sort**: a sorter that turns mixed output into pure output.
- **Hole.io**: a vacuum that collects overflow and scrap from the floor.
- **Hero Wars "real gameplay"**: a stage where the ad's game finally appears, and
  it's match-3.
- **Prestige**: "Rescue the King 2", where you restart with permanent intern perks.
