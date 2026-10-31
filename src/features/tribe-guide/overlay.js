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
