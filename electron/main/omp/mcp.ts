import { promises as fsp } from 'node:fs'
import path from 'node:path'
import { agentDir } from './locate'
import type { McpServerDraft, McpServerInfo } from '../../../src/shared/types'

interface McpDoc {
  $schema?: string
  mcpServers: Record<string, Record<string, unknown>>
  disabledServers?: string[]
  enabledServers?: string[]
}

/**
 * MCP 配置管理
 * 用户级: ~/.omp/agent/mcp.json(可写, OmpDesk 的编辑目标)
 * 项目级: <workspace>/.omp/mcp.json(只读展示)
 * 兼容源: .mcp.json 等(只读展示)
 */

function userMcpPath(): string {
  return path.join(agentDir(), 'mcp.json')
}

function projectMcpPath(workspace: string): string {
  return path.join(workspace, '.omp', 'mcp.json')
}

function compatPaths(workspace: string): Array<{ file: string; label: string }> {
  return [
    { file: path.join(agentDir(), '.mcp.json'), label: '用户兼容 (.mcp.json)' },
    { file: path.join(workspace, '.mcp.json'), label: '项目兼容 (.mcp.json)' }
  ]
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

export async function getMcpServers(workspace: string): Promise<McpServerInfo[]> {
  const out: McpServerInfo[] = []
  const seen = new Set<string>()

  const push = (doc: McpDoc | null, file: string, source: McpServerInfo['source']) => {
    if (!doc) return
    const disabled = new Set(doc.disabledServers ?? [])
    const allowlist = doc.enabledServers
    for (const [name, raw] of Object.entries(doc.mcpServers)) {
      if (seen.has(name)) continue // 优先级: 用户 > 项目 > 兼容
      seen.add(name)
      const s = (raw ?? {}) as Record<string, unknown>
      const explicitEnabled = typeof s.enabled === 'boolean' ? s.enabled : true
      const enabled =
        allowlist !== undefined ? allowlist.includes(name) && !disabled.has(name) : explicitEnabled && !disabled.has(name)
      out.push({
        name,
        source,
        sourceFile: file,
        type: String(s.type ?? 'stdio'),
        command: typeof s.command === 'string' ? s.command : undefined,
        args: Array.isArray(s.args) ? s.args.map(String) : undefined,
        url: typeof s.url === 'string' ? s.url : undefined,
        envKeys: s.env && typeof s.env === 'object' ? Object.keys(s.env as Record<string, unknown>) : [],
        enabled
      })
    }
  }

  const workspaceRoot = workspace || process.cwd()
  push(await readDoc(userMcpPath()), userMcpPath(), 'user')
  push(await readDoc(projectMcpPath(workspaceRoot)), projectMcpPath(workspaceRoot), 'project')
  for (const c of compatPaths(workspaceRoot)) {
    push(await readDoc(c.file), c.file, 'compat')
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
    // 项目/兼容来源的服务器: 通过用户级 denylist/allowlist 控制
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
