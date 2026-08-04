import { useEffect, useLayoutEffect, useRef, useState } from 'react'

export interface VirtualItem<T> {
  item: T
  index: number
  offset: number
  height: number
}

interface Options {
  overscan?: number
  estimateHeight?: (item: unknown, index: number) => number
}

export interface VirtualList<T> {
  containerRef: React.RefObject<HTMLDivElement | null>
  innerRef: React.RefObject<HTMLDivElement | null>
  totalHeight: number
  visible: Array<VirtualItem<T>>
  scrollTop: number
  scrollToBottom: (behavior?: ScrollBehavior) => void
  isNearBottom: boolean
  measure: (index: number, el: HTMLDivElement | null) => void
}

/**
 * 虚拟滚动列表(动态高度, ResizeObserver 实测 + 估算兜底)
 * 用于长对话消息流,避免数百条消息全部渲染
 */
export function useVirtualList<T>(items: T[], opts: Options = {}): VirtualList<T> {
  const { overscan = 8, estimateHeight } = opts
  const containerRef = useRef<HTMLDivElement | null>(null)
  const innerRef = useRef<HTMLDivElement | null>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportH, setViewportH] = useState(0)
  const heights = useRef<Map<number, number>>(new Map())
  const nearBottom = useRef(true)

  // 容器尺寸 + 滚动监听
  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const h = entries[0]?.contentRect.height ?? 0
      setViewportH(h)
    })
    ro.observe(el)
    setViewportH(el.clientHeight)
    const onScroll = (): void => {
      const st = el.scrollTop
      setScrollTop(st)
      const remaining = el.scrollHeight - st - el.clientHeight
      nearBottom.current = remaining < 160
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      ro.disconnect()
      el.removeEventListener('scroll', onScroll)
    }
  }, [])

  // 估算/实测高度表
  const heightOf = (i: number): number => {
    const cached = heights.current.get(i)
    if (cached) return cached
    const est = estimateHeight ? estimateHeight(items[i], i) : 100
    heights.current.set(i, est)
    return est
  }

  // 偏移前缀和(增量计算, 长列表 O(n))
  const offsets = useRef<number[]>([])
  useLayoutEffect(() => {
    offsets.current = []
    let acc = 0
    for (let i = 0; i < items.length; i++) {
      offsets.current.push(acc)
      acc += heightOf(i)
    }
    // 清理超出范围的缓存(防泄漏)
    if (heights.current.size > items.length * 2) {
      const keep = new Map<number, number>()
      for (let i = 0; i < items.length; i++) {
        const h = heights.current.get(i)
        if (h) keep.set(i, h)
      }
      heights.current = keep
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, items])

  const totalHeight = offsets.current.length ? offsets.current[offsets.current.length - 1] + heightOf(items.length - 1) : 0

  // 可视窗口
  const start = Math.max(0, (() => {
    let lo = 0
    let hi = items.length - 1
    if (hi < 0) return 0
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (offsets.current[mid] + heightOf(mid) < scrollTop) lo = mid + 1
      else hi = mid
    }
    return lo
  })() - overscan)
  const end = Math.min(items.length, (() => {
    const bottom = scrollTop + viewportH
    let i = start
    while (i < items.length && offsets.current[i] < bottom) i++
    return i
  })() + overscan)

  const visible: Array<VirtualItem<T>> = []
  for (let i = start; i < end; i++) {
    visible.push({ item: items[i], index: i, offset: offsets.current[i], height: heightOf(i) })
  }

  // 滚动到最底部
  const scrollToBottom = (behavior: ScrollBehavior = 'auto'): void => {
    const el = containerRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior })
    nearBottom.current = true
  }

  // 记录实测高度
  const measure = (index: number, el: HTMLDivElement | null): void => {
    if (!el) return
    const h = el.getBoundingClientRect().height
    if (h > 0 && Math.abs((heights.current.get(index) ?? 0) - h) > 1) {
      heights.current.set(index, h)
    }
  }

  return {
    containerRef,
    innerRef,
    totalHeight,
    visible,
    scrollTop,
    scrollToBottom,
    isNearBottom: nearBottom.current,
    measure
  }
}

/** 监听消息流变化自动滚底(用户靠近底部时) */
export function useAutoScroll(
  trigger: unknown,
  isNearBottom: () => boolean,
  scrollToBottom: () => void
): void {
  const prev = useRef<unknown>(trigger)
  useEffect(() => {
    if (trigger === prev.current) return
    prev.current = trigger
    if (isNearBottom()) scrollToBottom()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger])
}
