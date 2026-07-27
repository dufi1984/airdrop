import fs from 'fs';
import zlib from 'zlib';

function createPng(width, height) {
  // Create raw RGBA buffer
  const buffer = Buffer.alloc(width * height * 4);

  const cx = width / 2;
  const cy = height / 2;
  const scale = width / 512;

  // Colors
  const bgColor = [18, 18, 20, 255]; // #121214
  const blueColor = [59, 130, 246, 255]; // #3b82f6

  // Radii of concentric radar arcs
  const radii = [64, 106, 148, 190].map(r => r * scale);
  const strokeWidth = 26 * scale;
  const dotRadius = 18 * scale;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      // Rounded rectangle corner check (rx = 120 * scale)
      const rx = 120 * scale;
      let inRect = true;
      if (x < rx && y < rx && Math.hypot(x - rx, y - rx) > rx) inRect = false;
      if (x > width - rx && y < rx && Math.hypot(x - (width - rx), y - rx) > rx) inRect = false;
      if (x < rx && y > height - rx && Math.hypot(x - rx, y - (height - rx)) > rx) inRect = false;
      if (x > width - rx && y > height - rx && Math.hypot(x - (width - rx), y - (height - rx)) > rx) inRect = false;

      if (!inRect) {
        buffer[idx] = 0;
        buffer[idx + 1] = 0;
        buffer[idx + 2] = 0;
        buffer[idx + 3] = 0;
        continue;
      }

      // Default background
      buffer[idx] = bgColor[0];
      buffer[idx + 1] = bgColor[1];
      buffer[idx + 2] = bgColor[2];
      buffer[idx + 3] = bgColor[3];

      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.hypot(dx, dy);

      // Center dot
      if (dist <= dotRadius) {
        buffer[idx] = blueColor[0];
        buffer[idx + 1] = blueColor[1];
        buffer[idx + 2] = blueColor[2];
        buffer[idx + 3] = blueColor[3];
        continue;
      }

      // Radar arcs (cut bottom angle ~ 115 degrees)
      const angle = Math.atan2(dy, dx); // radians -PI to PI
      const isBottomCut = (angle > 0.8 && angle < 2.34); // cut bottom section

      if (!isBottomCut) {
        for (const r of radii) {
          if (Math.abs(dist - r) <= strokeWidth / 2) {
            buffer[idx] = blueColor[0];
            buffer[idx + 1] = blueColor[1];
            buffer[idx + 2] = blueColor[2];
            buffer[idx + 3] = blueColor[3];
            break;
          }
        }
      }
    }
  }

  // Encode RGBA buffer into PNG file format
  return encodePng(width, height, buffer);
}

function encodePng(width, height, rgbaBuffer) {
  // Add filter byte (0) to each scanline
  const scanlineSize = width * 4 + 1;
  const rawData = Buffer.alloc(height * scanlineSize);
  for (let y = 0; y < height; y++) {
    rawData[y * scanlineSize] = 0; // Filter type 0 (None)
    rgbaBuffer.copy(rawData, y * scanlineSize + 1, y * width * 4, (y + 1) * width * 4);
  }

  const compressed = zlib.deflateSync(rawData);

  // Helper for PNG chunks
  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type);
    const crc = Buffer.alloc(4);
    const crcVal = crc32(Buffer.concat([typeBuf, data]));
    crc.writeUInt32BE(crcVal, 0);
    return Buffer.concat([len, typeBuf, data, crc]);
  }

  // CRC32 table & function
  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i];
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      }
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  // Header (IHDR)
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth
  ihdr[9] = 6; // Color type 6 (RGBA)
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace

  const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([pngSignature, ihdrChunk, idatChunk, iendChunk]);
}

// Generate PNG icons
fs.writeFileSync('public/apple-touch-icon.png', createPng(180, 180));
fs.writeFileSync('public/icon-192.png', createPng(192, 192));
fs.writeFileSync('public/icon-512.png', createPng(512, 512));

console.log('✅ Generated PNG icons successfully!');
