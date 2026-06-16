/**
 * 当前章节面包屑 (Heading Breadcrumb)
 * — 编辑器顶部显示光标所在标题的层级链 H1 › H2 › H3，点击任一级跳转
 */
import { useMemo } from 'react'
import { EditorView } from '@codemirror/view'
import { useEditorStore } from '../store/editorStore'
import { getEditorView } from '../plugins/widgets'

interface H { level: number; text: string; line: number }

export function HeadingBreadcrumb() {
  const { tabs, activeTabId } = useEditorStore()
  const activeTab = tabs.find(t => t.id === activeTabId)

  const path = useMemo<H[]>(() => {
    if (!activeTab) return []
    const lines = activeTab.content.split('\n')
    const cursorLine = activeTab.cursorLine ?? 1
    const headings: H[] = []
    lines.forEach((text, i) => {
      const m = text.match(/^(#{1,6})\s+(.+)$/)
      if (m) headings.push({ level: m[1].length, text: m[2].trim(), line: i })
    })
    // 维护祖先栈：遍历到光标行为止
    const stack: H[] = []
    for (const h of headings) {
      if (h.line + 1 > cursorLine) break
      while (stack.length && stack[stack.length - 1].level >= h.level) stack.pop()
      stack.push(h)
    }
    return stack
  }, [activeTab?.content, activeTab?.cursorLine])

  const jumpTo = (line: number) => {
    const el = document.querySelector('.cm-editor')
    const view = el ? getEditorView(el as HTMLElement) : null
    if (!view) return
    const info = view.state.doc.line(line + 1)
    view.dispatch({ selection: { anchor: info.from }, effects: EditorView.scrollIntoView(info.from) })
    view.focus()
  }

  if (!activeTab || path.length === 0) return null

  return (
    <div className="breadcrumb-bar">
      {path.map((h, i) => (
        <span key={i} className="breadcrumb-crumb-wrap">
          {i > 0 && <span className="breadcrumb-sep">›</span>}
          <button className={`breadcrumb-crumb lvl-${h.level}`} onClick={() => jumpTo(h.line)} title={h.text}>
            {h.text}
          </button>
        </span>
      ))}
    </div>
  )
}
