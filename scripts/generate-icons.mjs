// Generates public/icon-192.png and public/icon-512.png
// Pure Node.js — no dependencies

import { writeFileSync } from 'fs'
import { deflateSync } from 'zlib'

function u32be(n) {
  const b = Buffer.allocUnsafe(4); b.writeUInt32BE(n); return b
}

function crc32(buf) {
  let c = 0xFFFFFFFF
  for (const byte of buf) {
    c ^= byte
    for (let i = 0; i < 8; i++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
  }
  return (~c) >>> 0
}

function chunk(type, data) {
  const t = Buffer.from(type)
  return Buffer.concat([u32be(data.length), t, data, u32be(crc32(Buffer.concat([t, data])))])
}

function makePNG(size, draw) {
  const ihdr = Buffer.allocUnsafe(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0

  const rows = []
  for (let y = 0; y < size; y++) {
    const row = Buffer.allocUnsafe(1 + size * 3)
    row[0] = 0
    for (let x = 0; x < size; x++) {
      const [r, g, b] = draw(x, y, size)
      row[1 + x * 3] = r; row[2 + x * 3] = g; row[3 + x * 3] = b
    }
    rows.push(row)
  }

  return Buffer.concat([
    Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// Draw: dark bg (#0f0f0f) with a green (#1db954) music note circle
function drawIcon(x, y, size) {
  const cx = size / 2, cy = size / 2, r = size * 0.45
  const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)

  // Background
  if (dist > r) return [15, 15, 15]

  // Outer circle ring
  if (dist > r * 0.88) return [29, 185, 84]

  // Inner background
  if (dist > r * 0.65) return [15, 15, 15]

  // Note stem (vertical bar): right-center area
  const stemX = cx + size * 0.06, stemW = size * 0.07
  if (x >= stemX - stemW / 2 && x <= stemX + stemW / 2 && y >= cy - r * 0.4 && y <= cy + r * 0.25)
    return [29, 185, 84]

  // Note stem left bar  
  const stem2X = cx - size * 0.1, stem2W = size * 0.07
  if (x >= stem2X - stem2W / 2 && x <= stem2X + stem2W / 2 && y >= cy - r * 0.4 && y <= cy + r * 0.25)
    return [29, 185, 84]

  // Top horizontal beam connecting stems
  if (x >= stem2X - stem2W / 2 && x <= stemX + stemW / 2 && y >= cy - r * 0.42 && y <= cy - r * 0.28)
    return [29, 185, 84]

  // Left note head (ellipse)
  const nxL = stem2X, nyL = cy + r * 0.22, nrx = size * 0.09, nry = size * 0.065
  if (((x - nxL) / nrx) ** 2 + ((y - nyL) / nry) ** 2 <= 1) return [29, 185, 84]

  // Right note head (ellipse)
  const nxR = stemX, nyR = cy + r * 0.22
  if (((x - nxR) / nrx) ** 2 + ((y - nyR) / nry) ** 2 <= 1) return [29, 185, 84]

  return [15, 15, 15]
}

writeFileSync('public/icon-192.png', makePNG(192, drawIcon))
writeFileSync('public/icon-512.png', makePNG(512, drawIcon))
console.log('✅ Generated public/icon-192.png and public/icon-512.png')
