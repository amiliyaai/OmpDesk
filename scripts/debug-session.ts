import { listSessions, parseSession } from '../electron/main/omp/sessions'

async function main() {
  const sessions = await listSessions()
  console.log('total:', sessions.length)
  const s = sessions[0]
  console.log('first:', s.filePath)
  console.log('title:', s.title, '| ws:', s.workspace, '| status:', s.status)
  const d = await parseSession(s.filePath)
  console.log('detail:', d ? 'messages=' + d.messages.length : 'NULL')
  if (d) {
    for (const m of d.messages.slice(0, 5)) {
      console.log(' -', m.role, m.content.map((c) => c.kind + ':' + c.text.slice(0, 40)).join(' / '), '| tools:', m.toolCalls.length)
    }
  }
}
void main()
