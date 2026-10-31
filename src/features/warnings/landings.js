const TRANSPORT_TYPE = 'Transport';
const landingsSystem = {
  id: 'landings',
  label: 'Boats landing on you',
  scan(game, me) {
    const out = [];
    for (const u of game.units()) {
      if (u.type() !== TRANSPORT_TYPE || u.owner() === me || !targetsMe(game, me, u)) continue;
      const friendly = me.isFriendly(u.owner());
      out.push({
        id: 'boat-' + u.id(),
        severity: severityFor('landings', friendly ? 'allied' : 'enemy'),
        text: (friendly ? 'Allied boat landing: ' : 'Boat landing: '),
        who: u.owner().displayName(),
        detail: boatEta(game, u),
      });
    }
    return out;
  },
};
