/**
 * 轻量 i18n 核心: 嵌套字典 + 点路径 key + {param} 插值
 * 语言缺失 key 时回退 zh-CN, 仍找不到返回 key 本身
 */
import { zh } from './zh'
import { en } from './en'
import { ja } from './ja'
import type { DictKey, DictShape, Locale } from './types'

export type { DictKey, DictShape, Locale, Paths } from './types'

const dicts: Record<Locale, DictShape> = { 'zh-CN': zh, en, ja }

function lookup(dict: DictShape, key: string): unknown {
  let val: unknown = dict
  for (const seg of key.split('.')) {
    if (val === null || typeof val !== 'object') return undefined
    val = (val as Record<string, unknown>)[seg]
  }
  return typeof val === 'string' ? val : undefined
}

/** 翻译: 插值 {n} 等参数; 缺失回退 zh-CN → 返回 key */
export function translate(
  locale: Locale,
  key: DictKey | string,
  params?: Record<string, string | number>
): string {
  let text = lookup(dicts[locale], key) ?? lookup(zh, key)
  if (typeof text !== 'string') return key
  return params ? interpolate(text, params) : text
}

/** 循环内插值(避免 let 窄化重置) */
function interpolate(text: string, params: Record<string, string | number>): string {
  let out = text
  for (const [k, v] of Object.entries(params)) {
    out = out.replaceAll(`{${k}}`, String(v))
  }
  return out
}

/** 固定语言的翻译函数(主进程/非组件逻辑用) */
export function createT(locale: Locale): (key: DictKey, params?: Record<string, string | number>) => string {
  return (key, params) => translate(locale, key, params)
}
