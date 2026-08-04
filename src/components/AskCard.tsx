import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Inbox, ListChecks, MessageSquareText } from 'lucide-react'
import type { UiRequest } from '../shared/types'
import { useStore } from '../store'

/** extension_ui_request 卡片: confirm / select / input / editor */
export function AskCard({ request }: { request: UiRequest }) {
  const respondUi = useStore((s) => s.respondUi)
  const [value, setValue] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)
  const [progress, setProgress] = useState(0)
  const textRef = useRef<HTMLTextAreaElement | null>(null)
  const timeout = 'timeout' in request ? request.timeout : null

  // 超时倒计时: 数字 + 细进度条
  useEffect(() => {
    if (!timeout) return
    const start = Date.now()
    const t = setInterval(() => {
      const elapsed = Date.now() - start
      const left = Math.max(0, Math.ceil((timeout - elapsed) / 1000))
      setSecondsLeft(left)
      setProgress(Math.min(1, elapsed / timeout))
      if (left <= 0) clearInterval(t)
    }, 200)
    return () => clearInterval(t)
  }, [timeout])

  // 键盘操作: Esc 取消; confirm 卡片 Enter 确认
  useEffect(() => {
    if (!request || request.kind === 'notify') return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        cancel()
      } else if (e.key === 'Enter' && request.kind === 'confirm') {
        e.preventDefault()
        respondUi(request.id, { confirmed: true })
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request])

  const cancel = (): void => respondUi(request.id, { cancelled: true })

  /** 超时进度条(有超时的请求) */
  const ProgressBar = (
    <div className="askcard-timeout">
      {secondsLeft !== null && timeout ? (
        <>
          <span className="askcard-timeout-bar">
            <span className="askcard-timeout-fill" style={{ width: `${progress * 100}%` }} />
          </span>
          <span className="askcard-timeout-num">{secondsLeft}s</span>
        </>
      ) : null}
    </div>
  )

  if (request.kind === 'confirm') {
    return (
      <div className="askcard">
        <div className="askcard-head">
          <AlertTriangle size={14} />
          <span>{request.title || '需要确认'}</span>
          {ProgressBar}
        </div>
        <div className="askcard-body">{request.message}</div>
        <div className="askcard-actions">
          <button className="btn ghost" onClick={cancel}>取消</button>
          <button className="btn primary" onClick={() => respondUi(request.id, { confirmed: true })}>
            确认
          </button>
        </div>
      </div>
    )
  }

  if (request.kind === 'select') {
    const toggle = (opt: string): void => {
      if (request.multiple) {
        setSelected((s) => (s.includes(opt) ? s.filter((x) => x !== opt) : [...s, opt]))
      } else {
        setSelected([opt])
      }
    }
    return (
      <div className="askcard">
        <div className="askcard-head">
          <ListChecks size={14} />
          <span>{request.title || '请选择'}</span>
          {ProgressBar}
        </div>
        <div className="askcard-body">{request.message}</div>
        <div className="askcard-options">
          {request.options.map((opt) => (
            <button
              key={opt}
              className={`option ${selected.includes(opt) ? 'selected' : ''}`}
              onClick={() => toggle(opt)}
            >
              {request.multiple && <input type="checkbox" readOnly checked={selected.includes(opt)} />}
              {opt}
            </button>
          ))}
        </div>
        <div className="askcard-actions">
          <button className="btn ghost" onClick={cancel}>取消</button>
          <button
            className="btn primary"
            disabled={selected.length === 0}
            onClick={() => respondUi(request.id, { value: request.multiple ? selected : selected[0] })}
          >
            确定
          </button>
        </div>
      </div>
    )
  }

  if (request.kind === 'input' || request.kind === 'editor') {
    const isEditor = request.kind === 'editor'
    const placeholder = 'placeholder' in request ? request.placeholder : undefined
    const initial = 'initial' in request ? request.initial : undefined
    return (
      <div className="askcard">
        <div className="askcard-head">
          {isEditor ? <MessageSquareText size={14} /> : <Inbox size={14} />}
          <span>{request.title || (isEditor ? '编辑内容' : '请输入')}</span>
          {ProgressBar}
        </div>
        <div className="askcard-body">{request.message}</div>
        <textarea
          ref={textRef}
          className="askcard-input"
          rows={isEditor ? 6 : 2}
          placeholder={placeholder ?? ''}
          defaultValue={initial ?? ''}
          autoFocus
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !isEditor) {
              e.preventDefault()
              respondUi(request.id, { value })
            }
          }}
        />
        <div className="askcard-actions">
          <button className="btn ghost" onClick={cancel}>取消</button>
          <button className="btn primary" onClick={() => respondUi(request.id, { value })}>
            提交
          </button>
        </div>
      </div>
    )
  }

  // notify 等: 只展示, 点击关闭
  return (
    <div className="askcard">
      <div className="askcard-body">{request.message}</div>
      <div className="askcard-actions">
        <button className="btn ghost" onClick={cancel}>知道了</button>
      </div>
    </div>
  )
}
