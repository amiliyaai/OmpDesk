import assert from 'node:assert/strict'
import { parseToml } from '../electron/main/omp/toml'

const doc = parseToml(`
# comment
model = "gpt-5.6-sol"
notify = [ "a.exe", "turn-ended" ]
[mcp_servers.godot-ai]
type = "http"
url = "http://127.0.0.1:8000/mcp"
[mcp_servers.node_repl]
type = 'stdio'
command = 'C:\\Users\\x\\node_repl.exe'
startup_timeout_sec = 120
args = ["-y", "@mcp/foo"]
env = { KEY = "v1", N = 'v2' }
[mcp_servers.node_repl.env]
BROWSER_USE = "chrome"
[mcp_servers."my server"]
url = "http://x"
[mcp_servers.godot-ai.auth]
tokenUrl = "http://auth"
`)
assert.ok(doc, 'parse ok')
const ga = doc!.mcp_servers['godot-ai'] as Record<string, unknown>
assert.equal(ga.type, 'http', 'basic string unquoted')
assert.equal(ga.url, 'http://127.0.0.1:8000/mcp')
const nr = doc!.mcp_servers['node_repl'] as Record<string, unknown>
assert.equal(nr.type, 'stdio', 'literal string unquoted')
assert.equal(nr.command, 'C:\\Users\\x\\node_repl.exe', 'literal windows path')
assert.equal(nr.startup_timeout_sec, 120, 'number')
assert.deepEqual(nr.args, ['-y', '@mcp/foo'], 'array')
assert.deepEqual(nr.env, { KEY: 'v1', N: 'v2', BROWSER_USE: 'chrome' }, 'inline table + nested env table')
assert.equal(doc!.mcp_servers['my server'].url, 'http://x', 'quoted header key')
assert.equal((doc!.mcp_servers['godot-ai'] as any).auth.tokenUrl, 'http://auth', 'nested auth table')
assert.equal(doc!.model, 'gpt-5.6-sol')
assert.deepEqual(doc!.notify, ['a.exe', 'turn-ended'])
console.log('TOML parser: all assertions passed ✔')
