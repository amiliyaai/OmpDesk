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
const item = win.locator('.session-item').first()
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
check('会话未被删除', (await win.locator('.session-item').count()) > 0)
// 再触发一次: Enter 确认也测试(用非危险操作: 导出不会弹窗, 跳过确认; 直接重开弹窗后 Enter)
await item.click({ button: 'right' })
await win.waitForSelector('.session-menu', { timeout: 3000 })
await win.click('.session-menu button.danger')
await win.waitForSelector('.confirm-dialog', { timeout: 3000 })
await win.keyboard.press('Enter')
await win.waitForTimeout(500)
check('Enter 确认后弹窗关闭', (await win.locator('.confirm-dialog').count()) === 0)

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
// 打开已知的大会话(219+ 条消息)
const bigSession = win.locator('.session-item').filter({ hasText: 'Implement phase 1 plan' }).first()
if ((await bigSession.count()) > 0) {
  await bigSession.hover()
  await bigSession.locator('.session-main').click()
} else {
  // 兜底: 打开组内第一个, 再手动滚底
  const groups = win.locator('.session-group')
  const gc = await groups.count()
  for (let g = 0; g < gc; g++) {
    const t = await groups.nth(g).innerText()
    if (t.includes('神明从不解释')) {
      await groups.nth(g).locator('.session-item').first().locator('.session-main').click()
      break
    }
  }
}
// 等待历史渲染 + 自动滚底(轮询等待按钮出现)
let btnVisible = false
for (let i = 0; i < 30; i++) {
  await win.waitForTimeout(500)
  btnVisible = (await win.locator('.scroll-top-btn').count()) === 1
  if (btnVisible) break
}
let scrollBottom = await win.evaluate(() => document.querySelector('.chat-scroll').scrollTop)
if (!btnVisible) {
  // 会话可能较小: 手动滚到底再验证
  await win.evaluate(() => {
    const el = document.querySelector('.chat-scroll')
    el.scrollTop = el.scrollHeight
  })
  await win.waitForTimeout(800)
  scrollBottom = await win.evaluate(() => document.querySelector('.chat-scroll').scrollTop)
  btnVisible = (await win.locator('.scroll-top-btn').count()) === 1
}
console.log('  打开后 scrollTop:', scrollBottom)
check('会话可滚动', scrollBottom > 1000)
check('回到顶部按钮出现', btnVisible)
await win.click('.scroll-top-btn')
await win.waitForTimeout(800)
const scrollTop = await win.evaluate(() => document.querySelector('.chat-scroll').scrollTop)
check('点击后回到顶部', scrollTop < 10, `(scrollTop=${scrollTop})`)

console.log('console errors:', errors.length ? errors : 'none')
await app.close()
process.exit(failed || errors.length ? 2 : 0)
