// Filters for the game's notification feed (events-display), by CSS class only:
//  - a row the game also posts in a custom warning (JSON_CONFIG.warnings.native
//    with `replacedBy`) is hidden while that system is on, so it is announced once;
//  - minor rows (the game's grey top box) are hidden when clicked, without the
//    game's jump to the mentioned player. Major rows
//    keep the game's own click, which jumps to the player or unit.
const NATIVE_REPLACED = JSON_CONFIG.warnings.native
  .filter((n) => n.pattern && n.replacedBy)
  .map((n) => ({ re: new RegExp(n.pattern, 'i'), system: n.replacedBy }));
const FEED_HIDDEN = 'of-dup-hidden';
const FEED_BOXES = 'events-display .events-container, events-display .important-events-container';
const minorDismissed = new Set(); // row keys (the row's original text)
const feedBound = new WeakSet();

function rowKey(tr) {
  const td = tr.querySelector('td');
  return (td && td.dataset.ofKey) || tr.textContent.trim();
}

function onFeedClick(e) {
  const tr = e.target.closest && e.target.closest('.events-container tr');
  if (!tr) return;
  // Capture phase: stop here so the row's own focus button never sees the click.
  e.stopPropagation();
  minorDismissed.add(rowKey(tr));
  tr.classList.add(FEED_HIDDEN);
}

function filterFeed() {
  const host = document.querySelector('events-display');
  if (host && !feedBound.has(host)) {
    feedBound.add(host);
    host.addEventListener('click', onFeedClick, true);
  }
  const live = new Set();
  for (const box of document.querySelectorAll(FEED_BOXES)) {
    const minor = box.classList.contains('events-container');
    let visible = 0;
    for (const tr of box.querySelectorAll('tr')) {
      const key = rowKey(tr);
      live.add(key);
      const text = tr.textContent;
      const hide =
        (minor && minorDismissed.has(key)) ||
        NATIVE_REPLACED.some((n) => config.warnings[n.system] !== false && n.re.test(text));
      tr.classList.toggle(FEED_HIDDEN, hide);
      if (!hide) visible++;
    }
    box.classList.toggle(FEED_HIDDEN, visible === 0 && box.querySelector('tr') !== null);
  }
  for (const key of [...minorDismissed]) if (!live.has(key)) minorDismissed.delete(key);
}

function restoreFeedFilter() {
  for (const el of document.querySelectorAll('events-display .' + FEED_HIDDEN)) {
    el.classList.remove(FEED_HIDDEN);
  }
  minorDismissed.clear();
}
