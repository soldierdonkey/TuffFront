// ==UserScript==
// @name         OpenFront Demo Script
// @namespace    https://openfront.io/
// @version      0.9.0
// @description  Demo userscript that logs to the console and shows a "script loaded" button ("game detected" while in a game) on openfront.io, and plans bot-phase attacks to maximise annexations: chips under each tribe's troop count (ANNEX / LEAVE / #order / BOAT IN / cost tiers), the best target outlined in green and small ocean entrances in magenta; press - to disable/enable (key configurable via right-click)
// @match        https://openfront.io/*
// @match        https://*.openfront.io/*
// @run-at       document-end
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  // Inlined by build.js from config/*.json and styles/*.css.

  const JSON_CONFIG = {
    "defaults": {
      "toggleKey": "-",
      "enabled": true,
      "warnings": {},
      "popupSeconds": 4,
      "riskyMoves": true,
      "spawnBeep": true,
      "sleeperCells": true,
      "sleeperMaxTiles": 5,
      "sleeperMinDistance": 5
    },
    "tribeGuide": {
      "refreshMs": 70,
      "ring2CacheMs": 3000,
      "troopMargin": 2,
      "maxClicks": 8,
      "weakClicks": 3,
      "busyClicks": 5,
      "maxEntrance": 6,
      "keepBonus": 1.1,
      "exactLimit": 16,
      "budgetPercent": 90,
      "tiers": {
        "weak": {
          "tag": "WEAK",
          "color": "#16a34a"
        },
        "busy": {
          "tag": "BUSY",
          "color": "#16a34a"
        },
        "costly": {
          "tag": "COSTLY",
          "color": "#d97706"
        },
        "skip": {
          "tag": "SKIP",
          "color": "#6b7280"
        }
      },
      "roleColors": {
        "walled": "#0ea5e9",
        "leave": "#2563eb",
        "later": "#64748b",
        "boat": "#c026d3",
        "target": "#16a34a"
      },
      "entranceColor": "#e040fb",
      "targetOutlineColor": "#22ff55",
      "borders": {
        "allyColor": "#ffd60a",
        "threatColor": "255,40,40",
        "minAlpha": 0.25,
        "weights": {
          "troops": 0.4,
          "tiles": 0.25,
          "gold": 0.2,
          "silos": 0.15
        }
      },
      "nameplate": {
        "fontBase": 36,
        "fontSize": 48,
        "scaleFactor": 0.4,
        "scaleCap": 3,
        "troopSize": 0.6,
        "cullThreshold": 0.008
      }
    },
    "warnings": {
      "refreshMs": 50,
      "maxShown": 4,
      "gap": 8,
      "severity": {
        "critical": {
          "rank": 0,
          "bg": "rgba(153, 27, 27, 0.62)",
          "edge": "rgba(248, 113, 113, 0.9)"
        },
        "warning": {
          "rank": 1,
          "bg": "rgba(146, 64, 14, 0.58)",
          "edge": "rgba(251, 191, 36, 0.9)"
        },
        "info": {
          "rank": 2,
          "bg": "rgba(30, 58, 95, 0.58)",
          "edge": "rgba(96, 165, 250, 0.9)"
        }
      },
      "custom": [
        {
          "id": "nukes",
          "label": "Incoming nukes",
          "severity": {
            "mirv": "critical",
            "warheads": "critical",
            "bomb": "warning"
          },
          "where": "warning panel",
          "notes": "Only nukes aimed at your land. Turn off with config.warnings = { nukes: false }."
        },
        {
          "id": "landings",
          "label": "Boats landing on you",
          "severity": {
            "enemy": "warning",
            "allied": "info"
          },
          "where": "warning panel",
          "notes": "Allied boats are the port-sniping case. Turn off with config.warnings = { landings: false }."
        },
        {
          "id": "mirvAccess",
          "label": "New MIRV access",
          "severity": {
            "new": "critical"
          },
          "where": "warning panel",
          "notes": "A player other than you has a finished missile silo and enough gold for a MIRV. Shown once per player for milestoneSeconds. Turn off with config.warnings = { mirvAccess: false }."
        },
        {
          "id": "hydrogenFirst",
          "label": "First hydrogen bomb",
          "severity": {
            "first": "warning"
          },
          "where": "warning panel",
          "notes": "The first player in the game (not you) with a finished silo and gold for a hydrogen bomb. Shown once, for milestoneSeconds. Turn off with config.warnings = { hydrogenFirst: false }."
        }
      ],
      "native": [
        {
          "id": "MIRV_INBOUND",
          "label": "MIRV inbound",
          "tier": "major",
          "pattern": "MIRV INBOUND",
          "replacedBy": "nukes"
        },
        {
          "id": "NUKE_INBOUND",
          "label": "Atom bomb inbound",
          "tier": "minor",
          "pattern": "- atom bomb inbound\\s*$",
          "replacedBy": "nukes"
        },
        {
          "id": "HYDROGEN_BOMB_INBOUND",
          "label": "Hydrogen bomb inbound",
          "tier": "major",
          "pattern": "- hydrogen bomb inbound\\s*$",
          "replacedBy": "nukes"
        },
        {
          "id": "NUKE_DETONATED",
          "label": "Nuke detonated",
          "tier": "minor"
        },
        {
          "id": "NAVAL_INVASION_INBOUND",
          "label": "Naval invasion incoming",
          "tier": "minor",
          "pattern": "^Naval invasion incoming",
          "replacedBy": null,
          "notes": "Duplicates the landings warning. Set replacedBy to \"landings\" to hide the game's row while that system is on."
        },
        {
          "id": "ATTACK_REQUEST",
          "label": "Attack request",
          "tier": "major"
        },
        {
          "id": "ALLIANCE_ACCEPTED",
          "label": "Alliance accepted",
          "tier": "minor"
        },
        {
          "id": "ALLIANCE_REJECTED",
          "label": "Alliance rejected",
          "tier": "minor"
        },
        {
          "id": "ALLIANCE_BROKEN",
          "label": "Alliance broken",
          "tier": "critical"
        },
        {
          "id": "RENEW_ALLIANCE",
          "label": "Alliance about to expire (popup)",
          "tier": "major"
        },
        {
          "id": "CONQUERED_PLAYER",
          "label": "Player conquered",
          "tier": "minor"
        },
        {
          "id": "CHAT",
          "label": "Chat message",
          "tier": "major"
        },
        {
          "id": "DONATION_RECEIVED",
          "label": "Donation received",
          "tier": "major"
        },
        {
          "id": "ALLIANCE_REQUEST",
          "label": "Alliance request (popup)",
          "tier": "popup",
          "notes": "Click hides it, see config popupSeconds."
        },
        {
          "id": "ATTACK_FAILED",
          "label": "Attack failed",
          "tier": "minor"
        },
        {
          "id": "ATTACK_CANCELLED",
          "label": "Attack cancelled",
          "tier": "minor"
        },
        {
          "id": "SAM_MISS",
          "label": "SAM missed",
          "tier": "minor"
        },
        {
          "id": "SAM_HIT",
          "label": "SAM hit",
          "tier": "minor"
        },
        {
          "id": "CAPTURED_ENEMY_UNIT",
          "label": "Captured enemy unit",
          "tier": "minor"
        },
        {
          "id": "UNIT_DESTROYED",
          "label": "Unit destroyed",
          "tier": "minor"
        },
        {
          "id": "ALLIANCE_EXPIRED",
          "label": "Alliance expired",
          "tier": "minor"
        },
        {
          "id": "DONATION_SENT",
          "label": "Donation sent",
          "tier": "minor"
        }
      ],
      "_comment": "custom: our warning systems (keys of config.warnings). Each severity entry picks a level from the top-level severity object (critical, warning, info) for one case of that system. native: the game's own messages. tier is where the game files them: major rows (bordered in red) keep the game's own click, which jumps to the player or unit; minor rows are hidden when clicked. pattern + replacedBy are used: a native row whose text matches pattern is hidden while the custom system named replacedBy is on. milestoneSeconds: how long mirvAccess / hydrogenFirst stay in the panel. costs: gold needed for access (a MIRV costs mirvStep more per MIRV launched). eta: arrival time estimates shown instead of tile distances. Nukes fly an arc (arc length ~ nukeArcFactor x straight distance) at nukeSpeed per tick; boats move boatTilesPerTick along a water route (~ boatRouteFactor x straight distance). Estimates, shown with a ~.",
      "milestoneSeconds": 20,
      "costs": {
        "hydrogen": 5000000,
        "mirvBase": 25000000,
        "mirvStep": 15000000
      },
      "eta": {
        "ticksPerSecond": 10,
        "nukeSpeed": {
          "Atom Bomb": 10,
          "Hydrogen Bomb": 10,
          "MIRV": 15,
          "MIRV Warhead": 22
        },
        "nukeArcFactor": 1.25,
        "boatTilesPerTick": 1,
        "boatRouteFactor": 1.2
      }
    },
    "sleeperCells": {
      "maxTiles": 5,
      "minDistance": 5,
      "maxDrawn": 400,
      "enemyColor": "#ff1f1f",
      "ownColor": "#22ff66",
      "teamColor": "#ff8c1a",
      "glowPx": 16,
      "minMarkPx": 7,
      "_comment": "Only scans while Space is held. A sleeper cell is a connected patch of one player's land with fewer than maxTiles tiles at least minDistance tiles (square distance) from that player's biggest patch (mainland) and touch the ocean (inland specks, e.g. nuke craters, are ignored). enemyColor = other players' cells (anywhere on the map), ownColor = yours. Change the size with config.sleeperMaxTiles, the distance with config.sleeperMinDistance, switch off with config.sleeperCells = false."
    },
    "riskyMoves": {
      "confirmSeconds": 4,
      "dragPx": 10,
      "refreshMs": 1000,
      "button": {
        "width": 110,
        "height": 34,
        "offset": 18
      },
      "peakSeconds": 30,
      "bigRatio": 2,
      "largerRatio": 1.5,
      "minLeftPercent": {
        "big": 40,
        "larger": 30,
        "similar": 25,
        "none": 20
      }
    }
  };

  const STYLES = {
    "base": ":root {\n  --of-panel-width: min(34rem, 92vw);\n}\n",
    "indicator": "#of-demo-userscript-indicator {\n  position: fixed;\n  right: 24px;\n  bottom: 24px;\n  z-index: 2147483647;\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  padding: 10px 22px;\n  border: 1px solid rgba(255, 255, 255, 0.15);\n  border-radius: 8px;\n  background: #2b1745;\n  color: #f4a24c;\n  font: 600 14px/1 inherit;\n  letter-spacing: 0.08em;\n  text-transform: uppercase;\n  cursor: pointer;\n  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);\n}\n#of-demo-userscript-indicator:hover { background: #3a1f5c; }\n#of-demo-userscript-indicator.disabled { color: #9a9a9a; background: #2a2a2a; }\n#of-demo-userscript-indicator.disabled .dot { background: #888; box-shadow: none; }\n#of-demo-userscript-indicator .dot {\n  width: 10px;\n  height: 10px;\n  border-radius: 50%;\n  background: #4ade80;\n  box-shadow: 0 0 6px #4ade80;\n}\n",
    "overlay": "#of-demo-tribe-highlight {\n  position: fixed;\n  inset: 0;\n  width: 100vw;\n  height: 100vh;\n  pointer-events: none;\n  z-index: 1;\n}\n",
    "warnings": "#of-demo-warnings {\n  position: fixed; left: 50%; top: 15%; transform: translateX(-50%);\n  width: var(--of-panel-width); z-index: 800; pointer-events: none;\n  display: flex; flex-direction: column; gap: 4px;\n  font: 600 14px/1.3 inherit; color: #fff;\n}\n#of-demo-warnings .row {\n  display: flex; align-items: center; gap: 8px; padding: 6px 12px;\n  border-radius: 8px; border-left: 4px solid; white-space: nowrap;\n  backdrop-filter: blur(4px); box-shadow: 0 2px 10px rgba(0, 0, 0, 0.35);\n}\n#of-demo-warnings .msg { flex: 1; min-width: 0; overflow: hidden; }\n#of-demo-warnings .detail { opacity: 0.8; font-weight: 500; }\n#of-demo-warnings .more { text-align: center; font-size: 12px; opacity: 0.75; }\n",
    "feed": "actionable-events {\n  position: fixed !important; left: 50%; top: var(--of-popup-top, 15%);\n  transform: translateX(-50%); width: var(--of-panel-width) !important; z-index: 800;\n}\nactionable-events > div { width: 100% !important; margin-top: 0 !important; }\nactionable-events > div > div {\n  background: rgba(17, 24, 39, 0.55) !important;\n  backdrop-filter: blur(4px); cursor: pointer;\n}\nactionable-events > div > div > button:first-child {\n  display: block; width: 100%; overflow: hidden; white-space: nowrap; text-align: left;\n}\nactionable-events .of-dismissed { display: none !important; }\nevents-display {\n  position: fixed !important; left: 50%; top: var(--of-feed-top, 15%);\n  transform: translateX(-50%); width: var(--of-panel-width) !important; z-index: 800;\n}\nevents-display > div { width: 100% !important; }\nevents-display .events-container,\nevents-display .important-events-container {\n  background: rgba(17, 24, 39, 0.55) !important;\n  backdrop-filter: blur(4px);\n}\nevents-display table { table-layout: fixed; width: 100%; }\nevents-display td { overflow: hidden; white-space: nowrap; }\nevents-display td > button { display: block; width: 100%; text-align: left; white-space: nowrap; }\nevents-display .of-dup-hidden { display: none !important; }\n",
    "risky": "#of-demo-risk {\n  position: fixed; left: 0; right: 0; margin: 0 auto; width: fit-content; bottom: 22%;\n  z-index: 800; pointer-events: none; max-width: 90vw;\n  padding: 10px 16px; border-radius: 8px; border-left: 4px solid #dc2626;\n  background: rgba(30, 10, 10, 0.88); color: #fff; backdrop-filter: blur(4px);\n  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.45);\n  font: 600 14px/1.35 inherit; text-align: center;\n}\n#of-demo-risk .detail { display: block; opacity: 0.8; font-weight: 500; }\n#of-demo-risk-btn {\n  position: fixed; z-index: 801; pointer-events: none; display: flex; align-items: center; justify-content: center;\n  box-sizing: border-box; border-radius: 6px; background: #dc2626; color: #fff;\n  border: 2px solid #fff; letter-spacing: 0.08em; font: 700 13px/1 inherit;\n  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);\n}\n"
  };

  // ---- src/core/config.js
  const STORE_KEY = 'of-demo-userscript-config';
  // Defaults live in config/defaults.json. Persisted in localStorage so they survive reloads.
  // See that file for what each key does (right-click the indicator to rebind toggleKey,
  // Alt+click it to change popupSeconds).
  const config = Object.assign(structuredClone(JSON_CONFIG.defaults), loadConfig());

  function loadConfig() {
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  function saveConfig() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(config));
    } catch (e) {
      /* storage unavailable; keep the in-memory value */
    }
  }

  // ---- src/core/styles.js
  // Stylesheets come from styles/*.css (inlined by build.js into STYLES).
  function injectStyle(id, css) {
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = css;
    document.head.appendChild(style);
  }

  function removeStyle(id) {
    const style = document.getElementById(id);
    if (style) style.remove();
  }

  // ---- src/core/game.js
  // The client toggles `in-game` on <body> while a game is running (set in
  // Main.ts); the game UI elements and /game/<id> URL are fallbacks.
  function isInGame() {
    if (document.body.classList.contains('in-game')) return true;
    if (/\/game\/[^/]+/.test(location.pathname)) return true;
    const sidebar = document.querySelector('game-left-sidebar');
    return !!sidebar && sidebar.offsetWidth > 0 && sidebar.offsetHeight > 0;
  }

  function getGame() {
    const el = document.querySelector('game-left-sidebar');
    return (el && el.game) || null;
  }

  function getCamera() {
    const el = document.querySelector('build-menu');
    return (el && el.transformHandler) || null;
  }

  // ---- src/core/text.js
  // Splits "[CLAN] Name" into its tag (with trailing space) and the rest.
  function splitClan(displayName) {
    const m = /^(\[[^\]]*\]\s*)?([\s\S]*)$/.exec(displayName);
    return { tag: m[1] || '', rest: m[2] };
  }

  // Shortens a player's name so `prefix + name + suffix` fits `maxPx`, keeping
  // the [CLAN] tag and as many characters of the name as still fit.
  function fitName(measure, displayName, prefix, suffix, maxPx) {
    if (measure(prefix + displayName + suffix) <= maxPx) return displayName;
    const { tag, rest } = splitClan(displayName);
    let keep = rest.length;
    while (keep > 1) {
      keep--;
      const candidate = tag + rest.slice(0, keep).trimEnd() + '…';
      if (measure(prefix + candidate + suffix) <= maxPx) return candidate;
    }
    return tag + rest.slice(0, 1) + '…';
  }

  const measureCtx = document.createElement('canvas').getContext('2d');
  function measurer(font) {
    measureCtx.font = font;
    return (text) => measureCtx.measureText(text).width;
  }

  // ---- src/features/indicator.js
  const ID = 'of-demo-userscript-indicator';
  let rebinding = false;

  function addIndicator() {
    if (document.getElementById(ID)) return;

    const btn = document.createElement('button');
    btn.id = ID;
    btn.type = 'button';
    btn.title = 'OpenFront Demo userscript is running';
    btn.innerHTML = '<span class="dot"></span><span class="label"></span>';

    btn.addEventListener('click', (e) => {
      if (e.altKey) {
        const answer = window.prompt(
          'Hide alliance popups after how many seconds? (0 = game default)',
          String(config.popupSeconds)
        );
        const n = Number(answer);
        if (answer !== null && answer.trim() !== '' && Number.isFinite(n) && n >= 0) {
          config.popupSeconds = n;
          saveConfig();
          console.log('[OpenFront Demo] Popup timer set to ' + n + 's');
        }
        return;
      }
      console.log(
        '[OpenFront Demo] Userscript is ' + (config.enabled ? 'active.' : 'disabled.')
      );
    });

    btn.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      rebinding = true;
      render();
    });

    injectStyle(ID + '-style', STYLES.indicator);
    document.body.appendChild(btn);
    updateIndicator();
    render();
  }

  function keyName(key) {
    return key === ' ' ? 'Space' : key;
  }

  let lastState = null;
  function updateIndicator() {
    if (!config.enabled) return;
    const inGame = isInGame();
    if (inGame === lastState) return;
    lastState = inGame;
    console.log('[OpenFront Demo] ' + (inGame ? 'Game detected' : 'Not in a game'));
    render();
  }

  function render() {
    const btn = document.getElementById(ID);
    if (!btn) return;
    const key = keyName(config.toggleKey);
    let label, title;
    if (rebinding) {
      label = 'Press a new key';
      title = 'Press the key to use for toggling the script (Esc to cancel)';
    } else if (!config.enabled) {
      label = 'Script disabled';
      title = 'OpenFront Demo userscript is disabled. Press ' + key + ' to enable, right-click to change the key';
    } else {
      const inGame = isInGame();
      label = inGame ? 'Game detected' : 'Script loaded';
      title =
        'OpenFront Demo userscript: ' +
        (inGame ? 'game detected' : 'running') +
        '. Press ' + key + ' to disable, right-click to change the key, Alt+click to set the popup timer';
    }
    btn.classList.toggle('disabled', !config.enabled);
    btn.querySelector('.label').textContent = label;
    btn.title = title;
  }

  function setEnabled(enabled) {
    config.enabled = enabled;
    saveConfig();
    console.log('[OpenFront Demo] Userscript ' + (enabled ? 'enabled' : 'disabled'));
    lastState = null;
    if (enabled) updateIndicator();
    render();
  }

  // ---- src/features/toggle-key.js
  function isTyping(target) {
    return (
      !!target &&
      (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
    );
  }

  window.addEventListener(
    'keydown',
    (e) => {
      if (rebinding) {
        e.preventDefault();
        e.stopPropagation();
        if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return;
        rebinding = false;
        if (e.key !== 'Escape') {
          config.toggleKey = e.key;
          saveConfig();
          console.log('[OpenFront Demo] Toggle key set to "' + keyName(e.key) + '"');
        }
        render();
        return;
      }
      if (e.key !== config.toggleKey || e.repeat) return;
      if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return;
      setEnabled(!config.enabled);
    },
    true
  );

  // ---- src/features/tribe-guide/constants.js
  // Tunables live in config/tribe-guide.json.
  const {
    refreshMs: TRIBE_REFRESH_MS,
    ring2CacheMs: RING2_CACHE_MS,
    troopMargin: TROOP_MARGIN, // send this many times the tribe's current troops
    maxClicks: MAX_CLICKS, // more clicks than this and the tribe is not worth it
    weakClicks: WEAK_CLICKS, // at most this many clicks counts as a weak tribe
    busyClicks: BUSY_CLICKS, // a tribe fighting someone else is weak up to this
    maxEntrance: MAX_ENTRANCE, // a tribe with more ocean-shore tiles than this is open
    keepBonus: KEEP_BONUS, // a tribe we kept last tick is favoured, so the plan is stable
    exactLimit: EXACT_LIMIT, // exact kept-set search up to this many pockets, then greedy
    budgetPercent: BUDGET_PERCENT, // numbered targets together use at most this % of our troops
    tiers: TIERS,
    roleColors: ROLE_COLORS,
    entranceColor: ENTRANCE_COLOR, // entrance tiles on the map
    targetOutlineColor: TARGET_OUTLINE_COLOR,
  } = JSON_CONFIG.tribeGuide;

  // Name-plate geometry, mirroring name.vert.glsl and render-settings.json.
  const FONT_BASE_RATIO = JSON_CONFIG.tribeGuide.nameplate.fontBase / JSON_CONFIG.tribeGuide.nameplate.fontSize; // msdf atlas base / size
  const NAME_SCALE_FACTOR = JSON_CONFIG.tribeGuide.nameplate.scaleFactor;
  const NAME_SCALE_CAP = JSON_CONFIG.tribeGuide.nameplate.scaleCap;
  const TROOP_SIZE = JSON_CONFIG.tribeGuide.nameplate.troopSize;
  const CULL_THRESHOLD = JSON_CONFIG.tribeGuide.nameplate.cullThreshold; // in clip space, i.e. of half the canvas width

  // ---- src/features/tribe-guide/cost.js
  // Clicks needed to send TROOP_MARGIN x the tribe's troops. Each click sends
  // `ratio` of what we have left, so later clicks are smaller. null = too many.
  function clicksNeeded(myTroops, ratio, tribeTroops) {
    const need = TROOP_MARGIN * tribeTroops;
    let pool = myTroops;
    let sent = 0;
    for (let n = 1; n <= MAX_CLICKS; n++) {
      const batch = pool * ratio;
      sent += batch;
      pool -= batch;
      if (sent >= need) return n;
    }
    return null;
  }

  function tierOf(clicks, busy) {
    if (clicks === null) return 'skip';
    if (clicks <= WEAK_CLICKS) return 'weak';
    if (busy && clicks <= BUSY_CLICKS) return 'busy';
    return 'costly';
  }

  // ---- src/features/tribe-guide/scan.js
  // ---- Scanning ------------------------------------------------------------

  // What surrounds a tribe: tribes next to it, whether it touches us, whether it
  // is open (free land, a lake, the map edge, or a non-tribe player next to it),
  // and the tiles it owns that touch the ocean (its "entrance"). Mirrors
  // BotScanner in BotAnnexation.ts, except that ocean coast is reported rather
  // than treated as open. `early` gives up once the tribe can't be a pocket.
  async function scanBot(game, me, bot, early) {
    const botID = bot.smallID();
    const myID = me.smallID();
    const { borderTiles } = await bot.borderTiles();
    const info = { hardOpen: false, bordersUs: false, entranceTiles: [], N: new Set() };
    for (const tile of borderTiles) {
      if (game.isOnEdgeOfMap(tile)) info.hardOpen = true;
      const shore = game.isOceanShore(tile);
      if (shore) info.entranceTiles.push(tile);
      game.forEachNeighbor(tile, (n) => {
        const owner = game.ownerID(n);
        if (owner === botID) return;
        if (owner === myID) {
          info.bordersUs = true;
        } else if (owner === 0) {
          // Water next to an ocean-shore tile is the entrance; any other
          // unowned neighbour (free land, a lake) leaves the tribe open.
          if (game.isLand(n) || !shore) info.hardOpen = true;
        } else {
          const other = game.playerBySmallID(owner);
          if (other.isPlayer() && other.type() === BOT && other.isAlive() && !me.isFriendly(other)) {
            info.N.add(owner);
          } else {
            info.hardOpen = true;
          }
        }
      });
      if (early && (info.hardOpen || info.entranceTiles.length > MAX_ENTRANCE)) break;
    }
    return info;
  }

  // Scan the tribes bordering us (ring 1) and the tribes bordering those (ring
  // 2) into plain nodes for planAnnexations, with live troops and click costs.
  async function scanTribes(game, me, ratio) {
    const myID = me.smallID();
    const { borderTiles } = await me.borderTiles();
    const ids = new Set();
    let weOwnShore = false;
    for (const tile of borderTiles) {
      if (game.isOceanShore(tile)) weOwnShore = true;
      game.forEachNeighbor(tile, (n) => {
        const owner = game.ownerID(n);
        if (owner !== 0 && owner !== myID) ids.add(owner);
      });
    }

    const infos = new Map(); // smallID -> { ring, ...scanBot info }
    for (const id of ids) {
      const p = game.playerBySmallID(id);
      if (!p.isPlayer() || p.type() !== BOT || !p.isAlive() || me.isFriendly(p)) continue;
      infos.set(id, { ring: 1, ...(await scanBot(game, me, p, false)) });
    }
    const now = performance.now();
    for (const ring1 of [...infos.values()]) {
      for (const id of ring1.N) {
        if (infos.has(id)) continue;
        let cached = ring2Cache.get(id);
        if (!cached || now - cached.at > RING2_CACHE_MS) {
          const info = await scanBot(game, me, game.playerBySmallID(id), true);
          cached = { at: now, info };
          ring2Cache.set(id, cached);
        }
        infos.set(id, { ring: 2, ...cached.info, bordersUs: false });
      }
    }

    const attacked = new Set(me.outgoingAttacks().map((a) => a.targetID));
    const myTroops = me.troops();
    const nodes = [];
    for (const [id, info] of infos) {
      const p = game.playerBySmallID(id);
      const clicks = clicksNeeded(myTroops, ratio, p.troops());
      const touchesUs = (tile) => {
        let yes = false;
        game.forEachNeighbor(tile, (n) => {
          if (game.ownerID(n) === myID) yes = true;
        });
        return yes;
      };
      nodes.push({
        id,
        ring: info.ring,
        tiles: p.numTilesOwned(),
        troops: p.troops(),
        attacked: attacked.has(id),
        bordersUs: info.bordersUs,
        hardOpen: info.hardOpen,
        N: info.N,
        entranceTiles: info.entranceTiles,
        entranceCount: info.entranceTiles.length,
        entranceByLand: info.entranceTiles.some(touchesUs),
        clicks,
        percent: (TROOP_MARGIN * p.troops() * 100) / Math.max(1, myTroops),
      });
    }
    return { nodes, weOwnShore };
  }

  // ---- src/features/tribe-guide/plan.js
  // ---- Planning (pure: no DOM, no game objects) ----------------------------

  // Max-weight set of pockets with no two touching; returns the chosen indices.
  // `adj[i]` is a bitmask of the pockets that touch pocket i.
  function chooseKept(weights, adj) {
    const n = weights.length;
    if (n === 0) return [];
    if (n > EXACT_LIMIT) {
      const order = weights.map((_, i) => i).sort((a, b) => weights[b] - weights[a]);
      let picked = 0;
      const out = [];
      for (const i of order) {
        if (adj[i] & picked) continue;
        picked |= 1 << i;
        out.push(i);
      }
      return out;
    }
    const memo = new Map();
    const solve = (mask) => {
      if (mask === 0) return { value: 0, set: 0 };
      const hit = memo.get(mask);
      if (hit) return hit;
      const low = mask & -mask;
      const i = 31 - Math.clz32(low);
      const skip = solve(mask & ~low);
      const take = solve(mask & ~low & ~adj[i]);
      const best =
        weights[i] + take.value > skip.value
          ? { value: weights[i] + take.value, set: take.set | low }
          : skip;
      memo.set(mask, best);
      return best;
    };
    const { set } = solve((1 << n) - 1);
    return weights.map((_, i) => i).filter((i) => set & (1 << i));
  }

  // nodes: see scanTribes. Returns { roles: Map(id -> { role, ... }), kept, bestId }.
  // Roles: walled (ANNEX), leave / later (kept pocket, bordering / behind),
  // boat (kept pocket with a small entrance), target (#order), other.
  function planAnnexations(nodes, { weOwnShore, prevKept }) {
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const roles = new Map();
    // Tribes we haven't scanned (a ring beyond the second) are assumed fine.
    const neighboursAffordable = (n) =>
      [...n.N].every((id) => !byId.has(id) || byId.get(id).clicks !== null);

    const walled = [];
    const pockets = [];
    for (const n of nodes) {
      const closed = !n.hardOpen;
      if (n.ring === 1 && n.bordersUs && closed && n.entranceCount === 0 && n.N.size === 0) {
        walled.push(n);
        roles.set(n.id, { role: 'walled' });
        continue;
      }
      if (!closed || n.attacked || n.clicks === null || !neighboursAffordable(n)) continue;
      const plainPocket = n.entranceCount === 0 && n.N.size >= 1;
      const smallEntrance =
        n.entranceCount >= 1 &&
        n.entranceCount <= MAX_ENTRANCE &&
        (weOwnShore || n.entranceByLand);
      if (plainPocket || smallEntrance) pockets.push(n);
    }

    // The kept-set search uses bitmasks, so look at the 30 largest pockets only.
    pockets.sort((a, b) => b.tiles - a.tiles);
    pockets.length = Math.min(pockets.length, 30);
    const adj = pockets.map((a, i) =>
      pockets.reduce((m, b, j) => (i !== j && (a.N.has(b.id) || b.N.has(a.id)) ? m | (1 << j) : m), 0)
    );
    const weights = pockets.map((n) => n.tiles * (prevKept.has(n.id) ? KEEP_BONUS : 1));
    const kept = new Set(chooseKept(weights, adj).map((i) => pockets[i].id));

    // Steps still needed before a kept pocket is annexed: each neighbour, plus
    // the entrance landing.
    const remainingOf = (k) => k.N.size + (k.entranceCount > 0 ? 1 : 0);
    const keptNodes = pockets.filter((n) => kept.has(n.id));

    // Value of attacking a tribe: its land plus the share of each kept pocket it
    // walls in (the whole pocket when this attack is the last one needed),
    // per % of our troops it costs.
    const valueOf = (b) => {
      let land = b.tiles;
      for (const k of keptNodes) if (k.N.has(b.id)) land += k.tiles / remainingOf(k);
      return land / Math.max(1, b.percent);
    };
    const ring1 = nodes.filter((n) => n.ring === 1);
    let candidates = ring1.filter((n) => !kept.has(n.id) && !roles.has(n.id) && n.clicks !== null);
    // Behind water or the map edge the kept pockets can be all we border: attack
    // the best of them rather than nothing (a pocket with an entrance is boated into).
    if (candidates.length === 0 && walled.length === 0) {
      const fallback = keptNodes
        .filter((n) => n.ring === 1 && n.clicks !== null && n.entranceCount === 0)
        .sort((a, b) => b.tiles / Math.max(1, b.percent) - a.tiles / Math.max(1, a.percent))[0];
      if (fallback) {
        kept.delete(fallback.id);
        candidates = [fallback];
      }
    }
    candidates.sort((a, b) => valueOf(b) - valueOf(a));
    let used = 0;
    let order = 0;
    for (const n of candidates) {
      if (order > 0 && used + n.percent > BUDGET_PERCENT) break;
      used += n.percent;
      roles.set(n.id, { role: 'target', order: ++order });
    }

    for (const n of keptNodes) {
      if (!kept.has(n.id)) continue;
      if (n.entranceCount > 0) {
        roles.set(n.id, { role: 'boat', landLeft: n.N.size, dim: n.ring === 2 });
      } else if (n.ring === 1) {
        roles.set(n.id, { role: 'leave', remaining: remainingOf(n) });
      } else {
        roles.set(n.id, { role: 'later', remaining: remainingOf(n), dim: true });
      }
    }
    for (const n of ring1) if (!roles.has(n.id)) roles.set(n.id, { role: 'other' });

    walled.sort((a, b) => b.tiles - a.tiles);
    let bestId = null;
    if (walled.length) bestId = walled[0].id;
    else for (const [id, info] of roles) if (info.role === 'target' && info.order === 1) bestId = id;
    return { roles, kept, bestId };
  }

  // ---- src/features/borders.js
  // ---- Player borders ------------------------------------------------------
  // Custom border colours, painted on their own map layer (1px per border tile): allies yellow, teammates the default colour,
  // everyone else red, stronger the more of a threat they are to us. Threat
  // weighs the same things the engine's nation AI looks at when it sizes up a
  // rival (NationAllianceBehavior.isAlliancePartnerThreat: troops, tiles) plus
  // gold and finished missile silos. All inputs are client state; borderTiles()
  // is a local worker call.
  const { allyColor: BORDER_ALLY_COLOR, threatColor: BORDER_THREAT_RGB, minAlpha: BORDER_MIN_ALPHA, weights: THREAT_WEIGHTS } =
    JSON_CONFIG.tribeGuide.borders;

  // 0..1 share of the two values that is theirs: 0.5 = equal to us.
  function threatShare(theirs, ours) {
    const total = theirs + ours;
    return total > 0 ? theirs / total : 0;
  }

  function finishedSilos(player) {
    return player.units(SILO_TYPE).filter((u) => !u.isUnderConstruction()).length;
  }

  // 0 (harmless) .. 1 (overwhelming) weighted share of their troops, tiles, gold and silos against ours.
  function threatOf(player, me) {
    const w = THREAT_WEIGHTS;
    const score =
      w.troops * threatShare(player.troops(), me.troops()) +
      w.tiles * threatShare(player.numTilesOwned(), me.numTilesOwned()) +
      w.gold * threatShare(Number(player.gold()), Number(me.gold())) +
      w.silos * threatShare(finishedSilos(player), finishedSilos(me));
    return Math.max(0, Math.min(1, score / (w.troops + w.tiles + w.gold + w.silos)));
  }

  function borderColorFor(player, me) {
    if (player.isAlliedWith(me)) return BORDER_ALLY_COLOR;
    if (player.isOnSameTeam(me)) return TARGET_OUTLINE_COLOR;
    const alpha = BORDER_MIN_ALPHA + (1 - BORDER_MIN_ALPHA) * threatOf(player, me);
    return 'rgba(' + BORDER_THREAT_RGB + ',' + alpha.toFixed(2) + ')';
  }

  // Paint, one pixel per tile like the game's own border, the stretches where
  // your land meets a human or nation: both your tiles and theirs, coloured by
  // how that player relates to you. Their borders with anyone else, and tribes,
  // are not drawn. Returns a map-sized canvas.
  async function paintBorders(game, me) {
    const layer = document.createElement('canvas');
    layer.width = game.width();
    layer.height = game.height();
    const ctx = layer.getContext('2d');
    const players = game.players().filter((p) => p.isAlive() && p.type() !== 'BOT');
    const borders = await Promise.all(players.map((p) => p.borderTiles()));
    const myId = me.smallID();
    const colors = new Map(); // smallID -> colour, for the players on the other side
    const colorOf = (id) => {
      if (!colors.has(id)) {
        const p = players.find((q) => q.smallID() === id);
        colors.set(id, p ? borderColorFor(p, me) : null);
      }
      return colors.get(id);
    };
    players.forEach((p, i) => {
      const id = p.smallID();
      for (const tile of borders[i].borderTiles) {
        let color = null;
        game.forEachNeighbor(tile, (n) => {
          const owner = game.ownerID(n);
          if (color || owner === 0 || owner === id) return;
          // Only borders that involve us; the colour is the other side's.
          if (id === myId) color = colorOf(owner);
          else if (owner === myId) color = colorOf(id);
        });
        if (color) {
          ctx.fillStyle = color;
          ctx.fillRect(game.x(tile), game.y(tile), 1, 1);
        }
      }
    });
    return layer;
  }

  // ---- src/features/tribe-guide/overlay.js
  // ---- Map layer -----------------------------------------------------------

  // Paint the best target's border tiles in green (3x3 each, so they stay
  // visible when zoomed out) and every kept pocket's ocean entrance in magenta
  // (5x5), onto a map-sized canvas that the render loop stretches over the map.
  async function paintLayer(game, tribe, entranceTiles) {
    const layer = document.createElement('canvas');
    layer.width = game.width();
    layer.height = game.height();
    const ctx = layer.getContext('2d');
    if (tribe) {
      const { borderTiles } = await tribe.borderTiles();
      ctx.fillStyle = TARGET_OUTLINE_COLOR;
      for (const tile of borderTiles) ctx.fillRect(game.x(tile) - 1, game.y(tile) - 1, 3, 3);
    }
    ctx.fillStyle = ENTRANCE_COLOR;
    for (const tile of entranceTiles) ctx.fillRect(game.x(tile) - 2, game.y(tile) - 2, 5, 5);
    return layer;
  }

  // The text, colour and look of a tribe's chip.
  function chipFor(row) {
    const cost =
      row.tier === 'costly' || row.tier === 'skip'
        ? Math.min(999, Math.ceil(row.percent)) + (row.percent > 999 ? '%+' : '%') + ' troops'
        : row.clicks + (row.clicks === 1 ? ' click' : ' clicks');
    let text;
    let color;
    switch (row.role) {
      case 'walled':
        text = 'ANNEX · 1 click';
        color = ROLE_COLORS.walled;
        break;
      case 'leave':
        text = 'LEAVE · annexed after ' + row.remaining + ' more';
        color = ROLE_COLORS.leave;
        break;
      case 'later':
        text = 'ANNEX LATER · ' + row.remaining + ' left';
        color = ROLE_COLORS.later;
        break;
      case 'boat':
        text =
          (row.byLand ? 'ENTRANCE' : 'BOAT IN') +
          ' · ' +
          (row.landLeft === 0 ? 'last step' : row.entrance + (row.entrance === 1 ? ' tile' : ' tiles'));
        color = ROLE_COLORS.boat;
        break;
      case 'target':
        text = '#' + row.order + ' · ' + cost;
        color = ROLE_COLORS.target;
        break;
      default:
        text = TIERS[row.tier].tag + ' · ' + cost;
        color = TIERS[row.tier].color;
    }
    return { text: (row.best ? '★ ' : '') + text, color };
  }

  function ensureOverlay() {
    if (overlay) return;
    overlay = document.createElement('canvas');
    overlay.id = OVERLAY_ID;
    injectStyle(OVERLAY_ID + '-style', STYLES.overlay);
    overlayCtx = overlay.getContext('2d');
    document.body.appendChild(overlay);
  }

  // Draw each tribe's chip just below its troop count.
  function drawAnnotations(ctx, dpr, camera, game, me) {
    for (const row of evaluateTribes(game, me, getAttackRatio())) {
      const loc = row.player.nameLocation();
      if (!loc) continue;
      // Same sizing pipeline as the name shader (see hitTestNamePlate).
      const baseSize = Math.max(1, Math.floor(loc.size));
      const nameSize = Math.max(4, Math.floor(baseSize * NAME_SCALE_FACTOR));
      const nameFont = nameSize * Math.min(baseSize * 0.25, NAME_SCALE_CAP); // world units
      const origin = camera.worldToScreenCoordinates({ x: loc.x, y: loc.y });
      const unit = camera.worldToScreenCoordinates({ x: loc.x, y: loc.y + 1 }).y - origin.y;
      const lineH = FONT_BASE_RATIO * nameFont * unit; // screen px
      // The game hides the name plate below this size; hide ours with it.
      if (lineH < (CULL_THRESHOLD * camera.width()) / 2) continue;

      const troopFont = nameFont * TROOP_SIZE * unit;
      const fontPx = Math.min(48, Math.max(9, troopFont * 0.95)) * (row.dim ? 0.85 : 1);
      const chip = chipFor(row);

      ctx.font = '700 ' + fontPx * dpr + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const padX = fontPx * 0.5 * dpr;
      const h = fontPx * 1.5 * dpr;
      const w = ctx.measureText(chip.text).width + padX * 2;
      const cx = origin.x * dpr;
      // Troop line is centred 1.1 lines below the name; its bottom is ~half its font below that.
      const top = (origin.y + 1.1 * lineH + troopFont * 0.55) * dpr;

      ctx.globalAlpha = row.dim ? 0.55 : row.tier === 'skip' && row.role === 'other' ? 0.7 : 0.95;
      ctx.fillStyle = chip.color;
      ctx.beginPath();
      ctx.roundRect(cx - w / 2, top, w, h, h / 3);
      ctx.fill();
      if (row.best) {
        ctx.lineWidth = Math.max(1, dpr);
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillText(chip.text, cx, top + h / 2);
    }
  }

  function drawOverlay(now) {
    requestAnimationFrame(drawOverlay);
    const camera = getCamera();
    const game = getGame();
    const me = game && game.myPlayer();
    const active = config.enabled && camera && me && (mapLayer || borderLayer || sleeperCells.length || (plan && plan.roles.size));
    if (!active) {
      if (overlay) overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
      return;
    }
    ensureOverlay();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.round(window.innerWidth * dpr);
    const h = Math.round(window.innerHeight * dpr);
    if (overlay.width !== w || overlay.height !== h) {
      overlay.width = w;
      overlay.height = h;
    }
    overlayCtx.clearRect(0, 0, w, h);
    if (mapLayer) {
      const tl = camera.worldToScreenCoordinates({ x: 0, y: 0 });
      const br = camera.worldToScreenCoordinates({ x: game.width(), y: game.height() });
      overlayCtx.imageSmoothingEnabled = false;
      overlayCtx.globalAlpha = 0.65 + 0.35 * Math.sin(now / 250);
      overlayCtx.drawImage(
        mapLayer,
        tl.x * dpr,
        tl.y * dpr,
        (br.x - tl.x) * dpr,
        (br.y - tl.y) * dpr
      );
    }
    overlayCtx.globalAlpha = 1; // borders don't pulse
    if (borderLayer) {
      const tl = camera.worldToScreenCoordinates({ x: 0, y: 0 });
      const br = camera.worldToScreenCoordinates({ x: game.width(), y: game.height() });
      overlayCtx.imageSmoothingEnabled = false;
      overlayCtx.drawImage(borderLayer, tl.x * dpr, tl.y * dpr, (br.x - tl.x) * dpr, (br.y - tl.y) * dpr);
    }
    overlayCtx.globalAlpha = 1;
    drawSleeperCells(overlayCtx, dpr, camera, now);
    drawAnnotations(overlayCtx, dpr, camera, game, me);
  }

  // ---- src/features/tribe-guide/index.js
  const OVERLAY_ID = 'of-demo-tribe-highlight';
  const BOT = 'BOT'; // PlayerType.Bot, shown as "tribe" in the game's UI
  // ---- Tribe attack guide: plan attacks that maximise land annexed ---------------
  //
  // A tribe is annexed for free once every neighbour of its land is us (no free
  // land, no sea, no map edge; see PlayerExecution.surroundedBySamePlayer). So
  // the best opening is to leave some enclosed tribes ("pockets") alone and
  // conquer the tribes around them. Tribes with only a tiny ocean entrance are
  // pockets too: take the entrance by boat. This ports the engine's own planner
  // (BotAnnexation.ts) and adds boat entrances and a finishing-move bonus.
  //
  // Under the troop count of each tribe we draw a chip: ANNEX (walled in, 1
  // click), LEAVE (don't attack, it will be annexed), #1/#2 (attack in this
  // order), BOAT IN (land on the marked entrance), or the plain cost tiers.
  //
  // Everything is read from the game client already running in the page: the
  // HUD custom elements hold the client-side GameView (`.game`) and the camera
  // (`.transformHandler`), so no network request is made. Border tiles come
  // from the game's local web worker, not the game server. The overlay is a
  // click-through canvas positioned with the game's own camera.

  let overlay = null;
  let overlayCtx = null;
  let borderLayer = null; // map-sized canvas: player borders (borders.js), drawn steady
  let mapLayer = null; // map-sized offscreen canvas: best-target outline + entrances
  let target = null; // { name, smallID } of the currently outlined tribe
  let plan = null; // latest result of planAnnexations, plus the scanned nodes
  let ring2Cache = new Map(); // smallID -> { at, info } for tribes behind the front
  let refreshing = false;

  // The fraction of our troops one click sends (the in-game attack slider).
  function getAttackRatio() {
    const panel = document.querySelector('control-panel');
    const ratio = panel && panel.uiState && panel.uiState.attackRatio;
    if (typeof ratio === 'number' && ratio > 0) return ratio;
    try {
      const saved = parseFloat(localStorage.getItem('settings.attackRatio'));
      if (saved > 0) return saved;
    } catch (e) {
      /* storage unavailable; use the game default */
    }
    return 0.2;
  }

  function clearTribe() {
    if (target) console.log('[OpenFront Demo] No bordering tribe highlighted');
    target = null;
    mapLayer = null;
    borderLayer = null;
    plan = null;
    ring2Cache = new Map();
  }

  // Score the planned tribes against our current troops and attack ratio. Cheap
  // enough to run every frame, so the click counts follow the attack slider.
  function evaluateTribes(game, me, ratio) {
    const rows = [];
    if (!plan) return rows;
    for (const [id, info] of plan.roles) {
      const p = game.playerBySmallID(id);
      if (!p.isPlayer() || !p.isAlive()) continue;
      const node = plan.nodes.get(id);
      const clicks = clicksNeeded(me.troops(), ratio, p.troops());
      rows.push({
        player: p,
        ...info,
        entrance: node ? node.entranceCount : 0,
        byLand: node ? node.entranceByLand : false,
        tier: tierOf(clicks, p.outgoingAttacks().length > 0),
        clicks: info.role === 'walled' ? 1 : clicks,
        percent: (TROOP_MARGIN * p.troops() * 100) / Math.max(1, me.troops()),
        best: id === plan.bestId,
      });
    }
    return rows;
  }

  async function refreshTribe() {
    if (refreshing) return;
    refreshing = true;
    try {
      const game = config.enabled && isInGame() ? getGame() : null;
      const me = game && game.myPlayer();
      if (!me || !me.isAlive() || !me.hasSpawned()) return clearTribe();
      const scan = await scanTribes(game, me, getAttackRatio());
      const result = planAnnexations(scan.nodes, {
        weOwnShore: scan.weOwnShore,
        prevKept: plan ? plan.kept : new Set(),
      });
      plan = { ...result, nodes: new Map(scan.nodes.map((n) => [n.id, n])) };

      const best = result.bestId === null ? null : game.playerBySmallID(result.bestId);
      const entrances = [];
      for (const [id, info] of result.roles) {
        if (info.role === 'boat') entrances.push(...plan.nodes.get(id).entranceTiles);
      }
      mapLayer = best || entrances.length ? await paintLayer(game, best, entrances) : null;
      borderLayer = await paintBorders(game, me);
      if (!best) {
        if (target) console.log('[OpenFront Demo] No tribe worth attacking');
        target = null;
        return;
      }
      if (!target || target.smallID !== best.smallID()) {
        console.log(
          '[OpenFront Demo] Best tribe to attack: ' + best.name() + ' (' + result.roles.get(result.bestId).role + ')'
        );
      }
      target = { name: best.name(), smallID: best.smallID() };
    } catch (err) {
      console.warn('[OpenFront Demo] Tribe guide failed', err);
      clearTribe();
    } finally {
      refreshing = false;
    }
  }

  // ---- src/features/sleeper-cells.js
  // ---- Sleeper cell detector -----------------------------------------------
  //
  // A sleeper cell is a tiny patch (fewer than `maxTiles` tiles) of one player's
  // land that lies at least `minDistance` tiles away from that player's mainland
  // (their biggest connected patch) and touches the ocean at one tile or more;
  // nearer fragments and inland specks (nuke craters) are noise. Other players'
  // cells glow red wherever they are on the map, yours glow green. A player's
  // biggest patch is never a cell, however small.
  //
  // Runs only while Space is held: each press rescans the map and the cells show
  // until the key is released. Reads only GameView.ownerID, in the page; no network. Drawn on the same click-through overlay as the tribe guide.

  const {
    maxTiles: SLEEPER_MAX_TILES,
    minDistance: SLEEPER_MIN_DISTANCE,
    maxDrawn: SLEEPER_MAX_DRAWN,
    enemyColor: SLEEPER_ENEMY_COLOR,
    ownColor: SLEEPER_OWN_COLOR,
    teamColor: SLEEPER_TEAM_COLOR,
    glowPx: SLEEPER_GLOW_PX,
    minMarkPx: SLEEPER_MIN_MARK_PX,
  } = JSON_CONFIG.sleeperCells;

  let sleeperCells = []; // { mine, cx, cy, tiles: [{x, y}] } in map coordinates
  let sleeperBusy = false;
  let sleeperBuf = null; // { size, seen, stack } reused between scans

  function sleeperLimit() {
    const n = Math.floor(Number(config.sleeperMaxTiles));
    return n > 0 ? n : SLEEPER_MAX_TILES;
  }

  function sleeperMinDistance() {
    const n = Math.floor(Number(config.sleeperMinDistance));
    return n >= 0 ? n : SLEEPER_MIN_DISTANCE;
  }

  function scanSleeperCells(game, me) {
    const w = game.width();
    const h = game.height();
    const n = w * h;
    if (!sleeperBuf || sleeperBuf.size !== n) {
      sleeperBuf = { size: n, label: new Int32Array(n), stack: new Int32Array(n) };
    }
    const { label, stack } = sleeperBuf;
    label.fill(0);
    const limit = sleeperLimit();
    const minDist = sleeperMinDistance();
    const myID = me.smallID();
    const owner = new Uint16Array(n);
    for (let y = 0, i = 0; y < h; y++) {
      for (let x = 0; x < w; x++, i++) owner[i] = game.ownerID(game.ref(x, y));
    }

    // Pass 1: label every 4-connected same-owner patch; remember small ones and
    // each owner's biggest patch (their mainland).
    const small = []; // { id, lab, tiles: [index] }
    const mainSize = new Map(); // owner -> size of biggest patch
    const mainLabel = new Map(); // owner -> label of biggest patch
    let next = 0;
    for (let start = 0; start < n; start++) {
      const id = owner[start];
      if (id === 0 || label[start]) continue;
      const lab = ++next;
      let sp = 0;
      let count = 0;
      const kept = [];
      stack[sp++] = start;
      label[start] = lab;
      while (sp > 0) {
        const i = stack[--sp];
        count++;
        if (count < limit) kept.push(i);
        const x = i % w;
        if (x > 0 && !label[i - 1] && owner[i - 1] === id) (label[i - 1] = lab), (stack[sp++] = i - 1);
        if (x < w - 1 && !label[i + 1] && owner[i + 1] === id) (label[i + 1] = lab), (stack[sp++] = i + 1);
        if (i >= w && !label[i - w] && owner[i - w] === id) (label[i - w] = lab), (stack[sp++] = i - w);
        if (i < n - w && !label[i + w] && owner[i + w] === id) (label[i + w] = lab), (stack[sp++] = i + w);
      }
      if (count > (mainSize.get(id) || 0)) {
        mainSize.set(id, count);
        mainLabel.set(id, lab);
      }
      if (count < limit) small.push({ id, lab, tiles: kept });
    }

    // Pass 2: a small patch is a cell only if it is not the mainland, it is on the coast and no
    // mainland tile lies within minDist tiles (square distance) of it.
    const cells = [];
    for (const c of small) {
      const main = mainLabel.get(c.id);
      if (c.lab === main) continue;
      // Nukes leave scattered specks inland; a real cell is on the coast.
      if (!c.tiles.some((i) => game.isOceanShore(game.ref(i % w, Math.floor(i / w))))) continue;
      let near = false;
      for (let k = 0; k < c.tiles.length && !near; k++) {
        const cx = c.tiles[k] % w;
        const cy = Math.floor(c.tiles[k] / w);
        for (let y = Math.max(0, cy - minDist + 1); y <= Math.min(h - 1, cy + minDist - 1) && !near; y++) {
          for (let x = Math.max(0, cx - minDist + 1); x <= Math.min(w - 1, cx + minDist - 1); x++) {
            if (label[y * w + x] === main) {
              near = true;
              break;
            }
          }
        }
      }
      if (near) continue;
      const p = game.playerBySmallID(c.id);
      if (!p.isPlayer() || !p.isAlive()) continue;
      const myTeam = me.team();
      const team = myTeam != null && c.id !== myID && p.team() === myTeam;
      const tiles = c.tiles.map((i) => ({ x: i % w, y: Math.floor(i / w) }));
      cells.push({
        mine: c.id === myID,
        team,
        cx: tiles.reduce((s, t) => s + t.x, 0) / tiles.length + 0.5,
        cy: tiles.reduce((s, t) => s + t.y, 0) / tiles.length + 0.5,
        tiles,
      });
    }
    return cells;
  }

  function refreshSleeperCells() {
    if (sleeperBusy) return;
    sleeperBusy = true;
    try {
      const game = config.enabled && config.sleeperCells !== false && isInGame() ? getGame() : null;
      const me = game && game.myPlayer();
      if (!me || !me.isAlive() || !me.hasSpawned() || game.inSpawnPhase()) {
        sleeperCells = [];
        return;
      }
      sleeperCells = scanSleeperCells(game, me);
    } catch (err) {
      console.warn('[OpenFront Demo] Sleeper cell scan failed', err);
      sleeperCells = [];
    } finally {
      sleeperBusy = false;
    }
  }

  // Glowing squares over each cell, pulsing; always at least minMarkPx wide.
  // Cells whose halos would overlap on screen (same colour) share one blob.
  function drawSleeperCells(ctx, dpr, camera, now) {
    if (!sleeperCells.length) return;
    const o = camera.worldToScreenCoordinates({ x: 0, y: 0 });
    const unit = camera.worldToScreenCoordinates({ x: 1, y: 0 }).x - o.x;
    const side = Math.max(unit, SLEEPER_MIN_MARK_PX);
    const ringR = side * 1.2 + 6; // screen px
    const pulse = 0.7 + 0.3 * Math.sin(now / 200);
    const view = { w: window.innerWidth, h: window.innerHeight };

    const visible = [];
    for (const cell of sleeperCells) {
      const c = camera.worldToScreenCoordinates({ x: cell.cx, y: cell.cy });
      if (c.x < -50 || c.y < -50 || c.x > view.w + 50 || c.y > view.h + 50) continue;
      visible.push({ cell, x: c.x, y: c.y, color: sleeperColor(cell) });
      if (visible.length >= SLEEPER_MAX_DRAWN) break;
    }

    // Union-find over cells of one colour closer than two halo radii.
    const parent = visible.map((_, i) => i);
    const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
    for (let i = 0; i < visible.length; i++) {
      for (let j = i + 1; j < visible.length; j++) {
        if (visible[i].color !== visible[j].color) continue;
        if (Math.hypot(visible[i].x - visible[j].x, visible[i].y - visible[j].y) < ringR * 2) {
          parent[find(i)] = find(j);
        }
      }
    }
    const groups = new Map();
    visible.forEach((v, i) => {
      const r = find(i);
      if (!groups.has(r)) groups.set(r, []);
      groups.get(r).push(v);
    });

    ctx.save();
    for (const members of groups.values()) {
      const color = members[0].color;
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = SLEEPER_GLOW_PX * dpr * pulse;
      ctx.globalAlpha = 0.55 + 0.45 * pulse;
      const s = side * dpr;
      for (const m of members) {
        for (const t of m.cell.tiles) {
          const p = camera.worldToScreenCoordinates({ x: t.x + 0.5, y: t.y + 0.5 });
          ctx.fillRect(p.x * dpr - s / 2, p.y * dpr - s / 2, s, s);
        }
      }
      // One halo: a single cell's own ring, or the circle enclosing the whole crowd.
      const cx = members.reduce((a, m) => a + m.x, 0) / members.length;
      const cy = members.reduce((a, m) => a + m.y, 0) / members.length;
      const r = ringR + Math.max(...members.map((m) => Math.hypot(m.x - cx, m.y - cy)));
      ctx.lineWidth = 2 * dpr;
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.arc(cx * dpr, cy * dpr, r * dpr, 0, Math.PI * 2);
      if (members.length > 1) {
        ctx.globalAlpha = 0.12 + 0.08 * pulse;
        ctx.fill();
        ctx.globalAlpha = 0.55 + 0.45 * pulse;
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  function sleeperColor(cell) {
    return cell.mine ? SLEEPER_OWN_COLOR : cell.team ? SLEEPER_TEAM_COLOR : SLEEPER_ENEMY_COLOR;
  }

  // The key listeners only observe: they never block or replay the key press.
  window.addEventListener(
    'keydown',
    (e) => {
      if (e.code !== 'Space' || e.repeat || isTyping(e.target)) return;
      refreshSleeperCells();
    },
    true
  );
  function clearSleeperCells() {
    sleeperCells = [];
  }
  window.addEventListener('keyup', (e) => e.code === 'Space' && clearSleeperCells(), true);
  window.addEventListener('blur', clearSleeperCells);

  // ---- src/features/warnings/constants.js
  // Tunables live in config/warnings.json.
  const {
    refreshMs: WARN_REFRESH_MS,
    maxShown: WARN_MAX_SHOWN,
    gap: WARN_GAP, // px between banner / panel / feed
    severity: SEVERITY,
  } = JSON_CONFIG.warnings;

  // Severity level of one case of a custom system, from config/warnings.json
  // (`custom[].severity`). An unknown level is reported once and shown as a warning.
  const warnedSeverities = new Set();
  function severityFor(systemId, kind) {
    const entry = JSON_CONFIG.warnings.custom.find((c) => c.id === systemId);
    const level = entry && entry.severity && entry.severity[kind];
    if (SEVERITY[level]) return level;
    const key = systemId + '.' + kind;
    if (!warnedSeverities.has(key)) {
      warnedSeverities.add(key);
      console.warn('[OpenFront Demo] No valid severity for ' + key + ' in config/warnings.json (got ' + level + ')');
    }
    return 'warning';
  }

  // ---- src/features/warnings/units.js
  function tileDistance(game, a, b) {
    return Math.round(Math.hypot(game.x(a) - game.x(b), game.y(a) - game.y(b)));
  }

  function targetsMe(game, me, unit) {
    const t = unit.targetTile && unit.targetTile();
    return t !== undefined && t !== null && game.ownerID(t) === me.smallID();
  }

  // "45s", "1m 05s". Rounded up so 0.3s reads as 1s, never 0.
  function formatDuration(seconds) {
    const s = Math.max(1, Math.ceil(seconds));
    if (s < 60) return s + 's';
    return Math.floor(s / 60) + 'm ' + String(s % 60).padStart(2, '0') + 's';
  }

  function nukeSpeedFor(game, type) {
    try {
      const v = game.config().nukeSpeed(type);
      if (v > 0) return v;
    } catch (e) {
      /* fall back to config/warnings.json */
    }
    return JSON_CONFIG.warnings.eta.nukeSpeed[type] || 10;
  }

  // Rough time for a nuke to land: arc length at `speed` per tick.
  function nukeEta(game, unit) {
    const eta = JSON_CONFIG.warnings.eta;
    const arc = tileDistance(game, unit.tile(), unit.targetTile()) * eta.nukeArcFactor;
    return '~' + formatDuration(arc / nukeSpeedFor(game, unit.type()) / eta.ticksPerSecond);
  }

  // Rough time for a boat to land: it follows a water route, so the straight
  // distance is stretched by boatRouteFactor.
  function boatEta(game, unit) {
    const eta = JSON_CONFIG.warnings.eta;
    const route = tileDistance(game, unit.tile(), unit.targetTile()) * eta.boatRouteFactor;
    return '~' + formatDuration(route / eta.boatTilesPerTick / eta.ticksPerSecond);
  }

  // ---- src/features/warnings/nukes.js
  const NUKE_TYPES = { MIRV: 'MIRV', 'Hydrogen Bomb': 'Hydrogen bomb', 'Atom Bomb': 'Atom bomb' };
  const WARHEAD_TYPE = 'MIRV Warhead';
  // Each system returns [{ id, severity, text, who, detail }]. `who` is a
  // display name that gets shortened to fit; `text` is the fixed part.
  const nukesSystem = {
    id: 'nukes',
    label: 'Incoming nukes',
    scan(game, me) {
      const out = [];
      for (const u of game.units()) {
        const label = NUKE_TYPES[u.type()];
        if (!label || u.owner() === me || !targetsMe(game, me, u)) continue;
        out.push({
          id: 'nuke-' + u.id(),
          severity: severityFor('nukes', u.type() === 'MIRV' ? 'mirv' : 'bomb'),
          text: label + ' inbound from ',
          who: u.owner().displayName(),
          detail: nukeEta(game, u),
        });
      }
      // MIRV warheads after the split: one line per launcher.
      const heads = new Map();
      for (const u of game.units()) {
        if (u.type() !== WARHEAD_TYPE || u.owner() === me || !targetsMe(game, me, u)) continue;
        const key = u.owner().smallID();
        const e = heads.get(key) || { owner: u.owner(), n: 0 };
        e.n++;
        heads.set(key, e);
      }
      for (const [key, e] of heads) {
        out.push({
          id: 'warheads-' + key,
          severity: severityFor('nukes', 'warheads'),
          text: e.n + ' MIRV warheads from ',
          who: e.owner.displayName(),
          detail: 'impact',
        });
      }
      return out;
    },
  };

  // ---- src/features/warnings/landings.js
  const TRANSPORT_TYPE = 'Transport';
  const landingsSystem = {
    id: 'landings',
    label: 'Boats landing on you',
    scan(game, me) {
      const out = [];
      for (const u of game.units()) {
        if (u.type() !== TRANSPORT_TYPE || u.owner() === me || !targetsMe(game, me, u)) continue;
        const friendly = me.isFriendly(u.owner());
        out.push({
          id: 'boat-' + u.id(),
          severity: severityFor('landings', friendly ? 'allied' : 'enemy'),
          text: (friendly ? 'Allied boat landing: ' : 'Boat landing: '),
          who: u.owner().displayName(),
          detail: boatEta(game, u),
        });
      }
      return out;
    },
  };

  // ---- src/features/warnings/milestones.js
  // One-off announcements: a player gets the means to launch a nuke. "Access"
  // is what the game's own build menu checks: a finished missile silo plus
  // enough gold. Gold and units of every player are in the client state, so
  // this reads nothing from the network. Each announcement stays in the panel
  // for `milestoneSeconds`.
  //   mirvAccess      - a player other than you can now afford a MIRV
  //   hydrogenFirst   - the first player in the game who can launch a hydrogen bomb
  // Costs come from config/warnings.json (`costs`); a MIRV costs `mirvStep`
  // more for every MIRV already launched, which we count from the MIRV units we
  // have seen (so launches before the script loaded are missed).
  const MILESTONE_MS = JSON_CONFIG.warnings.milestoneSeconds * 1000;
  const SILO_TYPE = 'Missile Silo';

  const milestoneState = {
    game: null,
    mirvSeen: new Set(), // MIRV unit ids, for the cost step
    mirvAnnounced: new Set(), // smallIDs already announced
    hydrogenDone: false,
    active: new Map(), // warning id -> { until, warning }
  };

  function resetMilestonesFor(game) {
    if (milestoneState.game === game) return;
    milestoneState.game = game;
    milestoneState.mirvSeen.clear();
    milestoneState.mirvAnnounced.clear();
    milestoneState.hydrogenDone = false;
    milestoneState.active.clear();
  }

  function hasFinishedSilo(player) {
    return player.units(SILO_TYPE).some((u) => !u.isUnderConstruction());
  }

  function announce(warning) {
    milestoneState.active.set(warning.id, { until: Date.now() + MILESTONE_MS, warning });
  }

  // The announcements still inside their time window, for one system.
  function activeMilestones(prefix) {
    const now = Date.now();
    const out = [];
    for (const [id, entry] of milestoneState.active) {
      if (entry.until <= now) milestoneState.active.delete(id);
      else if (id.startsWith(prefix)) out.push(entry.warning);
    }
    return out;
  }

  function isNukeDisabled(game, type) {
    const cfg = game.config && game.config();
    return !!(cfg && cfg.isUnitDisabled && cfg.isUnitDisabled(type));
  }

  const mirvAccessSystem = {
    id: 'mirvAccess',
    label: 'New MIRV access',
    scan(game, me) {
      resetMilestonesFor(game);
      for (const u of game.units('MIRV')) milestoneState.mirvSeen.add(u.id());
      if (!isNukeDisabled(game, 'MIRV')) {
        const cost = BigInt(
          JSON_CONFIG.warnings.costs.mirvBase +
            milestoneState.mirvSeen.size * JSON_CONFIG.warnings.costs.mirvStep
        );
        for (const p of game.players()) {
          if (p === me || !p.isAlive() || milestoneState.mirvAnnounced.has(p.smallID())) continue;
          if (p.gold() < cost || !hasFinishedSilo(p)) continue;
          milestoneState.mirvAnnounced.add(p.smallID());
          announce({
            id: 'mirv-access-' + p.smallID(),
            severity: severityFor('mirvAccess', 'new'),
            text: 'MIRV access: ',
            who: p.displayName(),
            detail: 'can launch now',
          });
        }
      }
      return activeMilestones('mirv-access-');
    },
  };

  const hydrogenFirstSystem = {
    id: 'hydrogenFirst',
    label: 'First hydrogen bomb',
    scan(game, me) {
      resetMilestonesFor(game);
      if (!milestoneState.hydrogenDone && !isNukeDisabled(game, 'Hydrogen Bomb')) {
        const cost = BigInt(JSON_CONFIG.warnings.costs.hydrogen);
        const first = game
          .players()
          .find((p) => p.isAlive() && p.gold() >= cost && hasFinishedSilo(p));
        if (first) {
          // Whoever gets there first ends the race, including you.
          milestoneState.hydrogenDone = true;
          if (first !== me) {
            announce({
              id: 'hydrogen-first',
              severity: severityFor('hydrogenFirst', 'first'),
              text: 'First hydrogen bomb access: ',
              who: first.displayName(),
              detail: 'can launch now',
            });
          }
        }
      }
      return activeMilestones('hydrogen-first');
    },
  };

  // ---- src/features/warnings/index.js
  // ---- Warning panel + notification area ------------------------------------------
  //
  // One panel in the spot of the "Choose a starting location" banner (top centre;
  // below that banner while it is showing). Warning *systems* are independent:
  // each is a function (game, me) -> warnings, so one can be switched off (see
  // config.warnings) or added without touching the others. The game's own
  // notification feed (events-display) is restyled to sit right under the panel
  // with a partly transparent background, and long player names in it are
  // shortened to fit one line, keeping the [CLAN] tag. All of it is read-only:
  // game data is only read, the only writes are CSS and the text/title of the
  // feed rows (cosmetic, nothing is sent or dispatched).

  const WARNING_SYSTEMS = [nukesSystem, landingsSystem, mirvAccessSystem, hydrogenFirstSystem];

  // ---- src/features/warnings/panel.js
  const WARN_ID = 'of-demo-warnings';
  const WARN_STYLE_ID = 'of-demo-warnings-style';
  let warnEl = null;
  let warnings = [];
  let warnSig = '';

  function ensureWarnPanel() {
    if (warnEl) return;
    injectStyle(WARN_STYLE_ID, STYLES.warnings);
    warnEl = document.createElement('div');
    warnEl.id = WARN_ID;
    document.body.appendChild(warnEl);
  }

  function removeWarnPanel() {
    if (!warnEl) return;
    warnEl.remove();
    warnEl = null;
    removeStyle(WARN_STYLE_ID);
    warnSig = '';
    document.documentElement.style.removeProperty('--of-popup-top');
    document.documentElement.style.removeProperty('--of-feed-top');
  }

  // The "Choose a starting location" / paused banner, if it is showing.
  function headsUpBanner() {
    const host = document.querySelector('heads-up-message');
    if (!host) return null;
    for (const el of host.querySelectorAll('div.fixed')) {
      if (el.className.includes('top-[15%]') && el.offsetHeight > 0) return el;
    }
    return null;
  }

  function renderWarnings() {
    ensureWarnPanel();
    const panelWidth = warnEl.clientWidth || 480;
    const measure = measurer('600 14px ' + getComputedStyle(warnEl).fontFamily);
    const shown = warnings.slice(0, WARN_MAX_SHOWN);
    const rows = shown.map((w) => {
      const detail = '  ·  ' + w.detail;
      // row padding + border + gap eat ~40px
      const who = fitName(measure, w.who, w.text, detail, panelWidth - 40 - measure(detail));
      return { w, who };
    });
    const sig = rows.map((r) => r.w.id + r.who + r.w.detail).join('|') + warnings.length;
    if (sig !== warnSig) {
      warnSig = sig;
      warnEl.textContent = '';
      for (const { w, who } of rows) {
        const sev = SEVERITY[w.severity];
        const row = document.createElement('div');
        row.className = 'row';
        row.style.background = sev.bg;
        row.style.borderLeftColor = sev.edge;
        row.title = w.text + w.who + ' · ' + w.detail;
        const msg = document.createElement('span');
        msg.className = 'msg';
        msg.textContent = '⚠ ' + w.text + who;
        const detail = document.createElement('span');
        detail.className = 'detail';
        detail.textContent = w.detail;
        row.append(msg, detail);
        warnEl.appendChild(row);
      }
      if (warnings.length > rows.length) {
        const more = document.createElement('div');
        more.className = 'more';
        more.textContent = '+' + (warnings.length - rows.length) + ' more';
        warnEl.appendChild(more);
      }
    }
    // Sit where the starting-location banner is; below it while it is showing.
    const banner = headsUpBanner();
    const top = banner
      ? banner.getBoundingClientRect().bottom + WARN_GAP
      : window.innerHeight * 0.15;
    warnEl.style.top = top + 'px';
    const bottom = top + (warnings.length ? warnEl.offsetHeight + WARN_GAP : 0);
    document.documentElement.style.setProperty('--of-popup-top', bottom + 'px');
  }

  // ---- src/features/feed-layout.js
  const FEED_STYLE_ID = 'of-demo-feed-style';
  function setFeedStyle(on) {
  if (on) injectStyle(FEED_STYLE_ID, STYLES.feed);
  else removeStyle(FEED_STYLE_ID);
  }

  // ---- src/features/feed-shortening.js
  // Feed text nodes we shortened: node -> { orig, shown, width }.
  const feedNodes = new Map();

  function restoreFeed() {
    for (const [node, s] of feedNodes) {
      if (node.data === s.shown) node.data = s.orig;
      s.line.removeAttribute('title');
      delete s.line.dataset.ofKey;
    }
    feedNodes.clear();
    for (const card of document.querySelectorAll('actionable-events .of-dismissed')) {
      card.classList.remove('of-dismissed');
    }
    popupSeen.clear();
    popupDismissed.clear();
  }

  function shortenFeed(game) {
    // One line each: feed rows and the title of each alliance popup card.
    const lines = document.querySelectorAll(
      'events-display td, actionable-events > div > div > button:first-child'
    );
    const names = game
      .players()
      .map((p) => p.displayName())
      .filter((n) => n && n.length > 2)
      .sort((a, b) => b.length - a.length);
    for (const [node] of feedNodes) if (!node.isConnected) feedNodes.delete(node);

    for (const td of lines) {
      const avail = td.clientWidth - 16;
      if (avail <= 0) continue;
      const walker = document.createTreeWalker(td, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (!node.data.trim()) continue;
        let s = feedNodes.get(node);
        // A different value than we wrote means the game re-rendered this row.
        if (!s || node.data !== s.shown) {
          s = { orig: node.data, shown: node.data, width: 0, line: td };
          feedNodes.set(node, s);
        }
        td.dataset.ofKey = s.orig;
        if (s.width === avail) continue;
        s.width = avail;
        const measure = measurer(
          getComputedStyle(td).fontWeight + ' ' + getComputedStyle(td).fontSize + ' ' + getComputedStyle(td).fontFamily
        );
        let text = s.orig;
        if (measure(text) > avail) {
          const found = [];
          for (const n of names) {
            const at = text.indexOf(n);
            if (at >= 0 && !found.some((f) => at < f.at + f.n.length && f.at < at + n.length)) {
              found.push({ at, n });
            }
          }
          found.sort((a, b) => b.at - a.at); // edit right to left
          // Shorten the longest name first until the line fits.
          const byLength = found.slice().sort((a, b) => b.n.length - a.n.length);
          const cur = new Map(found.map((f) => [f, f.n]));
          const build = () => {
            let t = s.orig;
            for (const f of found) t = t.slice(0, f.at) + cur.get(f) + t.slice(f.at + f.n.length);
            return t;
          };
          for (const f of byLength) {
            if (measure(build()) <= avail) break;
            const others = measure(build()) - measure(cur.get(f));
            cur.set(f, fitName(measure, f.n, '', '', Math.max(measure('[]…'), avail - others)));
          }
          text = build();
        }
        s.shown = text;
        if (node.data !== text) node.data = text;
        td.title = s.orig;
      }
    }
  }

  // ---- src/features/feed-filter.js
  // Filters for the game's notification feed (events-display), by CSS class only:
  //  - a row the game also posts in a custom warning (JSON_CONFIG.warnings.native
  //    with `replacedBy`) is hidden while that system is on, so it is announced once;
  //  - minor rows (the game's grey top box) are hidden when clicked, without the
  //    game's jump to the mentioned player. Major rows
  //    keep the game's own click, which jumps to the player or unit.
  const NATIVE_REPLACED = JSON_CONFIG.warnings.native
    .filter((n) => n.pattern && n.replacedBy)
    .map((n) => ({ re: new RegExp(n.pattern, 'i'), system: n.replacedBy }));
  const FEED_HIDDEN = 'of-dup-hidden';
  const FEED_BOXES = 'events-display .events-container, events-display .important-events-container';
  const minorDismissed = new Set(); // row keys (the row's original text)
  const feedBound = new WeakSet();

  function rowKey(tr) {
    const td = tr.querySelector('td');
    return (td && td.dataset.ofKey) || tr.textContent.trim();
  }

  function onFeedClick(e) {
    const tr = e.target.closest && e.target.closest('.events-container tr');
    if (!tr) return;
    // Capture phase: stop here so the row's own focus button never sees the click.
    e.stopPropagation();
    minorDismissed.add(rowKey(tr));
    tr.classList.add(FEED_HIDDEN);
  }

  function filterFeed() {
    const host = document.querySelector('events-display');
    if (host && !feedBound.has(host)) {
      feedBound.add(host);
      host.addEventListener('click', onFeedClick, true);
    }
    const live = new Set();
    for (const box of document.querySelectorAll(FEED_BOXES)) {
      const minor = box.classList.contains('events-container');
      let visible = 0;
      for (const tr of box.querySelectorAll('tr')) {
        const key = rowKey(tr);
        live.add(key);
        const text = tr.textContent;
        const hide =
          (minor && minorDismissed.has(key)) ||
          NATIVE_REPLACED.some((n) => config.warnings[n.system] !== false && n.re.test(text));
        tr.classList.toggle(FEED_HIDDEN, hide);
        if (!hide) visible++;
      }
      box.classList.toggle(FEED_HIDDEN, visible === 0 && box.querySelector('tr') !== null);
    }
    for (const key of [...minorDismissed]) if (!live.has(key)) minorDismissed.delete(key);
  }

  function restoreFeedFilter() {
    for (const el of document.querySelectorAll('events-display .' + FEED_HIDDEN)) {
      el.classList.remove(FEED_HIDDEN);
    }
    minorDismissed.clear();
  }

  // ---- src/features/risky-moves.js
  // ---- Risky-move confirmation ---------------------------------------------------
  //
  // A map click that would attack (or expand) sends `attackRatio` of our troops.
  // If that leaves us with less (vs. our peak over the last few seconds, so a run
  // of small clicks adds up) than a safe reserve, three clicks are needed:
  // 1 is swallowed with a warning and a CONFIRM box appears just above the
  // cursor, 2 inside that box is swallowed too and arms the target, 3 on the
  // same owner goes through. The box is only drawn (pointer-events: none); we
  // recognise a click in its area ourselves. A flick up is enough, and
  // spamming one spot never confirms. The reserve depends on who borders us (non-allies):
  //   a neighbour >= 2x our size    keep 40%
  //   a neighbour >= 1.5x our size  keep 30%
  //   any other non-allied neighbour keep 20%
  //   no player neighbours          keep 10%
  // Size is tiles owned. Nothing is sent or simulated: the confirming click is the
  // user's own real click, which we let reach the game. Only plain left
  // clicks on the map are checked (not drags, touch, modifier menus, the
  // radial menu or keybinds).

  const {
    confirmSeconds: RISK_CONFIRM_S,
    dragPx: RISK_DRAG_PX,
    refreshMs: RISK_REFRESH_MS,
    bigRatio: RISK_BIG,
    largerRatio: RISK_LARGER,
    minLeftPercent: RISK_MIN_LEFT,
    peakSeconds: RISK_PEAK_S,
    button: RISK_BTN,
  } = JSON_CONFIG.riskyMoves;
  const RISK_ID = 'of-demo-risk';
  const { width: RISK_BTN_W, height: RISK_BTN_H, offset: RISK_BTN_OFFSET } = RISK_BTN;

  let threat = null; // { minLeft (0-1), label } from the latest border scan
  let riskDown = null; // { x, y } of a left press that started on the map canvas
  let riskPending = null; // { key, until } the target the user must click again
  let riskHideTimer = null;
  const troopLog = []; // { t, v } recent troop counts, to find the recent peak

  async function refreshThreat() {
    try {
      const game = config.enabled && config.riskyMoves && isInGame() ? getGame() : null;
      const me = game && game.myPlayer();
      if (!me || !me.isAlive() || !me.hasSpawned()) {
        threat = null;
        return;
      }
      const { borderTiles } = await me.borderTiles();
      const myID = me.smallID();
      const ids = new Set();
      for (const tile of borderTiles) {
        game.forEachNeighbor(tile, (n) => {
          const owner = game.ownerID(n);
          if (owner !== 0 && owner !== myID) ids.add(owner);
        });
      }
      const mine = Math.max(1, me.numTilesOwned());
      let biggest = 0;
      let any = null;
      for (const id of ids) {
        const p = game.playerBySmallID(id);
        if (!p.isPlayer() || !p.isAlive() || me.isFriendly(p)) continue;
        const r = p.numTilesOwned() / mine;
        if (!any || r > biggest) {
          any = p;
          biggest = r;
        }
      }
      let tier = 'none';
      if (any) tier = biggest >= RISK_BIG ? 'big' : biggest >= RISK_LARGER ? 'larger' : 'similar';
      const label = any
        ? any.name() + ' borders you' + (tier === 'similar' ? '' : ' at ' + biggest.toFixed(1) + 'x your size')
        : 'no player borders you';
      if (me) recentPeak(me.troops());
      threat = { minLeft: RISK_MIN_LEFT[tier] / 100, label };
    } catch (e) {
      threat = null; // game mid-update; the next tick retries
    }
  }

  function inRect(x, y, r) {
    return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  }

  // Troops we had at the start of the recent burst of clicks: the highest count
  // in the last RISK_PEAK_S seconds (never below the current count).
  function recentPeak(troops) {
    const now = Date.now();
    troopLog.push({ t: now, v: troops });
    while (troopLog[0].t < now - RISK_PEAK_S * 1000) troopLog.shift();
    return Math.max(...troopLog.map((x) => x.v));
  }

  function showRiskNotice(lines, rect) {
    let el = document.getElementById(RISK_ID);
    if (!el) {
      el = document.createElement('div');
      el.id = RISK_ID;
      document.body.appendChild(el);
    }
    el.replaceChildren();
    const old = document.getElementById(RISK_ID + '-btn');
    if (old) old.remove();
    el.append(lines[0]);
    const detail = document.createElement('span');
    detail.className = 'detail';
    detail.textContent = lines[1];
    el.appendChild(detail);
    if (rect) {
      const btn = document.createElement('span');
      btn.className = 'btn';
      btn.textContent = 'CONFIRM';
      Object.assign(btn.style, { left: rect.x + 'px', top: rect.y + 'px', width: rect.w + 'px', height: rect.h + 'px' });
      btn.id = RISK_ID + '-btn';
      document.body.appendChild(btn);
    }
    clearTimeout(riskHideTimer);
    riskHideTimer = setTimeout(hideRiskNotice, RISK_CONFIRM_S * 1000);
  }

  function hideRiskNotice() {
    for (const id of [RISK_ID, RISK_ID + '-btn']) {
      const el = document.getElementById(id);
      if (el) el.remove();
    }
  }

  function onRiskPointerDown(e) {
    const t = e.target;
    // Map clicks land on the game's transparent input div (or the canvas itself).
    const onMap = t && (t.id === 'game-input-overlay' || (t.tagName === 'CANVAS' && t.id !== OVERLAY_ID));
    riskDown = e.button === 0 && onMap ? { x: e.clientX, y: e.clientY } : null;
  }

  // Capture phase on window, so it runs before the game's own pointerup handler.
  function onRiskPointerUp(e) {
    const down = riskDown;
    riskDown = null;
    if (!down || e.button !== 0 || e.pointerType === 'touch' || !config.enabled || !config.riskyMoves) return;
    if (e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return; // modifier menus
    if (Math.abs(e.clientX - down.x) + Math.abs(e.clientY - down.y) >= RISK_DRAG_PX) return; // a pan
    if (!threat || !isInGame()) return;
    try {
      if (localStorage.getItem('settings.leftClickOpensMenu') === 'true') return; // click opens the radial menu
      const game = getGame();
      const cam = getCamera();
      const me = game && game.myPlayer();
      if (!game || !cam || !me || !me.isAlive() || game.inSpawnPhase()) return;
      const panel = document.querySelector('control-panel');
      if (panel && panel.uiState && panel.uiState.ghostStructure) return; // placing a building
      const now = Date.now();
      const p = riskPending && now < riskPending.until ? riskPending : null;
      // The CONFIRM box is only drawn. A click inside it is always swallowed,
      // wherever it lands on the map; it arms the target for the next click.
      if (p && p.stage === 1 && inRect(e.clientX, e.clientY, p.rect)) {
        e.stopImmediatePropagation();
        e.preventDefault();
        riskPending = { ...p, stage: 2, until: now + RISK_CONFIRM_S * 1000 };
        showRiskNotice(['Armed: click ' + p.name + ' to attack.', 'Any other click cancels.'], null);
        return;
      }
      const cell = cam.screenToWorldCoordinates(e.clientX, e.clientY);
      if (!game.isValidCoord(cell.x, cell.y)) return;
      const tile = game.ref(cell.x, cell.y);
      const ownerID = game.ownerID(tile);
      if (!game.isLand(tile) || ownerID === me.smallID()) return;
      const owner = game.playerBySmallID(ownerID);
      if (owner.isPlayer() && me.isFriendly(owner)) return;

      // Measured against the recent peak, so several small clicks add up.
      const troops = me.troops();
      const left = (troops * (1 - getAttackRatio())) / Math.max(1, recentPeak(troops));
      if (left >= threat.minLeft) return;

      // Third click: the armed target, let the game see this one.
      if (p && p.stage === 2 && p.key === ownerID) {
        riskPending = null;
        hideRiskNotice();
        return;
      }
      // First click (or a restart): block it and put the CONFIRM box above the cursor.
      e.stopImmediatePropagation();
      e.preventDefault();
      const rect = {
        x: e.clientX - RISK_BTN_W / 2,
        y: e.clientY - RISK_BTN_OFFSET - RISK_BTN_H,
        w: RISK_BTN_W,
        h: RISK_BTN_H,
      };
      const name = owner.isPlayer() ? owner.name() : 'the land';
      riskPending = { key: ownerID, name, stage: 1, until: now + RISK_CONFIRM_S * 1000, rect };
          showRiskNotice(
        [
          'Risky move: this click leaves ' + Math.round(left * 100) + '% of your recent peak troops (keep ' + Math.round(threat.minLeft * 100) + '%)',
          threat.label + '. Click CONFIRM, then click ' + name + ' to attack.',
        ],
        rect
      );
    } catch (err) {
      /* game objects mid-update: let the click through */
    }
  }

  window.addEventListener('pointerdown', onRiskPointerDown, true);
  window.addEventListener('pointerup', onRiskPointerUp, true);

  // ---- src/features/alliance-popups.js
  // Alliance popups (actionable-events): click one to hide it, and hide them
  // after config.popupSeconds. We only hide the card; the game still owns it
  // (it expires on its own, and Accept/Reject keep working as before). Cards
  // are told apart by their text, since the game reuses the DOM nodes.
  const popupSeen = new Map(); // key -> first seen (ms)
  const popupDismissed = new Set();
  const popupBound = new WeakSet();
  const POPUP_CARD = 'actionable-events > div > div';

  function popupKey(card) {
    const title = card.querySelector('button');
    return title ? title.dataset.ofKey || title.textContent : '';
  }

  function onPopupClick(e) {
    const card = e.target.closest && e.target.closest(POPUP_CARD);
    // Accept / Reject / Focus keep their own behaviour.
    if (!card || e.target.closest('.flex-wrap')) return;
    popupDismissed.add(popupKey(card));
    card.classList.add('of-dismissed');
  }

  function managePopups() {
    const host = document.querySelector('actionable-events');
    if (host && !popupBound.has(host)) {
      popupBound.add(host);
      host.addEventListener('click', onPopupClick);
    }
    const now = Date.now();
    const limit = Number(config.popupSeconds) > 0 ? config.popupSeconds * 1000 : 0;
    const live = new Set();
    for (const card of document.querySelectorAll(POPUP_CARD)) {
      const key = popupKey(card);
      live.add(key);
      if (!popupSeen.has(key)) popupSeen.set(key, now);
      const expired = limit > 0 && now - popupSeen.get(key) > limit;
      card.classList.toggle('of-dismissed', expired || popupDismissed.has(key));
    }
    for (const key of [...popupSeen.keys()]) {
      if (live.has(key)) continue;
      popupSeen.delete(key);
      popupDismissed.delete(key);
    }
    // Put the notification feed under whatever popups are still showing.
    const top = parseFloat(document.documentElement.style.getPropertyValue('--of-popup-top')) || 0;
    const shown = host && [...host.querySelectorAll(POPUP_CARD)].some((c) => c.offsetHeight > 0);
    const feedTop = shown ? host.getBoundingClientRect().bottom + WARN_GAP : top;
    document.documentElement.style.setProperty('--of-feed-top', feedTop + 'px');
  }

  // ---- src/features/spawn-beep.js
  // Short beep once a second while the spawn (placement) phase is running.
  // Web Audio only; reads game.inSpawnPhase() and sends nothing.
  let beepCtx = null;

  function beep() {
    try {
      beepCtx = beepCtx || new (window.AudioContext || window.webkitAudioContext)();
      if (beepCtx.state === 'suspended') beepCtx.resume();
      const osc = beepCtx.createOscillator();
      const gain = beepCtx.createGain();
      const t = beepCtx.currentTime;
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      osc.connect(gain).connect(beepCtx.destination);
      osc.start(t);
      osc.stop(t + 0.15);
    } catch (e) {
      /* audio blocked until the page has had a user gesture */
    }
  }

  function refreshSpawnBeep() {
    if (!config.enabled || config.spawnBeep === false || !isInGame()) return;
    const game = getGame();
    if (game && game.inSpawnPhase()) beep();
  }

  // ---- src/features/hud-refresh.js
  function refreshWarnings() {
    const game = getGame();
    const me = game && game.myPlayer();
    if (!config.enabled || !me || !isInGame()) {
      removeWarnPanel();
      setFeedStyle(false);
      restoreFeed();
      restoreFeedFilter();
      return;
    }
    setFeedStyle(true);
    try {
      warnings = [];
      for (const system of WARNING_SYSTEMS) {
        if (config.warnings[system.id] === false) continue;
        warnings.push(...system.scan(game, me));
      }
      warnings.sort((a, b) => SEVERITY[a.severity].rank - SEVERITY[b.severity].rank);
      renderWarnings();
      filterFeed();
      shortenFeed(game);
      managePopups();
    } catch (e) {
      // game objects can be mid-update; try again next tick
    }
  }

  // ---- src/main.js
  console.log(
    '%c[OpenFront Demo] Userscript loaded successfully on ' + location.href,
    'color: #4ade80; font-weight: bold;'
  );

  injectStyle('of-demo-base-style', STYLES.base);
  injectStyle('of-demo-risk-style', STYLES.risky);

  setInterval(refreshWarnings, WARN_REFRESH_MS);
  setInterval(refreshSpawnBeep, 1000);

  setInterval(refreshTribe, TRIBE_REFRESH_MS);
  setInterval(refreshThreat, RISK_REFRESH_MS);
  requestAnimationFrame(drawOverlay);

  new MutationObserver(updateIndicator).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
    subtree: true,
    childList: true,
  });
  setInterval(updateIndicator, 1000);

  if (document.body) addIndicator();
  else window.addEventListener('DOMContentLoaded', addIndicator);
})();
