/**
 * 命令面板 (Ctrl+Shift+P)
 * — 可搜索的命令列表，类似 VS Code 命令面板
 */
import React, { useState, useMemo, useRef, useEffect } from 'react'
import { useEditorStore } from '../store/editorStore'

interface Command {
  id: string
  label: string
  category: string
  shortcut?: string
  action: () => void
}

function getCommands(): Command[] {
  const store = useEditorStore.getState()
  return [
    { id: 'file.new', label: '新建文件', category: '文件', shortcut: 'Ctrl+N', action: () => store.createTab() },
    { id: 'file.save', label: '保存文件', category: '文件', shortcut: 'Ctrl+S', action: () => window.api && handleSave() },
    { id: 'file.open-folder', label: '打开文件夹', category: '文件', shortcut: 'Ctrl+Shift+O', action: () => handleOpenFolder() },
    { id: 'file.export-html', label: '导出为 HTML', category: '文件', action: () => window.api?.exportHTML('') },
    { id: 'view.toggle-sidebar', label: '切换侧边栏', category: '视图', shortcut: 'Ctrl+B', action: () => store.toggleSidebar() },
    { id: 'view.toggle-outline', label: '切换大纲面板', category: '视图', shortcut: 'Ctrl+Shift+O', action: () => store.toggleOutline() },
    { id: 'view.toggle-theme', label: '切换深色/浅色主题', category: '视图', action: () => store.toggleTheme() },
    { id: 'view.toggle-focus', label: '切换 Focus 模式', category: '视图', action: () => store.toggleFocusMode() },
    { id: 'view.toggle-typewriter', label: '切换打字机模式', category: '视图', action: () => store.toggleTypewriterMode() },
    { id: 'view.toggle-autosave', label: `切换自动保存 (${store.autoSave ? '开' : '关'})`, category: '视图', action: () => store.toggleAutoSave() },
    { id: 'edit.find-replace', label: '查找替换', category: '编辑', shortcut: 'Ctrl+H', action: () => store.toggleFindReplace() },
    { id: 'quick.open', label: '快速打开文件', category: '导航', shortcut: 'Ctrl+P', action: () => store.setShowQuickOpen(true) },
    { id: 'editor.bold', label: '加粗选区', category: '格式', shortcut: 'Ctrl+B', action: () => {} },
    { id: 'editor.italic', label: '斜体选区', category: '格式', shortcut: 'Ctrl+I', action: () => {} },
    { id: 'editor.code', label: '行内代码选区', category: '格式', shortcut: 'Ctrl+`', action: () => {} },
    { id: 'editor.strikethrough', label: '删除线选区', category: '格式', shortcut: 'Ctrl+Shift+X', action: () => {} },
    { id: 'editor.format-table', label: '格式化表格', category: '格式', shortcut: 'Ctrl+Shift+F', action: () => {
      const cmContent = document.querySelector('.cm-content')
      if (cmContent) cmContent.dispatchEvent(new KeyboardEvent('keydown', { key: 'F', ctrlKey: true, shiftKey: true, bubbles: true }))
    }},
    { id: 'view.writing-stats', label: '写作统计', category: '视图', shortcut: 'Ctrl+Shift+W', action: () => { const s = useEditorStore.getState(); s.setShowWritingStats(!s.showWritingStats) } },
    { id: 'view.snippet-manager', label: '代码片段管理', category: '视图', action: () => { const s = useEditorStore.getState(); s.setShowSnippetManager(!s.showSnippetManager) } },
    { id: 'view.backlinks', label: '反向链接面板', category: '视图', shortcut: 'Ctrl+Shift+B', action: () => { const s = useEditorStore.getState(); s.setShowBacklinks(!s.backlinksVisible) } },
  ]
}

async function handleSave() {
  const store = useEditorStore.getState()
  const tab = store.getActiveTab()
  if (tab?.filePath && window.api) {
    const success = await window.api.writeFile(tab.filePath, tab.content)
    if (success) store.markTabSaved(tab.id)
  }
}

async function handleOpenFolder() {
  if (!window.api) return
  const path = await window.api.openFolder()
  if (path) {
    const tree = await window.api.readdir(path)
    useEditorStore.getState().setFileTree(tree, path)
  }
}

export function CommandPalette() {
  const { showCommandPalette, setShowCommandPalette } = useEditorStore()
  const [query, setQuery] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const commands = useMemo(() => getCommands(), [showCommandPalette])

  const results = useMemo(() => {
    if (!query.trim()) return commands
    const q = query.toLowerCase()
    return commands.filter(c =>
      c.label.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q)
    )
  }, [commands, query])

  useEffect(() => { inputRef.current?.focus() }, [])
  useEffect(() => { setSelectedIdx(0) }, [query])

  const executeCommand = (cmd: Command) => {
    cmd.action()
    setShowCommandPalette(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results[selectedIdx]) {
      executeCommand(results[selectedIdx])
    } else if (e.key === 'Escape') {
      setShowCommandPalette(false)
    }
  }

  if (!showCommandPalette) return null

  return (
    <div className="quick-open-overlay" onClick={() => setShowCommandPalette(false)}>
      <div className="quick-open-modal" onClick={e => e.stopPropagation()}>
        <div className="quick-open-input-wrap">
          <span className="quick-open-icon">⌘</span>
          <input
            ref={inputRef}
            type="text"
            placeholder="输入命令..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="quick-open-input"
          />
        </div>
        <div className="quick-open-results">
          {results.map((cmd, idx) => (
            <div
              key={cmd.id}
              className={`quick-open-item ${idx === selectedIdx ? 'selected' : ''}`}
              onClick={() => executeCommand(cmd)}
              onMouseEnter={() => setSelectedIdx(idx)}
            >
              <span className="cmd-category">{cmd.category}</span>
              <span className="cmd-label">{cmd.label}</span>
              {cmd.shortcut && <span className="cmd-shortcut">{cmd.shortcut}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
