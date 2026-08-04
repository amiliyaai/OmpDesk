import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Toaster } from 'sonner'
import { useStore } from './store'
import type { UpdaterState } from './shared/types'
import { Sidebar } from './components/Sidebar'
import { MenuBar } from './components/MenuBar'
import { FilePanel } from './components/FilePanel'
import { ChatView } from './components/ChatView'
import { Composer } from './components/Composer'
import { StatusBar } from './components/StatusBar'
import { TodoPanel } from './components/TodoPanel'
import { ModelPicker } from './components/ModelPicker'
import { SettingsModal } from './components/SettingsModal'
import { CommandPalette } from './components/CommandPalette'
import { ConfirmDialog } from './components/ConfirmDialog'
import { useI18n } from './lib/useI18n'

export default function App() {
  const { t } = useI18n()
  const boot = useStore((s) => s.boot)
  const booted = useStore((s) => s.booted)
  const dispatch = useStore((s) => s.dispatch)
  const settings = useStore((s) => s.settings)
  const setShowPalette = useStore((s) => s.setShowPalette)
  const chat = useStore((s) => s.chat)
  const switching = useStore((s) => s.switching)
  const filePanelOpen = useStore((s) => s.filePanelOpen)
  const [update, setUpdate] = useState<UpdaterState | null>(null)

  // 启动 + 订阅主进程事件
  useEffect(() => {
    void boot()
    const off = window.omp.onEvent((e) => {
      if (e.type === 'updater:state') {
        setUpdate(e.state)
        return
      }
      dispatch(e)
    })
    return off
  }, [boot, dispatch])

  // 主题
  useEffect(() => {
    const apply = (): void => {
      const theme = settings?.theme ?? 'system'
      const dark =
        theme === 'dark' ||
        (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
      document.documentElement.dataset.theme = dark ? 'dark' : 'light'
      document.documentElement.classList.toggle('dark', dark)
      document.documentElement.style.fontSize = `${(settings?.fontScale ?? 1) * 14}px`
    }
    apply()
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [settings?.theme, settings?.fontScale])

  // 语言 → html lang(供字体/渲染偏好)
  useEffect(() => {
    document.documentElement.lang = settings?.language ?? 'zh-CN'
  }, [settings?.language])

  // Ctrl+K 命令面板 / Esc
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setShowPalette(true)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [setShowPalette])

  if (!booted) {
    return (
      <div className="boot-screen">
        <div className="boot-logo">π</div>
        <div className="boot-text">{t('app.booting')}</div>
      </div>
    )
  }

  return (
    <div className="app">
      <Sidebar />
      <main className="main">
        {/* macOS 用原生屏顶菜单; 其余平台渲染端自绘菜单栏 */}
        {window.omp.platform !== 'darwin' && <MenuBar />}
        <header className="topbar">
          <div className="topbar-left">
            {switching && (
              <span className="topbar-loading" title={t('app.startingSession')}>
                <Loader2 size={13} className="spin" />
                {t('app.startingSession')}
              </span>
            )}
            {chat?.currentFile ? (
              <span className="topbar-title" title={chat.currentFile}>
                {chat.currentFile.split(/[\\/]/).pop()?.replace(/\.jsonl$/i, '')}
              </span>
            ) : (
              <span className="topbar-title">{t('app.newSession')}</span>
            )}
          </div>
          <div className="topbar-right">
            <ModelPicker />
          </div>
        </header>
        <div className="content-row">
          <section className="chat-pane">
            <ChatView />
            <Composer />
          </section>
          {filePanelOpen && <FilePanel />}
          <TodoPanel />
        </div>
        <StatusBar />
      </main>
      <SettingsModal />
      <CommandPalette />
      <ConfirmDialog />

      {/* 自动更新 banner(下载完成后提示重启安装) */}
      {update?.phase === 'downloaded' && (
        <div className="update-banner">
          <span>
            {t('app.updateDownloaded', { version: update.version })}
          </span>
          <div className="update-banner-actions">
            <button className="btn primary small" onClick={() => void window.omp.quitAndInstall()}>
              {t('app.restartInstall')}
            </button>
            <button
              className="btn small"
              onClick={() => setUpdate((u) => (u?.phase === 'downloaded' ? { ...u, phase: 'idle' } : u))}
            >
              {t('app.later')}
            </button>
          </div>
        </div>
      )}

      {/* 通知 (sonner) */}
      <Toaster
        position="top-right"
        theme={settings?.theme === 'light' ? 'light' : 'dark'}
        toastOptions={{
          style: { fontSize: '12.5px', borderRadius: '10px' }
        }}
      />
    </div>
  )
}
