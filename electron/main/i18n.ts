/**
 * 主进程 i18n: 模块级当前语言 + tMain()
 * locale 在 bootstrap 读 settings.json 后设置; 渲染端负责 UI 文案
 */
import { translate, type Locale } from '../../src/lib/i18n'

let current: Locale = 'zh-CN'

export function setLocale(l: Locale): void {
  current = l
}

export function getLocale(): Locale {
  return current
}

export function tMain(key: string, params?: Record<string, string | number>): string {
  return translate(current, key, params)
}
