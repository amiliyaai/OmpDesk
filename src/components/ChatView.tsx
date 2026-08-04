import { memo } from 'react'
import { useStore } from '../store'
import { useAutoScroll, useVirtualList } from '../lib/virtual'
import { MessageBubble, NoticeBubble, UserBubble } from './MessageBubble'
import { AskCard } from './AskCard'
import { EmptyState } from './EmptyState'
import type { DisplayMessage } from '../shared/types'

/** 虚拟滚动的单条消息容器(实测高度反馈给虚拟列表) */
const Row = memo(function Row({
  msg,
  index,
  offset,
  measure
}: {
  msg: DisplayMessage
  index: number
  offset: number
  measure: (i: number, el: HTMLDivElement | null) => void
}) {
  return (
    <div
      ref={(el) => measure(index, el)}
      className="vrow"
      style={{ transform: `translateY(${offset}px)` }}
    >
      {msg.role === 'user' ? (
        <UserBubble msg={msg} />
      ) : msg.role === 'notice' ? (
        <NoticeBubble msg={msg} />
      ) : (
        <MessageBubble msg={msg} />
      )}
    </div>
  )
})

/** 消息流主体: 历史虚拟滚动 + live 流式消息 + AskCard 堆栈 */
export function ChatView() {
  const chat = useStore((s) => s.chat)
  const uiRequests = useStore((s) => s.uiRequests)
  const ompFound = useStore((s) => s.ompFound)
  const ompVersion = useStore((s) => s.ompVersion)

  const messages = chat?.messages ?? []
  const list = useVirtualList(messages, {
    estimateHeight: (m) => (m as { role?: string }).role === 'user' ? 56 : 160
  })
  const liveKey = chat?.live ? chat.live.message.content.length + chat.live.message.toolCalls.length + (chat.live.message.content[0]?.text.length ?? 0) : 0

  // 流式更新时自动滚底(用户靠近底部时)
  useAutoScroll(
    chat?.status === 'running' ? liveKey : messages.length,
    () => list.isNearBottom,
    () => list.scrollToBottom()
  )

  if (!chat) {
    return <EmptyState ompFound={ompFound} version={ompVersion} />
  }

  return (
    <div className="chat-scroll" ref={list.containerRef}>
      <div className="chat-inner" style={{ height: list.totalHeight, position: 'relative' }}>
        {list.visible.map((v) => (
          <Row key={v.item.id} msg={v.item} index={v.index} offset={v.offset} measure={list.measure} />
        ))}
      </div>

      {/* live 流式消息(独立于虚拟列表, 增长不扰动滚动位置) */}
      {chat.live && (
        <div className="vrow live-row">
          <MessageBubble msg={chat.live.message} streaming />
        </div>
      )}

      {/* AskCard 堆栈(审批/ask 对话框) */}
      {uiRequests.length > 0 && (
        <div className="ask-stack">
          {uiRequests.map((r) => (
            <AskCard key={r.id} request={r} />
          ))}
        </div>
      )}
    </div>
  )
}
