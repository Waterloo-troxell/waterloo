#!/usr/bin/env node
/**
 * Generates Waterloo's app icons with no image library and no network.
 *
 * The mark is two equal squares, outlined in gold, overlapping: two owners,
 * the same size, sharing the middle. It is drawn here in code rather than
 * checked in as a binary blob so it stays reproducible and reviewable.
 *
 *   npm run icons
 */
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BG = [0x0a, 0x0a, 0x0b];
const GOLD = [0xb8, 0x97, 0x5a];

/* ---------- PNG encoding ---------- */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([length, typeBuf, data, crc]);
}

function encodePng(size, rgb) {
  const stride = size * 3 + 1;
  const raw = Buffer.alloc(stride * size);
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0; // filter: none
    rgb.copy(raw, y * stride + 1, y * size * 3, (y + 1) * size * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* ---------- the mark ---------- */

/** Coverage of the two overlapping square outlines at a point, 0 or 1. */
function onMark(x, y, scale) {
  const offset = 0.082 * scale;
  const half = 0.255 * scale;
  const stroke = 0.027 * scale;

  for (const [cx, cy] of [
    [0.5 - offset, 0.5 - offset],
    [0.5 + offset, 0.5 + offset],
  ]) {
    const d = Math.max(Math.abs(x - cx), Math.abs(y - cy));
    if (d <= half && d >= half - stroke) return 1;
  }
  return 0;
}

function render(size, scale) {
  const rgb = Buffer.alloc(size * size * 3);
  const samples = 4; // 4x4 supersampling, so the edges are not jagged
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let hits = 0;
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const x = (px + (sx + 0.5) / samples) / size;
          const y = (py + (sy + 0.5) / samples) / size;
          hits += onMark(x, y, scale);
        }
      }
      const a = hits / (samples * samples);
      const i = (py * size + px) * 3;
      for (let c = 0; c < 3; c++) {
        rgb[i + c] = Math.round(BG[c] * (1 - a) + GOLD[c] * a);
      }
    }
  }
  return encodePng(size, rgb);
}

const outputs = [
  ["public/icon-192.png", 192, 1],
  ["public/icon-512.png", 512, 1],
  // Maskable icons get cropped to a circle, so the mark is pulled inward.
  ["public/icon-maskable-512.png", 512, 0.72],
  ["public/apple-touch-icon.png", 180, 1],
  ["app/icon.png", 64, 1],
];

for (const [path, size, scale] of outputs) {
  const png = render(size, scale);
  writeFileSync(join(ROOT, path), png);
  console.log(`  ${path}  ${size}x${size}  ${png.length} bytes`);
}
console.log("Icons written.");
