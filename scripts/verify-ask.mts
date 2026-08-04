/**
 * UI 请求管道验证(不依赖真实审批触发):
 * 1. 合成 extension_ui_request 帧(confirm/select/editor)→ 客户端应发出 ui-request 事件(规范化)
 * 2. respondUi 应在 stdin 发出 extension_ui_response
 * 3. 带 timeout 的请求不应答 → 超时自动取消并发出 ui-resolved
 */
import { OmpClient } from '../electron/main/omp/client'
import { locateOmp } from '../electron/main/omp/locate'

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function main() {
  const bin = await locateOmp()
  if (!bin) throw new Error('omp not found')

  const client = new OmpClient({ bin, cwd: process.cwd() })
  await client.start()

  const seen: Array<{ kind: string; id: string }> = []
  const resolved: string[] = []
  let stdinFrame: Record<string, unknown> | null = null
  client.on('ui-request', (r) => {
    const req = r as { kind: string; id: string }
    seen.push(req)
    if (req.id === 't1') client.respondUi(req.id, { confirmed: true })
  })
  client.on('ui-resolved', (id) => resolved.push(String(id)))
  // 监听发往 stdin 的帧
  const origWrite = client['child']!.stdin.write.bind(client['child']!.stdin)
  client['child']!.stdin.write = ((chunk: unknown) => {
    const s = String(chunk)
    try {
      stdinFrame = JSON.parse(s)
    } catch {
      /* ignore */
    }
    return origWrite(chunk)
  }) as never

  let failed = false
  const check = (name: string, cond: boolean) => {
    console.log(`  ${cond ? '✔' : '✘'} ${name}`)
    if (!cond) failed = true
  }

  console.log('── 合成 UI 请求 ──')
  // confirm + 立即应答
  ;(client as unknown as { handleUiRequest(f: Record<string, unknown>): void }).handleUiRequest({
    type: 'extension_ui_request', id: 't1', method: 'confirm', title: '确认', message: '继续?', timeout: 60000
  })
  await delay(200)
  check('confirm → ui-request(kind=confirm)', seen.some((x) => x.id === 't1' && x.kind === 'confirm'))
  check('respondUi 发出 extension_ui_response', stdinFrame?.type === 'extension_ui_response' && stdinFrame?.id === 't1' && stdinFrame?.confirmed === true)

  // select
  ;(client as unknown as { handleUiRequest(f: Record<string, unknown>): void }).handleUiRequest({
    type: 'extension_ui_request', id: 't2', method: 'select', title: '选择', message: '选项', options: ['a', 'b', 'c'], multiple: false, timeout: 60000
  })
  await delay(200)
  check('select → ui-request(kind=select, options 解析)', seen.some((x) => x.id === 't2' && x.kind === 'select'))

  // editor
  ;(client as unknown as { handleUiRequest(f: Record<string, unknown>): void }).handleUiRequest({
    type: 'extension_ui_request', id: 't3', method: 'editor', title: '编辑', message: '内容', initial: 'hello', timeout: null
  })
  await delay(200)
  check('editor → ui-request(kind=editor)', seen.some((x) => x.id === 't3' && x.kind === 'editor'))

  // 未知方法: 透传原始帧但不阻塞
  ;(client as unknown as { handleUiRequest(f: Record<string, unknown>): void }).handleUiRequest({
    type: 'extension_ui_request', id: 't4', method: 'setWidget', widgetKey: 'x'
  })
  await delay(200)
  check('未知方法不产生 ui-request', !seen.some((x) => x.id === 't4'))

  // 超时兜底
  const t0 = Date.now()
  ;(client as unknown as { handleUiRequest(f: Record<string, unknown>): void }).handleUiRequest({
    type: 'extension_ui_request', id: 't5', method: 'confirm', title: '超时', message: '不应答', timeout: 1500
  })
  await delay(2500)
  const timedOut = resolved.includes('t5')
  check('超时自动取消 + ui-resolved', timedOut)
  check('超时取消发生在 1.5s 后', Date.now() - t0 >= 1500)

  await client.stop()
  console.log(failed ? 'FAILED' : 'ALL PASS')
  process.exit(failed ? 2 : 0)
}

void main()
