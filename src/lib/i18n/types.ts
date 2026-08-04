/** i18n 基础类型: 语言与字典 key 推导 */

import type { Language } from '../../shared/types'
import { zh } from './zh'

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

/** 全部字典 key(以 zh 为基准) */
export type DictKey = Paths<typeof zh>

/** 递归结构约束: 与 zh 完全同构(缺 key/多 key/类型不符编译期报错) */
type ShapeOf<T> = { [K in keyof T]: T[K] extends string ? string : ShapeOf<T[K]> }

export type DictShape = ShapeOf<typeof zh>
