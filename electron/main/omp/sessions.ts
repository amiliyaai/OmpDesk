import { execFile } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { promises as fsp } from 'node:fs'
import path from 'node:path'
import { promisify } from 'node:util'
import { sessionsRoot } from './locate'
import type {
  DisplayMessage,
  DisplayToolCall,
  SessionDetail,
  SessionMeta,
  SessionStatus
} from '../../../src/shared/types'

const execFileAsync = promisify(execFile)

// ---------- 列表(轻读: 只读头部 16KB + 尾部 64KB) ----------

export async function listSessions(): Promise<SessionMeta[]> {
  const root = sessionsRoot()
  let entries
  try {
    entries = await fsp.readdir(root, { withFileTypes: true })
  } catch {
    return []
  }
  const metas: SessionMeta[] = []
  for (const e of entries) {
    if (!e.isDirectory()) continue
    const dir = path.join(root, e.name)
    let files: string[]
    try {
      files = (await fsp.readdir(dir)).filter((f) => f.endsWith('.jsonl'))
    } catch {
      continue
    }
    for (const f of files) {
      const fp = path.join(dir, f)
      const meta = await readMeta(fp)
      if (meta) metas.push(meta)
    }
  }
  return metas.sort((a, b) => b.updatedAt - a.updatedAt)
}

async function readMeta(filePath: string): Promise<SessionMeta | null> {
  try {
    const st = await fsp.stat(filePath)
    const head = await readHead(filePath, 16 * 1024)
    const meta: SessionMeta = {
      id: '',
      filePath,
      workspace: '',
      title: '',
      createdAt: st.mtimeMs,
      updatedAt: st.mtimeMs,
      status: 'unknown'
    }
    let sessionRec: Record<string, unknown> | null = null
    for (const line of splitLines(head).slice(0, 8)) {
      const rec = tryParse(line)
      if (!rec) continue
      if (rec.type === 'title' && typeof rec.title === 'string' && rec.title) {
        meta.title = rec.title
      } else if (rec.type === 'session' && !sessionRec) {
        sessionRec = rec
      } else if (rec.type === 'title_change' && typeof rec.title === 'string' && rec.title) {
        meta.title = rec.title
      }
    }
    if (!sessionRec) {
      // 头 16KB 内没有 session 记录则放弃(空/异常文件)
      return null
    }
    meta.id = String(sessionRec.id ?? path.basename(filePath))
    meta.workspace = String(sessionRec.cwd ?? '')
    const ts = sessionRec.timestamp
    if (typeof ts === 'string') {
      const t = Date.parse(ts)
      if (!Number.isNaN(t)) meta.createdAt = t
    }
    // 尾部状态: 最后一条记录类型
    const tail = await readTail(filePath, 64 * 1024)
    const last = lastNonEmpty(tail)
    const lastRec = last ? tryParse(last) : null
    if (lastRec) meta.status = mapStatus(String(lastRec.type ?? ''))
    return meta
  } catch {
    return null
  }
}

// ---------- 详情(全量解析, 用于打开会话展示) ----------

export async function parseSession(filePath: string): Promise<SessionDetail | null> {
  let raw: string
  try {
    raw = await fsp.readFile(filePath, 'utf8')
  } catch {
    return null
  }
  const meta = await readMeta(filePath)
  if (!meta) return null
  const messages: DisplayMessage[] = []
  const toolCallsByClientId = new Map<string, { msgIdx: number; call: DisplayToolCall }>()
  let curModel: string | undefined
  let lastAssistantIdx = -1

  for (const line of raw.split('\n')) {
    const rec = tryParse(line)
    if (!rec) continue
    switch (rec.type) {
      case 'message': {
        const m = rec.message as Record<string, unknown> | undefined
        if (!m || typeof m !== 'object') continue
        const role = String(m.role ?? '')
        if (role === 'user' || role === 'assistant') {
          const msg: DisplayMessage = {
            id: String(rec.id ?? randomHex()),
            role,
            content: [],
            toolCalls: [],
            createdAt: parseTs(m.timestamp ?? rec.timestamp)
          }
          if (m.model) msg.model = String(m.model)
          if (m.usage && typeof m.usage === 'object') {
            msg.usage = {
              input: Number((m.usage as Record<string, unknown>).input ?? 0),
              output: Number((m.usage as Record<string, unknown>).output ?? 0)
            }
          }
          if (Array.isArray(m.content)) {
            for (const block of m.content as Record<string, unknown>[]) {
              const type = String(block.type ?? '')
              if (type === 'text' && typeof block.text === 'string') {
                msg.content.push({ kind: 'text', text: block.text })
              } else if (type === 'thinking' && typeof block.text === 'string') {
                msg.content.push({ kind: 'thinking', text: block.text })
              } else if (type === 'toolCall' || type === 'tool_call') {
                const callId = String(block.id ?? block.call_id ?? randomHex())
                const call: DisplayToolCall = {
                  id: callId,
                  name: String(block.name ?? 'tool'),
                  args: block.arguments ?? {},
                  status: 'success'
                }
                msg.toolCalls.push(call)
                toolCallsByClientId.set(callId, { msgIdx: messages.length, call })
              }
            }
          }
          messages.push(msg)
          if (role === 'assistant') lastAssistantIdx = messages.length - 1
        } else if (role === 'toolResult' && typeof m.toolCallId === 'string') {
          const entry = toolCallsByClientId.get(String(m.toolCallId))
          if (entry) {
            entry.call.status = m.isError ? 'error' : 'success'
            entry.call.isError = Boolean(m.isError)
            entry.call.errorMessage = m.isError ? '工具执行失败' : undefined
            entry.call.result = extractText(m.content)
            if (m.error && typeof m.error === 'string') entry.call.errorMessage = m.error
          }
        }
        break
      }
      case 'thinking':
      case 'reasoning': {
        if (lastAssistantIdx >= 0 && typeof rec.text === 'string') {
          const target = messages[lastAssistantIdx]
          if (!target.content.some((c) => c.kind === 'thinking' && c.text === rec.text)) {
            target.content.push({ kind: 'thinking', text: rec.text })
          }
        }
        break
      }
      case 'custom': {
        if (rec.customType === 'tool_execution_start' && rec.data && typeof rec.data === 'object') {
          const d = rec.data as Record<string, unknown>
          const id = String(d.toolCallId ?? '')
          const entry = toolCallsByClientId.get(id)
          if (entry) entry.call.status = 'running'
        }
        break
      }
      case 'model_change': {
        if (typeof rec.model === 'string') curModel = rec.model
        break
      }
      case 'compaction': {
        if (typeof rec.summary === 'string' && rec.summary) {
          messages.push({
            id: randomHex(),
            role: 'notice',
            content: [{ kind: 'text', text: `会话已压缩: ${rec.summary}` }],
            toolCalls: [],
            createdAt: parseTs(rec.timestamp)
          })
          lastAssistantIdx = messages.length - 1
        }
        break
      }
      default:
        break
    }
  }
  void curModel
  return { meta, messages }
}

// ---------- 删除 / 重命名 / 导出 ----------

export async function deleteSession(filePath: string): Promise<{ ok: boolean; error?: string }> {
  const root = path.resolve(sessionsRoot())
  const resolved = path.resolve(filePath)
  if (!resolved.startsWith(root + path.sep)) return { ok: false, error: '非法路径' }
  try {
    await fsp.unlink(resolved)
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
  // 同名目录(子会话/旁路会话)
  const siblingDir = resolved.replace(/\.jsonl$/i, '')
  if (siblingDir !== resolved) {
    await fsp.rm(siblingDir, { recursive: true, force: true }).catch(() => {})
  }
  return { ok: true }
}

export async function renameSession(
  filePath: string,
  title: string
): Promise<{ ok: boolean; error?: string }> {
  const clean = title.trim().slice(0, 200)
  if (!clean) return { ok: false, error: '标题不能为空' }
  try {
    const rec = {
      type: 'title_change',
      id: randomHex(),
      parentId: null,
      timestamp: new Date().toISOString(),
      title: clean,
      source: 'user'
    }
    await fsp.appendFile(filePath, JSON.stringify(rec) + '\n')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

export async function exportSession(
  bin: string,
  filePath: string
): Promise<{ ok: boolean; path?: string; error?: string }> {
  const out = filePath.replace(/\.jsonl$/i, '') + '.html'
  try {
    await execFileAsync(bin, ['--export', filePath, out], { timeout: 60_000 })
    return { ok: true, path: out }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

// ---------- 工具 ----------

function readHead(filePath: string, bytes: number): Promise<string> {
  return fsp.open(filePath, 'r').then(async (fh) => {
    try {
      const buf = Buffer.alloc(bytes)
      const { bytesRead } = await fh.read(buf, 0, bytes, 0)
      return buf.subarray(0, bytesRead).toString('utf8')
    } finally {
      await fh.close()
    }
  })
}

async function readTail(filePath: string, bytes: number): Promise<string> {
  const fh = await fsp.open(filePath, 'r')
  try {
    const st = await fh.stat()
    const len = Math.min(bytes, st.size)
    const buf = Buffer.alloc(len)
    await fh.read(buf, 0, len, st.size - len)
    return buf.toString('utf8')
  } finally {
    await fh.close()
  }
}

function splitLines(s: string): string[] {
  return s.split(/\r?\n/)
}

function lastNonEmpty(s: string): string | null {
  const lines = splitLines(s)
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].trim()) return lines[i]
  }
  return null
}

function tryParse(line: string): Record<string, unknown> | null {
  try {
    const o = JSON.parse(line)
    return typeof o === 'object' && o !== null ? (o as Record<string, unknown>) : null
  } catch {
    return null
  }
}

function mapStatus(type: string): SessionStatus {
  switch (type) {
    case 'session_exit':
      return 'complete'
    case 'session_init':
      return 'pending'
    default:
      return 'unknown'
  }
}

function parseTs(v: unknown): number {
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const t = Date.parse(v)
    if (!Number.isNaN(t)) return t
  }
  return Date.now()
}

function randomHex(): string {
  return randomBytes(8).toString('hex')
}

function extractText(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map((b) => (typeof b === 'object' && b !== null ? String((b as Record<string, unknown>).text ?? '') : String(b)))
      .join('\n')
  }
  return ''
}
