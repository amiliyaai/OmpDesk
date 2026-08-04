/**
 * 自动更新 (electron-updater + GitHub Releases provider)
 * - 仅打包后 (app.isPackaged) 生效; 开发模式直接禁用
 * - 启动后延迟自动检查(静默, 自动下载), 托盘/菜单可手动检查
 * - 下载完成后: 系统通知(点击重启安装) + updater:state 事件(渲染层 banner)
 */
import { app, dialog, Notification } from 'electron'
import { autoUpdater } from 'electron-updater'
import type { UpdateInfo } from 'electron-updater'
import type { BrowserWindow } from 'electron'
import type { UpdaterState } from '../../src/shared/types'
import { tMain } from './i18n'

// 与 electron-builder.yml 的 publish 配置保持一致
const FEED = { provider: 'github', owner: 'amiliyaai', repo: 'OmpDesk' } as const

let notify: ((s: UpdaterState) => void) | null = null
let manualCheck = false
let lastState: UpdaterState = { phase: 'idle' }
let updateInfo: UpdateInfo | null = null

function setState(s: UpdaterState): void {
  lastState = s
  notify?.(s)
}

/** releaseNotes(markdown) → 对话框可读的纯文本摘要 */
function notesToText(notes: unknown, max = 900): string {
  if (typeof notes !== 'string' || !notes.trim()) return ''
  return notes
    .replace(/```[\s\S]*?```/g, '') // 代码块
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_~>|-]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, max)
}

/** 下载完成 → 系统通知(点击即重启安装), 并提示渲染层显示 banner */
function promptInstall(info: UpdateInfo): void {
  updateInfo = info
  setState({ phase: 'downloaded', version: info.version, notes: notesToText(info.releaseNotes) })
  if (Notification.isSupported()) {
    try {
      const n = new Notification({
        title: tMain('updater.readyTitle'),
        body: tMain('updater.readyBody', { version: info.version })
      })
      n.on('click', () => void quitAndInstall())
      n.show()
    } catch {
      /* ignore */
    }
  }
}

export function setupUpdater(opts: {
  getWindow: () => BrowserWindow | null
  onState: (s: UpdaterState) => void
}): void {
  if (!app.isPackaged) return
  notify = opts.onState

  autoUpdater.setFeedURL(FEED)
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => setState({ phase: 'checking' }))
  autoUpdater.on('update-available', (info: UpdateInfo) => {
    // 自动下载中, 不打扰用户
    setState({ phase: 'downloading', version: info.version })
  })
  autoUpdater.on('update-not-available', (info: UpdateInfo) => {
    const s: UpdaterState = { phase: 'up-to-date', version: app.getVersion() }
    setState(s)
    if (manualCheck) {
      void dialog.showMessageBox({
        type: 'info',
        title: tMain('updater.checkTitle'),
        message: tMain('updater.upToDate'),
        detail: tMain('updater.currentVersion', { version: app.getVersion() })
      })
    }
  })
  autoUpdater.on('update-downloaded', (info: UpdateInfo) => promptInstall(info))
  autoUpdater.on('error', (err) => {
    const message = err?.message ?? String(err)
    setState({ phase: 'error', message })
    if (manualCheck) {
      void dialog.showMessageBox({
        type: 'error',
        title: tMain('updater.failTitle'),
        message: tMain('updater.failMessage'),
        detail: tMain('updater.failDetail', { error: message.slice(0, 500) })
      })
    }
  })

  // 启动 10s 后静默检查
  setTimeout(() => void autoUpdater.checkForUpdates(), 10_000).unref?.()
}

export function checkForUpdates(manual: boolean): void {
  if (!app.isPackaged) {
    if (manual) {
      void dialog.showMessageBox({
        type: 'info',
        title: tMain('updater.checkTitle'),
        message: tMain('updater.devModeMessage'),
        detail: tMain('updater.devModeDetail')
      })
    }
    return
  }
  manualCheck = manual
  void autoUpdater.checkForUpdates()
}

export function quitAndInstall(): void {
  if (lastState.phase === 'downloaded' && updateInfo) {
    autoUpdater.quitAndInstall(false, true)
  }
}

export function getUpdaterState(): UpdaterState {
  return lastState
}
