import { Folder, Gauge } from 'lucide-react'
import { useStore } from '../store'
import { shortPath } from '../lib/format'

/** 底部状态栏: 工作目录 / 模型 / 会话状态 / 审批模式 */
export function StatusBar() {
  const chat = useStore((s) => s.chat)
  const settings = useStore((s) => s.settings)
  const connected = useStore((s) => s.connected)
  const setShowSettings = useStore((s) => s.setShowSettings)

  const approvalLabel =
    settings?.approvalMode === 'always-ask'
      ? '始终询问'
      : settings?.approvalMode === 'write'
        ? '写入自动'
        : settings?.approvalMode === 'yolo'
          ? '全自动'
          : '按 omp 配置'

  return (
    <div className="statusbar">
      <div className="statusbar-left">
        <span className={`status-dot ${connected ? 'on' : 'off'}`} />
        <span className="statusbar-item" title={chat?.cwd ?? settings?.defaultWorkspace ?? ''}>
          <Folder size={12} />
          {shortPath(chat?.cwd ?? settings?.defaultWorkspace ?? '', 48)}
        </span>
        {chat?.model && <span className="statusbar-item model">模型: {chat.model}</span>}
      </div>
      <div className="statusbar-right">
        <span className="statusbar-item">{chat?.status === 'running' ? '执行中…' : chat ? '就绪' : ''}</span>
        <button className="statusbar-item chip" onClick={() => setShowSettings(true)} title="审批模式 (点击修改)">
          <Gauge size={12} />
          {approvalLabel}
        </button>
      </div>
    </div>
  )
}
