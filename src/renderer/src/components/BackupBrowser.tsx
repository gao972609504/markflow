/**
 * 备份浏览与恢复 (Backup Browser)
 * — 列出当前文件的 .bomo-backup 历史快照，预览内容，一键恢复
 * — 配合迭代50 自动备份，构成完整的版本安全闭环
 */
import { useEffect, useState } from 'react'
import { useEditorStore } from '../store/editorStore'

interface BackupItem { name: string; path: string; mtime: number; size: number }

function fmtTime(ms: number): string {
  const d = new Date(ms)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export function BackupBrowser() {
  const { tabs, activeTabId, showBackupBrowser, setShowBackupBrowser, updateTabContent } = useEditorStore()
  const activeTab = tabs.find(t => t.id === activeTabId)
  const [backups, setBackups] = useState<BackupItem[]>([])
  const [preview, setPreview] = useState<{ name: string; content: string } | null>(null)

  useEffect(() => {
    if (!showBackupBrowser) return
    if (activeTab?.filePath && window.api) {
      window.api.listBackups(activeTab.filePath).then(setBackups).catch(() => setBackups([]))
    } else {
      setBackups([])
    }
  }, [showBackupBrowser, activeTab?.filePath])

  if (!showBackupBrowser) return null

  const openPreview = async (b: BackupItem) => {
    if (!window.api) return
    try { const c = await window.api.readBackup(b.path); setPreview({ name: b.name, content: c }) } catch { /* noop */ }
  }

  const restore = () => {
    if (!preview || !activeTab) return
    updateTabContent(activeTab.id, preview.content)
    setShowBackupBrowser(false)
  }

  return (
    <div className="backup-overlay" onClick={() => setShowBackupBrowser(false)}>
      <div className="backup-modal" onClick={e => e.stopPropagation()}>
        <div className="backup-header">
          <span>⏱ 备份历史 {backups.length > 0 && <small>{backups.length} 份</small>}</span>
          <button className="backup-close" onClick={() => setShowBackupBrowser(false)}>×</button>
        </div>
        {!activeTab?.filePath && <div className="backup-empty">未保存的文档无备份</div>}
        <div className="backup-body">
          <div className="backup-list">
            {activeTab?.filePath && backups.length === 0 && <div className="backup-empty">暂无备份（保存后会自动生成）</div>}
            {backups.map(b => (
              <div key={b.path} className={`backup-row${preview?.name === b.name ? ' active' : ''}`} onClick={() => openPreview(b)}>
                <span className="backup-time">{fmtTime(b.mtime)}</span>
                <span className="backup-size">{(b.size / 1024).toFixed(1)} KB</span>
              </div>
            ))}
          </div>
          {preview && (
            <div className="backup-preview">
              <pre className="backup-pre">{preview.content.slice(0, 5000)}{preview.content.length > 5000 ? '\n…' : ''}</pre>
              <button className="backup-restore" onClick={restore}>恢复此版本</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
