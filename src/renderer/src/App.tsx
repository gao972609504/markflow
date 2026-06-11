import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useEditorStore, FileTreeNode } from './store/editorStore'
import { FileTree } from './components/FileTree'
import { TabBar } from './components/TabBar'
import { Editor } from './components/Editor'
import { StatusBar } from './components/StatusBar'
import { FindReplace } from './components/FindReplace'
import { OutlinePanel } from './components/OutlinePanel'
import { QuickOpen } from './components/QuickOpen'
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
  const { theme, sidebarVisible, showFindReplace, activeTabId, tabs, scrollProgress } = useEditorStore()
  const activeTab = tabs.find((t) => t.id === activeTabId)
  const [isDragging, setIsDragging] = useState(false)
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const dragCounterRef = useRef(0)
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
        {sidebarVisible && <FileTree />}
        <OutlinePanel />
        <div className="editor-panel">
          {activeTab && <div className="reading-progress-bar" style={{ width: `${scrollProgress}%` }} />}
          <TabBar />
          {showFindReplace && <FindReplace />}
          {activeTab ? (
            <Editor tab={activeTab} />
          ) : (
            <div className="welcome-screen">
              <div className="welcome-content">
                <h1>MarkFlow</h1>
                <p>轻量美观的 Markdown 编辑器</p>
                <div className="welcome-actions">
                  <button onClick={() => useEditorStore.getState().createTab()}>
                    新建文件
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
          {activeTab && <StatusBar tab={activeTab} autoSaveStatus={autoSaveStatus} />}
        </div>
      </div>
      <QuickOpen />
    </div>
  )
}
