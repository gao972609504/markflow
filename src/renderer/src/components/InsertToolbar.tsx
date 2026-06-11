/**
 * Markdown 快捷插入工具栏
 * — 提供常用 Markdown 元素的快速插入按钮
 */
import React, { useState, useRef, useEffect } from 'react'
import { getEditorView } from '../plugins/widgets'

interface Snippet {
  label: string
  icon: string
  insert: string
  cursorOffset: number // 光标相对于插入结束位置的偏移
}

const snippets: Snippet[] = [
  { label: '表格', icon: '📊', insert: '\n| 列1 | 列2 | 列3 |\n| --- | --- | --- |\n| 内容 | 内容 | 内容 |\n', cursorOffset: 0 },
  { label: '代码块', icon: '💻', insert: '\n```javascript\n\n```\n', cursorOffset: 15 },
  { label: '公式块', icon: '📐', insert: '\n$$\n\n$$\n', cursorOffset: 4 },
  { label: '分割线', icon: '➖', insert: '\n---\n', cursorOffset: 0 },
  { label: '引用', icon: '💬', insert: '\n> ', cursorOffset: 2 },
  { label: '任务列表', icon: '☑️', insert: '\n- [ ] ', cursorOffset: 6 },
  { label: '有序列表', icon: '🔢', insert: '\n1. ', cursorOffset: 4 },
  { label: '无序列表', icon: '📋', insert: '\n- ', cursorOffset: 2 },
  { label: '链接', icon: '🔗', insert: '[文字](url)', cursorOffset: 9 },
  { label: '图片', icon: '🖼️', insert: '![alt](url)', cursorOffset: 7 },
  { label: '标题1', icon: 'H1', insert: '# ', cursorOffset: 2 },
  { label: '标题2', icon: 'H2', insert: '## ', cursorOffset: 3 },
  { label: '标题3', icon: 'H3', insert: '### ', cursorOffset: 4 },
  { label: '脚注', icon: '📌', insert: '[^1]\n\n[^1]: ', cursorOffset: 7 },
  { label: 'TOC', icon: '📑', insert: '[TOC]\n', cursorOffset: 0 },
  { label: '提示框', icon: '💡', insert: '\n:::tip\n\n:::\n', cursorOffset: 7 },
]

export function InsertToolbar() {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const insertSnippet = (snippet: Snippet) => {
    const editorEl = document.querySelector('.cm-editor')
    if (!editorEl) return
    const view = getEditorView(editorEl as HTMLElement)
    if (!view) return

    const { head } = view.state.selection.main
    view.dispatch({
      changes: { from: head, to: head, insert: snippet.insert },
      selection: { anchor: head + snippet.insert.length - snippet.cursorOffset }
    })
    view.focus()
    setOpen(false)
  }

  return (
    <div className="insert-toolbar" ref={menuRef}>
      <button
        className={`insert-toolbar-toggle ${open ? 'active' : ''}`}
        onClick={() => setOpen(!open)}
        title="插入 Markdown 元素"
      >
        ✏️ 插入
      </button>
      {open && (
        <div className="insert-toolbar-menu">
          {snippets.map((s, i) => (
            <button
              key={i}
              className="insert-toolbar-item"
              onClick={() => insertSnippet(s)}
              title={s.label}
            >
              <span className="insert-toolbar-icon">{s.icon}</span>
              <span className="insert-toolbar-label">{s.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
