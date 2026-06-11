/**
 * 标签页右键菜单
 * — 关闭/关闭其他/关闭右侧/关闭全部/复制路径/复制文件名
 */
import React, { useState, useCallback, useEffect, useRef } from 'react'
import { useEditorStore } from '../store/editorStore'

interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  tabId: string
  tabIndex: number
  filePath: string | null
  title: string
}

const initialState: ContextMenuState = { visible: false, x: 0, y: 0, tabId: '', tabIndex: -1, filePath: null, title: '' }

export function useTabContextMenu() {
  const [menu, setMenu] = useState<ContextMenuState>(initialState)

  const show = useCallback((e: React.MouseEvent, tabId: string, tabIndex: number, filePath: string | null, title: string) => {
    e.preventDefault()
    e.stopPropagation()
    setMenu({ visible: true, x: e.clientX, y: e.clientY, tabId, tabIndex, filePath, title })
  }, [])

  const hide = useCallback(() => setMenu(prev => ({ ...prev, visible: false })), [])

  useEffect(() => {
    if (!menu.visible) return
    const handleClick = () => hide()
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') hide() }
    document.addEventListener('click', handleClick)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('click', handleClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [menu.visible, hide])

  const closeTab = (id: string) => { useEditorStore.getState().closeTab(id); hide() }
  const closeOthers = (keepId: string) => {
    const store = useEditorStore.getState()
    store.tabs.filter(t => t.id !== keepId).map(t => t.id).forEach(id => store.closeTab(id))
    hide()
  }
  const closeToRight = (index: number) => {
    const store = useEditorStore.getState()
    store.tabs.slice(index + 1).map(t => t.id).forEach(id => store.closeTab(id))
    hide()
  }
  const closeAll = () => {
    const store = useEditorStore.getState()
    store.tabs.map(t => t.id).forEach(id => store.closeTab(id))
    hide()
  }

  const Menu = menu.visible ? (
    <div
      className="context-menu"
      style={{ left: menu.x, top: menu.y }}
      onClick={e => e.stopPropagation()}
    >
      <div className="context-menu-item" onClick={() => { navigator.clipboard.writeText(menu.title); hide() }}>
        📋 复制文件名
      </div>
      {menu.filePath && (
        <div className="context-menu-item" onClick={() => { navigator.clipboard.writeText(menu.filePath!); hide() }}>
          📁 复制完整路径
        </div>
      )}
      <div className="context-menu-divider" />
      <div className="context-menu-item" onClick={() => { useEditorStore.getState().toggleTabPin(menu.tabId); hide() }}>
        {useEditorStore.getState().tabs.find(t => t.id === menu.tabId)?.pinned ? '📍 取消固定' : '📌 固定标签'}
      </div>
      <div className="context-menu-item" onClick={() => closeTab(menu.tabId)}>
        ✕ 关闭
      </div>
      <div className="context-menu-item" onClick={() => closeOthers(menu.tabId)}>
        关闭其他
      </div>
      <div className="context-menu-item" onClick={() => closeToRight(menu.tabIndex)}>
        关闭右侧
      </div>
      <div className="context-menu-item" onClick={closeAll}>
        关闭全部
      </div>
    </div>
  ) : null

  return { show, Menu }
}
