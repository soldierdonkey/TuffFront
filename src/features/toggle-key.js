function isTyping(target) {
  return (
    !!target &&
    (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
  );
}

window.addEventListener(
  'keydown',
  (e) => {
    if (rebinding) {
      e.preventDefault();
      e.stopPropagation();
      if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return;
      rebinding = false;
      if (e.key !== 'Escape') {
        config.toggleKey = e.key;
        saveConfig();
        console.log('[OpenFront Demo] Toggle key set to "' + keyName(e.key) + '"');
      }
      render();
      return;
    }
    if (e.key !== config.toggleKey || e.repeat) return;
    if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return;
    setEnabled(!config.enabled);
  },
  true
);
