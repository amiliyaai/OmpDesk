/**
 * 诊断: 在运行中的应用内直接调用 IPC, 定位恢复会话失败环节
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

// 1) getSessions 是否正常
const probe = await win.evaluate(async () => {
  const s = await window.omp.getSessions()
  return { sessions: s.length, first: s[0]?.filePath, firstWs: s[0]?.workspace }
})
console.log('probe getSessions:', JSON.stringify(probe))

// 2) getSessionDetail 是否正常
const detail = await win.evaluate(async (fp) => {
  try {
    const d = await window.omp.getSessionDetail(fp)
    return d ? `messages=${d.messages.length}` : 'NULL'
  } catch (e) {
    return 'THROW: ' + String(e)
  }
}, probe.first)
console.log('probe getSessionDetail:', detail)

// 3) openSession 返回
const openRes = await win.evaluate(async (fp) => {
  try {
    return await window.omp.openSession(fp)
  } catch (e) {
    return 'THROW: ' + String(e)
  }
}, probe.first)
console.log('probe openSession:', JSON.stringify(openRes))

// 4) 直接点击并等待更久
const first = win.locator('.session-item').first()
await first.hover()
await first.locator('.session-main').click()
await win.waitForTimeout(3000)
const msgs = await win.locator('.msg').count()
const empty = await win.locator('.empty-state').count()
console.log('after click: msgs =', msgs, 'emptyState =', empty)

await app.close()
