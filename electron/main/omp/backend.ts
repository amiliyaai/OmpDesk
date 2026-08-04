/**
 * Agent 后端抽象: omp (oh-my-pi) 与 pi (@earendil-works/pi-coding-agent)
 *
 * omp 是 pi 的社区 fork(legacy-pi-compat 将两个 npm scope 视为别名),
 * 数据目录/会话格式同源, 差异集中在: 二进制名 / 数据根目录 / RPC 模式名 / 部分命令。
 * 本模块是全部差异点的唯一出口 —— 切换后端 = setBackend(id)。
 */
import os from 'node:os'
import path from 'node:path'
import type { AgentBackendId } from '../../../src/shared/types'

export interface AgentBackend {
  id: AgentBackendId
  /** 命令行二进制名(omp / pi) */
  binName: string
  /** agent 数据根目录(不含 PI_CODING_AGENT_DIR 覆盖) */
  agentDir(): string
  /** spawn 参数(rpc-ui vs rpc 等) */
  spawnArgs(cwd: string, sessionDir?: string, approvalMode?: string): string[]
  /** 日志目录 */
  logDir(): string
  /** 用户级 mcp.json 路径 */
  mcpUserFile(): string
  /** skills 根目录清单(含项目级) */
  skillsRoots(workspace: string): string[]
  /** 会话导出命令 */
  exportArgs(filePath: string): string[]
  /** 是否支持单命令 abort_and_prompt(pi 需拆成 abort + prompt) */
  supportsAbortAndPrompt: boolean
  /** 是否支持 v2 协议协商(rpc_chunk 大帧; pi 原生 rpc 无, 需探测降级) */
  supportsProtocolV2: boolean
}

class OmpBackend implements AgentBackend {
  readonly id = 'omp' as const
  readonly binName = 'omp'
  readonly supportsAbortAndPrompt = true
  readonly supportsProtocolV2 = true

  agentDir(): string {
    return path.join(os.homedir(), '.omp', 'agent')
  }

  spawnArgs(cwd: string, sessionDir?: string, approvalMode?: string): string[] {
    const args = ['--mode', 'rpc-ui', '--cwd', cwd]
    if (sessionDir) args.push('--session-dir', sessionDir)
    if (approvalMode) args.push('--approval-mode', approvalMode)
    return args
  }

  logDir(): string {
    return path.join(os.homedir(), '.omp', 'logs')
  }

  mcpUserFile(): string {
    return path.join(this.agentDir(), 'mcp.json')
  }

  skillsRoots(workspace: string): string[] {
    return [
      path.join(os.homedir(), '.omp', 'skills'),
      path.join(this.agentDir(), 'skills'),
      path.join(this.agentDir(), 'managed-skills'),
      path.join(workspace, '.omp', 'skills')
    ]
  }

  exportArgs(filePath: string): string[] {
    return ['--export', filePath]
  }
}

class PiBackend implements AgentBackend {
  readonly id = 'pi' as const
  readonly binName = 'pi'
  readonly supportsAbortAndPrompt = false
  readonly supportsProtocolV2 = false

  agentDir(): string {
    return path.join(os.homedir(), '.pi', 'agent')
  }

  spawnArgs(cwd: string, _sessionDir?: string, _approvalMode?: string): string[] {
    // pi 原生 rpc 模式(rpc-ui 为 omp fork 扩展); 参数以实测为准
    return ['--mode', 'rpc', '--cwd', cwd]
  }

  logDir(): string {
    return path.join(os.homedir(), '.pi', 'logs')
  }

  mcpUserFile(): string {
    return path.join(this.agentDir(), 'mcp.json')
  }

  skillsRoots(workspace: string): string[] {
    return [
      path.join(os.homedir(), '.pi', 'skills'),
      path.join(this.agentDir(), 'skills'),
      path.join(this.agentDir(), 'managed-skills'),
      path.join(workspace, '.pi', 'skills')
    ]
  }

  exportArgs(filePath: string): string[] {
    return ['--export', filePath]
  }
}

const IMPLS: Record<AgentBackendId, () => AgentBackend> = {
  omp: () => new OmpBackend(),
  pi: () => new PiBackend()
}

let active: AgentBackend = IMPLS.omp()

/** 解析设置值('auto' → 默认 omp) */
export function resolveBackendId(v: string | undefined): AgentBackendId {
  return v === 'pi' ? 'pi' : 'omp'
}

export function getBackend(): AgentBackend {
  return active
}

export function setBackend(id: AgentBackendId): AgentBackend {
  active = IMPLS[id]()
  return active
}

/** 数据根目录(保持 locate.ts 既有签名, 支持 PI_CODING_AGENT_DIR 覆盖) */
export function agentDir(): string {
  const override = process.env.PI_CODING_AGENT_DIR
  if (override) return override
  return active.agentDir()
}

export function sessionsRoot(): string {
  return path.join(agentDir(), 'sessions')
}
