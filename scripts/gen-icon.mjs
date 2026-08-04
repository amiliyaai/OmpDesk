/**
 * 生成应用图标(resources/icon.png / icon16 / icon32 / icon.ico)
 * 纯 Node 实现 PNG/ICO 编码,无第三方依赖。运行: node scripts/gen-icon.mjs
 */
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'resources')

// ---------- PNG 编码 ----------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function encodePng(size, rgba) {
  const raw = Buffer.alloc(size * (1 + size * 4))
  for (let y = 0; y < size; y++) {
    raw[y * (1 + size * 4)] = 0
    rgba.copy(raw, y * (1 + size * 4) + 1, y * size * 4, (y + 1) * size * 4)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ])
}

// ---------- 绘制: 深色圆角方块 + 亮色圆环(类 omp "π" 意象) ----------
function drawIcon(size) {
  const px = Buffer.alloc(size * size * 4)
  const bg = [22, 22, 30, 255]
  const ring = [88, 140, 255, 255]
  const inner = [64, 200, 160, 255]

  const corner = Math.max(2, size * 0.22)
  const cx = size / 2
  const cy = size / 2
  const rOuter = size * 0.38
  const rInner = size * 0.16
  const ringW = Math.max(1.5, size * 0.055)

  const inside = (x, y) => {
    // 圆角矩形
    const dx = Math.max(Math.abs(x - cx) - (size / 2 - corner), 0)
    const dy = Math.max(Math.abs(y - cy) - (size / 2 - corner), 0)
    return dx * dx + dy * dy <= corner * corner
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      let c = bg
      if (inside(x + 0.5, y + 0.5)) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy)
        if (d <= rOuter && d >= rOuter - ringW) c = ring
        else if (d <= rInner) c = inner
        // 环缺口(π 竖线意象)
        const angle = Math.atan2(y + 0.5 - cy, x + 0.5 - cx)
        if (angle > Math.PI / 2 - 0.18 && angle < Math.PI / 2 + 0.18 && d <= rOuter) c = bg
      }
      px[i] = c[0]
      px[i + 1] = c[1]
      px[i + 2] = c[2]
      px[i + 3] = c[3]
    }
  }
  return encodePng(size, px)
}

// ---------- ICO(256 PNG 内嵌, 现代 Windows 支持) ----------
function encodeIco(png256) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // type: icon
  header.writeUInt16LE(1, 4) // count
  const entry = Buffer.alloc(16)
  entry[0] = 0 // 256
  entry[1] = 0 // 256
  entry.writeUInt16LE(1, 4) // planes
  entry.writeUInt16LE(32, 6) // bpp
  entry.writeUInt32LE(png256.length, 8)
  entry.writeUInt32LE(22, 12)
  return Buffer.concat([header, entry, png256])
}

mkdirSync(outDir, { recursive: true })
// icon.png 需 1024x1024(mac/linux 打包要求 >=512), ICO 内嵌 256 PNG(现代 Windows 支持)
writeFileSync(join(outDir, 'icon.png'), drawIcon(1024))
writeFileSync(join(outDir, 'icon16.png'), drawIcon(16))
writeFileSync(join(outDir, 'icon32.png'), drawIcon(32))
writeFileSync(join(outDir, 'icon.ico'), encodeIco(drawIcon(256)))
console.log('icons generated in', outDir)
