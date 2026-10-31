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
