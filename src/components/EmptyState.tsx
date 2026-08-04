import { FolderOpen, Sparkles } from 'lucide-react'
import { useStore } from '../store'

/** 空状态: 未选择/新建会话时的引导页 */
export function EmptyState({ ompFound, version }: { ompFound: boolean; version?: string }) {
  const settings = useStore((s) => s.settings)
  const newSession = useStore((s) => s.newSession)
  const openSession = useStore((s) => s.openSession)
  const sessions = useStore((s) => s.sessions)
  const recents = sessions.slice(0, 5)

  return (
    <div className="empty-state">
      <div className="empty-logo">π</div>
      <h1>OmpDesk</h1>
      <p className="empty-sub">
        {ompFound ? (
          <>
            oh-my-pi 桌面端 · omp {version} 已就绪
            {settings?.ompPath && <span className="empty-path">{settings.ompPath}</span>}
          </>
        ) : (
          '未检测到 omp,请到 设置 → 数据 中确认安装路径'
        )}
      </p>
      <div className="empty-actions">
        <button className="btn primary big" onClick={() => void newSession()}>
          <Sparkles size={16} />
          开始新对话
        </button>
      </div>
      {recents.length > 0 && (
        <div className="empty-recents">
          <div className="empty-recents-title"><FolderOpen size={13} /> 最近会话</div>
          {recents.map((s) => (
            <button key={s.filePath} className="empty-recent" onClick={() => void openSession(s.filePath)}>
              <span className="empty-recent-title">{s.title || '无标题会话'}</span>
              <span className="empty-recent-ws">{s.workspace.split(/[\\/]/).pop()}</span>
            </button>
          ))}
        </div>
      )}
      <p className="empty-hint">提示: 粘贴图片可直接发送 · Ctrl+K 打开命令面板 · 右上角切换模型</p>
    </div>
  )
}
