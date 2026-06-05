// v1.4.0 | 2026-06-02 MEZ
import { PlayerColor } from './types';

// ─── Board Variant ────────────────────────────────────────────────────────────

export type BoardVariant = 'standard' | 'sonnenmuhle' | 'zwolf' | 'morabaraba' | 'vollmuhle' | 'hexagonal' | 'sonne' | 'funfeck';

export const BOARD_VARIANT_LABELS: Record<BoardVariant, string> = {
  standard:    'Klassische Mühle',
  sonnenmuhle: 'Eckdiagonal-Mühle',
  zwolf:       '12-Stein-Mühle',
  morabaraba:  'Morabaraba',
  vollmuhle:   'Alle-Diagonalen-Mühle',
  hexagonal:   'Wabenmühle',
  sonne:        'Sonnenmühle',
  funfeck:      'Fünfeck-Mühle',
};

export const BOARD_VARIANT_DESC: Record<BoardVariant, string> = {
  standard:    '3 Ringe · 16 Mühlen · 9 Steine',
  sonnenmuhle: '3 Ringe · 20 Mühlen · 9 Steine · Eckdiagonalen',
  zwolf:       'Standardbrett · 16 Mühlen · 12 Steine',
  morabaraba:  '3 Ringe · 20 Mühlen · 12 Steine · Eckdiagonalen',
  vollmuhle:   '3 Ringe · 20 Mühlen · 9 Steine · Eck- und X-Diagonalen',
  hexagonal:   '3 Sechsecke · 30 Mühlen · 10 Steine · 36 Knoten',
  sonne:        '32 Punkte · 21 Mühlen · 12 Steine · Sonnenbrett',
  funfeck:      '3 Fünfecke · 25 Mühlen · 10 Steine · 30 Knoten',
};

/** Steine pro Spieler je Variante und Spieleranzahl */
export const STONES_BY_VARIANT: Record<BoardVariant, Record<2|3, number>> = {
  standard:    { 2: 9,  3: 6 },
  sonnenmuhle: { 2: 9,  3: 6 },
  zwolf:       { 2: 12, 3: 7 },
  morabaraba:  { 2: 12, 3: 7 },
  vollmuhle:   { 2: 9,  3: 6 },
  hexagonal:   { 2: 10, 3: 7 },
  sonne:        { 2: 12, 3: 8 },
  funfeck:      { 2: 10, 3: 7 },
};

function buildNeighbors(nodeCount: number, edges: [number, number][]): number[][] {
  const neighbors = Array.from({ length: nodeCount }, () => [] as number[]);
  for (const [a, b] of edges) {
    neighbors[a].push(b);
    neighbors[b].push(a);
  }
  return neighbors;
}

// ─── Standard-Mühle Board (24 Knoten, 3 konzentrische Quadrate) ───────────────
//
//  0 ------- 1 ------- 2
//  |  8 --- 9 --- 10   |
//  |  | 16-17-18  |    |
//  3-11-19       20-12-4
//  |  | 21-22-23  |    |
//  |  13--14--15  |    |
//  5 ------- 6 ------- 7
//
// Äusseres Quadrat (0–7):  ±120
// Mittleres Quadrat (8–15): ±80
// Inneres Quadrat (16–23):  ±40

const STANDARD_NODES: [number, number][] = [
  [-120,-120],[   0,-120],[ 120,-120],  // 0,1,2
  [-120,   0],             [ 120,   0], // 3,4
  [-120, 120],[   0, 120],[ 120, 120],  // 5,6,7
  [ -80, -80],[   0, -80],[  80, -80],  // 8,9,10
  [ -80,   0],             [  80,   0], // 11,12
  [ -80,  80],[   0,  80],[  80,  80],  // 13,14,15
  [ -40, -40],[   0, -40],[  40, -40],  // 16,17,18
  [ -40,   0],             [  40,   0], // 19,20
  [ -40,  40],[   0,  40],[  40,  40],  // 21,22,23
];

const STANDARD_EDGES: [number, number][] = [
  [0,1],[1,2],[2,4],[4,7],[7,6],[6,5],[5,3],[3,0],
  [8,9],[9,10],[10,12],[12,15],[15,14],[14,13],[13,11],[11,8],
  [16,17],[17,18],[18,20],[20,23],[23,22],[22,21],[21,19],[19,16],
  [1,9],[9,17],[4,12],[12,20],[6,14],[14,22],[3,11],[11,19],
];

const STANDARD_MILLS: number[][] = [
  [0,1,2],[2,4,7],[7,6,5],[5,3,0],
  [8,9,10],[10,12,15],[15,14,13],[13,11,8],
  [16,17,18],[18,20,23],[23,22,21],[21,19,16],
  [1,9,17],[4,12,20],[6,14,22],[3,11,19],
];

const STANDARD_NEIGHBORS: number[][] = [
  [1,3],          // 0
  [0,2,9],        // 1
  [1,4],          // 2
  [0,5,11],       // 3
  [2,7,12],       // 4
  [6,3],          // 5
  [5,7,14],       // 6
  [4,6],          // 7
  [9,11],         // 8
  [8,10,1,17],    // 9
  [9,12],         // 10
  [8,13,3,19],    // 11
  [10,15,4,20],   // 12
  [11,14],        // 13
  [15,13,6,22],   // 14
  [12,14],        // 15
  [17,19],        // 16
  [16,18,9],      // 17
  [17,20],        // 18
  [16,21,11],     // 19
  [18,23,12],     // 20
  [19,22],        // 21
  [21,23,14],     // 22
  [20,22],        // 23
];

// ─── Eckdiagonal-Mühle / Morabaraba: Eck-Diagonalen zwischen Ringen ──────────
// Verbindet Ecken benachbarter Ringe: [0↔8↔16], [2↔10↔18], [5↔13↔21], [7↔15↔23]
// Erzeugt 4 neue Mühlen entlang der Diagonalen.

const SONNENMUHLE_EXTRA_EDGES: [number, number][] = [
  [0,8],[8,16],[2,10],[10,18],[5,13],[13,21],[7,15],[15,23],
];

const SONNENMUHLE_EXTRA_MILLS: number[][] = [
  [0,8,16],[2,10,18],[5,13,21],[7,15,23],
];

const SONNENMUHLE_NEIGHBORS: number[][] = [
  [1,3,8],         // 0
  [0,2,9],         // 1
  [1,4,10],        // 2
  [0,5,11],        // 3
  [2,7,12],        // 4
  [6,3,13],        // 5
  [5,7,14],        // 6
  [4,6,15],        // 7
  [9,11,0,16],     // 8
  [8,10,1,17],     // 9
  [9,12,2,18],     // 10
  [8,13,3,19],     // 11
  [10,15,4,20],    // 12
  [11,14,5,21],    // 13
  [15,13,6,22],    // 14
  [12,14,7,23],    // 15
  [17,19,8],       // 16
  [16,18,9],       // 17
  [17,20,10],      // 18
  [16,21,11],      // 19
  [18,23,12],      // 20
  [19,22,13],      // 21
  [21,23,14],      // 22
  [20,22,15],      // 23
];

// ─── X-Diagonalen (Mittelpunkte → Ecken nächster Ring) ───────────────────────
// 16 zusätzliche Kanten, je 8 X-Muster, keine neuen Mühlen.

const X_DIAGONAL_EXTRA_EDGES: [number, number][] = [
  [1,8],[1,10],[4,10],[4,15],[6,13],[6,15],[3,8],[3,13],
  [9,16],[9,18],[12,18],[12,23],[14,21],[14,23],[11,16],[11,21],
];

const X_DIAGONAL_NEIGHBORS: number[][] = [
  [1,3],               // 0
  [0,2,9, 8,10],       // 1
  [1,4],               // 2
  [0,5,11, 8,13],      // 3
  [2,7,12, 10,15],     // 4
  [6,3],               // 5
  [5,7,14, 13,15],     // 6
  [4,6],               // 7
  [9,11, 1,3],         // 8
  [8,10,1,17, 16,18],  // 9
  [9,12, 1,4],         // 10
  [8,13,3,19, 16,21],  // 11
  [10,15,4,20, 18,23], // 12
  [11,14, 3,6],        // 13
  [15,13,6,22, 21,23], // 14
  [12,14, 4,6],        // 15
  [17,19, 9,11],       // 16
  [16,18,9],           // 17
  [17,20, 9,12],       // 18
  [16,21,11],          // 19
  [18,23,12],          // 20
  [19,22, 11,14],      // 21
  [21,23,14],          // 22
  [20,22, 12,14],      // 23
];

// ─── Alle-Diagonalen-Mühle: Eckdiagonalen + X-Diagonalen kombiniert ──────────
// Alle 24 Diagonal-Kanten auf einmal:
//   - 8 Eck-Diagonalen
//   - 16 X-Diagonalen
// Mühlen: Standard-16 + Eckdiagonal-4 = 20
// NEIGHBORS: Vereinigung beider Varianten

const VOLLMUHLE_NEIGHBORS: number[][] = [
  [1,3,8],               // 0  (sonne: +8)
  [0,2,9, 8,10],         // 1  (morab: +8,+10)
  [1,4, 10],             // 2  (sonne: +10)
  [0,5,11, 8,13],        // 3  (morab: +8,+13)
  [2,7,12, 10,15],       // 4  (morab: +10,+15)
  [6,3, 13],             // 5  (sonne: +13)
  [5,7,14, 13,15],       // 6  (morab: +13,+15)
  [4,6, 15],             // 7  (sonne: +15)
  [9,11, 0,16, 1,3],     // 8  (sonne: +0,+16  morab: +1,+3)
  [8,10,1,17, 16,18],    // 9  (morab: +16,+18)
  [9,12, 2,18, 1,4],     // 10 (sonne: +2,+18  morab: +1,+4)
  [8,13,3,19, 16,21],    // 11 (morab: +16,+21)
  [10,15,4,20, 18,23],   // 12 (morab: +18,+23)
  [11,14, 5,21, 3,6],    // 13 (sonne: +5,+21  morab: +3,+6)
  [15,13,6,22, 21,23],   // 14 (morab: +21,+23)
  [12,14, 7,23, 4,6],    // 15 (sonne: +7,+23  morab: +4,+6)
  [17,19, 8, 9,11],      // 16 (sonne: +8  morab: +9,+11)
  [16,18,9],             // 17
  [17,20, 10, 9,12],     // 18 (sonne: +10  morab: +9,+12)
  [16,21,11],            // 19
  [18,23,12],            // 20
  [19,22, 13, 11,14],    // 21 (sonne: +13  morab: +11,+14)
  [21,23,14],            // 22
  [20,22, 15, 12,14],    // 23 (sonne: +15  morab: +12,+14)
];

// ─── Wabenmühle / Sechseck-Mühle (Hexagonal Morris) ──────────────────────────
//
// 3 konzentrische Sechsecke, je 12 Knoten (6 Ecken + 6 Seitenmittelpunkte)
// = 36 Knoten total (0–35).
//
// Knoten-Nummern pro Ring (k=0..11, Spitze oben, im Uhrzeigersinn):
//   gerade k   → Ecke     (Radius R)
//   ungerade k → Mittelpunkt der Seite (Radius R·√3/2)
//
//    Aussen (0–11, R=120 / r=104):
//       0
//    11   1
//   10     2
//    9     3
//   8      4
//    7    5
//       6
//
//    Mitte (12–23, R=80 / r=69)    Innen (24–35, R=40 / r=35)
//
// Mühlen:
//   Seiten: je 6 pro Ring × 3 = 18  (Ecke-Mitte-Ecke einer Seite)
//   Speichen: je 6 für Ecken + 6 für Mittelpunkte = 12
//   Total: 30 Mühlen
//
// Kanten: 36 (Ring) + 24 (Speichen) = 60

/** Ecke (gerades k) → Radius R; Seitenmittelpunkt (ungerades k) → R·√3/2 */
function hexNode(R: number, k: number): [number, number] {
  const r = k % 2 === 0 ? R : R * Math.sqrt(3) / 2;
  const angle = k * Math.PI / 6; // 30°-Schritte
  return [Math.round(r * Math.sin(angle)), Math.round(-r * Math.cos(angle))];
}

const HEX_NODES: [number, number][] = [
  // Aussen  (0–11, R=120)
  ...Array.from({length: 12}, (_, k) => hexNode(120, k)) as [number,number][],
  // Mitte   (12–23, R=80)
  ...Array.from({length: 12}, (_, k) => hexNode(80,  k)) as [number,number][],
  // Innen   (24–35, R=40)
  ...Array.from({length: 12}, (_, k) => hexNode(40,  k)) as [number,number][],
];

const HEX_EDGES: [number, number][] = [
  // Ring-Kanten: je 12 fortlaufend (mit Wrap-around)
  ...(Array.from({length: 12}, (_, k): [number,number] => [k, (k+1) % 12])),
  ...(Array.from({length: 12}, (_, k): [number,number] => [12+k, 12+(k+1) % 12])),
  ...(Array.from({length: 12}, (_, k): [number,number] => [24+k, 24+(k+1) % 12])),
  // Speichen: jeder der 12 Knoten verbindet sich radial inward/outward
  ...(Array.from({length: 12}, (_, k): [number,number] => [k, 12+k])),
  ...(Array.from({length: 12}, (_, k): [number,number] => [12+k, 24+k])),
];

const HEX_MILLS: number[][] = [
  // Seiten-Mühlen: Ecke-Mittelpunkt-Ecke (6 pro Ring)
  // Aussen
  [0,1,2],[2,3,4],[4,5,6],[6,7,8],[8,9,10],[10,11,0],
  // Mitte
  [12,13,14],[14,15,16],[16,17,18],[18,19,20],[20,21,22],[22,23,12],
  // Innen
  [24,25,26],[26,27,28],[28,29,30],[30,31,32],[32,33,34],[34,35,24],
  // Speichen-Mühlen: Ecken (gerade k) durch alle 3 Ringe
  [0,12,24],[2,14,26],[4,16,28],[6,18,30],[8,20,32],[10,22,34],
  // Speichen-Mühlen: Seitenmittelpunkte (ungerade k) durch alle 3 Ringe
  [1,13,25],[3,15,27],[5,17,29],[7,19,31],[9,21,33],[11,23,35],
];

const HEX_NEIGHBORS: number[][] = [
  // Aussen (0–11): je 2 Ring-Nachbarn + 1 radial nach innen
  [11,1,12],[0,2,13],[1,3,14],[2,4,15],[3,5,16],[4,6,17],
  [5,7,18],[6,8,19],[7,9,20],[8,10,21],[9,11,22],[10,0,23],
  // Mitte (12–23): je 2 Ring-Nachbarn + 1 nach aussen + 1 nach innen
  [23,13,0,24],[12,14,1,25],[13,15,2,26],[14,16,3,27],
  [15,17,4,28],[16,18,5,29],[17,19,6,30],[18,20,7,31],
  [19,21,8,32],[20,22,9,33],[21,23,10,34],[22,12,11,35],
  // Innen (24–35): je 2 Ring-Nachbarn + 1 radial nach aussen
  [35,25,12],[24,26,13],[25,27,14],[26,28,15],[27,29,16],[28,30,17],
  [29,31,18],[30,32,19],[31,33,20],[32,34,21],[33,35,22],[34,24,23],
];

// ─── Sonnenmühle (32 Punkte aus M5.svg) ──────────────────────────────────────
//
// Aus dem SVG extrahierte Rasterform. Die Kanten wurden an Zwischenpunkten
// gesplittet, damit alle Bewegungen zwischen benachbarten Punkten erfolgen.

const SUN_NODES: [number, number][] = [
  [-40,-120],[ -80,-120],[   0,-120],
  [ -40, -80],[  40, -80],[   0, -80],[ 120, -80],
  [ -40, -40],[ -80, -40],[  40, -40],[   0, -40],[  80, -40],[ 120, -40],
  [ -40,   0],[-120,   0],[ -80,   0],[  40,   0],[  80,   0],[ 120,   0],
  [ -40,  40],[-120,  40],[ -80,  40],[  40,  40],[   0,  40],[  80,  40],
  [ -40,  80],[-120,  80],[  40,  80],[   0,  80],
  [  40, 120],[   0, 120],[  80, 120],
];

const SUN_EDGES: [number, number][] = [
  [0,1],[0,2],[1,3],[2,4],[3,5],[3,8],[3,10],[4,5],
  [6,11],[6,12],[7,10],[7,13],[7,15],[8,14],[8,15],
  [9,10],[9,16],[11,16],[11,17],[12,17],[12,18],[4,11],[0,9],
  [13,19],[13,21],[14,20],[15,20],[15,21],[16,22],
  [17,22],[17,24],[18,24],[19,23],[19,28],[20,26],
  [21,25],[21,26],[22,23],[23,27],[24,27],[25,28],
  [25,30],[27,28],[27,31],[28,29],[29,30],[29,31],
];

const SUN_MILLS: number[][] = [
  [7,10,9],[7,13,19],[19,23,22],[22,16,9],[10,3,1],
  [1,0,2],[6,12,18],[6,11,16],[12,17,22],[18,24,27],
  [3,8,14],[7,15,20],[13,21,26],[21,25,30],[23,27,31],
  [30,29,31],[14,20,26],[8,15,21],[3,5,4],[11,17,24],
  [25,28,27],
];

const SUN_NEIGHBORS = buildNeighbors(SUN_NODES.length, SUN_EDGES);

// ─── Fünfeck-Mühle ───────────────────────────────────────────────────────────
//
// Drei konzentrische Fünfecke mit Eck- und Seitenmittelpunkten.
// Mühlen entstehen entlang jeder Fünfeck-Seite und auf allen radialen Linien.

const PENTAGON_NODES: [number, number][] = [
  [0,-125],[60,-82],[119,-39],[96,31],[73,101],[0,101],[-73,101],[-96,31],[-119,-39],[-59,-82],
  [0,-85],[41,-55],[81,-26],[66,22],[50,69],[0,69],[-50,69],[-65,22],[-81,-26],[-40,-55],
  [0,-45],[22,-29],[43,-14],[35,11],[26,36],[0,36],[-26,36],[-34,11],[-43,-14],[-21,-29],
];

const PENTAGON_EDGES: [number, number][] = [
  [0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9],[9,0],
  [10,11],[11,12],[12,13],[13,14],[14,15],[15,16],[16,17],[17,18],[18,19],[19,10],
  [20,21],[21,22],[22,23],[23,24],[24,25],[25,26],[26,27],[27,28],[28,29],[29,20],
  [0,10],[10,20],[1,11],[11,21],[2,12],[12,22],[3,13],[13,23],[4,14],[14,24],
  [5,15],[15,25],[6,16],[16,26],[7,17],[17,27],[8,18],[18,28],[9,19],[19,29],
];

const PENTAGON_MILLS: number[][] = [
  [0,1,2],[2,3,4],[4,5,6],[6,7,8],[8,9,0],
  [10,11,12],[12,13,14],[14,15,16],[16,17,18],[18,19,10],
  [20,21,22],[22,23,24],[24,25,26],[26,27,28],[28,29,20],
  [0,10,20],[1,11,21],[2,12,22],[3,13,23],[4,14,24],
  [5,15,25],[6,16,26],[7,17,27],[8,18,28],[9,19,29],
];

const PENTAGON_NEIGHBORS = buildNeighbors(PENTAGON_NODES.length, PENTAGON_EDGES);

// ─── Board Config ─────────────────────────────────────────────────────────────

export interface BoardConfig {
  nodes:     [number, number][];
  edges:     [number, number][];
  mills:     number[][];
  neighbors: number[][];
}

export function getBoardConfig(variant: BoardVariant): BoardConfig {
  switch (variant) {
    case 'sonnenmuhle':
      return {
        nodes:     STANDARD_NODES,
        edges:     [...STANDARD_EDGES, ...SONNENMUHLE_EXTRA_EDGES],
        mills:     [...STANDARD_MILLS, ...SONNENMUHLE_EXTRA_MILLS],
        neighbors: SONNENMUHLE_NEIGHBORS,
      };
    case 'zwolf':
      return {
        nodes:     STANDARD_NODES,
        edges:     STANDARD_EDGES,
        mills:     STANDARD_MILLS,
        neighbors: STANDARD_NEIGHBORS,
      };
    case 'morabaraba':
      return {
        nodes:     STANDARD_NODES,
        edges:     [...STANDARD_EDGES, ...SONNENMUHLE_EXTRA_EDGES],
        mills:     [...STANDARD_MILLS, ...SONNENMUHLE_EXTRA_MILLS],
        neighbors: SONNENMUHLE_NEIGHBORS,
      };
    case 'vollmuhle':
      return {
        nodes:     STANDARD_NODES,
        edges:     [...STANDARD_EDGES, ...SONNENMUHLE_EXTRA_EDGES, ...X_DIAGONAL_EXTRA_EDGES],
        mills:     [...STANDARD_MILLS, ...SONNENMUHLE_EXTRA_MILLS],
        neighbors: VOLLMUHLE_NEIGHBORS,
      };
    case 'hexagonal':
      return {
        nodes:     HEX_NODES,
        edges:     HEX_EDGES,
        mills:     HEX_MILLS,
        neighbors: HEX_NEIGHBORS,
      };
    case 'sonne':
      return {
        nodes:     SUN_NODES,
        edges:     SUN_EDGES,
        mills:     SUN_MILLS,
        neighbors: SUN_NEIGHBORS,
      };
    case 'funfeck':
      return {
        nodes:     PENTAGON_NODES,
        edges:     PENTAGON_EDGES,
        mills:     PENTAGON_MILLS,
        neighbors: PENTAGON_NEIGHBORS,
      };
    default: // 'standard'
      return {
        nodes:     STANDARD_NODES,
        edges:     STANDARD_EDGES,
        mills:     STANDARD_MILLS,
        neighbors: STANDARD_NEIGHBORS,
      };
  }
}

/** @deprecated Verwende STONES_BY_VARIANT[variant][playerCount] */
export const STONES_PER_PLAYER: Record<number, number> = { 2: 9, 3: 6 };

export const PLAYER_COLORS_2P: PlayerColor[] = ['WHITE', 'BLACK'];
export const PLAYER_COLORS_3P: PlayerColor[] = ['BLUE', 'RED', 'GREEN'];
export const PLAYER_COLORS: PlayerColor[] = PLAYER_COLORS_3P;
export const PLAYER_COLOR_OPTIONS: PlayerColor[] = ['WHITE', 'BLACK', 'RED', 'GREEN', 'BLUE', 'YELLOW', 'BROWN', 'PURPLE'];

export function getPlayerColors(playerCount: 2 | 3): PlayerColor[] {
  return playerCount === 2 ? PLAYER_COLORS_2P : PLAYER_COLORS_3P;
}

export const COLOR_DISPLAY: Record<PlayerColor, string> = {
  WHITE: 'Weiss', BLACK: 'Schwarz', BLUE: 'Blau', RED: 'Rot', GREEN: 'Grün', YELLOW: 'Gelb', BROWN: 'Braun', PURPLE: 'Violett',
};

export const DEFAULT_NAMES: Record<PlayerColor, string> = {
  WHITE: 'Weiss', BLACK: 'Schwarz', BLUE: 'Blau', RED: 'Rot', GREEN: 'Grün', YELLOW: 'Gelb', BROWN: 'Braun', PURPLE: 'Violett',
};
