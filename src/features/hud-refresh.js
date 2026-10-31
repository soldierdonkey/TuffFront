function refreshWarnings() {
  const game = getGame();
  const me = game && game.myPlayer();
  if (!config.enabled || !me || !isInGame()) {
    removeWarnPanel();
    setFeedStyle(false);
    restoreFeed();
    restoreFeedFilter();
    return;
  }
  setFeedStyle(true);
  try {
    warnings = [];
    for (const system of WARNING_SYSTEMS) {
      if (config.warnings[system.id] === false) continue;
      warnings.push(...system.scan(game, me));
    }
    warnings.sort((a, b) => SEVERITY[a.severity].rank - SEVERITY[b.severity].rank);
    renderWarnings();
    filterFeed();
    shortenFeed(game);
    managePopups();
  } catch (e) {
    // game objects can be mid-update; try again next tick
  }
}
