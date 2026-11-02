// Terrain magnitude -> the engine's per-tile "mag" (terrainAttackBase in
// EngineConfig.ts): plains 80, highland 100, mountain 120. Desert and the like
// are plains or highland by magnitude, so this covers them.
function terrainMag(game, tile) {
  const m = game.magnitude(tile);
  return m < 10 ? 80 : m < 20 ? 100 : 120;
}

// Troops lost per conquered tile with an attack stack `stack` against a tribe
// of `troops` over `tiles` (attackLogic in EngineConfig.ts, bot defender, no
// defence post or fallout). The large-territory bonuses are ~1 early on.
function tileLoss(mag, stack, troops, tiles) {
  const ratio = Math.min(2, Math.max(0.6, troops / Math.max(1, stack)));
  return BOT_LOSS_MULT * mag * ratio * (LOSS_BASE + LOSS_PER_DENSITY * (troops / Math.max(1, tiles)));
}

// Smallest attack stack that conquers every tile of the tribe: the stack
// shrinks as it takes tiles and the tribe loses its troop density with each
// one, so walk through the tribe in steps and binary-search the start.
function troopsToTake(tribe) {
  const { tiles, troops, mag } = tribe;
  if (tiles <= 0) return 0;
  const density = troops / tiles;
  const chunk = tiles / COST_STEPS;
  const survives = (start) => {
    let stack = start;
    let left = troops;
    for (let i = 0; i < COST_STEPS; i++) {
      stack -= chunk * tileLoss(mag, stack, left, tiles);
      left -= chunk * density;
      if (stack <= 0) return false;
    }
    return true;
  };
  let lo = 0;
  let hi = Math.max(1, troops) * 64;
  if (!survives(hi)) return hi;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (survives(mid)) hi = mid;
    else lo = mid;
  }
  return hi * TROOP_MARGIN;
}

// Troops still to send, after what our attacks on this tribe already carry.
function troopsStillNeeded(tribe, pushTroops) {
  return Math.max(0, troopsToTake(tribe) - pushTroops);
}

// Clicks needed to send `need` troops. Each click sends `ratio` of what we
// have left, so later clicks are smaller. null = too many.
function clicksNeeded(myTroops, ratio, need) {
  if (need <= 0) return 0;
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

// Troops our live attacks on each player already carry (not retreating ones).
function pushByTarget(me) {
  const push = new Map();
  for (const a of me.outgoingAttacks()) {
    if (a.retreating) continue;
    push.set(a.targetID, (push.get(a.targetID) || 0) + a.troops);
  }
  return push;
}

function tierOf(clicks, busy) {
  if (clicks === null) return 'skip';
  if (clicks <= WEAK_CLICKS) return 'weak';
  if (busy && clicks <= BUSY_CLICKS) return 'busy';
  return 'costly';
}
