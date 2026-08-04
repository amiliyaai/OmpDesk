/** i18n 基础类型: 语言与字典 key 推导 */

import type { Language } from '../../shared/types'

export type Locale = Language

/** 点路径推导: { a: { b: 'x' } } → 'a.b' */
export type Paths<T> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends string
          ? `${K}`
          : `${K}.${Paths<T[K]>}`
        : never
    }[keyof T]
  : never

/** 字典结构(嵌套字符串对象) */
export type Dict = Record<string, string | Record<string, unknown>>
