// ---- Warning panel + notification area ------------------------------------------
//
// One panel in the spot of the "Choose a starting location" banner (top centre;
// below that banner while it is showing). Warning *systems* are independent:
// each is a function (game, me) -> warnings, so one can be switched off (see
// config.warnings) or added without touching the others. The game's own
// notification feed (events-display) is restyled to sit right under the panel
// with a partly transparent background, and long player names in it are
// shortened to fit one line, keeping the [CLAN] tag. All of it is read-only:
// game data is only read, the only writes are CSS and the text/title of the
// feed rows (cosmetic, nothing is sent or dispatched).

const WARNING_SYSTEMS = [nukesSystem, landingsSystem, mirvAccessSystem, hydrogenFirstSystem];
