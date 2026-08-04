import {
  app,
  BrowserWindow,
  globalShortcut,
  Menu,
  nativeImage,
  Notification,
  Tray
} from 'electron'
import { promises as fsp } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { OmpPool } from './omp/pool'
import { locateOmp } from './omp/locate'
import { readSettings, writeSettings } from './omp/config'
import { registerIpc } from './ipc'
import type { AppSettings, MainEvent } from '../../src/shared/types'

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
  if (ompBin) {
    settings = await writeSettings({ ompPath: ompBin, ompAutoDetected: true })
  }

  // 2) 进程池
  createPool()

  // 3) 窗口 / 托盘 / 快捷键 / IPC
  createWindow()
  createTray()
  registerHotkey()
  registerIpc({
    pool: pool!,
    getBin: () => ompBin,
    getWorkspace: () => settings.defaultWorkspace,
    notifySessionsChanged: () => sendToWindow({ type: 'sessions:changed' }),
    notifySettingsChanged: (s) => {
      settings = s
      sendToWindow({ type: 'settings:changed', settings: s })
      registerHotkey()
      rebuildTrayMenu()
    },
    notifyModels: (models) => sendToWindow({ type: 'models:available', models: models as never }),
    getLogTail: readLogTail
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
      title: 'OmpDesk · 会话完成',
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
    }
  })
  mainWindow.on('closed', () => {
    mainWindow = null
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

// ---------- 托盘 ----------

function createTray(): void {
  const iconPath = path.join(__dirname, '../../resources/icon.png')
  let image = nativeImage.createFromPath(iconPath)
  if (image.isEmpty()) {
    // 兜底: 1x1 透明
    image = nativeImage.createEmpty()
  }
  tray = new Tray(image)
  tray.setToolTip('OmpDesk — oh-my-pi 桌面端')
  rebuildTrayMenu()
  tray.on('click', () => showWindow())
}

function rebuildTrayMenu(): void {
  if (!tray) return
  const menu = Menu.buildFromTemplate([
    { label: '打开 OmpDesk', click: () => showWindow() },
    { type: 'separator' },
    {
      label: '新建会话',
      click: () => {
        showWindow()
        mainWindow?.webContents.send('omp:event', { type: 'app:new-session' } satisfies MainEvent)
      }
    },
    { type: 'separator' },
    { label: '退出', click: () => { isQuitting = true; app.quit() } }
  ])
  tray.setContextMenu(menu)
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
