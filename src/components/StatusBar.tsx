import { Folder, Gauge, Loader2, Wrench } from 'lucide-react'
import { useStore } from '../store'
import { shortPath } from '../lib/format'

/** 底部状态栏: 工作目录 / 模型 / 会话状态 / 执行中工具 / 审批模式 */
export function StatusBar() {
  const chat = useStore((s) => s.chat)
  const settings = useStore((s) => s.settings)
  const connected = useStore((s) => s.connected)
  const executing = useStore((s) => s.executing)
  const setShowSettings = useStore((s) => s.setShowSettings)

  const approvalLabel =
    settings?.approvalMode === 'always-ask'
      ? '始终询问'
      : settings?.approvalMode === 'write'
        ? '写入自动'
        : settings?.approvalMode === 'yolo'
          ? '全自动'
          : '按 omp 配置'

  const running = chat?.status === 'running'
  const execLabel = running
    ? executing === 'thinking'
      ? '思考中…'
      : executing
        ? `执行中: ${executing}`
        : '处理中…'
    : ''

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
        {execLabel && (
          <span className="statusbar-item exec" title="当前执行状态">
            <Loader2 size={12} className="spin" />
            <Wrench size={11} />
            {execLabel}
          </span>
        )}
        <span className="statusbar-item">{running ? '' : chat ? '就绪' : ''}</span>
        <button className="statusbar-item chip" onClick={() => setShowSettings(true)} title="审批模式 (点击修改)">
          <Gauge size={12} />
          {approvalLabel}
        </button>
      </div>
    </div>
  )
}
