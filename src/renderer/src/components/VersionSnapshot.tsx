/**
 * 文档版本快照面板
 *
 * 保存 / 预览 / 恢复文档历史版本。
 * 数据存储在 localStorage，按文件路径隔离。
 */
import React, { useState, useEffect, useMemo } from 'react'
import { useEditorStore } from '../store/editorStore'

interface Snapshot {
  id: string
  label: string
  content: string
  timestamp: number
  wordCount: number
}

const STORAGE_KEY = 'markflow-snapshots'

function loadSnapshots(filePath: string): Snapshot[] {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    return all[filePath] || []
  } catch { return [] }
}

function saveSnapshots(filePath: string, snapshots: Snapshot[]) {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    all[filePath] = snapshots.slice(0, 50) // 最多 50 个快照
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch { /* storage full, ignore */ }
}

export function VersionSnapshot() {
  const { tabs, activeTabId, showVersionSnapshot, setShowVersionSnapshot } = useEditorStore()
  const activeTab = tabs.find(t => t.id === activeTabId)
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [previewIdx, setPreviewIdx] = useState<number | null>(null)
  const [diffMode, setDiffMode] = useState(false)

  useEffect(() => {
    if (activeTab?.filePath) {
      setSnapshots(loadSnapshots(activeTab.filePath))
    }
  }, [activeTab?.filePath, showVersionSnapshot])

  const currentContent = activeTab?.content || ''
  const previewContent = previewIdx !== null ? snapshots[previewIdx]?.content || '' : ''

  // 简单的行级 diff
  const diffLines = useMemo(() => {
    if (!diffMode || previewIdx === null) return null
    const currentLines = currentContent.split('\n')
    const snapLines = previewContent.split('\n')
    const maxLen = Math.max(currentLines.length, snapLines.length)
    const result: { type: 'same' | 'added' | 'removed'; line: string }[] = []
    for (let i = 0; i < maxLen; i++) {
      const cur = currentLines[i]
      const snap = snapLines[i]
      if (cur === snap) {
        result.push({ type: 'same', line: cur || '' })
      } else {
        if (snap !== undefined) result.push({ type: 'removed', line: snap })
        if (cur !== undefined) result.push({ type: 'added', line: cur })
      }
    }
    return result
  }, [diffMode, previewIdx, currentContent, previewContent])

  if (!showVersionSnapshot || !activeTab) return null

  const createSnapshot = () => {
    if (!activeTab.filePath) return
    const label = prompt('快照备注（可选）:', '') || ''
    const snap: Snapshot = {
      id: Date.now().toString(36),
      label,
      content: currentContent,
      timestamp: Date.now(),
      wordCount: currentContent.trim() ? currentContent.trim().split(/\s+/).length : 0,
    }
    const updated = [snap, ...snapshots]
    setSnapshots(updated)
    saveSnapshots(activeTab.filePath, updated)
  }

  const deleteSnapshot = (idx: number) => {
    if (!activeTab.filePath) return
    const updated = snapshots.filter((_, i) => i !== idx)
    setSnapshots(updated)
    saveSnapshots(activeTab.filePath, updated)
    if (previewIdx === idx) setPreviewIdx(null)
    else if (previewIdx !== null && previewIdx > idx) setPreviewIdx(previewIdx - 1)
  }

  const restoreSnapshot = (idx: number) => {
    const snap = snapshots[idx]
    if (!snap) return
    const confirmed = confirm('确定恢复此版本？当前未保存的内容将被替换。')
    if (!confirmed) return
    useEditorStore.getState().updateTabContent(activeTab.id, snap.content)
    setShowVersionSnapshot(false)
  }

  const formatTime = (ts: number) => {
    const d = new Date(ts)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  }

  const formatRelative = (ts: number) => {
    const diff = Date.now() - ts
    if (diff < 60000) return '刚刚'
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
    return `${Math.floor(diff / 86400000)} 天前`
  }

  return (
    <div className="snapshot-overlay" onClick={() => setShowVersionSnapshot(false)}>
      <div className="snapshot-modal" onClick={e => e.stopPropagation()}>
        {/* ── 头部 ── */}
        <div className="snapshot-header">
          <h3>📦 文档快照</h3>
          <div className="snapshot-header-actions">
            <button className="snapshot-btn snapshot-btn-primary" onClick={createSnapshot}>
              ＋ 保存快照
            </button>
            <button className="snapshot-close" onClick={() => setShowVersionSnapshot(false)}>×</button>
          </div>
        </div>

        <div className="snapshot-body">
          {/* ── 左侧：快照列表 ── */}
          <div className="snapshot-list">
            {snapshots.length === 0 ? (
              <div className="snapshot-empty">
                <div className="snapshot-empty-icon">📸</div>
                <p>暂无快照</p>
                <p className="snapshot-empty-hint">点击"保存快照"保存当前文档版本</p>
              </div>
            ) : (
              snapshots.map((snap, idx) => (
                <div
                  key={snap.id}
                  className={`snapshot-item ${previewIdx === idx ? 'snapshot-item-active' : ''}`}
                  onClick={() => { setPreviewIdx(idx); setDiffMode(false) }}
                >
                  <div className="snapshot-item-time">
                    <span className="snapshot-item-relative">{formatRelative(snap.timestamp)}</span>
                    <span className="snapshot-item-absolute">{formatTime(snap.timestamp)}</span>
                  </div>
                  {snap.label && <div className="snapshot-item-label">{snap.label}</div>}
                  <div className="snapshot-item-meta">{snap.wordCount} 词 · {snap.content.split('\n').length} 行</div>
                  <div className="snapshot-item-actions">
                    <button
                      className="snapshot-item-btn"
                      onClick={(e) => { e.stopPropagation(); restoreSnapshot(idx) }}
                      title="恢复此版本"
                    >↩ 恢复</button>
                    <button
                      className="snapshot-item-btn"
                      onClick={(e) => { e.stopPropagation(); setPreviewIdx(idx); setDiffMode(true) }}
                      title="查看差异"
                    >🔀 对比</button>
                    <button
                      className="snapshot-item-btn snapshot-item-btn-danger"
                      onClick={(e) => { e.stopPropagation(); deleteSnapshot(idx) }}
                      title="删除快照"
                    >🗑</button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* ── 右侧：预览 / 对比 ── */}
          <div className="snapshot-preview">
            {previewIdx !== null ? (
              diffMode && diffLines ? (
                <div className="snapshot-diff">
                  <div className="snapshot-diff-header">
                    🔀 与当前版本对比
                    <span className="snapshot-diff-stats">
                      {diffLines.filter(l => l.type === 'added').length} 增 /
                      {diffLines.filter(l => l.type === 'removed').length} 删
                    </span>
                  </div>
                  <pre className="snapshot-diff-content">
                    {diffLines.map((line, i) => (
                      <div key={i} className={`snapshot-diff-line snapshot-diff-${line.type}`}>
                        <span className="snapshot-diff-prefix">{line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}</span>
                        {line.line}
                      </div>
                    ))}
                  </pre>
                </div>
              ) : (
                <div className="snapshot-preview-content">
                  <div className="snapshot-preview-label">
                    📄 {snapshots[previewIdx]?.label || '快照预览'}
                    <span className="snapshot-preview-time">{formatTime(snapshots[previewIdx]?.timestamp || 0)}</span>
                  </div>
                  <pre>{previewContent}</pre>
                </div>
              )
            ) : (
              <div className="snapshot-preview-empty">
                <div>👈 选择一个快照进行预览</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
