import { promises as fsp } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import YAML from 'yaml'
import { app } from 'electron'
import { agentDir } from './locate'
import type {
  AppSettings,
  ApprovalMode,
  ProviderSummary,
  RoleModels
} from '../../../src/shared/types'

// ---------- 应用级设置(存 userData/settings.json) ----------

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  fontScale: 1,
  approvalMode: '',
  defaultWorkspace: os.homedir(),
  ompPath: '',
  ompAutoDetected: true,
  maxPoolProcesses: 2,
  idleKillMinutes: 30,
  hotkey: 'CommandOrControl+Shift+Space'
}

function settingsPath(): string {
  return path.join(app.getPath('userData'), 'settings.json')
}

export async function readSettings(): Promise<AppSettings> {
  try {
    const raw = await fsp.readFile(settingsPath(), 'utf8')
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<AppSettings>) }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export async function writeSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const cur = await readSettings()
  const next = { ...cur, ...patch }
  await atomicWriteJson(settingsPath(), next)
  return next
}

// ---------- omp 配置文件读写(写前自动备份 + 原子写) ----------

function configPath(): string {
  return path.join(agentDir(), 'config.yml')
}

function modelsPath(): string {
  return path.join(agentDir(), 'models.yml')
}

async function readYaml(file: string): Promise<Record<string, unknown>> {
  try {
    const raw = await fsp.readFile(file, 'utf8')
    const doc = YAML.parse(raw)
    return typeof doc === 'object' && doc !== null ? (doc as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

async function writeYaml(file: string, doc: unknown): Promise<void> {
  // 写前自动备份(cc-switch 同款策略)
  const bak = `${file}.${Date.now()}.bak`
  await fsp.copyFile(file, bak).catch(() => {})
  const tmp = `${file}.tmp`
  await fsp.writeFile(tmp, YAML.stringify(doc), 'utf8')
  await fsp.rename(tmp, file)
}

async function atomicWriteJson(file: string, obj: unknown): Promise<void> {
  const tmp = `${file}.tmp`
  await fsp.mkdir(path.dirname(file), { recursive: true })
  await fsp.writeFile(tmp, JSON.stringify(obj, null, 2), 'utf8')
  await fsp.rename(tmp, file)
}

// ---------- 审批模式 ----------

export async function getApprovalMode(): Promise<ApprovalMode | ''> {
  const doc = await readYaml(configPath())
  const tools = doc.tools as Record<string, unknown> | undefined
  const mode = tools?.approvalMode
  if (mode === 'always-ask' || mode === 'write' || mode === 'yolo') return mode
  return ''
}

export async function setApprovalMode(mode: ApprovalMode): Promise<{ ok: boolean; error?: string }> {
  try {
    const doc = await readYaml(configPath())
    const tools = (doc.tools ??= {}) as Record<string, unknown>
    tools.approvalMode = mode
    await writeYaml(configPath(), doc)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

// ---------- 模型角色映射 ----------

export async function getRoleModels(): Promise<RoleModels> {
  const doc = await readYaml(configPath())
  const roles = (doc.modelRoles ?? {}) as Record<string, unknown>
  return {
    default: String(roles.default ?? ''),
    smol: String(roles.smol ?? ''),
    slow: String(roles.slow ?? ''),
    plan: String(roles.plan ?? '')
  }
}

export async function setRoleModels(roles: RoleModels): Promise<{ ok: boolean; error?: string }> {
  try {
    const doc = await readYaml(configPath())
    doc.modelRoles = {
      default: roles.default || undefined,
      smol: roles.smol || undefined,
      slow: roles.slow || undefined,
      plan: roles.plan || undefined
    }
    await writeYaml(configPath(), doc)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

// ---------- Skills 启停 ----------

export async function getSkillFilter(): Promise<{ ignored: string[]; include: string[] }> {
  const doc = await readYaml(configPath())
  const skills = (doc.skills ?? {}) as Record<string, unknown>
  return {
    ignored: Array.isArray(skills.ignoredSkills) ? skills.ignoredSkills.map(String) : [],
    include: Array.isArray(skills.includeSkills) ? skills.includeSkills.map(String) : []
  }
}

export async function setSkillEnabled(
  name: string,
  enabled: boolean
): Promise<{ ok: boolean; error?: string }> {
  try {
    const doc = await readYaml(configPath())
    const skills = (doc.skills ??= {}) as Record<string, unknown>
    const ignored = Array.isArray(skills.ignoredSkills) ? skills.ignoredSkills.map(String) : []
    if (enabled) {
      skills.ignoredSkills = ignored.filter((x) => x !== name)
    } else if (!ignored.includes(name)) {
      skills.ignoredSkills = [...ignored, name]
    }
    await writeYaml(configPath(), doc)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

// ---------- 供应商(models.yml, 密钥脱敏) ----------

export async function getProviders(): Promise<ProviderSummary[]> {
  const doc = await readYaml(modelsPath())
  const providers = (doc.providers ?? {}) as Record<string, unknown>
  return Object.entries(providers)
    .filter(([name]) => !name.startsWith('__'))
    .map(([name, p]) => {
      const provider = (p ?? {}) as Record<string, unknown>
      const models = Array.isArray(provider.models) ? provider.models : []
      return {
        name,
        hasKey: typeof provider.apiKey === 'string' && provider.apiKey.length > 0,
        modelCount: models.length
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function setProviderKey(
  provider: string,
  apiKey: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const doc = await readYaml(modelsPath())
    const providers = (doc.providers ??= {}) as Record<string, unknown>
    const p = ((providers[provider] ??= {}) as Record<string, unknown>)
    if (apiKey.trim()) {
      p.apiKey = apiKey.trim()
    } else {
      delete p.apiKey
    }
    await writeYaml(modelsPath(), doc)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}
