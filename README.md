# MergeBoy

Every predatory mobile game from the ads, on one fake phone, feeding each other.

Each app is a parody of a game you've seen advertised, and each produces a
currency. You play each game by hand until you've "mastered" it, then hire a
bot that plays it for you: really plays it, on the board you see, one slow move
at a time. Every upgrade (bot speed, bigger boards, golden plates…) is bought
with *other* games' currencies, so every game keeps feeding the others. All of
it feeds the big goal: **Rescue the King**.

## Run it

No build step. Open `index.html` directly, or serve the folder with caching
turned off (so edits show up on a plain reload):

```bash
python3 tools/serve.py
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
| 🎲 Landlord GO! | Monopoly GO | Roll around a board; dice only from wins elsewhere, ×3 cap, stickers whose duplicates trade in | A bit of everything; landmarks raise payouts |
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

## Bots you can watch

Every production game can hire a bot once you've mastered it by hand. The bot
plays the **same board you see**, one move at a time: Screwbot hovers over a
screw while its timer ring fills, then unscrews it; the Knight pulls pins on a
stage while the physics plays out; Candy Bot makes one swap at a time. They start slow on purpose (Screwbot: one screw every 15 seconds).

While an app is closed, its bot keeps playing headlessly with the same rules,
so offline progress is real play, not a formula. Each bot has a speed floor
(`bot.min`), and offline each bot makes at most one move every 2 seconds.

## Upgrades: every game feeds the others

Each game has an upgrade tree (`upgrades` in `js/data.js`), always paid for in
**other games' currencies**:

- **Hire / speed:** hire the bot (after mastery), then make it move 20% sooner
  per level.
- **Game upgrades** that change the game itself, for your hands too. For example:
  - Screw Loose: more plates per board (a bigger clear bonus), golden ×3
    plates, ✨ bonus boards.
  - Slicer: more cuts per slab, a steadier bot hand.
- **Clash of Kingdoms** buildings add permanent +% payouts per game, and the
  Bot Garage speeds up every bot.
- **Rescue the King**: every first clear makes everything you and your bots
  earn 20% bigger.

Playing by hand is still the fastest way to earn early on, and the bot never
uses lives, energy or dice it didn't earn.

### Progression loop

1. **Install** an app by paying its "download size" in another game's currency.
2. **Master** it: play it by hand N times.
3. **Hire its bot** and watch it play, slowly.
4. **Upgrade** it with currency from the other games, which sends you off to
   play (or upgrade) those.

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
js/data.js        tunables: resources, apps (bots, upgrade trees), buildings, errand metrics, ads, crate, store
js/levels.js      Rescue the King stages (ASCII maps, costs, solutions)
js/pinsim.js      pull-the-pin physics (pure logic, runs in Node too)
js/state.js       save/load, resource helpers, automation simulation
js/ui.js          phone shell: home screen, app views, automation panel, modals
js/ads.js         fake interstitials
js/errands.js     errands + the parody paywall (MB.track, MB.paywall, MB.REWARDS)
js/bots.js        bot scheduler + upgrades (MB.registerBot, MB.runBots, MB.up, MB.buyUp)
js/apps/*.js      one file per game: a model (persisted state + rules), its bot, and a view
                  (mount, update(dt), refresh(), onEvent(evt), unmount)
js/main.js        boot, factory tick (wall-clock), animation loop, offline catch-up
tools/            serve.py (no-cache dev server), verify-levels.js (headless level checker),
                  sim-economy.js (runs every bot headlessly for N hours)
docs/             PROPOSAL.md (how the games link), RESEARCH.md (predatory games & patterns)
```

To add a game:

1. Add an entry to `MB.APPS`. If it has a `recipe`, also add it to `MB.CHAIN`.
2. Create `js/apps/<id>.js` that registers `MB.apps[<id>]`.
3. Add its script tag to `index.html`.

To give it a bot: add `bot` and `upgrades` to its `MB.APPS` entry, keep its state
in `MB.app(id)`, and register `MB.registerBot(id, { act })` where `act` makes one
move (or returns a reason it can't). Emit `MB.gameEvent(id, evt)` so the view can
animate bot moves.

To link it to the others:

- Call `MB.track('<id>.<action>')` on hand-played wins, and add the metric to `MB.METRICS`.
- Use `MB.paywall({...})` wherever a predatory game would ask for money.

## Ideas for more games

See [docs/PROPOSAL.md](docs/PROPOSAL.md#proposed-next).
