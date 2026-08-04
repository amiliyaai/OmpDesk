import { useEffect, useMemo, useRef, useState } from 'react'
import { CornerDownLeft, Search } from 'lucide-react'
import { useStore } from '../store'

/** Ctrl+K 命令面板: 斜杠命令补全与执行 */
export function CommandPalette() {
  const open = useStore((s) => s.showPalette)
  const setOpen = useStore((s) => s.setShowPalette)
  const commands = useStore((s) => s.commands)
  const send = useStore((s) => s.send)
  const [q, setQ] = useState('')
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (open) {
      setQ('')
      setCursor(0)
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [open])

  const results = useMemo(() => {
    const base = [
      { name: 'new', description: '新建会话' },
      { name: 'resume', description: '恢复会话' },
      { name: 'clear', description: '清空当前会话' },
      ...commands.map((c) => ({ name: c.name, description: c.description ?? '' }))
    ]
    const qq = q.toLowerCase()
    return base.filter((c) => c.name.toLowerCase().includes(qq) || c.description.toLowerCase().includes(qq)).slice(0, 12)
  }, [q, commands])

  if (!open) return null

  const run = (name: string): void => {
    setOpen(false)
    void send('/' + name)
  }

  return (
    <div className="palette-overlay" onMouseDown={() => setOpen(false)}>
      <div className="palette" onMouseDown={(e) => e.stopPropagation()}>
        <div className="palette-input-wrap">
          <Search size={15} />
          <input
            ref={inputRef}
            className="palette-input"
            placeholder="输入命令,如 /help、/model…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setCursor(0)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setOpen(false)
              else if (e.key === 'ArrowDown') setCursor((c) => Math.min(c + 1, results.length - 1))
              else if (e.key === 'ArrowUp') setCursor((c) => Math.max(c - 1, 0))
              else if (e.key === 'Enter' && results[cursor]) {
                run(results[cursor].name)
              }
            }}
          />
        </div>
        <div className="palette-list">
          {results.map((c, i) => (
            <button
              key={c.name}
              className={`palette-item ${i === cursor ? 'selected' : ''}`}
              onMouseEnter={() => setCursor(i)}
              onClick={() => run(c.name)}
            >
              <span className="palette-cmd">/{c.name}</span>
              <span className="palette-desc">{c.description}</span>
              {i === cursor && <CornerDownLeft size={13} />}
            </button>
          ))}
          {results.length === 0 && <div className="palette-empty">无匹配命令</div>}
        </div>
      </div>
    </div>
  )
}
