import { ipcMain, app } from 'electron'
import { promises as fsp } from 'node:fs'
import path from 'node:path'
import { OmpPool } from './omp/pool'
import {
  deleteSession as delSession,
  exportSession as expSession,
  listSessions,
  parseSession,
  renameSession as renSession
} from './omp/sessions'
import {
  getApprovalMode,
  getProviders,
  getRoleModels,
  readSettings,
  setApprovalMode as setCfgApprovalMode,
  setRoleModels as setCfgRoleModels,
  writeSettings
} from './omp/config'
import {
  applyProfile,
  currentApprovalMode,
  currentRoleModels,
  deleteProfile,
  listProfiles,
  saveProfile
} from './omp/profiles'
import {
  deleteMcpServer as delMcp,
  getMcpServers,
  saveMcpServer as saveMcp,
  setMcpEnabled as setMcpOn
} from './omp/mcp'
import { getSkills, toggleSkill } from './omp/skills'
import { ompVersion } from './omp/locate'
import type {
  AppSettings,
  ApprovalMode,
  McpServerDraft,
  RoleModels,
  UiResponsePayload
} from '../../src/shared/types'

export interface IpcDeps {
  pool: OmpPool
  getBin: () => string
  getWorkspace: () => string
  notifySessionsChanged: () => void
  notifySettingsChanged: (s: AppSettings) => void
  notifyModels: (models: unknown[]) => void
  getLogTail: (count: number) => Promise<string[]>
}

let pinnedFile = ''
function pinsPath(): string {
  if (!pinnedFile) pinnedFile = path.join(app.getPath('userData'), 'pinned.json')
  return pinnedFile
}

async function readPins(): Promise<string[]> {
  try {
    const raw = await fsp.readFile(pinsPath(), 'utf8')
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr.map(String) : []
  } catch {
    return []
  }
}

async function writePins(pins: string[]): Promise<void> {
  await fsp.mkdir(path.dirname(pinsPath()), { recursive: true })
  const tmp = `${pinsPath()}.tmp`
  await fsp.writeFile(tmp, JSON.stringify(pins, null, 2), 'utf8')
  await fsp.rename(tmp, pinsPath())
}

export function registerIpc(deps: IpcDeps): void {
  const { pool, getBin, getWorkspace } = deps

  ipcMain.handle('omp:bootstrap', async () => {
    const settings = await readSettings()
    return {
      settings,
      ompFound: Boolean(getBin()),
      ompVersion: getBin() ? await ompVersion(getBin()) : undefined,
      defaultWorkspace: settings.defaultWorkspace || getWorkspace(),
      recentWorkspaces: await readRecentWorkspaces()
    }
  })

  // ---------- 会话 ----------

  ipcMain.handle('omp:getSessions', async () => {
    const metas = await listSessions()
    const pins = new Set(await readPins())
    for (const m of metas) m.pinned = pins.has(m.filePath)
    return metas
  })

  ipcMain.handle('omp:getSessionDetail', async (_e, filePath: string) => {
    return parseSession(filePath)
  })

  ipcMain.handle('omp:deleteSession', async (_e, filePath: string) => {
    const r = await delSession(filePath)
    if (r.ok) deps.notifySessionsChanged()
    return r
  })

  ipcMain.handle('omp:renameSession', async (_e, filePath: string, title: string) => {
    const r = await renSession(filePath, title)
    if (r.ok) deps.notifySessionsChanged()
    return r
  })

  ipcMain.handle('omp:exportSession', async (_e, filePath: string) => {
    return expSession(getBin(), filePath)
  })

  ipcMain.handle('omp:setPinned', async (_e, filePath: string, pinned: boolean) => {
    const pins = await readPins()
    const next = pinned ? [...new Set([...pins, filePath])] : pins.filter((p) => p !== filePath)
    await writePins(next)
    deps.notifySessionsChanged()
  })

  // ---------- 会话操作(RPC) ----------

  ipcMain.handle('omp:newSession', async (_e, workspace: string) => {
    try {
      const cwd = workspace || getWorkspace()
      const client = await pool.get(cwd)
      await client.newSession()
      return { ok: true }
    } catch (e) {
      return { ok: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('omp:openSession', async (_e, filePath: string) => {
    try {
      const detail = await parseSession(filePath)
      if (!detail) return { ok: false, error: '会话文件无法解析' }
      const cwd = detail.meta.workspace || getWorkspace()
      const client = await pool.get(cwd)
      await client.switchSession(filePath)
      return { ok: true, cwd }
    } catch (e) {
      return { ok: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('omp:sendPrompt', async (_e, text: string, images?: string[]) => {
    try {
      const client = await pool.get(getWorkspace())
      await client.prompt(text, images)
      return { ok: true }
    } catch (e) {
      return { ok: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('omp:abort', async () => {
    try {
      const client = await pool.get(getWorkspace())
      await client.abort()
      return { ok: true }
    } catch {
      return { ok: false }
    }
  })

  // ---------- 模型 ----------

  ipcMain.handle('omp:getModels', async () => {
    try {
      const client = await pool.get(getWorkspace())
      const data = (await client.getAvailableModels()) as { models?: unknown[] } | null
      const models = data?.models ?? []
      deps.notifyModels(models)
      return models
    } catch (e) {
      return []
    }
  })

  ipcMain.handle('omp:setModel', async (_e, provider: string, modelId: string) => {
    try {
      const client = await pool.get(getWorkspace())
      await client.setModel(provider, modelId)
      return { ok: true }
    } catch (e) {
      return { ok: false, error: (e as Error).message }
    }
  })

  // ---------- UI 应答 ----------

  ipcMain.handle('omp:respondUi', (_e, id: string, payload: UiResponsePayload) => {
    const client = pool.getIfExists(getWorkspace())
    if (client) client.respondUi(id, payload as Record<string, unknown>)
  })

  // ---------- 设置 ----------

  ipcMain.handle('omp:getSettings', async () => readSettings())

  ipcMain.handle('omp:setSettings', async (_e, patch: Partial<AppSettings>) => {
    const next = await writeSettings(patch)
    deps.notifySettingsChanged(next)
    return next
  })

  // ---------- 供应商 / 方案 ----------

  ipcMain.handle('omp:getProviders', async () => getProviders())

  ipcMain.handle('omp:getProfiles', async () => {
    const profiles = await listProfiles()
    const roles = await currentRoleModels()
    const mode = await currentApprovalMode()
    return { profiles, currentRoles: roles, currentApprovalMode: mode }
  })

  ipcMain.handle(
    'omp:saveProfile',
    async (_e, p: { name: string; provider: string; roles: RoleModels; approvalMode: ApprovalMode; apiKey?: string }) => {
      return saveProfile(p)
    }
  )

  ipcMain.handle('omp:deleteProfile', async (_e, id: string) => deleteProfile(id))

  ipcMain.handle('omp:applyProfile', async (_e, id: string) => {
    const r = await applyProfile(id)
    if (r.ok) {
      // 配置已变更: 重启进程池生效
      await pool.restartAll()
      deps.notifySettingsChanged(await readSettings())
    }
    return r
  })

  // ---------- MCP / Skills ----------

  ipcMain.handle('omp:getMcpServers', async (_e, workspace: string) => {
    return getMcpServers(workspace || getWorkspace())
  })

  ipcMain.handle('omp:saveMcpServer', async (_e, name: string, server: McpServerDraft) => {
    return saveMcp(name, server)
  })

  ipcMain.handle('omp:deleteMcpServer', async (_e, name: string) => delMcp(name))

  ipcMain.handle('omp:setMcpEnabled', async (_e, name: string, enabled: boolean) => {
    return setMcpOn(name, enabled)
  })

  ipcMain.handle('omp:getSkills', async (_e, workspace: string) => {
    return getSkills(workspace || getWorkspace())
  })

  ipcMain.handle('omp:toggleSkill', async (_e, name: string, enabled: boolean) => {
    return toggleSkill(name, enabled)
  })

  // ---------- 日志 ----------

  ipcMain.handle('omp:getOmpLogs', (_e, count: number) => deps.getLogTail(count ?? 50))

  // ---------- 角色模型(方案编辑器用) ----------

  ipcMain.handle('omp:getRoleModels', async () => getRoleModels())
  ipcMain.handle('omp:setRoleModels', async (_e, roles: RoleModels) => {
    const r = await setCfgRoleModels(roles)
    if (r.ok) await pool.restartAll()
    return r
  })
  ipcMain.handle('omp:getApprovalMode', async () => getApprovalMode())
  ipcMain.handle('omp:setApprovalMode', async (_e, mode: ApprovalMode) => {
    const r = await setCfgApprovalMode(mode)
    if (r.ok) await pool.restartAll()
    return r
  })
}

// ---------- 最近工作区 ----------

export async function readRecentWorkspaces(): Promise<string[]> {
  try {
    const settings = await readSettings()
    const sessions = await listSessions()
    const workspaces = new Set<string>()
    if (settings.defaultWorkspace) workspaces.add(settings.defaultWorkspace)
    for (const s of sessions) {
      if (s.workspace) workspaces.add(s.workspace)
    }
    return [...workspaces].slice(0, 10)
  } catch {
    return []
  }
}
