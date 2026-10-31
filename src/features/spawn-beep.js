// Short beep once a second while the spawn (placement) phase is running.
// Web Audio only; reads game.inSpawnPhase() and sends nothing.
let beepCtx = null;

function beep() {
  try {
    beepCtx = beepCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (beepCtx.state === 'suspended') beepCtx.resume();
    const osc = beepCtx.createOscillator();
    const gain = beepCtx.createGain();
    const t = beepCtx.currentTime;
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(gain).connect(beepCtx.destination);
    osc.start(t);
    osc.stop(t + 0.15);
  } catch (e) {
    /* audio blocked until the page has had a user gesture */
  }
}

function refreshSpawnBeep() {
  if (!config.enabled || config.spawnBeep === false || !isInGame()) return;
  const game = getGame();
  if (game && game.inSpawnPhase()) beep();
}
