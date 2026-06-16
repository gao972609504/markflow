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
    { id: 'editor.sort-table', label: '表格按当前列升序排序', category: '格式', shortcut: 'Ctrl+Alt+S', action: () => {
      const cmContent = document.querySelector('.cm-content')
      if (cmContent) cmContent.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true, altKey: true, bubbles: true }))
    }},
    { id: 'editor.sort-table-desc', label: '表格按当前列降序排序', category: '格式', shortcut: 'Ctrl+Shift+Alt+S', action: () => {
      const cmContent = document.querySelector('.cm-content')
      if (cmContent) cmContent.dispatchEvent(new KeyboardEvent('keydown', { key: 'S', ctrlKey: true, altKey: true, shiftKey: true, bubbles: true }))
    }},
    { id: 'editor.transpose-table', label: '转置表格（行列互换）', category: '格式', shortcut: 'Ctrl+Alt+R', action: () => {
      const cmContent = document.querySelector('.cm-content')
      if (cmContent) cmContent.dispatchEvent(new KeyboardEvent('keydown', { key: 'r', ctrlKey: true, altKey: true, bubbles: true }))
    }},
    { id: 'insert.date', label: '插入当前日期 (YYYY-MM-DD)', category: '插入', shortcut: 'Alt+D', action: () => {
      const cm = document.querySelector('.cm-content'); if (cm) cm.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', altKey: true, bubbles: true }))
    }},
    { id: 'insert.datetime', label: '插入日期时间', category: '插入', shortcut: 'Alt+Shift+D', action: () => {
      const cm = document.querySelector('.cm-content'); if (cm) cm.dispatchEvent(new KeyboardEvent('keydown', { key: 'D', altKey: true, shiftKey: true, bubbles: true }))
    }},
    { id: 'insert.time', label: '插入当前时间 (HH:MM)', category: '插入', shortcut: 'Alt+T', action: () => {
      const cm = document.querySelector('.cm-content'); if (cm) cm.dispatchEvent(new KeyboardEvent('keydown', { key: 't', altKey: true, bubbles: true }))
    }},
    { id: 'insert.timestamp', label: '插入 ISO 时间戳', category: '插入', shortcut: 'Alt+Shift+T', action: () => {
      const cm = document.querySelector('.cm-content'); if (cm) cm.dispatchEvent(new KeyboardEvent('keydown', { key: 'T', altKey: true, shiftKey: true, bubbles: true }))
    }},
    { id: 'insert.weekday', label: '插入星期', category: '插入', shortcut: 'Alt+W', action: () => {
      const cm = document.querySelector('.cm-content'); if (cm) cm.dispatchEvent(new KeyboardEvent('keydown', { key: 'w', altKey: true, bubbles: true }))
    }},
    { id: 'view.writing-stats', label: '写作统计', category: '视图', shortcut: 'Ctrl+Shift+W', action: () => { const s = useEditorStore.getState(); s.setShowWritingStats(!s.showWritingStats) } },
    { id: 'view.snippet-manager', label: '代码片段管理', category: '视图', action: () => { const s = useEditorStore.getState(); s.setShowSnippetManager(!s.showSnippetManager) } },
    { id: 'view.backlinks', label: '反向链接面板', category: '视图', shortcut: 'Ctrl+Shift+B', action: () => { const s = useEditorStore.getState(); s.setShowBacklinks(!s.backlinksVisible) } },
    { id: 'view.word-freq', label: '词频分析面板', category: '视图', shortcut: 'Ctrl+Shift+K', action: () => { const s = useEditorStore.getState(); s.setShowWordFreq(!s.wordFreqVisible) } },
    { id: 'view.graph', label: '关系图谱', category: '视图', shortcut: 'Ctrl+Shift+G', action: () => { const s = useEditorStore.getState(); s.setShowGraphView(!s.showGraphView) } },
    { id: 'view.daily-notes', label: '每日笔记日历', category: '视图', shortcut: 'Ctrl+Shift+D', action: () => { const s = useEditorStore.getState(); s.setShowDailyNotes(!s.showDailyNotes) } },
    { id: 'view.bookmarks', label: '书签面板', category: '视图', shortcut: 'Ctrl+Shift+M', action: () => { const s = useEditorStore.getState(); s.setShowBookmarks(!s.bookmarksVisible) } },
    { id: 'view.readability', label: '可读性分析面板', category: '视图', shortcut: 'Ctrl+Shift+E', action: () => { const s = useEditorStore.getState(); s.setShowReadability(!s.readabilityVisible) } },
    { id: 'view.prompts', label: '写作灵感', category: '视图', shortcut: 'Ctrl+Shift+J', action: () => { const s = useEditorStore.getState(); s.setShowPrompts(!s.showPrompts) } },
    { id: 'view.pomodoro', label: '番茄钟', category: '视图', action: () => { const s = useEditorStore.getState(); s.setShowPomodoro(!s.showPomodoro) } },
    { id: 'edit.toggle-selection-highlight', label: `切换选中匹配高亮 (${store.selectionHighlight ? '开' : '关'})`, category: '编辑', action: () => store.toggleSelectionHighlight() },
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
