// Feed text nodes we shortened: node -> { orig, shown, width }.
const feedNodes = new Map();

function restoreFeed() {
  for (const [node, s] of feedNodes) {
    if (node.data === s.shown) node.data = s.orig;
    s.line.removeAttribute('title');
    delete s.line.dataset.ofKey;
  }
  feedNodes.clear();
  for (const card of document.querySelectorAll('actionable-events .of-dismissed')) {
    card.classList.remove('of-dismissed');
  }
  popupSeen.clear();
  popupDismissed.clear();
}

function shortenFeed(game) {
  // One line each: feed rows and the title of each alliance popup card.
  const lines = document.querySelectorAll(
    'events-display td, actionable-events > div > div > button:first-child'
  );
  const names = game
    .players()
    .map((p) => p.displayName())
    .filter((n) => n && n.length > 2)
    .sort((a, b) => b.length - a.length);
  for (const [node] of feedNodes) if (!node.isConnected) feedNodes.delete(node);

  for (const td of lines) {
    const avail = td.clientWidth - 16;
    if (avail <= 0) continue;
    const walker = document.createTreeWalker(td, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!node.data.trim()) continue;
      let s = feedNodes.get(node);
      // A different value than we wrote means the game re-rendered this row.
      if (!s || node.data !== s.shown) {
        s = { orig: node.data, shown: node.data, width: 0, line: td };
        feedNodes.set(node, s);
      }
      td.dataset.ofKey = s.orig;
      if (s.width === avail) continue;
      s.width = avail;
      const measure = measurer(
        getComputedStyle(td).fontWeight + ' ' + getComputedStyle(td).fontSize + ' ' + getComputedStyle(td).fontFamily
      );
      let text = s.orig;
      if (measure(text) > avail) {
        const found = [];
        for (const n of names) {
          const at = text.indexOf(n);
          if (at >= 0 && !found.some((f) => at < f.at + f.n.length && f.at < at + n.length)) {
            found.push({ at, n });
          }
        }
        found.sort((a, b) => b.at - a.at); // edit right to left
        // Shorten the longest name first until the line fits.
        const byLength = found.slice().sort((a, b) => b.n.length - a.n.length);
        const cur = new Map(found.map((f) => [f, f.n]));
        const build = () => {
          let t = s.orig;
          for (const f of found) t = t.slice(0, f.at) + cur.get(f) + t.slice(f.at + f.n.length);
          return t;
        };
        for (const f of byLength) {
          if (measure(build()) <= avail) break;
          const others = measure(build()) - measure(cur.get(f));
          cur.set(f, fitName(measure, f.n, '', '', Math.max(measure('[]…'), avail - others)));
        }
        text = build();
      }
      s.shown = text;
      if (node.data !== text) node.data = text;
      td.title = s.orig;
    }
  }
}
