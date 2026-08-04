/**
 * 性能验证: 打开大会话(200+ 消息), 确认:
 * 1. 历史即时渲染
 * 2. 虚拟滚动生效(实际 DOM 行数 << 总消息数)
 * 3. 渲染耗时在合理范围
 */
import { _electron as electron } from 'playwright-core'
import { join } from 'node:path'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const app = await electron.launch({
  args: [join(root, 'out', 'main', 'index.js')],
  cwd: root,
  env: { ...process.env, NODE_ENV: 'production' }
})
const win = await app.firstWindow()
await win.waitForLoadState('domcontentloaded')
await win.waitForSelector('.session-item', { timeout: 10_000 })
await win.waitForTimeout(800)

// 找 神明从不解释 组的第一个会话(219 条消息)
const groups = win.locator('.session-group')
const groupCount = await groups.count()
let target = null
for (let g = 0; g < groupCount; g++) {
  const t = await groups.nth(g).innerText()
  if (t.includes('神明从不解释')) {
    target = groups.nth(g).locator('.session-item').first()
    break
  }
}
if (!target) {
  console.log('FAIL: 未找到目标组')
  await app.close()
  process.exit(2)
}

await target.hover()
const t0 = Date.now()
await target.locator('.session-main').click()

// 等历史出现
let rows = 0
for (let i = 0; i < 40; i++) {
  await win.waitForTimeout(250)
  rows = await win.locator('.vrow').count()
  if (rows > 0) break
}
const elapsed = Date.now() - t0

// 统计虚拟列表状态
const stats = await win.evaluate(() => {
  const inner = document.querySelector('.chat-inner')
  return { innerHeight: inner?.style.height ?? '', renderedRows: document.querySelectorAll('.vrow').length }
})

console.log('首次渲染耗时:', elapsed, 'ms')
console.log('虚拟窗口渲染行数:', rows, '| 容器高度:', stats.innerHeight)

// 滚到底部
await win.evaluate(() => {
  const el = document.querySelector('.chat-scroll')
  el.scrollTop = el.scrollHeight
})
await win.waitForTimeout(500)
const bottomRows = await win.locator('.vrow').count()
console.log('滚动到底后渲染行数:', bottomRows)

// 滚动流畅度: 连续滚动 20 帧, 测量每帧耗时
await win.evaluate(() => {
  const el = document.querySelector('.chat-scroll')
  el.scrollTop = 0
})
await win.waitForTimeout(300)
const perf = await win.evaluate(async () => {
  const el = document.querySelector('.chat-scroll')
  const samples = []
  for (let i = 0; i < 20; i++) {
    const t = performance.now()
    el.scrollTop += el.clientHeight * 0.6
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    samples.push(performance.now() - t)
  }
  return { max: Math.max(...samples), avg: samples.reduce((a, b) => a + b, 0) / samples.length }
})
console.log(`滚动帧耗时: avg=${perf.avg.toFixed(1)}ms max=${perf.max.toFixed(1)}ms`)

await app.close()
const ok = rows > 0 && rows < 100 && elapsed < 10000 && perf.avg < 100
console.log(ok ? 'PERF OK' : 'PERF CHECK FAILED')
process.exit(ok ? 0 : 2)
