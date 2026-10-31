// Stylesheets come from styles/*.css (inlined by build.js into STYLES).
function injectStyle(id, css) {
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = css;
  document.head.appendChild(style);
}

function removeStyle(id) {
  const style = document.getElementById(id);
  if (style) style.remove();
}
