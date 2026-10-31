// Alliance popups (actionable-events): click one to hide it, and hide them
// after config.popupSeconds. We only hide the card; the game still owns it
// (it expires on its own, and Accept/Reject keep working as before). Cards
// are told apart by their text, since the game reuses the DOM nodes.
const popupSeen = new Map(); // key -> first seen (ms)
const popupDismissed = new Set();
const popupBound = new WeakSet();
const POPUP_CARD = 'actionable-events > div > div';

function popupKey(card) {
  const title = card.querySelector('button');
  return title ? title.dataset.ofKey || title.textContent : '';
}

function onPopupClick(e) {
  const card = e.target.closest && e.target.closest(POPUP_CARD);
  // Accept / Reject / Focus keep their own behaviour.
  if (!card || e.target.closest('.flex-wrap')) return;
  popupDismissed.add(popupKey(card));
  card.classList.add('of-dismissed');
}

function managePopups() {
  const host = document.querySelector('actionable-events');
  if (host && !popupBound.has(host)) {
    popupBound.add(host);
    host.addEventListener('click', onPopupClick);
  }
  const now = Date.now();
  const limit = Number(config.popupSeconds) > 0 ? config.popupSeconds * 1000 : 0;
  const live = new Set();
  for (const card of document.querySelectorAll(POPUP_CARD)) {
    const key = popupKey(card);
    live.add(key);
    if (!popupSeen.has(key)) popupSeen.set(key, now);
    const expired = limit > 0 && now - popupSeen.get(key) > limit;
    card.classList.toggle('of-dismissed', expired || popupDismissed.has(key));
  }
  for (const key of [...popupSeen.keys()]) {
    if (live.has(key)) continue;
    popupSeen.delete(key);
    popupDismissed.delete(key);
  }
  // Put the notification feed under whatever popups are still showing.
  const top = parseFloat(document.documentElement.style.getPropertyValue('--of-popup-top')) || 0;
  const shown = host && [...host.querySelectorAll(POPUP_CARD)].some((c) => c.offsetHeight > 0);
  const feedTop = shown ? host.getBoundingClientRect().bottom + WARN_GAP : top;
  document.documentElement.style.setProperty('--of-feed-top', feedTop + 'px');
}
