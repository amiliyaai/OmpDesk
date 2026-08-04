/**
 * E2E 设置与辅助功能:
 * 1. 打开设置弹窗 → 分组 tab 内容验证(Codex 式: 常规/外观/模型/集成/数据/用量/后端/关于)
 * 2. 菜单栏(视图菜单)与文件面板(工作区树)
 * 3. Ctrl+K 命令面板
 * 4. 模型下拉
 * 5. 全流程无控制台错误
 * 隔离 userData, 避免本机持久化设置(语言等)影响断言
 */
import { _electron as electron } from 'playwright-core'
import { mkdirSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const shotDir = join(root, 'shots')
mkdirSync(shotDir, { recursive: true })
const userData = mkdtempSync(join(tmpdir(), 'ompdesk-e2e-'))

const app = await electron.launch({
  args: [join(root, 'out', 'main', 'index.js'), `--user-data-dir=${userData}`],
  cwd: root,
  env: { ...process.env, NODE_ENV: 'production' }
})
const win = await app.firstWindow()
await win.waitForLoadState('domcontentloaded')
await win.waitForSelector('.sidebar', { timeout: 10_000 })
await win.waitForTimeout(1000)

const errors = []
win.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
win.on('pageerror', (e) => errors.push(String(e)))

let failed = false
const check = (name, cond) => {
  console.log(`  ${cond ? '✔' : '✘'} ${name}`)
  if (!cond) failed = true
}

// ---------- 设置弹窗 ----------
console.log('── 设置 ──')
await win.click('.sidebar-foot .icon-btn') // 设置按钮
await win.waitForSelector('.modal', { timeout: 5000 })
check('设置弹窗打开', true)
await win.screenshot({ path: join(shotDir, 'settings-models.png') })

// 设置分组: 个人/Agent/系统(Codex 式); MCP+Skills 合并进"集成"
const tabs = ['集成', '外观', '数据', '用量', '后端', '关于']
for (const t of tabs) {
  await win.click(`.settings-tab:has-text("${t}")`)
  await win.waitForTimeout(400)
  check(`tab ${t} 渲染`, await win.locator('.settings-content').count() === 1)
}
// 集成页含 MCP 与 Skills 列表区
await win.click('.settings-tab:has-text("集成")')
await win.waitForTimeout(400)
check('集成页 MCP 区渲染', (await win.locator('.section-title:has-text("MCP")').count()) === 1)
check('集成页 Skills 区渲染', (await win.locator('.section-title:has-text("Skills")').count()) === 1)
await win.screenshot({ path: join(shotDir, 'settings-data.png') })

// 回模型服务 tab
await win.click('.settings-tab:has-text("模型服务")')
await win.waitForTimeout(400)
const providerRows = await win.locator('.provider-row').count()
console.log('  providers:', providerRows)
check('供应商列表加载', providerRows > 0)

// 方案表单
await win.click('.btn:has-text("新建方案")')
await win.waitForSelector('.form-card', { timeout: 3000 })
check('方案表单打开', true)
await win.click('.form-actions .btn.ghost') // 取消
await win.waitForTimeout(300)

// 关闭设置(Esc)
await win.keyboard.press('Escape')
await win.waitForTimeout(400)
check('设置关闭', (await win.locator('.modal').count()) === 0)

// ---------- 菜单栏(视图菜单) ----------
console.log('── 菜单栏 ──')
await win.waitForSelector('.menubar', { timeout: 3000 })
check('菜单栏渲染', true)
await win.click('.menubar-item:has-text("视图")')
await win.waitForTimeout(400)
const menuItems = await win.locator('.menubar-menu [role="menuitem"]').count()
check('视图菜单打开', menuItems > 0)
check('切换文件面板项存在', (await win.locator('.menubar-menu [role="menuitem"]:has-text("文件面板")').count()) === 1)
await win.keyboard.press('Escape')
await win.waitForTimeout(300)

// ---------- 文件面板(工作区文件树) ----------
console.log('── 文件面板 ──')
await win.waitForSelector('.file-panel', { timeout: 3000 })
check('文件面板渲染', true)
await win.click('.file-mode:has-text("工作区")')
await win.waitForTimeout(1000)
const treeRows = await win.locator('.file-tree-dir, .file-tree-file').count()
console.log('  workspace tree rows:', treeRows)
check('工作区文件树加载', treeRows > 0)
await win.screenshot({ path: join(shotDir, 'file-panel.png') })

// ---------- 命令面板 ----------
console.log('── 命令面板 ──')
await win.keyboard.press('Control+k')
await win.waitForSelector('.palette', { timeout: 3000 })
check('Ctrl+K 打开面板', true)
const cmds = await win.locator('.palette-item').count()
console.log('  commands:', cmds)
check('命令列表非空', cmds > 0)
await win.screenshot({ path: join(shotDir, 'palette.png') })
await win.keyboard.press('Escape')
await win.waitForTimeout(300)
check('Esc 关闭面板', (await win.locator('.palette').count()) === 0)

// ---------- 模型下拉 ----------
console.log('── 模型下拉 ──')
await win.click('.model-picker-btn')
await win.waitForSelector('.model-menu', { timeout: 5000 })
// 首次打开会启动 omp 进程拉取模型列表, 轮询等待(冷启动扫描可能较慢)
let modelGroups = 0
for (let i = 0; i < 60; i++) {
  await win.waitForTimeout(500)
  modelGroups = await win.locator('.model-group').count()
  if (modelGroups > 0) break
}
console.log('  model groups:', modelGroups)
check('模型列表加载', modelGroups > 0)
await win.screenshot({ path: join(shotDir, 'model-picker.png') })
await win.keyboard.press('Escape')

console.log('console errors:', errors.length ? errors : 'none')
await app.close()
process.exit(failed || errors.length ? 2 : 0)
