// Splits "[CLAN] Name" into its tag (with trailing space) and the rest.
function splitClan(displayName) {
  const m = /^(\[[^\]]*\]\s*)?([\s\S]*)$/.exec(displayName);
  return { tag: m[1] || '', rest: m[2] };
}

// Shortens a player's name so `prefix + name + suffix` fits `maxPx`, keeping
// the [CLAN] tag and as many characters of the name as still fit.
function fitName(measure, displayName, prefix, suffix, maxPx) {
  if (measure(prefix + displayName + suffix) <= maxPx) return displayName;
  const { tag, rest } = splitClan(displayName);
  let keep = rest.length;
  while (keep > 1) {
    keep--;
    const candidate = tag + rest.slice(0, keep).trimEnd() + '…';
    if (measure(prefix + candidate + suffix) <= maxPx) return candidate;
  }
  return tag + rest.slice(0, 1) + '…';
}

const measureCtx = document.createElement('canvas').getContext('2d');
function measurer(font) {
  measureCtx.font = font;
  return (text) => measureCtx.measureText(text).width;
}
