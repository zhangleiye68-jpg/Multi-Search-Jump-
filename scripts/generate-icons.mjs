import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { deflateSync } from "node:zlib";

const ICONS = [
  ["extension/assets/icons/icon16.png", 16],
  ["extension/assets/icons/icon48.png", 48],
  ["extension/assets/icons/icon128.png", 128],
];

function crc32(buffer) {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc ^= byte;

    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const lengthBuffer = Buffer.alloc(4);
  const crcBuffer = Buffer.alloc(4);

  lengthBuffer.writeUInt32BE(data.length);
  crcBuffer.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));

  return Buffer.concat([lengthBuffer, typeBuffer, data, crcBuffer]);
}

function distanceToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared));
  const x = ax + t * dx;
  const y = ay + t * dy;

  return Math.hypot(px - x, py - y);
}

function renderPixel(size, x, y) {
  const padding = size * 0.08;
  const roundedCorner = size * 0.14;
  const nearestX = Math.max(padding + roundedCorner, Math.min(x, size - padding - roundedCorner));
  const nearestY = Math.max(padding + roundedCorner, Math.min(y, size - padding - roundedCorner));
  const outsideCorner = Math.hypot(x - nearestX, y - nearestY) > roundedCorner;

  if (x < padding || y < padding || x > size - padding || y > size - padding || outsideCorner) {
    return [0, 0, 0, 0];
  }

  const blend = y / size;
  let red = Math.round(20 - blend * 5);
  let green = Math.round(107 - blend * 18);
  let blue = Math.round(99 - blend * 9);
  let alpha = 255;

  const centerX = size * 0.42;
  const centerY = size * 0.42;
  const radius = size * 0.19;
  const stroke = Math.max(1.35, size * 0.045);
  const lensDistance = Math.hypot(x - centerX, y - centerY);
  const onLens = Math.abs(lensDistance - radius) <= stroke;
  const onHandle = distanceToSegment(
    x,
    y,
    centerX + radius * 0.72,
    centerY + radius * 0.72,
    size * 0.75,
    size * 0.75,
  ) <= stroke * 1.08;

  if (onLens || onHandle) {
    red = 255;
    green = 248;
    blue = 235;
  }

  const accentDistance = Math.hypot(x - size * 0.72, y - size * 0.28);
  if (accentDistance < size * 0.055) {
    red = 226;
    green = 167;
    blue = 56;
    alpha = 255;
  }

  return [red, green, blue, alpha];
}

function createPng(size) {
  const rows = [];

  for (let y = 0; y < size; y += 1) {
    const row = Buffer.alloc(1 + size * 4);
    row[0] = 0;

    for (let x = 0; x < size; x += 1) {
      const [red, green, blue, alpha] = renderPixel(size, x + 0.5, y + 0.5);
      const index = 1 + x * 4;
      row[index] = red;
      row[index + 1] = green;
      row[index + 2] = blue;
      row[index + 3] = alpha;
    }

    rows.push(row);
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(Buffer.concat(rows))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

for (const [file, size] of ICONS) {
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, createPng(size));
}
