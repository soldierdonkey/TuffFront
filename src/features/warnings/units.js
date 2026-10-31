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
