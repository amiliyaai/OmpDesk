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

const STATUS_META = {
  pending: { icon: Clock, cls: 'pending', label: '排队中' },
  running: { icon: Loader2, cls: 'running', label: '执行中' },
  success: { icon: Check, cls: 'success', label: '完成' },
  error: { icon: AlertCircle, cls: 'error', label: '失败' }
} as const

/** 工具调用卡片: 状态 + 参数 + 结果(截断) + 复制 */
export const ToolCard = memo(function ToolCard({ call }: { call: DisplayToolCall }) {
  const [open, setOpen] = useState(false)
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
        {hasResult && <span className="toolcard-result-hint">查看结果</span>}
      </button>
      {open && (
        <div className="toolcard-body">
          <div className="toolcard-section">
            <div className="toolcard-section-title">参数</div>
            <pre className="toolcard-code">{truncateJson(call.args, 800)}</pre>
          </div>
          {hasResult && (
            <div className="toolcard-section">
              <div className="toolcard-section-title">
                结果
                <button
                  className="icon-btn"
                  title="复制结果"
                  onClick={() => void copyText(call.result ?? '')}
                >
                  <ClipboardCopy size={12} />
                </button>
              </div>
              <pre className={`toolcard-code ${call.isError ? 'error-text' : ''}`}>
                {truncateJson(call.result, 2000)}
              </pre>
            </div>
          )}
          {call.errorMessage && <div className="toolcard-error">{call.errorMessage}</div>}
        </div>
      )}
    </div>
  )
})
