import { useEffect, useState } from 'react'
import {
  Check,
  ChevronRight,
  Database,
  FolderOpen,
  Gauge,
  Info,
  Palette,
  Plug,
  Plus,
  Server,
  SlidersHorizontal,
  Sparkles,
  Trash2
} from 'lucide-react'
import { useStore } from '../store'
import { Dialog, DialogContent } from './ui/dialog'
import { FieldSelect } from './ui/field-select'
import { Switch } from './ui/switch'
import { useI18n } from '../lib/useI18n'
import type { ApprovalMode, Language, McpServerDraft, RoleModels } from '../shared/types'

// ---------- 模型服务: 方案(CC Switch 式) ----------

function ProfileForm({ onClose }: { onClose: () => void }) {
  const { t } = useI18n()
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
        <label>{t('settings.profileName')}</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('settings.profileNamePlaceholder')} />
      </div>
      <div className="form-row">
        <label>{t('settings.provider')}</label>
        <FieldSelect
          value={provider}
          onChange={setProvider}
          placeholder={t('settings.providerPlaceholder')}
          options={providers.map((p) => ({ value: p.name, label: p.name }))}
        />
      </div>
      <div className="form-row">
        <label>{t('settings.apiKey')}</label>
        <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={t('settings.apiKeyPlaceholder')} />
      </div>
      <div className="form-row">
        <label>{t('settings.roleModels')}</label>
        <div className="role-grid">
          {(['default', 'smol', 'slow', 'plan'] as const).map((r) => (
            <div key={r} className="role-field">
              <span>{r}</span>
              <input
                value={roleModels[r]}
                onChange={(e) => setRoleModels((m) => ({ ...m, [r]: e.target.value }))}
                placeholder={t('settings.rolePlaceholder')}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="form-row">
        <label>{t('settings.approvalMode')}</label>
        <FieldSelect
          value={approval}
          onChange={(v) => setApproval(v as ApprovalMode)}
          options={[
            { value: 'always-ask', label: t('settings.approvalAlwaysAsk') },
            { value: 'write', label: t('settings.approvalWrite') },
            { value: 'yolo', label: t('settings.approvalYolo') }
          ]}
        />
      </div>
      <div className="form-actions">
        <button className="btn ghost" onClick={onClose}>{t('common.cancel')}</button>
        <button
          className="btn primary"
          disabled={!name.trim() || !provider}
          onClick={() => {
            void saveProfile({ name: name.trim(), provider, roles: roleModels, approvalMode: approval, apiKey: apiKey || undefined })
            onClose()
          }}
        >
          {t('settings.saveProfile')}
        </button>
      </div>
    </div>
  )
}

// ---------- MCP: 编辑表单 ----------

function McpForm({ editing, onClose }: { editing: { name: string; server: McpServerDraft } | null; onClose: () => void }) {
  const { t } = useI18n()
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
      <div className="form-row"><label>{t('settings.serverName')}</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('settings.serverNamePlaceholder')} /></div>
      <div className="form-row">
        <label>{t('settings.transport')}</label>
        <FieldSelect
          value={type}
          onChange={(v) => setType(v as McpServerDraft['type'])}
          options={[
            { value: 'stdio', label: t('settings.stdioLabel') },
            { value: 'http', label: 'http' },
            { value: 'sse', label: 'sse' }
          ]}
        />
      </div>
      {type === 'stdio' ? (
        <>
          <div className="form-row"><label>{t('settings.command')}</label><input value={command} onChange={(e) => setCommand(e.target.value)} placeholder={t('settings.commandPlaceholder')} /></div>
          <div className="form-row"><label>{t('settings.argsLabel')}</label><input value={args} onChange={(e) => setArgs(e.target.value)} placeholder={t('settings.argsPlaceholder')} /></div>
        </>
      ) : (
        <div className="form-row"><label>{t('settings.urlLabel')}</label><input value={url} onChange={(e) => setUrl(e.target.value)} placeholder={t('settings.urlPlaceholder')} /></div>
      )}
      <div className="form-row">
        <label>{t('settings.envVars')}</label>
        <textarea rows={3} value={env} onChange={(e) => setEnv(e.target.value)} placeholder="GITHUB_TOKEN=xxx" />
      </div>
      <div className="form-actions">
        <button className="btn ghost" onClick={onClose}>{t('common.cancel')}</button>
        <button className="btn primary" disabled={!name.trim() || (type === 'stdio' ? !command : !url)} onClick={submit}>
          {t('settings.saveMcp')}
        </button>
      </div>
    </div>
  )
}

// ---------- 设置弹窗主体(Codex 式分组导航) ----------

const SECTIONS = [
  {
    titleKey: 'settings.sectionPersonal',
    tabs: [
      { id: 'general', labelKey: 'settings.tabGeneral', icon: SlidersHorizontal },
      { id: 'appearance', labelKey: 'settings.tabAppearance', icon: Palette }
    ]
  },
  {
    titleKey: 'settings.sectionAgent',
    tabs: [
      { id: 'models', labelKey: 'settings.tabModels', icon: Sparkles },
      { id: 'integrations', labelKey: 'settings.tabIntegrations', icon: Plug }
    ]
  },
  {
    titleKey: 'settings.sectionSystem',
    tabs: [
      { id: 'data', labelKey: 'settings.tabData', icon: Database },
      { id: 'usage', labelKey: 'settings.tabUsage', icon: Gauge },
      { id: 'backend', labelKey: 'settings.tabBackend', icon: Server },
      { id: 'about', labelKey: 'settings.tabAbout', icon: Info }
    ]
  }
] as const

type TabId = (typeof SECTIONS)[number]['tabs'][number]['id']

export function SettingsModal() {
  const { t } = useI18n()
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
  const [tab, setTab] = useState<TabId>('general')
  const [showProfileForm, setShowProfileForm] = useState(false)
  const [showMcpForm, setShowMcpForm] = useState(false)
  const [editingMcp, setEditingMcp] = useState<{ name: string; server: McpServerDraft } | null>(null)
  const [workspace, setWorkspace] = useState(settings?.defaultWorkspace ?? '')
  const [hotkey, setHotkey] = useState(settings?.hotkey ?? '')
  const [logs, setLogs] = useState<string[]>([])
  const [showLogs, setShowLogs] = useState(false)
  const [saved, setSaved] = useState(false)
  const [appVersion, setAppVersion] = useState('')

  useEffect(() => {
    if (open) {
      void refreshProviders()
      void refreshProfiles()
      void refreshMcp()
      void refreshSkills()
      setWorkspace(settings?.defaultWorkspace ?? '')
      setHotkey(settings?.hotkey ?? '')
      void window.omp.getVersion().then(setAppVersion)
    }
  }, [open, settings?.defaultWorkspace, settings?.hotkey, refreshProviders, refreshProfiles, refreshMcp, refreshSkills])

  if (!settings) return null

  const flashSaved = (): void => {
    setSaved(true)
    setTimeout(() => setSaved(false), 1200)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="modal max-w-[900px] p-0" showClose>
        <div className="modal-head">
          <h2>{t('settings.title')}</h2>
        </div>
        <div className="modal-body">
          <nav className="settings-nav">
            {SECTIONS.map((sec) => (
              <div className="settings-nav-group" key={sec.titleKey}>
                <div className="settings-nav-title">{t(sec.titleKey)}</div>
                {sec.tabs.map((tb) => {
                  const Icon = tb.icon
                  return (
                    <button
                      key={tb.id}
                      className={`settings-tab ${tab === tb.id ? 'active' : ''}`}
                      onClick={() => setTab(tb.id)}
                    >
                      <Icon size={14} />
                      {t(tb.labelKey)}
                    </button>
                  )
                })}
              </div>
            ))}
          </nav>

          <div className="settings-content">
            {tab === 'general' && (
              <div className="settings-section">
                <div className="section-title">{t('settings.language')}</div>
                <FieldSelect
                  value={settings.language ?? 'zh-CN'}
                  onChange={(v) => { void setSettings({ language: v as Language }); flashSaved() }}
                  options={[
                    { value: 'zh-CN', label: '简体中文' },
                    { value: 'en', label: 'English' },
                    { value: 'ja', label: '日本語' }
                  ]}
                />
                <div className="section-title">{t('settings.defaultWorkspace')}</div>
                <div className="workspace-row">
                  <input value={workspace} onChange={(e) => setWorkspace(e.target.value)} placeholder="C:\path\to\project" />
                  <button
                    className="btn ghost small"
                    title={t('common.browse')}
                    onClick={() => {
                      void window.omp.pickDirectory().then((p) => {
                        if (p) setWorkspace(p)
                      })
                    }}
                  >
                    <FolderOpen size={13} /> {t('common.browse')}
                  </button>
                </div>
                <div className="form-actions inline">
                  <button className="btn small primary" onClick={() => { void setSettings({ defaultWorkspace: workspace }); flashSaved() }}>
                    {saved ? <Check size={13} /> : t('common.save')}
                  </button>
                </div>
                <div className="section-title">{t('settings.hotkey')}</div>
                <input value={hotkey} onChange={(e) => setHotkey(e.target.value)} placeholder="CommandOrControl+Shift+Space" />
                <div className="form-actions inline">
                  <button className="btn small primary" onClick={() => { void setSettings({ hotkey }); flashSaved() }}>
                    {saved ? <Check size={13} /> : t('common.save')}
                  </button>
                </div>
              </div>
            )}

            {tab === 'appearance' && (
              <div className="settings-section">
                <div className="section-title">{t('settings.theme')}</div>
                <FieldSelect
                  value={settings.theme}
                  onChange={(v) => { void setSettings({ theme: v as typeof settings.theme }); flashSaved() }}
                  options={[
                    { value: 'system', label: t('settings.themeSystem') },
                    { value: 'dark', label: t('settings.themeDark') },
                    { value: 'light', label: t('settings.themeLight') }
                  ]}
                />
                <div className="section-title">{t('settings.fontSize')}</div>
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

            {tab === 'models' && (
              <div className="settings-section">
                <div className="section-title">{t('settings.approvalMode')}</div>
                <FieldSelect
                  value={settings.approvalMode || profileApproval || ''}
                  onChange={(v) => {
                    void setSettings({ approvalMode: v as ApprovalMode }).then(() => addNotice('info', t('notices.approvalUpdated')))
                    flashSaved()
                  }}
                  placeholder={t('settings.approvalPlaceholder')}
                  options={[
                    { value: 'always-ask', label: t('settings.approvalAlwaysAsk') },
                    { value: 'write', label: t('settings.approvalWrite') },
                    { value: 'yolo', label: t('settings.approvalYolo') }
                  ]}
                />
                <div className="section-hint">{t('settings.approvalHint')}</div>

                <div className="section-title">{t('settings.profiles')}</div>
                {profiles && profiles.length === 0 && !showProfileForm && (
                  <div className="section-hint">{t('settings.profilesEmpty')}</div>
                )}
                {profiles?.map((p) => (
                  <div className="list-row" key={p.id}>
                    <div className="list-row-main">
                      <span className="list-row-title">{p.name}</span>
                      <span className="list-row-sub">
                        {p.provider} · {t('settings.approvalMode')}: {p.approvalMode} · {p.roles.default || t('settings.profileDefaultModelUnset')}
                      </span>
                    </div>
                    <button className="btn small primary" onClick={() => void applyProfile(p.id)}>
                      {t('common.apply')}
                    </button>
                    <button className="icon-btn" title={t('settings.deleteProfileTitle')} onClick={() => {
                      confirm({ title: t('settings.deleteProfileTitle'), message: t('settings.deleteProfileMsg', { name: p.name }), confirmText: t('common.delete'), danger: true, onOk: () => void deleteProfile(p.id) })
                    }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
                {showProfileForm ? (
                  <ProfileForm onClose={() => setShowProfileForm(false)} />
                ) : (
                  <button className="btn ghost small" onClick={() => setShowProfileForm(true)}>
                    <Plus size={13} /> {t('settings.newProfile')}
                  </button>
                )}

                <div className="section-title">{t('settings.providers')}</div>
                <div className="provider-list">
                  {providers.length === 0 && <div className="section-hint">{t('settings.providersEmpty')}</div>}
                  {providers.map((p) => (
                    <div className="provider-row" key={p.name}>
                      <span className="provider-name">{p.name}</span>
                      <span className={`key-dot ${p.hasKey ? 'has' : ''}`} title={p.hasKey ? t('settings.keyConfigured') : t('settings.keyMissing')} />
                      <span className="provider-sub">{t('settings.modelsCount', { n: p.modelCount })}{p.hasKey ? '' : ` · ${t('settings.noKey')}`}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'integrations' && (
              <div className="settings-section">
                <div className="section-title">{t('settings.mcpServers')}</div>
                <div className="section-hint">{t('settings.mcpHint')}</div>
                {mcps.map((m) => (
                  <div className="list-row" key={m.name}>
                    <div className="list-row-main">
                      <span className="list-row-title">{m.name}</span>
                      <span className="list-row-sub">
                        {m.type}{m.command ? ` · ${m.command}` : ''}{m.url ? ` · ${m.url}` : ''} · {t('settings.mcpSource', { source: m.source })}
                      </span>
                    </div>
                    <Switch
                      checked={m.enabled}
                      onCheckedChange={(v) => void setMcpEnabled(m.name, v).then(() => refreshMcp())}
                      aria-label={`${m.name} ${t('settings.tabMcp')}`}
                    />
                    <button className="icon-btn" title={t('common.edit')} onClick={() => { setEditingMcp({ name: m.name, server: { type: m.type as McpServerDraft['type'], command: m.command, args: m.args, url: m.url, enabled: m.enabled } }); setShowMcpForm(true) }}>
                      <ChevronRight size={13} />
                    </button>
                    <button className="icon-btn" title={t('common.delete')} onClick={() => {
                      confirm({ title: t('settings.deleteMcpTitle'), message: t('settings.deleteMcpMsg', { name: m.name }), confirmText: t('common.delete'), danger: true, onOk: () => void deleteMcpServer(m.name).then(() => refreshMcp()) })
                    }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
                {showMcpForm ? (
                  <McpForm editing={editingMcp} onClose={() => { setShowMcpForm(false); setEditingMcp(null) }} />
                ) : (
                  <button className="btn ghost small" onClick={() => { setEditingMcp(null); setShowMcpForm(true) }}>
                    <Plus size={13} /> {t('settings.addServer')}
                  </button>
                )}

                <div className="section-title">{t('settings.skillsTitle')}</div>
                <div className="section-hint">{t('settings.skillsHint')}</div>
                {skills.map((s) => (
                  <div className="list-row" key={s.name}>
                    <div className="list-row-main">
                      <span className="list-row-title">{s.name} <span className="tag">{s.root}</span></span>
                      <span className="list-row-sub">{s.description || t('settings.noDescription')}{s.globs?.length ? ` · globs: ${s.globs.join(', ')}` : ''}</span>
                    </div>
                    <Switch
                      checked={s.enabled}
                      onCheckedChange={(v) => void toggleSkill(s.name, v).then(() => refreshSkills())}
                      aria-label={`${s.name} ${t('settings.tabSkills')}`}
                    />
                  </div>
                ))}
                {skills.length === 0 && <div className="section-hint">{t('settings.noSkills')}</div>}
              </div>
            )}

            {tab === 'data' && (
              <div className="settings-section">
                <div className="section-title">{t('settings.sessionProcess')}</div>
                <div className="section-hint">
                  {t('settings.sessionProcessHint', { max: settings.maxPoolProcesses, min: settings.idleKillMinutes })}
                </div>
                <div className="section-title">{t('settings.ompSection')}</div>
                <div className="section-hint">
                  {t('settings.ompPathHint', { path: settings.ompPath || t('settings.notDetected'), detected: settings.ompAutoDetected ? t('settings.autoDetected') : '' })}
                </div>
                <div className="form-actions">
                  <button className="btn ghost small" onClick={() => { void window.omp.getOmpLogs(60).then(setLogs); setShowLogs(true) }}>
                    {t('settings.viewOmpLogs')}
                  </button>
                </div>
                {showLogs && (
                  <div className="logs-box">
                    {logs.length === 0 && <div className="section-hint">{t('settings.noLogs')}</div>}
                    {logs.map((l, i) => <div key={i} className="log-line">{l}</div>)}
                  </div>
                )}
              </div>
            )}

            {tab === 'usage' && (
              <div className="settings-section">
                <div className="section-hint">{t('settings.usagePlaceholder')}</div>
              </div>
            )}

            {tab === 'backend' && (
              <div className="settings-section">
                <div className="section-hint">{t('settings.backendPlaceholder')}</div>
              </div>
            )}

            {tab === 'about' && (
              <div className="settings-section">
                <div className="section-title">OmpDesk</div>
                <div className="section-hint">{t('settings.aboutHint', { version: appVersion })}</div>
                <div className="section-hint">{t('settings.aboutCopyright')}</div>
                <div className="section-hint">{t('settings.aboutRepo')}</div>
                <div className="form-actions">
                  <button className="btn ghost small" onClick={() => void window.omp.showAbout()}>
                    {t('menubar.about')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
