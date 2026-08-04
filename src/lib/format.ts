/** 相对时间显示(今天/昨天/N 天前/日期) */
export function relativeTime(ts: number): string {
  if (!ts) return ''
  const diff = Date.now() - ts
  const min = 60_000
  const hour = 3_600_000
  const day = 86_400_000
  if (diff < min) return '刚刚'
  if (diff < hour) return `${Math.floor(diff / min)} 分钟前`
  const d = new Date(ts)
  const today = new Date()
  const sameDay = d.toDateString() === today.toDateString()
  if (sameDay || diff < day) return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  const yest = new Date(today.getTime() - day)
  if (d.toDateString() === yest.toDateString()) return '昨天'
  if (diff < 7 * day) return `${Math.floor(diff / day)} 天前`
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

export function shortPath(p: string, max = 42): string {
  if (!p) return ''
  if (p.length <= max) return p
  return '…' + p.slice(p.length - max + 1)
}

/** JSON 截断显示 */
export function truncateJson(v: unknown, max = 600): string {
  const s = typeof v === 'string' ? v : JSON.stringify(v, null, 2)
  if (s.length <= max) return s
  return s.slice(0, max) + `\n… (已截断, 共 ${s.length} 字符)`
}
