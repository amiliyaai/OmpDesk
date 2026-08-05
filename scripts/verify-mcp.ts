/**
 * MCP 发现验证(临时 HOME 隔离, 不触碰真实配置):
 * 1. 导入源发现(~/.claude.json 顶层 mcpServers)
 * 2. 用户级 disabledServers 全局屏蔽导入源(开关持久化修复的回归断言)
 * 3. 用户级 enabledServers 强制启用源内 enabled:false 的条目, 但不禁用未列入的
 * 4. disabledServers 优先于 enabledServers
 * 运行: npx tsx scripts/verify-mcp.ts(或 npm run verify)
 */
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { getMcpServers } from '../electron/main/omp/mcp'

const tmp = mkdtempSync(path.join(tmpdir(), 'ompdesk-mcp-'))
const agent = path.join(tmp, '.omp', 'agent')
mkdirSync(agent, { recursive: true })

const savedEnv = {
  PI_CODING_AGENT_DIR: process.env.PI_CODING_AGENT_DIR,
  USERPROFILE: process.env.USERPROFILE,
  HOME: process.env.HOME
}
process.env.PI_CODING_AGENT_DIR = agent
process.env.USERPROFILE = tmp
process.env.HOME = tmp

// ~/.claude.json: godot-ai 默认启用, disabled-ai 源内 enabled:false
writeFileSync(
  path.join(tmp, '.claude.json'),
  JSON.stringify({
    mcpServers: {
      'godot-ai': { type: 'http', url: 'http://127.0.0.1:8000/mcp' },
      'disabled-ai': { type: 'stdio', command: 'npx', enabled: false }
    }
  })
)

const userMcp = path.join(agent, 'mcp.json')
const writeUser = (doc: Record<string, unknown>): void => writeFileSync(userMcp, JSON.stringify(doc))

const byName = async (): Promise<Record<string, { enabled: boolean; provider?: string }>> => {
  const mcps = await getMcpServers('')
  return Object.fromEntries(mcps.map((m) => [m.name, { enabled: m.enabled, provider: m.provider }]))
}

async function main(): Promise<void> {
  let m = await byName()
  assert.equal(m['godot-ai']?.enabled, true, '导入源默认启用')
  assert.equal(m['godot-ai']?.provider, 'claude', '来源 provider')
  assert.equal(m['disabled-ai']?.enabled, false, '源内 enabled:false 生效')

  // 用户级 denylist 全局屏蔽导入源(开关持久化修复的回归断言)
  writeUser({ mcpServers: {}, disabledServers: ['godot-ai'] })
  m = await byName()
  assert.equal(m['godot-ai']?.enabled, false, '用户级 disabledServers 屏蔽导入源')
  assert.equal(m['disabled-ai']?.enabled, false, '其他服务器不受影响')

  // 用户级 allowlist 强制启用, 不禁用未列入的
  writeUser({ mcpServers: {}, enabledServers: ['disabled-ai'] })
  m = await byName()
  assert.equal(m['disabled-ai']?.enabled, true, '用户级 enabledServers 强制启用')
  assert.equal(m['godot-ai']?.enabled, true, '未列入 allowlist 的服务器保持源配置')

  // disabled 优先于 allowlist
  writeUser({ mcpServers: {}, disabledServers: ['disabled-ai'], enabledServers: ['disabled-ai'] })
  m = await byName()
  assert.equal(m['disabled-ai']?.enabled, false, 'disabledServers 优先于 enabledServers')

  console.log('MCP discovery: all assertions passed ✔')
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => {
    process.env.PI_CODING_AGENT_DIR = savedEnv.PI_CODING_AGENT_DIR
    process.env.USERPROFILE = savedEnv.USERPROFILE
    process.env.HOME = savedEnv.HOME
    rmSync(tmp, { recursive: true, force: true })
  })
