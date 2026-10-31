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
