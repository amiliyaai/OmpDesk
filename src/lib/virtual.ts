import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

export interface VirtualItem<T> {
  item: T
  index: number
  offset: number
  height: number
}

export interface VirtualList<T> {
  containerRef: React.RefObject<HTMLDivElement | null>
  innerRef: React.RefObject<HTMLDivElement | null>
  totalHeight: number
  visible: Array<VirtualItem<T>>
  scrollTop: number
  scrollToBottom: (behavior?: ScrollBehavior) => void
  scrollToTop: (behavior?: ScrollBehavior) => void
  isNearBottom: boolean
  measure: (index: number, el: HTMLDivElement | null) => void
}

interface Options {
  overscan?: number
  estimateHeight?: (item: unknown, index: number) => number
}

/**
 * 虚拟滚动列表(动态高度, ResizeObserver 实测 + 估算兜底)
 * - offsets 在渲染期直接计算(与状态永远同步, 无 effect 时序问题)
 * - measure 用 rAF 节流合并, 实测高度后触发一次重渲染
 */
export function useVirtualList<T>(items: T[], opts: Options = {}): VirtualList<T> {
  const { overscan = 8, estimateHeight } = opts
  const containerRef = useRef<HTMLDivElement | null>(null)
  const innerRef = useRef<HTMLDivElement | null>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportH, setViewportH] = useState(0)
  const [version, setVersion] = useState(0)
  const heights = useRef<Map<number, number>>(new Map())
  const nearBottom = useRef(true)
  const measurePending = useRef<Set<number>>(new Set())
  const rafRef = useRef<number | null>(null)

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
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
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

  // 偏移前缀和 —— 渲染期直接计算, 与 items 永远一致
  const offsets: number[] = []
  {
    let acc = 0
    for (let i = 0; i < items.length; i++) {
      offsets.push(acc)
      acc += heightOf(i)
    }
  }

  const totalHeight = offsets.length ? offsets[offsets.length - 1] + heightOf(items.length - 1) : 0

  // 可视窗口
  const start = Math.max(
    0,
    (() => {
      let lo = 0
      let hi = items.length - 1
      if (hi < 0) return 0
      while (lo < hi) {
        const mid = (lo + hi) >> 1
        if (offsets[mid] + heightOf(mid) < scrollTop) lo = mid + 1
        else hi = mid
      }
      return lo
    })() - overscan
  )
  const end = Math.min(
    items.length,
    (() => {
      const bottom = scrollTop + viewportH
      let i = start
      while (i < items.length && offsets[i] < bottom) i++
      return i
    })() + overscan
  )

  const visible: Array<VirtualItem<T>> = []
  for (let i = start; i < end; i++) {
    visible.push({ item: items[i], index: i, offset: offsets[i], height: heightOf(i) })
  }

  // 滚动到最底部
  const scrollToBottom = (behavior: ScrollBehavior = 'auto'): void => {
    const el = containerRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior })
    nearBottom.current = true
  }

  // 滚动到顶部
  const scrollToTop = (behavior: ScrollBehavior = 'smooth'): void => {
    const el = containerRef.current
    if (!el) return
    el.scrollTo({ top: 0, behavior })
  }

  // 记录实测高度(rAF 节流合并, 触发一次重渲染)
  // useCallback 保证引用稳定 —— Row 的 ResizeObserver effect 依赖它, 避免反复重建
  const measure = useCallback((index: number, el: HTMLDivElement | null): void => {
    if (!el) return
    const h = el.getBoundingClientRect().height
    if (h <= 0 || Math.abs((heights.current.get(index) ?? 0) - h) <= 1) return
    heights.current.set(index, h)
    measurePending.current.add(index)
    if (rafRef.current !== null) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      if (measurePending.current.size > 0) {
        measurePending.current.clear()
        setVersion((v) => v + 1)
      }
    })
  }, [])

  void version
  void innerRef

  return {
    containerRef,
    innerRef,
    totalHeight,
    visible,
    scrollTop,
    scrollToBottom,
    scrollToTop,
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
