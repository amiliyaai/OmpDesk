import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { getBackend, type AgentBackend } from './backend'

export { agentDir, sessionsRoot } from './backend'

const execFileAsync = promisify(execFile)

/** 三平台 agent 二进制定位: PATH → 常见安装位置(按后端 binName) */
export async function locateAgent(backend?: AgentBackend): Promise<string | null> {
  const binName = (backend ?? getBackend()).binName
  // 1) PATH 中查找
  try {
    const cmd = process.platform === 'win32' ? 'where' : 'which'
    const { stdout } = await execFileAsync(cmd, [binName], { timeout: 10_000 })
    const first = stdout
      .split(/\r?\n/)
      .map((s) => s.trim())
      .find(Boolean)
    if (first && existsSync(first)) return first
  } catch {
    /* not on PATH */
  }

  // 2) 各平台常见安装位置
  const home = os.homedir()
  const candidates: string[] = []
  if (process.platform === 'win32') {
    const la = process.env.LOCALAPPDATA
    if (la) candidates.push(path.join(la, binName, `${binName}.exe`))
    candidates.push(path.join(home, 'AppData', 'Local', binName, `${binName}.exe`))
  } else if (process.platform === 'darwin') {
    candidates.push(`/opt/homebrew/bin/${binName}`, `/usr/local/bin/${binName}`)
  } else {
    candidates.push(path.join(home, '.local', 'bin', binName))
  }
  for (const c of candidates) {
    if (existsSync(c)) return c
  }
  return null
}

/** 兼容旧调用(默认后端) */
export async function locateOmp(): Promise<string | null> {
  return locateAgent()
}

export async function ompVersion(bin: string): Promise<string | undefined> {
  try {
    const { stdout } = await execFileAsync(bin, ['--version'], { timeout: 10_000 })
    return stdout.trim().split(/\r?\n/)[0] || undefined
  } catch {
    return undefined
  }
}

/** 会话目录下的工作区 slug 目录名 → 展示用工作目录(cwd 存在则取真实路径) */
export function workspaceLabel(workspace: string): string {
  if (!workspace) return ''
  return path.basename(workspace)
}
