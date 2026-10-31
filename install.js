#!/usr/bin/env node
// Builds the userscript (build.js) and installs dist/*.user.js into a Userscripts (Safari) scripts folder.
// Usage: npm run install-script [-- /custom/path]   (installs the demo script)
//        npm run install-all [-- /custom/path]      (installs every *.user.js here)

const fs = require('fs');
const os = require('os');
const path = require('path');
const readline = require('readline');
const { execFileSync } = require('child_process');

execFileSync(process.execPath, [path.join(__dirname, 'build.js')], { stdio: 'inherit' });
const dist = path.join(__dirname, 'dist');

const args = process.argv.slice(2);
const all = args.includes('--all');
const scripts = (all
  ? fs.readdirSync(dist).filter((f) => f.endsWith('.user.js'))
  : ['openfront-demo.user.js']
).map((f) => path.join(dist, f));
const home = os.homedir();

const candidates = [
  path.join(home, 'Library/Containers/com.userscripts.macos.Userscripts-Extension/Data/Documents/scripts'),
  path.join(home, 'Library/Containers/com.userscripts.macos/Data/Documents'),
  path.join(home, 'Library/Mobile Documents/com~apple~CloudDocs/Userscripts'),
  path.join(home, 'Library/Mobile Documents/iCloud~com~userscripts~macos/Documents'),
  path.join(home, 'Documents/Userscripts'),
  path.join(home, 'Desktop/Userscripts'),
  path.join(home, 'Userscripts'),
];

function isDir(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function ask(rl, q) {
  return new Promise((resolve) => rl.question(q, resolve));
}

async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const custom = args.find((a) => !a.startsWith('--'));
  let found = (custom ? [path.resolve(custom)] : candidates).filter(isDir);

  let targets;
  if (found.length === 0) {
    console.log('No Userscripts folder found in common locations:');
    candidates.forEach((c) => console.log('  - ' + c));
    console.log('\nOpen the Userscripts extension in Safari to see your chosen directory.');
    const p = (await ask(rl, 'Enter the folder path (blank to cancel): ')).trim();
    if (!p) return rl.close();
    const dir = path.resolve(p.replace(/^~/, home));
    if (!isDir(dir)) {
      console.error('Not a directory: ' + dir);
      process.exitCode = 1;
      return rl.close();
    }
    targets = [dir];
  } else {
    targets = found;
  }

  const dests = targets.flatMap((t) => scripts.map((f) => path.join(t, path.basename(f))));
  console.log('Will install:');
  dests.forEach((d) => console.log(`  ${d}${fs.existsSync(d) ? ' (overwrites existing)' : ''}`));
  const answer = await ask(rl, 'Proceed? [y/N] ');
  rl.close();
  if (!/^y(es)?$/i.test(answer.trim())) {
    console.log('Cancelled.');
    return;
  }

  try {
    dests.forEach((d) => fs.copyFileSync(scripts.find((f) => path.basename(f) === path.basename(d)), d));
    console.log(`Installed ${dests.length} file(s) in ${targets.length} folder(s). Reload openfront.io in Safari.`);
  } catch (e) {
    console.error('Failed to copy: ' + e.message);
    if (e.code === 'EPERM' || e.code === 'EACCES') {
      console.error('Your terminal may need Full Disk Access (System Settings > Privacy & Security).');
    }
    process.exitCode = 1;
  }
}

main();
