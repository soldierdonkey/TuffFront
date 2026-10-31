const NUKE_TYPES = { MIRV: 'MIRV', 'Hydrogen Bomb': 'Hydrogen bomb', 'Atom Bomb': 'Atom bomb' };
const WARHEAD_TYPE = 'MIRV Warhead';
// Each system returns [{ id, severity, text, who, detail }]. `who` is a
// display name that gets shortened to fit; `text` is the fixed part.
const nukesSystem = {
  id: 'nukes',
  label: 'Incoming nukes',
  scan(game, me) {
    const out = [];
    for (const u of game.units()) {
      const label = NUKE_TYPES[u.type()];
      if (!label || u.owner() === me || !targetsMe(game, me, u)) continue;
      out.push({
        id: 'nuke-' + u.id(),
        severity: severityFor('nukes', u.type() === 'MIRV' ? 'mirv' : 'bomb'),
        text: label + ' inbound from ',
        who: u.owner().displayName(),
        detail: nukeEta(game, u),
      });
    }
    // MIRV warheads after the split: one line per launcher.
    const heads = new Map();
    for (const u of game.units()) {
      if (u.type() !== WARHEAD_TYPE || u.owner() === me || !targetsMe(game, me, u)) continue;
      const key = u.owner().smallID();
      const e = heads.get(key) || { owner: u.owner(), n: 0 };
      e.n++;
      heads.set(key, e);
    }
    for (const [key, e] of heads) {
      out.push({
        id: 'warheads-' + key,
        severity: severityFor('nukes', 'warheads'),
        text: e.n + ' MIRV warheads from ',
        who: e.owner.displayName(),
        detail: 'impact',
      });
    }
    return out;
  },
};
