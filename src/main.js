console.log(
  '%c[OpenFront Demo] Userscript loaded successfully on ' + location.href,
  'color: #4ade80; font-weight: bold;'
);

injectStyle('of-demo-base-style', STYLES.base);
injectStyle('of-demo-risk-style', STYLES.risky);

setInterval(refreshWarnings, WARN_REFRESH_MS);
setInterval(refreshSpawnBeep, 1000);

setInterval(refreshTribe, TRIBE_REFRESH_MS);
setInterval(refreshThreat, RISK_REFRESH_MS);
requestAnimationFrame(drawOverlay);

new MutationObserver(updateIndicator).observe(document.documentElement, {
  attributes: true,
  attributeFilter: ['class'],
  subtree: true,
  childList: true,
});
setInterval(updateIndicator, 1000);

if (document.body) addIndicator();
else window.addEventListener('DOMContentLoaded', addIndicator);
