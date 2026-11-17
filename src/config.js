// Zentrale Maße des Spiels. Alles wird in dieser kleinen Auflösung gezeichnet
// und dann scharf hochskaliert – daher kommt der Pixel-Art-Look.
export const VIEW_W = 320;
export const VIEW_H = 180;

// Breite der begehbaren Welt (die Kamera scrollt darüber).
export const WORLD_W = 960;

// Oberkante der Wiese und die Linie, auf der die Spielfigur läuft.
export const GROUND_Y = 146;
export const WALK_Y = 158;

// Der Wunschbrunnen, an dem Sammelstücke gezogen werden.
export const WELL_X = 428;
export const WELL_RANGE = 24;

// Das Expeditionslager mit der Truhe.
export const CAMP_X = 545;
export const CHEST_X = 560;
export const CAMP_RANGE = 26;

// Der Dungeon-Eingang.
export const DUNGEON_X = 74;
export const DUNGEON_RANGE = 22;

// Die Bossarena.
export const ARENA_X = 716;
export const ARENA_RANGE = 26;

// Ein ganzer Tag-Nacht-Zyklus dauert so viele Sekunden Spielzeit.
export const DAY_LENGTH = 720;

// Haustür des Häuschens
export const HOUSE_X = 209;
export const HOUSE_RANGE = 9;

// Mine am rechten Ende der Welt und der Platz des Erzhändlers neben dem Brunnen
export const MINE_X = 892;
export const MINE_RANGE = 22;
export const TRADER_X = 462;
export const TRADER_RANGE = 10;

// Schmiede-Anbau links am Haus
export const FORGE_X = 180;
export const FORGE_RANGE = 10;

// Garten im eingezäunten Bereich rechts vom Haus
export const GARDEN_X = 298;
export const GARDEN_RANGE = 44;
export const GARDEN_BED_X = 258; // linker Rand des ersten Beets
export const GARDEN_BED_STEP = 14;

// Wegweiser ins Dorf am linken Rand des Hofs
export const VILLAGE_SIGN_X = 36;
export const VILLAGE_SIGN_RANGE = 11;
