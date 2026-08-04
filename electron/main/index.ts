import {
  app,
  BrowserWindow,
  dialog,
  globalShortcut,
  ipcMain,
  Menu,
  nativeImage,
  Notification,
  shell,
  Tray,
  type MenuItemConstructorOptions
} from 'electron'
import { promises as fsp } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { OmpPool } from './omp/pool'
import { locateOmp } from './omp/locate'
import { readSettings, writeSettings } from './omp/config'
import { registerIpc } from './ipc'
import { checkForUpdates, quitAndInstall, setupUpdater } from './updater'
import { setLocale, tMain } from './i18n'
import type { AppSettings, MainEvent, UpdaterState } from '../../src/shared/types'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let pool: OmpPool | null = null
let ompBin = ''
let settings: AppSettings = {
  theme: 'system',
  fontScale: 1,
  approvalMode: '',
  defaultWorkspace: os.homedir(),
  ompPath: '',
  ompAutoDetected: true,
  maxPoolProcesses: 2,
  idleKillMinutes: 30,
  hotkey: 'CommandOrControl+Shift+Space'
}
let isQuitting = false

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => showWindow())
  void bootstrap()
}

async function bootstrap(): Promise<void> {
  await app.whenReady()

  // 1) 定位 omp
  ompBin = (await locateOmp()) ?? ''
  settings = await readSettings()
  setLocale(settings.language ?? 'zh-CN')
  if (ompBin) {
    settings = await writeSettings({ ompPath: ompBin, ompAutoDetected: true })
  }

  // 2) 进程池
  createPool()

  // 3) 自动更新(仅打包版生效) + macOS 关于面板
  if (process.platform === 'darwin') {
    app.setAboutPanelOptions({
      applicationName: 'OmpDesk',
      applicationVersion: app.getVersion(),
      copyright: '© amiliyaai · MIT License',
      credits: 'A desktop GUI for oh-my-pi (omp) — github.com/amiliyaai/OmpDesk'
    })
  }
  setupUpdater({
    getWindow: () => mainWindow,
    onState: (state: UpdaterState) => sendToWindow({ type: 'updater:state', state })
  })

  // 4) 窗口 / 菜单 / 托盘 / 快捷键 / IPC
  createWindow()
  setApplicationMenu()
  registerWindowIpc()
  createTray()
  registerHotkey()
  registerIpc({
    pool: pool!,
    getBin: () => ompBin,
    getWorkspace: () => settings.defaultWorkspace,
    notifySessionsChanged: () => sendToWindow({ type: 'sessions:changed' }),
    notifySettingsChanged: (s) => {
      settings = s
      setLocale(s.language ?? 'zh-CN')
      sendToWindow({ type: 'settings:changed', settings: s })
      registerHotkey()
      rebuildTrayMenu()
    },
    notifyModels: (models) => sendToWindow({ type: 'models:available', models: models as never }),
    getLogTail: readLogTail,
    updater: { check: checkForUpdates, quitAndInstall }
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
    else showWindow()
  })
}

// ---------- 进程池 ----------

function createPool(): void {
  pool?.dispose()
  pool = new OmpPool({
    bin: ompBin,
    approvalMode: settings.approvalMode || undefined,
    max: settings.maxPoolProcesses,
    idleMs: settings.idleKillMinutes,
    onFrame: (cwd, frame) => {
      sendToWindow({ type: 'omp:frame', cwd, frame })
      maybeNotify(cwd, frame)
    },
    onState: (cwd, state) => sendToWindow({ type: 'omp:state', cwd, ...state }),
    onStderr: (cwd, text) => {
      if (text.trim()) console.warn(`[omp:${cwd}]`, text.trim().slice(0, 500))
    },
    onUi: (cwd, req) => sendToWindow({ type: 'ui:request', request: req as never }),
    onUiResolved: (id) => sendToWindow({ type: 'ui:resolved', id })
  })
}

function maybeNotify(cwd: string, frame: Record<string, unknown>): void {
  if (frame.type !== 'agent_end' || !frame.isTerminal) return
  if (mainWindow && mainWindow.isFocused()) return
  if (!Notification.isSupported()) return
  try {
    const n = new Notification({
      title: tMain('notify.sessionDoneTitle'),
      body: path.basename(cwd)
    })
    n.on('click', () => showWindow())
    n.show()
  } catch {
    /* ignore */
  }
}

// ---------- 窗口 ----------

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    show: false,
    title: 'OmpDesk',
    backgroundColor: '#16161e',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      spellcheck: false
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow?.show())
  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault()
      mainWindow?.hide() // 托盘常驻(CC Switch / ChatGPT 模式)
      void maybeTrayHint()
    }
  })
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // 外链(markdown 链接等)一律走系统浏览器
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      void shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

function showWindow(): void {
  if (!mainWindow) {
    createWindow()
    return
  }
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
}

/** 窗口级 IPC(菜单栏动作) */
function registerWindowIpc(): void {
  ipcMain.handle('window:toggleFullScreen', () => {
    if (!mainWindow) return
    mainWindow.setFullScreen(!mainWindow.isFullScreen())
  })
  ipcMain.handle('app:quit', () => {
    isQuitting = true
    app.quit()
  })
  ipcMain.handle('app:showAbout', () => showAboutDialog())
  ipcMain.handle('app:getVersion', () => app.getVersion())
}

/** 关闭到托盘的首开提示(仅一次) */
async function maybeTrayHint(): Promise<void> {
  if (settings.trayHintShown) return
  try {
    settings = await writeSettings({ trayHintShown: true })
  } catch {
    return
  }
  sendToWindow({
    type: 'notice',
    level: 'info',
    text: tMain('tray.minimizeHint')
  })
}

// ---------- 托盘 ----------

function createTray(): void {
  const iconPath = path.join(__dirname, '../../resources/icon.png')
  let image = nativeImage.createFromPath(iconPath)
  if (image.isEmpty()) {
    // 兜底: 1x1 透明
    image = nativeImage.createEmpty()
  }
  tray = new Tray(image)
  tray.setToolTip(tMain('tray.tooltip'))
  rebuildTrayMenu()
  tray.on('click', () => showWindow())
}

function rebuildTrayMenu(): void {
  if (!tray) return
  const menu = Menu.buildFromTemplate([
    { label: tMain('tray.open'), click: () => showWindow() },
    { type: 'separator' },
    {
      label: tMain('tray.newSession'),
      click: () => {
        showWindow()
        mainWindow?.webContents.send('omp:event', { type: 'app:new-session' } satisfies MainEvent)
      }
    },
    { type: 'separator' },
    { label: tMain('tray.checkUpdates'), click: () => checkForUpdates(true) },
    { label: tMain('tray.about'), click: () => showAboutDialog() },
    { type: 'separator' },
    { label: tMain('tray.quit'), click: () => { isQuitting = true; app.quit() } }
  ])
  tray.setContextMenu(menu)
}

// ---------- 关于 ----------

function showAboutDialog(): void {
  void dialog.showMessageBox({
    type: 'info',
    title: tMain('about.title'),
    message: 'OmpDesk',
    detail: [
      tMain('about.version', { version: app.getVersion() }),
      '',
      tMain('about.desc'),
      '',
      '© amiliyaai · MIT License',
      'github.com/amiliyaai/OmpDesk'
    ].join('\n'),
    buttons: [tMain('about.openGithub'), tMain('common.cancel')],
    defaultId: 1,
    cancelId: 1
  }).then((r) => {
    if (r.response === 0) void shell.openExternal('https://github.com/amiliyaai/OmpDesk')
  })
}

// ---------- 应用菜单(macOS 屏顶菜单 / Win/Linux 隐藏但快捷键生效; 渲染端自绘菜单栏仅非 mac 显示) ----------

function setApplicationMenu(): void {
  const isMac = process.platform === 'darwin'
  const t = tMain
  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? ([
          {
            label: 'OmpDesk',
            submenu: [
              { label: t('menubar.about'), click: () => showAboutDialog() },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const, label: t('tray.quit') }
            ]
          }
        ] satisfies MenuItemConstructorOptions[])
      : []),
    {
      label: t('menubar.file'),
      submenu: [
        {
          label: t('menubar.newChat'),
          accelerator: 'CmdOrCtrl+N',
          click: () => sendToWindow({ type: 'app:new-session' })
        },
        {
          label: t('menubar.openFolder'),
          accelerator: 'CmdOrCtrl+O',
          click: () => sendToWindow({ type: 'app:pick-workspace' })
        },
        { type: 'separator' },
        {
          label: t('menubar.settings'),
          accelerator: 'CmdOrCtrl+,',
          click: () => sendToWindow({ type: 'app:open-settings' })
        },
        { type: 'separator' },
        ...(isMac
          ? ([{ role: 'close' as const, label: t('menubar.close') }] satisfies MenuItemConstructorOptions[])
          : [
              {
                label: t('menubar.close'),
                accelerator: 'CmdOrCtrl+W',
                click: () => mainWindow?.close()
              },
              {
                label: t('tray.quit'),
                accelerator: 'CmdOrCtrl+Q',
                click: () => {
                  isQuitting = true
                  app.quit()
                }
              }
            ])
      ]
    },
    {
      label: t('menubar.edit'),
      submenu: [
        { role: 'undo', label: t('menubar.undo') },
        { role: 'redo', label: t('menubar.redo') },
        { type: 'separator' },
        { role: 'cut', label: t('menubar.cut') },
        { role: 'copy', label: t('menubar.copy') },
        { role: 'paste', label: t('menubar.paste') },
        { role: 'selectAll', label: t('menubar.selectAll') }
      ]
    },
    {
      label: t('menubar.view'),
      submenu: [
        { role: 'zoomIn', label: t('menubar.zoomIn') },
        { role: 'zoomOut', label: t('menubar.zoomOut') },
        { role: 'resetZoom', label: t('menubar.resetZoom') },
        { type: 'separator' },
        { role: 'togglefullscreen', label: t('menubar.fullscreen') }
      ]
    },
    ...(isMac ? ([{ role: 'windowMenu' as const }] satisfies MenuItemConstructorOptions[]) : []),
    {
      role: 'help',
      label: t('menubar.help'),
      submenu: [
        { label: t('menubar.checkUpdates'), click: () => checkForUpdates(true) },
        { label: t('menubar.about'), click: () => showAboutDialog() }
      ]
    }
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

// ---------- 全局快捷键 ----------

function registerHotkey(): void {
  globalShortcut.unregisterAll()
  if (!settings.hotkey) return
  try {
    globalShortcut.register(settings.hotkey, () => showWindow())
  } catch {
    /* 注册失败(冲突等)忽略 */
  }
}

// ---------- 事件转发 ----------

function sendToWindow(e: MainEvent): void {
  mainWindow?.webContents.send('omp:event', e)
}

// ---------- 日志 ----------

async function readLogTail(count: number): Promise<string[]> {
  try {
    const logDir = path.join(os.homedir(), '.omp', 'logs')
    const files = (await fsp.readdir(logDir))
      .filter((f) => f.endsWith('.log'))
      .sort()
      .reverse()
    if (!files.length) return []
    const target = path.join(logDir, files[0])
    const raw = await fsp.readFile(target, 'utf8')
    const lines = raw.split(/\r?\n/).filter(Boolean)
    return lines.slice(-count)
  } catch {
    return []
  }
}

// ---------- 生命周期 ----------

app.on('before-quit', () => {
  isQuitting = true
  globalShortcut.unregisterAll()
})

app.on('will-quit', () => {
  pool?.dispose()
})

app.on('window-all-closed', () => {
  // 托盘常驻,不退出
})
