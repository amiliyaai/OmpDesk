/**
 * E2E 冒烟: 用 Playwright _electron 启动真实应用, 截图 + 控制台错误检查
 * 用法: node scripts/e2e.mjs [--chat "你好"] [--out shots/xxx.png]
 */
import { _electron as electron } from 'playwright-core'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const shotDir = join(root, 'shots')
mkdirSync(shotDir, { recursive: true })

const chatArg = process.argv.find((a) => a.startsWith('--chat='))?.split('=')[1]
const shotName = process.argv.find((a) => a.startsWith('--shot='))?.split('=')[1] ?? 'e2e.png'

const app = await electron.launch({
  args: [join(root, 'out', 'main', 'index.js')],
  cwd: root,
  env: { ...process.env, NODE_ENV: 'production' }
})

const win = await app.firstWindow()
await win.waitForLoadState('domcontentloaded')
await win.waitForTimeout(1500)

const errors = []
win.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text())
})
win.on('pageerror', (e) => errors.push(String(e)))

// 标题应为 OmpDesk
const title = await win.title()
console.log('window title:', title)

const save = async (name) => {
  const p = join(shotDir, name)
  await win.screenshot({ path: p })
  console.log('screenshot:', p)
}

await save(shotName)

if (chatArg) {
  // 等侧边栏/空状态出现
  await win.waitForSelector('.empty-state, .composer', { timeout: 8000 })
  // 新建对话
  await win.click('.btn.new-chat')
  await win.waitForTimeout(800)
  await save('new-chat.png')
  // 输入并发送
  await win.click('.composer textarea')
  await win.type('.composer textarea', chatArg, { delay: 12 })
  await win.keyboard.press('Enter')
  console.log('sent prompt, waiting for streaming...')
  await win.waitForTimeout(25_000)
  await save('streaming.png')
  const bubbles = await win.locator('.msg.assistant').count()
  console.log('assistant messages:', bubbles)
  await win.waitForTimeout(30_000)
  await save('final.png')
  const toolcards = await win.locator('.toolcard').count()
  console.log('tool cards:', toolcards)
  if (toolcards > 0) {
    const statuses = await win.locator('.toolcard-status').allInnerTexts()
    console.log('tool statuses:', statuses.join(', '))
  }
}

const bodyText = (await win.locator('body').innerText()).slice(0, 400).replace(/\n+/g, ' | ')
console.log('body preview:', bodyText)
console.log('console errors:', errors.length ? errors : 'none')

await app.close()
process.exit(errors.length ? 2 : 0)
