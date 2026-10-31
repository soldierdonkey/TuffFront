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
