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
  const info = { hardOpen: false, bordersUs: false, entranceTiles: [], N: new Set(), mag: 100 };
  let magSum = 0;
  for (const tile of borderTiles) {
    magSum += terrainMag(game, tile);
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
  if (borderTiles.length) info.mag = magSum / borderTiles.length;
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
  const push = pushByTarget(me);
  const nodes = [];
  for (const [id, info] of infos) {
    const p = game.playerBySmallID(id);
    const tribe = { tiles: p.numTilesOwned(), troops: p.troops(), mag: info.mag };
    const need = troopsStillNeeded(tribe, push.get(id) || 0);
    const clicks = clicksNeeded(myTroops, ratio, need);
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
      mag: info.mag,
      clicks,
      percent: (need * 100) / Math.max(1, myTroops),
    });
  }
  return { nodes, weOwnShore };
}
