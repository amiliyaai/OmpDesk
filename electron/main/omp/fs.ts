/**
 * 文件面板后端: 工作区文件树扫描 + 只读安全读取
 * - 跳过 node_modules/.git 等目录, 限制深度与条目数
 * - readFile 防路径穿越, 512KB 上限
 */
import { promises as fsp } from 'node:fs'
import path from 'node:path'
import { tMain } from '../i18n'
import type { WorkspaceFile } from '../../../src/shared/types'

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  '.hg',
  '.svn',
  'dist',
  'out',
  'build',
  'target',
  '.venv',
  'venv',
  '__pycache__',
  '.idea',
  '.vscode',
  '.next',
  '.nuxt',
  '.cache',
  '.turbo',
  'coverage'
])
const MAX_DEPTH = 5
const MAX_ENTRIES = 400
const MAX_FILE_BYTES = 512 * 1024

export async function listWorkspaceFiles(root: string): Promise<WorkspaceFile[]> {
  const base = path.resolve(root)
  const out: WorkspaceFile[] = []
  let count = 0

  const walk = async (dir: string, depth: number): Promise<void> => {
    if (depth > MAX_DEPTH || count >= MAX_ENTRIES) return
    let entries
    try {
      entries = await fsp.readdir(dir, { withFileTypes: true })
    } catch {
      return
    }
    entries.sort((a, b) => {
      if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    for (const ent of entries) {
      if (count >= MAX_ENTRIES) return
      if (ent.isDirectory() && SKIP_DIRS.has(ent.name)) continue
      const abs = path.join(dir, ent.name)
      const rel = path.relative(base, abs).split(path.sep).join('/')
      if (ent.isDirectory()) {
        out.push({ name: ent.name, relPath: rel + '/', type: 'dir' })
        count++
        await walk(abs, depth + 1)
      } else if (ent.isFile()) {
        out.push({ name: ent.name, relPath: rel, type: 'file' })
        count++
      }
    }
  }

  await walk(base, 0)
  return out
}

export async function readWorkspaceFile(
  root: string,
  relPath: string
): Promise<{ ok: boolean; content?: string; error?: string }> {
  const base = await fsp.realpath(path.resolve(root)).catch(() => path.resolve(root))
  const target = path.resolve(base, relPath)
  try {
    const real = await fsp.realpath(target)
    // 防路径穿越 + 符号链接逃逸: 解析后的真实路径必须位于 workspace 内
    if (real !== base && !real.startsWith(base + path.sep)) {
      return { ok: false, error: tMain('errors.pathEscape') }
    }
    const st = await fsp.stat(real)
    if (!st.isFile()) return { ok: false, error: tMain('errors.notFile') }
    if (st.size > MAX_FILE_BYTES) {
      return { ok: false, error: tMain('errors.fileTooLarge', { kb: MAX_FILE_BYTES / 1024 }) }
    }
    const content = await fsp.readFile(real, 'utf8')
    return { ok: true, content }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}
