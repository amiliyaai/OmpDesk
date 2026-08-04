import { FolderOpen, Sparkles } from 'lucide-react'
import { useStore } from '../store'
import { useI18n } from '../lib/useI18n'

/** 空状态: 未选择/新建会话时的引导页 */
export function EmptyState({ ompFound, version }: { ompFound: boolean; version?: string }) {
  const { t } = useI18n()
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
            {t('empty.ready', { version: version ?? '' })}
            {settings?.ompPath && <span className="empty-path">{settings.ompPath}</span>}
          </>
        ) : (
          t('empty.notFound')
        )}
      </p>
      <div className="empty-actions">
        <button className="btn primary big" onClick={() => void newSession()}>
          <Sparkles size={16} />
          {t('empty.startNew')}
        </button>
      </div>
      {recents.length > 0 && (
        <div className="empty-recents">
          <div className="empty-recents-title"><FolderOpen size={13} /> {t('empty.recents')}</div>
          {recents.map((s) => (
            <button key={s.filePath} className="empty-recent" onClick={() => void openSession(s.filePath)}>
              <span className="empty-recent-title">{s.title || t('sidebar.untitled')}</span>
              <span className="empty-recent-ws">{s.workspace.split(/[\\/]/).pop()}</span>
            </button>
          ))}
        </div>
      )}
      <p className="empty-hint">{t('empty.hint')}</p>
    </div>
  )
}
