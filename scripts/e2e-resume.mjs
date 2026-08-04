/**
 * E2E 恢复续聊测试:
 * 1. 启动应用, 等侧边栏会话出现
 * 2. 点击第一个有历史的会话 → 历史消息渲染(本地 JSONL 解析)
 * 3. 发送跟进消息 → 验证在该会话上继续(switch_session)
 */
import { _electron as electron } from 'playwright-core'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const shotDir = join(root, 'shots')
mkdirSync(shotDir, { recursive: true })

const app = await electron.launch({
  args: [join(root, 'out', 'main', 'index.js')],
  cwd: root,
  env: { ...process.env, NODE_ENV: 'production' }
})
const win = await app.firstWindow()
await win.waitForLoadState('domcontentloaded')
await win.waitForSelector('.session-item', { timeout: 10_000 })
await win.waitForTimeout(1000)

const errors = []
win.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
win.on('pageerror', (e) => errors.push(String(e)))

// 找一个有历史的会话(第一个 assistant 气泡非空)
const items = win.locator('.session-item')
const count = await items.count()
console.log('sidebar sessions:', count)
// 选一个小型会话(测试用, 上下文短回复快): 找 workspace 为 C:\Users\10079 的会话
const sessionRows = win.locator('.session-group').filter({ hasText: 'C:\\Users\\10079' })
let target = null
const groups = win.locator('.session-group')
const groupCount = await groups.count()
for (let g = 0; g < groupCount; g++) {
  const t = await groups.nth(g).innerText()
  if (t.includes('10079')) {
    target = groups.nth(g).locator('.session-item').last()
    break
  }
}
if (!target) target = items.first()
console.log('target session:', target ? 'found' : 'fallback-first')

await target.hover()
await target.locator('.session-main').click()

// 历史应在本地解析后立即出现(轮询等待, 上限 10s)
let histMsgs = 0
let histUsers = 0
for (let i = 0; i < 20; i++) {
  await win.waitForTimeout(500)
  histMsgs = await win.locator('.msg.assistant').count()
  histUsers = await win.locator('.msg.user').count()
  if (histMsgs > 0) break
}
console.log('history messages - assistant:', histMsgs, 'user:', histUsers)
await win.screenshot({ path: join(shotDir, 'resume-history.png') })

if (histMsgs === 0) {
  console.log('FAIL: 历史消息未渲染')
  console.log('console errors:', errors.length ? errors : 'none')
  const chatState = await win.evaluate(() => {
    const el = document.querySelector('.chat-pane')
    return {
      hasComposer: Boolean(document.querySelector('.composer')),
      hasEmpty: Boolean(document.querySelector('.empty-state')),
      chatText: el ? el.innerText.slice(0, 200) : '(no .chat-pane)'
    }
  })
  console.log('chat pane state:', JSON.stringify(chatState))
  await app.close()
  process.exit(1)
}

// 续聊: 发一条极短消息
await win.click('.composer textarea')
await win.type('.composer textarea', '只回复两个字:收到', { delay: 10 })
await win.keyboard.press('Enter')

// 用户消息应立即入列
let usersAfter = histUsers
for (let i = 0; i < 10; i++) {
  await win.waitForTimeout(500)
  usersAfter = await win.locator('.msg.user').count()
  if (usersAfter > histUsers) break
}
console.log('follow-up user message appended:', usersAfter > histUsers)

// 助手回复(小会话, 最长等 90s)
let after = histMsgs
for (let i = 0; i < 90; i++) {
  await win.waitForTimeout(1000)
  after = await win.locator('.msg.assistant').count()
  if (after > histMsgs) break
}
console.log('after follow-up assistant messages:', after)
await win.waitForTimeout(10_000)
await win.screenshot({ path: join(shotDir, 'resume-followup.png') })

const body = (await win.locator('body').innerText()).slice(0, 300)
console.log('body:', body.replace(/\n+/g, ' | '))
console.log('console errors:', errors.length ? errors : 'none')

await app.close()
process.exit(after > histMsgs && !errors.length ? 0 : 2)
