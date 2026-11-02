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
  const push = pushByTarget(me);
  for (const [id, info] of plan.roles) {
    const p = game.playerBySmallID(id);
    if (!p.isPlayer() || !p.isAlive()) continue;
    const node = plan.nodes.get(id);
    const need = troopsStillNeeded(
      { tiles: p.numTilesOwned(), troops: p.troops(), mag: node ? node.mag : 100 },
      push.get(id) || 0
    );
    const clicks = clicksNeeded(me.troops(), ratio, need);
    rows.push({
      player: p,
      ...info,
      entrance: node ? node.entranceCount : 0,
      byLand: node ? node.entranceByLand : false,
      tier: tierOf(clicks, p.outgoingAttacks().length > 0),
      clicks: info.role === 'walled' ? 1 : clicks,
      percent: (need * 100) / Math.max(1, me.troops()),
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
