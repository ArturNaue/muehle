# CLAUDE.md – Mühle PWA

> Projektspezifische Regeln. Ergänzt `../../CLAUDE.md` (Root) und `../CLAUDE.md` (HTML).
> Bei Widerspruch gilt diese Datei.

-----

## Projektübersicht

**Name:** Mühle
**Typ:** Klassisches Brettspiel als Progressive Web App (PWA)
**Status:** v1.0.0 – Grundversion fertig
**URL:** `artur.ch/apps/Muehle/`
**Erstellt:** 2026-05-31

-----

## Techstack

| Technologie        | Version  | Zweck                        |
|--------------------|----------|------------------------------|
| React              | 19.x     | UI-Framework                 |
| TypeScript         | 6.x      | Typsicherheit                |
| Vite               | 8.x      | Build-Tool + Dev-Server      |
| @tailwindcss/vite  | 4.x      | CSS-Utilities als Vite-Plugin|
| vite-plugin-pwa    | 1.3.x    | Service Worker, Manifest     |
| Exo 2 (Google Font)| –        | Schrift                      |

> **Tailwind v4 Bug:** Der Scanner erkennt Klassen in `.tsx`-Dateien nicht zuverlässig.
> Alle verwendeten Utilities **müssen manuell** in `src/index.css` unter `@layer utilities` aufgeführt werden.

-----

## Projektstruktur

```
Muehle/
├── public/
│   ├── pwa-192x192.png       ← PWA-Icon (generiert via generate-icons.js)
│   └── pwa-512x512.png       ← PWA-Icon (generiert via generate-icons.js)
├── src/
│   ├── components/
│   │   ├── Board.tsx          ← SVG-Spielfeld + Interaktion
│   │   ├── GameScreen.tsx     ← Game-Layout (Controls, Heading, Board)
│   │   ├── PlayerCard.tsx     ← Spieler-Info-Karte (Name, Steine, Status)
│   │   └── Setup.tsx          ← Startbildschirm (Spieleranzahl, Namen)
│   ├── game/
│   │   ├── constants.ts       ← NODES, EDGES, MILLS, NEIGHBORS, etc.
│   │   ├── reducer.ts         ← gameReducer, makeInitialState, Action-Types
│   │   └── types.ts           ← TypeScript-Typen (GameState, GameSnapshot, ...)
│   ├── App.tsx                ← Root-Komponente (Setup ↔ GameScreen)
│   ├── index.css              ← Tailwind + alle CSS-Utilities
│   └── main.tsx               ← ReactDOM.render + PWA Service Worker
├── generate-icons.js          ← Node-Skript: generiert PNG-Icons ohne externe Deps
├── index.html                 ← HTML-Einstiegspunkt (Exo 2 Font)
├── package.json
├── tsconfig.json
└── vite.config.ts             ← base: '/apps/Muehle/', PWA-Config
```

-----

## Spiellogik

### Spielmodi
| Modus    | Spieler | Steine pro Spieler | Farben              |
|----------|---------|--------------------|---------------------|
| Klassisch| 2       | 9                  | Weiss, Schwarz      |
| 3-Spieler| 3       | 6                  | Weiss, Schwarz, Rot |

### Phasen (GamePhase)
| Phase      | Beschreibung                                        |
|------------|-----------------------------------------------------|
| `placing`  | Steine abwechselnd auf leere Knoten setzen          |
| `moving`   | Stein auf benachbarten freien Knoten ziehen         |
| `removing` | Mühle geschlossen → Gegnerstein auswählen & schlagen|
| `gameover` | Sieger ermittelt                                    |

> **Springmodus:** Wenn ein Spieler nur noch ≤ 3 Steine hat, darf er auf beliebige freie Knoten springen (Phase bleibt `moving`, `canJump = true`).

### Spielfeld-Knotennummern (NODES[0..23])
```
 0 ------- 1 ------- 2
 |  8 --- 9 --- 10   |
 |  | 16-17-18 |     |
 3-11-19       20-12-4
 |  | 21-22-23 |     |
 |  13--14--15  |    |
 5 ------- 6 ------- 7
```
*(Inneres Quadrat: 16–23, Mittleres: 8–15, Äusseres: 0–7)*

### Mühlen (MILLS – 16 Stück)
- Äussere Seiten: `[0,1,2]`, `[2,4,7]`, `[7,6,5]`, `[5,3,0]`
- Mittlere Seiten: `[8,9,10]`, `[10,12,15]`, `[15,14,13]`, `[13,11,8]`
- Innere Seiten: `[16,17,18]`, `[18,20,23]`, `[23,22,21]`, `[21,19,16]`
- Kreuze: `[1,9,17]`, `[4,12,20]`, `[6,14,22]`, `[3,11,19]`

### Eliminierung (3-Spieler)
Ein Spieler wird eliminiert, wenn:
- Er ≤ 2 Steine auf dem Brett hat (und alle Steine gesetzt wurden)
- Er blockiert ist (keine legalen Züge, kein Springmodus)

Bei Eliminierung werden alle seine Steine sofort vom Brett entfernt.

-----

## Wichtige Konventionen

- **HTML-IDs:** Präfix `muehle-*` (z.B. `muehle-board-svg`, `muehle-ctrl-btn`)
- **CSS-Klassen:** Präfix `muehle-*` für projektspezifische Klassen
- **Versionierung:** Kopfkommentar in jeder Datei: `// v1.0.0 | YYYY-MM-DD MEZ`
- **Undo/Redo:** History-Stack im `GameState`, Snapshots als Array

-----

## npm-Befehle

```bash
npm run dev      # Dev-Server starten (http://localhost:5173)
npm run build    # Produktions-Build → dist/
npm run icons    # PWA-Icons neu generieren → public/pwa-*.png
```

-----

## Deployment

1. `npm run build` → `dist/` Ordner
2. Inhalt von `dist/` per FTP auf `artur.ch/apps/Muehle/` hochladen
3. Sicherstellen, dass `vite.config.ts` `base: '/apps/Muehle/'` hat ✓

-----

## Offene Punkte / Ideen

- [ ] Lokaler Spielstand in `localStorage` speichern (optional)
- [ ] Spielstatistik (Gewinnzähler über mehrere Partien)
- [ ] Animationen beim Stein-Schlagen
- [ ] Sound-Effekte (optional)
- [ ] KI-Gegner (Minimax / einfache Heuristik)

-----

*© A.N. 05/2026*
