import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronRight, FileCode2, Folder, FolderOpen, X } from 'lucide-react'
import hljs from 'highlight.js/lib/common'
import { useStore } from '../store'
import { useI18n } from '../lib/useI18n'
import type { WorkspaceFile } from '../shared/types'

interface Tab {
  relPath: string
  name: string
}

/** 文件预览(hljs 高亮, 只读) */
function FilePreview({ content, relPath }: { content: string; relPath: string }) {
  const html = useMemo(() => {
    const lang = (relPath.split('.').pop() ?? '').toLowerCase()
    try {
      if (lang && hljs.getLanguage(lang)) return hljs.highlight(content, { language: lang }).value
      return hljs.highlightAuto(content).value
    } catch {
      return content
    }
  }, [content, relPath])
  return (
    <div className="file-preview">
      <pre>
        <code className="hljs" dangerouslySetInnerHTML={{ __html: html }} />
      </pre>
    </div>
  )
}

/** 工作区文件树(扁平列表 → 按目录深度缩进; 目录行仅作分组) */
function FileTree({
  files,
  onOpen
}: {
  files: WorkspaceFile[]
  onOpen: (relPath: string) => void
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const toggle = (dir: string): void => {
    setCollapsed((s) => {
      const next = new Set(s)
      if (next.has(dir)) next.delete(dir)
      else next.add(dir)
      return next
    })
  }
  // 目录折叠: 计算每个文件是否在折叠目录下
  const rows = files.filter((f) => {
    if (f.type === 'dir') return true
    const parts = f.relPath.split('/')
    parts.pop()
    let acc = ''
    for (const p of parts) {
      acc = acc ? `${acc}/${p}` : p
      if (collapsed.has(acc)) return false
    }
    return true
  })

  return (
    <div className="file-tree">
      {rows.map((f) => {
        const depth = f.type === 'dir'
          ? f.relPath.split('/').length - 1
          : f.relPath.split('/').length - 1
        if (f.type === 'dir') {
          const key = f.relPath.replace(/\/$/, '')
          const isCollapsed = collapsed.has(key)
          return (
            <button
              key={f.relPath}
              className="file-tree-dir"
              style={{ paddingLeft: 8 + depth * 12 }}
              onClick={() => toggle(key)}
            >
              {isCollapsed ? <ChevronRight size={11} /> : <FolderOpen size={11} />}
              <span className="truncate">{f.name}</span>
            </button>
          )
        }
        return (
          <button
            key={f.relPath}
            className="file-tree-file"
            style={{ paddingLeft: 8 + depth * 12 + 12 }}
            onClick={() => onOpen(f.relPath)}
            title={f.relPath}
          >
            <FileCode2 size={11} />
            <span className="truncate">{f.name}</span>
          </button>
        )
      })}
    </div>
  )
}

/**
 * 右侧文件面板(参照 pi-desktop / Codex):
 * 会话文件 + 工作区树 + 多标签页只读高亮预览, 可拖宽
 */
export function FilePanel() {
  const { t } = useI18n()
  const chat = useStore((s) => s.chat)
  const sessionFiles = useStore((s) => s.sessionFiles)
  const setFilePanelOpen = useStore((s) => s.setFilePanelOpen)
  const [mode, setMode] = useState<'session' | 'workspace'>('session')
  const [tree, setTree] = useState<WorkspaceFile[] | null>(null)
  const [tabs, setTabs] = useState<Tab[]>([])
  const [active, setActive] = useState<string | null>(null)
  const [contents, setContents] = useState<Record<string, string>>({})
  const [width, setWidth] = useState(330)
  const dragRef = useRef<{ startX: number; startW: number } | null>(null)

  const workspace = chat?.cwd ?? ''

  // 会话切换时清空标签页
  useEffect(() => {
    setTabs([])
    setActive(null)
    setContents({})
    setTree(null)
  }, [chat?.currentFile])

  // 懒加载工作区树
  const loadTree = useCallback(() => {
    if (tree === null && workspace) void window.omp.listFiles(workspace).then(setTree)
  }, [tree, workspace])

  const openFile = useCallback(
    async (relPath: string) => {
      if (!workspace) return
      const name = relPath.split('/').pop() ?? relPath
      setTabs((prev) => (prev.some((tb) => tb.relPath === relPath) ? prev : [...prev, { relPath, name }]))
      setActive(relPath)
      if (contents[relPath] === undefined) {
        const r = await window.omp.readFile(workspace, relPath)
        setContents((c) => ({
          ...c,
          [relPath]: r.ok ? (r.content ?? '') : `⚠ ${t('files.readFailed', { error: r.error ?? '' })}`
        }))
      }
    },
    [workspace, contents, t]
  )

  // 拖宽
  const onDragStart = (e: React.MouseEvent): void => {
    dragRef.current = { startX: e.clientX, startW: width }
    const onMove = (ev: MouseEvent): void => {
      if (!dragRef.current) return
      setWidth(Math.min(640, Math.max(220, dragRef.current.startW + (dragRef.current.startX - ev.clientX))))
    }
    const onUp = (): void => {
      dragRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <aside className="file-panel" style={{ width }}>
      <div className="file-panel-resizer" onMouseDown={onDragStart} />
      <div className="file-panel-head">
        <Folder size={13} />
        <span>{t('files.title')}</span>
        <button className="icon-btn ml-auto" title={t('common.close')} onClick={() => setFilePanelOpen(false)}>
          <X size={12} />
        </button>
      </div>
      <div className="file-panel-tabs">
        <button className={`file-mode ${mode === 'session' ? 'active' : ''}`} onClick={() => setMode('session')}>
          {t('files.session')}
        </button>
        <button className={`file-mode ${mode === 'workspace' ? 'active' : ''}`} onClick={() => { setMode('workspace'); loadTree() }}>
          {t('files.workspace')}
        </button>
      </div>
      <div className="file-list">
        {mode === 'session' ? (
          sessionFiles.length === 0 ? (
            <div className="file-empty">{t('files.emptySession')}</div>
          ) : (
            sessionFiles.map((p) => (
              <button key={p} className="file-row" title={p} onClick={() => void openFile(p)}>
                <FileCode2 size={11} />
                <span className="truncate">{p.split(/[\\/]/).pop()}</span>
              </button>
            ))
          )
        ) : tree === null ? (
          <div className="file-empty">…</div>
        ) : tree.length === 0 ? (
          <div className="file-empty">{t('files.emptyWorkspace')}</div>
        ) : (
          <FileTree files={tree} onOpen={(p) => void openFile(p)} />
        )}
      </div>
      {tabs.length > 0 && (
        <div className="file-tabs">
          {tabs.map((tb) => (
            <button
              key={tb.relPath}
              className={`file-tab ${active === tb.relPath ? 'active' : ''}`}
              onClick={() => setActive(tb.relPath)}
              title={tb.relPath}
            >
              <span className="truncate">{tb.name}</span>
              <span
                className="file-tab-close"
                onClick={(e) => {
                  e.stopPropagation()
                  setTabs((prev) => prev.filter((x) => x.relPath !== tb.relPath))
                  if (active === tb.relPath) setActive(tabs.find((x) => x.relPath !== tb.relPath)?.relPath ?? null)
                }}
              >
                ×
              </span>
            </button>
          ))}
        </div>
      )}
      {active && contents[active] !== undefined && <FilePreview content={contents[active]} relPath={active} />}
    </aside>
  )
}
