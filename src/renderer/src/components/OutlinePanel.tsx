/**
 * 文档大纲面板
 * — 实时解析当前文档的标题层级，生成可点击导航
 */
import React, { useMemo, useCallback, useState } from 'react'
import { useEditorStore } from '../store/editorStore'
import { getEditorView } from '../plugins/widgets'
import { foldEffect, unfoldEffect, foldedRanges } from '@codemirror/language'

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
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set())

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
    const editorEl = document.querySelector('.cm-editor')
    if (!editorEl) return
    const view = getEditorView(editorEl as HTMLElement)
    if (!view) return
    const lineInfo = view.state.doc.line(line + 1)
    view.dispatch({
      selection: { anchor: lineInfo.from },
      scrollIntoView: true
    })
    view.focus()
  }

  // 计算标题是否有子内容可折叠
  const headingHasChildren = useCallback((idx: number) => {
    if (idx >= headings.length - 1) return false
    return headings[idx + 1].level > headings[idx].level
  }, [headings])

  // 折叠/展开指定标题下的内容
  const toggleFold = useCallback((e: React.MouseEvent, idx: number) => {
    e.stopPropagation()
    const editorEl = document.querySelector('.cm-editor')
    if (!editorEl) return
    const view = getEditorView(editorEl as HTMLElement)
    if (!view) return

    const heading = headings[idx]
    const nextHeading = headings[idx + 1]
    if (!nextHeading || nextHeading.level <= heading.level) return

    const startLine = view.state.doc.line(heading.line + 1)
    // 找到折叠结束位置（下一个同级或更高级标题前一行）
    let endLineNum = view.state.doc.lines
    for (let i = idx + 1; i < headings.length; i++) {
      if (headings[i].level <= heading.level) {
        endLineNum = headings[i].line
        break
      }
    }
    const endLine = view.state.doc.line(endLineNum)

    const isCurrentlyCollapsed = collapsed.has(idx)

    if (isCurrentlyCollapsed) {
      // 展开
      const effects: unknown[] = []
      const folded = foldedRanges(view.state)
      folded.between(startLine.to, endLine.to, (from: number, to: number) => {
        effects.push(unfoldEffect.of({ from, to }))
      })
      if (effects.length > 0) view.dispatch({ effects: effects as any })
      setCollapsed(prev => {
        const next = new Set(prev)
        next.delete(idx)
        return next
      })
    } else {
      // 折叠
      view.dispatch({
        effects: foldEffect.of({ from: startLine.to, to: endLine.to })
      })
      setCollapsed(prev => {
        const next = new Set(prev)
        next.add(idx)
        return next
      })
    }
  }, [headings, collapsed])

  // 全部折叠
  const collapseAll = useCallback(() => {
    const editorEl = document.querySelector('.cm-editor')
    const view = editorEl ? getEditorView(editorEl as HTMLElement) : null
    if (!view) return
    const effects: unknown[] = []
    const doc = view.state.doc
    headings.forEach((heading, idx) => {
      const next = headings[idx + 1]
      if (!next || next.level <= heading.level) return
      let endLineNum = doc.lines
      for (let i = idx + 1; i < headings.length; i++) {
        if (headings[i].level <= heading.level) { endLineNum = headings[i].line; break }
      }
      const startLine = doc.line(heading.line + 1)
      const endLine = doc.line(endLineNum)
      effects.push(foldEffect.of({ from: startLine.to, to: endLine.to }))
    })
    if (effects.length) view.dispatch({ effects: effects as any })
    setCollapsed(new Set(headings.map((_, i) => i)))
  }, [headings])

  // 全部展开
  const expandAll = useCallback(() => {
    const editorEl = document.querySelector('.cm-editor')
    const view = editorEl ? getEditorView(editorEl as HTMLElement) : null
    if (!view) return
    const effects: unknown[] = []
    const folded = foldedRanges(view.state)
    folded.between(0, view.state.doc.length, (from: number, to: number) => {
      effects.push(unfoldEffect.of({ from, to }))
    })
    if (effects.length) view.dispatch({ effects: effects as any })
    setCollapsed(new Set())
  }, [])

  return (
    <div className="outline-panel">
      <div className="outline-header">
        <span>大纲</span>
        <div className="outline-actions">
          <button className="outline-action-btn" title="全部折叠" onClick={collapseAll}>⇈</button>
          <button className="outline-action-btn" title="全部展开" onClick={expandAll}>⇊</button>
          <button
            className="outline-close-btn"
            onClick={() => useEditorStore.getState().toggleOutline()}
            title="关闭大纲"
          >
            ×
          </button>
        </div>
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
              {headingHasChildren(idx) && (
                <span
                  className={`outline-fold-icon${collapsed.has(idx) ? ' folded' : ''}`}
                  onClick={(e) => toggleFold(e, idx)}
                >
                  {collapsed.has(idx) ? '▶' : '▼'}
                </span>
              )}
              <span className="outline-marker">{'#'.repeat(h.level)}</span>
              <span className="outline-text">{h.text}</span>
              <span className="outline-line" title="点击跳转到该行" onClick={(e) => { e.stopPropagation(); scrollToLine(h.line) }}>L{h.line + 1}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
