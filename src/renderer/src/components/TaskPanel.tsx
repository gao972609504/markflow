/**
 * 任务清单汇总面板 (Task Summary Panel)
 * — 扫描全文 - [ ] / - [x] 任务项，集中管理：勾选切换、跳转、进度统计
 * — 灵感来自 Obsidian Tasks 插件
 */
import { useMemo } from 'react'
import { EditorView } from '@codemirror/view'
import { useEditorStore } from '../store/editorStore'
import { getEditorView } from '../plugins/widgets'

interface TaskItem {
  line: number
  checked: boolean
  text: string
  indent: number
}

const TASK_RE = /^(\s*)([-*+])\s\[([ xX])\]\s(.*)$/

export function TaskPanel() {
  const { tabs, activeTabId, showTaskPanel, updateTabContent, setShowTaskPanel } = useEditorStore()
  const activeTab = tabs.find(t => t.id === activeTabId)

  const tasks = useMemo<TaskItem[]>(() => {
    if (!activeTab?.content) return []
    const result: TaskItem[] = []
    activeTab.content.split('\n').forEach((text, i) => {
      const m = text.match(TASK_RE)
      if (m) {
        result.push({ line: i, checked: m[3].toLowerCase() === 'x', text: m[4].trim(), indent: m[1].length })
      }
    })
    return result
  }, [activeTab?.content])

  if (!showTaskPanel) return null

  const done = tasks.filter(t => t.checked).length
  const total = tasks.length
  const pct = total ? Math.round((done / total) * 100) : 0

  const toggle = (task: TaskItem) => {
    if (!activeTab) return
    const lines = activeTab.content.split('\n')
    const cur = lines[task.line]
    const newMark = task.checked ? '[ ]' : '[x]'
    lines[task.line] = cur.replace(/\[([ xX])\]/, newMark)
    updateTabContent(activeTab.id, lines.join('\n'))
  }

  const jumpTo = (line: number) => {
    const el = document.querySelector('.cm-editor')
    const view = el ? getEditorView(el as HTMLElement) : null
    if (!view) return
    const lineInfo = view.state.doc.line(line + 1)
    view.dispatch({ selection: { anchor: lineInfo.from }, effects: EditorView.scrollIntoView(lineInfo.from) })
    view.focus()
  }

  return (
    <div className="task-panel">
      <div className="task-panel-header">
        <span>✓ 任务清单</span>
        <div className="task-panel-meta">
          <span className="task-pct">{pct}%</span>
          <button className="task-close" onClick={() => setShowTaskPanel(false)}>×</button>
        </div>
      </div>
      <div className="task-progress-bar"><div className="task-progress-fill" style={{ width: pct + '%' }} /></div>
      <div className="task-panel-count">{done}/{total} 已完成</div>
      <div className="task-panel-list">
        {tasks.length === 0 ? (
          <div className="task-empty">暂无任务项<br /><small>使用 - [ ] 创建</small></div>
        ) : (
          tasks.map((t, idx) => (
            <div key={idx} className={`task-row${t.checked ? ' done' : ''}`} style={{ paddingLeft: 8 + t.indent * 6 }}>
              <input type="checkbox" checked={t.checked} onChange={() => toggle(t)} />
              <span className="task-row-text" onClick={() => jumpTo(t.line)} title="点击跳转">{t.text || '(空)'}</span>
              <span className="task-row-line">L{t.line + 1}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
