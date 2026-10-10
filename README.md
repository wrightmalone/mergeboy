# MergeBoy

Every predatory mobile game from the ads, on one fake phone, feeding each other.

Each app is a parody of a game you've seen advertised. Each one produces a
resource the next one needs. You play each game by hand until you've
"mastered" it, then hire an intern to play it for you forever. The interns
keep the factory running (even while the game is closed) and the output goes
toward the big goal: **Rescue the King**.

## Run it

No build step. Open `index.html` directly, or serve the folder:

```bash
python3 -m http.server 8123
```

Progress saves to `localStorage`. The ⟲ button in the dock resets it.

## The chain

| App | Parody of | You do | Makes |
| --- | --- | --- | --- |
| 🪛 Screw Loose 3D | "Remove the screw" puzzles | Unscrew plates in the right order; covered screws are stuck | 🔩 Scrap |
| ⚙️ Grind the Thing | Incremental grinder / ASMR ads | Hold to keep the pressure needle in the satisfying zone without jamming | 🔩 → 💨 Dust |
| 👦 Merge Boy | Merge games | Spawn specks, merge Speck → Clump → Chunk → SLAB | 💨 → 🧱 Slabs |
| 🔪 Slice It All! | Slicing games | Time three cuts per slab; perfects give bonus blocks | 🧱 → 🟫 Blocks |
| 🤴 Rescue the King | Pull-the-pin ads | Deliver materials, then pull the pins in the right order | The goal (7 stages) |

Supporting apps:

- **Lucky Crate**: gacha for 💎, with odds disclosed in very small text.
- **VIP Store**: parody IAPs priced in resources, including Remove Ads.
- **Fake interstitial ads**: pop up when you open apps. Their close button
  sometimes runs away. You can also watch them on purpose for 2× production.
- **Login bonus, offline earnings and a 3% battery.**

### Progression loop

1. **Install** an app by paying its "download size" in upstream resources.
2. **Master** it: reach N manual crafts.
3. **Automate** it by hiring an intern. Each upgrade level adds a fixed number
   of runs per second, and cost grows 1.6× per level.
4. Each automated game consumes its inputs. If upstream can't keep up, it shows
   as 💤 starved, so you rebalance by upgrading upstream.
5. Each King stage you clear makes every intern 20% faster.

At level 1, every link in the chain is tuned to the same throughput (screw →
grinder → merge → slicer), so matching levels keeps the factory balanced.

## Code layout

```
index.html, styles.css
js/data.js        all tunables: resources, apps/recipes, King stages, ads, crate, store
js/state.js       save/load, resource helpers, automation simulation
js/ui.js          phone shell: home screen, app views, automation panel, modals
js/ads.js         fake interstitials
js/apps/*.js      one file per game: mount(el), update(dt), refresh(), unmount()
js/main.js        boot, factory tick (wall-clock), animation loop, offline catch-up
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
