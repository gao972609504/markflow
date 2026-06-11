import React, { useRef } from 'react'
import { useEditorStore } from '../store/editorStore'
import { useTabContextMenu } from './TabContextMenu'

export function TabBar() {
  const { tabs, activeTabId, setActiveTab, closeTab } = useEditorStore()
  const { show: showContextMenu, Menu } = useTabContextMenu()
  const tabBarRef = useRef<HTMLDivElement>(null)

  const handleWheel = (e: React.WheelEvent) => {
    // 滚轮切换标签
    if (e.deltaY > 0 || e.deltaX > 0) {
      const idx = tabs.findIndex(t => t.id === activeTabId)
      if (idx < tabs.length - 1) setActiveTab(tabs[idx + 1].id)
    } else {
      const idx = tabs.findIndex(t => t.id === activeTabId)
      if (idx > 0) setActiveTab(tabs[idx - 1].id)
    }
  }

  if (tabs.length === 0) return null

  return (
    <>
      <div className="tab-bar" ref={tabBarRef} onWheel={handleWheel}>
        <div className="tab-list">
          {tabs.map((tab, index) => (
            <div
              key={tab.id}
              className={`tab-item ${tab.id === activeTabId ? 'active' : ''} ${tab.pinned ? 'tab-pinned' : ''}`}
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
