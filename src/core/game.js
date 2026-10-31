// The client toggles `in-game` on <body> while a game is running (set in
// Main.ts); the game UI elements and /game/<id> URL are fallbacks.
function isInGame() {
  if (document.body.classList.contains('in-game')) return true;
  if (/\/game\/[^/]+/.test(location.pathname)) return true;
  const sidebar = document.querySelector('game-left-sidebar');
  return !!sidebar && sidebar.offsetWidth > 0 && sidebar.offsetHeight > 0;
}

function getGame() {
  const el = document.querySelector('game-left-sidebar');
  return (el && el.game) || null;
}

function getCamera() {
  const el = document.querySelector('build-menu');
  return (el && el.transformHandler) || null;
}
