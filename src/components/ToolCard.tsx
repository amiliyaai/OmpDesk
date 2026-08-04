import { memo, useState } from 'react'
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardCopy,
  Clock,
  Loader2,
  Wrench
} from 'lucide-react'
import type { DisplayToolCall } from '../shared/types'
import { truncateJson } from '../lib/format'
import { copyText } from '../lib/markdown'
import { useI18n } from '../lib/useI18n'

/** 工具调用卡片: 状态 + 参数 + 结果(截断) + 复制 */
export const ToolCard = memo(function ToolCard({ call }: { call: DisplayToolCall }) {
  const { t, locale } = useI18n()
  const [open, setOpen] = useState(false)
  const STATUS_META = {
    pending: { icon: Clock, cls: 'pending', label: t('tool.queued') },
    running: { icon: Loader2, cls: 'running', label: t('tool.running') },
    success: { icon: Check, cls: 'success', label: t('tool.done') },
    error: { icon: AlertCircle, cls: 'error', label: t('tool.failed') }
  } as const
  const meta = STATUS_META[call.status]
  const Icon = meta.icon
  const hasResult = Boolean(call.result)

  return (
    <div className={`toolcard ${meta.cls}`}>
      <button className="toolcard-head" onClick={() => setOpen((v) => !v)}>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <Wrench size={14} className="toolcard-icon" />
        <span className="toolcard-name">{call.name}</span>
        <span className={`toolcard-status ${meta.cls}`}>
          <Icon size={12} className={call.status === 'running' ? 'spin' : ''} />
          {meta.label}
        </span>
        {hasResult && <span className="toolcard-result-hint">{t('tool.viewResult')}</span>}
      </button>
      {open && (
        <div className="toolcard-body">
          <div className="toolcard-section">
            <div className="toolcard-section-title">{t('tool.args')}</div>
            <pre className="toolcard-code">{truncateJson(call.args, 800, locale)}</pre>
          </div>
          {hasResult && (
            <div className="toolcard-section">
              <div className="toolcard-section-title">
                {t('tool.result')}
                <button
                  className="icon-btn"
                  title={t('tool.copyResult')}
                  onClick={() => void copyText(call.result ?? '')}
                >
                  <ClipboardCopy size={12} />
                </button>
              </div>
              <pre className={`toolcard-code ${call.isError ? 'error-text' : ''}`}>
                {truncateJson(call.result, 2000, locale)}
              </pre>
            </div>
          )}
          {call.errorMessage && <div className="toolcard-error">{call.errorMessage}</div>}
        </div>
      )}
    </div>
  )
})
