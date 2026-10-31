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

// Escape cancels the confirmation at once (box gone, nothing armed). The key
// still reaches the game.
function onRiskKeyDown(e) {
  if (e.key !== 'Escape' || !riskPending) return;
  riskPending = null;
  clearTimeout(riskHideTimer);
  hideRiskNotice();
}

window.addEventListener('keydown', onRiskKeyDown, true);
window.addEventListener('pointerdown', onRiskPointerDown, true);
window.addEventListener('pointerup', onRiskPointerUp, true);
