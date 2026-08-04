#!/usr/bin/env node
/**
 * 从 CHANGELOG.md 提取指定版本的更新日志条目, 输出到 stdout。
 *
 * 用法: node scripts/extract-changelog.mjs <version>   (例如 0.1.0)
 *
 * 供 GitHub Actions release workflow 生成 Release notes:
 *   node scripts/extract-changelog.mjs "$VERSION" > notes.md
 * 提取规则: "## [<version>] - yyyy-mm-dd" 区块, 直到下一个 "## " / "---" 分隔线。
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const version = process.argv[2]
if (!version) {
  console.error('用法: node scripts/extract-changelog.mjs <version>')
  process.exit(2)
}

const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const changelog = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '..', 'CHANGELOG.md'),
  'utf8'
)
const re = new RegExp(
  `## \\[${escaped}\\] - \\d{4}-\\d{2}-\\d{2}\\n([\\s\\S]*?)(?=\\n## |\\n---|$)`
)
const m = changelog.match(re)
if (!m) {
  console.error(
    `CHANGELOG.md 中未找到版本 ${version} 的条目(需形如 "## [${version}] - yyyy-mm-dd")。` +
      '请先在 CHANGELOG.md 中登记该版本再发布。'
  )
  process.exit(1)
}
process.stdout.write(m[1].replace(/\n+$/, '') + '\n')
