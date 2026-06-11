import React, { useState, useCallback } from 'react'
import { useEditorStore } from '../store/editorStore'

export function GlobalSearch() {
  const { showGlobalSearch, setShowGlobalSearch, folderPath } = useEditorStore()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ filePath: string; line: number; text: string }[]>([])
  const [searching, setSearching] = useState(false)

  const doSearch = useCallback(async () => {
    if (!query.trim() || !folderPath || !window.api) return
    setSearching(true)
    // Search through open tabs
    const store = useEditorStore.getState()
    const allResults: { filePath: string; line: number; text: string }[] = []
    const q = query.toLowerCase()
    for (const tab of store.tabs) {
      if (!tab.filePath) continue
      const lines = tab.content.split('\n')
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase().includes(q)) {
          allResults.push({ filePath: tab.filePath!, line: i + 1, text: lines[i].trim().slice(0, 80) })
        }
      }
    }
    setResults(allResults)
    setSearching(false)
  }, [query, folderPath])

  if (!showGlobalSearch) return null

  const openResult = async (filePath: string, line: number) => {
    const store = useEditorStore.getState()
    const existing = store.tabs.find(t => t.filePath === filePath)
    if (existing) {
      store.setActiveTab(existing.id)
      store.updateTabCursor(existing.id, line, 1)
    } else if (window.api) {
      const content = await window.api.readFile(filePath)
      const id = store.createTab(filePath, content)
      store.updateTabCursor(id, line, 1)
    }
    setShowGlobalSearch(false)
  }

  return (
    <div className="modal-overlay" onClick={() => setShowGlobalSearch(false)}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <h3>🔍 全局搜索</h3>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') doSearch(); if (e.key === 'Escape') setShowGlobalSearch(false) }}
            placeholder="搜索所有已打开的文件..."
            className="file-tree-search-input"
            style={{ flex: 1 }}
            autoFocus
          />
          <button className="status-btn" onClick={doSearch}>搜索</button>
        </div>
        {searching && <p>搜索中...</p>}
        {results.length > 0 && (
          <div style={{ maxHeight: '300px', overflow: 'auto' }}>
            {results.map((r, i) => (
              <div key={`${r.filePath}:${r.line}`} className="recent-file-item" style={{ padding: '6px 8px', cursor: 'pointer' }}
                onClick={() => openResult(r.filePath, r.line)}>
                <span style={{ color: 'var(--text-muted, #666)', fontSize: '12px' }}>
                  {r.filePath.split(/[/\\]/).pop()}:L{r.line}
                </span>
                <div style={{ fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.text}
                </div>
              </div>
            ))}
          </div>
        )}
        {!searching && query && results.length === 0 && <p style={{ color: '#888' }}>未找到匹配结果</p>}
      </div>
    </div>
  )
}
