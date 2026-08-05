import { useState } from 'react'
import { useStore } from '../store'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from './ui/dropdown-menu'
import { useI18n } from '../lib/useI18n'

type MenuAction = () => void
type MenuEntry = { label: string; shortcut?: string; action: MenuAction } | 'sep'

/** 渲染端自绘菜单栏(参照 Codex: 文件/编辑/视图/帮助; macOS 用原生屏顶菜单, 不渲染) */
export function MenuBar() {
  const { t } = useI18n()
  const newSession = useStore((s) => s.newSession)
  const newWorktreeSession = useStore((s) => s.newWorktreeSession)
  const setSettings = useStore((s) => s.setSettings)
  const setShowSettings = useStore((s) => s.setShowSettings)
  const filePanelOpen = useStore((s) => s.filePanelOpen)
  const setFilePanelOpen = useStore((s) => s.setFilePanelOpen)
  const [open, setOpen] = useState<string | null>(null)

  const openFolder = (): void => {
    void window.omp.pickDirectory().then((p) => {
      if (!p) return
      void setSettings({ defaultWorkspace: p }).then(() => newSession())
    })
  }

  const execCmd = (cmd: string): MenuAction => () => {
    document.execCommand(cmd)
  }

  // 缩放走 webContents zoom(与原生 View 菜单角色一致, 避免 CSS zoom 双轨)
  const zoomBy = (delta: number): MenuAction => () => {
    void window.omp.zoom(delta)
  }

  const MENUS: Array<{ id: string; label: string; items: MenuEntry[] }> = [
    {
      id: 'file',
      label: t('menubar.file'),
      items: [
        { label: t('menubar.newChat'), shortcut: 'Ctrl+N', action: () => void newSession() },
        { label: t('menubar.newWorktreeChat'), shortcut: 'Ctrl+Shift+N', action: () => void newWorktreeSession() },
        { label: t('menubar.openFolder'), shortcut: 'Ctrl+O', action: openFolder },
        'sep',
        { label: t('menubar.settings'), shortcut: 'Ctrl+,', action: () => setShowSettings(true) },
        'sep',
        { label: t('menubar.close'), shortcut: 'Ctrl+W', action: () => window.close() },
        { label: t('tray.quit'), shortcut: 'Ctrl+Q', action: () => void window.omp.quit() }
      ]
    },
    {
      id: 'edit',
      label: t('menubar.edit'),
      items: [
        { label: t('menubar.undo'), shortcut: 'Ctrl+Z', action: execCmd('undo') },
        { label: t('menubar.redo'), shortcut: 'Ctrl+Y', action: execCmd('redo') },
        'sep',
        { label: t('menubar.cut'), shortcut: 'Ctrl+X', action: execCmd('cut') },
        { label: t('menubar.copy'), shortcut: 'Ctrl+C', action: execCmd('copy') },
        { label: t('menubar.paste'), shortcut: 'Ctrl+V', action: execCmd('paste') },
        { label: t('menubar.selectAll'), shortcut: 'Ctrl+A', action: execCmd('selectAll') }
      ]
    },
    {
      id: 'view',
      label: t('menubar.view'),
      items: [
        { label: t('menubar.toggleFiles'), shortcut: 'Ctrl+Shift+E', action: () => setFilePanelOpen(!filePanelOpen) },
        'sep',
        { label: t('menubar.zoomIn'), shortcut: 'Ctrl+Shift+=', action: zoomBy(0.5) },
        { label: t('menubar.zoomOut'), shortcut: 'Ctrl+-', action: zoomBy(-0.5) },
        { label: t('menubar.resetZoom'), shortcut: 'Ctrl+0', action: () => void window.omp.zoomReset() },
        'sep',
        { label: t('menubar.fullscreen'), shortcut: 'F11', action: () => void window.omp.toggleFullScreen() }
      ]
    },
    {
      id: 'help',
      label: t('menubar.help'),
      items: [
        { label: t('menubar.checkUpdates'), action: () => void window.omp.checkForUpdates() },
        { label: t('menubar.about'), action: () => void window.omp.showAbout() }
      ]
    }
  ]

  return (
    <div className="menubar" role="menubar">
      {MENUS.map((menu) => (
        <DropdownMenu key={menu.id} open={open === menu.id} onOpenChange={(v) => setOpen(v ? menu.id : null)}>
          <DropdownMenuTrigger asChild>
            <button className={`menubar-item ${open === menu.id ? 'active' : ''}`} role="menuitem">
              {menu.label}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="menubar-menu min-w-[230px] p-1" align="start" sideOffset={2}>
            {menu.items.map((it, i) =>
              it === 'sep' ? (
                <DropdownMenuSeparator key={i} />
              ) : (
                <DropdownMenuItem key={i} onSelect={it.action}>
                  <span>{it.label}</span>
                  {it.shortcut && <span className="ml-auto pl-6 text-[11px] opacity-60">{it.shortcut}</span>}
                </DropdownMenuItem>
              )
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ))}
    </div>
  )
}
