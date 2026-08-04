import { useEffect } from 'react'
import { AlertTriangle, Info, X } from 'lucide-react'
import { useStore } from './store'
import { Sidebar } from './components/Sidebar'
import { ChatView } from './components/ChatView'
import { Composer } from './components/Composer'
import { StatusBar } from './components/StatusBar'
import { TodoPanel } from './components/TodoPanel'
import { ModelPicker } from './components/ModelPicker'
import { SettingsModal } from './components/SettingsModal'
import { CommandPalette } from './components/CommandPalette'

export default function App() {
  const boot = useStore((s) => s.boot)
  const booted = useStore((s) => s.booted)
  const dispatch = useStore((s) => s.dispatch)
  const settings = useStore((s) => s.settings)
  const notices = useStore((s) => s.notices)
  const dismissNotice = useStore((s) => s.dismissNotice)
  const setShowPalette = useStore((s) => s.setShowPalette)
  const chat = useStore((s) => s.chat)

  // 启动 + 订阅主进程事件
  useEffect(() => {
    void boot()
    const off = window.omp.onEvent((e) => dispatch(e))
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
      document.documentElement.style.fontSize = `${(settings?.fontScale ?? 1) * 14}px`
    }
    apply()
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [settings?.theme, settings?.fontScale])

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
        <div className="boot-text">OmpDesk 启动中…</div>
      </div>
    )
  }

  return (
    <div className="app">
      <Sidebar />
      <main className="main">
        <header className="topbar">
          <div className="topbar-left">
            {chat?.currentFile ? (
              <span className="topbar-title" title={chat.currentFile}>
                {chat.currentFile.split(/[\\/]/).pop()?.replace(/\.jsonl$/i, '')}
              </span>
            ) : (
              <span className="topbar-title">新会话</span>
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
          <TodoPanel />
        </div>
        <StatusBar />
      </main>
      <SettingsModal />
      <CommandPalette />

      {/* 通知 */}
      <div className="notices">
        {notices.map((n) => (
          <div key={n.id} className={`notice ${n.level}`}>
            {n.level === 'error' ? <AlertTriangle size={14} /> : <Info size={14} />}
            <span className="notice-text">{n.text}</span>
            <button className="icon-btn" onClick={() => dismissNotice(n.id)}>
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
