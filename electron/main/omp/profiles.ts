import { randomUUID } from 'node:crypto'
import { promises as fsp } from 'node:fs'
import path from 'node:path'
import { app, safeStorage } from 'electron'
import { getApprovalMode, getRoleModels, setApprovalMode, setProviderKey, setRoleModels } from './config'
import { tMain } from '../i18n'
import type { OmpProfile } from '../../../src/shared/types'

interface StoredProfile extends OmpProfile {
  apiKeyEnc?: string // safeStorage 加密后的 base64
  apiKeyPlain?: string // 加密不可用时的 base64 兜底
}

function profilesPath(): string {
  return path.join(app.getPath('userData'), 'profiles.json')
}

async function readAll(): Promise<StoredProfile[]> {
  try {
    const raw = await fsp.readFile(profilesPath(), 'utf8')
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? (arr as StoredProfile[]) : []
  } catch {
    return []
  }
}

async function writeAll(profiles: StoredProfile[]): Promise<void> {
  const tmp = `${profilesPath()}.tmp`
  await fsp.mkdir(path.dirname(profilesPath()), { recursive: true })
  await fsp.writeFile(tmp, JSON.stringify(profiles, null, 2), 'utf8')
  await fsp.rename(tmp, profilesPath())
}

/** 加密 API key(不可用时退回 base64 并标记) */
function encryptKey(key: string): { enc?: string; plain?: string } {
  if (safeStorage.isEncryptionAvailable()) {
    return { enc: safeStorage.encryptString(key).toString('base64') }
  }
  return { plain: Buffer.from(key, 'utf8').toString('base64') }
}

function decryptKey(p: StoredProfile): string | null {
  if (p.apiKeyEnc) {
    try {
      if (safeStorage.isEncryptionAvailable()) {
        return safeStorage.decryptString(Buffer.from(p.apiKeyEnc, 'base64'))
      }
    } catch {
      return null
    }
  }
  return null
}

export async function listProfiles(): Promise<OmpProfile[]> {
  const all = await readAll()
  return all.map(({ apiKeyEnc: _e, ...p }) => ({ ...p, hasKey: _e != null } as unknown as OmpProfile & { hasKey: boolean }))
}

export async function saveProfile(
  input: Omit<OmpProfile, 'id' | 'createdAt' | 'updatedAt'> & { apiKey?: string }
): Promise<{ ok: boolean; error?: string; id?: string }> {
  const all = await readAll()
  const existing = all.find((p) => p.name === input.name)
  const now = Date.now()
  const stored: StoredProfile = {
    ...input,
    id: existing?.id ?? randomUUID(),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now
  }
  if (input.apiKey && input.apiKey.trim()) {
    const { enc, plain } = encryptKey(input.apiKey.trim())
    if (enc) stored.apiKeyEnc = enc
    if (plain) stored.apiKeyPlain = plain
  }
  if (existing) {
    const i = all.indexOf(existing)
    all[i] = stored
  } else {
    all.push(stored)
  }
  try {
    await writeAll(all)
    return { ok: true, id: stored.id }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

export async function deleteProfile(id: string): Promise<{ ok: boolean; error?: string }> {
  const all = await readAll()
  const next = all.filter((p) => p.id !== id)
  if (next.length === all.length) return { ok: false, error: tMain('errors.profileMissing') }
  try {
    await writeAll(next)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

/** 应用方案: 写 provider key + 角色模型映射 + 审批模式(改后需重启进程池生效) */
export async function applyProfile(id: string): Promise<{ ok: boolean; error?: string }> {
  const all = await readAll()
  const p = all.find((x) => x.id === id)
  if (!p) return { ok: false, error: tMain('errors.profileMissing') }

  if (p.apiKeyEnc) {
    const key = decryptKey(p)
    if (key === null) return { ok: false, error: tMain('errors.decryptFailed') }
    const r = await setProviderKey(p.provider, key)
    if (!r.ok) return r
  }
  const roles = p.roles
  if (roles.default || roles.smol || roles.slow || roles.plan) {
    const r = await setRoleModels(roles)
    if (!r.ok) return r
  }
  const r = await setApprovalMode(p.approvalMode)
  if (!r.ok) return r
  return { ok: true }
}

/** 当前生效的模型角色(来自 config.yml, 供方案编辑器默认值) */
export async function currentRoleModels() {
  return getRoleModels()
}

/** 当前审批模式 */
export async function currentApprovalMode() {
  return getApprovalMode()
}
