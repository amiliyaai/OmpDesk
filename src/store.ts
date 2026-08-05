import { create } from 'zustand'
import { toast } from 'sonner'
import { translate } from './lib/i18n'
import type {
  AppSettings,
  CommandInfo,
  DisplayMessage,
  DisplayToolCall,
  MainEvent,
  McpServerDraft,
  McpServerInfo,
  ModelInfo,
  OmpProfile,
  ProviderSummary,
  RoleModels,
  SessionMeta,
  SkillInfo,
  TodoItem,
  UiRequest,
  UiResponsePayload
} from './shared/types'

// ---------- 类型 ----------

/** 按当前语言翻译(store action 内用) */
function tr(get: () => State, key: string, params?: Record<string, string | number>): string {
  return translate(get().settings?.language ?? 'zh-CN', key, params)
}

interface LiveDraft {
  message: DisplayMessage // 当前回合进行中的助手消息(独立于 messages, 增量只改它)
  toolIndex: Map<string, DisplayToolCall>
  textBuf: string // text_delta 缓冲(合帧)
  thinkBuf: string
}

export interface ChatView {
  messages: DisplayMessage[]
  live: LiveDraft | null
  status: 'idle' | 'running' | 'error'
  errorText: string | null
  currentFile: string | null // 续聊中的会话文件; null = 新会话
  cwd: string
  model: string | null
}

/** 工具参数里常见文件字段(渲染端轻量提取, 与主进程 sessions.ts 一致) */
const FILE_KEYS = new Set(['file_path', 'filePath', 'path', 'file', 'filename', 'glob', 'output_path'])

export function extractToolPaths(args: unknown, depth = 0): string[] {
  const out: string[] = []
  if (depth > 6 || args === null || typeof args !== 'object') return out
  if (Array.isArray(args)) {
    for (const item of args) out.push(...extractToolPaths(item, depth + 1))
    return out
  }
  for (const [k, v] of Object.entries(args as Record<string, unknown>)) {
    if (typeof v === 'string' && FILE_KEYS.has(k) && v.length < 4096 && (v.includes('/') || v.includes('\\') || /^[A-Za-z]:[\\/]/.test(v))) {
      out.push(v)
    } else if (typeof v === 'object' && v !== null) {
      out.push(...extractToolPaths(v, depth + 1))
    }
  }
  return out
}

interface Notice {
  id: number
  level: 'info' | 'warn' | 'error'
  text: string
}

export type NoticeLevel = Notice['level']

/** 自定义确认弹窗请求(替代原生 confirm) */
export interface ConfirmRequest {
  id: number
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
  onOk: () => void
}

interface State {
  booted: boolean
  ompFound: boolean
  ompVersion?: string
  settings: AppSettings | null
  sessions: SessionMeta[]
  search: string
  chat: ChatView | null
  uiRequests: UiRequest[]
  todos: TodoItem[]
  commands: CommandInfo[]
  models: ModelInfo[]
  providers: ProviderSummary[]
  profiles: OmpProfile[] | null
  profileRoles: RoleModels | null
  profileApproval: string
  mcps: McpServerInfo[]
  skills: SkillInfo[]
  showSettings: boolean
  showPalette: boolean
  /** 文件面板: 会话文件列表(agent 读写过)与开关 */
  sessionFiles: string[]
  filePanelOpen: boolean
  connected: boolean
  /** 会话切换/进程启动中(给用户反馈, 防"卡死感") */
  switching: boolean
  /** 当前回合执行状态: 'thinking' | 工具名 | null */
  executing: string | null
  /** 自定义确认弹窗队列 */
  confirmQueue: ConfirmRequest[]
  // actions
  boot: () => Promise<void>
  refreshSessions: () => Promise<void>
  setSearch: (s: string) => void
  newSession: (workspace?: string) => Promise<void>
  /** 创建 git worktree 并在其中打开新会话(并行工作区) */
  newWorktreeSession: () => Promise<void>
  openSession: (filePath: string) => Promise<void>
  send: (text: string, images?: string[]) => Promise<void>
  abort: () => Promise<void>
  setModel: (provider: string, modelId: string) => Promise<void>
  loadModels: () => Promise<void>
  respondUi: (id: string, payload: UiResponsePayload) => void
  setPinned: (filePath: string, pinned: boolean) => Promise<void>
  deleteSession: (filePath: string) => Promise<void>
  renameSession: (filePath: string, title: string) => Promise<void>
  exportSession: (filePath: string) => Promise<void>
  dispatch: (e: MainEvent) => void
  setShowSettings: (v: boolean) => void
  setShowPalette: (v: boolean) => void
  setFilePanelOpen: (v: boolean) => void
  refreshProviders: () => Promise<void>
  refreshProfiles: () => Promise<void>
  refreshMcp: () => Promise<void>
  refreshSkills: () => Promise<void>
  saveMcpServer: (name: string, server: McpServerDraft) => Promise<{ ok: boolean; error?: string }>
  deleteMcpServer: (name: string) => Promise<void>
  setMcpEnabled: (name: string, enabled: boolean) => Promise<void>
  toggleSkill: (name: string, enabled: boolean) => Promise<void>
  setSettings: (patch: Partial<AppSettings>) => Promise<void>
  applyProfile: (id: string) => Promise<void>
  saveProfile: (p: Parameters<typeof window.omp.saveProfile>[0]) => Promise<void>
  deleteProfile: (id: string) => Promise<void>
  addNotice: (level: Notice['level'], text: string) => void
  confirm: (req: Omit<ConfirmRequest, 'id'>) => void
  resolveConfirm: (id: number, ok: boolean) => void
}

let noticeSeq = 1

// ---------- 工具 ----------

function extractText(v: unknown): string {
  if (typeof v === 'string') return v
  if (Array.isArray(v)) {
    return v
      .map((b) => (typeof b === 'object' && b !== null ? String((b as { text?: unknown }).text ?? '') : String(b)))
      .join('\n')
  }
  if (typeof v === 'object' && v !== null) {
    const o = v as { text?: unknown; content?: unknown }
    if (typeof o.text === 'string') return o.text
    if (o.content) return extractText(o.content)
    return JSON.stringify(v).slice(0, 500)
  }
  return String(v ?? '')
}

// ---------- store ----------

export const useStore = create<State>((set, get) => ({
  booted: false,
  ompFound: false,
  settings: null,
  sessions: [],
  search: '',
  chat: null,
  uiRequests: [],
  todos: [],
  commands: [],
  models: [],
  providers: [],
  profiles: null,
  profileRoles: null,
  profileApproval: '',
  mcps: [],
  skills: [],
  showSettings: false,
  showPalette: false,
  sessionFiles: [],
  filePanelOpen: true,
  connected: false,
  switching: false,
  executing: null,
  confirmQueue: [],

  boot: async () => {
    const boot = await window.omp.bootstrap()
    set({
      booted: true,
      ompFound: boot.ompFound,
      ompVersion: boot.ompVersion,
      settings: boot.settings
    })
    await get().refreshSessions()
    await get().refreshProviders()
    await get().loadModels()
  },

  refreshSessions: async () => {
    const sessions = await window.omp.getSessions()
    set({ sessions })
  },

  setSearch: (search) => set({ search }),

  newSession: async (workspace) => {
    const ws = workspace ?? get().settings?.defaultWorkspace ?? ''
    const res = await window.omp.newSession(ws)
    if (!res.ok) {
      get().addNotice('error', tr(get, 'notices.newSessionFailed', { error: String(res.error) }))
      return
    }
    set({
      chat: { messages: [], live: null, status: 'idle', errorText: null, currentFile: null, cwd: ws, model: null },
      todos: [],
      uiRequests: [],
      sessionFiles: []
    })
    await get().refreshSessions()
  },

  newWorktreeSession: async () => {
    const ws = get().settings?.defaultWorkspace ?? ''
    const r = await window.omp.addWorktree(ws)
    if (!r.ok || !r.path) {
      get().addNotice('error', tr(get, 'worktree.createFailed', { error: r.error ?? '' }))
      return
    }
    get().addNotice('info', tr(get, 'worktree.created', { branch: r.branch ?? '' }))
    await get().newSession(r.path)
  },

  openSession: async (filePath) => {
    const detail = await window.omp.getSessionDetail(filePath)
    if (!detail) {
      get().addNotice('error', tr(get, 'notices.parseSessionFailed'))
      return
    }
    // 先展示本地解析的历史(即时), 后台切换 RPC 会话(可能需启动进程, 数秒)
    set({
      chat: {
        messages: detail.messages,
        live: null,
        status: 'idle',
        errorText: null,
        currentFile: filePath,
        cwd: detail.meta.workspace || get().settings?.defaultWorkspace || '',
        model: detail.meta.model ?? null
      },
      todos: [],
      uiRequests: [],
      sessionFiles: detail.files ?? [],
      switching: true // 切换/启动进程期间显示 loading 反馈
    })
    const res = await window.omp.openSession(filePath)
    set({ switching: false })
    if (!res.ok) {
      get().addNotice('warn', tr(get, 'notices.switchSessionFailed', { error: String(res.error) }))
    }
  },

  send: async (text, images) => {
    const chat = get().chat
    const ws = chat?.cwd ?? get().settings?.defaultWorkspace ?? ''
    if (!chat) {
      // 直接输入时先建会话
      const res = await window.omp.newSession(ws)
      if (!res.ok) {
        get().addNotice('error', tr(get, 'notices.startSessionFailed', { error: String(res.error) }))
        return
      }
    }
    const userMsg: DisplayMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: [{ kind: 'text', text }],
      toolCalls: [],
      createdAt: Date.now()
    }
    set((s) => ({
      chat: {
        ...(s.chat ?? { messages: [], live: null, status: 'idle', errorText: null, currentFile: null, cwd: ws, model: null }),
        messages: [...(s.chat?.messages ?? []), userMsg],
        status: 'running',
        errorText: null
      }
    }))
    const res = await window.omp.sendPrompt(text, images, chat?.cwd)
    if (!res.ok) {
      set((s) => ({ chat: s.chat ? { ...s.chat, status: 'idle' } : null }))
      get().addNotice('error', tr(get, 'notices.sendFailed', { error: String(res.error) }))
    }
  },

  abort: async () => {
    await window.omp.abort()
  },

  setModel: async (provider, modelId) => {
    const res = await window.omp.setModel(provider, modelId)
    if (!res.ok) get().addNotice('warn', tr(get, 'notices.setModelFailed', { error: String(res.error) }))
    else set((s) => ({ chat: s.chat ? { ...s.chat, model: modelId } : null }))
  },

  loadModels: async () => {
    const models = await window.omp.getModels()
    if (models.length) set({ models })
  },

  respondUi: (id, payload) => {
    void window.omp.respondUi(id, payload)
    set((s) => ({ uiRequests: s.uiRequests.filter((r) => r.id !== id) }))
  },

  setPinned: async (filePath, pinned) => {
    await window.omp.setPinned(filePath, pinned)
  },

  deleteSession: async (filePath) => {
    const res = await window.omp.deleteSession(filePath)
    if (!res.ok) get().addNotice('error', tr(get, 'notices.deleteFailed', { error: String(res.error) }))
    if (get().chat?.currentFile === filePath) {
      set({ chat: null })
    }
  },

  renameSession: async (filePath, title) => {
    await window.omp.renameSession(filePath, title)
  },

  exportSession: async (filePath) => {
    const res = await window.omp.exportSession(filePath)
    if (res.ok && res.path) get().addNotice('info', tr(get, 'notices.exported', { path: res.path }))
    else get().addNotice('error', tr(get, 'notices.exportFailed', { error: String(res.error) }))
  },

  // ---------- 事件分发 ----------

  dispatch: (e) => {
    const s = get()
    switch (e.type) {
      case 'omp:frame':
        handleFrame(set, get, e.cwd, e.frame)
        break
      case 'omp:state':
        if (s.chat && s.chat.cwd === e.cwd) set({ connected: e.connected })
        break
      case 'sessions:changed':
        void get().refreshSessions()
        break
      case 'settings:changed':
        set({ settings: e.settings })
        break
      case 'models:available':
        if (Array.isArray(e.models)) set({ models: e.models as ModelInfo[] })
        break
      case 'ui:request':
        set((st) => ({ uiRequests: st.uiRequests.some((r) => r.id === e.request.id) ? st.uiRequests : [...st.uiRequests, e.request] }))
        break
      case 'ui:resolved':
        set((st) => ({ uiRequests: st.uiRequests.filter((r) => r.id !== e.id) }))
        break
      case 'notice':
        get().addNotice(e.level, e.text)
        break
      case 'app:new-session':
        void get().newSession()
        break
      case 'app:new-worktree-session':
        void get().newWorktreeSession()
        break
      case 'app:open-settings':
        set({ showSettings: true })
        break
      case 'app:pick-workspace': {
        void (async () => {
          const p = await window.omp.pickDirectory()
          if (!p) return
          await get().setSettings({ defaultWorkspace: p })
          await get().newSession()
        })()
        break
      }
      case 'app:toggle-files':
        set({ filePanelOpen: !get().filePanelOpen })
        break
    }
  },

  setShowSettings: (showSettings) => set({ showSettings }),
  setShowPalette: (showPalette) => set({ showPalette }),
  setFilePanelOpen: (filePanelOpen) => set({ filePanelOpen }),

  refreshProviders: async () => {
    set({ providers: await window.omp.getProviders() })
  },

  refreshProfiles: async () => {
    const data = await window.omp.getProfiles()
    set({
      profiles: data.profiles ?? [],
      profileRoles: data.currentRoles ?? null,
      profileApproval: data.currentApprovalMode ?? ''
    })
  },

  refreshMcp: async () => {
    const ws = get().settings?.defaultWorkspace ?? ''
    set({ mcps: await window.omp.getMcpServers(ws) })
  },

  refreshSkills: async () => {
    const ws = get().settings?.defaultWorkspace ?? ''
    set({ skills: await window.omp.getSkills(ws) })
  },

  saveMcpServer: async (name, server) => {
    const r = await window.omp.saveMcpServer(name, server)
    if (!r.ok) get().addNotice('error', tr(get, 'notices.saveMcpFailed', { error: String(r.error) }))
    return r
  },

  deleteMcpServer: async (name) => {
    await window.omp.deleteMcpServer(name)
    await get().refreshMcp()
  },

  setMcpEnabled: async (name, enabled) => {
    await window.omp.setMcpEnabled(name, enabled)
    await get().refreshMcp()
  },

  toggleSkill: async (name, enabled) => {
    const r = await window.omp.toggleSkill(name, enabled)
    if (!r.ok) get().addNotice('error', tr(get, 'notices.skillFailed', { error: String(r.error) }))
    await get().refreshSkills()
  },

  setSettings: async (patch) => {
    const next = await window.omp.setSettings(patch)
    set({ settings: next })
  },

  applyProfile: async (id) => {
    const res = await window.omp.applyProfile(id)
    if (res.ok) {
      get().addNotice('info', tr(get, 'notices.profileApplied'))
      await get().refreshProfiles()
      await get().refreshProviders()
    } else {
      get().addNotice('error', tr(get, 'notices.applyProfileFailed', { error: String(res.error) }))
    }
  },

  saveProfile: async (p) => {
    const res = await window.omp.saveProfile(p)
    if (!res.ok) get().addNotice('error', tr(get, 'notices.saveProfileFailed', { error: String(res.error) }))
    await get().refreshProfiles()
  },

  deleteProfile: async (id) => {
    await window.omp.deleteProfile(id)
    await get().refreshProfiles()
  },

  addNotice: (level, text) => {
    const opts = { duration: 6000 }
    if (level === 'error') toast.error(text, opts)
    else if (level === 'warn') toast.warning(text, opts)
    else toast.info(text, opts)
  },

  confirm: (req) => {
    const id = noticeSeq++
    set((s) => ({ confirmQueue: [...s.confirmQueue, { ...req, id }] }))
  },

  resolveConfirm: (id, ok) => {
    const s = get()
    const req = s.confirmQueue.find((r) => r.id === id)
    set({ confirmQueue: s.confirmQueue.filter((r) => r.id !== id) })
    if (ok && req) req.onOk()
  }
}))

// ---------- 帧处理(rAF 合帧) ----------

let rafPending: Array<() => void> = []
let rafId: number | null = null

function scheduleFlush(): void {
  if (rafId !== null) return
  rafId = requestAnimationFrame(() => {
    rafId = null
    const fns = rafPending
    rafPending = []
    for (const fn of fns) fn()
  })
}

function handleFrame(
  set: (partial: Partial<State> | ((s: State) => Partial<State>)) => void,
  get: () => State,
  cwd: string,
  frame: Record<string, unknown>
): void {
  const chat = get().chat
  if (!chat || chat.cwd !== cwd) return
  const type = frame.type

  // 用 rAF 合帧更新 live 的 text/thinking 增量
  const patchLive = (fn: (live: LiveDraft) => void): void => {
    rafPending.push(() => {
      const s = get()
      const c = s.chat
      if (!c?.live) return
      fn(c.live)
      set({ chat: { ...c, live: { ...c.live } } })
    })
    scheduleFlush()
  }

  switch (type) {
    case 'agent_start': {
      set({ executing: 'thinking' })
      if (chat.live) break // 已有进行中的回合
      const liveMsg: DisplayMessage = {
        id: `live_${Date.now()}`,
        role: 'assistant',
        content: [],
        toolCalls: [],
        createdAt: Date.now(),
        model: chat.model ?? undefined
      }
      set({
        chat: {
          ...chat,
          live: { message: liveMsg, toolIndex: new Map(), textBuf: '', thinkBuf: '' },
          status: 'running'
        }
      })
      break
    }
    case 'message_update': {
      const ev = (frame.assistantMessageEvent ?? {}) as Record<string, unknown>
      const evType = String(ev.type ?? '')
      const delta = typeof ev.delta === 'string' ? ev.delta : ''
      if (evType === 'text_delta' && delta) {
        patchLive((l) => {
          l.textBuf += delta
          l.message.content = [...l.message.content.filter((b) => b.kind !== 'text'), { kind: 'text', text: l.textBuf }]
        })
      } else if (evType === 'thinking_delta' && delta) {
        patchLive((l) => {
          l.thinkBuf += delta
          const others = l.message.content.filter((b) => b.kind !== 'thinking')
          l.message.content = [...others, { kind: 'thinking', text: l.thinkBuf }]
        })
      } else if (typeof frame.message === 'object' && frame.message !== null && Array.isArray((frame.message as { content?: unknown }).content) && chat.live) {
        // 整块内容推送(某些事件携带完整 content)
        patchLive((l) => {
          const content = (frame.message as { content?: Array<Record<string, unknown>> }).content
          for (const block of content ?? []) {
            const t = String(block.type ?? '')
            if (t === 'text' && typeof block.text === 'string' && !l.textBuf) {
              l.textBuf = block.text
              l.message.content = [{ kind: 'text', text: block.text }]
            } else if (t === 'thinking' && typeof block.text === 'string' && !l.thinkBuf) {
              l.thinkBuf = block.text
              l.message.content = [...l.message.content.filter((b) => b.kind !== 'thinking'), { kind: 'thinking', text: block.text }]
            } else if ((t === 'toolCall' || t === 'tool_call') && typeof block.id === 'string') {
              const id = String(block.id)
              if (!l.toolIndex.has(id)) {
                const call: DisplayToolCall = {
                  id,
                  name: String(block.name ?? 'tool'),
                  args: block.arguments ?? {},
                  status: 'pending'
                }
                // 实时提取文件路径进文件面板
                for (const p of extractToolPaths(block.arguments)) {
                  set((st) => ({ sessionFiles: st.sessionFiles.includes(p) ? st.sessionFiles : [...st.sessionFiles, p] }))
                }
                l.toolIndex.set(id, call)
                l.message.toolCalls = [...l.message.toolCalls, call]
              }
            }
          }
        })
      }
      break
    }
    case 'message_end':
      break
    case 'tool_execution_start': {
      set({ executing: String(frame.toolName ?? 'tool') })
      patchLive((l) => {
        const id = String(frame.toolCallId ?? frame.id ?? '')
        if (!id) return
        let call = l.toolIndex.get(id)
        if (!call) {
          call = { id, name: String(frame.toolName ?? 'tool'), args: {}, status: 'running' }
          l.toolIndex.set(id, call)
          l.message.toolCalls = [...l.message.toolCalls, call]
        }
        call.status = 'running'
        call.startedAt = Date.now()
      })
      break
    }
    case 'tool_execution_update': {
      patchLive((l) => {
        const id = String(frame.toolCallId ?? '')
        const call = id ? l.toolIndex.get(id) : undefined
        if (call && call.status !== 'success' && call.status !== 'error') {
          call.status = 'running'
          call.endedAt = Date.now()
        }
      })
      break
    }
    case 'tool_execution_end': {
      patchLive((l) => {
        const id = String(frame.toolCallId ?? '')
        const call = id ? l.toolIndex.get(id) : undefined
        if (!call) return
        const isError = Boolean(frame.isError ?? frame.error)
        call.status = isError ? 'error' : 'success'
        call.isError = isError
        call.endedAt = Date.now()
        const result = extractText(frame.result ?? frame.output ?? frame.content ?? '')
        if (result) call.result = result
        if (isError && typeof frame.error === 'string') call.errorMessage = frame.error
      })
      break
    }
    case 'agent_end': {
      const isTerminal = frame.isTerminal !== false
      set({ executing: null })
      set((s) => {
        const c = s.chat
        if (!c) return {}
        let messages = c.messages
        let live: LiveDraft | null = c.live
        if (live) {
          messages = [...messages, live.message]
          live = null
        } else {
          // 没有 live(无增量帧)但有最终消息
          const finalMsgs = Array.isArray(frame.messages) ? (frame.messages as Array<Record<string, unknown>>) : []
          const last = finalMsgs[finalMsgs.length - 1]
          if (last && typeof last === 'object') {
            const text = extractText((last as { content?: unknown }).content)
            if (text) {
              messages = [
                ...messages,
                {
                  id: `final_${Date.now()}`,
                  role: 'assistant' as const,
                  content: [{ kind: 'text' as const, text }],
                  toolCalls: [],
                  createdAt: Date.now()
                }
              ]
            }
          }
        }
        const usage =
          typeof frame.usage === 'object' && frame.usage !== null
            ? ({ input: Number((frame.usage as { input?: number }).input ?? 0), output: Number((frame.usage as { output?: number }).output ?? 0) } as const)
            : null
        if (usage && messages.length) {
          const lastMsg = messages[messages.length - 1]
          if (lastMsg.role === 'assistant') lastMsg.usage = { ...usage }
        }
        return { chat: { ...c, messages, live, status: isTerminal ? 'idle' : 'running' } }
      })
      if (isTerminal) {
        setTimeout(() => void get().refreshSessions(), 500)
      }
      break
    }
    case 'prompt_result': {
      if (frame.agentInvoked === false) {
        set({ executing: null })
        set((s) => {
          const c = s.chat
          if (!c) return {}
          // 本地命令无 agent 回合: 若无 live 增量则直接 idle
          return { chat: { ...c, status: c.live ? c.status : 'idle' } }
        })
      }
      break
    }
    case 'model_changed': {
      if (typeof frame.model === 'string') {
        set((s) => ({ chat: s.chat ? { ...s.chat, model: frame.model as string } : null }))
      }
      break
    }
    case 'todo_reminder':
    case 'todo_update': {
      const data = (frame.data ?? frame) as Record<string, unknown>
      const todos = Array.isArray(data.todos) ? (data.todos as TodoItem[]) : null
      if (todos) set({ todos })
      break
    }
    case 'available_commands_update': {
      if (Array.isArray(frame.commands)) {
        const commands = (frame.commands as Array<Record<string, unknown>>).map((c) => ({
          name: String(c.name ?? ''),
          description: typeof c.description === 'string' ? c.description : undefined,
          aliases: Array.isArray(c.aliases) ? c.aliases.map(String) : undefined,
          source: typeof c.source === 'string' ? c.source : undefined
        }))
        set({ commands })
      }
      break
    }
    case 'auto_compaction_started': {
      patchLive((l) => {
        l.message.content = [...l.message.content, { kind: 'text', text: tr(get, 'chat.autoCompacting') }]
      })
      break
    }
    case 'auto_compaction_finished': {
      patchLive((l) => {
        const summary = extractText(frame.summary ?? '')
        l.message.content = [
          ...l.message.content.filter((b) => !b.text.startsWith('⟳')),
          { kind: 'text', text: tr(get, 'chat.compacted', { summary: summary ? `: ${summary}` : '' }) }
        ]
      })
      break
    }
    case 'error': {
      set((s) => ({
        chat: s.chat ? { ...s.chat, status: 'error', errorText: String(frame.message ?? tr(get, 'chat.error')) } : null
      }))
      break
    }
    default:
      break
  }
}
