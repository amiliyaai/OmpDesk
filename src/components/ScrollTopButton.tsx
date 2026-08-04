import { ArrowUp } from 'lucide-react'

/** 回到顶部浮动按钮(长会话滚离顶部时浮现) */
export function ScrollTopButton({
  visible,
  onClick
}: {
  visible: boolean
  onClick: () => void
}) {
  if (!visible) return null
  return (
    <button
      className="scroll-top-btn"
      title="回到顶部"
      onClick={onClick}
      aria-label="回到顶部"
    >
      <ArrowUp size={16} />
    </button>
  )
}
