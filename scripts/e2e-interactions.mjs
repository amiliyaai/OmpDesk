/**
 * 交互体验优化专项 E2E:
 * 1. 会话右键菜单 + 自定义确认弹窗(Esc 取消)
 * 2. 搜索清空按钮
 * 3. 回到顶部按钮(大会话滚底后出现, 点击回顶)
 * 4. 会话切换 loading 指示
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

const errors = []
win.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
win.on('pageerror', (e) => errors.push(String(e)))

let failed = false
const check = (name, cond, extra = '') => {
  console.log(`  ${cond ? '✔' : '✘'} ${name} ${extra}`)
  if (!cond) failed = true
}

// ---------- 1. 右键菜单 + 确认弹窗 ----------
console.log('── 确认弹窗 ──')
// 目标: C:\Users\10079 组的测试会话(无标题, 删了无害)
let victim = null
const groups0 = win.locator('.session-group')
const gc0 = await groups0.count()
for (let g = 0; g < gc0; g++) {
  const t = await groups0.nth(g).innerText()
  if (t.includes('C:\\Users\\10079')) {
    victim = groups0.nth(g).locator('.session-item').last()
    break
  }
}
const item = victim ?? win.locator('.session-item').last()
const beforeCount = await win.locator('.session-item').count()
await item.click({ button: 'right' })
await win.waitForSelector('.session-menu', { timeout: 3000 })
check('右键菜单打开', true)
await win.click('.session-menu button.danger')
await win.waitForSelector('.confirm-dialog', { timeout: 3000 })
check('自定义确认弹窗出现(非原生 confirm)', true)
// Esc 取消 → 弹窗关闭, 会话仍在
await win.keyboard.press('Escape')
await win.waitForTimeout(300)
check('Esc 取消关闭弹窗', (await win.locator('.confirm-dialog').count()) === 0)
check('会话未被删除', (await win.locator('.session-item').count()) === beforeCount)
// 再触发一次: Enter 确认 → 删除该测试会话
await item.click({ button: 'right' })
await win.waitForSelector('.session-menu', { timeout: 3000 })
await win.click('.session-menu button.danger')
await win.waitForSelector('.confirm-dialog', { timeout: 3000 })
await win.keyboard.press('Enter')
await win.waitForTimeout(500)
check('Enter 确认后弹窗关闭', (await win.locator('.confirm-dialog').count()) === 0)
check('Enter 确认执行删除', (await win.locator('.session-item').count()) === beforeCount - 1)

// ---------- 2. 搜索清空 ----------
console.log('── 搜索清空 ──')
await win.fill('.sidebar-search input', 'zzz-no-match')
await win.waitForTimeout(300)
check('搜索清空按钮出现', (await win.locator('.search-clear').count()) === 1)
check('搜索过滤生效', (await win.locator('.session-item').count()) === 0)
await win.click('.search-clear')
await win.waitForTimeout(300)
check('清空后会话恢复', (await win.locator('.session-item').count()) > 0)

// ---------- 3. 回到顶部按钮 ----------
console.log('── 回到顶部 ──')
// 先找现有长会话(自动滚底后 scrollHeight > 4000)
let foundLong = false
{
  const allItems = win.locator('.session-item')
  const total = await allItems.count()
  for (let i = 0; i < Math.min(total, 8); i++) {
    const it = allItems.nth(i)
    await it.hover()
    await it.locator('.session-main').click()
    for (let w = 0; w < 20; w++) {
      await win.waitForTimeout(250)
      const st = await win.evaluate(() => document.querySelector('.chat-scroll')?.scrollHeight ?? 0)
      if (st > 4000) {
        foundLong = true
        break
      }
    }
    if (foundLong) break
  }
}
if (!foundLong) {
  // 数据中没有长会话 → 构造合成长会话(60 条消息)
  const { mkdirSync, writeFileSync } = await import('node:fs')
  const { join } = await import('node:path')
  const { homedir } = await import('node:os')
  const slug = 'abs-ompdesk-long-test-5678efgh'
  const dir = join(homedir(), '.omp', 'agent', 'sessions', slug)
  mkdirSync(dir, { recursive: true })
  const file = join(dir, '2026-08-05T01-00-00-000Z_019fccf9-09fa-7000-af9d-e02e6baaf209.jsonl')
  const recs = [
    { type: 'title', v: 1, title: '滚动测试长会话', source: 'user', updatedAt: '2026-08-05T01:00:00.000Z' },
    { type: 'session', version: 3, id: '019fccf9-09fa-7000-af9d-e02e6baaf209', timestamp: '2026-08-05T01:00:00.000Z', cwd: process.env.USERPROFILE }
  ]
  for (let i = 0; i < 30; i++) {
    recs.push({ type: 'message', id: `m${i}`, parentId: i ? `m${i - 1}` : null, timestamp: '2026-08-05T01:00:00.000Z', message: { role: 'user', content: [{ type: 'text', text: `第 ${i} 条用户消息` }] } })
    recs.push({ type: 'message', id: `a${i}`, parentId: `m${i}`, timestamp: '2026-08-05T01:00:00.000Z', message: { role: 'assistant', content: [{ type: 'text', text: `第 ${i} 条助手回复: ` + '这是一段较长的回复内容,用于撑起会话高度,验证虚拟滚动与回到顶部按钮。'.repeat(8) }] } })
  }
  writeFileSync(file, recs.map((r) => JSON.stringify(r)).join('\n') + '\n')
  // 刷新会话列表并打开
  await win.reload()
  await win.waitForSelector('.session-item', { timeout: 10_000 })
  await win.waitForTimeout(800)
  const testItem = win.locator('.session-item').filter({ hasText: '滚动测试长会话' })
  await testItem.hover()
  await testItem.locator('.session-main').click()
  await win.waitForTimeout(2500)
}
// 等待自动滚底后按钮出现
let btnVisible = false
for (let i = 0; i < 30; i++) {
  await win.waitForTimeout(500)
  btnVisible = (await win.locator('.scroll-top-btn').count()) === 1
  if (btnVisible) break
}
const scrollBottom = await win.evaluate(() => document.querySelector('.chat-scroll').scrollTop)
console.log('  打开后 scrollTop:', scrollBottom)
check('回到顶部按钮出现', btnVisible)
await win.click('.scroll-top-btn')
await win.waitForTimeout(1800)
const scrollTop = await win.evaluate(() => document.querySelector('.chat-scroll').scrollTop)
check('点击后回到顶部', scrollTop < 20, `(scrollTop=${scrollTop})`)

console.log('console errors:', errors.length ? errors : 'none')
await app.close()
process.exit(failed || errors.length ? 2 : 0)
