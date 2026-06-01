// Generates pwa-192x192.png and pwa-512x512.png for the Mühle PWA
// v1.0.0 | 2026-05-31 MEZ
const fs = require('fs');
const zlib = require('zlib');

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

function createMuehleIcon(size) {
  const cx = size / 2, cy = size / 2;
  const outerR = size * 0.48;

  // Mühle-Brett: 3 konzentrische Quadrate (vereinfacht als Kreise)
  const rings = [0.42, 0.28, 0.14].map(r => r * size);

  // Steine: weiss oben-links, schwarz unten-rechts, rot rechts
  const stoneR = size * 0.055;
  const stones = [
    { x: cx - size * 0.18, y: cy - size * 0.18, r: [230, 230, 230] },
    { x: cx + size * 0.18, y: cy + size * 0.18, r: [25,  25,  30]  },
    { x: cx + size * 0.18, y: cy - size * 0.06, r: [185, 28,  28]  },
  ];

  const pixels = Buffer.alloc(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > outerR) {
        pixels[idx + 3] = 0; continue; // transparent
      }

      let r = 17, g = 24, b = 39, a = 255; // Hintergrund

      // Ringe zeichnen (als Linie)
      for (const ring of rings) {
        const inner = ring - size * 0.018;
        const outer = ring + size * 0.018;
        if (dist > inner && dist < outer) { r = 75; g = 85; b = 99; }
      }

      // Steine
      for (const s of stones) {
        const sd = Math.sqrt((x - s.x) ** 2 + (y - s.y) ** 2);
        if (sd < stoneR) { r = s.r[0]; g = s.r[1]; b = s.r[2]; }
      }

      pixels[idx] = r; pixels[idx+1] = g; pixels[idx+2] = b; pixels[idx+3] = a;
    }
  }

  // PNG aufbauen
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4);
    row[0] = 0;
    for (let x = 0; x < size; x++) {
      const src = (y * size + x) * 4;
      row[1 + x*4] = pixels[src]; row[1 + x*4+1] = pixels[src+1];
      row[1 + x*4+2] = pixels[src+2]; row[1 + x*4+3] = pixels[src+3];
    }
    rows.push(row);
  }
  const raw = Buffer.concat(rows);
  const compressed = zlib.deflateSync(raw, { level: 6 });

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6;

  return Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

const publicDir = './public';
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir);

fs.writeFileSync(`${publicDir}/pwa-192x192.png`, createMuehleIcon(192));
console.log('✓ pwa-192x192.png');
fs.writeFileSync(`${publicDir}/pwa-512x512.png`, createMuehleIcon(512));
console.log('✓ pwa-512x512.png');
