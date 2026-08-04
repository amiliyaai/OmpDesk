import { useMemo, useState } from 'react'
import {
  FileDown,
  Folder,
  MoreHorizontal,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Search,
  Settings,
  Trash2,
  X
} from 'lucide-react'
import { useStore } from '../store'
import { relativeTime, shortPath } from '../lib/format'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu'
import { useI18n } from '../lib/useI18n'
import type { SessionMeta } from '../shared/types'

/** 会话列表项(悬停操作: 固定/重命名/导出/删除) */
function SessionItem({ meta }: { meta: SessionMeta }) {
  const { t, locale } = useI18n()
  const chat = useStore((s) => s.chat)
  const openSession = useStore((s) => s.openSession)
  const setPinned = useStore((s) => s.setPinned)
  const renameSession = useStore((s) => s.renameSession)
  const deleteSession = useStore((s) => s.deleteSession)
  const exportSession = useStore((s) => s.exportSession)
  const confirm = useStore((s) => s.confirm)
  const switching = useStore((s) => s.switching)
  const [menuOpen, setMenuOpen] = useState(false)
  const [ctxActive, setCtxActive] = useState(false) // 右键时强制显示操作区(否则 Radix 测量不到 trigger)
  const [renaming, setRenaming] = useState(false)
  const [title, setTitle] = useState(meta.title)
  const active = chat?.currentFile === meta.filePath
  const loading = active && switching

  return (
    <div
      className={`session-item ${active ? 'active' : ''} ${loading ? 'loading' : ''} ${ctxActive ? 'ctx' : ''}`}
      onContextMenu={(e) => {
        e.preventDefault()
        setCtxActive(true)
        setMenuOpen(true)
      }}
    >
      {loading && <span className="session-loading" title={t('app.startingSession')} />}
      <button
        className="session-main"
        onClick={() => void openSession(meta.filePath)}
        title={meta.filePath}
      >
        {renaming ? (
          <input
            className="session-rename-input"
            value={title}
            autoFocus
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => {
              setRenaming(false)
              if (title.trim() && title !== meta.title) void renameSession(meta.filePath, title)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
              if (e.key === 'Escape') {
                setTitle(meta.title)
                setRenaming(false)
              }
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <>
            <span className="session-title">{meta.title || t('sidebar.untitled')}</span>
            <span className="session-meta">
              {relativeTime(meta.updatedAt, locale)}
              {meta.workspace && <span className="session-ws"> · {shortPath(meta.workspace, 24)}</span>}
            </span>
          </>
        )}
      </button>
      <div className="session-actions" onClick={(e) => e.stopPropagation()}>
        <button className="icon-btn" title={meta.pinned ? t('sidebar.unpin') : t('sidebar.pin')} onClick={() => void setPinned(meta.filePath, !meta.pinned)}>
          {meta.pinned ? <PinOff size={12} /> : <Pin size={12} />}
        </button>
        <button className="icon-btn" title={t('sidebar.rename')} onClick={() => { setRenaming(true); setTitle(meta.title) }}>
          <Pencil size={12} />
        </button>
        <div className="more-wrap">
          <DropdownMenu
            open={menuOpen}
            onOpenChange={(v) => {
              setMenuOpen(v)
              if (!v) setCtxActive(false)
            }}
          >
            <DropdownMenuTrigger asChild>
              <button className="icon-btn" title={t('sidebar.more')} onClick={() => setMenuOpen((v) => !v)}>
                <MoreHorizontal size={12} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="session-menu min-w-[150px] p-1" align="end">
              <DropdownMenuItem
                onSelect={() => void exportSession(meta.filePath)}
              >
                <FileDown size={13} /> {t('sidebar.exportHtml')}
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                className="danger"
                onSelect={() =>
                  confirm({
                    title: t('sidebar.deleteSession'),
                    message: t('sidebar.deleteSessionMsg', { title: meta.title || t('sidebar.untitled') }),
                    confirmText: t('common.delete'),
                    danger: true,
                    onOk: () => void deleteSession(meta.filePath)
                  })
                }
              >
                <Trash2 size={13} /> {t('common.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}

/** 左侧栏: 新建 + 搜索 + 按固定/工作区分组的会话列表 */
export function Sidebar() {
  const { t } = useI18n()
  const sessions = useStore((s) => s.sessions)
  const search = useStore((s) => s.search)
  const setSearch = useStore((s) => s.setSearch)
  const newSession = useStore((s) => s.newSession)
  const setShowSettings = useStore((s) => s.setShowSettings)
  const connected = useStore((s) => s.connected)

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = sessions.filter(
      (s) => !q || s.title.toLowerCase().includes(q) || s.workspace.toLowerCase().includes(q)
    )
    const pinned = filtered.filter((s) => s.pinned)
    const rest = filtered.filter((s) => !s.pinned)
    const byWs = new Map<string, SessionMeta[]>()
    for (const s of rest) {
      const ws = s.workspace || t('sidebar.unknownWorkspace')
      byWs.set(ws, [...(byWs.get(ws) ?? []), s])
    }
    const groups: Array<{ label: string; items: SessionMeta[] }> = []
    if (pinned.length) groups.push({ label: t('sidebar.pinned'), items: pinned })
    for (const [ws, items] of [...byWs.entries()].sort((a, b) => b[1][0].updatedAt - a[1][0].updatedAt)) {
      groups.push({ label: ws, items })
    }
    return groups
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions, search, t])

  return (
    <aside className="sidebar">
      <div className="sidebar-head">
        <div className="logo">
          <span className="logo-mark">π</span>
          <span className="logo-name">OmpDesk</span>
        </div>
        <button className="btn primary new-chat" onClick={() => void newSession()}>
          <Plus size={15} /> {t('sidebar.newChat')}
        </button>
      </div>
      <div className="sidebar-search">
        <Search size={13} />
        <input
          placeholder={t('sidebar.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setSearch('')
          }}
        />
        {search && (
          <button className="search-clear" title={t('sidebar.clearSearch')} onClick={() => setSearch('')}>
            <X size={12} />
          </button>
        )}
      </div>
      <div className="sidebar-list">
        {groups.length === 0 && (
          <div className="sidebar-empty">
            {search ? t('sidebar.noMatch') : t('sidebar.empty')}
          </div>
        )}
        {groups.map((g) => (
          <div className="session-group" key={g.label}>
            <div className="session-group-title" title={g.label}>
              <Folder size={11} />
              <span>{shortPath(g.label, 20)}</span>
            </div>
            {g.items.map((s) => (
              <SessionItem key={s.filePath} meta={s} />
            ))}
          </div>
        ))}
      </div>
      <div className="sidebar-foot">
        <div className={`status-dot ${connected ? 'on' : 'off'}`} title={connected ? t('sidebar.ompConnected') : t('sidebar.ompDisconnected')} />
        <span className="sidebar-foot-text">{connected ? t('sidebar.connected') : t('sidebar.disconnected')}</span>
        <button className="icon-btn" title={t('sidebar.settings')} onClick={() => setShowSettings(true)}>
          <Settings size={15} />
        </button>
      </div>
    </aside>
  )
}
