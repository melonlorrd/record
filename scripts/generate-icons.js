import fs from 'node:fs';
import zlib from 'node:zlib';

function createCrc32Table() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  return table;
}

const crcTable = createCrc32Table();

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ (-1)) >>> 0;
}

function createChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(4 + 4 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  const typeAndData = buf.subarray(4, 8 + len);
  const crc = crc32(typeAndData);
  buf.writeUInt32BE(crc, 8 + len);
  return buf;
}

function generatePng(size) {
  const width = size;
  const height = size;
  const rawBytesPerRow = 1 + width * 4;
  const rawData = Buffer.alloc(height * rawBytesPerRow);

  const radius = size * 0.42;
  const cx = size / 2;
  const cy = size / 2;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rawBytesPerRow;
    rawData[rowOffset] = 0; // Filter byte: None

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Background rounded box / circle
      if (dist <= radius) {
        // Gradient from emerald (#059669) to ocean blue (#0284c7)
        const t = (x + y) / (width * 2);
        const r = Math.round(5 + (2 - 5) * t);
        const g = Math.round(150 + (132 - 150) * t);
        const b = Math.round(105 + (199 - 105) * t);

        // Simple center symbol (rupee-like bars)
        const inBar1 = (y > cy - size * 0.22 && y < cy - size * 0.16 && x > cx - size * 0.18 && x < cx + size * 0.18);
        const inBar2 = (y > cy - size * 0.10 && y < cy - size * 0.04 && x > cx - size * 0.18 && x < cx + size * 0.18);
        const inStem = (x > cx - size * 0.18 && x < cx - size * 0.12 && y > cy - size * 0.22 && y < cy + size * 0.15);
        const inCurve = (x >= cx - size * 0.12 && x < cx + size * 0.12 && y >= cy - size * 0.16 && y <= cy + size * 0.04);
        const inDiag = (Math.abs((y - (cy + size * 0.04)) - 1.2 * (x - (cx - size * 0.05))) < size * 0.035 && y > cy + size * 0.02 && y < cy + size * 0.25);

        if (inBar1 || inBar2 || inStem || inCurve || inDiag) {
          rawData[pixelOffset] = 255;     // R
          rawData[pixelOffset + 1] = 255; // G
          rawData[pixelOffset + 2] = 255; // B
          rawData[pixelOffset + 3] = 255; // A
        } else {
          rawData[pixelOffset] = r;
          rawData[pixelOffset + 1] = g;
          rawData[pixelOffset + 2] = b;
          rawData[pixelOffset + 3] = 255;
        }
      } else {
        // Outer background dark slate #0f172a
        rawData[pixelOffset] = 15;
        rawData[pixelOffset + 1] = 23;
        rawData[pixelOffset + 2] = 42;
        rawData[pixelOffset + 3] = 255;
      }
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8-bit depth
  ihdr[9] = 6; // RGBA color type
  ihdr[10] = 0; // Deflate compression
  ihdr[11] = 0; // Filter method
  ihdr[12] = 0; // No interlace

  const idatData = zlib.deflateSync(rawData);

  const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrChunk = createChunk('IHDR', ihdr);
  const idatChunk = createChunk('IDAT', idatData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([pngSignature, ihdrChunk, idatChunk, iendChunk]);
}

fs.writeFileSync('public/icon-192.png', generatePng(192));
fs.writeFileSync('public/icon-512.png', generatePng(512));
fs.writeFileSync('public/apple-touch-icon.png', generatePng(180));
console.log('Generated public/icon-192.png, icon-512.png, and apple-touch-icon.png');
