import { OmpClient } from './client'
import type { AgentBackend } from './backend'

export interface PoolOptions {
  bin: string
  sessionDir?: string
  approvalMode?: string
  backend?: AgentBackend
  max?: number
  idleMs?: number
  onFrame?: (cwd: string, frame: Record<string, unknown>) => void
  onState?: (cwd: string, state: { connected: boolean; error?: string }) => void
  onStderr?: (cwd: string, text: string) => void
  onUi?: (cwd: string, req: unknown) => void
  onUiResolved?: (id: string) => void
}

/**
 * 按工作目录维护 omp 子进程池
 * - 上限 max(默认 2),超出按 LRU 淘汰空闲进程
 * - 空闲超时自动退出(省内存/API 连接)
 */
export class OmpPool {
  private clients = new Map<string, OmpClient>()
  private lru: string[] = []
  private reaper: NodeJS.Timeout | null = null
  private opts: PoolOptions & { max: number; idleMs: number }

  constructor(opts: PoolOptions) {
    this.opts = {
      max: opts.max ?? 2,
      idleMs: (opts.idleMs ?? 30) * 60_000,
      ...opts
    }
  }

  static key(cwd: string): string {
    return process.platform === 'win32' ? cwd.toLowerCase() : cwd
  }

  getIfExists(cwd: string): OmpClient | undefined {
    return this.clients.get(OmpPool.key(cwd))
  }

  async get(cwd: string): Promise<OmpClient> {
    const k = OmpPool.key(cwd)
    let client = this.clients.get(k)
    if (!client) {
      // 超过上限: 尝试淘汰最久未用的空闲进程
      while (this.clients.size >= this.opts.max && this.lru.length > 0) {
        const victimKey = this.lru.shift()!
        const victim = this.clients.get(victimKey)
        if (victim && !victim.busy && victim.isAlive) {
          this.clients.delete(victimKey)
          victim.kill()
          break
        }
        if (victim && victim.busy) break // 都在忙, 允许临时超限
      }
      client = new OmpClient({
        bin: this.opts.bin,
        cwd,
        sessionDir: this.opts.sessionDir,
        approvalMode: this.opts.approvalMode,
        backend: this.opts.backend
      })
      client.on('stderr', (d: string) => {
        this.opts.onStderr?.(cwd, d)
      })
      client.on('error', (e: Error) => {
        this.opts.onState?.(cwd, { connected: false, error: e.message })
      })
      client.on('exit', () => {
        this.opts.onState?.(cwd, { connected: false })
      })
      client.on('frame', (frame: Record<string, unknown>) => {
        this.opts.onFrame?.(cwd, frame)
      })
      client.on('ui-request', (req) => {
        this.opts.onUi?.(cwd, req)
      })
      client.on('ui-resolved', (id: string) => {
        this.opts.onUiResolved?.(id)
      })
      this.clients.set(k, client)
      try {
        await client.start()
        this.opts.onState?.(cwd, { connected: true })
      } catch (e) {
        this.clients.delete(k)
        throw e
      }
    }
    // 刷新 LRU
    this.lru = this.lru.filter((x) => x !== k)
    this.lru.push(k)
    this.ensureReaper()
    return client
  }

  /** 重启某工作区的进程(配置/方案变更后生效) */
  async restart(cwd: string): Promise<OmpClient> {
    const k = OmpPool.key(cwd)
    const old = this.clients.get(k)
    if (old) {
      this.clients.delete(k)
      this.lru = this.lru.filter((x) => x !== k)
      await old.stop().catch(() => old.kill())
    }
    return this.get(cwd)
  }

  async restartAll(): Promise<void> {
    const keys = [...this.clients.keys()]
    for (const k of keys) {
      const c = this.clients.get(k)
      if (c) {
        this.clients.delete(k)
        this.lru = this.lru.filter((x) => x !== k)
        await c.stop().catch(() => c.kill())
      }
    }
  }

  dispose(): void {
    if (this.reaper) {
      clearInterval(this.reaper)
      this.reaper = null
    }
    for (const c of this.clients.values()) c.kill()
    this.clients.clear()
  }

  private ensureReaper(): void {
    if (this.reaper) return
    this.reaper = setInterval(() => {
      const now = Date.now()
      for (const [k, c] of this.clients) {
        if (!c.busy && c.isAlive && now - c.idleMs > this.opts.idleMs) {
          this.clients.delete(k)
          this.lru = this.lru.filter((x) => x !== k)
          c.kill()
        }
      }
    }, 60_000)
    this.reaper.unref?.()
  }
}
