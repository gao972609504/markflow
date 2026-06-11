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
  scrollProgress: number
  showQuickOpen: boolean
  showCommandPalette: boolean
  showGoToLine: boolean
  headingNumbering: boolean
  tagPanelVisible: boolean
  wordWrap: boolean
  showLineNumbers: boolean
  fontSize: number

  createTab: (filePath?: string, content?: string) => string
  closeTab: (id: string) => void
  setActiveTab: (id: string) => void
  updateTabContent: (id: string, content: string) => void
  updateTabCursor: (id: string, line: number, col: number) => void
  markTabSaved: (id: string) => void
  renameTab: (id: string, title: string) => void
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
  toggleHeadingNumbering: () => void
  toggleTagPanel: () => void
  toggleWordWrap: () => void
  toggleLineNumbers: () => void
  setFontSize: (size: number) => void
  resetFontSize: () => void
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
  headingNumbering: false,
  tagPanelVisible: false,
  wordWrap: true,
  showLineNumbers: true,
  fontSize: loadPersistedFontSize(),
  lastSession: null as { tabPaths: string[]; activeTabPath: string | null; folderPath: string | null } | null,

  createTab: (filePath?: string, content?: string) => {
    const id = `tab-${++tabCounter}`
    const title = filePath ? filePath.split(/[/\\]/).pop()! : '未命名'
    const tab: Tab = { id, filePath: filePath || null, title, content: content || '', originalContent: content || '', isModified: false, cursorLine: 1, cursorCol: 1 }
    set(state => ({ tabs: [...state.tabs, tab], activeTabId: id }))
    return id
  },

  closeTab: (id: string) => {
    set(state => {
      const newTabs = state.tabs.filter(t => t.id !== id)
      let newActiveId = state.activeTabId
      if (state.activeTabId === id) {
        const idx = state.tabs.findIndex(t => t.id === id)
        newActiveId = newTabs.length > 0 ? newTabs[Math.min(idx, newTabs.length - 1)]?.id || null : null
      }
      return { tabs: newTabs, activeTabId: newActiveId }
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
  setScrollProgress: (progress: number) => set({ scrollProgress: progress }),
  setShowQuickOpen: (show: boolean) => set({ showQuickOpen: show }),
  setShowCommandPalette: (show: boolean) => set({ showCommandPalette: show }),
  setShowGoToLine: (show: boolean) => set({ showGoToLine: show }),
  toggleHeadingNumbering: () => set(state => ({ headingNumbering: !state.headingNumbering })),
  toggleTagPanel: () => set(state => ({ tagPanelVisible: !state.tagPanelVisible })),
  toggleWordWrap: () => set(state => ({ wordWrap: !state.wordWrap })),
  toggleLineNumbers: () => set(state => ({ showLineNumbers: !state.showLineNumbers })),
  setFontSize: (size: number) => { persistFontSize(size); set({ fontSize: size }) },
  resetFontSize: () => { const defaultSize = 15.5; persistFontSize(defaultSize); set({ fontSize: defaultSize }) },

  saveSession: () => {
    const state = get()
    const session = {
      tabPaths: state.tabs.map(t => t.filePath || `__untitled__:${t.title}`),
      activeTabPath: state.tabs.find(t => t.id === state.activeTabId)?.filePath || null,
      folderPath: state.folderPath
    }
    try { localStorage.setItem('markflow-session', JSON.stringify(session)) } catch { /* noop */ }
  },

  restoreSession: () => {
    try {
      const raw = localStorage.getItem('markflow-session')
      if (!raw) return
      const session = JSON.parse(raw) as { tabPaths: string[]; activeTabPath: string | null; folderPath: string | null }
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
