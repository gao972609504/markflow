import React, { useState, useMemo } from 'react'
import { useEditorStore, FileTreeNode } from '../store/editorStore'

export function FileTree() {
  const { fileTree, folderPath, sidebarVisible } = useEditorStore()
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')

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

  const filteredTree = useMemo(() => filterTree(fileTree, searchQuery), [fileTree, searchQuery])

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
    return (
      <div key={node.path}>
        <div
          className={`file-tree-item ${node.isDirectory ? 'directory' : 'file'} ${isMatch ? 'file-tree-match' : ''}`}
          style={{ paddingLeft: `${12 + depth * 16}px` }}
          onClick={() => openFile(node)}
        >
          <span className="file-tree-icon">
            {node.isDirectory ? (isExpanded ? '📂' : '📁') : getFileIcon(node.name)}
          </span>
          <span className="file-tree-name">{node.name}</span>
        </div>
        {node.isDirectory && isExpanded && node.children?.map((child) => renderNode(child, depth + 1))}
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
      <div className="file-tree-content">
        {fileTree.length > 0 ? (
          filteredTree.length > 0 ? (
            filteredTree.map((node) => renderNode(node))
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
    </div>
  )
}

function getFileIcon(name: string): string {
  if (/\.(md|markdown)$/i.test(name)) return '📝'
  if (/\.txt$/i.test(name)) return '📄'
  return '📄'
}
