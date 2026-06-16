/**
 * 快速打开面板 (Ctrl+P)
 * — 模态搜索框，模糊匹配工作区文件，键盘导航
 */
import React, { useState, useMemo, useRef, useEffect } from 'react'
import { useEditorStore, FileTreeNode } from '../store/editorStore'

interface FlatFile {
  name: string
  path: string
  dir: string
}

function flattenTree(nodes: FileTreeNode[], basePath = ''): FlatFile[] {
  const result: FlatFile[] = []
  for (const node of nodes) {
    if (node.isDirectory) {
      result.push(...flattenTree(node.children || [], node.name))
    } else {
      result.push({ name: node.name, path: node.path, dir: basePath })
    }
  }
  return result
}

function fuzzyMatch(query: string, text: string): { match: boolean; score: number } {
  const q = query.toLowerCase()
  const t = text.toLowerCase()
  if (!q) return { match: true, score: 0 }
  // 完全包含
  if (t.includes(q)) return { match: true, score: 100 - (t.indexOf(q)) }
  // 模糊匹配：连续字符
  let qi = 0, score = 0, lastMatchIdx = -1
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      score += (lastMatchIdx === ti - 1) ? 10 : 1 // 连续匹配加权
      lastMatchIdx = ti
      qi++
    }
  }
  return { match: qi === q.length, score }
}

export function QuickOpen() {
  const { fileTree, showQuickOpen, setShowQuickOpen, setShowCommandPalette, recentFiles } = useEditorStore()
  const [query, setQuery] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const allFiles = useMemo(() => flattenTree(fileTree), [fileTree])

  const results = useMemo(() => {
    if (!query.trim()) {
      // 无搜索词：最近文件 + 工作区文件
      const recentItems: FlatFile[] = recentFiles.slice(0, 10).map(f => ({
        name: f.title,
        path: f.filePath,
        dir: f.filePath.split(/[/\\]/).slice(-2, -1).join('/') || ''
      }))
      const workspaceItems = allFiles.filter(f => !recentItems.some(r => r.path === f.path)).slice(0, 40)
      return [...recentItems, ...workspaceItems]
    }
    const scored = allFiles
      .map(f => ({ ...f, ...fuzzyMatch(query, f.name) }))
      .filter(f => f.match)
      .sort((a, b) => b.score - a.score)
    return scored.slice(0, 30)
  }, [allFiles, query, recentFiles])

  useEffect(() => { inputRef.current?.focus() }, [])
  useEffect(() => { setSelectedIdx(0) }, [query])

  const openFile = async (file: FlatFile) => {
    const store = useEditorStore.getState()
    const existing = store.tabs.find(t => t.filePath === file.path)
    if (existing) {
      store.setActiveTab(existing.id)
    } else if (window.api) {
      const content = await window.api.readFile(file.path)
      store.createTab(file.path, content)
    }
    setShowQuickOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results[selectedIdx]) {
      openFile(results[selectedIdx])
    } else if (e.key === 'Escape') {
      setShowQuickOpen(false)
    }
  }

  if (!showQuickOpen) return null

  return (
    <div className="quick-open-overlay" onClick={() => setShowQuickOpen(false)}>
      <div className="quick-open-modal" onClick={e => e.stopPropagation()}>
        <div className="quick-open-input-wrap">
          <span className="quick-open-icon">🔍</span>
          <input
            ref={inputRef}
            type="text"
            placeholder="搜索文件... (Ctrl+P)"
            value={query}
            onChange={e => {
              const val = e.target.value
              if (val.startsWith('/')) {
                setShowQuickOpen(false)
                setShowCommandPalette(true)
                return
              }
              setQuery(val)
            }}
            onKeyDown={handleKeyDown}
            className="quick-open-input"
          />
        </div>
        <div className="quick-open-results">
          {results.length === 0 ? (
            <div className="quick-open-empty">未找到匹配文件</div>
          ) : (
            results.map((file, idx) => (
              <React.Fragment key={file.path}>
                {!query && idx === 0 && recentFiles.length > 0 && (
                  <div className="cmd-category">最近打开</div>
                )}
                {!query && idx === Math.min(recentFiles.length, 10) && allFiles.length > 0 && (
                  <div className="cmd-category">工作区文件</div>
                )}
                <div
                  className={`quick-open-item ${idx === selectedIdx ? 'selected' : ''}`}
                  onClick={() => openFile(file)}
                  onMouseEnter={() => setSelectedIdx(idx)}
                >
                  <span className="quick-open-file-icon">{idx < recentFiles.length && !query ? '🕐' : '📄'}</span>
                  <span className="quick-open-file-name">{file.name}</span>
                  {file.dir && <span className="quick-open-file-dir">{file.dir}</span>}
                </div>
              </React.Fragment>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
