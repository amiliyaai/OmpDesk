/**
 * omp RPC 协议分帧层
 * --mode rpc-ui: stdin 一行一条 JSON 命令, stdout 一行一个 JSON 帧 (NDJSON)
 * 收到 ready 后协商 v2(negotiate_protocol), 超大对象以 rpc_chunk 分块(base64)传输
 */

interface ChunkAccumulator {
  chunkId: string
  count: number
  byteLength?: number
  parts: Map<number, string>
}

const MAX_CHUNK_IDLE = 120_000

export class FrameDecoder {
  onFrame: (frame: Record<string, unknown>) => void = () => {}

  private buffer = ''
  private chunks = new Map<string, ChunkAccumulator>()

  /** 向解码器喂入 stdout 原始文本 */
  push(text: string): void {
    this.buffer += text
    let idx: number
    while ((idx = this.buffer.indexOf('\n')) >= 0) {
      const line = this.buffer.slice(0, idx)
      this.buffer = this.buffer.slice(idx + 1)
      this.handleLine(line)
    }
    // 防失控: 单行超 16MB 直接丢弃(保护性,正常经 v2 分块不会到这)
    if (this.buffer.length > 16 * 1024 * 1024) this.buffer = ''
  }

  private handleLine(line: string): void {
    const trimmed = line.trim()
    if (!trimmed) return
    let obj: unknown
    try {
      obj = JSON.parse(trimmed)
    } catch {
      return // 非 JSON 输出行(警告等)忽略
    }
    if (typeof obj !== 'object' || obj === null) return
    const frame = obj as Record<string, unknown>
    if (frame.type === 'rpc_chunk') {
      const full = this.assemble(frame)
      if (full) this.onFrame(full)
    } else {
      this.onFrame(frame)
    }
  }

  private assemble(chunk: Record<string, unknown>): Record<string, unknown> | null {
    const chunkId = String(chunk.chunkId ?? '')
    const index = Number(chunk.index)
    const count = Number(chunk.count)
    const data = String(chunk.data ?? '')
    if (!chunkId || Number.isNaN(index) || Number.isNaN(count) || count <= 0) return null

    let acc = this.chunks.get(chunkId)
    if (!acc) {
      acc = {
        chunkId,
        count,
        byteLength: typeof chunk.byteLength === 'number' ? chunk.byteLength : undefined,
        parts: new Map()
      }
      this.chunks.set(chunkId, acc)
      // 防泄漏: 超时清理
      setTimeout(() => {
        this.chunks.delete(chunkId)
      }, MAX_CHUNK_IDLE).unref?.()
    }
    acc.parts.set(index, data)
    if (acc.parts.size !== acc.count) return null

    this.chunks.delete(chunkId)
    try {
      // 注意: base64 必须整串拼接后一次性解码(分段独立解码会因分组边界丢位)
      const b64 = [...acc.parts.keys()]
        .sort((a, b) => a - b)
        .map((i) => acc!.parts.get(i)!)
        .join('')
      const raw = Buffer.from(b64, 'base64')
      if (acc.byteLength != null && raw.length !== acc.byteLength) return null
      return JSON.parse(raw.toString('utf8')) as Record<string, unknown>
    } catch {
      return null
    }
  }
}
