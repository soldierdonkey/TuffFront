// Tunables live in config/warnings.json.
const {
  refreshMs: WARN_REFRESH_MS,
  maxShown: WARN_MAX_SHOWN,
  gap: WARN_GAP, // px between banner / panel / feed
  severity: SEVERITY,
} = JSON_CONFIG.warnings;

// Severity level of one case of a custom system, from config/warnings.json
// (`custom[].severity`). An unknown level is reported once and shown as a warning.
const warnedSeverities = new Set();
function severityFor(systemId, kind) {
  const entry = JSON_CONFIG.warnings.custom.find((c) => c.id === systemId);
  const level = entry && entry.severity && entry.severity[kind];
  if (SEVERITY[level]) return level;
  const key = systemId + '.' + kind;
  if (!warnedSeverities.has(key)) {
    warnedSeverities.add(key);
    console.warn('[OpenFront Demo] No valid severity for ' + key + ' in config/warnings.json (got ' + level + ')');
  }
  return 'warning';
}
