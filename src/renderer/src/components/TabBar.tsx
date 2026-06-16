import React, { useRef, useState } from 'react'
import { useEditorStore } from '../store/editorStore'
import { useTabContextMenu } from './TabContextMenu'

export function TabBar() {
  const { tabs, activeTabId, setActiveTab, closeTab } = useEditorStore()
  const { show: showContextMenu, Menu } = useTabContextMenu()
  const tabBarRef = useRef<HTMLDivElement>(null)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dropIdx, setDropIdx] = useState<number | null>(null)

  const handleWheel = (e: React.WheelEvent) => {
    if (e.deltaY > 0 || e.deltaX > 0) {
      const idx = tabs.findIndex(t => t.id === activeTabId)
      if (idx < tabs.length - 1) setActiveTab(tabs[idx + 1].id)
    } else {
      const idx = tabs.findIndex(t => t.id === activeTabId)
      if (idx > 0) setActiveTab(tabs[idx - 1].id)
    }
  }

  const handleDragStart = (idx: number) => setDragIdx(idx)
  const handleDragOver = (e: React.DragEvent, idx: number) => { e.preventDefault(); setDropIdx(idx) }
  const handleDragEnd = () => {
    if (dragIdx !== null && dropIdx !== null && dragIdx !== dropIdx) {
      const newTabs = [...tabs]
      const [moved] = newTabs.splice(dragIdx, 1)
      newTabs.splice(dropIdx, 0, moved)
      useEditorStore.setState({ tabs: newTabs })
    }
    setDragIdx(null)
    setDropIdx(null)
  }

  if (tabs.length === 0) return null

  return (
    <>
      <div className="tab-bar" ref={tabBarRef} onWheel={handleWheel}
        onDoubleClick={(e) => { if (e.target === tabBarRef.current || (e.target as HTMLElement).classList.contains('tab-list')) useEditorStore.getState().createTab() }}>
        <div className="tab-list">
          {tabs.map((tab, index) => (
            <div
              key={tab.id}
              className={`tab-item ${tab.id === activeTabId ? 'active' : ''} ${tab.pinned ? 'tab-pinned' : ''} ${dragIdx === index ? 'tab-dragging' : ''} ${dropIdx === index ? 'tab-drop-target' : ''}`}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              onClick={() => setActiveTab(tab.id)}
              onContextMenu={(e) => showContextMenu(e, tab.id, index, tab.filePath, tab.title)}
            >
              <span className="tab-title">
                {tab.pinned && <span className="tab-pin-icon">📌</span>}
                {tab.isModified && <span className="tab-modified">●</span>}
                {tab.title}
              </span>
              {!tab.pinned && (
                <button
                  className="tab-close"
                  onClick={(e) => {
                    e.stopPropagation()
                    closeTab(tab.id)
                  }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
      {Menu}
    </>
  )
}
