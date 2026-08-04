import { useCallback } from 'react'
import { useStore } from '../store'
import { translate, type DictKey, type Locale } from './i18n'

/** React hook: 从 store 读语言并返回翻译函数 */
export function useI18n(): {
  t: (key: DictKey | string, params?: Record<string, string | number>) => string
  locale: Locale
  setLocale: (l: Locale) => void
} {
  const locale = useStore((s) => (s.settings?.language as Locale | undefined) ?? 'zh-CN')
  const setSettings = useStore((s) => s.setSettings)
  const t = useCallback(
    (key: DictKey | string, params?: Record<string, string | number>) => translate(locale, key, params),
    [locale]
  )
  const setLocale = useCallback(
    (l: Locale) => {
      void setSettings({ language: l } as never)
    },
    [setSettings]
  )
  return { t, locale, setLocale }
}
