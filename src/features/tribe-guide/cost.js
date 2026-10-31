// Clicks needed to send TROOP_MARGIN x the tribe's troops. Each click sends
// `ratio` of what we have left, so later clicks are smaller. null = too many.
function clicksNeeded(myTroops, ratio, tribeTroops) {
  const need = TROOP_MARGIN * tribeTroops;
  let pool = myTroops;
  let sent = 0;
  for (let n = 1; n <= MAX_CLICKS; n++) {
    const batch = pool * ratio;
    sent += batch;
    pool -= batch;
    if (sent >= need) return n;
  }
  return null;
}

function tierOf(clicks, busy) {
  if (clicks === null) return 'skip';
  if (clicks <= WEAK_CLICKS) return 'weak';
  if (busy && clicks <= BUSY_CLICKS) return 'busy';
  return 'costly';
}
