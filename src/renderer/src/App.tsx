import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useEditorStore, FileTreeNode } from './store/editorStore'
import { FileTree } from './components/FileTree'
import { TabBar } from './components/TabBar'
import { Editor } from './components/Editor'
import { StatusBar } from './components/StatusBar'
import { FindReplace } from './components/FindReplace'
import { OutlinePanel } from './components/OutlinePanel'
import { QuickOpen } from './components/QuickOpen'
import { CommandPalette } from './components/CommandPalette'
import { GoToLine } from './components/GoToLine'
import { InsertToolbar } from './components/InsertToolbar'
import { TagPanel } from './components/TagPanel'
import { DocStats } from './components/DocStats'
import { ShortcutReference } from './components/ShortcutReference'
import { GlobalSearch } from './components/GlobalSearch'
import { PresentationView } from './components/PresentationView'
import { WritingStats } from './components/WritingStats'
import { SnippetManager } from './components/SnippetManager'
import { BacklinksPanel } from './components/BacklinksPanel'
import { WordFrequency } from './components/WordFrequency'
import { GraphView } from './components/GraphView'
import { DailyNotes } from './components/DailyNotes'
import { BookmarksPanel } from './components/BookmarksPanel'
import { Readability } from './components/Readability'
import { WritingPrompts } from './components/WritingPrompts'
import { Pomodoro } from './components/Pomodoro'
import { TextToSpeech } from './components/TextToSpeech'
import { TaskPanel } from './components/TaskPanel'
import { CustomCSSDialog, loadCustomCSS, applyCustomCSS } from './components/CustomCSS'
import { AssetPanel } from './components/AssetPanel'
import { renderMarkdown } from './utils/markdown'

declare global {
  interface Window {
    api: {
      readFile: (filePath: string) => Promise<string>
      writeFile: (filePath: string, content: string) => Promise<boolean>
      saveFileAs: (content: string) => Promise<string | null>
      exportHTML: (html: string) => Promise<string | null>
      exportPDF: () => Promise<string | null>
      openFolder: () => Promise<string | null>
      readdir: (dirPath: string) => Promise<FileTreeNode[]>
      getDefaultPath: () => Promise<string>
      createFile: (filePath: string) => Promise<boolean>
      createFolder: (dirPath: string) => Promise<boolean>
      renamePath: (oldPath: string, newPath: string) => Promise<boolean>
      deleteFile: (filePath: string) => Promise<boolean>
      deleteFolder: (dirPath: string) => Promise<boolean>
      savePastedImage: (base64Data: string, filePath: string | null) => Promise<string>
      getFileModifiedTime: (filePath: string) => Promise<number | null>
      onMenuNewFile: (callback: () => void) => () => void
      onMenuSave: (callback: () => void) => () => void
      onMenuSaveAs: (callback: () => void) => () => void
      onMenuExport: (callback: (format: string) => void) => () => void
      onMenuToggleMode: (callback: () => void) => () => void
      onMenuToggleSidebar: (callback: () => void) => () => void
      onMenuToggleTheme: (callback: () => void) => () => void
      onMenuToggleOutline: (callback: () => void) => () => void
      onMenuFindReplace: (callback: () => void) => () => void
      onFileOpened: (callback: (data: { filePath: string; content: string }) => void) => () => void
      onFolderOpened: (callback: (data: { folderPath: string; tree: FileTreeNode[] }) => void) => () => void
    }
  }
}

export default function App() {

  // ── 文件模板 ──
  const templates: { name: string; desc: string; content: string; icon: React.ReactNode }[] = [
    {
      name: '空白文档',
      desc: '从一张白纸开始',
      icon: (
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M3.5 2h6L12 4.5V13a1 1 0 01-1 1H3.5a1 1 0 01-1-1V3a1 1 0 011-1z" />
          <path d="M9.5 2v2.5H12" />
        </svg>
      ),
      content: '',
    },
    {
      name: '博客文章',
      desc: '结构化叙事与发布',
      icon: (
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M3 2h7l3 3v9H3V2z" />
          <path d="M5.5 7.5h5M5.5 10h5M5.5 12.5h3" />
        </svg>
      ),
      content: `---\ntitle: \ndate: ${new Date().toLocaleDateString('zh-CN')}\ntags: []\n---\n\n# 标题\n\n## 引言\n\n## 正文\n\n## 总结\n`,
    },
    {
      name: '会议记录',
      desc: '议题 · 决议 · 行动项',
      icon: (
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <rect x="2.5" y="2.5" width="11" height="11" rx="1" />
          <path d="M5 6h6M5 8.5h6M5 11h4" />
          <circle cx="11" cy="11" r="1.5" />
          <path d="M10.5 11.5l1 1 1.5-1.5" />
        </svg>
      ),
      content: `# 会议记录\n\n**日期：** ${new Date().toLocaleDateString('zh-CN')}\n**参会人：** \n**议题：** \n\n---\n\n## 讨论内容\n\n- \n\n## 决议\n\n- [ ] \n\n## 后续跟进\n\n| 任务 | 负责人 | 截止日期 |\n| --- | --- | --- |\n|  |  |  |\n`,
    },
    {
      name: '每日笔记',
      desc: '今日 · 灵感 · 明日',
      icon: (
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M3 2h7l3 3v9H3V2z" />
          <path d="M5 7.5l1.5 1.5L10 5M5 11h6" />
        </svg>
      ),
      content: `# ${new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}\n\n## 今日计划\n\n- [ ] \n- [ ] \n- [ ] \n\n## 笔记\n\n\n\n## 灵感\n\n\n\n## 明日计划\n\n- \n`,
    },
    {
      name: '技术文档',
      desc: 'API · 架构 · 注意事项',
      icon: (
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M5.5 2L3 4.5l2.5 2.5M10.5 2L13 4.5l-2.5 2.5" />
          <path d="M8 5l-1.5 8" />
        </svg>
      ),
      content: `# 技术文档\n\n## 概述\n\n\n\n## 技术架构\n\n\n\n## API 接口\n\n### 接口名称\n\n**请求方式：** \`GET\`\n**路径：** \`/api/endpoint\`\n\n#### 参数\n\n| 参数 | 类型 | 必填 | 说明 |\n| --- | --- | --- | --- |\n|  |  |  |  |\n\n#### 返回值\n\n\`\`\`json\n{}\n\`\`\`\n\n## 注意事项\n\n> \n`,
    },
    {
      name: '读书笔记',
      desc: '摘录 · 感悟 · 推荐',
      icon: (
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M3 2.5h5a2 2 0 012 2V14a1 1 0 01-1 1H4a1 1 0 01-1-1V2.5z" />
          <path d="M13 2.5H8a2 2 0 00-2 2V14a1 1 0 011-1h6V2.5z" />
        </svg>
      ),
      content: `# 《书名》读书笔记\n\n**作者：** \n**出版日期：** \n**阅读日期：** ${new Date().toLocaleDateString('zh-CN')}\n\n---\n\n## 一句话总结\n\n\n\n## 核心观点\n\n1. \n2. \n3. \n\n## 精彩摘录\n\n> \n\n## 个人感悟\n\n\n\n## 推荐指数\n\n⭐⭐⭐⭐⭐\n`,
    },
  ]
  const { theme, accentPreset, sidebarVisible, showFindReplace, activeTabId, tabs, scrollProgress, zenMode, recentFiles, favoriteFiles } = useEditorStore()
  const activeTab = tabs.find((t) => t.id === activeTabId)
  const [isDragging, setIsDragging] = useState(false)
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const dragCounterRef = useRef(0)
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── 启动时应用自定义 CSS ──
  useEffect(() => { applyCustomCSS(loadCustomCSS()) }, [])

  // ── 更新窗口标题 ──
  useEffect(() => {
    const activeTab = tabs.find((t) => t.id === activeTabId)
    if (activeTab) {
      const modified = activeTab.isModified ? '● ' : ''
      document.title = `${modified}${activeTab.title} - MarkFlow`
    } else {
      document.title = 'MarkFlow'
    }
  }, [activeTabId, tabs])

  // ── 会话持久化：保存 ──
  useEffect(() => {
    if (tabs.length > 0) {
      const timer = setTimeout(() => useEditorStore.getState().saveSession(), 1000)
      return () => clearTimeout(timer)
    }
  }, [tabs, activeTabId])

  // ── 会话持久化：恢复 ──
  useEffect(() => {
    const store = useEditorStore.getState()
    store.restoreSession()
    const session = store.lastSession
    if (!session || session.tabPaths.length === 0 || !window.api) return
    // 立即清空，避免重复加载
    useEditorStore.setState({ lastSession: null })
    ;(async () => {
      for (const pathOrUntitled of session.tabPaths) {
        if (pathOrUntitled.startsWith('__untitled__:')) {
          store.createTab()
        } else {
          try {
            const content = await window.api.readFile(pathOrUntitled)
            store.createTab(pathOrUntitled, content)
          } catch { /* file may no longer exist */ }
        }
      }
      // 恢复活动标签
      if (session.activeTabPath) {
        const tabs = useEditorStore.getState().tabs
        const match = tabs.find(t => t.filePath === session.activeTabPath)
        if (match) useEditorStore.getState().setActiveTab(match.id)
      }
      // 恢复光标位置
      if (session.cursorPositions) {
        const currentState = useEditorStore.getState()
        for (const tab of currentState.tabs) {
          if (tab.filePath && session.cursorPositions[tab.filePath]) {
            const pos = session.cursorPositions[tab.filePath]
            currentState.updateTabCursor(tab.id, pos.line, pos.col)
          }
        }
      }
    })()
  }, [])

  // ── 自动保存（防抖） ──
  useEffect(() => {
    if (!activeTab?.isModified || !activeTab?.filePath) return
    const { autoSave, autoSaveDelay } = useEditorStore.getState()
    if (!autoSave) return
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    const tabId = activeTab.id
    autoSaveTimerRef.current = setTimeout(() => {
      if (!window.api) return
      // 从 store 获取最新内容，避免闭包捕获过期引用
      const currentState = useEditorStore.getState()
      const currentTab = currentState.tabs.find(t => t.id === tabId)
      if (!currentTab || !currentTab.filePath || !currentTab.isModified) return
      setAutoSaveStatus('saving')
      window.api.writeFile(currentTab.filePath, currentTab.content).then((success) => {
        if (success) {
          useEditorStore.getState().markTabSaved(tabId)
          setAutoSaveStatus('saved')
          setTimeout(() => setAutoSaveStatus('idle'), 2000)
        }
      }).catch(() => setAutoSaveStatus('idle'))
    }, autoSaveDelay)
    return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current) }
  }, [activeTab?.content, activeTab?.isModified, activeTab?.filePath])

  // ── 拖拽打开文件 ──
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current++
    if (e.dataTransfer.types.includes('Files')) setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current--
    if (dragCounterRef.current <= 0) { setIsDragging(false); dragCounterRef.current = 0 }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    dragCounterRef.current = 0

    const files = Array.from(e.dataTransfer.files)
    const store = useEditorStore.getState()

    for (const file of files) {
      if (!/\.(md|markdown|mdown|mkd|txt)$/i.test(file.name)) continue

      const existing = store.tabs.find(t => t.title === file.name)
      if (existing) {
        store.setActiveTab(existing.id)
      } else {
        const content = await file.text()
        store.createTab(file.name, content)
      }
    }
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.setAttribute('data-accent', accentPreset)
  }, [accentPreset])

  // 监听菜单事件（仅在 Electron 环境中）
  useEffect(() => {
    if (!window.api) return
    const cleanups = [
      window.api.onMenuNewFile(() => {
        useEditorStore.getState().createTab()
      }),
      window.api.onMenuSave(() => {
        const store = useEditorStore.getState()
        const tab = store.getActiveTab()
        if (tab?.filePath) {
          window.api.writeFile(tab.filePath, tab.content).then((success) => {
            if (success) store.markTabSaved(tab.id)
          }).catch((err) => {
            console.error('保存文件失败:', err)
          })
        }
      }),
      window.api.onMenuSaveAs(() => {
        const store = useEditorStore.getState()
        const tab = store.getActiveTab()
        if (tab) {
          window.api.saveFileAs(tab.content).then((newPath) => {
            if (newPath) {
              store.markTabSaved(tab.id)
              store.updateTabFilePath(tab.id, newPath)
            }
          }).catch((err) => {
            console.error('另存为失败:', err)
          })
        }
      }),
      window.api.onMenuExport((format) => {
        const store = useEditorStore.getState()
        const tab = store.getActiveTab()
        if (!tab) return
        if (format === 'html') {
          // 使用 markdown-it 将内容转为 HTML 导出
          const html = renderMarkdown(tab.content)
          window.api.exportHTML(html)
        } else if (format === 'pdf') {
          window.api.exportPDF()
        }
      }),
      window.api.onMenuToggleMode(() => {
        // 已改为 Typora 风格统一实时渲染，此菜单项保留无操作
      }),
      window.api.onMenuToggleSidebar(() => {
        useEditorStore.getState().toggleSidebar()
      }),
      window.api.onMenuToggleTheme(() => {
        useEditorStore.getState().toggleTheme()
      }),
      window.api.onMenuToggleOutline(() => {
        useEditorStore.getState().toggleOutline()
      }),
      window.api.onMenuFindReplace(() => {
        useEditorStore.getState().toggleFindReplace()
      }),
      window.api.onFileOpened((data) => {
        const store = useEditorStore.getState()
        // 检查是否已打开
        const existing = store.tabs.find((t) => t.filePath === data.filePath)
        if (existing) {
          store.setActiveTab(existing.id)
        } else {
          store.createTab(data.filePath, data.content)
        }
      }),
      window.api.onFolderOpened((data) => {
        useEditorStore.getState().setFileTree(data.tree, data.folderPath)
      })
    ]
    return () => cleanups.forEach((fn) => fn())
  }, [])


  // 文件外部变更检测：窗口获得焦点时检查
  useEffect(() => {
    if (!window.api) return
    const checkFiles = async () => {
      const store = useEditorStore.getState()
      for (const tab of store.tabs) {
        if (!tab.filePath) continue
        try {
          const mtime = await window.api.getFileModifiedTime(tab.filePath)
          if (mtime === null) continue
          // 如果文件在外部被修改且当前内容未修改，自动重新加载
          const content = await window.api.readFile(tab.filePath)
          if (content !== tab.content && !tab.isModified) {
            store.updateTabContent(tab.id, content)
            useEditorStore.setState({
              tabs: store.tabs.map(t => t.id === tab.id ? { ...t, originalContent: content, isModified: false } : t)
            })
          }
        } catch { /* ignore */ }
      }
    }
    const onFocus = () => { checkFiles() }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === '/') {
        e.preventDefault()
      }
      // Ctrl+H 查找替换
      if (e.ctrlKey && e.key === 'h') {
        e.preventDefault()
        useEditorStore.getState().toggleFindReplace()
      }
      // Ctrl+N 新建文件（浏览器环境补充）
      if (e.ctrlKey && e.key === 'n' && !window.api) {
        e.preventDefault()
        useEditorStore.getState().createTab()
      }
      // Ctrl+Shift+O 切换大纲
      if (e.ctrlKey && e.shiftKey && e.key === 'O') {
        e.preventDefault()
        useEditorStore.getState().toggleOutline()
      }
      // Ctrl+P 快速打开
      if (e.ctrlKey && e.key === 'p' && !e.shiftKey) {
        e.preventDefault()
        useEditorStore.getState().setShowQuickOpen(true)
      }
      // Ctrl+Shift+P 命令面板
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault()
        useEditorStore.getState().setShowCommandPalette(true)
      }
      // Ctrl++ 字体放大
      if (e.ctrlKey && (e.key === '=' || e.key === '+')) {
        e.preventDefault()
        const s = useEditorStore.getState()
        s.setFontSize(Math.min(32, s.fontSize + 1))
      }
      // Ctrl+- 字体缩小
      if (e.ctrlKey && e.key === '-') {
        e.preventDefault()
        const s = useEditorStore.getState()
        s.setFontSize(Math.max(10, s.fontSize - 1))
      }
      // Ctrl+0 重置字体
      if (e.ctrlKey && e.key === '0') {
        e.preventDefault()
        useEditorStore.getState().resetFontSize()
      }
      // Ctrl+G 跳转到行
      if (e.ctrlKey && e.key === 'g') {
        e.preventDefault()
        useEditorStore.getState().setShowGoToLine(true)
      }
      // Ctrl+Shift+D 文档统计
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault()
        useEditorStore.getState().setShowDocStats(true)
      }
      // Ctrl+Shift+/ 快捷键参考
      if (e.ctrlKey && e.shiftKey && e.key === '/') {
        e.preventDefault()
        useEditorStore.getState().setShowShortcuts(true)
      }
      // Ctrl+Shift+T 重新打开已关闭标签
      if (e.ctrlKey && e.shiftKey && e.key === 'T') {
        e.preventDefault()
        useEditorStore.getState().reopenClosedTab()
      }
      // Ctrl+Shift+H 全局搜索
      if (e.ctrlKey && e.shiftKey && e.key === 'H') {
        e.preventDefault()
        useEditorStore.getState().setShowGlobalSearch(true)
      }
      // Ctrl+F5 演示模式
      if (e.ctrlKey && e.key === 'F5') {
        e.preventDefault()
        useEditorStore.getState().setShowPresentation(true)
      }
      // Ctrl+Shift+W 写作统计
      if (e.ctrlKey && e.shiftKey && e.key === 'W') {
        e.preventDefault()
        const s = useEditorStore.getState()
        s.setShowWritingStats(!s.showWritingStats)
      }
      // Ctrl+Shift+K 词频分析
      if (e.ctrlKey && e.shiftKey && e.key === 'K') {
        e.preventDefault()
        const s = useEditorStore.getState()
        s.setShowWordFreq(!s.wordFreqVisible)
      }
      // Ctrl+Shift+G 关系图谱
      if (e.ctrlKey && e.shiftKey && e.key === 'G') {
        e.preventDefault()
        const s = useEditorStore.getState()
        s.setShowGraphView(!s.showGraphView)
      }
      // Ctrl+Shift+D 每日笔记
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault()
        const s = useEditorStore.getState()
        s.setShowDailyNotes(!s.showDailyNotes)
      }
      // Ctrl+Shift+M 书签面板
      if (e.ctrlKey && e.shiftKey && e.key === 'M') {
        e.preventDefault()
        const s = useEditorStore.getState()
        s.setShowBookmarks(!s.bookmarksVisible)
      }
      // Ctrl+Shift+E 可读性分析
      if (e.ctrlKey && e.shiftKey && e.key === 'E') {
        e.preventDefault()
        const s = useEditorStore.getState()
        s.setShowReadability(!s.readabilityVisible)
      }
      // Ctrl+Shift+J 写作灵感
      if (e.ctrlKey && e.shiftKey && e.key === 'J') {
        e.preventDefault()
        const s = useEditorStore.getState()
        s.setShowPrompts(!s.showPrompts)
      }
      // F11 禅模式
      if (e.key === 'F11') {
        e.preventDefault()
        useEditorStore.getState().toggleZenMode()
      }
      // ESC 退出禅模式
      if (e.key === 'Escape' && useEditorStore.getState().zenMode) {
        useEditorStore.getState().toggleZenMode()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div
      className={`app-container ${theme}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="drop-overlay">
          <div className="drop-overlay-content">
            <div className="drop-icon">📄</div>
            <p>释放以打开 Markdown 文件</p>
          </div>
        </div>
      )}
      <div className="main-layout">
        {!zenMode && sidebarVisible && <FileTree />}
        <div className={`editor-panel${zenMode ? ' zen-mode' : ''}`}>
          {activeTab && !zenMode && <div className="reading-progress-bar" style={{ width: `${scrollProgress}%` }} />}
          {!zenMode && <TabBar />}
          {activeTab && activeTab.filePath && !zenMode && (
            <div className="breadcrumb-bar">
              {activeTab.filePath.split(/[/\\]/).map((segment, idx, arr) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <span className="breadcrumb-sep">/</span>}
                  <span className={`breadcrumb-item${idx === arr.length - 1 ? ' breadcrumb-active' : ''}`}>{segment}</span>
                </React.Fragment>
              ))}
            </div>
          )}
          {!zenMode && <div className="editor-toolbar-row">
            <InsertToolbar />
          </div>}
          {showFindReplace && <FindReplace />}
          <GoToLine />
          {activeTab ? (
            <Editor tab={activeTab} />
          ) : (
            <div className="welcome-screen">
              <div className="welcome-content">
                <div className="welcome-mark">
                  <span className="welcome-mark-dot" aria-hidden="true" />
                  MarkFlow
                </div>
                <h1>MarkFlow</h1>
                <p>轻量美观的 Markdown 编辑器 · 专为写作者打造</p>
                <div className="welcome-actions">
                  <button onClick={() => useEditorStore.getState().createTab()}>
                    <svg viewBox="0 0 16 16" aria-hidden="true">
                      <path d="M8 3v10M3 8h10" />
                    </svg>
                    空白文件
                  </button>
                  <button onClick={async () => {
                    if (!window.api) return
                    const folderPath = await window.api.openFolder()
                    if (folderPath) {
                      const tree = await window.api.readdir(folderPath)
                      useEditorStore.getState().setFileTree(tree, folderPath)
                    }
                  }}>
                    <svg viewBox="0 0 16 16" aria-hidden="true">
                      <path d="M2 4.5l3-2h4l1.5 1.5h3.5a1 1 0 011 1V12a1 1 0 01-1 1H2V4.5z" />
                    </svg>
                    打开文件夹
                  </button>
                </div>
                <div className="welcome-templates">
                  <p>从模板创建</p>
                  <div className="template-grid">
                    {templates.map((tpl, idx) => (
                      <button key={idx} className="template-card" onClick={() => useEditorStore.getState().createTab(undefined, tpl.content)}>
                        <span className="template-icon">{tpl.icon}</span>
                        <div className="template-body">
                          <div className="template-name">
                            <span>{tpl.name}</span>
                            <span className="template-arrow" aria-hidden="true">
                              <svg viewBox="0 0 16 16">
                                <path d="M5 3l5 5-5 5" />
                              </svg>
                            </span>
                          </div>
                          <div className="template-desc">{tpl.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                {favoriteFiles.length > 0 && (
                  <div className="welcome-recent">
                    <p>⭐ 收藏文件</p>
                    <div className="recent-files-list">
                      {favoriteFiles.map((fp) => {
                        const name = fp.split(/[/\\]/).pop() || fp
                        return (
                          <button
                            key={fp}
                            className="recent-file-item"
                            onClick={async () => {
                              if (!window.api) return
                              try {
                                const content = await window.api.readFile(fp)
                                useEditorStore.getState().createTab(fp, content)
                              } catch { /* file may no longer exist */ }
                            }}
                          >
                            <span className="recent-file-icon">
                              <svg viewBox="0 0 16 16" aria-hidden="true">
                                <path d="M8 1.5l1.9 4 4.4.6-3.2 3 .8 4.4L8 11.5 4.1 13.5l.8-4.4-3.2-3 4.4-.6L8 1.5z" />
                              </svg>
                            </span>
                            <span className="recent-file-name">{name}</span>
                            <span className="recent-file-path">{fp.split(/[/\\]/).slice(-2, -1).join('/') || ''}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
                {recentFiles.length > 0 && (
                  <div className="welcome-recent">
                    <p>最近打开</p>
                    <div className="recent-files-list">
                      {recentFiles.slice(0, 8).map((file) => (
                        <button
                          key={file.filePath}
                          className="recent-file-item"
                          onClick={async () => {
                            if (!window.api) return
                            try {
                              const content = await window.api.readFile(file.filePath)
                              useEditorStore.getState().createTab(file.filePath, content)
                            } catch { /* file may no longer exist */ }
                          }}
                        >
                          <span className="recent-file-icon">
                            <svg viewBox="0 0 16 16" aria-hidden="true">
                              <path d="M3.5 2h6L12 4.5V13a1 1 0 01-1 1H3.5a1 1 0 01-1-1V3a1 1 0 011-1z" />
                              <path d="M5.5 7h5M5.5 9.5h5M5.5 12h3" />
                            </svg>
                          </span>
                          <span className="recent-file-name">{file.title}</span>
                          <span className="recent-file-path">{file.filePath.split(/[/\\]/).slice(-2, -1).join('/') || ''}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="welcome-shortcuts">
                  <p>快捷操作</p>
                  <div className="shortcut-grid">
                    <div><span className="action">新建文件</span><kbd>Ctrl+N</kbd></div>
                    <div><span className="action">打开文件</span><kbd>Ctrl+O</kbd></div>
                    <div><span className="action">保存</span><kbd>Ctrl+S</kbd></div>
                    <div><span className="action">快速打开</span><kbd>Ctrl+P</kbd></div>
                    <div><span className="action">命令面板</span><kbd>Ctrl+Shift+P</kbd></div>
                    <div><span className="action">查找替换</span><kbd>Ctrl+H</kbd></div>
                    <div><span className="action">大纲面板</span><kbd>Ctrl+Shift+O</kbd></div>
                    <div><span className="action">禅模式</span><kbd>F11</kbd></div>
                  </div>
                  <div className="welcome-hint">💡 拖拽 .md 文件到窗口即可打开</div>
                </div>
              </div>
            </div>
          )}
          {activeTab && !zenMode && <StatusBar tab={activeTab} autoSaveStatus={autoSaveStatus} />}
        </div>
        {!zenMode && <OutlinePanel />}
        {!zenMode && <TagPanel />}
        {!zenMode && <TaskPanel />}
        {!zenMode && <AssetPanel />}
        {!zenMode && <BacklinksPanel />}
      </div>
      <QuickOpen />
      <CommandPalette />
      <DocStats />
      <ShortcutReference />
      <GlobalSearch />
      <PresentationView />
      <WritingStats />
      <SnippetManager />
      <WordFrequency />
      <GraphView />
      <DailyNotes />
      <BookmarksPanel />
      <Readability />
      <WritingPrompts />
      <Pomodoro />
      <CustomCSSDialog />
      <TextToSpeech />
    </div>
  )
}
