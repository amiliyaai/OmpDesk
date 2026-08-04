import { useState } from 'react'
import { Brain, ChevronDown, ChevronRight } from 'lucide-react'
import { useI18n } from '../lib/useI18n'

/** 可折叠 thinking 块 */
export function ThinkingBlock({ text }: { text: string }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const preview = text.slice(0, 120) + (text.length > 120 ? '…' : '')
  return (
    <div className={`thinking ${open ? 'open' : ''}`}>
      <button className="thinking-head" onClick={() => setOpen((v) => !v)}>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <Brain size={14} />
        <span>{t('chat.thinking')}</span>
        <span className="thinking-len">{t('chat.thinkLen', { n: text.length })}</span>
      </button>
      {open && <div className="thinking-body">{text}</div>}
      {!open && <div className="thinking-preview">{preview}</div>}
    </div>
  )
}
