/**
 * Worktree 并行工作区: 通过 git worktree 为每个并行 agent 会话提供独立工作区
 * - 只读操作走 execFile 数组参数(无 shell, 防注入); 分支名/路径均校验
 * - remove 不做 force, 有未提交改动时返回 git 错误提示用户
 */
import { execFile } from 'node:child_process'
import { existsSync, promises as fsp } from 'node:fs'
import path from 'node:path'
import { promisify } from 'node:util'
import { tMain } from '../i18n'

const execFileAsync = promisify(execFile)
const GIT_TIMEOUT = 15_000

export interface WorktreeInfo {
  path: string
  branch?: string // 无 = detached
  isMain: boolean
}

/** 分支名合法性(防注入): 字母数字 + . _ / - */
const BRANCH_RE = /^[A-Za-z0-9._/-]+$/

function gitArgs(workspace: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return execFileAsync('git', ['-C', workspace, ...args], {
    timeout: GIT_TIMEOUT,
    windowsHide: true
  })
}

export async function isGitRepo(workspace: string): Promise<boolean> {
  if (!workspace) return false
  try {
    await gitArgs(workspace, ['rev-parse', '--is-inside-work-tree'])
    return true
  } catch {
    return false
  }
}

/** git worktree list --porcelain → [{ path, branch?, isMain }] */
export async function listWorktrees(workspace: string): Promise<WorktreeInfo[]> {
  const out: WorktreeInfo[] = []
  try {
    const { stdout } = await gitArgs(workspace, ['worktree', 'list', '--porcelain'])
    let cur: { path: string; branch?: string; isMain: boolean } | null = null
    for (const line of stdout.split(/\r?\n/)) {
      if (line.startsWith('worktree ')) {
        if (cur) out.push(cur)
        cur = { path: line.slice('worktree '.length).trim(), isMain: false }
      } else if (line.startsWith('branch ') && cur) {
        cur.branch = line.slice('branch '.length).replace(/^refs\/heads\//, '')
      } else if (line.startsWith('detached') && cur) {
        cur.branch = undefined
      } else if (line === '' && cur) {
        out.push(cur)
        cur = null
      }
    }
    if (cur) out.push(cur)
  } catch {
    return []
  }
  if (out.length) out[0].isMain = true
  return out
}

/** 创建 worktree: 分支缺省自动生成 omp-wt-<时间戳>; 路径放仓库父目录避免被自身 git 忽略 */
export async function createWorktree(
  workspace: string,
  branch?: string
): Promise<{ ok: boolean; path?: string; branch?: string; error?: string }> {
  if (!(await isGitRepo(workspace))) {
    return { ok: false, error: tMain('worktree.notGit') }
  }
  const cleanBranch = (branch ?? '').trim()
  const finalBranch =
    cleanBranch || `omp-wt-${Date.now().toString(36).slice(-8)}`
  if (!BRANCH_RE.test(finalBranch)) {
    return { ok: false, error: tMain('worktree.invalidBranch') }
  }
  // 目标路径: <仓库父目录>/<仓库名>-wt-<分支名>(避免放仓库内被 git 忽略)
  const base = path.resolve(workspace)
  const parent = path.dirname(base)
  const wtPath = path.join(parent, `${path.basename(base)}-wt-${finalBranch.replaceAll('/', '-')}`)
  if (existsSync(wtPath)) {
    return { ok: false, error: tMain('worktree.pathExists', { path: wtPath }) }
  }
  try {
    // 分支不存在 → -b 新建; 已存在 → 直接检出(已检出到其他 worktree 会报错返回)
    const exists = await branchExists(workspace, finalBranch)
    await gitArgs(workspace, exists ? ['worktree', 'add', wtPath, finalBranch] : ['worktree', 'add', '-b', finalBranch, wtPath])
    return { ok: true, path: wtPath, branch: finalBranch }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

async function branchExists(workspace: string, branch: string): Promise<boolean> {
  try {
    await gitArgs(workspace, ['rev-parse', '--verify', `refs/heads/${branch}`])
    return true
  } catch {
    return false
  }
}

/** 移除 worktree: path 必须来自 listWorktrees(防任意路径), 不用 force */
export async function removeWorktree(
  workspace: string,
  wtPath: string
): Promise<{ ok: boolean; error?: string }> {
  const known = await listWorktrees(workspace)
  const target = known.find((w) => path.resolve(w.path) === path.resolve(wtPath))
  if (!target) {
    return { ok: false, error: tMain('worktree.notFound') }
  }
  if (target.isMain) {
    return { ok: false, error: tMain('worktree.cannotRemoveMain') }
  }
  try {
    await gitArgs(workspace, ['worktree', 'remove', target.path])
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

/** 清理: worktree 目录可能残留(移除失败时), 供渲染端删除会话后调用 */
export async function cleanupWorktreeDir(wtPath: string): Promise<void> {
  await fsp.rm(wtPath, { recursive: true, force: true }).catch(() => {})
}
