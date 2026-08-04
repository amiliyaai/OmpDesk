import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { useStore } from '../store'

/** 自定义确认弹窗(替代原生 confirm, 支持 Enter/Esc) */
export function ConfirmDialog() {
  const queue = useStore((s) => s.confirmQueue)
  const resolveConfirm = useStore((s) => s.resolveConfirm)
  const [focused, setFocused] = useState<'ok' | 'cancel'>('cancel')
  const req = queue[0] ?? null

  // 焦点按钮跟随键盘方向键; 打开时重置
  useEffect(() => {
    setFocused('cancel')
  }, [req?.id])

  useEffect(() => {
    if (!req) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') resolveConfirm(req.id, false)
      else if (e.key === 'Enter') resolveConfirm(req.id, true)
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') setFocused((f) => (f === 'ok' ? 'cancel' : 'ok'))
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [req, resolveConfirm])

  if (!req) return null

  return (
    <div className="modal-overlay confirm-overlay" onMouseDown={() => resolveConfirm(req.id, false)}>
      <div className="confirm-dialog" onMouseDown={(e) => e.stopPropagation()} role="alertdialog" aria-label={req.title}>
        <div className="confirm-icon">
          <AlertTriangle size={18} />
        </div>
        <div className="confirm-content">
          <div className="confirm-title">{req.title}</div>
          <div className="confirm-message">{req.message}</div>
        </div>
        <div className="confirm-actions">
          <button
            className={`btn ghost ${focused === 'cancel' ? 'focused' : ''}`}
            onClick={() => resolveConfirm(req.id, false)}
          >
            {req.cancelText ?? '取消'}
          </button>
          <button
            className={`btn ${req.danger ? 'danger' : 'primary'} ${focused === 'ok' ? 'focused' : ''}`}
            onClick={() => resolveConfirm(req.id, true)}
          >
            {req.confirmText ?? '确认'}
          </button>
        </div>
      </div>
    </div>
  )
}
