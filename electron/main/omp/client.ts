import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { EventEmitter } from 'node:events'
import { FrameDecoder } from './protocol'
import type { UiRequest } from '../../../src/shared/types'

export interface OmpClientOptions {
  bin: string
  cwd: string
  sessionDir?: string
  approvalMode?: string
}

interface Pending {
  resolve: (v: unknown) => void
  reject: (e: Error) => void
  timer: NodeJS.Timeout
}

const READY_TIMEOUT = 20_000
const COMMAND_TIMEOUT = 60_000

/** 单个 omp --mode rpc-ui 子进程客户端 */
export class OmpClient extends EventEmitter {
  readonly cwd: string
  /** 回合进行中(有未结束的 prompt) */
  busy = false

  private child: ChildProcessWithoutNullStreams | null = null
  private decoder = new FrameDecoder()
  private nextId = 1
  private pending = new Map<string, Pending>()
  private ready = false
  private readyWaiters: Array<() => void> = []
  private lastActivity = Date.now()
  private uiTimers = new Map<string, NodeJS.Timeout>()
  private stopping = false

  constructor(private opts: OmpClientOptions) {
    super()
    this.cwd = opts.cwd
  }

  get idleMs(): number {
    return Date.now() - this.lastActivity
  }

  get isAlive(): boolean {
    return this.child !== null && this.child.exitCode === null
  }

  async start(): Promise<void> {
    const args = ['--mode', 'rpc-ui', '--cwd', this.opts.cwd]
    if (this.opts.sessionDir) args.push('--session-dir', this.opts.sessionDir)
    if (this.opts.approvalMode) args.push('--approval-mode', this.opts.approvalMode)

    const child = spawn(this.opts.bin, args, {
      cwd: this.opts.cwd,
      env: process.env,
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe']
    })
    this.child = child
    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    this.decoder.onFrame = (frame) => this.handleFrame(frame)
    child.stdout.on('data', (d: string) => {
      this.lastActivity = Date.now()
      this.decoder.push(d)
    })
    child.stderr.on('data', (d: string) => this.emit('stderr', d))
    child.on('exit', (code, signal) => {
      this.ready = false
      this.busy = false
      const err = new Error(`omp 进程退出 (code=${code ?? 'null'}, signal=${signal ?? 'null'})`)
      for (const [, p] of this.pending) {
        clearTimeout(p.timer)
        p.reject(err)
      }
      this.pending.clear()
      this.emit('exit', { code, signal })
    })
    child.on('error', (e) => {
      this.emit('error', e)
    })

    await this.waitReady()
  }

  private waitReady(): Promise<void> {
    if (this.ready) return Promise.resolve()
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const i = this.readyWaiters.indexOf(done)
        if (i >= 0) this.readyWaiters.splice(i, 1)
        reject(new Error(`等待 omp ready 超时 (${READY_TIMEOUT}ms)`))
      }, READY_TIMEOUT)
      const done = (): void => {
        clearTimeout(timer)
        resolve()
      }
      this.readyWaiters.push(done)
    })
  }

  // ---------- 帧处理 ----------

  private handleFrame(frame: Record<string, unknown>): void {
    this.lastActivity = Date.now()
    switch (frame.type) {
      case 'ready': {
        this.ready = true
        const waiters = this.readyWaiters
        this.readyWaiters = []
        for (const w of waiters) w()
        // 协商 v2 大帧协议
        this.sendRaw({ id: 'protocol-1', type: 'negotiate_protocol', protocolVersion: 2 })
        break
      }
      case 'response': {
        const id = frame.id
        if (typeof id === 'string' && this.pending.has(id)) {
          const p = this.pending.get(id)!
          clearTimeout(p.timer)
          this.pending.delete(id)
          if (frame.success) p.resolve(frame.data ?? null)
          else p.reject(new Error(String(frame.error ?? 'omp 命令失败')))
        }
        break
      }
      case 'extension_ui_request': {
        this.handleUiRequest(frame)
        break
      }
      case 'prompt_result': {
        this.busy = false
        this.emit('frame', frame)
        break
      }
      case 'agent_end': {
        this.busy = false
        this.emit('frame', frame)
        break
      }
      default:
        this.emit('frame', frame)
    }
  }

  private handleUiRequest(frame: Record<string, unknown>): void {
    const req = normalizeUiRequest(frame)
    if (!req) {
      // 未知方法也转发给渲染进程展示(透传),但不阻塞
      this.emit('frame', { type: 'extension_ui_request', ...frame })
      return
    }
    if (req.kind === 'notify') {
      this.emit('ui-request', req)
      return
    }
    // 超时兜底: 渲染进程未应答时自动取消,避免挂起
    if (req.timeout && req.timeout > 0) {
      const timer = setTimeout(() => {
        this.uiTimers.delete(req.id)
        this.sendRaw({ type: 'extension_ui_response', id: req.id, cancelled: true, timedOut: true })
        this.emit('ui-resolved', req.id)
      }, req.timeout)
      this.uiTimers.set(req.id, timer)
    }
    this.emit('ui-request', req)
  }

  // ---------- 命令 ----------

  /** 发命令并等待 response 帧; timeoutMs=0 表示不限时(如 prompt) */
  request(command: string, params: Record<string, unknown> = {}, timeoutMs = COMMAND_TIMEOUT): Promise<unknown> {
    if (!this.isAlive) return Promise.reject(new Error('omp 进程未运行'))
    const id = `req_${this.nextId++}`
    return new Promise((resolve, reject) => {
      const timer =
        timeoutMs > 0
          ? setTimeout(() => {
              this.pending.delete(id)
              reject(new Error(`等待命令 ${command} 响应超时`))
            }, timeoutMs)
          : (undefined as unknown as NodeJS.Timeout)
      this.pending.set(id, { resolve, reject, timer })
      this.sendRaw({ id, type: command, ...params })
    })
  }

  sendRaw(obj: Record<string, unknown>): void {
    const child = this.child
    if (!child || child.stdin.destroyed) return
    child.stdin.write(JSON.stringify(obj) + '\n')
  }

  // ---------- 常用操作 ----------

  async getState(): Promise<unknown> {
    return this.request('get_state', {}, 10_000)
  }

  async getAvailableModels(): Promise<unknown> {
    return this.request('get_available_models', {}, 15_000)
  }

  prompt(message: string, images?: string[]): Promise<unknown> {
    this.busy = true
    const params: Record<string, unknown> = { message, streamingBehavior: 'steer' }
    if (images && images.length) params.images = images
    return this.request('prompt', params, 0)
  }

  abort(): Promise<unknown> {
    return this.request('abort', {}, 8_000).catch(() => null)
  }

  async abortAndPrompt(message: string): Promise<unknown> {
    this.busy = true
    return this.request('abort_and_prompt', { message, streamingBehavior: 'steer' }, 0)
  }

  newSession(): Promise<unknown> {
    return this.request('new_session', {}, 15_000)
  }

  switchSession(sessionPath: string): Promise<unknown> {
    return this.request('switch_session', { sessionPath }, 20_000)
  }

  setModel(provider: string, modelId: string): Promise<unknown> {
    return this.request('set_model', { provider, modelId }, 15_000)
  }

  setThinkingLevel(level: string): Promise<unknown> {
    return this.request('set_thinking_level', { level }, 10_000)
  }

  respondUi(id: string, payload: Record<string, unknown>): void {
    const t = this.uiTimers.get(id)
    if (t) {
      clearTimeout(t)
      this.uiTimers.delete(id)
    }
    this.sendRaw({ type: 'extension_ui_response', id, ...payload })
    this.emit('ui-resolved', id)
  }

  // ---------- 生命周期 ----------

  /** 优雅停止: 关 stdin 让 omp 排空退出; 超时强杀 */
  async stop(timeoutMs = 5_000): Promise<void> {
    if (this.stopping || !this.child) return
    this.stopping = true
    const child = this.child
    try {
      child.stdin.end()
    } catch {
      /* ignore */
    }
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        try {
          child.kill()
        } catch {
          /* ignore */
        }
        resolve()
      }, timeoutMs)
      child.once('exit', () => {
        clearTimeout(timer)
        resolve()
      })
    })
    this.child = null
    this.ready = false
    this.stopping = false
  }

  kill(): void {
    try {
      this.child?.kill()
    } catch {
      /* ignore */
    }
  }
}

/** extension_ui_request 帧 → 渲染进程可渲染的 UiRequest */
function normalizeUiRequest(frame: Record<string, unknown>): UiRequest | null {
  const id = String(frame.id ?? '')
  const method = String(frame.method ?? '')
  const timeout = typeof frame.timeout === 'number' && frame.timeout > 0 ? frame.timeout : null
  const title = String(frame.title ?? '')
  const message = String(frame.message ?? '')

  switch (method) {
    case 'confirm':
      return { id, kind: 'confirm', title, message, timeout }
    case 'select': {
      const raw = frame.options
      const options = Array.isArray(raw) ? raw.map(String) : []
      return { id, kind: 'select', title, message, options, multiple: Boolean(frame.multiple), timeout }
    }
    case 'input':
      return {
        id,
        kind: 'input',
        title,
        message,
        placeholder: typeof frame.placeholder === 'string' ? frame.placeholder : undefined,
        timeout
      }
    case 'editor':
      return {
        id,
        kind: 'editor',
        title,
        message,
        initial: typeof frame.initial === 'string' ? frame.initial : undefined,
        timeout
      }
    case 'notify':
      return { id, kind: 'notify', title, message }
    default:
      return null
  }
}
