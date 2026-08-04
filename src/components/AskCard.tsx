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
  const textRef = useRef<HTMLTextAreaElement | null>(null)

  // 超时倒计时提示
  const timeout = 'timeout' in request ? request.timeout : null
  useEffect(() => {
    if (!timeout) return
    const end = Date.now() + timeout
    const t = setInterval(() => {
      const left = Math.round((end - Date.now()) / 1000)
      setSecondsLeft(Math.max(0, left))
      if (left <= 0) clearInterval(t)
    }, 500)
    return () => clearInterval(t)
  }, [timeout])

  const cancel = (): void => respondUi(request.id, { cancelled: true })

  if (request.kind === 'confirm') {
    return (
      <div className="askcard">
        <div className="askcard-head">
          <AlertTriangle size={14} />
          <span>{request.title || '需要确认'}</span>
          {secondsLeft !== null && <span className="askcard-timeout">{secondsLeft}s</span>}
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
          {secondsLeft !== null && <span className="askcard-timeout">{secondsLeft}s</span>}
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
          {secondsLeft !== null && <span className="askcard-timeout">{secondsLeft}s</span>}
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
