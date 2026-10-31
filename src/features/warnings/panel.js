const WARN_ID = 'of-demo-warnings';
const WARN_STYLE_ID = 'of-demo-warnings-style';
let warnEl = null;
let warnings = [];
let warnSig = '';

function ensureWarnPanel() {
  if (warnEl) return;
  injectStyle(WARN_STYLE_ID, STYLES.warnings);
  warnEl = document.createElement('div');
  warnEl.id = WARN_ID;
  document.body.appendChild(warnEl);
}

function removeWarnPanel() {
  if (!warnEl) return;
  warnEl.remove();
  warnEl = null;
  removeStyle(WARN_STYLE_ID);
  warnSig = '';
  document.documentElement.style.removeProperty('--of-popup-top');
  document.documentElement.style.removeProperty('--of-feed-top');
}

// The "Choose a starting location" / paused banner, if it is showing.
function headsUpBanner() {
  const host = document.querySelector('heads-up-message');
  if (!host) return null;
  for (const el of host.querySelectorAll('div.fixed')) {
    if (el.className.includes('top-[15%]') && el.offsetHeight > 0) return el;
  }
  return null;
}

function renderWarnings() {
  ensureWarnPanel();
  const panelWidth = warnEl.clientWidth || 480;
  const measure = measurer('600 14px ' + getComputedStyle(warnEl).fontFamily);
  const shown = warnings.slice(0, WARN_MAX_SHOWN);
  const rows = shown.map((w) => {
    const detail = '  ·  ' + w.detail;
    // row padding + border + gap eat ~40px
    const who = fitName(measure, w.who, w.text, detail, panelWidth - 40 - measure(detail));
    return { w, who };
  });
  const sig = rows.map((r) => r.w.id + r.who + r.w.detail).join('|') + warnings.length;
  if (sig !== warnSig) {
    warnSig = sig;
    warnEl.textContent = '';
    for (const { w, who } of rows) {
      const sev = SEVERITY[w.severity];
      const row = document.createElement('div');
      row.className = 'row';
      row.style.background = sev.bg;
      row.style.borderLeftColor = sev.edge;
      row.title = w.text + w.who + ' · ' + w.detail;
      const msg = document.createElement('span');
      msg.className = 'msg';
      msg.textContent = '⚠ ' + w.text + who;
      const detail = document.createElement('span');
      detail.className = 'detail';
      detail.textContent = w.detail;
      row.append(msg, detail);
      warnEl.appendChild(row);
    }
    if (warnings.length > rows.length) {
      const more = document.createElement('div');
      more.className = 'more';
      more.textContent = '+' + (warnings.length - rows.length) + ' more';
      warnEl.appendChild(more);
    }
  }
  // Sit where the starting-location banner is; below it while it is showing.
  const banner = headsUpBanner();
  const top = banner
    ? banner.getBoundingClientRect().bottom + WARN_GAP
    : window.innerHeight * 0.15;
  warnEl.style.top = top + 'px';
  const bottom = top + (warnings.length ? warnEl.offsetHeight + WARN_GAP : 0);
  document.documentElement.style.setProperty('--of-popup-top', bottom + 'px');
}
