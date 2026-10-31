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
