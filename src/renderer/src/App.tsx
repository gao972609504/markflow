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
  const templates: { name: string; icon: string; content: string }[] = [
    {
      name: '空白文档', icon: '📄',
      content: ''
    },
    {
      name: '博客文章', icon: '📝',
      content: `---\ntitle: \ndate: ${new Date().toLocaleDateString('zh-CN')}\ntags: []\n---\n\n# 标题\n\n## 引言\n\n## 正文\n\n## 总结\n`
    },
    {
      name: '会议记录', icon: '📋',
      content: `# 会议记录\n\n**日期：** ${new Date().toLocaleDateString('zh-CN')}\n**参会人：** \n**议题：** \n\n---\n\n## 讨论内容\n\n- \n\n## 决议\n\n- [ ] \n\n## 后续跟进\n\n| 任务 | 负责人 | 截止日期 |\n| --- | --- | --- |\n|  |  |  |\n`
    },
    {
      name: '每日笔记', icon: '📓',
      content: `# ${new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}\n\n## 今日计划\n\n- [ ] \n- [ ] \n- [ ] \n\n## 笔记\n\n\n\n## 灵感\n\n\n\n## 明日计划\n\n- \n`
    },
    {
      name: '技术文档', icon: '🔧',
      content: `# 技术文档\n\n## 概述\n\n\n\n## 技术架构\n\n\n\n## API 接口\n\n### 接口名称\n\n**请求方式：** `GET`\n**路径：** `/api/endpoint`\n\n#### 参数\n\n| 参数 | 类型 | 必填 | 说明 |\n| --- | --- | --- | --- |\n|  |  |  |  |\n\n#### 返回值\n\n\`\`\`json\n{}\n\`\`\`\n\n## 注意事项\n\n> \n`
    },
    {
      name: '读书笔记', icon: '📚',
      content: `# 《书名》读书笔记\n\n**作者：** \n**出版日期：** \n**阅读日期：** ${new Date().toLocaleDateString('zh-CN')}\n\n---\n\n## 一句话总结\n\n\n\n## 核心观点\n\n1. \n2. \n3. \n\n## 精彩摘录\n\n> \n\n## 个人感悟\n\n\n\n## 推荐指数\n\n⭐⭐⭐⭐⭐\n`
    },
  ]
  const { theme, sidebarVisible, showFindReplace, activeTabId, tabs, scrollProgress, zenMode, recentFiles } = useEditorStore()
  const activeTab = tabs.find((t) => t.id === activeTabId)
  const [isDragging, setIsDragging] = useState(false)
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const dragCounterRef = useRef(0)
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
    // 延迟加载上次会话的文件
    const check = setInterval(() => {
      const s = useEditorStore.getState()
      if (s.lastSession && s.lastSession.tabPaths.length > 0) {
        const session = s.lastSession
        // 用完后清空，避免重复加载
        useEditorStore.setState({ lastSession: null })
        clearInterval(check)
        if (!window.api) return
        ;(async () => {
          for (const pathOrUntitled of session.tabPaths) {
            if (pathOrUntitled.startsWith('__untitled__:')) {
              s.createTab()
            } else {
              try {
                const content = await window.api.readFile(pathOrUntitled)
                s.createTab(pathOrUntitled, content)
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
      } else {
        clearInterval(check)
      }
    }, 200)
    return () => clearInterval(check)
  }, [])

  // ── 自动保存（防抖） ──
  useEffect(() => {
    if (!activeTab?.isModified || !activeTab?.filePath) return
    const { autoSave, autoSaveDelay } = useEditorStore.getState()
    if (!autoSave) return
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    autoSaveTimerRef.current = setTimeout(() => {
      if (!window.api) return
      setAutoSaveStatus('saving')
      window.api.writeFile(activeTab.filePath!, activeTab.content).then((success) => {
        if (success) {
          useEditorStore.getState().markTabSaved(activeTab.id)
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
              store.renameTab(tab.id, newPath.split(/[/\\]/).pop()!)
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

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {

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
      // Ctrl+Shift+S 文档统计
      if (e.ctrlKey && e.shiftKey && e.key === 'S') {
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
        {!zenMode && <OutlinePanel />}
        {!zenMode && <TagPanel />}
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
                <h1>MarkFlow</h1>
                <p>轻量美观的 Markdown 编辑器</p>
                <div className="welcome-actions">
                  <button onClick={() => useEditorStore.getState().createTab()}>
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
                    打开文件夹
                  </button>
                </div>
                <div className="welcome-templates">
                  <p>从模板创建</p>
                  <div className="template-grid">
                    {templates.map((tpl, idx) => (
                      <button key={idx} className="template-card" onClick={() => useEditorStore.getState().createTab(undefined, tpl.content)}>
                        <span className="template-icon">{tpl.icon}</span>
                        <span className="template-name">{tpl.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
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
                          <span className="recent-file-icon">📝</span>
                          <span className="recent-file-name">{file.title}</span>
                          <span className="recent-file-path">{file.filePath.split(/[/\\]/).slice(-2, -1).join('/') || ''}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="welcome-shortcuts">
                  <p>快捷操作</p>
                  <div><kbd>Ctrl+N</kbd> 新建文件</div>
                  <div><kbd>Ctrl+O</kbd> 打开文件</div>
                  <div><kbd>Ctrl+S</kbd> 保存</div>
                  <div><kbd>Ctrl+B</kbd> 加粗</div>
                  <div><kbd>Ctrl+I</kbd> 斜体</div>
                  <div className="welcome-hint">💡 拖拽 .md 文件到窗口即可打开</div>
                </div>
              </div>
            </div>
          )}
          {activeTab && !zenMode && <StatusBar tab={activeTab} autoSaveStatus={autoSaveStatus} />}
        </div>
      </div>
      <QuickOpen />
      <CommandPalette />
      <DocStats />
      <ShortcutReference />
    </div>
  )
}
