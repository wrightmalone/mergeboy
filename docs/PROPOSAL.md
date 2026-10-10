# Proposal: how MergeBoy's games link together

## The rule

**Every moment where a predatory game would ask for money becomes a reason to play a
different game.** The only real money in MergeBoy is an optional "buy the dev a coffee" link
(`MB.COFFEE_URL` in `js/data.js`), which unlocks nothing in-game.

This one rule gives the whole design its shape:

- The predatory moments stay in the game as **jokes**: lives, timers, "SO CLOSE!", energy bars,
  "FINISH NOW 💎".
- They work as the **glue**: each one points at another game, so every game stays useful
  for the whole run.
- They're **fair**: there's always an honest alternative too (wait a short, stated time, or just
  keep playing), and losing never takes back what you earned.

## What's on the phone now

| App | Parody of | Produces | Its paywall moment → what you do instead |
| --- | --- | --- | --- |
| 🪛 Screw Loose 3D | Screw Jam & clones | 🔩 Scrap | *(none, it's the raw source)* |
| ⚙️ Grind the Thing | idle tycoons | 💨 Dust | *(none)* |
| 👦 Merge Boy | merge-2 games | 🧱 Slabs | 💡 energy bar → errands |
| 🔪 Slice It All! | slicing hypercasual | 🟫 Blocks | *(none)* |
| 🤴 Rescue the King | Hero Wars / Homescapes pin ads | 💰 Gold + the main goal | Hint (💎) → errands |
| 🍬 Match Royale | Candy Crush / Royal Match | ⭐ Stars (+ a bit of everything) | Out of lives / "+5 moves" / hammers → errands |
| 🪖 Last Army: Merge War | Top War / Last War | 🎖️ Medals | Out of ⚡ / "SO CLOSE! Power Pack" → errands |
| 🏃 Crowd Run 3D | Count Masters, the Last War ad | Recruits → Last Army | Lost to the boss → "revive" errand |
| 🚪 Mob Gates 3D | the Mob Control / Last War *ads* | 🦴 Bones | *(none: the ad, but real)* |
| 🧪 Potion Sort | water-sort puzzles | 🧪 Potions | *(none)* |
| 🚗 Car Park Jam | parking-jam puzzles | 🔑 Keys | *(none)* |
| 🎰 Goose Master | Coin Master | 💎 Gems (via goose village) | Out of spins → **only** wins elsewhere give spins |
| 🎲 Landlord GO! | Monopoly GO | 🔩💨🧱🟫💰⭐ from tiles; landmarks cost 🟫 + 💰 | Out of dice → **only** wins elsewhere give dice; ×3 multiplier cap; sticker duplicates trade in |
| 🏰 Clash of Kingdoms | Clash of Clans / 4X | Permanent boosts for other games | Build timers → hustle, bot "alliance help", errands |
| 🎁 Lucky Crate | gacha | random resources / a free upgrade level | Out of 💎 → errands |
| 👑 VIP Store | IAP shops | jokes priced in resources | — |
| ☕ Dev Coffee | — | nothing, on purpose | the one real-money link |

## The links

```mermaid
flowchart LR
  screw[🪛 Screw<br/>🔩] -->|🔩| grinder[⚙️ Grinder<br/>💨]
  grinder -->|💨| merge[👦 Merge Boy<br/>🧱]
  merge -->|🧱| slicer[🔪 Slicer<br/>🟫]
  king[🤴 King<br/>💰] -->|💰 recruits| army[🪖 Last Army<br/>🎖️]
  crowd[🏃 Crowd Run] -->|recruits| army
  mob[🚪 Mob Gates<br/>🦴]
  sort[🧪 Potion Sort<br/>🧪]
  park[🚗 Car Park<br/>🔑]
  upgrades{{every game's upgrades<br/>paid in OTHER games' currencies}}
  screw & grinder & merge & slicer & king & army & mob & sort & park -.-> upgrades
  match3[🍬 Match Royale<br/>⭐] -.-> upgrades
  slicer & match3 & army -->|🟫 ⭐ 🎖️| base[🏰 Clash of Kingdoms]
  base -.->|+% payouts, faster bots| upgrades
  slicer & match3 & army -->|materials| king
  wins((any win)) -.->|spins| spin[🎰 Goose Master<br/>💎]
  wins -.->|dice| board[🎲 Landlord GO!]
```

1. **Production chain (inputs).** 🔩 → 💨 → 🧱 → 🟫 down the line. Last Army recruits cost
   🔩 + 💰.
2. **Bots you can watch.** Each production game can hire a bot after you've mastered it by hand.
   - **It really plays.** It makes real moves on the board you see, starting slow (Screwbot: one
     screw every 15 s).
   - **It keeps going offline.** While the app is closed it plays headlessly, by the same rules.
   - **It has limits.** It never uses lives, energy or dice it didn't earn.
   - **It never runs your errands.**
3. **Upgrade trees, paid in other games' currencies.** Every game has its bot's hire and speed
   upgrades plus game-specific ones that change the game itself, for your hands too.
   - **Screw Loose:** more plates per board (a bigger clear bonus), golden ×3 plates, ✨ bonus
     boards.
   - **Mob Gates:** stronger gates, bigger shots, smarter aim.
   - **Potion Sort:** more colours (more potions), a smarter Pour Bot.
   - **Car Park:** bigger lots, parking sensors.

   Each upgrade line costs 2–3 *other* currencies, so wanting a faster Screwbot sends you to
   Grind the Thing, Merge Boy and the potion vials.
4. **The main goal.** Rescue the King's 9 stages cost materials from across the phone. Late
   stages need ⭐ and 🎖️ too.
5. **Clash of Kingdoms boosts.** Buildings turn currencies into permanent +% payouts:
   - Workshop → 🪛⚙️
   - Lab → 👦🔪
   - Treasury → 🤴🍬🎲
   - Barracks → 🪖🚪🏃
   - Apothecary → 🧪🚗
   - Candy Factory → +❤️/⚡ caps
   - Bot Garage → every bot moves sooner
6. **Errands (the paywall replacement).** `js/errands.js`:
   - A paywall screen shows a crossed-out real-world price and 2–4 errands in other games.
   - Accepting one jumps you to that game.
   - Errand progress shows on the home screen and inside the target game.
   - When it's done, the reward lands back where you came from: a paused Match Royale level gets
     its +5 moves, a building finishes, energy refills.
7. **Cross-game "any action" hooks.**
   - Every hand-played action anywhere knocks 10 s off construction ("hustle").
   - Every win anywhere gives Goose Master spins and Landlord GO! dice.

## Proposed next

Based on the research ([RESEARCH.md](RESEARCH.md)), roughly in order of value:

| Next game | Parody of | How it would link |
| --- | --- | --- |
| **Capsule Hero** | Raid / Genshin gacha | Summon tokens from Goose Master and King stages; odds + pity counter printed on the button; heroes give % boosts to Last Army. |
| **Keep Warm** | Whiteout Survival's furnace | A sink for 💨 Dust (as coal); telegraphed blizzards; "survivors" speed up bots. Gives the grinder late-game purpose. |
| **Supply Run** + honest shop | State of Survival | Minesweeper-lite producing 🔩/💰; the shop shows "WAS $997.40" and tapping it reveals an honest price history. |
| **Survivor-lite** | Survivor.io | 3-minute arena run with no energy; when you hit a wall it names which game to play for the upgrade. |
| **Merge Boy energy** | Merge Mansion | Give Merge Boy a (fast) energy bar refilled by errands, the most famous paywall moment we don't parody yet. |

Smaller ideas from the research:

- A **resource web screen** that shows every resource's source and sinks (pattern #8: layered
  currencies).
- A **gacha pity counter** on Lucky Crate.
- A **goose celebrity endorsement** ad.

## Decisions for you

1. **Do lives stay?** The research suggests removing lives from match-3 entirely. I kept them
   because "out of lives" is the most recognisable paywall, and it's the best demo of errands.
   They're fast (10 min), and losing keeps your matches.
2. **The fake ads.** They interrupt opening an app (35%, at most every 75 s). That's the joke, but
   it's also an interruption. Options:
   - keep them as is,
   - make them opt-in only (the 2× boost button), or
   - add a setting.
3. **How many games?** There are now 17 icons. New players may want a slower unlock order, or a
   "folder" for side games (Crate, Goose Master, Crowd Run).
4. **Names.** "Clash of Kingdoms", "Last Army", "Match Royale" and "Goose Master" are meant as
   parody. If this ships publicly, a quick trademark/parody check would be worth it.
5. **Coffee link.** Set `MB.COFFEE_URL` when you have one. Until then the button says "coming
   soon".
6. **Balance.** None of the numbers have had a full-playthrough pass. `node tools/sim-economy.js
   [speed] [hours]` runs every bot headlessly, with the real game code. Findings so far:
   - **Nothing deadlocks.**
   - **🧱 Slabs are the scarce currency:** Merge Bot needs ~15 moves per slab.
   - **The Knight was dominant at first.** He now keeps half of each run ("he has a horse to
     feed").
   - **Mob Gates' off-screen estimate is easier than watching it live,** so a bot can sit on a
     wave while you watch and then clear it once the app is closed.

## Known gaps (as of this pass)

- **Not balanced end to end:** unlock costs, upgrade prices and building prices are first guesses.
- **Thin flows:** Match Royale has no special tiles beyond the 🚀 row-clear (no bombs or
  colour-clears yet).
- **Old saves** carry over, but nothing migrates them. Use ⟲ to reset if something looks off.
