// Run: node public/icons/create-icons.js
// Dependency-free icon generator: classic mine on brand blue.
// Writes icon-192.png and icon-512.png next to this script.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));

const crcTable = new Int32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function writePng(size, pixels) {
  const stride = size * 3 + 1;
  const raw = Buffer.alloc(stride * size);
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0;
    pixels.copy(raw, y * stride + 1, y * size * 3, (y + 1) * size * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function drawMine(size) {
  const px = Buffer.alloc(size * size * 3);
  for (let i = 0; i < size * size; i++) {
    px[i * 3] = 5;
    px[i * 3 + 1] = 150;
    px[i * 3 + 2] = 105;
  }
  const set = (x, y, r, g, b) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 3;
    px[i] = r;
    px[i + 1] = g;
    px[i + 2] = b;
  };
  const disc = (cx, cy, r, color) => {
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy <= r * r) set(x, y, ...color);
      }
    }
  };
  const c = size / 2;
  const ink = [26, 26, 26];
  const spikeLen = size * 0.34;
  const spikeW = Math.max(2, size * 0.032);
  const d = spikeLen * 0.72;
  const lines = [
    [[c - spikeLen, c], [c + spikeLen, c]],
    [[c, c - spikeLen], [c, c + spikeLen]],
    [[c - d, c - d], [c + d, c + d]],
    [[c - d, c + d], [c + d, c - d]],
  ];
  for (const [[x0, y0], [x1, y1]] of lines) {
    const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
    for (let s = 0; s <= steps; s++) {
      disc(x0 + ((x1 - x0) * s) / steps, y0 + ((y1 - y0) * s) / steps, spikeW, ink);
    }
  }
  const R = size * 0.22;
  disc(c, c, R, ink);
  disc(c - R * 0.36, c - R * 0.38, R * 0.26, [255, 255, 255]);
  return px;
}

for (const size of [192, 512]) {
  fs.writeFileSync(path.join(dir, `icon-${size}.png`), writePng(size, drawMine(size)));
  console.log(`wrote icon-${size}.png`);
}
