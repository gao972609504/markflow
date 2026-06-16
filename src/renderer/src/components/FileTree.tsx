import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useEditorStore, FileTreeNode } from '../store/editorStore'

interface ContextMenuState {
  x: number
  y: number
  node: FileTreeNode | null
  isOnBackground: boolean
}

export function FileTree() {
  const { fileTree, folderPath, sidebarVisible } = useEditorStore()
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [sortMode, setSortMode] = useState<'name' | 'type' | 'mtime'>('name')
  const [mdOnly, setMdOnly] = useState(false)
  const [ctxMenu, setCtxMenu] = useState<ContextMenuState | null>(null)
  const [renaming, setRenaming] = useState<{ path: string; name: string } | null>(null)
  const [creating, setCreating] = useState<{ parentPath: string; type: 'file' | 'folder'; name: string } | null>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)
  const createInputRef = useRef<HTMLInputElement>(null)

  if (!sidebarVisible) return null

  const toggleDir = (path: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  const openFile = async (node: FileTreeNode) => {
    if (node.isDirectory) {
      toggleDir(node.path)
      return
    }
    const store = useEditorStore.getState()
    const existing = store.tabs.find((t) => t.filePath === node.path)
    if (existing) {
      store.setActiveTab(existing.id)
    } else {
      if (!window.api) return
      const content = await window.api.readFile(node.path)
      store.createTab(node.path, content)
    }
  }

  const refreshTree = useCallback(async () => {
    const fp = useEditorStore.getState().folderPath
    if (!fp || !window.api) return
    try {
      const tree = await window.api.readdir(fp)
      useEditorStore.getState().setFileTree(tree, fp)
    } catch { /* ignore */ }
  }, [])

  const handleContextMenu = useCallback((e: React.MouseEvent, node: FileTreeNode | null) => {
    e.preventDefault()
    e.stopPropagation()
    setCtxMenu({ x: e.clientX, y: e.clientY, node, isOnBackground: !node })
  }, [])

  const closeCtxMenu = useCallback(() => setCtxMenu(null), [])

  // 点击其他区域关闭右键菜单
  useEffect(() => {
    if (!ctxMenu) return
    const handler = () => closeCtxMenu()
    window.addEventListener('click', handler)
    return () => window.removeEventListener('click', handler)
  }, [ctxMenu, closeCtxMenu])

  const handleNewFile = useCallback(async (parentPath: string, type: 'file' | 'folder') => {
    closeCtxMenu()
    setCreating({ parentPath, type, name: type === 'file' ? '未命名.md' : '新建文件夹' })
  }, [closeCtxMenu])

  const confirmCreate = useCallback(async () => {
    if (!creating || !window.api) return
    const { parentPath, type, name } = creating
    if (!name.trim()) { setCreating(null); return }
    const sep = parentPath.includes('\\') ? '\\' : '/'
    const fullPath = parentPath + sep + name
    try {
      if (type === 'file') await window.api.createFile(fullPath)
      else await window.api.createFolder(fullPath)
      await refreshTree()
      // 如果是文件，打开它
      if (type === 'file') {
        const content = await window.api.readFile(fullPath)
        useEditorStore.getState().createTab(fullPath, content)
      }
    } catch (err) { console.error('创建失败:', err) }
    setCreating(null)
  }, [creating, refreshTree])

  const startRename = useCallback((node: FileTreeNode) => {
    closeCtxMenu()
    setRenaming({ path: node.path, name: node.name })
  }, [closeCtxMenu])

  const confirmRename = useCallback(async () => {
    if (!renaming || !window.api) return
    const { path: oldPath, name } = renaming
    if (!name.trim()) { setRenaming(null); return }
    const dir = oldPath.substring(0, oldPath.lastIndexOf(oldPath.includes('\\') ? '\\' : '/'))
    const sep = oldPath.includes('\\') ? '\\' : '/'
    const newPath = dir + sep + name
    if (oldPath !== newPath) {
      try {
        await window.api.renamePath(oldPath, newPath)
        await refreshTree()
        // 更新已打开的标签
        const store = useEditorStore.getState()
        const tab = store.tabs.find(t => t.filePath === oldPath)
        if (tab) {
          useEditorStore.getState().renameTab(tab.id, name)
          // 更新 filePath
          useEditorStore.setState({ tabs: store.tabs.map(t => t.id === tab.id ? { ...t, filePath: newPath } : t) })
        }
      } catch (err) { console.error('重命名失败:', err) }
    }
    setRenaming(null)
  }, [renaming, refreshTree])

  const handleDelete = useCallback(async (node: FileTreeNode) => {
    closeCtxMenu()
    if (!window.api || !confirm(`确定要删除 "${node.name}" 吗？`)) return
    try {
      if (node.isDirectory) await window.api.deleteFolder(node.path)
      else await window.api.deleteFile(node.path)
      await refreshTree()
      // 如果删除的是已打开的文件，关闭对应标签
      if (!node.isDirectory) {
        const store = useEditorStore.getState()
        const tab = store.tabs.find(t => t.filePath === node.path)
        if (tab) store.closeTab(tab.id)
      }
    } catch (err) { console.error('删除失败:', err) }
  }, [closeCtxMenu, refreshTree])

  // 展开/折叠全部
  const expandAll = useCallback(() => {
    const allDirs = new Set<string>()
    const collect = (nodes: FileTreeNode[]) => {
      for (const n of nodes) {
        if (n.isDirectory) { allDirs.add(n.path); if (n.children) collect(n.children) }
      }
    }
    collect(fileTree)
    setExpandedDirs(allDirs)
  }, [fileTree])

  const collapseAll = useCallback(() => setExpandedDirs(new Set()), [])

  // 搜索过滤：返回匹配的节点（包含匹配的子节点或自身匹配的目录）
  const filterTree = (nodes: FileTreeNode[], query: string): FileTreeNode[] => {
    if (!query.trim()) return nodes
    const q = query.toLowerCase()
    return nodes.reduce<FileTreeNode[]>((acc, node) => {
      if (node.isDirectory) {
        const filteredChildren = filterTree(node.children || [], query)
        if (filteredChildren.length > 0 || node.name.toLowerCase().includes(q)) {
          acc.push({ ...node, children: filteredChildren.length > 0 ? filteredChildren : node.children })
        }
      } else {
        if (node.name.toLowerCase().includes(q)) {
          acc.push(node)
        }
      }
      return acc
    }, [])
  }

  const filteredTree = useMemo(() => {
    let tree = filterTree(fileTree, searchQuery)
    if (mdOnly) {
      const filterMd = (nodes: FileTreeNode[]): FileTreeNode[] =>
        nodes.reduce<FileTreeNode[]>((acc, n) => {
          if (n.isDirectory) {
            const c = filterMd(n.children || [])
            if (c.length > 0) acc.push({ ...n, children: c })
          } else if (/\.(md|markdown|txt)$/i.test(n.name)) {
            acc.push(n)
          }
          return acc
        }, [])
      tree = filterMd(tree)
    }
    return tree
  }, [fileTree, searchQuery, mdOnly])

  // 排序
  const sortedTree = useMemo(() => {
    const sortNodes = (nodes: FileTreeNode[]): FileTreeNode[] => {
      return nodes.map(n => n.isDirectory ? { ...n, children: sortNodes(n.children || []) } : n)
        .sort((a, b) => {
          // 目录始终在前
          if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
          if (sortMode === 'mtime') {
            return (b.mtime || 0) - (a.mtime || 0)
          }
          if (sortMode === 'type') {
            const extA = a.name.split('.').pop() || ''
            const extB = b.name.split('.').pop() || ''
            if (extA !== extB) return extA.localeCompare(extB)
          }
          return a.name.localeCompare(b.name, 'zh-CN')
        })
    }
    return sortNodes(filteredTree)
  }, [filteredTree, sortMode])

  // 搜索时自动展开所有匹配的目录
  const effectiveExpanded = useMemo(() => {
    if (!searchQuery.trim()) return expandedDirs
    const allDirs = new Set<string>()
    const collectDirs = (nodes: FileTreeNode[]) => {
      for (const node of nodes) {
        if (node.isDirectory) {
          allDirs.add(node.path)
          if (node.children) collectDirs(node.children)
        }
      }
    }
    collectDirs(filteredTree)
    return allDirs
  }, [searchQuery, filteredTree, expandedDirs])

  const renderNode = (node: FileTreeNode, depth: number = 0) => {
    const isExpanded = effectiveExpanded.has(node.path)
    const isMatch = searchQuery.trim() && node.name.toLowerCase().includes(searchQuery.toLowerCase())
    const isRenaming = renaming?.path === node.path

    return (
      <div key={node.path}>
        <div
          className={`file-tree-item ${node.isDirectory ? 'directory' : 'file'} ${isMatch ? 'file-tree-match' : ''}`}
          style={{ paddingLeft: `${12 + depth * 16}px` }}
          onClick={() => openFile(node)}
          onContextMenu={(e) => handleContextMenu(e, node)}
        >
          <span className="file-tree-icon">
            {node.isDirectory ? (isExpanded ? '📂' : '📁') : getFileIcon(node.name)}
          </span>
          {isRenaming ? (
            <input
              ref={renameInputRef}
              className="file-tree-rename-input"
              value={renaming.name}
              onChange={(e) => setRenaming({ ...renaming, name: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') confirmRename(); if (e.key === 'Escape') setRenaming(null) }}
              onBlur={confirmRename}
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          ) : (
            <span className="file-tree-name">{node.name}</span>
          )}
        </div>
        {node.isDirectory && isExpanded && (
          <>
            {creating && creating.parentPath === node.path && (
              <div className="file-tree-item" style={{ paddingLeft: `${12 + (depth + 1) * 16}px` }}>
                <span className="file-tree-icon">{creating.type === 'file' ? '📝' : '📁'}</span>
                <input
                  ref={createInputRef}
                  className="file-tree-rename-input"
                  value={creating.name}
                  onChange={(e) => setCreating({ ...creating, name: e.target.value })}
                  onKeyDown={(e) => { if (e.key === 'Enter') confirmCreate(); if (e.key === 'Escape') setCreating(null) }}
                  onBlur={confirmCreate}
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                />
              </div>
            )}
            {node.children?.map((child) => renderNode(child, depth + 1))}
          </>
        )}
      </div>
    )
  }

  return (
    <div className="file-tree">
      <div className="file-tree-header">
        {folderPath ? (
          <span title={folderPath}>{folderPath.split(/[/\\]/).pop()}</span>
        ) : (
          <span>资源管理器</span>
        )}
        <button
          className="file-tree-btn"
          title="展开全部"
          onClick={expandAll}
        >
          📗
        </button>
        <button
          className="file-tree-btn"
          title="折叠全部"
          onClick={collapseAll}
        >
          📕
        </button>
        <button
          className="file-tree-btn"
          title={sortMode === 'name' ? '按名称排序（点击切换按类型）' : sortMode === 'type' ? '按类型排序（点击切换修改时间）' : '按修改时间排序（点击切换按名称）'}
          onClick={() => setSortMode(m => m === 'name' ? 'type' : m === 'type' ? 'mtime' : 'name')}
        >
          {sortMode === 'name' ? '🔤' : sortMode === 'type' ? '📁' : '🕐'}
        </button>
        <button
          className={`file-tree-btn${mdOnly ? ' file-tree-btn-active' : ''}`}
          title={mdOnly ? '显示全部文件（当前仅 Markdown）' : '仅显示 Markdown 文件'}
          onClick={() => setMdOnly(v => !v)}
        >
          📝
        </button>
        <button
          className="file-tree-btn"
          title="打开文件夹"
          onClick={async () => {
            if (!window.api) return
            const path = await window.api.openFolder()
            if (path) {
              const tree = await window.api.readdir(path)
              useEditorStore.getState().setFileTree(tree, path)
            }
          }}
        >
          📂
        </button>
      </div>
      {fileTree.length > 0 && (
        <div className="file-tree-search">
          <input
            type="text"
            placeholder="搜索文件..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="file-tree-search-input"
          />
          {searchQuery && (
            <button className="file-tree-search-clear" onClick={() => setSearchQuery('')}>
              ×
            </button>
          )}
        </div>
      )}
      <div className="file-tree-content" onContextMenu={(e) => handleContextMenu(e, null)}>
        {fileTree.length > 0 ? (
          sortedTree.length > 0 ? (
            <>
              {/* 根目录新建项 */}
              {creating && creating.parentPath === folderPath && (
                <div className="file-tree-item" style={{ paddingLeft: '12px' }}>
                  <span className="file-tree-icon">{creating.type === 'file' ? '📝' : '📁'}</span>
                  <input
                    ref={createInputRef}
                    className="file-tree-rename-input"
                    value={creating.name}
                    onChange={(e) => setCreating({ ...creating, name: e.target.value })}
                    onKeyDown={(e) => { if (e.key === 'Enter') confirmCreate(); if (e.key === 'Escape') setCreating(null) }}
                    onBlur={confirmCreate}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                </div>
              )}
              {sortedTree.map((node) => renderNode(node))}
            </>
          ) : (
            <div className="file-tree-empty">未找到匹配文件</div>
          )
        ) : (
          <div className="file-tree-empty">
            <p>没有打开的文件夹</p>
            <button onClick={async () => {
              if (!window.api) return
              const path = await window.api.openFolder()
              if (path) {
                const tree = await window.api.readdir(path)
                useEditorStore.getState().setFileTree(tree, path)
              }
            }}>
              打开文件夹
            </button>
          </div>
        )}
      </div>
      {/* 右键菜单 */}
      {ctxMenu && (
        <div
          className="context-menu"
          style={{ left: ctxMenu.x, top: ctxMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {ctxMenu.node ? (
            <>
              {ctxMenu.node.isDirectory && (
                <>
                  <div className="context-menu-item" onClick={() => handleNewFile(ctxMenu.node!.path, 'file')}>
                    <span>📝</span> 新建文件
                  </div>
                  <div className="context-menu-item" onClick={() => handleNewFile(ctxMenu.node!.path, 'folder')}>
                    <span>📁</span> 新建文件夹
                  </div>
                  <div className="context-menu-divider" />
                </>
              )}
              <div className="context-menu-item" onClick={() => startRename(ctxMenu.node!)}>
                <span>✏️</span> 重命名
              </div>
              <div className="context-menu-item" onClick={() => useEditorStore.getState().toggleFavorite(ctxMenu.node!.path)}>
                <span>{useEditorStore.getState().isFavorite(ctxMenu.node!.path) ? '⭐' : '☆'}</span>
                {useEditorStore.getState().isFavorite(ctxMenu.node!.path) ? '取消收藏' : '收藏'}
              </div>
              <div className="context-menu-item" onClick={() => { navigator.clipboard?.writeText(ctxMenu.node!.path); closeCtxMenu() }}>
                <span>📋</span> 复制路径
              </div>
              <div className="context-menu-item" onClick={() => handleDelete(ctxMenu.node!)}>
                <span>🗑️</span> 删除
              </div>
            </>
          ) : (
            <>
              {folderPath && (
                <>
                  <div className="context-menu-item" onClick={() => handleNewFile(folderPath, 'file')}>
                    <span>📝</span> 新建文件
                  </div>
                  <div className="context-menu-item" onClick={() => handleNewFile(folderPath, 'folder')}>
                    <span>📁</span> 新建文件夹
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function getFileIcon(name: string): string {
  if (/\.(md|markdown)$/i.test(name)) return '📝'
  if (/\.txt$/i.test(name)) return '📄'
  if (/\.json$/i.test(name)) return '📋'
  if (/\.(ya?ml)$/i.test(name)) return '⚙️'
  if (/\.(tsx?|jsx?)$/i.test(name)) return '💻'
  if (/\.(css|scss|less)$/i.test(name)) return '🎨'
  if (/\.(png|jpg|jpeg|gif|svg|webp)$/i.test(name)) return '🖼️'
  if (/\.(pdf)$/i.test(name)) return '📕'
  if (/\.(zip|tar|gz|rar)$/i.test(name)) return '📦'
  if (/\.(sh|bash|zsh)$/i.test(name)) return '🖥️'
  if (/\.py$/i.test(name)) return '🐍'
  if (/\.rs$/i.test(name)) return '🦀'
  return '📄'
}
