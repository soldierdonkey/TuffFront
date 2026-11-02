# OpenFront userscripts

A userscript for openfront.io that reads the game state already in the page and shows planning help: an attack planner for the tribe phase, incoming nuke and boat warnings, threat-coloured borders and a tidier notification feed. It makes no network requests, sends no game commands and never clicks for you.

> **Terms of Service:** using this script violates section 6.5 of the OpenFront Terms of Service, which bans third-party software that gives an unfair advantage or alters the game's behaviour. Don't use it in competitive contexts. An account could be penalised for using it.

**Contents:** [Installation](#installation) · [Feature guide](#feature-guide) · [Settings](#settings) · [Troubleshooting](#troubleshooting) · [Development](#development)

## Installation

Installing takes two steps: add a userscript manager to your browser, then add the script to it.

### 1. Get the script

**[Click here to install](https://raw.githubusercontent.com/soldierdonkey/TuffFront/main/dist/openfront-demo.user.js)** once you have a manager from step 2. Tampermonkey and Violentmonkey open an install page for the link. In Userscripts for Safari, open the link and then the extension's popup to see the install prompt.

If the link doesn't offer an install, use the steps in step 3 with the file itself, [`dist/openfront-demo.user.js`](dist/openfront-demo.user.js). It is already built, so you only need Node.js if you change the source. Download the repository or copy that file to your computer.

### 2. Pick a manager

| Browser | Recommended | Also works |
| --- | --- | --- |
| Chrome, Brave, Opera, Vivaldi | Tampermonkey | |
| Edge | Tampermonkey | Violentmonkey |
| Firefox | Violentmonkey | Tampermonkey |
| Safari on Mac | Userscripts (free) | Tampermonkey (paid) |
| Safari on iPhone or iPad | Userscripts | |
| Firefox for Android | Violentmonkey | Tampermonkey |

Avoid **Greasemonkey**. The script has to read the game's objects from the page, and Greasemonkey 4 runs scripts in a sandbox that is likely to block this. **Violentmonkey is no longer supported on Chrome**, because it hasn't moved to Manifest V3.

On phones and tablets, the risky-move confirmation doesn't apply to touch input, and the sleeper cell view needs a Space key.

### 3. Add the script

#### Tampermonkey (Chrome, Edge, Brave, Opera, Vivaldi, Firefox)

1. Install Tampermonkey from [its website](https://www.tampermonkey.net/), which links to the store for your browser.
2. **Chromium browsers only:** allow it to run userscripts. Right-click the Tampermonkey icon, choose **Manage Extension**, then turn on **Allow User Scripts**. If you don't see that toggle (Chrome before version 138), turn on **Developer mode** on the extensions page instead. Restart the browser if scripts still don't run.
3. Open the Tampermonkey **Dashboard**, then the **Utilities** tab, and use **Import from file** to choose `openfront-demo.user.js`.
4. Confirm the install, then reload openfront.io.

To install without importing, click the **+** tab in the Dashboard, replace the template with the full contents of the file, and save with Ctrl+S or Cmd+S.

#### Violentmonkey (Firefox, Edge)

1. Install it from [its website](https://violentmonkey.github.io/get-it/).
2. Open the Violentmonkey **Dashboard**, click **+**, then **New**.
3. Replace the template with the full contents of `openfront-demo.user.js` and save.
4. Reload openfront.io.

#### Userscripts (Safari on Mac)

1. Install [Userscripts](https://github.com/quoid/userscripts) from the Mac App Store and open the app once.
2. In Safari, go to **Settings > Extensions**, turn on Userscripts, and allow it on openfront.io.
3. Add the script in either of these ways:
   - Run `npm run install-script`. It builds the script, finds your Userscripts folder and asks before copying. If it can't find the folder, it asks for the path, or you can pass it with `npm run install-script -- /path/to/folder`.
   - Copy `openfront-demo.user.js` into the folder shown in the Userscripts app settings.
4. Reload openfront.io.

#### Userscripts (Safari on iPhone or iPad)

1. Install [Userscripts](https://github.com/quoid/userscripts) from the App Store and open the app once.
2. Go to **Settings > Safari > Extensions**, turn on Userscripts, and choose **Always Allow** for openfront.io or all websites.
3. Save `openfront-demo.user.js` into the Userscripts folder using the Files app.
4. Reload openfront.io.

### 4. Check that it works

Open [openfront.io](https://openfront.io). A button in the bottom-right corner should say **Script loaded**, and change to **Game detected** when a game starts. If it doesn't appear, see [Troubleshooting](#troubleshooting).

### Updating and removing

- **Update:** get the new file and repeat the install step, replacing the old copy. Your settings are kept.
- **Remove:** delete the script in your manager, or delete the file from the Userscripts folder. To clear its settings too, run `localStorage.removeItem('of-demo-userscript-config')` in the browser console on openfront.io.

## Feature guide

Everything is on by default. Press **`-`** at any time to turn the whole script on or off.

| Control | Action |
| --- | --- |
| `-` | Turn the script on or off |
| Hold Space | Show sleeper cells |
| Right-click the status button | Choose a different on/off key (Esc cancels) |
| Alt+click the status button | Set the alliance popup timer |
| Esc | Cancel a risky-move confirmation |

### Tribe guide

This plans the early expansion to take as much land as possible. A tribe is annexed for free once your land completely surrounds it, so the guide shows which tribes to attack and which to leave alone. A label appears under each tribe's troop count:

| Label | Meaning | What to do |
| --- | --- | --- |
| `ANNEX · 1 click` | Already walled in by you | Attack it to take it |
| `LEAVE · annexed after N more` | Borders you, and will be enclosed after N more steps | Don't attack it |
| `ANNEX LATER · N left` | Behind your front, and will be enclosed later | Ignore it for now |
| `#1 · 2 clicks` | Your planned attack order | Attack in number order |
| `BOAT IN · N tiles` | Enclosed, except for N ocean-shore tiles | Land a boat on the magenta tiles |
| `ENTRANCE · N tiles` | Same, but an entrance tile already touches your land | Take the magenta tiles |
| `… · last step` | Taking the entrance finishes this pocket | Land on or take the magenta tiles |
| `WEAK` / `BUSY` / `COSTLY` / `SKIP` | Not part of the plan; shows how expensive it is | Your call |

- **★** and a **green outline** mark the best target. **Magenta** tiles on the map are entrances.
- **Cost tiers:** `WEAK` takes up to 3 clicks. `BUSY` is a tribe fighting someone else, up to 5 clicks. `COSTLY` takes more than that, and `SKIP` would take more than 8. `COSTLY` and `SKIP` show a percentage of your troops instead of clicks.
- **Clicks** are the number needed to send enough troops to take the whole tribe. The estimate uses the tribe's troops and size and its terrain (mountains cost more than highland, highland more than plains or desert), and it counts troops you've already sent at that tribe. It updates as you move the attack slider. It's an estimate: defence posts and fallout aren't included.

The planner hasn't been confirmed in real play for annexing walled-in tribes, annexing a pocket by landing on its entrance, or whether a boat can reach a given inlet. Treat those labels as advice.

### Warning panel

A panel at the top of the screen lists threats with an estimated arrival time, marked `~`:

- **Incoming nukes:** atom bombs, hydrogen bombs, MIRVs and MIRV warheads aimed at your land.
- **Boats landing on you:** enemy boats, plus allied boats, since an ally may be trying to take a port.
- **New MIRV access:** another player now has a finished missile silo and enough gold for a MIRV. It shows once per player, for 20 seconds.
- **First hydrogen bomb:** the first other player who can launch one. It shows once, for 20 seconds.

### Risky-move confirmation

This stops a click from leaving you too exposed. A left click on the map is held back if the attack would leave you below a safe share of your highest troop count from the last 30 seconds, so a run of small clicks adds up. The safe share depends on who borders you:

| Largest non-allied neighbour | Keep at least |
| --- | --- |
| 2x your land or more | 40% |
| 1.5x your land or more | 30% |
| Any other player | 25% |
| No player neighbours | 20% |

To go ahead with a held-back attack, within 4 seconds per step:

1. Your first click is blocked, and a **CONFIRM** box appears just above the cursor.
2. Click the box to arm the attack.
3. Click the same target again. This click goes through to the game.

Esc cancels at any step. The check only covers plain left clicks on the map. It doesn't cover keybinds, the radial menu, touch input, or the game's "left click opens menu" setting.

### Player borders

Where your land meets a human or nation, the border is recoloured: **yellow** for allies, **green** for teammates and **red** for everyone else. The stronger the red, the bigger the threat, based on their troops, land, gold and finished silos compared with yours. Tribes and borders that don't involve you are left alone.

### Sleeper cells

Hold **Space** to find small hidden landings. A sleeper cell is a patch of fewer than 5 tiles, on the coast, at least 5 tiles from its owner's mainland. Cells glow **red** for enemies, **orange** for teammates and **green** for your own, and they disappear when you release the key.

### Notification feed and alliance popups

- The game's feed moves under the warning panel, and long player names are shortened while keeping the `[CLAN]` tag.
- Messages that a warning already covers are hidden from the feed, so nuke alerts appear only once.
- Click a minor feed row to hide it. Major rows keep the game's own click, which jumps to the player or unit.
- Click an alliance popup to hide it, away from its buttons. Popups also hide after 4 seconds by default, and Accept, Reject and Focus work as usual. Hiding a popup doesn't answer it.

### Spawn beep

A short beep plays once a second during the spawn phase, so you can tell it's still running when you're in another tab. Browsers may block the sound until you've clicked on the page.

## Settings

The status button handles the on/off key and popup timer. For anything else, open the browser console on openfront.io and run this, changing the `riskyMoves` line to the setting you want:

```js
const key = 'of-demo-userscript-config';
const saved = JSON.parse(localStorage.getItem(key) || '{}');
saved.riskyMoves = false;
localStorage.setItem(key, JSON.stringify(saved));
location.reload();
```

| Setting | Default | What it does |
| --- | --- | --- |
| `toggleKey` | `"-"` | Key that turns the script on or off |
| `enabled` | `true` | Whether the script is on |
| `popupSeconds` | `4` | Hide alliance popups after this many seconds; `0` uses the game's timing |
| `riskyMoves` | `true` | Risky-move confirmation |
| `spawnBeep` | `true` | Spawn phase beep |
| `sleeperCells` | `true` | Sleeper cell view |
| `sleeperMaxTiles` | `5` | A cell has fewer tiles than this |
| `sleeperMinDistance` | `5` | Minimum distance in tiles from the owner's mainland |
| `warnings` | `{}` | Turn off warnings individually, for example `{ nukes: false, landings: false, mirvAccess: false, hydrogenFirst: false }` |

## Troubleshooting

The install steps come from each manager's documentation. The script itself has only been tested by injecting it into Chrome against a local dev server, not through these managers, and the live site may run a different build.

- **No status button:** check that the script is enabled in your manager and allowed on openfront.io, then reload. On Chromium browsers, check **Allow User Scripts** or **Developer mode**. The console should log `[OpenFront Demo] Userscript loaded successfully`.
- **Button says "Script disabled":** press `-`, or your rebound key.
- **Button works but there are no labels, warnings or borders in a game:** the game objects take a few seconds to appear after the game starts. If nothing ever shows, the manager may be running the script in a sandbox, so switch to a recommended manager. In Violentmonkey or Userscripts, you can add `// @inject-into page` to the script header. The live build may also have changed.
- **Clicks on the map seem ignored:** that's probably the risky-move confirmation. Follow its prompt, press Esc, or set `riskyMoves` to `false`.
- **Tampermonkey doesn't run on Vivaldi or another Chromium browser:** restart the browser after changing the permissions.

## Development

The userscript manager loads a single file, so the code is split into modules here and bundled by `build.js` into `dist/openfront-demo.user.js`. See `CLAUDE.md` for the compliance rules and testing notes.

```
npm run build            # writes dist/openfront-demo.user.js
npm run install-script   # builds, then copies it into your Safari Userscripts folder
npm run install-all      # same, for every *.user.js in dist/
```

Edit the files in `src/`, `config/` and `styles/`, never `dist/`. The CSS ids in `styles/` (for example `#of-demo-warnings`) must match the ids in the matching JS files.

### Structure

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
  risky.css                   Risky-move notice and CONFIRM box
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
    borders.js                Recolours your borders with humans and nations
    spawn-beep.js             Beeps during the spawn phase
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

### Adding a feature

1. Add a file under `src/features/`.
2. List it in `SOURCES` in `build.js`. All files share one scope, so avoid reusing top-level names.
3. Put tunables in `config/*.json` (register new files in `CONFIG_FILES`) and CSS in `styles/*.css` (register in `STYLE_FILES`). They reach the code as `JSON_CONFIG.<key>` and `STYLES.<key>`.
4. Start it from `src/main.js`.

### Warning catalog

`config/warnings.json` lists every warning: `custom` (ours, shown in the panel) and `native` (the game's own messages, each marked `major`, `minor` or `popup`). Major rows keep the game's click (jumps to the player or unit), minor rows hide when clicked. A native entry with `pattern` and `replacedBy` is hidden while that custom system is on.
