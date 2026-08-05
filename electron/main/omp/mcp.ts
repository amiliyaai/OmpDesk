import { promises as fsp } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { agentDir } from './locate'
import { getBackend } from './backend'
import { parseToml } from './toml'
import type { McpServerDraft, McpServerInfo } from '../../../src/shared/types'

interface McpDoc {
  $schema?: string
  mcpServers: Record<string, Record<string, unknown>>
  disabledServers?: string[]
  enabledServers?: string[]
}

interface McpSource {
  doc: McpDoc | null
  file: string
  source: McpServerInfo['source']
  provider?: string
}

/**
 * MCP 配置管理(发现范围对齐 oh-my-pi v17 的 loadMCPServers)
 * 可写目标: agentDir()/mcp.json(用户级, OmpDesk 的编辑目标)
 * 只读展示: 项目级 .omp/mcp.json、根目录 mcp.json 回退, 以及从其他工具导入的
 * 配置(Claude Code / Codex / Cursor / VS Code / OpenCode / Windsurf / Gemini)。
 * 优先级(同名先到先得): 原生用户 > 原生项目 > claude > codex > gemini >
 * opencode > cursor > windsurf > vscode > 根目录回退。
 */

function userMcpPath(): string {
  return path.join(agentDir(), 'mcp.json')
}

function projectMcpPath(workspace: string): string {
  return path.join(getBackend().projectDir(workspace), 'mcp.json')
}

async function readDoc(file: string): Promise<McpDoc | null> {
  try {
    const raw = await fsp.readFile(file, 'utf8')
    const doc = JSON.parse(raw) as Partial<McpDoc>
    if (!doc || typeof doc.mcpServers !== 'object' || doc.mcpServers === null) return null
    return { mcpServers: doc.mcpServers as Record<string, Record<string, unknown>>, disabledServers: doc.disabledServers, enabledServers: doc.enabledServers }
  } catch {
    return null
  }
}

async function writeDoc(file: string, doc: McpDoc): Promise<void> {
  const bak = `${file}.${Date.now()}.bak`
  await fsp.copyFile(file, bak).catch(() => {})
  const tmp = `${file}.tmp`
  await fsp.mkdir(path.dirname(file), { recursive: true })
  await fsp.writeFile(tmp, JSON.stringify(doc, null, 2), 'utf8')
  await fsp.rename(tmp, file)
}

// ---------- 导入源解析 ----------

/** Claude Code: ~/.claude.json(顶层 mcpServers + projects[<ws>].mcpServers) */
async function readClaudeJson(file: string, workspace: string): Promise<McpSource[]> {
  try {
    const raw = await fsp.readFile(file, 'utf8')
    const data = JSON.parse(raw) as {
      mcpServers?: Record<string, Record<string, unknown>>
      projects?: Record<string, { mcpServers?: Record<string, Record<string, unknown>> }>
    }
    const out: McpSource[] = []
    const projects = data.projects ?? {}
    const norm = (p: string): string => p.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase()
    const wsKey = norm(workspace)
    const hit = Object.keys(projects).find((k) => norm(k) === wsKey)
    if (hit && projects[hit]?.mcpServers) {
      out.push({ doc: { mcpServers: projects[hit].mcpServers! }, file, source: 'project', provider: 'claude' })
    }
    if (data.mcpServers && typeof data.mcpServers === 'object') {
      out.push({ doc: { mcpServers: data.mcpServers }, file, source: 'user', provider: 'claude' })
    }
    return out
  } catch {
    return []
  }
}

/** Codex: config.toml 的 [mcp_servers.*] 表(含嵌套 env 表) */
async function readCodexToml(file: string): Promise<McpDoc | null> {
  try {
    const doc = parseToml(await fsp.readFile(file, 'utf8'))
    const servers = doc?.mcp_servers
    if (!servers || typeof servers !== 'object' || Array.isArray(servers)) return null
    const mcpServers: Record<string, Record<string, unknown>> = {}
    for (const [name, v] of Object.entries(servers as Record<string, unknown>)) {
      if (v && typeof v === 'object' && !Array.isArray(v)) mcpServers[name] = v as Record<string, unknown>
    }
    if (!Object.keys(mcpServers).length) return null
    return { mcpServers }
  } catch {
    return null
  }
}

/** OpenCode: { "mcp": { name: { type, command: string[]|string, url, enabled, environment } } } */
async function readOpenCode(file: string): Promise<McpDoc | null> {
  try {
    const raw = await fsp.readFile(file, 'utf8')
    const data = JSON.parse(raw) as { mcp?: Record<string, unknown> }
    const mcp = data.mcp
    if (!mcp || typeof mcp !== 'object') return null
    const mcpServers: Record<string, Record<string, unknown>> = {}
    for (const [name, v] of Object.entries(mcp)) {
      if (typeof v === 'string') {
        // 字符串形式: "npx -y pkg" → command + args
        const parts = v.trim().split(/\s+/)
        mcpServers[name] = { type: 'stdio', command: parts[0], args: parts.slice(1) }
      } else if (v && typeof v === 'object') {
        const s = v as Record<string, unknown>
        const cmd = Array.isArray(s.command) ? (s.command as unknown[]).map(String) : typeof s.command === 'string' ? s.command.split(/\s+/).filter(Boolean) : []
        const server: Record<string, unknown> = { enabled: s.enabled !== false }
        if (s.url) {
          server.type = s.type === 'sse' ? 'sse' : 'http'
          server.url = String(s.url)
        } else {
          server.type = 'stdio'
          server.command = cmd[0]
          if (cmd.length > 1) server.args = cmd.slice(1)
        }
        if (s.environment && typeof s.environment === 'object') server.env = s.environment
        mcpServers[name] = server
      }
    }
    if (!Object.keys(mcpServers).length) return null
    return { mcpServers }
  } catch {
    return null
  }
}

/** Gemini CLI: settings.json 的 mcpServers(数组或对象形式, 防御性解析) */
async function readGemini(file: string): Promise<McpDoc | null> {
  try {
    const raw = await fsp.readFile(file, 'utf8')
    const data = JSON.parse(raw) as { mcpServers?: unknown }
    const servers = data.mcpServers
    if (!servers) return null
    const mcpServers: Record<string, Record<string, unknown>> = {}
    if (Array.isArray(servers)) {
      for (const it of servers) {
        if (!it || typeof it !== 'object') continue
        const s = it as Record<string, unknown>
        const name = String(s.name ?? '')
        if (!name) continue
        mcpServers[name] = { ...s }
        delete mcpServers[name].name
      }
    } else if (typeof servers === 'object') {
      Object.assign(mcpServers, servers as Record<string, Record<string, unknown>>)
    }
    if (!Object.keys(mcpServers).length) return null
    return { mcpServers }
  } catch {
    return null
  }
}

/** 收集某来源的全部候选文件(用户级/项目级, 按优先级排序) */
async function collectSources(workspaceRoot: string): Promise<McpSource[]> {
  const home = os.homedir()
  const sources: McpSource[] = []

  const push = async (doc: Promise<McpDoc | null>, file: string, source: McpSource['source'], provider?: string): Promise<void> => {
    const d = await doc
    if (d) sources.push({ doc: d, file, source, provider })
  }

  // 1) 原生: 用户级 + 项目级(可写目标优先)
  await push(readDoc(userMcpPath()), userMcpPath(), 'user', 'omp')
  await push(readDoc(path.join(agentDir(), '.mcp.json')), path.join(agentDir(), '.mcp.json'), 'user', 'omp')
  await push(readDoc(projectMcpPath(workspaceRoot)), projectMcpPath(workspaceRoot), 'project', 'omp')
  await push(readDoc(path.join(getBackend().projectDir(workspaceRoot), '.mcp.json')), path.join(getBackend().projectDir(workspaceRoot), '.mcp.json'), 'project', 'omp')

  // 2) Claude Code(项目条目先于用户条目)
  await push(readDoc(path.join(workspaceRoot, '.claude', 'mcp.json')), path.join(workspaceRoot, '.claude', 'mcp.json'), 'project', 'claude')
  await push(readDoc(path.join(workspaceRoot, '.claude', '.mcp.json')), path.join(workspaceRoot, '.claude', '.mcp.json'), 'project', 'claude')
  for (const src of await readClaudeJson(path.join(home, '.claude.json'), workspaceRoot)) sources.push(src)
  await push(readDoc(path.join(home, '.claude', 'mcp.json')), path.join(home, '.claude', 'mcp.json'), 'user', 'claude')

  // 3) Codex
  await push(readCodexToml(path.join(workspaceRoot, '.codex', 'config.toml')), path.join(workspaceRoot, '.codex', 'config.toml'), 'project', 'codex')
  await push(readCodexToml(path.join(home, '.codex', 'config.toml')), path.join(home, '.codex', 'config.toml'), 'user', 'codex')

  // 4) Gemini CLI
  await push(readGemini(path.join(workspaceRoot, '.gemini', 'settings.json')), path.join(workspaceRoot, '.gemini', 'settings.json'), 'project', 'gemini')
  await push(readGemini(path.join(home, '.gemini', 'settings.json')), path.join(home, '.gemini', 'settings.json'), 'user', 'gemini')

  // 5) OpenCode(用户条目先于项目条目)
  await push(readOpenCode(path.join(home, '.config', 'opencode', 'opencode.json')), path.join(home, '.config', 'opencode', 'opencode.json'), 'user', 'opencode')
  await push(readOpenCode(path.join(workspaceRoot, 'opencode.json')), path.join(workspaceRoot, 'opencode.json'), 'project', 'opencode')

  // 6) Cursor
  await push(readDoc(path.join(workspaceRoot, '.cursor', 'mcp.json')), path.join(workspaceRoot, '.cursor', 'mcp.json'), 'project', 'cursor')
  await push(readDoc(path.join(home, '.cursor', 'mcp.json')), path.join(home, '.cursor', 'mcp.json'), 'user', 'cursor')

  // 7) Windsurf
  await push(readDoc(path.join(workspaceRoot, '.windsurf', 'mcp_config.json')), path.join(workspaceRoot, '.windsurf', 'mcp_config.json'), 'project', 'windsurf')
  await push(readDoc(path.join(home, '.codeium', 'windsurf', 'mcp_config.json')), path.join(home, '.codeium', 'windsurf', 'mcp_config.json'), 'user', 'windsurf')

  // 8) VS Code(.vscode/mcp.json 用 servers 键)
  await push(readDocVscode(path.join(workspaceRoot, '.vscode', 'mcp.json')), path.join(workspaceRoot, '.vscode', 'mcp.json'), 'project', 'vscode')

  // 9) 根目录回退(最低优先级)
  await push(readDoc(path.join(workspaceRoot, 'mcp.json')), path.join(workspaceRoot, 'mcp.json'), 'compat')
  await push(readDoc(path.join(workspaceRoot, '.mcp.json')), path.join(workspaceRoot, '.mcp.json'), 'compat')

  return sources
}

/** VS Code 的 mcp.json 使用 "servers" 键, 读取时归一化 */
async function readDocVscode(file: string): Promise<McpDoc | null> {
  try {
    const raw = await fsp.readFile(file, 'utf8')
    const data = JSON.parse(raw) as { servers?: Record<string, Record<string, unknown>> }
    if (!data.servers || typeof data.servers !== 'object') return null
    return { mcpServers: data.servers }
  } catch {
    return null
  }
}

export async function getMcpServers(workspace: string): Promise<McpServerInfo[]> {
  const out: McpServerInfo[] = []
  const seen = new Set<string>()

  const workspaceRoot = workspace || process.cwd()
  const sources = await collectSources(workspaceRoot)

  // 用户级 ~/.omp/agent/mcp.json 的 denylist/allowlist 全局生效(omp 语义:
  // disabledServers 按名屏蔽任何来源的服务器; enabledServers 强制启用名单内条目,
  // 但不禁用未列入的条目)。setMcpEnabled 对项目/导入来源只写这两个列表。
  const userDoc = sources.find((s) => s.provider === 'omp' && s.source === 'user' && s.file === userMcpPath())?.doc ?? null
  const globalDisabled = new Set(userDoc?.disabledServers ?? [])
  const globalAllowlist = userDoc?.enabledServers

  const push = (doc: McpDoc | null, file: string, source: McpServerInfo['source'], provider?: string) => {
    if (!doc) return
    const localDisabled = new Set(doc.disabledServers ?? [])
    for (const [name, raw] of Object.entries(doc.mcpServers)) {
      if (seen.has(name)) continue // 优先级: 先到先得
      seen.add(name)
      const s = (raw ?? {}) as Record<string, unknown>
      const explicitEnabled = typeof s.enabled === 'boolean' ? s.enabled : true
      const enabled =
        globalDisabled.has(name) ? false
        : globalAllowlist?.includes(name) ? true
        : explicitEnabled && !localDisabled.has(name)
      out.push({
        name,
        source,
        sourceFile: file,
        provider,
        type: String(s.type ?? 'stdio'),
        command: typeof s.command === 'string' ? s.command : undefined,
        args: Array.isArray(s.args) ? s.args.map(String) : undefined,
        url: typeof s.url === 'string' ? s.url : undefined,
        envKeys: s.env && typeof s.env === 'object' ? Object.keys(s.env as Record<string, unknown>) : [],
        enabled
      })
    }
  }

  for (const src of sources) {
    push(src.doc, src.file, src.source, src.provider)
  }
  return out
}

export async function saveMcpServer(
  name: string,
  draft: McpServerDraft
): Promise<{ ok: boolean; error?: string }> {
  const file = userMcpPath()
  const doc = (await readDoc(file)) ?? { mcpServers: {} }
  const server: Record<string, unknown> = { type: draft.type, enabled: draft.enabled }
  if (draft.command) server.command = draft.command
  if (draft.args?.length) server.args = draft.args
  if (draft.url) server.url = draft.url
  if (draft.env && Object.keys(draft.env).length) server.env = draft.env
  doc.mcpServers[name] = server
  try {
    await writeDoc(file, doc)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

export async function deleteMcpServer(name: string): Promise<{ ok: boolean; error?: string }> {
  const file = userMcpPath()
  const doc = await readDoc(file)
  if (!doc) return { ok: true }
  delete doc.mcpServers[name]
  doc.disabledServers = (doc.disabledServers ?? []).filter((x) => x !== name)
  doc.enabledServers = (doc.enabledServers ?? []).filter((x) => x !== name)
  try {
    await writeDoc(file, doc)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

export async function setMcpEnabled(
  name: string,
  enabled: boolean
): Promise<{ ok: boolean; error?: string }> {
  const file = userMcpPath()
  const doc = (await readDoc(file)) ?? { mcpServers: {} }
  const server = doc.mcpServers[name]
  if (server) {
    server.enabled = enabled
  } else {
    // 项目/导入来源的服务器: 通过用户级 denylist/allowlist 控制
    doc.disabledServers = doc.disabledServers ?? []
    doc.enabledServers = doc.enabledServers ?? []
    if (enabled) {
      doc.disabledServers = doc.disabledServers.filter((x) => x !== name)
      if (!doc.enabledServers.includes(name)) doc.enabledServers.push(name)
    } else {
      doc.enabledServers = doc.enabledServers.filter((x) => x !== name)
      if (!doc.disabledServers.includes(name)) doc.disabledServers.push(name)
    }
  }
  try {
    await writeDoc(file, doc)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}
