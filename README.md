# OpenFront userscripts

A userscript for openfront.io that reads the game state already in the page and shows planning help. It is read-only and sends nothing. See `CLAUDE.md` for the compliance rules and testing notes.

The userscript manager loads a single file, so the code is split into modules here and bundled by `build.js` into `dist/openfront-demo.user.js`.

## Structure

```
config/                     Settings as JSON (inlined into the build)
  userscript.json             Userscript header: name, version, @match, ...
  defaults.json               Per-user defaults: toggle key, enabled, warnings, popup timer
  tribe-guide.json            Tribe guide tunables: click limits, tier/role colors, name-plate geometry
  warnings.json               Warning panel tunables: refresh rate, rows shown, severity colors
  risky-moves.json            Risky-move confirmation: reserve % per neighbour size, confirm window
  sleeper-cells.json          Sleeper cell detector: colors, glow
styles/                     All CSS (inlined into the build)
  base.css                    Shared variables (panel width)
  indicator.css               Bottom-right status button
  overlay.css                 Click-through canvas for the tribe guide
  warnings.css                Warning panel
  feed.css                    Restyled notification feed and alliance popups
src/
  core/                     Shared helpers
    config.js                 Loads defaults + saved localStorage config
    styles.js                 injectStyle / removeStyle
    game.js                   isInGame, getGame (GameView), getCamera
    text.js                   Clan-tag aware name shortening, text measuring
  features/                 One folder or file per feature
    indicator.js              Status button ("Script loaded" / "Game detected")
    toggle-key.js             Keyboard toggle and key rebinding
    tribe-guide/              Bot-phase attack planner
      constants.js              Reads config/tribe-guide.json
      cost.js                   Clicks needed and cost tiers
      scan.js                   Reads tribes and their surroundings from the game
      plan.js                   Pure annexation planner (no DOM)
      overlay.js                Map outlines, chips under troop counts, render loop
      index.js                  Refresh loop and state
    warnings/                 Incoming nuke / boat landing warnings
      constants.js              Reads config/warnings.json
      units.js                  Unit helpers
      nukes.js, landings.js     One file per warning system
      milestones.js             New MIRV access / first hydrogen bomb announcements
      index.js                  Registry of systems
      panel.js                  The warning panel
    risky-moves.js            Asks for 3 clicks (attempt, confirm box above the cursor, then the real click) when an attack would leave too few troops
    sleeper-cells.js          Finds tiny cut-off patches of land, glows them red (others) / green (yours)
    feed-layout.js            Moves the game's feed under the panel
    feed-shortening.js        Shortens long player names in feed rows
    feed-filter.js            Hides the game's rows that a custom warning replaces, and minor rows on click
    alliance-popups.js        Click or time out alliance popups
    hud-refresh.js            Runs warnings, feed and popups every 250 ms
  main.js                   Starts timers and observers
build.js                    Bundles everything into dist/
install.js                  Builds and copies dist/ into the Userscripts folder
dist/openfront-demo.user.js Generated file to install (do not edit)
```

## Features

- **Indicator**: a button shows "Script loaded" on the menu and "Game detected" in a game. Right-click it to rebind the toggle key, Alt+click to set the alliance popup timer.
- **Toggle key** (default `-`): turns the whole script on or off.
- **Tribe guide**: plans which tribes to attack and which enclosed ones to leave so they are annexed for free. Draws chips under each name plate, outlines the best target and marks boat entrances.
- **Sleeper cells** (hold Space to scan and show): tiny patches (fewer than 5 tiles, `config.sleeperMaxTiles`) of land at least 5 tiles (`config.sleeperMinDistance`) from their owner's mainland and touching the ocean glow red anywhere on the map, yours glow green. Off with `config.sleeperCells = false`.
- **Warnings**: a panel for incoming nukes and boats landing on you. Each system can be disabled with `config.warnings = { nukes: false }`.
- **Feed and popups**: the game's notification feed sits under the panel, long names are shortened, and alliance popups can be dismissed by click or after N seconds.

## Adding a feature

1. Add a file under `src/features/`.
2. List it in `SOURCES` in `build.js`. All files share one scope, so avoid reusing top-level names.
3. Put tunables in `config/*.json` (register new files in `CONFIG_FILES`) and CSS in `styles/*.css` (register in `STYLE_FILES`). They reach the code as `JSON_CONFIG.<key>` and `STYLES.<key>`.
4. Start it from `src/main.js`.

## Build and install

```
npm run build            # writes dist/openfront-demo.user.js
npm run install-script   # builds, then copies it into your Userscripts folder
```

Edit the files in `src/`, `config/` and `styles/`, never `dist/`. The CSS ids in `styles/` (for example `#of-demo-warnings`) must match the ids in the matching JS files.

## Warning catalog

`config/warnings.json` lists every warning: `custom` (ours, shown in the panel) and `native` (the game's own messages, each marked `major`, `minor` or `popup`). Major rows keep the game's click (jumps to the player or unit), minor rows hide when clicked. A native entry with `pattern` and `replacedBy` is hidden while that custom system is on.
