/**
 * 命令面板 (Ctrl+Shift+P)
 * — 可搜索的命令列表，类似 VS Code 命令面板
 */
import React, { useState, useMemo, useRef, useEffect } from 'react'
import { useEditorStore } from '../store/editorStore'
import { renderMarkdown } from '../utils/markdown'
import { stripMarkdown } from '../utils/stripMarkdown'
import { inlineToRefLinks } from './Editor'
import { fullWidthToHalf } from './Editor'
import { getEditorView } from '../plugins/widgets'

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
    { id: 'file.copy-html', label: '复制为富文本 HTML', category: '文件', action: () => copyAsHtml() },
    { id: 'file.copy-plain', label: '复制为纯文本（去除 Markdown）', category: '文件', action: () => copyAsPlainText() },
    { id: 'view.toggle-sidebar', label: '切换侧边栏', category: '视图', shortcut: 'Ctrl+B', action: () => store.toggleSidebar() },
    { id: 'view.toggle-outline', label: '切换大纲面板', category: '视图', shortcut: 'Ctrl+Shift+O', action: () => store.toggleOutline() },
    { id: 'view.toggle-theme', label: '切换深色/浅色主题', category: '视图', action: () => store.toggleTheme() },
    { id: 'view.toggle-focus', label: '切换 Focus 模式', category: '视图', action: () => store.toggleFocusMode() },
    { id: 'view.toggle-typewriter', label: '切换打字机模式', category: '视图', action: () => store.toggleTypewriterMode() },
    { id: 'view.toggle-autosave', label: `切换自动保存 (${store.autoSave ? '开' : '关'})`, category: '视图', action: () => store.toggleAutoSave() },
    { id: 'edit.find-replace', label: '查找替换', category: '编辑', shortcut: 'Ctrl+H', action: () => store.toggleFindReplace() },
    { id: 'quick.open', label: '快速打开文件', category: '导航', shortcut: 'Ctrl+P', action: () => store.setShowQuickOpen(true) },
    { id: 'tabs.close-others', label: '关闭其他标签', category: '标签', action: () => {
      const st = useEditorStore.getState()
      st.tabs.filter(t => t.id !== st.activeTabId && !t.pinned).forEach(t => st.closeTab(t.id))
    }},
    { id: 'tabs.close-right', label: '关闭右侧标签', category: '标签', action: () => {
      const st = useEditorStore.getState()
      const idx = st.tabs.findIndex(t => t.id === st.activeTabId)
      st.tabs.slice(idx + 1).filter(t => !t.pinned).forEach(t => st.closeTab(t.id))
    }},
    { id: 'tabs.close-saved', label: '关闭所有已保存标签', category: '标签', action: () => {
      const st = useEditorStore.getState()
      st.tabs.filter(t => !t.isModified && !t.pinned).forEach(t => st.closeTab(t.id))
    }},
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
    { id: 'editor.normalize', label: '整理文档格式（去行尾空格/统一空行）', category: '格式', shortcut: 'Ctrl+Shift+Alt+F', action: () => {
      const cm = document.querySelector('.cm-content')
      if (cm) cm.dispatchEvent(new KeyboardEvent('keydown', { key: 'F', ctrlKey: true, shiftKey: true, altKey: true, bubbles: true }))
    }},
    { id: 'editor.select-all-matches', label: '选中所有匹配项（多光标）', category: '编辑', shortcut: 'Ctrl+Shift+L', action: () => {
      const cm = document.querySelector('.cm-content')
      if (cm) cm.dispatchEvent(new KeyboardEvent('keydown', { key: 'L', ctrlKey: true, shiftKey: true, bubbles: true }))
    }},
    { id: 'editor.toggle-task', label: '切换任务复选框 [ ]/[x]', category: '编辑', shortcut: 'Alt+X', action: () => {
      const cm = document.querySelector('.cm-content')
      if (cm) cm.dispatchEvent(new KeyboardEvent('keydown', { key: 'x', altKey: true, bubbles: true }))
    }},
    { id: 'editor.toggle-blockquote', label: '切换块引用 (>)', category: '格式', shortcut: 'Ctrl+Shift+Q', action: () => {
      const cm = document.querySelector('.cm-content')
      if (cm) cm.dispatchEvent(new KeyboardEvent('keydown', { key: 'q', ctrlKey: true, shiftKey: true, bubbles: true }))
    }},
    { id: 'editor.pangu', label: '中英文之间加空格（盘古之白）', category: '格式', shortcut: 'Ctrl+Alt+P', action: () => {
      const cm = document.querySelector('.cm-content')
      if (cm) cm.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', ctrlKey: true, altKey: true, bubbles: true }))
    }},
    { id: 'editor.fwhalf', label: '全角标点转半角', category: '格式', action: () => {
      const el = document.querySelector('.cm-editor')
      const view = el ? getEditorView(el as HTMLElement) : null
      if (view) fullWidthToHalf(view)
    }},
    { id: 'editor.table-del-row', label: '删除表格当前行', category: '格式', shortcut: 'Ctrl+Alt+D', action: () => {
      const cm = document.querySelector('.cm-content')
      if (cm) cm.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', ctrlKey: true, altKey: true, bubbles: true }))
    }},
    { id: 'editor.table-ins-row', label: '表格下方插入空行', category: '格式', shortcut: 'Ctrl+Alt+N', action: () => {
      const cm = document.querySelector('.cm-content')
      if (cm) cm.dispatchEvent(new KeyboardEvent('keydown', { key: 'n', ctrlKey: true, altKey: true, bubbles: true }))
    }},
    { id: 'editor.table-del-col', label: '删除表格当前列', category: '格式', shortcut: 'Ctrl+Alt+C', action: () => {
      const cm = document.querySelector('.cm-content')
      if (cm) cm.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', ctrlKey: true, altKey: true, bubbles: true }))
    }},
    { id: 'editor.table-ins-col', label: '表格右侧插入空列', category: '格式', shortcut: 'Ctrl+Alt+V', action: () => {
      const cm = document.querySelector('.cm-content')
      if (cm) cm.dispatchEvent(new KeyboardEvent('keydown', { key: 'v', ctrlKey: true, altKey: true, bubbles: true }))
    }},
    { id: 'editor.delete-paragraph', label: '删除当前段落', category: '编辑', shortcut: 'Ctrl+Alt+K', action: () => {
      const cm = document.querySelector('.cm-content')
      if (cm) cm.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, altKey: true, bubbles: true }))
    }},
    { id: 'editor.inline-to-ref', label: '行内链接转引用式 ([text](url) → [text][n])', category: '格式', action: () => {
      const el = document.querySelector('.cm-editor')
      const view = el ? getEditorView(el as HTMLElement) : null
      if (view) inlineToRefLinks(view)
    }},
    { id: 'edit.linkify-clipboard', label: '用剪贴板链接包裹选区', category: '编辑', action: async () => {
      const el = document.querySelector('.cm-editor'); const view = el ? getEditorView(el as HTMLElement) : null
      if (!view) return
      const { from, to } = view.state.selection.main
      if (from === to) return
      const text = view.state.sliceDoc(from, to)
      let url = ''; try { url = (await navigator.clipboard.readText()).trim() } catch { /* noop */ }
      if (!url) return
      const ins = `[${text}](${url})`
      view.dispatch({ changes: { from, to, insert: ins }, selection: { anchor: from, head: from + ins.length } })
    }},
    { id: 'edit.web-search', label: '用浏览器搜索选中内容', category: '编辑', action: () => {
      const el = document.querySelector('.cm-editor'); const view = el ? getEditorView(el as HTMLElement) : null
      if (!view) return
      const { from, to } = view.state.selection.main
      const text = view.state.sliceDoc(from, to).trim()
      if (text) window.open('https://www.google.com/search?q=' + encodeURIComponent(text), '_blank')
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
    { id: 'view.tts', label: '朗读模式', category: '视图', action: () => { const s = useEditorStore.getState(); s.setShowTTS(!s.showTTS) } },
    { id: 'view.task-panel', label: '任务清单面板', category: '视图', action: () => { const s = useEditorStore.getState(); s.setShowTaskPanel(!s.showTaskPanel) } },
    { id: 'view.custom-css', label: '自定义 CSS', category: '设置', action: () => { const s = useEditorStore.getState(); s.setShowCustomCSS(!s.showCustomCSS) } },
    { id: 'view.asset-panel', label: '资源与引用管理', category: '视图', action: () => { const s = useEditorStore.getState(); s.setShowAssetPanel(!s.showAssetPanel) } },
    { id: 'view.heatmap', label: '写作热力图', category: '视图', action: () => { const s = useEditorStore.getState(); s.setShowHeatmap(!s.showHeatmap) } },
    { id: 'view.footnote', label: '脚注管理', category: '视图', action: () => { const s = useEditorStore.getState(); s.setShowFootnotePanel(!s.showFootnotePanel) } },
    { id: 'view.eye-care', label: `护眼模式 (${store.eyeCare ? '开' : '关'})`, category: '视图', action: () => store.toggleEyeCare() },
    { id: 'view.relative-numbers', label: `相对行号 (${store.relativeLineNumbers ? '开' : '关'})`, category: '视图', action: () => store.toggleRelativeLineNumbers() },
    { id: 'view.dashboard', label: '写作仪表盘', category: '视图', action: () => { const s = useEditorStore.getState(); s.setShowDashboard(!s.showDashboard) } },
    { id: 'view.goal-setter', label: '设置写作目标', category: '视图', action: () => { const s = useEditorStore.getState(); s.setShowGoalSetter(!s.showGoalSetter) } },
    { id: 'view.sentence-stats', label: '句子与段落结构分析', category: '视图', action: () => { const s = useEditorStore.getState(); s.setShowSentenceStats(!s.showSentenceStats) } },
    { id: 'view.front-matter', label: '编辑 Front Matter 元信息', category: '编辑', action: () => { const s = useEditorStore.getState(); s.setShowFrontMatter(!s.showFrontMatter) } },
    { id: 'view.word-badge', label: `浮动字数徽标 (${store.showWordBadge ? '开' : '关'})`, category: '视图', action: () => store.setShowWordBadge(!store.showWordBadge) },
    { id: 'view.duplicates', label: '重复段落检测', category: '分析', action: () => { const s = useEditorStore.getState(); s.setShowDuplicatePanel(!s.showDuplicatePanel) } },
    { id: 'view.backups', label: '备份历史与恢复', category: '文件', action: () => { const s = useEditorStore.getState(); s.setShowBackupBrowser(!s.showBackupBrowser) } },
    { id: 'view.settings', label: '设置', category: '设置', action: () => { const s = useEditorStore.getState(); s.setShowSettings(!s.showSettings) } },
    { id: 'view.clipboard', label: '剪贴板历史', category: '编辑', action: () => { const s = useEditorStore.getState(); s.setShowClipboardHistory(!s.showClipboardHistory) } },
    { id: 'view.doc-properties', label: '文档属性', category: '文件', action: () => { const s = useEditorStore.getState(); s.setShowDocProperties(!s.showDocProperties) } },
    { id: 'view.task-schedule', label: '任务日程（按截止日期）', category: '视图', action: () => { const s = useEditorStore.getState(); s.setShowTaskSchedule(!s.showTaskSchedule) } },
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

async function copyAsHtml() {
  const tab = useEditorStore.getState().getActiveTab()
  if (!tab?.content?.trim()) return
  const body = renderMarkdown(tab.content)
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${body}</body></html>`
  try {
    if (navigator.clipboard && (window as any).ClipboardItem) {
      const blob = new Blob([html], { type: 'text/html' })
      const textBlob = new Blob([tab.content], { type: 'text/plain' })
      await (navigator.clipboard as any).write([new (window as any).ClipboardItem({
        'text/html': blob,
        'text/plain': textBlob,
      })])
    } else {
      // 回退：仅复制纯文本 HTML
      await navigator.clipboard.writeText(html)
    }
  } catch (e) {
    console.error('复制 HTML 失败:', e)
  }
}

async function copyAsPlainText() {
  const tab = useEditorStore.getState().getActiveTab()
  if (!tab?.content?.trim()) return
  const plain = stripMarkdown(tab.content)
  try { await navigator.clipboard.writeText(plain) } catch (e) { console.error('复制纯文本失败:', e) }
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
