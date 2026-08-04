import { ArrowUp } from 'lucide-react'
import { useI18n } from '../lib/useI18n'

/** 回到顶部浮动按钮(长会话滚离顶部时浮现) */
export function ScrollTopButton({
  visible,
  onClick
}: {
  visible: boolean
  onClick: () => void
}) {
  const { t } = useI18n()
  if (!visible) return null
  return (
    <button
      className="scroll-top-btn"
      title={t('common.scrollTop')}
      onClick={onClick}
      aria-label={t('common.scrollTop')}
    >
      <ArrowUp size={16} />
    </button>
  )
}
