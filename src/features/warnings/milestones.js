// One-off announcements: a player gets the means to launch a nuke. "Access"
// is what the game's own build menu checks: a finished missile silo plus
// enough gold. Gold and units of every player are in the client state, so
// this reads nothing from the network. Each announcement stays in the panel
// for `milestoneSeconds`.
//   mirvAccess      - a player other than you can now afford a MIRV
//   hydrogenFirst   - the first player in the game who can launch a hydrogen bomb
// Costs come from config/warnings.json (`costs`); a MIRV costs `mirvStep`
// more for every MIRV already launched, which we count from the MIRV units we
// have seen (so launches before the script loaded are missed).
const MILESTONE_MS = JSON_CONFIG.warnings.milestoneSeconds * 1000;
const SILO_TYPE = 'Missile Silo';

const milestoneState = {
  game: null,
  mirvSeen: new Set(), // MIRV unit ids, for the cost step
  mirvAnnounced: new Set(), // smallIDs already announced
  hydrogenDone: false,
  active: new Map(), // warning id -> { until, warning }
};

function resetMilestonesFor(game) {
  if (milestoneState.game === game) return;
  milestoneState.game = game;
  milestoneState.mirvSeen.clear();
  milestoneState.mirvAnnounced.clear();
  milestoneState.hydrogenDone = false;
  milestoneState.active.clear();
}

function hasFinishedSilo(player) {
  return player.units(SILO_TYPE).some((u) => !u.isUnderConstruction());
}

function announce(warning) {
  milestoneState.active.set(warning.id, { until: Date.now() + MILESTONE_MS, warning });
}

// The announcements still inside their time window, for one system.
function activeMilestones(prefix) {
  const now = Date.now();
  const out = [];
  for (const [id, entry] of milestoneState.active) {
    if (entry.until <= now) milestoneState.active.delete(id);
    else if (id.startsWith(prefix)) out.push(entry.warning);
  }
  return out;
}

function isNukeDisabled(game, type) {
  const cfg = game.config && game.config();
  return !!(cfg && cfg.isUnitDisabled && cfg.isUnitDisabled(type));
}

const mirvAccessSystem = {
  id: 'mirvAccess',
  label: 'New MIRV access',
  scan(game, me) {
    resetMilestonesFor(game);
    for (const u of game.units('MIRV')) milestoneState.mirvSeen.add(u.id());
    if (!isNukeDisabled(game, 'MIRV')) {
      const cost = BigInt(
        JSON_CONFIG.warnings.costs.mirvBase +
          milestoneState.mirvSeen.size * JSON_CONFIG.warnings.costs.mirvStep
      );
      for (const p of game.players()) {
        if (p === me || !p.isAlive() || milestoneState.mirvAnnounced.has(p.smallID())) continue;
        if (p.gold() < cost || !hasFinishedSilo(p)) continue;
        milestoneState.mirvAnnounced.add(p.smallID());
        announce({
          id: 'mirv-access-' + p.smallID(),
          severity: severityFor('mirvAccess', 'new'),
          text: 'MIRV access: ',
          who: p.displayName(),
          detail: 'can launch now',
        });
      }
    }
    return activeMilestones('mirv-access-');
  },
};

const hydrogenFirstSystem = {
  id: 'hydrogenFirst',
  label: 'First hydrogen bomb',
  scan(game, me) {
    resetMilestonesFor(game);
    if (!milestoneState.hydrogenDone && !isNukeDisabled(game, 'Hydrogen Bomb')) {
      const cost = BigInt(JSON_CONFIG.warnings.costs.hydrogen);
      const first = game
        .players()
        .find((p) => p.isAlive() && p.gold() >= cost && hasFinishedSilo(p));
      if (first) {
        // Whoever gets there first ends the race, including you.
        milestoneState.hydrogenDone = true;
        if (first !== me) {
          announce({
            id: 'hydrogen-first',
            severity: severityFor('hydrogenFirst', 'first'),
            text: 'First hydrogen bomb access: ',
            who: first.displayName(),
            detail: 'can launch now',
          });
        }
      }
    }
    return activeMilestones('hydrogen-first');
  },
};
