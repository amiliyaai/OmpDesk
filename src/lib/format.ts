import { translate, type Locale } from './i18n'

/** 相对时间显示(今天/昨天/N 天前/日期), locale 驱动文案 */
export function relativeTime(ts: number, locale: Locale = 'zh-CN'): string {
  if (!ts) return ''
  const diff = Date.now() - ts
  const min = 60_000
  const hour = 3_600_000
  const day = 86_400_000
  if (diff < min) return translate(locale, 'time.justNow')
  if (diff < hour) return translate(locale, 'time.minutesAgo', { n: Math.floor(diff / min) })
  const d = new Date(ts)
  const today = new Date()
  const sameDay = d.toDateString() === today.toDateString()
  if (sameDay || diff < day) return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  const yest = new Date(today.getTime() - day)
  if (d.toDateString() === yest.toDateString()) return translate(locale, 'time.yesterday')
  if (diff < 7 * day) return translate(locale, 'time.daysAgo', { n: Math.floor(diff / day) })
  return translate(locale, 'time.monthDay', { m: d.getMonth() + 1, d: d.getDate() })
}

export function shortPath(p: string, max = 42): string {
  if (!p) return ''
  if (p.length <= max) return p
  return '…' + p.slice(p.length - max + 1)
}

/** JSON 截断显示 */
export function truncateJson(v: unknown, max = 600, locale: Locale = 'zh-CN'): string {
  const s = typeof v === 'string' ? v : JSON.stringify(v, null, 2)
  if (s.length <= max) return s
  return s.slice(0, max) + translate(locale, 'common.truncated', { n: s.length })
}
