#!/usr/bin/env node
// Bundles src/ + config/*.json + styles/*.css into dist/openfront-demo.user.js.
// A userscript manager loads one file, so the split lives in the repo only.
// Usage: npm run build

const fs = require('fs');
const path = require('path');

const root = __dirname;
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

// Everything shares one scope inside the IIFE, so the order only matters for
// top-level `const`s that are read while the script loads.
const SOURCES = [
  'src/core/config.js',
  'src/core/styles.js',
  'src/core/game.js',
  'src/core/text.js',
  'src/features/indicator.js',
  'src/features/toggle-key.js',
  'src/features/tribe-guide/constants.js',
  'src/features/tribe-guide/cost.js',
  'src/features/tribe-guide/scan.js',
  'src/features/tribe-guide/plan.js',
  'src/features/borders.js',
  'src/features/tribe-guide/overlay.js',
  'src/features/tribe-guide/index.js',
  'src/features/sleeper-cells.js',
  'src/features/warnings/constants.js',
  'src/features/warnings/units.js',
  'src/features/warnings/nukes.js',
  'src/features/warnings/landings.js',
  'src/features/warnings/milestones.js',
  'src/features/warnings/index.js',
  'src/features/warnings/panel.js',
  'src/features/feed-layout.js',
  'src/features/feed-shortening.js',
  'src/features/feed-filter.js',
  'src/features/risky-moves.js',
  'src/features/alliance-popups.js',
  'src/features/spawn-beep.js',
  'src/features/hud-refresh.js',
  'src/main.js',
];

const CONFIG_FILES = {
  defaults: 'config/defaults.json',
  tribeGuide: 'config/tribe-guide.json',
  warnings: 'config/warnings.json',
  sleeperCells: 'config/sleeper-cells.json',
  riskyMoves: 'config/risky-moves.json',
};

const STYLE_FILES = {
  base: 'styles/base.css',
  indicator: 'styles/indicator.css',
  overlay: 'styles/overlay.css',
  warnings: 'styles/warnings.css',
  feed: 'styles/feed.css',
  risky: 'styles/risky.css',
};

const meta = JSON.parse(read('config/userscript.json'));
const header = [
  '// ==UserScript==',
  '// @name         ' + meta.name,
  '// @namespace    ' + meta.namespace,
  '// @version      ' + meta.version,
  '// @description  ' + meta.description,
  ...meta.match.map((m) => '// @match        ' + m),
  '// @run-at       ' + meta.runAt,
  '// @grant        ' + meta.grant,
  '// ==/UserScript==',
].join('\n');

const configs = {};
for (const [key, file] of Object.entries(CONFIG_FILES)) configs[key] = JSON.parse(read(file));
const styles = {};
for (const [key, file] of Object.entries(STYLE_FILES)) styles[key] = read(file);

const indent = (s) => s.split('\n').map((l) => (l ? '  ' + l : l)).join('\n');
const body = [
  '// Inlined by build.js from config/*.json and styles/*.css.',
  'const JSON_CONFIG = ' + JSON.stringify(configs, null, 2) + ';',
  'const STYLES = ' + JSON.stringify(styles, null, 2) + ';',
  ...SOURCES.map((f) => '// ---- ' + f + '\n' + read(f).trimEnd()),
].join('\n\n');

const out = header + "\n\n(function () {\n  'use strict';\n\n" + indent(body) + '\n})();\n';
const dest = path.join(root, 'dist', 'openfront-demo.user.js');
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, out);
console.log('Built ' + path.relative(root, dest) + ' (' + out.split('\n').length + ' lines)');
