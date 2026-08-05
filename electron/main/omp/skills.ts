import { promises as fsp } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import YAML from 'yaml'
import { getBackend } from './backend'
import { getSkillFilter, setSkillEnabled } from './config'
import type { SkillInfo } from '../../../src/shared/types'

interface SkillRoot {
  label: SkillInfo['root']
  provider: string
  dir: string
}

/**
 * Skills 根目录(发现范围对齐 oh-my-pi v17 的 loadSkills provider 优先级):
 * native(.omp) > claude > agents(.agent[s]) > codex > opencode > github > managed。
 * 同名师先到先得 —— 高优先级 provider 先出现即覆盖。
 */
function skillRoots(workspace: string): SkillRoot[] {
  const home = os.homedir()
  const native = getBackend().skillsRoots(workspace)
  const roots: SkillRoot[] = []

  // 1) 原生(.omp / .pi): 用户级 + 项目级(managed 移到最低优先级)
  for (const r of native) {
    if (r.label !== 'managed') roots.push({ label: r.label, provider: 'omp', dir: r.dir })
  }
  // 2) Claude Code
  roots.push({ label: 'user', provider: 'claude', dir: path.join(home, '.claude', 'skills') })
  // 3) agents 生态(omp 的 canonical 位置)
  roots.push({ label: 'user', provider: 'agents', dir: path.join(home, '.agents', 'skills') })
  roots.push({ label: 'user', provider: 'agents', dir: path.join(home, '.agent', 'skills') })
  // 4) Codex
  roots.push({ label: 'user', provider: 'codex', dir: path.join(home, '.codex', 'skills') })
  // 5) OpenCode
  roots.push({ label: 'user', provider: 'opencode', dir: path.join(home, '.config', 'opencode', 'skills') })

  if (workspace) {
    roots.push({ label: 'project', provider: 'claude', dir: path.join(workspace, '.claude', 'skills') })
    roots.push({ label: 'project', provider: 'agents', dir: path.join(workspace, '.agents', 'skills') })
    roots.push({ label: 'project', provider: 'agents', dir: path.join(workspace, '.agent', 'skills') })
    roots.push({ label: 'project', provider: 'codex', dir: path.join(workspace, '.codex', 'skills') })
    roots.push({ label: 'project', provider: 'opencode', dir: path.join(workspace, '.opencode', 'skills') })
    roots.push({ label: 'project', provider: 'github', dir: path.join(workspace, '.github', 'skills') })
  }

  // 6) managed(auto-learn, 最低优先级)
  for (const r of native) {
    if (r.label === 'managed') roots.push({ label: r.label, provider: 'managed', dir: r.dir })
  }
  return roots
}

interface Frontmatter {
  name?: string
  description?: string
  globs?: string[]
}

async function readFrontmatter(file: string): Promise<Frontmatter> {
  try {
    const raw = await fsp.readFile(file, 'utf8')
    const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)
    if (!m) return {}
    const doc = YAML.parse(m[1])
    if (typeof doc !== 'object' || doc === null) return {}
    return doc as Frontmatter
  } catch {
    return {}
  }
}

export async function getSkills(workspace: string): Promise<SkillInfo[]> {
  const { ignored } = await getSkillFilter()
  const ignoredSet = new Set(ignored)
  const out: SkillInfo[] = []
  const seen = new Set<string>()

  for (const root of skillRoots(workspace)) {
    let dirs: string[]
    try {
      dirs = (await fsp.readdir(root.dir, { withFileTypes: true }))
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
    } catch {
      continue
    }
    for (const dirName of dirs) {
      const skillDir = path.join(root.dir, dirName)
      const skillFile = path.join(skillDir, 'SKILL.md')
      const fm = await readFrontmatter(skillFile)
      const name = fm.name ?? dirName
      if (seen.has(name)) continue // 同名师: 高优先级根目录先出现
      seen.add(name)
      out.push({
        name,
        description: fm.description ?? '',
        globs: Array.isArray(fm.globs) ? fm.globs.map(String) : undefined,
        path: skillFile,
        root: root.label,
        provider: root.provider,
        enabled: !ignoredSet.has(name)
      })
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name))
}

export { setSkillEnabled as toggleSkill }
