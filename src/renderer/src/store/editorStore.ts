import { create } from 'zustand'

export interface Tab {
  id: string
  filePath: string | null
  title: string
  content: string
  originalContent: string
  isModified: boolean
  cursorLine: number
  cursorCol: number
  pinned: boolean
}

export interface FileTreeNode {
  name: string
  path: string
  isDirectory: boolean
  children?: FileTreeNode[]
}

export type Theme = 'light' | 'dark'

interface EditorState {
  tabs: Tab[]
  activeTabId: string | null
  fileTree: FileTreeNode[]
  folderPath: string | null
  sidebarVisible: boolean
  theme: Theme
  showFindReplace: boolean
  focusMode: boolean
  typewriterMode: boolean
  outlineVisible: boolean
  autoSave: boolean
  autoSaveDelay: number
  setAutoSaveDelay: (delay: number) => void
  scrollProgress: number
  showQuickOpen: boolean
  showCommandPalette: boolean
  showGoToLine: boolean
  showGlobalSearch: boolean
  headingNumbering: boolean
  tagPanelVisible: boolean
  wordWrap: boolean
  showLineNumbers: boolean
  showDocStats: boolean
  showShortcuts: boolean
  showPresentation: boolean
  showWritingStats: boolean
  showSnippetManager: boolean
  backlinksVisible: boolean
  wordFreqVisible: boolean
  showGraphView: boolean
  showDailyNotes: boolean
  bookmarksVisible: boolean
  selectionHighlight: boolean
  closedTabsHistory: { filePath: string | null; title: string; content: string }[]
  recentFiles: { filePath: string; title: string; lastOpened: number }[]
  zenMode: boolean
  fontSize: number
  wordGoal: number
  fontFamily: string
  tabSize: number
  typewriterSound: boolean
  bookmarks: Record<string, { line: number; label: string }[]> // tabId -> bookmarks
  favoriteFiles: string[]
  lastSession: { tabPaths: string[]; activeTabPath: string | null; folderPath: string | null; cursorPositions?: Record<string, { line: number; col: number }> } | null
  toggleFavorite: (filePath: string) => void
  isFavorite: (filePath: string) => boolean

  createTab: (filePath?: string, content?: string) => string
  closeTab: (id: string) => void
  setActiveTab: (id: string) => void
  updateTabContent: (id: string, content: string) => void
  updateTabCursor: (id: string, line: number, col: number) => void
  markTabSaved: (id: string) => void
  renameTab: (id: string, title: string) => void
  updateTabFilePath: (id: string, filePath: string) => void
  setFileTree: (tree: FileTreeNode[], folderPath: string) => void
  toggleSidebar: () => void
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  toggleFindReplace: () => void
  setShowFindReplace: (show: boolean) => void
  toggleFocusMode: () => void
  toggleTypewriterMode: () => void
  toggleOutline: () => void
  toggleAutoSave: () => void
  setScrollProgress: (progress: number) => void
  setShowQuickOpen: (show: boolean) => void
  setShowCommandPalette: (show: boolean) => void
  setShowGoToLine: (show: boolean) => void
  setShowGlobalSearch: (show: boolean) => void
  toggleHeadingNumbering: () => void
  toggleTagPanel: () => void
  toggleWordWrap: () => void
  toggleLineNumbers: () => void
  setShowDocStats: (show: boolean) => void
  setShowShortcuts: (show: boolean) => void
  setShowPresentation: (show: boolean) => void
  setShowWritingStats: (show: boolean) => void
  setShowSnippetManager: (show: boolean) => void
  setShowBacklinks: (show: boolean) => void
  setShowWordFreq: (show: boolean) => void
  setShowGraphView: (show: boolean) => void
  setShowDailyNotes: (show: boolean) => void
  setShowBookmarks: (show: boolean) => void
  toggleSelectionHighlight: () => void
  reopenClosedTab: () => void
  toggleZenMode: () => void
  setFontSize: (size: number) => void
  resetFontSize: () => void
  setWordGoal: (goal: number) => void
  setFontFamily: (family: string) => void
  setTabSize: (size: number) => void
  toggleTypewriterSound: () => void
  toggleTabPin: (id: string) => void
  addBookmark: (tabId: string, line: number, label: string) => void
  removeBookmark: (tabId: string, line: number) => void
  getBookmarks: (tabId: string) => { line: number; label: string }[]
  saveSession: () => void
  restoreSession: () => void
  getActiveTab: () => Tab | undefined
}

let tabCounter = 0

function loadPersistedTheme(): Theme {
  try {
    const stored = localStorage.getItem('markflow-theme')
    if (stored === 'dark' || stored === 'light') return stored
  } catch { /* localStorage unavailable */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function persistTheme(theme: Theme) {
  try { localStorage.setItem('markflow-theme', theme) } catch { /* noop */ }
}

function loadPersistedFontSize(): number {
  try {
    const stored = localStorage.getItem('markflow-font-size')
    if (stored) return Math.max(10, Math.min(32, parseInt(stored, 10)))
  } catch { /* noop */ }
  return 15.5
}

function persistFontSize(size: number) {
  try { localStorage.setItem('markflow-font-size', String(size)) } catch { /* noop */ }
}

function loadPersistedFontFamily(): string {
  try {
    const stored = localStorage.getItem('markflow-font-family')
    if (stored) return stored
  } catch { /* noop */ }
  return ''
}

function persistFontFamily(family: string) {
  try { localStorage.setItem('markflow-font-family', family) } catch { /* noop */ }
}

interface RecentFile { filePath: string; title: string; lastOpened: number }

function loadRecentFiles(): RecentFile[] {
  try {
    const raw = localStorage.getItem('markflow-recent-files')
    if (raw) return JSON.parse(raw)
  } catch { /* noop */ }
  return []
}

function persistRecentFiles(files: RecentFile[]) {
  try { localStorage.setItem('markflow-recent-files', JSON.stringify(files.slice(0, 15))) } catch { /* noop */ }
}

export const useEditorStore = create<EditorState>((set, get) => ({
  tabs: [],
  activeTabId: null,
  fileTree: [],
  folderPath: null,
  sidebarVisible: true,
  theme: loadPersistedTheme(),
  showFindReplace: false,
  focusMode: false,
  typewriterMode: false,
  outlineVisible: false,
  autoSave: true,
  autoSaveDelay: 2000,
  scrollProgress: 0,
  showQuickOpen: false,
  showCommandPalette: false,
  showGoToLine: false,
  showGlobalSearch: false,
  headingNumbering: false,
  tagPanelVisible: false,
  wordWrap: true,
  showLineNumbers: true,
  showDocStats: false,
  showShortcuts: false,
  showPresentation: false,
  showWritingStats: false,
  showSnippetManager: false,
  backlinksVisible: false,
  wordFreqVisible: false,
  showGraphView: false,
  showDailyNotes: false,
  bookmarksVisible: false,
  selectionHighlight: true,
  closedTabsHistory: [],
  recentFiles: loadRecentFiles(),
  zenMode: false,
  fontSize: loadPersistedFontSize(),
  fontFamily: loadPersistedFontFamily(),
  tabSize: 2,
  typewriterSound: false,
  wordGoal: 0,
  bookmarks: {},
  favoriteFiles: JSON.parse(localStorage.getItem('markflow-favorites') || '[]'),
  lastSession: null,

  createTab: (filePath?: string, content?: string) => {
    const id = `tab-${++tabCounter}`
    const title = filePath ? filePath.split(/[/\\]/).pop()! : '未命名'
    const tab: Tab = { id, filePath: filePath || null, title, content: content || '', originalContent: content || '', isModified: false, cursorLine: 1, cursorCol: 1, pinned: false }
    // 追踪最近文件
    if (filePath) {
      set(state => {
        const recent = state.recentFiles.filter(f => f.filePath !== filePath)
        recent.unshift({ filePath, title, lastOpened: Date.now() })
        const updated = recent.slice(0, 15)
        persistRecentFiles(updated)
        return { tabs: [...state.tabs, tab], activeTabId: id, recentFiles: updated }
      })
    } else {
      set(state => ({ tabs: [...state.tabs, tab], activeTabId: id }))
    }
    return id
  },

  closeTab: (id: string) => {
    set(state => {
      const tab = state.tabs.find(t => t.id === id)
      if (tab?.pinned) return state // 不能关闭固定标签
      const newTabs = state.tabs.filter(t => t.id !== id)
      let newActiveId = state.activeTabId
      if (state.activeTabId === id) {
        const idx = state.tabs.findIndex(t => t.id === id)
        newActiveId = newTabs.length > 0 ? newTabs[Math.min(idx, newTabs.length - 1)]?.id || null : null
      }
      // 保存到关闭历史（最多 20 条）
      const history = tab ? [{ filePath: tab.filePath, title: tab.title, content: tab.content }, ...state.closedTabsHistory].slice(0, 20) : state.closedTabsHistory
      return { tabs: newTabs, activeTabId: newActiveId, closedTabsHistory: history }
    })
  },

  setActiveTab: (id: string) => set({ activeTabId: id }),

  updateTabContent: (id: string, content: string) => {
    set(state => ({
      tabs: state.tabs.map(t => t.id === id ? { ...t, content, isModified: content !== t.originalContent } : t)
    }))
  },

  updateTabCursor: (id: string, line: number, col: number) => {
    set(state => ({
      tabs: state.tabs.map(t => t.id === id ? { ...t, cursorLine: line, cursorCol: col } : t)
    }))
  },

  markTabSaved: (id: string) => {
    set(state => ({
      tabs: state.tabs.map(t => t.id === id ? { ...t, originalContent: t.content, isModified: false } : t)
    }))
  },

  renameTab: (id: string, title: string) => {
    set(state => ({ tabs: state.tabs.map(t => t.id === id ? { ...t, title } : t) }))
  },

  updateTabFilePath: (id: string, filePath: string) => {
    set(state => ({
      tabs: state.tabs.map(t => t.id === id ? { ...t, filePath, title: filePath.split(/[/\\]/).pop() || t.title } : t)
    }))
  },

  toggleTabPin: (id: string) => {
    set(state => ({ tabs: state.tabs.map(t => t.id === id ? { ...t, pinned: !t.pinned } : t) }))
  },

  setFileTree: (tree: FileTreeNode[], folderPath: string) => set({ fileTree: tree, folderPath }),
  toggleSidebar: () => set(state => ({ sidebarVisible: !state.sidebarVisible })),
  setTheme: (theme: Theme) => { persistTheme(theme); set({ theme }) },
  toggleTheme: () => set(state => {
    const theme = state.theme === 'light' ? 'dark' : 'light'
    persistTheme(theme)
    return { theme }
  }),
  toggleFindReplace: () => set(state => ({ showFindReplace: !state.showFindReplace })),
  setShowFindReplace: (show: boolean) => set({ showFindReplace: show }),
  toggleFocusMode: () => set(state => ({ focusMode: !state.focusMode })),
  toggleTypewriterMode: () => set(state => ({ typewriterMode: !state.typewriterMode })),
  toggleOutline: () => set(state => ({ outlineVisible: !state.outlineVisible })),
  toggleAutoSave: () => set(state => ({ autoSave: !state.autoSave })),
  setAutoSaveDelay: (delay: number) => set({ autoSaveDelay: delay }),
  setScrollProgress: (progress: number) => set({ scrollProgress: progress }),
  setShowQuickOpen: (show: boolean) => set({ showQuickOpen: show }),
  setShowCommandPalette: (show: boolean) => set({ showCommandPalette: show }),
  setShowGoToLine: (show: boolean) => set({ showGoToLine: show }),
  setShowGlobalSearch: (show: boolean) => set({ showGlobalSearch: show }),
  toggleHeadingNumbering: () => set(state => ({ headingNumbering: !state.headingNumbering })),
  toggleTagPanel: () => set(state => ({ tagPanelVisible: !state.tagPanelVisible })),
  toggleWordWrap: () => set(state => ({ wordWrap: !state.wordWrap })),
  toggleLineNumbers: () => set(state => ({ showLineNumbers: !state.showLineNumbers })),
  setShowDocStats: (show: boolean) => set({ showDocStats: show }),
  setShowShortcuts: (show: boolean) => set({ showShortcuts: show }),
  setShowPresentation: (show: boolean) => set({ showPresentation: show }),
  setShowWritingStats: (show: boolean) => set({ showWritingStats: show }),
  setShowSnippetManager: (show: boolean) => set({ showSnippetManager: show }),
  setShowBacklinks: (show: boolean) => set({ backlinksVisible: show }),
  setShowWordFreq: (show: boolean) => set({ wordFreqVisible: show }),
  setShowGraphView: (show: boolean) => set({ showGraphView: show }),
  setShowDailyNotes: (show: boolean) => set({ showDailyNotes: show }),
  setShowBookmarks: (show: boolean) => set({ bookmarksVisible: show }),
  toggleSelectionHighlight: () => set(state => ({ selectionHighlight: !state.selectionHighlight })),
  reopenClosedTab: () => {
    set(state => {
      if (state.closedTabsHistory.length === 0) return state
      const [last, ...rest] = state.closedTabsHistory
      const id = `tab-${++tabCounter}`
      const tab: Tab = { id, filePath: last.filePath, title: last.title, content: last.content, originalContent: last.content, isModified: false, cursorLine: 1, cursorCol: 1, pinned: false }
      return { tabs: [...state.tabs, tab], activeTabId: id, closedTabsHistory: rest }
    })
  },
  toggleZenMode: () => set(state => ({ zenMode: !state.zenMode })),
  setFontSize: (size: number) => { persistFontSize(size); set({ fontSize: size }) },
  resetFontSize: () => { const defaultSize = 15.5; persistFontSize(defaultSize); set({ fontSize: defaultSize }) },
  setWordGoal: (goal: number) => set({ wordGoal: Math.max(0, goal) }),
  setFontFamily: (family: string) => { persistFontFamily(family); set({ fontFamily: family }) },
  setTabSize: (size: number) => set({ tabSize: size }),
  toggleTypewriterSound: () => set(state => ({ typewriterSound: !state.typewriterSound })),
  addBookmark: (tabId: string, line: number, label: string) => set(state => {
    const list = [...(state.bookmarks[tabId] || [])]
    if (!list.some(b => b.line === line)) list.push({ line, label })
    return { bookmarks: { ...state.bookmarks, [tabId]: list } }
  }),
  removeBookmark: (tabId: string, line: number) => set(state => ({
    bookmarks: { ...state.bookmarks, [tabId]: (state.bookmarks[tabId] || []).filter(b => b.line !== line) }
  })),
  getBookmarks: (tabId: string) => get().bookmarks[tabId] || [],
  toggleFavorite: (filePath: string) => set(state => {
    const favs = state.favoriteFiles.includes(filePath)
      ? state.favoriteFiles.filter(f => f !== filePath)
      : [...state.favoriteFiles, filePath]
    try { localStorage.setItem('markflow-favorites', JSON.stringify(favs)) } catch { /* noop */ }
    return { favoriteFiles: favs }
  }),
  isFavorite: (filePath: string) => get().favoriteFiles.includes(filePath),

  saveSession: () => {
    const state = get()
    const session = {
      tabPaths: state.tabs.map(t => t.filePath || `__untitled__:${t.title}`),
      activeTabPath: state.tabs.find(t => t.id === state.activeTabId)?.filePath || null,
      folderPath: state.folderPath,
      cursorPositions: state.tabs.reduce<Record<string, { line: number; col: number }>>((acc, t) => {
        if (t.filePath) acc[t.filePath] = { line: t.cursorLine, col: t.cursorCol }
        return acc
      }, {})
    }
    try { localStorage.setItem('markflow-session', JSON.stringify(session)) } catch { /* noop */ }
  },

  restoreSession: () => {
    try {
      const raw = localStorage.getItem('markflow-session')
      if (!raw) return
      const session = JSON.parse(raw) as { tabPaths: string[]; activeTabPath: string | null; folderPath: string | null; cursorPositions?: Record<string, { line: number; col: number }> }
      if (session.folderPath && window.api) {
        window.api.readdir(session.folderPath).then(tree => {
          set({ fileTree: tree, folderPath: session.folderPath })
        }).catch(() => {})
      }
      // Files will be reopened via App.tsx which reads the session
      set({ lastSession: session })
    } catch { /* noop */ }
  },

  getActiveTab: () => {
    const state = get()
    return state.tabs.find(t => t.id === state.activeTabId)
  }
}))
