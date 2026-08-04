import { useState } from 'react'
import { Brain, ChevronDown, ChevronRight } from 'lucide-react'

/** 可折叠 thinking 块 */
export function ThinkingBlock({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  const preview = text.slice(0, 120) + (text.length > 120 ? '…' : '')
  return (
    <div className={`thinking ${open ? 'open' : ''}`}>
      <button className="thinking-head" onClick={() => setOpen((v) => !v)}>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <Brain size={14} />
        <span>思考过程</span>
        <span className="thinking-len">{text.length} 字</span>
      </button>
      {open && <div className="thinking-body">{text}</div>}
      {!open && <div className="thinking-preview">{preview}</div>}
    </div>
  )
}
