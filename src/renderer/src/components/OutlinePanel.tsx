/**
 * 文档大纲面板
 * — 实时解析当前文档的标题层级，生成可点击导航
 */
import React, { useMemo } from 'react'
import { useEditorStore } from '../store/editorStore'
import { getEditorView } from '../plugins/widgets'

interface HeadingItem {
  level: number
  text: string
  line: number
  id: string
}

export function OutlinePanel() {
  const { tabs, activeTabId, outlineVisible } = useEditorStore()

  const activeTab = tabs.find((t) => t.id === activeTabId)
  const cursorLine = activeTab?.cursorLine ?? 1

  const headings = useMemo<HeadingItem[]>(() => {
    if (!activeTab) return []
    const result: HeadingItem[] = []
    const lines = activeTab.content.split('\n')
    let counter = 0

    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/^(#{1,6})\s+(.+)$/)
      if (match) {
        result.push({
          level: match[1].length,
          text: match[2].trim(),
          line: i,
          id: `heading-${counter++}`
        })
      }
    }
    return result
  }, [activeTab?.content])

  // 根据光标位置计算当前活跃标题
  const activeHeadingIdx = useMemo(() => {
    let idx = -1
    for (let i = 0; i < headings.length; i++) {
      if (headings[i].line + 1 <= cursorLine) idx = i
      else break
    }
    return idx
  }, [headings, cursorLine])

  if (!outlineVisible) return null

  const scrollToLine = (line: number) => {
    // 通过 DOM 查找 CodeMirror 编辑器并滚动到指定行
    const editorEl = document.querySelector('.cm-editor')
    if (!editorEl) return
    const view = getEditorView(editorEl as HTMLElement)
    if (!view) return
    const lineInfo = view.state.doc.line(line + 1) // line is 0-indexed, doc.line is 1-indexed
    view.dispatch({
      selection: { anchor: lineInfo.from },
      scrollIntoView: true
    })
    view.focus()
  }

  return (
    <div className="outline-panel">
      <div className="outline-header">
        <span>大纲</span>
        <button
          className="outline-close-btn"
          onClick={() => useEditorStore.getState().toggleOutline()}
          title="关闭大纲"
        >
          ×
        </button>
      </div>
      <div className="outline-content">
        {headings.length === 0 ? (
          <div className="outline-empty">无标题</div>
        ) : (
          headings.map((h, idx) => (
            <div
              key={h.id}
              ref={idx === activeHeadingIdx ? (el) => el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }) : undefined}
              className={`outline-item outline-level-${h.level}${idx === activeHeadingIdx ? ' outline-active' : ''}`}
              onClick={() => scrollToLine(h.line)}
              title={h.text}
            >
              <span className="outline-marker">{'#'.repeat(h.level)}</span>
              <span className="outline-text">{h.text}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
