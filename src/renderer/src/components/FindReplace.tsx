import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useEditorStore } from '../store/editorStore'
import { getEditorView } from '../plugins/widgets'

export function FindReplace() {
  const [findText, setFindText] = useState('')
  const [replaceText, setReplaceText] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [useRegex, setUseRegex] = useState(false)
  const [matchCount, setMatchCount] = useState(0)
  const [currentMatch, setCurrentMatch] = useState(0)
  const findInputRef = useRef<HTMLInputElement>(null)
  const { setShowFindReplace, activeTabId, tabs, updateTabContent } = useEditorStore()
  const activeTab = tabs.find((t) => t.id === activeTabId)

  useEffect(() => {
    findInputRef.current?.focus()
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowFindReplace(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setShowFindReplace])

  // 计算匹配数量
  const countMatches = useCallback(() => {
    if (!findText || !activeTab) { setMatchCount(0); setCurrentMatch(0); return }
    try {
      const flags = caseSensitive ? 'g' : 'gi'
      const pattern = useRegex ? findText : findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const re = new RegExp(pattern, flags)
      const matches = activeTab.content.match(re)
      setMatchCount(matches ? matches.length : 0)
      setCurrentMatch(matches ? 1 : 0)
    } catch {
      setMatchCount(0); setCurrentMatch(0)
    }
  }, [findText, activeTab, caseSensitive, useRegex])

  useEffect(() => { countMatches() }, [countMatches])

  const findNext = () => {
    if (!findText || !activeTab) return
    const editorEl = document.querySelector('.cm-editor')
    if (!editorEl) return
    const view = getEditorView(editorEl as HTMLElement)
    if (!view) return

    try {
      const flags = caseSensitive ? 'g' : 'gi'
      const pattern = useRegex ? findText : findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const re = new RegExp(pattern, flags)
      const content = activeTab.content
      const startPos = view.state.selection.main.to
      re.lastIndex = startPos
      let match = re.exec(content)
      if (!match) { re.lastIndex = 0; match = re.exec(content) }
      if (match) {
        const idx = match.index
        setCurrentMatch(prev => prev >= matchCount ? 1 : prev + 1)
        view.dispatch({
          selection: { anchor: idx, head: idx + match![0].length },
          scrollIntoView: true
        })
      }
    } catch { /* invalid regex */ }
  }

  const handleReplace = () => {
    if (!findText || !activeTab) return
    try {
      const flags = caseSensitive ? '' : 'i'
      const pattern = useRegex ? findText : findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const re = new RegExp(pattern, flags)
      const newContent = activeTab.content.replace(re, replaceText)
      if (newContent !== activeTab.content) {
        updateTabContent(activeTab.id, newContent)
      }
    } catch { /* invalid regex */ }
  }

  const handleReplaceAll = () => {
    if (!findText || !activeTab) return
    try {
      const flags = caseSensitive ? 'g' : 'gi'
      const pattern = useRegex ? findText : findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const re = new RegExp(pattern, flags)
      const newContent = activeTab.content.replace(re, replaceText)
      if (newContent !== activeTab.content) {
        updateTabContent(activeTab.id, newContent)
      }
    } catch { /* invalid regex */ }
  }

  return (
    <div className="find-replace-panel">
      <div className="find-replace-row">
        <input
          ref={findInputRef}
          type="text"
          placeholder="查找..."
          value={findText}
          onChange={(e) => setFindText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && findNext()}
          className="find-input"
        />
        <button className={`find-option-btn ${caseSensitive ? 'active' : ''}`} onClick={() => setCaseSensitive(!caseSensitive)} title="区分大小写">Aa</button>
        <button className={`find-option-btn ${useRegex ? 'active' : ''}`} onClick={() => setUseRegex(!useRegex)} title="正则表达式">.*</button>
        <span className="find-match-count">{matchCount > 0 ? `${currentMatch}/${matchCount}` : '无匹配'}</span>
        <button onClick={findNext} className="find-btn" title="查找下一个">▼</button>
        <button className="find-close" onClick={() => setShowFindReplace(false)}>×</button>
      </div>
      <div className="find-replace-row">
        <input
          type="text"
          placeholder="替换为..."
          value={replaceText}
          onChange={(e) => setReplaceText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleReplace()}
          className="find-input"
        />
        <button onClick={handleReplace} className="find-btn" title="替换">替换</button>
        <button onClick={handleReplaceAll} className="find-btn" title="全部替换">全部</button>
      </div>
    </div>
  )
}
