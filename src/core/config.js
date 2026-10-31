const STORE_KEY = 'of-demo-userscript-config';
// Defaults live in config/defaults.json. Persisted in localStorage so they survive reloads.
// See that file for what each key does (right-click the indicator to rebind toggleKey,
// Alt+click it to change popupSeconds).
const config = Object.assign(structuredClone(JSON_CONFIG.defaults), loadConfig());

function loadConfig() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY)) || {};
  } catch (e) {
    return {};
  }
}

function saveConfig() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(config));
  } catch (e) {
    /* storage unavailable; keep the in-memory value */
  }
}
