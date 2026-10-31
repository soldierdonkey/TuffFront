const ID = 'of-demo-userscript-indicator';
let rebinding = false;

function addIndicator() {
  if (document.getElementById(ID)) return;

  const btn = document.createElement('button');
  btn.id = ID;
  btn.type = 'button';
  btn.title = 'OpenFront Demo userscript is running';
  btn.innerHTML = '<span class="dot"></span><span class="label"></span>';

  btn.addEventListener('click', (e) => {
    if (e.altKey) {
      const answer = window.prompt(
        'Hide alliance popups after how many seconds? (0 = game default)',
        String(config.popupSeconds)
      );
      const n = Number(answer);
      if (answer !== null && answer.trim() !== '' && Number.isFinite(n) && n >= 0) {
        config.popupSeconds = n;
        saveConfig();
        console.log('[OpenFront Demo] Popup timer set to ' + n + 's');
      }
      return;
    }
    console.log(
      '[OpenFront Demo] Userscript is ' + (config.enabled ? 'active.' : 'disabled.')
    );
  });

  btn.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    rebinding = true;
    render();
  });

  injectStyle(ID + '-style', STYLES.indicator);
  document.body.appendChild(btn);
  updateIndicator();
  render();
}

function keyName(key) {
  return key === ' ' ? 'Space' : key;
}

let lastState = null;
function updateIndicator() {
  if (!config.enabled) return;
  const inGame = isInGame();
  if (inGame === lastState) return;
  lastState = inGame;
  console.log('[OpenFront Demo] ' + (inGame ? 'Game detected' : 'Not in a game'));
  render();
}

function render() {
  const btn = document.getElementById(ID);
  if (!btn) return;
  const key = keyName(config.toggleKey);
  let label, title;
  if (rebinding) {
    label = 'Press a new key';
    title = 'Press the key to use for toggling the script (Esc to cancel)';
  } else if (!config.enabled) {
    label = 'Script disabled';
    title = 'OpenFront Demo userscript is disabled. Press ' + key + ' to enable, right-click to change the key';
  } else {
    const inGame = isInGame();
    label = inGame ? 'Game detected' : 'Script loaded';
    title =
      'OpenFront Demo userscript: ' +
      (inGame ? 'game detected' : 'running') +
      '. Press ' + key + ' to disable, right-click to change the key, Alt+click to set the popup timer';
  }
  btn.classList.toggle('disabled', !config.enabled);
  btn.querySelector('.label').textContent = label;
  btn.title = title;
}

function setEnabled(enabled) {
  config.enabled = enabled;
  saveConfig();
  console.log('[OpenFront Demo] Userscript ' + (enabled ? 'enabled' : 'disabled'));
  lastState = null;
  if (enabled) updateIndicator();
  render();
}
