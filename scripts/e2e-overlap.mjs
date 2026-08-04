/**
 * 回归: 虚拟滚动行内展开/收起(thinking 块)不应导致行重叠
 * 构造一个含 2 个 thinking 块的测试会话, 验证:
 * 1. 展开第一个 → 第二个下移(布局重排, 不重叠)
 * 2. 收起 → 回到原位附近
 * 测试会话用完即删
 */
import { _electron as electron } from 'playwright-core'
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { homedir } from 'node:os'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// ---------- 构造测试会话 ----------
const slug = 'abs-ompdesk-overlap-test-1234abcd'
const sessDir = join(homedir(), '.omp', 'agent', 'sessions', slug)
const sessFile = join(sessDir, '2026-08-05T00-00-00-000Z_019fccf9-09fa-7000-af9d-e02e6baaf208.jsonl')
mkdirSync(sessDir, { recursive: true })
const recs = [
  { type: 'title', v: 1, title: '重叠回归测试', source: 'user', updatedAt: '2026-08-05T00:00:00.000Z' },
  { type: 'session', version: 3, id: '019fccf9-09fa-7000-af9d-e02e6baaf208', timestamp: '2026-08-05T00:00:00.000Z', cwd: root },
  { type: 'message', id: 'm1', parentId: null, timestamp: '2026-08-05T00:00:00.000Z', message: { role: 'user', content: [{ type: 'text', text: '测试: 展开 thinking 块时布局是否重排' }] } },
  {
    type: 'message',
    id: 'm2',
    parentId: 'm1',
    timestamp: '2026-08-05T00:00:00.000Z',
    message: {
      role: 'assistant',
      content: [
        { type: 'thinking', text: '第一个思考过程内容。这一行足够长, 展开后消息会有明显的高度增长, 用来验证下方内容是否随布局下移而不重叠。反复确认偏移量更新正确。' },
        { type: 'thinking', text: '第二个思考过程内容。' },
        { type: 'text', text: '这是助手正文回复。' }
      ]
    }
  }
]
writeFileSync(sessFile, recs.map((r) => JSON.stringify(r)).join('\n') + '\n')

const cleanup = () => {
  try { rmSync(sessDir, { recursive: true, force: true }) } catch { /* ignore */ }
}

try {
  const app = await electron.launch({
    args: [join(root, 'out', 'main', 'index.js')],
    cwd: root,
    env: { ...process.env, NODE_ENV: 'production' }
  })
  const win = await app.firstWindow()
  await win.waitForLoadState('domcontentloaded')
  await win.waitForSelector('.session-item', { timeout: 10_000 })
  await win.waitForTimeout(800)

  const errors = []
  win.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  win.on('pageerror', (e) => errors.push(String(e)))

  // 打开测试会话
  const testItem = win.locator('.session-item').filter({ hasText: '重叠回归测试' })
  if ((await testItem.count()) === 0) {
    console.log('FAIL: 测试会话未出现在列表(侧边栏可能需要刷新)')
    await app.close()
    process.exit(2)
  }
  await testItem.hover()
  await testItem.locator('.session-main').click()
  await win.waitForTimeout(1500)

  const probe = await win.evaluate(() => {
    const rows = [...document.querySelectorAll('.vrow')]
    const row = rows.find((r) => r.querySelectorAll('.thinking').length >= 2)
    if (!row) return null
    const thinks = row.querySelectorAll('.thinking')
    const r1 = thinks[0].getBoundingClientRect()
    const r2 = thinks[1].getBoundingClientRect()
    return { top1: r1.top, top2: r2.top, gap: r2.top - r1.bottom }
  })
  if (!probe) {
    console.log('FAIL: 未找到含 2 个 thinking 的行')
    await app.close()
    process.exit(2)
  }
  console.log('初始:', JSON.stringify(probe))

  // 展开第一个 thinking
  await win.evaluate(() => {
    const rows = [...document.querySelectorAll('.vrow')]
    const row = rows.find((r) => r.querySelectorAll('.thinking').length >= 2)
    row.querySelector('.thinking-head').click()
  })
  await win.waitForTimeout(900)
  const after = await win.evaluate(() => {
    const rows = [...document.querySelectorAll('.vrow')]
    const row = rows.find((r) => r.querySelectorAll('.thinking').length >= 2)
    const thinks = row.querySelectorAll('.thinking')
    const r1 = thinks[0].getBoundingClientRect()
    const r2 = thinks[1].getBoundingClientRect()
    return { top1: r1.top, top2: r2.top, gap: r2.top - r1.bottom, moved: r2.top }
  })
  console.log('展开后:', JSON.stringify(after))
  const movedDown = after.moved > probe.top2 + 30
  const noOverlap = after.gap > 0
  console.log(`  ${movedDown ? '✔' : '✘'} 展开后下方 thinking 下移 ${(after.moved - probe.top2).toFixed(0)}px`)
  console.log(`  ${noOverlap ? '✔' : '✘'} 展开后无重叠 (gap=${after.gap.toFixed(0)}px)`)

  // 收起 → 应回原位附近
  await win.evaluate(() => {
    const rows = [...document.querySelectorAll('.vrow')]
    const row = rows.find((r) => r.querySelectorAll('.thinking').length >= 2)
    row.querySelector('.thinking-head').click()
  })
  await win.waitForTimeout(900)
  const collapsed = await win.evaluate(() => {
    const rows = [...document.querySelectorAll('.vrow')]
    const row = rows.find((r) => r.querySelectorAll('.thinking').length >= 2)
    const thinks = row.querySelectorAll('.thinking')
    return thinks[1].getBoundingClientRect().top
  })
  const backClose = Math.abs(collapsed - probe.top2) < 8
  console.log(`  ${backClose ? '✔' : '✘'} 收起后回到原位 (偏差 ${(collapsed - probe.top2).toFixed(1)}px)`)

  console.log('console errors:', errors.length ? errors : 'none')
  await app.close()
  cleanup()
  process.exit(movedDown && noOverlap && backClose && !errors.length ? 0 : 2)
} catch (e) {
  cleanup()
  throw e
}
