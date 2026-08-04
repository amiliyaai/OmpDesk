import { useEffect, useRef, useState } from 'react'
import { ArrowUp, ImagePlus, Square } from 'lucide-react'
import { useStore } from '../store'

const IMAGE_LIMIT = 4
const MAX_IMAGE_BYTES = 4 * 1024 * 1024

/** 底部输入区: Enter 发送 / Shift+Enter 换行 / 图片粘贴 / 运行中显示打断 */
export function Composer() {
  const chat = useStore((s) => s.chat)
  const send = useStore((s) => s.send)
  const abort = useStore((s) => s.abort)
  const commands = useStore((s) => s.commands)
  const [text, setText] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [completions, setCompletions] = useState<string[]>([])
  const taRef = useRef<HTMLTextAreaElement | null>(null)
  const running = chat?.status === 'running'

  // 斜杠命令补全(available_commands_update 驱动)
  useEffect(() => {
    if (!text.startsWith('/')) {
      setCompletions([])
      return
    }
    const q = text.slice(1).toLowerCase()
    const hits = commands
      .filter((c) => c.name.toLowerCase().includes(q) || (c.aliases ?? []).some((a) => a.toLowerCase().includes(q)))
      .slice(0, 6)
    setCompletions(hits.map((c) => '/' + c.name))
  }, [text, commands])

  const acceptCompletion = (full: string): void => {
    setText(full + ' ')
    setCompletions([])
    taRef.current?.focus()
  }

  // 图片粘贴
  useEffect(() => {
    const readAsBase64 = (f: File): Promise<string> =>
      new Promise((resolve, reject) => {
        const r = new FileReader()
        r.onload = () => resolve(String(r.result ?? '').split(',')[1] ?? '')
        r.onerror = () => reject(r.error)
        r.readAsDataURL(f)
      })
    const onPaste = (e: ClipboardEvent): void => {
      const files = Array.from(e.clipboardData?.files ?? [])
      const imgs = files.filter((f) => f.type.startsWith('image/'))
      if (!imgs.length) return
      e.preventDefault()
      void (async () => {
        for (const f of imgs.slice(0, IMAGE_LIMIT - images.length)) {
          if (f.size > MAX_IMAGE_BYTES) continue
          const b64 = await readAsBase64(f)
          if (b64) setImages((prev) => [...prev, b64])
        }
      })()
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images.length])

  const canSend = text.trim().length > 0 || images.length > 0

  const submit = (): void => {
    if (!canSend || running) return
    void send(text.trim(), images.length ? images : undefined)
    setText('')
    setImages([])
    setCompletions([])
    taRef.current?.focus()
  }

  return (
    <div className="composer-wrap">
      {completions.length > 0 && (
        <div className="completions">
          {completions.map((c) => (
            <button key={c} onClick={() => acceptCompletion(c)}>{c}</button>
          ))}
        </div>
      )}
      {images.length > 0 && (
        <div className="composer-images">
          {images.map((b64, i) => (
            <div className="composer-image" key={i}>
              <img src={`data:image/png;base64,${b64}`} alt="" />
              <button className="img-remove" onClick={() => setImages((imgs) => imgs.filter((_, j) => j !== i))}>
                ×
              </button>
            </div>
          ))}
          <button className="img-add" title="粘贴图片即可添加" onClick={() => taRef.current?.focus()}>
            <ImagePlus size={16} />
          </button>
        </div>
      )}
      <div className="composer">
        <textarea
          ref={taRef}
          value={text}
          rows={1}
          placeholder={running ? '助手正在执行… 可发送消息打断' : '给 omp 发送消息 (Enter 发送, Shift+Enter 换行)'}
          onChange={(e) => {
            setText(e.target.value)
            const el = e.target
            el.style.height = 'auto'
            el.style.height = Math.min(el.scrollHeight, 200) + 'px'
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              submit()
            } else if (e.key === 'Escape' && completions.length) {
              setCompletions([])
            } else if (e.key === 'Tab' && completions.length === 1) {
              e.preventDefault()
              acceptCompletion(completions[0])
            }
          }}
        />
        {running ? (
          <button className="composer-btn stop" onClick={() => void abort()} title="停止生成">
            <Square size={15} fill="currentColor" />
          </button>
        ) : (
          <button className="composer-btn" disabled={!canSend} onClick={submit} title="发送 (Enter)">
            <ArrowUp size={16} />
          </button>
        )}
      </div>
    </div>
  )
}
