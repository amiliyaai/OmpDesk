import { useEffect, useState } from 'react'
import {
  Boxes,
  Check,
  ChevronRight,
  Database,
  FolderOpen,
  Palette,
  Plus,
  Server,
  Sparkles,
  Trash2,
  X
} from 'lucide-react'
import { useStore } from '../store'
import type { ApprovalMode, McpServerDraft, RoleModels } from '../shared/types'

// ---------- 模型服务: 方案(CC Switch 式) ----------

function ProfileForm({ onClose }: { onClose: () => void }) {
  const providers = useStore((s) => s.providers)
  const roles = useStore((s) => s.profileRoles)
  const saveProfile = useStore((s) => s.saveProfile)
  const [name, setName] = useState('')
  const [provider, setProvider] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [roleModels, setRoleModels] = useState<RoleModels>({
    default: roles?.default ?? '',
    smol: roles?.smol ?? '',
    slow: roles?.slow ?? '',
    plan: roles?.plan ?? ''
  })
  const [approval, setApproval] = useState<ApprovalMode>('yolo')

  return (
    <div className="form-card">
      <div className="form-row">
        <label>方案名称</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="如: 生产环境" />
      </div>
      <div className="form-row">
        <label>供应商</label>
        <select value={provider} onChange={(e) => setProvider(e.target.value)}>
          <option value="">选择供应商…</option>
          {providers.map((p) => (
            <option key={p.name} value={p.name}>{p.name}</option>
          ))}
        </select>
      </div>
      <div className="form-row">
        <label>API Key (safeStorage 加密存储)</label>
        <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="留空则不改动" />
      </div>
      <div className="form-row">
        <label>模型角色映射</label>
        <div className="role-grid">
          {(['default', 'smol', 'slow', 'plan'] as const).map((r) => (
            <div key={r} className="role-field">
              <span>{r}</span>
              <input
                value={roleModels[r]}
                onChange={(e) => setRoleModels((m) => ({ ...m, [r]: e.target.value }))}
                placeholder="provider/model"
              />
            </div>
          ))}
        </div>
      </div>
      <div className="form-row">
        <label>审批模式</label>
        <select value={approval} onChange={(e) => setApproval(e.target.value as ApprovalMode)}>
          <option value="always-ask">始终询问</option>
          <option value="write">写入自动 (write)</option>
          <option value="yolo">全自动 (yolo)</option>
        </select>
      </div>
      <div className="form-actions">
        <button className="btn ghost" onClick={onClose}>取消</button>
        <button
          className="btn primary"
          disabled={!name.trim() || !provider}
          onClick={() => {
            void saveProfile({ name: name.trim(), provider, roles: roleModels, approvalMode: approval, apiKey: apiKey || undefined })
            onClose()
          }}
        >
          保存方案
        </button>
      </div>
    </div>
  )
}

// ---------- MCP: 编辑表单 ----------

function McpForm({ editing, onClose }: { editing: { name: string; server: McpServerDraft } | null; onClose: () => void }) {
  const saveMcpServer = useStore((s) => s.saveMcpServer)
  const refreshMcp = useStore((s) => s.refreshMcp)
  const [name, setName] = useState(editing?.name ?? '')
  const [type, setType] = useState<McpServerDraft['type']>(editing?.server.type ?? 'stdio')
  const [command, setCommand] = useState(editing?.server.command ?? '')
  const [args, setArgs] = useState(editing?.server.args?.join(' ') ?? '')
  const [url, setUrl] = useState(editing?.server.url ?? '')
  const [env, setEnv] = useState(Object.entries(editing?.server.env ?? {}).map(([k, v]) => `${k}=${v}`).join('\n'))

  const submit = (): void => {
    const envObj: Record<string, string> = {}
    for (const line of env.split('\n')) {
      const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
      if (m) envObj[m[1]] = m[2]
    }
    void saveMcpServer(name.trim(), { type, command: command || undefined, args: args.split(/\s+/).filter(Boolean), url: url || undefined, env: envObj, enabled: true }).then((r) => {
      if (r?.ok) void refreshMcp()
    })
    onClose()
  }

  return (
    <div className="form-card">
      <div className="form-row"><label>服务器名称</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="如: github" /></div>
      <div className="form-row">
        <label>传输类型</label>
        <select value={type} onChange={(e) => setType(e.target.value as McpServerDraft['type'])}>
          <option value="stdio">stdio (本地命令)</option>
          <option value="http">http</option>
          <option value="sse">sse</option>
        </select>
      </div>
      {type === 'stdio' ? (
        <>
          <div className="form-row"><label>命令</label><input value={command} onChange={(e) => setCommand(e.target.value)} placeholder="npx -y @modelcontextprotocol/server-github" /></div>
          <div className="form-row"><label>参数 (空格分隔)</label><input value={args} onChange={(e) => setArgs(e.target.value)} placeholder="--port 8080" /></div>
        </>
      ) : (
        <div className="form-row"><label>URL</label><input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/mcp" /></div>
      )}
      <div className="form-row">
        <label>环境变量 (每行 KEY=VALUE)</label>
        <textarea rows={3} value={env} onChange={(e) => setEnv(e.target.value)} placeholder="GITHUB_TOKEN=xxx" />
      </div>
      <div className="form-actions">
        <button className="btn ghost" onClick={onClose}>取消</button>
        <button className="btn primary" disabled={!name.trim() || (type === 'stdio' ? !command : !url)} onClick={submit}>
          保存
        </button>
      </div>
    </div>
  )
}

// ---------- 设置弹窗主体 ----------

const TABS = [
  { id: 'models', label: '模型服务', icon: Sparkles },
  { id: 'mcp', label: 'MCP', icon: Server },
  { id: 'skills', label: 'Skills', icon: Boxes },
  { id: 'appearance', label: '外观', icon: Palette },
  { id: 'data', label: '数据', icon: Database }
] as const

type TabId = (typeof TABS)[number]['id']

export function SettingsModal() {
  const open = useStore((s) => s.showSettings)
  const setOpen = useStore((s) => s.setShowSettings)
  const settings = useStore((s) => s.settings)
  const setSettings = useStore((s) => s.setSettings)
  const providers = useStore((s) => s.providers)
  const profiles = useStore((s) => s.profiles)
  const profileApproval = useStore((s) => s.profileApproval)
  const refreshProviders = useStore((s) => s.refreshProviders)
  const refreshProfiles = useStore((s) => s.refreshProfiles)
  const refreshMcp = useStore((s) => s.refreshMcp)
  const refreshSkills = useStore((s) => s.refreshSkills)
  const applyProfile = useStore((s) => s.applyProfile)
  const deleteProfile = useStore((s) => s.deleteProfile)
  const setMcpEnabled = useStore((s) => s.setMcpEnabled)
  const deleteMcpServer = useStore((s) => s.deleteMcpServer)
  const mcps = useStore((s) => s.mcps)
  const skills = useStore((s) => s.skills)
  const toggleSkill = useStore((s) => s.toggleSkill)
  const addNotice = useStore((s) => s.addNotice)
  const confirm = useStore((s) => s.confirm)
  const [tab, setTab] = useState<TabId>('models')
  const [showProfileForm, setShowProfileForm] = useState(false)
  const [showMcpForm, setShowMcpForm] = useState(false)
  const [editingMcp, setEditingMcp] = useState<{ name: string; server: McpServerDraft } | null>(null)
  const [workspace, setWorkspace] = useState(settings?.defaultWorkspace ?? '')
  const [hotkey, setHotkey] = useState(settings?.hotkey ?? '')
  const [logs, setLogs] = useState<string[]>([])
  const [showLogs, setShowLogs] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (open) {
      void refreshProviders()
      void refreshProfiles()
      void refreshMcp()
      void refreshSkills()
      setWorkspace(settings?.defaultWorkspace ?? '')
      setHotkey(settings?.hotkey ?? '')
    }
  }, [open, settings?.defaultWorkspace, settings?.hotkey, refreshProviders, refreshProfiles, refreshMcp, refreshSkills])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, setOpen])

  if (!open || !settings) return null

  const flashSaved = (): void => {
    setSaved(true)
    setTimeout(() => setSaved(false), 1200)
  }

  return (
    <div className="modal-overlay" onMouseDown={() => setOpen(false)}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>设置</h2>
          <button className="icon-btn" onClick={() => setOpen(false)}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <nav className="settings-nav">
            {TABS.map((t) => {
              const Icon = t.icon
              return (
                <button key={t.id} className={`settings-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
                  <Icon size={14} />
                  {t.label}
                </button>
              )
            })}
          </nav>

          <div className="settings-content">
            {tab === 'models' && (
              <div className="settings-section">
                <div className="section-title">审批模式</div>
                <select
                  value={settings.approvalMode || profileApproval}
                  onChange={(e) => {
                    void setSettings({ approvalMode: e.target.value as ApprovalMode }).then(() => addNotice('info', '审批模式已更新,会话进程已重启'))
                    flashSaved()
                  }}
                >
                  <option value="always-ask">始终询问 (推荐)</option>
                  <option value="write">写入自动 (write)</option>
                  <option value="yolo">全自动 (yolo)</option>
                </select>
                <div className="section-hint">always-ask: 读写都询问; write: 写入自动、执行询问; yolo: 全部自动批准。改动后 omp 进程自动重启。</div>

                <div className="section-title">配置方案 (一键切换)</div>
                {profiles && profiles.length === 0 && !showProfileForm && (
                  <div className="section-hint">还没有方案。方案 = 供应商 + API Key + 模型角色映射 + 审批模式,一键应用到 omp 配置(写前自动备份)。</div>
                )}
                {profiles?.map((p) => (
                  <div className="list-row" key={p.id}>
                    <div className="list-row-main">
                      <span className="list-row-title">{p.name}</span>
                      <span className="list-row-sub">{p.provider} · 审批: {p.approvalMode} · {p.roles.default || '默认模型未设'}</span>
                    </div>
                    <button className="btn small primary" onClick={() => void applyProfile(p.id)}>
                      应用
                    </button>
                    <button className="icon-btn" title="删除方案" onClick={() => {
                      confirm({ title: '删除方案', message: `删除方案「${p.name}」?`, confirmText: '删除', danger: true, onOk: () => void deleteProfile(p.id) })
                    }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
                {showProfileForm ? (
                  <ProfileForm onClose={() => setShowProfileForm(false)} />
                ) : (
                  <button className="btn ghost small" onClick={() => setShowProfileForm(true)}>
                    <Plus size={13} /> 新建方案
                  </button>
                )}

                <div className="section-title">供应商 (models.yml, 只读)</div>
                <div className="provider-list">
                  {providers.length === 0 && <div className="section-hint">未发现供应商配置 (~/.omp/agent/models.yml)</div>}
                  {providers.map((p) => (
                    <div className="provider-row" key={p.name}>
                      <span className="provider-name">{p.name}</span>
                      <span className={`key-dot ${p.hasKey ? 'has' : ''}`} title={p.hasKey ? '已配置 API Key(脱敏显示)' : '未配置 Key'} />
                      <span className="provider-sub">{p.modelCount} 个模型{p.hasKey ? '' : ' · 无 Key'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'mcp' && (
              <div className="settings-section">
                <div className="section-title">MCP 服务器</div>
                <div className="section-hint">用户级写入 ~/.omp/agent/mcp.json(写前备份);项目级与兼容来源只读展示。改动后需重启会话生效。</div>
                {mcps.map((m) => (
                  <div className="list-row" key={m.name}>
                    <div className="list-row-main">
                      <span className="list-row-title">{m.name}</span>
                      <span className="list-row-sub">
                        {m.type}{m.command ? ` · ${m.command}` : ''}{m.url ? ` · ${m.url}` : ''} · 来源: {m.source}
                      </span>
                    </div>
                    <button
                      className={`switch ${m.enabled ? 'on' : ''}`}
                      onClick={() => void setMcpEnabled(m.name, !m.enabled).then(() => refreshMcp())}
                    >
                      <span className="switch-knob" />
                    </button>
                    <button className="icon-btn" title="编辑" onClick={() => { setEditingMcp({ name: m.name, server: { type: m.type as McpServerDraft['type'], command: m.command, args: m.args, url: m.url, enabled: m.enabled } }); setShowMcpForm(true) }}>
                      <ChevronRight size={13} />
                    </button>
                    <button className="icon-btn" title="删除" onClick={() => {
                      confirm({ title: '删除 MCP 服务器', message: `删除 MCP 服务器「${m.name}」?`, confirmText: '删除', danger: true, onOk: () => void deleteMcpServer(m.name).then(() => refreshMcp()) })
                    }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
                {showMcpForm ? (
                  <McpForm editing={editingMcp} onClose={() => { setShowMcpForm(false); setEditingMcp(null) }} />
                ) : (
                  <button className="btn ghost small" onClick={() => { setEditingMcp(null); setShowMcpForm(true) }}>
                    <Plus size={13} /> 添加服务器
                  </button>
                )}
              </div>
            )}

            {tab === 'skills' && (
              <div className="settings-section">
                <div className="section-title">Skills (~/.omp/skills 等, SKILL.md 发现)</div>
                <div className="section-hint">关闭 = 写入 config.yml 的 skills.ignoredSkills。</div>
                {skills.map((s) => (
                  <div className="list-row" key={s.name}>
                    <div className="list-row-main">
                      <span className="list-row-title">{s.name} <span className="tag">{s.root}</span></span>
                      <span className="list-row-sub">{s.description || '(无描述)'}{s.globs?.length ? ` · globs: ${s.globs.join(', ')}` : ''}</span>
                    </div>
                    <button className={`switch ${s.enabled ? 'on' : ''}`} onClick={() => void toggleSkill(s.name, !s.enabled).then(() => refreshSkills())}>
                      <span className="switch-knob" />
                    </button>
                  </div>
                ))}
                {skills.length === 0 && <div className="section-hint">未发现 skills。</div>}
              </div>
            )}

            {tab === 'appearance' && (
              <div className="settings-section">
                <div className="section-title">主题</div>
                <select
                  value={settings.theme}
                  onChange={(e) => { void setSettings({ theme: e.target.value as typeof settings.theme }); flashSaved() }}
                >
                  <option value="system">跟随系统</option>
                  <option value="dark">深色</option>
                  <option value="light">浅色</option>
                </select>
                <div className="section-title">字体大小</div>
                <input
                  type="range"
                  min={0.85}
                  max={1.25}
                  step={0.05}
                  value={settings.fontScale}
                  onChange={(e) => void setSettings({ fontScale: Number(e.target.value) })}
                />
                <div className="section-hint">{Math.round(settings.fontScale * 100)}%</div>
              </div>
            )}

            {tab === 'data' && (
              <div className="settings-section">
                <div className="section-title">默认工作目录</div>
                <div className="workspace-row">
                  <input value={workspace} onChange={(e) => setWorkspace(e.target.value)} placeholder="C:\path\to\project" />
                  <button
                    className="btn ghost small"
                    title="浏览…"
                    onClick={() => {
                      void window.omp.pickDirectory().then((p) => {
                        if (p) setWorkspace(p)
                      })
                    }}
                  >
                    <FolderOpen size={13} /> 浏览…
                  </button>
                </div>
                <div className="form-actions inline">
                  <button className="btn small primary" onClick={() => { void setSettings({ defaultWorkspace: workspace }); flashSaved() }}>
                    {saved ? <Check size={13} /> : '保存'}
                  </button>
                </div>
                <div className="section-title">全局快捷键 (唤起窗口)</div>
                <input value={hotkey} onChange={(e) => setHotkey(e.target.value)} placeholder="CommandOrControl+Shift+Space" />
                <div className="form-actions inline">
                  <button className="btn small primary" onClick={() => { void setSettings({ hotkey }); flashSaved() }}>
                    {saved ? <Check size={13} /> : '保存'}
                  </button>
                </div>
                <div className="section-title">会话进程</div>
                <div className="section-hint">最多进程: {settings.maxPoolProcesses} · 空闲回收: {settings.idleKillMinutes} 分钟</div>
                <div className="section-title">omp</div>
                <div className="section-hint">路径: {settings.ompPath || '(未检测到)'}{settings.ompAutoDetected ? ' (自动探测)' : ''}</div>
                <div className="form-actions">
                  <button className="btn ghost small" onClick={() => { void window.omp.getOmpLogs(60).then(setLogs); setShowLogs(true) }}>
                    查看 omp 日志
                  </button>
                </div>
                {showLogs && (
                  <div className="logs-box">
                    {logs.length === 0 && <div className="section-hint">无日志</div>}
                    {logs.map((l, i) => <div key={i} className="log-line">{l}</div>)}
                  </div>
                )}
                <div className="section-title">关于</div>
                <div className="section-hint">OmpDesk v0.1.0 · oh-my-pi 桌面客户端 · 会话目录 ~/.omp/agent</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
