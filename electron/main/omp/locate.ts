import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

/** 三平台 omp 二进制定位: PATH → 常见安装位置 */
export async function locateOmp(): Promise<string | null> {
  // 1) PATH 中查找
  try {
    const cmd = process.platform === 'win32' ? 'where' : 'which'
    const { stdout } = await execFileAsync(cmd, ['omp'], { timeout: 10_000 })
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
    if (la) candidates.push(path.join(la, 'omp', 'omp.exe'))
    candidates.push(path.join(home, 'AppData', 'Local', 'omp', 'omp.exe'))
  } else if (process.platform === 'darwin') {
    candidates.push('/opt/homebrew/bin/omp', '/usr/local/bin/omp')
  } else {
    candidates.push(path.join(home, '.local', 'bin', 'omp'))
  }
  for (const c of candidates) {
    if (existsSync(c)) return c
  }
  return null
}

export async function ompVersion(bin: string): Promise<string | undefined> {
  try {
    const { stdout } = await execFileAsync(bin, ['--version'], { timeout: 10_000 })
    return stdout.trim().split(/\r?\n/)[0] || undefined
  } catch {
    return undefined
  }
}

/** omp 会话存储根目录(与 omp 约定一致,可用 PI_CODING_AGENT_DIR 覆盖) */
export function agentDir(): string {
  const override = process.env.PI_CODING_AGENT_DIR
  if (override) return override
  return path.join(os.homedir(), '.omp', 'agent')
}

export function sessionsRoot(): string {
  return path.join(agentDir(), 'sessions')
}

/** 会话目录下的工作区 slug 目录名 → 展示用工作目录(cwd 存在则取真实路径) */
export function workspaceLabel(workspace: string): string {
  if (!workspace) return ''
  return path.basename(workspace)
}
