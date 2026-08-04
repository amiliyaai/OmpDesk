import { promises as fsp } from 'node:fs'
import path from 'node:path'
import YAML from 'yaml'
import { getBackend } from './backend'
import { getSkillFilter, setSkillEnabled } from './config'
import type { SkillInfo } from '../../../src/shared/types'

function skillRoots(workspace: string): Array<{ label: 'user' | 'project' | 'managed'; dir: string }> {
  return getBackend().skillsRoots(workspace)
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
        enabled: !ignoredSet.has(name)
      })
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name))
}

export { setSkillEnabled as toggleSkill }
