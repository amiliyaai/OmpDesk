import { memo, useMemo, useRef, useState } from 'react'
import { Check, ClipboardCopy, User } from 'lucide-react'
import hljs from 'highlight.js/lib/common'
import type { DisplayMessage } from '../shared/types'
import { copyText, renderMarkdown } from '../lib/markdown'
import { ThinkingBlock } from './ThinkingBlock'
import { ToolCard } from './ToolCard'
import { useI18n } from '../lib/useI18n'

function useCopyBtn(text: string): [boolean, () => void] {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const doCopy = (): void => {
    void copyText(text)
    setCopied(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), 1500)
  }
  return [copied, doCopy]
}

/** 单个代码块(hljs 高亮 + 复制按钮) */
function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  const { t } = useI18n()
  const [copied, doCopy] = useCopyBtn(code)
  const html = useMemo(() => {
    try {
      if (lang && hljs.getLanguage(lang)) return hljs.highlight(code, { language: lang }).value
      return hljs.highlightAuto(code).value
    } catch {
      return code
    }
  }, [code, lang])
  return (
    <div className="codeblock">
      <div className="codeblock-head">
        <span>{lang || t('chat.code')}</span>
        <button className="icon-btn" onClick={doCopy} title={t('chat.copyCode')}>
          {copied ? <Check size={13} /> : <ClipboardCopy size={13} />}
        </button>
      </div>
      <pre className="codeblock-body">
        <code className={`hljs${lang ? ` language-${lang}` : ''}`} dangerouslySetInnerHTML={{ __html: html }} />
      </pre>
    </div>
  )
}

/** Markdown 正文: 抽出代码块用 React 组件渲染(带复制), 其余走净化 HTML */
function Markdown({ text }: { text: string }) {
  const parts = useMemo(() => {
    type Part = { type: 'md'; html: string } | { type: 'code'; lang?: string; code: string }
    const out: Part[] = []
    const re = /```(\w*)\n([\s\S]*?)```/g
    let m: RegExpExecArray | null
    let last = 0
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) out.push({ type: 'md', html: renderMarkdown(text.slice(last, m.index)) })
      out.push({ type: 'code', lang: m[1] || undefined, code: m[2].replace(/\n$/, '') })
      last = m.index + m[0].length
    }
    if (last < text.length) out.push({ type: 'md', html: renderMarkdown(text.slice(last)) })
    return out
  }, [text])
  return (
    <>
      {parts.map((p, i) =>
        p.type === 'md' ? (
          <span key={i} dangerouslySetInnerHTML={{ __html: p.html }} />
        ) : (
          <CodeBlock key={i} code={p.code} lang={p.lang} />
        )
      )}
    </>
  )
}

/** 用户消息气泡 */
export const UserBubble = memo(function UserBubble({ msg }: { msg: DisplayMessage }) {
  const text = msg.content.find((c) => c.kind === 'text')?.text ?? ''
  return (
    <div className="msg user">
      <div className="msg-avatar user"><User size={15} /></div>
      <div className="msg-content">
        <div className="bubble user">{text}</div>
      </div>
    </div>
  )
})

/** 助手消息(文本 + thinking + 工具卡片, 支持流式增量) */
export const MessageBubble = memo(function MessageBubble({
  msg,
  streaming = false
}: {
  msg: DisplayMessage
  streaming?: boolean
}) {
  const { t } = useI18n()
  const [copied, doCopy] = useCopyBtn(msg.content.map((c) => c.text).join('\n'))
  const text = msg.content.find((c) => c.kind === 'text')?.text ?? ''
  const thinks = msg.content.filter((c) => c.kind === 'thinking')

  return (
    <div className={`msg assistant ${streaming ? 'streaming' : ''}`}>
      <div className="msg-avatar assistant">π</div>
      <div className="msg-content">
        {thinks.map((t2, i) => (
          <ThinkingBlock key={i} text={t2.text} />
        ))}
        {text && (
          <div className="bubble assistant">
            <div className="md">
              <Markdown text={text} />
            </div>
            {streaming && <span className="caret" />}
          </div>
        )}
        {msg.toolCalls.length > 0 && (
          <div className="toolcalls">
            {msg.toolCalls.map((tc, i) => (
              <ToolCard key={tc.id || i} call={tc} />
            ))}
          </div>
        )}
        {(text || msg.toolCalls.length > 0) && (
          <div className="msg-meta">
            {msg.model && <span>{msg.model}</span>}
            {msg.usage && msg.usage.input > 0 && (
              <span>
                {t('chat.tokens', {
                  in: Math.round(msg.usage.input / 1000),
                  out: Math.round(msg.usage.output / 1000)
                })}
              </span>
            )}
            <button className="icon-btn" onClick={doCopy} title={t('chat.copyMessage')}>
              {copied ? <Check size={12} /> : <ClipboardCopy size={12} />}
            </button>
          </div>
        )}
      </div>
    </div>
  )
})

/** 系统提示(压缩等) */
export function NoticeBubble({ msg }: { msg: DisplayMessage }) {
  return <div className="notice-bubble">{msg.content[0]?.text ?? ''}</div>
}
