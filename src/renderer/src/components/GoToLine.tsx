/**
 * 跳转到行 (Ctrl+G)
 * — 输入行号，快速定位到编辑器对应位置
 */
import React, { useState, useRef, useEffect } from 'react'
import { useEditorStore } from '../store/editorStore'
import { getEditorView } from '../plugins/widgets'

export function GoToLine() {
  const { showGoToLine, setShowGoToLine } = useEditorStore()
  const [lineNum, setLineNum] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [showGoToLine])

  if (!showGoToLine) return null

  const goTo = () => {
    const num = parseInt(lineNum, 10)
    if (isNaN(num) || num < 1) return
    const editorEl = document.querySelector('.cm-editor')
    if (!editorEl) return
    const view = getEditorView(editorEl as HTMLElement)
    if (!view) return
    const targetLine = Math.min(num, view.state.doc.lines)
    const lineInfo = view.state.doc.line(targetLine)
    view.dispatch({
      selection: { anchor: lineInfo.from },
      scrollIntoView: true
    })
    view.focus()
    setShowGoToLine(false)
    setLineNum('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') goTo()
    else if (e.key === 'Escape') { setShowGoToLine(false); setLineNum('') }
  }

  return (
    <div className="go-to-line-bar">
      <span className="go-to-line-label">行号:</span>
      <input
        ref={inputRef}
        type="text"
        value={lineNum}
        onChange={e => setLineNum(e.target.value.replace(/[^\d]/g, ''))}
        onKeyDown={handleKeyDown}
        className="go-to-line-input"
        placeholder="输入行号..."
      />
      <button className="go-to-line-btn" onClick={goTo}>跳转</button>
      <button className="go-to-line-btn" onClick={() => { setShowGoToLine(false); setLineNum('') }}>取消</button>
    </div>
  )
}
