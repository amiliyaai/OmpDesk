/**
 * 主进程 ↔ 渲染进程共享类型契约(仅类型,运行时被擦除)
 */

// ---------- 会话 ----------

export type SessionStatus =
  | 'complete'
  | 'interrupted'
  | 'aborted'
  | 'error'
  | 'pending'
  | 'unknown'

export interface SessionMeta {
  id: string // session id (ulid)
  filePath: string // 绝对路径
  workspace: string // 会话工作目录
  title: string
  createdAt: number // epoch ms
  updatedAt: number // epoch ms(文件 mtime)
  status: SessionStatus
  model?: string
  pinned?: boolean // 应用级固定(存应用存储)
}

export interface DisplayContentBlock {
  kind: 'text' | 'thinking'
  text: string
}

export type ToolCallStatus = 'pending' | 'running' | 'success' | 'error'

export interface DisplayToolCall {
  id: string
  name: string
  args: unknown
  status: ToolCallStatus
  result?: string
  isError?: boolean
  errorMessage?: string
  startedAt?: number
  endedAt?: number
}

export interface DisplayMessage {
  id: string
  role: 'user' | 'assistant' | 'notice'
  content: DisplayContentBlock[]
  toolCalls: DisplayToolCall[]
  createdAt: number
  model?: string
  usage?: { input: number; output: number } | null
  error?: string | null
}

export interface SessionDetail {
  meta: SessionMeta
  messages: DisplayMessage[]
  /** 会话中 agent 读写过的文件路径(相对或绝对, 文件面板用) */
  files?: string[]
}

// ---------- 用量聚合(历史会话 token 统计) ----------

export interface WorkspaceUsage {
  workspace: string
  sessions: number
  input: number
  output: number
}

export interface UsageStats {
  total: { sessions: number; input: number; output: number }
  byWorkspace: WorkspaceUsage[]
}

// ---------- 文件面板 ----------

export interface WorkspaceFile {
  name: string
  relPath: string // 相对 workspace 的路径(正斜杠)
  type: 'file' | 'dir'
}

// ---------- UI 请求(extension_ui_request) ----------

export type UiRequest =
  | {
      id: string
      kind: 'confirm'
      title: string
      message: string
      timeout: number | null
    }
  | {
      id: string
      kind: 'select'
      title: string
      message: string
      options: string[]
      multiple: boolean
      timeout: number | null
    }
  | {
      id: string
      kind: 'input'
      title: string
      message: string
      placeholder?: string
      timeout: number | null
    }
  | {
      id: string
      kind: 'editor'
      title: string
      message: string
      initial?: string
      timeout: number | null
    }
  | { id: string; kind: 'notify'; title: string; message: string }

export type UiResponsePayload =
  | { value: string | string[] }
  | { confirmed: boolean }
  | { cancelled: boolean }

export interface ProfilesData {
  profiles: OmpProfile[]
  currentRoles: RoleModels
  currentApprovalMode: ApprovalMode | ''
}

// ---------- 模型 ----------

export interface ModelInfo {
  provider: string
  id: string
  name?: string
  reasoning?: boolean
}

// ---------- Todo ----------

export interface TodoItem {
  id: string
  text: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
}

// ---------- 斜杠命令 ----------

export interface CommandInfo {
  name: string
  description?: string
  aliases?: string[]
  source?: string
}

// ---------- 设置(应用级) ----------

export type ApprovalMode = 'always-ask' | 'write' | 'yolo'

/** 应用 UI 语言 */
export type Language = 'zh-CN' | 'en' | 'ja'

/** Agent 后端: omp(oh-my-pi) 与 pi(earendil-works) 同源 */
export type AgentBackendId = 'omp' | 'pi'

export interface AppSettings {
  theme: 'dark' | 'light' | 'system'
  fontScale: number // 0.9 ~ 1.2
  approvalMode: ApprovalMode | '' // '' = 用 omp 配置
  defaultWorkspace: string
  ompPath: string // 探测结果
  ompAutoDetected: boolean
  maxPoolProcesses: number
  idleKillMinutes: number
  hotkey: string
  /** 应用 UI 语言(缺省 zh-CN) */
  language?: Language
  /** Agent 后端(auto = omp 优先, 缺省) */
  backend?: 'auto' | AgentBackendId
  /** 关闭窗口→托盘的首开提示是否已展示过 */
  trayHintShown?: boolean
}

// ---------- 配置方案(CC Switch 式) ----------

export interface ProviderSummary {
  name: string
  hasKey: boolean
  modelCount: number
}

export interface RoleModels {
  default: string
  smol: string
  slow: string
  plan: string
}

export interface OmpProfile {
  id: string
  name: string
  provider: string
  roles: RoleModels
  approvalMode: ApprovalMode
  createdAt: number
  updatedAt: number
}

// ---------- MCP ----------

export interface McpServerInfo {
  name: string
  source: 'user' | 'project' | 'compat'
  sourceFile: string
  type: string // stdio | http | sse
  command?: string
  args?: string[]
  url?: string
  envKeys: string[]
  enabled: boolean
  description?: string
}

export interface McpServerDraft {
  type: 'stdio' | 'http' | 'sse'
  command?: string
  args?: string[]
  url?: string
  env?: Record<string, string>
  enabled: boolean
}

// ---------- Skills ----------

export interface SkillInfo {
  name: string
  description: string
  globs?: string[]
  path: string // SKILL.md 路径
  root: string // 根目录名(user/project/managed/plugins)
  enabled: boolean
}

// ---------- 主进程 → 渲染进程事件 ----------

export type MainEvent =
  | { type: 'omp:frame'; cwd: string; frame: Record<string, unknown> }
  | {
      type: 'omp:state'
      cwd: string
      connected: boolean
      model?: string
      error?: string
    }
  | { type: 'sessions:changed' }
  | { type: 'settings:changed'; settings: AppSettings }
  | { type: 'models:available'; models: ModelInfo[] }
  | { type: 'ui:request'; request: UiRequest }
  | { type: 'ui:resolved'; id: string }
  | { type: 'notice'; level: 'info' | 'warn' | 'error'; text: string }
  | { type: 'app:new-session' }
  | { type: 'app:open-settings' }
  | { type: 'app:pick-workspace' }
  | { type: 'app:toggle-files' }
  | { type: 'updater:state'; state: UpdaterState }

// ---------- 自动更新状态 ----------

export type UpdaterState =
  | { phase: 'idle' }
  | { phase: 'checking' }
  | { phase: 'up-to-date'; version: string }
  | { phase: 'downloading'; version: string }
  | { phase: 'downloaded'; version: string; notes?: string }
  | { phase: 'error'; message: string }

// ---------- 启动数据 ----------

export interface BootstrapData {
  settings: AppSettings
  ompFound: boolean
  ompVersion?: string
  defaultWorkspace: string
  recentWorkspaces: string[]
}

// ---------- preload 暴露的 API ----------

export interface OmpApi {
  /** 运行平台(渲染端菜单栏 macOS 隐藏用) */
  platform: string
  bootstrap(): Promise<BootstrapData>
  getSessions(): Promise<SessionMeta[]>
  /** 全部历史会话的 token 聚合(总计 + 按工作区) */
  getUsageStats(): Promise<UsageStats>
  getSessionDetail(filePath: string): Promise<SessionDetail>
  deleteSession(filePath: string): Promise<{ ok: boolean; error?: string }>
  renameSession(filePath: string, title: string): Promise<{ ok: boolean; error?: string }>
  exportSession(filePath: string): Promise<{ ok: boolean; path?: string; error?: string }>
  newSession(workspace: string): Promise<{ ok: boolean; error?: string }>
  openSession(filePath: string): Promise<{ ok: boolean; cwd?: string; error?: string }>
  /** workspace 缺省时用默认工作目录 */
  sendPrompt(text: string, images?: string[], workspace?: string): Promise<{ ok: boolean; error?: string }>
  abort(): Promise<void>
  getModels(): Promise<ModelInfo[]>
  setModel(provider: string, modelId: string): Promise<{ ok: boolean; error?: string }>
  /** 写 config.yml 审批模式并重启会话进程 */
  setApprovalMode(mode: ApprovalMode): Promise<{ ok: boolean; error?: string }>
  getSettings(): Promise<AppSettings>
  setSettings(patch: Partial<AppSettings>): Promise<AppSettings>
  getProviders(): Promise<ProviderSummary[]>
  getProfiles(): Promise<ProfilesData>
  saveProfile(
    p: Omit<OmpProfile, 'id' | 'createdAt' | 'updatedAt'> & { apiKey?: string }
  ): Promise<{ ok: boolean; error?: string }>
  deleteProfile(id: string): Promise<{ ok: boolean; error?: string }>
  applyProfile(id: string): Promise<{ ok: boolean; error?: string }>
  getMcpServers(workspace: string): Promise<McpServerInfo[]>
  saveMcpServer(name: string, server: McpServerDraft): Promise<{ ok: boolean; error?: string }>
  deleteMcpServer(name: string): Promise<{ ok: boolean; error?: string }>
  setMcpEnabled(name: string, enabled: boolean): Promise<{ ok: boolean; error?: string }>
  getSkills(workspace: string): Promise<SkillInfo[]>
  toggleSkill(name: string, enabled: boolean): Promise<{ ok: boolean; error?: string }>
  respondUi(id: string, payload: UiResponsePayload): Promise<void>
  setPinned(filePath: string, pinned: boolean): Promise<void>
  getOmpLogs(count: number): Promise<string[]>
  pickDirectory(): Promise<string | null>
  /** 列出工作区文件树(跳过 node_modules/.git 等, 有数量/深度限制) */
  listFiles(workspace: string): Promise<WorkspaceFile[]>
  /** 读取工作区内文件(只读, 防路径穿越, 512KB 上限) */
  readFile(workspace: string, relPath: string): Promise<{ ok: boolean; content?: string; error?: string }>
  /** 切换窗口全屏 */
  toggleFullScreen(): Promise<void>
  /** 网页缩放(delta 步进, 与原生 View 菜单角色一致) */
  zoom(delta: number): Promise<void>
  /** 重置缩放 */
  zoomReset(): Promise<void>
  /** 完全退出应用(菜单"退出") */
  quit(): Promise<void>
  /** 弹出"关于"对话框(主进程) */
  showAbout(): Promise<void>
  /** 应用版本号(设置→关于) */
  getVersion(): Promise<string>
  checkForUpdates(): Promise<void>
  quitAndInstall(): Promise<void>
  onEvent(cb: (e: MainEvent) => void): () => void
}

declare global {
  interface Window {
    omp: OmpApi
  }
}
