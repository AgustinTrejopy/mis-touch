// Genera los íconos PNG de la PWA sin dependencias (zlib de Node). Uso: npm run icons
// Diseño: cuatro tapas de marcador en cuadrícula 2×2 sobre el fondo cálido de la app.
// Los colores provienen del catálogo: R4 Vivid Red, Y34 Yellow, PB71 Cobalt Blue, G46 Vivid Green.
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const BACKGROUND = [0xf7, 0xf6, 0xf2];
const SWATCHES = [
  [0xe6, 0x00, 0x2b],
  [0xff, 0xd6, 0x00],
  [0x19, 0x76, 0xd2],
  [0x4c, 0xaf, 0x50],
];

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(size, rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bits por canal
  header[9] = 6; // RGBA
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** ¿El punto (px, py) cae dentro del rectángulo redondeado? Coordenadas normalizadas 0–1. */
function inRoundedRect(px, py, x, y, w, h, r) {
  const cx = Math.min(Math.max(px, x + r), x + w - r);
  const cy = Math.min(Math.max(py, y + r), y + h - r);
  return (px - cx) ** 2 + (py - cy) ** 2 <= r * r;
}

/**
 * @param size lado en px
 * @param content fracción del lienzo que ocupa la cuadrícula de tapas
 * @param backgroundRadius radio del fondo (0 = a sangre, para maskable/apple)
 */
function drawIcon(size, content, backgroundRadius) {
  const rgba = Buffer.alloc(size * size * 4);
  const samples = 4;
  const gap = content * 0.08;
  const tile = (content - gap) / 2;
  const origin = (1 - content) / 2;
  const tiles = SWATCHES.map((color, i) => ({
    color,
    x: origin + (i % 2) * (tile + gap),
    y: origin + Math.floor(i / 2) * (tile + gap),
  }));

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const px = (x + (sx + 0.5) / samples) / size;
          const py = (y + (sy + 0.5) / samples) / size;
          if (!inRoundedRect(px, py, 0, 0, 1, 1, backgroundRadius)) continue;
          const hit = tiles.find((t) => inRoundedRect(px, py, t.x, t.y, tile, tile, tile * 0.2));
          const [cr, cg, cb] = hit ? hit.color : BACKGROUND;
          r += cr; g += cg; b += cb; a += 1;
        }
      }
      const offset = (y * size + x) * 4;
      if (a > 0) {
        rgba[offset] = Math.round(r / a);
        rgba[offset + 1] = Math.round(g / a);
        rgba[offset + 2] = Math.round(b / a);
      }
      rgba[offset + 3] = Math.round((a / (samples * samples)) * 255);
    }
  }
  return encodePng(size, rgba);
}

const out = new URL('../public/icons/', import.meta.url);
writeFileSync(new URL('icon-192.png', out), drawIcon(192, 0.62, 0.22));
writeFileSync(new URL('icon-512.png', out), drawIcon(512, 0.62, 0.22));
// Maskable: contenido dentro de la zona segura (círculo del 80%).
writeFileSync(new URL('icon-maskable-512.png', out), drawIcon(512, 0.5, 0));
writeFileSync(new URL('apple-touch-icon.png', out), drawIcon(180, 0.58, 0));
console.log('Íconos generados en public/icons/');
