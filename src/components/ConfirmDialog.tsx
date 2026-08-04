import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { useStore } from '../store'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from './ui/dialog'
import { Button } from './ui/button'
import { useI18n } from '../lib/useI18n'

/** 自定义确认弹窗(替代原生 confirm, Radix Dialog + Enter/Esc 支持) */
export function ConfirmDialog() {
  const { t } = useI18n()
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
      if (e.key === 'Enter') {
        e.preventDefault()
        resolveConfirm(req.id, true)
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        setFocused((f) => (f === 'ok' ? 'cancel' : 'ok'))
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [req, resolveConfirm])

  return (
    <Dialog
      open={req !== null}
      onOpenChange={(open) => {
        // Esc 或遮罩点击 → 取消
        if (!open && req) resolveConfirm(req.id, false)
      }}
    >
      <DialogContent
        className="confirm-dialog max-w-[400px] p-5"
        showClose={false}
      >
        <div className="flex items-start gap-3">
          <div className="confirm-icon mt-0.5">
            <AlertTriangle size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <DialogHeader>
              <DialogTitle className="text-sm font-semibold">{req?.title ?? ''}</DialogTitle>
              <DialogDescription className="text-xs leading-relaxed whitespace-pre-wrap">
                {req?.message ?? ''}
              </DialogDescription>
            </DialogHeader>
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button
            variant="ghost"
            size="sm"
            className={focused === 'cancel' ? 'ring-2 ring-ring/50' : ''}
            onClick={() => req && resolveConfirm(req.id, false)}
          >
            {req?.cancelText ?? t('common.cancel')}
          </Button>
          <Button
            variant={req?.danger ? 'destructive' : 'default'}
            size="sm"
            className={focused === 'ok' ? 'ring-2 ring-ring/50' : ''}
            onClick={() => req && resolveConfirm(req.id, true)}
          >
            {req?.confirmText ?? t('common.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
