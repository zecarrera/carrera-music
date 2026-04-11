import { writeFileSync } from 'fs'
import { deflateSync } from 'zlib'

function u32be(n) { const b = Buffer.allocUnsafe(4); b.writeUInt32BE(n); return b }
function crc32(buf) {
  let c = 0xFFFFFFFF
  for (const byte of buf) { c ^= byte; for (let i = 0; i < 8; i++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1) }
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
    const row = Buffer.allocUnsafe(1 + size * 3); row[0] = 0
    for (let x = 0; x < size; x++) {
      const [r, g, b] = draw(x, y, size)
      row[1 + x * 3] = r; row[2 + x * 3] = g; row[3 + x * 3] = b
    }
    rows.push(row)
  }
  return Buffer.concat([
    Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(Buffer.concat(rows))), chunk('IEND', Buffer.alloc(0)),
  ])
}

function drawIcon(x, y, size) {
  // Rounded rect background
  const r = size * 0.22
  const qx = Math.max(0, Math.max(r - x, x - (size - r)))
  const qy = Math.max(0, Math.max(r - y, y - (size - r)))
  if (qx * qx + qy * qy > r * r) return [10, 10, 10]

  // Subtle radial gradient background
  const cx = size / 2, cy = size / 2
  const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) / (size * 0.7)
  const bgV = Math.floor(18 + dist * 12)
  const bg = [bgV, bgV, bgV]

  // 3 equalizer bars
  const barW = size * 0.1
  const gap = size * 0.065
  const totalW = 3 * barW + 2 * gap
  const startX = (size - totalW) / 2
  const bottomY = size * 0.74
  const maxH = size * 0.50
  const barRad = barW / 2

  const bars = [
    { bx: startX,               h: maxH * 0.56 },
    { bx: startX + barW + gap,  h: maxH * 0.95 },
    { bx: startX + 2*(barW+gap),h: maxH * 0.38 },
  ]

  for (const { bx, h } of bars) {
    const bx2 = bx + barW
    const by1 = bottomY - h, by2 = bottomY
    if (x < bx || x > bx2 || y < by1 || y > by2) continue

    // Rounded top cap
    const topCY = by1 + barRad
    if (y < topCY && (x - (bx + barRad)) ** 2 + (y - topCY) ** 2 > barRad * barRad) continue

    // Rounded bottom cap
    const botCY = by2 - barRad
    if (y > botCY && (x - (bx + barRad)) ** 2 + (y - botCY) ** 2 > barRad * barRad) continue

    // Green bar with vertical gradient (lighter top → slightly deeper bottom)
    const t = (y - by1) / h
    return [Math.floor(20 + t * 10), Math.floor(195 - t * 15), Math.floor(80 - t * 10)]
  }

  return bg
}

writeFileSync('public/icon-192.png', makePNG(192, drawIcon))
writeFileSync('public/icon-512.png', makePNG(512, drawIcon))
console.log('✅ Icons generated')
