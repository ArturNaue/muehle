// Generates pwa-192x192.png and pwa-512x512.png for the Mühle PWA
// Icon zeigt das Mühle-Spielfeld: 3 konzentrische Quadrate + Kreuzverbindungen + Scheiben
// v1.1.0 | 2026-06-01 MEZ
const fs = require('fs');
const zlib = require('zlib');

// ─── PNG-Hilfsfunktionen ──────────────────────────────────────────────────────

const crcTable = (() => {
  const t = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = -1;
  for (const b of buf) crc = crcTable[(crc ^ b) & 0xFF] ^ (crc >>> 8);
  return (crc ^ -1) >>> 0;
}

function pngChunk(type, data) {
  const lenBuf = Buffer.alloc(4); lenBuf.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type);
  const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

// ─── Zeichen-Hilfsfunktionen ──────────────────────────────────────────────────

function setPixel(pixels, x, y, size, r, g, b, a = 255) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || x >= size || y < 0 || y >= size) return;
  const idx = (y * size + x) * 4;
  // Alpha-Blending über bestehende Farbe
  const srcA = a / 255;
  pixels[idx]   = Math.round(r * srcA + pixels[idx]   * (1 - srcA));
  pixels[idx+1] = Math.round(g * srcA + pixels[idx+1] * (1 - srcA));
  pixels[idx+2] = Math.round(b * srcA + pixels[idx+2] * (1 - srcA));
  pixels[idx+3] = Math.min(255, pixels[idx+3] + a);
}

/** Anti-aliased Wu-Linie */
function drawLine(pixels, x0, y0, x1, y1, size, r, g, b, thick = 1) {
  const steps = Math.ceil(Math.sqrt((x1-x0)**2 + (y1-y0)**2)) * 3;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const cx = x0 + t * (x1 - x0);
    const cy = y0 + t * (y1 - y0);
    for (let dy = -thick; dy <= thick; dy++) {
      for (let dx = -thick; dx <= thick; dx++) {
        const d = Math.sqrt(dx*dx + dy*dy);
        if (d <= thick) {
          const alpha = Math.round(255 * Math.max(0, 1 - d / thick));
          setPixel(pixels, cx + dx, cy + dy, size, r, g, b, alpha);
        }
      }
    }
  }
}

/** Gefüllter Kreis mit optionalem Glanzlicht */
function drawDisc(pixels, cx, cy, radius, size, r, g, b, shine = true) {
  for (let y = Math.floor(cy - radius - 1); y <= Math.ceil(cy + radius + 1); y++) {
    for (let x = Math.floor(cx - radius - 1); x <= Math.ceil(cx + radius + 1); x++) {
      const d = Math.sqrt((x - cx)**2 + (y - cy)**2);
      if (d <= radius) {
        // Leichte Randaufhellung (weicher Rand)
        const edge = Math.max(0, 1 - Math.max(0, d - (radius - 1.5)));
        setPixel(pixels, x, y, size, r, g, b, Math.round(255 * edge));
      }
    }
  }
  // Glanzlicht oben-links
  if (shine) {
    const sr = radius * 0.35, scx = cx - radius * 0.25, scy = cy - radius * 0.28;
    for (let y = Math.floor(scy - sr); y <= Math.ceil(scy + sr); y++) {
      for (let x = Math.floor(scx - sr); x <= Math.ceil(scx + sr); x++) {
        const d = Math.sqrt((x - scx)**2 + (y - scy)**2);
        if (d < sr) {
          const alpha = Math.round(160 * (1 - d / sr));
          setPixel(pixels, x, y, size, 255, 255, 255, alpha);
        }
      }
    }
  }
}

/** Kleiner Knoten-Punkt */
function drawNode(pixels, cx, cy, r, size, nr, ng, nb) {
  for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y++) {
    for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) {
      const d = Math.sqrt((x - cx)**2 + (y - cy)**2);
      if (d < r) {
        setPixel(pixels, x, y, size, nr, ng, nb, 255);
      } else if (d < r + 1) {
        setPixel(pixels, x, y, size, nr, ng, nb, Math.round(255 * (1 - (d - r))));
      }
    }
  }
}

// ─── Icon-Zeichenfunktion ─────────────────────────────────────────────────────

function createMuehleIcon(size) {
  const cx = size / 2, cy = size / 2;
  const outerClip = size * 0.47;
  const pixels = Buffer.alloc(size * size * 4, 0);

  // Hintergrund: dunkle Kreisscheibe mit leichtem Verlauf
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.sqrt((x - cx)**2 + (y - cy)**2);
      if (d > outerClip) continue; // transparent
      // Hintergrundfarbe: dunkles Marineblau mit radialem Verlauf
      const t = d / outerClip;
      const r = Math.round(10 + t * 8);
      const g = Math.round(16 + t * 10);
      const bl = Math.round(30 + t * 15);
      const idx = (y * size + x) * 4;
      pixels[idx] = r; pixels[idx+1] = g; pixels[idx+2] = bl; pixels[idx+3] = 255;
    }
  }

  // Äusserer Kreis-Rand (subtile Border)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.sqrt((x - cx)**2 + (y - cy)**2);
      const edge = d - (outerClip - 3);
      if (edge > 0 && edge < 4) {
        const a = Math.round(180 * (1 - edge / 4));
        setPixel(pixels, x, y, size, 55, 70, 95, a);
      }
    }
  }

  // ── Board-Parameter ────────────────────────────────────────────────────────
  const sc = size * 0.38; // äusseres Quadrat (halbe Seitenlänge)
  const sm = size * 0.25; // mittleres Quadrat
  const si = size * 0.12; // inneres Quadrat

  const lineR = 68, lineG = 85, lineB = 110;  // Linienfarbe
  const nodeR = 90, nodeG = 108, nodeB = 132; // Knoten-Farbe
  const thick = Math.max(1, size * 0.012);     // Liniendicke
  const nodeRad = Math.max(2, size * 0.022);   // Knoten-Radius

  // ── Quadrate zeichnen ──────────────────────────────────────────────────────
  const squares = [sc, sm, si];
  for (const s of squares) {
    const x0 = cx - s, x1 = cx + s, y0 = cy - s, y1 = cy + s;
    drawLine(pixels, x0, y0, x1, y0, size, lineR, lineG, lineB, thick); // oben
    drawLine(pixels, x1, y0, x1, y1, size, lineR, lineG, lineB, thick); // rechts
    drawLine(pixels, x1, y1, x0, y1, size, lineR, lineG, lineB, thick); // unten
    drawLine(pixels, x0, y1, x0, y0, size, lineR, lineG, lineB, thick); // links
  }

  // ── Kreuzverbindungen (Mittelpunkte) ───────────────────────────────────────
  // Oben: äusseres Mittelpunkt → inneres Mittelpunkt
  drawLine(pixels, cx, cy - sc, cx, cy - si, size, lineR, lineG, lineB, thick);
  // Unten
  drawLine(pixels, cx, cy + si, cx, cy + sc, size, lineR, lineG, lineB, thick);
  // Links
  drawLine(pixels, cx - sc, cy, cx - si, cy, size, lineR, lineG, lineB, thick);
  // Rechts
  drawLine(pixels, cx + si, cy, cx + sc, cy, size, lineR, lineG, lineB, thick);

  // ── Knoten-Punkte (24 Positionen) ─────────────────────────────────────────
  const nodePositions = [];
  for (const s of squares) {
    // Ecken
    nodePositions.push([cx-s, cy-s],[cx, cy-s],[cx+s, cy-s]);
    nodePositions.push([cx-s, cy],              [cx+s, cy  ]);
    nodePositions.push([cx-s, cy+s],[cx, cy+s],[cx+s, cy+s]);
  }
  for (const [nx, ny] of nodePositions) {
    drawNode(pixels, nx, ny, nodeRad, size, nodeR, nodeG, nodeB);
  }

  // ── Drei Spielscheiben (Weiss, Schwarz, Rot) ───────────────────────────────
  const dR = Math.max(4, size * 0.075);

  // Weisse Scheibe: linker Mittelpunkt des äusseren Quadrats
  drawDisc(pixels, cx - sc, cy, dR, size, 220, 220, 212, true);
  // Rand
  drawLine(pixels, cx-sc-dR, cy, cx-sc+dR, cy, size, 160, 160, 152, Math.max(1, thick*0.5));
  for (let angle = 0; angle < Math.PI*2; angle += 0.05) {
    setPixel(pixels, cx-sc + Math.cos(angle)*dR, cy + Math.sin(angle)*dR, size, 160, 160, 152, 200);
  }

  // Schwarze Scheibe: mittleres Quadrat, oberer Mittelpunkt
  drawDisc(pixels, cx, cy - sm, dR, size, 30, 30, 36, true);

  // Rote Scheibe: inneres Quadrat, rechter Mittelpunkt
  drawDisc(pixels, cx + si, cy, dR, size, 176, 22, 22, true);

  // ── PNG zusammenbauen ──────────────────────────────────────────────────────
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4);
    row[0] = 0;
    for (let x = 0; x < size; x++) {
      const src = (y * size + x) * 4;
      row[1 + x*4]     = pixels[src];
      row[1 + x*4 + 1] = pixels[src+1];
      row[1 + x*4 + 2] = pixels[src+2];
      row[1 + x*4 + 3] = pixels[src+3];
    }
    rows.push(row);
  }
  const raw = Buffer.concat(rows);
  const compressed = zlib.deflateSync(raw, { level: 6 });

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ─── Icons generieren ─────────────────────────────────────────────────────────

const publicDir = './public';
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir);

fs.writeFileSync(`${publicDir}/pwa-192x192.png`, createMuehleIcon(192));
console.log('✓ pwa-192x192.png');
fs.writeFileSync(`${publicDir}/pwa-512x512.png`, createMuehleIcon(512));
console.log('✓ pwa-512x512.png');
