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
import type { SessionMeta } from '../shared/types'

/** 会话列表项(悬停操作: 固定/重命名/导出/删除) */
function SessionItem({ meta }: { meta: SessionMeta }) {
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
      {loading && <span className="session-loading" title="正在启动会话进程…" />}
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
            <span className="session-title">{meta.title || '无标题会话'}</span>
            <span className="session-meta">
              {relativeTime(meta.updatedAt)}
              {meta.workspace && <span className="session-ws"> · {shortPath(meta.workspace, 24)}</span>}
            </span>
          </>
        )}
      </button>
      <div className="session-actions" onClick={(e) => e.stopPropagation()}>
        <button className="icon-btn" title={meta.pinned ? '取消固定' : '固定'} onClick={() => void setPinned(meta.filePath, !meta.pinned)}>
          {meta.pinned ? <PinOff size={12} /> : <Pin size={12} />}
        </button>
        <button className="icon-btn" title="重命名" onClick={() => { setRenaming(true); setTitle(meta.title) }}>
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
              <button className="icon-btn" title="更多" onClick={() => setMenuOpen((v) => !v)}>
                <MoreHorizontal size={12} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="session-menu min-w-[150px] p-1" align="end">
              <DropdownMenuItem
                onSelect={() => void exportSession(meta.filePath)}
              >
                <FileDown size={13} /> 导出 HTML
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                className="danger"
                onSelect={() =>
                  confirm({
                    title: '删除会话',
                    message: `删除「${meta.title || '无标题'}」?\n会话文件及其子会话将被移除, 无法恢复。`,
                    confirmText: '删除',
                    danger: true,
                    onOk: () => void deleteSession(meta.filePath)
                  })
                }
              >
                <Trash2 size={13} /> 删除
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
      const ws = s.workspace || '(未知)'
      byWs.set(ws, [...(byWs.get(ws) ?? []), s])
    }
    const groups: Array<{ label: string; items: SessionMeta[] }> = []
    if (pinned.length) groups.push({ label: '已固定', items: pinned })
    for (const [ws, items] of [...byWs.entries()].sort((a, b) => b[1][0].updatedAt - a[1][0].updatedAt)) {
      groups.push({ label: ws, items })
    }
    return groups
  }, [sessions, search])

  return (
    <aside className="sidebar">
      <div className="sidebar-head">
        <div className="logo">
          <span className="logo-mark">π</span>
          <span className="logo-name">OmpDesk</span>
        </div>
        <button className="btn primary new-chat" onClick={() => void newSession()}>
          <Plus size={15} /> 新建对话
        </button>
      </div>
      <div className="sidebar-search">
        <Search size={13} />
        <input
          placeholder="搜索会话…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setSearch('')
          }}
        />
        {search && (
          <button className="search-clear" title="清空 (Esc)" onClick={() => setSearch('')}>
            <X size={12} />
          </button>
        )}
      </div>
      <div className="sidebar-list">
        {groups.length === 0 && (
          <div className="sidebar-empty">
            {search ? '没有匹配的会话' : '还没有会话,开始第一个对话吧'}
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
        <div className={`status-dot ${connected ? 'on' : 'off'}`} title={connected ? 'omp 已连接' : 'omp 未连接'} />
        <span className="sidebar-foot-text">{connected ? '已连接' : '未连接'}</span>
        <button className="icon-btn" title="设置" onClick={() => setShowSettings(true)}>
          <Settings size={15} />
        </button>
      </div>
    </aside>
  )
}
