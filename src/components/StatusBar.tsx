import { Folder, Gauge, Loader2, Wrench } from 'lucide-react'
import { useStore } from '../store'
import { shortPath } from '../lib/format'
import { useI18n } from '../lib/useI18n'

/** 底部状态栏: 工作目录 / 模型 / 会话状态 / 执行中工具 / 审批模式 */
export function StatusBar() {
  const { t } = useI18n()
  const chat = useStore((s) => s.chat)
  const settings = useStore((s) => s.settings)
  const connected = useStore((s) => s.connected)
  const executing = useStore((s) => s.executing)
  const setShowSettings = useStore((s) => s.setShowSettings)

  const approvalLabel =
    settings?.approvalMode === 'always-ask'
      ? t('statusbar.alwaysAsk')
      : settings?.approvalMode === 'write'
        ? t('statusbar.writeAuto')
        : settings?.approvalMode === 'yolo'
          ? t('statusbar.yolo')
          : t('statusbar.byOmp')

  const running = chat?.status === 'running'
  const execLabel = running
    ? executing === 'thinking'
      ? t('statusbar.thinking')
      : executing
        ? t('statusbar.executing', { tool: executing })
        : t('statusbar.processing')
    : ''

  return (
    <div className="statusbar">
      <div className="statusbar-left">
        <span className={`status-dot ${connected ? 'on' : 'off'}`} />
        <span className="statusbar-item" title={chat?.cwd ?? settings?.defaultWorkspace ?? ''}>
          <Folder size={12} />
          {shortPath(chat?.cwd ?? settings?.defaultWorkspace ?? '', 48)}
        </span>
        {chat?.model && <span className="statusbar-item model">{t('statusbar.model', { name: chat.model })}</span>}
      </div>
      <div className="statusbar-right">
        {execLabel && (
          <span className="statusbar-item exec" title={t('statusbar.execTitle')}>
            <Loader2 size={12} className="spin" />
            <Wrench size={11} />
            {execLabel}
          </span>
        )}
        <span className="statusbar-item">{running ? '' : chat ? t('statusbar.ready') : ''}</span>
        <button className="statusbar-item chip" onClick={() => setShowSettings(true)} title={t('statusbar.approvalTitle')}>
          <Gauge size={12} />
          {approvalLabel}
        </button>
      </div>
    </div>
  )
}
