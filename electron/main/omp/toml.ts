/**
 * 最小 TOML 解析器(仅覆盖 Codex config.toml 中 MCP 配置所需子集):
 * 区块头(含带引号键) / key=value / basic+literal 字符串 / 数字 / 布尔 / 数组 / 内联表 / 注释。
 * 解析失败的行跳过, 其余继续 —— 容忍真实用户文件中的未知语法(如多行字符串、日期)。
 */

function unescapeBasic(s: string): string {
  return s
    .replace(/\\(["\\bfnrt])/g, (_, c: string) => ({ b: '\b', f: '\f', n: '\n', r: '\r', t: '\t', '"': '"', '\\': '\\' })[c] ?? c)
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, h: string) => String.fromCharCode(parseInt(h, 16)))
}

/** 去掉行内注释(引号外部的 # 起) */
function stripComment(line: string): string {
  let inBasic = false
  let inLiteral = false
  let esc = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (esc) { esc = false; continue }
    if (ch === '\\' && inBasic) { esc = true; continue }
    if (ch === '"' && !inLiteral) { inBasic = !inBasic; continue }
    if (ch === "'" && !inBasic) { inLiteral = !inLiteral; continue }
    if (ch === '#' && !inBasic && !inLiteral) return line.slice(0, i)
  }
  return line
}

/** 顶层拆分(数组/内联表元素, 尊重引号与嵌套深度) */
function splitTopLevel(s: string, start: number, end: number, sep: string): string[] {
  const parts: string[] = []
  let depth = 0
  let inBasic = false
  let inLiteral = false
  let esc = false
  let cur = ''
  for (let i = start; i < end; i++) {
    const ch = s[i]
    if (esc) { cur += ch; esc = false; continue }
    if (ch === '\\' && inBasic) { cur += ch; esc = true; continue }
    if (ch === '"' && !inLiteral) { inBasic = !inBasic; cur += ch; continue }
    if (ch === "'" && !inBasic) { inLiteral = !inLiteral; cur += ch; continue }
    if (!inBasic && !inLiteral) {
      if (ch === '[' || ch === '{') depth++
      else if (ch === ']' || ch === '}') depth--
      else if (ch === sep && depth === 0) { parts.push(cur); cur = ''; continue }
    }
    cur += ch
  }
  if (cur.trim()) parts.push(cur)
  return parts
}

/** 查找配对的闭合括号(引号感知; 字符串配对时 basic 串处理反斜杠转义) */
function findClose(s: string, openIdx: number, open: string, close: string): number {
  if (open === close) {
    const isBasic = open === '"'
    let esc = false
    for (let i = openIdx + 1; i < s.length; i++) {
      const ch = s[i]
      if (isBasic && esc) { esc = false; continue }
      if (isBasic && ch === '\\') { esc = true; continue }
      if (ch === open) return i
    }
    return -1
  }
  // 括号扫描: 引号内的括号不计数
  let depth = 0
  let inBasic = false
  let inLiteral = false
  let esc = false
  for (let i = openIdx; i < s.length; i++) {
    const ch = s[i]
    if (esc) { esc = false; continue }
    if (ch === '\\' && inBasic) { esc = true; continue }
    if (ch === '"' && !inLiteral) { inBasic = !inBasic; continue }
    if (ch === "'" && !inBasic) { inLiteral = !inLiteral; continue }
    if (inBasic || inLiteral) continue
    if (ch === open) depth++
    else if (ch === close) {
      depth--
      if (depth === 0) return i
    }
  }
  return -1
}

function parseValue(raw: string): unknown {
  const s = raw.trim()
  if (!s) return undefined
  if (s.startsWith('"')) {
    const end = findClose(s, 0, '"', '"')
    if (end < 0) return s
    return unescapeBasic(s.slice(1, end))
  }
  if (s.startsWith("'")) {
    const end = findClose(s, 0, "'", "'")
    if (end < 0) return s
    return s.slice(1, end)
  }
  if (s.startsWith('[')) {
    const end = findClose(s, 0, '[', ']')
    if (end < 0) return undefined
    const items = splitTopLevel(s, 1, end, ',')
    return items.map((it) => parseValue(it)).filter((v) => v !== undefined)
  }
  if (s.startsWith('{')) {
    const end = findClose(s, 0, '{', '}')
    if (end < 0) return undefined
    const obj: Record<string, unknown> = {}
    for (const pair of splitTopLevel(s, 1, end, ',')) {
      const eq = pair.indexOf('=')
      if (eq < 0) continue
      const key = pair.slice(0, eq).trim().replace(/^["']|["']$/g, '')
      obj[key] = parseValue(pair.slice(eq + 1))
    }
    return obj
  }
  if (s === 'true' || s === 'false') return s === 'true'
  const n = Number(s)
  if (s && Number.isFinite(n)) return n
  return s // 裸值(日期等)按字符串兜底
}

/** 解析区块头 [a.b."c.d"] → 键路径 */
function parseHeader(s: string): string[] | null {
  const inner = s.trim().slice(1, -1).trim()
  if (!inner) return null
  const keys: string[] = []
  let cur = ''
  let inBasic = false
  let inLiteral = false
  let esc = false
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i]
    if (esc) { cur += ch; esc = false; continue }
    if (ch === '\\' && inBasic) { cur += ch; esc = true; continue }
    if (ch === '"' && !inLiteral) { inBasic = !inBasic; continue }
    if (ch === "'" && !inBasic) { inLiteral = !inLiteral; continue }
    if (ch === '.' && !inBasic && !inLiteral) { keys.push(cur.trim()); cur = ''; continue }
    cur += ch
  }
  keys.push(cur.trim())
  return keys.every(Boolean) ? keys : null
}

function setPath(root: Record<string, unknown>, path: string[], value: unknown): void {
  let node: Record<string, unknown> = root
  for (let i = 0; i < path.length - 1; i++) {
    const k = path[i]
    const next = node[k]
    if (typeof next !== 'object' || next === null || Array.isArray(next)) {
      const n: Record<string, unknown> = {}
      node[k] = n
      node = n
    } else {
      node = next as Record<string, unknown>
    }
  }
  node[path[path.length - 1]] = value
}

/** 解析整份 TOML; 语法无法继续时返回 null */
export function parseToml(raw: string): Record<string, unknown> | null {
  const root: Record<string, unknown> = {}
  let tablePath: string[] = []
  for (const rawLine of raw.split(/\r?\n/)) {
    const line = stripComment(rawLine).trim()
    if (!line) continue
    if (line.startsWith('[') && line.endsWith(']') && !line.startsWith('[[')) {
      const p = parseHeader(line)
      if (!p) return null
      tablePath = p
      continue
    }
    const eq = line.indexOf('=')
    if (eq < 0) continue // 非键值行(如 [[array-of-table]]), 跳过
    const key = line.slice(0, eq).trim().replace(/^["']|["']$/g, '')
    if (!key) continue
    const value = parseValue(line.slice(eq + 1))
    if (value === undefined) continue
    setPath(root, [...tablePath, key], value)
  }
  return root
}
