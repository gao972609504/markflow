import React, { useState, useEffect, useRef } from 'react'
import { Tab, useEditorStore } from '../store/editorStore'

interface StatusBarProps {
  tab: Tab
  autoSaveStatus?: 'idle' | 'saving' | 'saved'
}

export function StatusBar({ tab, autoSaveStatus = 'idle' }: StatusBarProps) {
  const { theme, toggleTheme, focusMode, toggleFocusMode, typewriterMode, toggleTypewriterMode, outlineVisible, toggleOutline, autoSave, toggleAutoSave, fontSize, headingNumbering, toggleHeadingNumbering, tagPanelVisible, toggleTagPanel, wordWrap, toggleWordWrap, showLineNumbers, toggleLineNumbers, wordGoal, setWordGoal, fontFamily, setFontFamily } = useEditorStore()

  // ── 番茄钟计时器 ──
  const [pomoRunning, setPomoRunning] = useState(false)
  const [pomoSeconds, setPomoSeconds] = useState(25 * 60)
  const [pomoTotal, setPomoTotal] = useState(25 * 60)
  const [pomoMode, setPomoMode] = useState<'work' | 'break'>('work')
  const pomoInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (pomoRunning) {
      pomoInterval.current = setInterval(() => {
        setPomoSeconds(s => {
          if (s <= 1) {
            setPomoRunning(false)
            // 切换工作/休息模式
            if (pomoMode === 'work') {
              setPomoMode('break')
              setPomoTotal(5 * 60)
              return 5 * 60
            } else {
              setPomoMode('work')
              setPomoTotal(25 * 60)
              return 25 * 60
            }
          }
          return s - 1
        })
      }, 1000)
    }
    return () => { if (pomoInterval.current) clearInterval(pomoInterval.current) }
  }, [pomoRunning, pomoMode])

  const lineCount = tab.content.split('\n').length
  const charCount = tab.content.length
  const wordCount = tab.content.trim() ? tab.content.trim().split(/\s+/).length : 0
  const paragraphCount = tab.content.trim() ? tab.content.split(/\n\s*\n/).filter(p => p.trim()).length : 0

  // 阅读时间估算（中文按 300 字/分钟，英文按 200 词/分钟）
  const chineseChars = (tab.content.match(/[一-鿿]/g) || []).length
  const englishWords = (tab.content.match(/[a-zA-Z]+/g) || []).length
  const readingMinutes = Math.max(1, Math.ceil(chineseChars / 300 + englishWords / 200))
  const readingTime = readingMinutes < 60 ? `${readingMinutes} 分钟` : `${Math.floor(readingMinutes / 60)} 小时 ${readingMinutes % 60} 分`

  return (
    <div className="status-bar">
      <div className="status-left">
        <span className="status-item" title="光标位置">行 {tab.cursorLine}, 列 {tab.cursorCol}</span>
        <span className="status-item" title="字符数">{charCount} 字符</span>
        <span className="status-item" title="词数">{wordCount} 词</span>
        <span className="status-item" title="行数">{lineCount} 行</span>
        <span className="status-item" title="段落数">{paragraphCount} 段</span>
        <span className="status-item" title="预计阅读时间">📖 {readingTime}</span>
        {wordGoal > 0 && (() => {
          const progress = Math.min(100, Math.round((wordCount / wordGoal) * 100))
          return (
            <span
              className={`status-btn ${progress >= 100 ? 'status-btn-active' : ''}`}
              title={`写作目标: ${wordCount}/${wordGoal} 词 (${progress}%)`}
              onClick={() => {
                const input = prompt('设置字数目标（输入 0 取消）:', String(wordGoal))
                if (input !== null) setWordGoal(parseInt(input, 10) || 0)
              }}
            >
              🎯 {progress >= 100 ? '✅' : `${progress}%`} {wordCount}/{wordGoal}
            </span>
          )
        })()}
        {!wordGoal && (
          <span
            className="status-btn"
            title="设置字数写作目标"
            onClick={() => {
              const input = prompt('设置字数目标:', '1000')
              if (input) setWordGoal(parseInt(input, 10) || 0)
            }}
          >
            🎯 设目标
          </span>
        )}
        {tab.isModified && autoSave && autoSaveStatus === 'saving' && (
          <span className="status-item status-auto-saving">⏳ 保存中...</span>
        )}
        {autoSaveStatus === 'saved' && (
          <span className="status-item status-auto-saved">✅ 已自动保存</span>
        )}
      </div>
      <div className="status-right">
        <button
          className={`status-btn ${autoSave ? 'status-btn-active' : ''}`}
          onClick={toggleAutoSave}
          title={`自动保存: ${autoSave ? '已开启' : '已关闭'}`}
        >
          💾 自动保存
        </button>
        <button
          className={`status-btn ${headingNumbering ? 'status-btn-active' : ''}`}
          onClick={toggleHeadingNumbering}
          title="标题自动编号"
        >
          🔢 编号
        </button>
        <button
          className={`status-btn ${tagPanelVisible ? 'status-btn-active' : ''}`}
          onClick={toggleTagPanel}
          title="标签面板"
        >
          🏷️ 标签
        </button>
        <button
          className={`status-btn ${outlineVisible ? 'status-btn-active' : ''}`}
          onClick={toggleOutline}
          title="大纲面板 (Ctrl+Shift+O)"
        >
          📋 大纲
        </button>
        <button
          className={`status-btn ${focusMode ? 'status-btn-active' : ''}`}
          onClick={toggleFocusMode}
          title="Focus 模式：只高亮当前段落"
        >
          🎯 Focus
        </button>
        <button
          className={`status-btn ${typewriterMode ? 'status-btn-active' : ''}`}
          onClick={toggleTypewriterMode}
          title="Typewriter 模式：光标行始终居中"
        >
          📜 打字机
        </button>
        <button className="status-btn" onClick={toggleTheme} title="切换主题">
          {theme === 'light' ? '🌙 暗色' : '☀️ 亮色'}
        </button>
        <button
          className={`status-btn ${pomoRunning ? 'status-btn-active' : ''}`}
          title={`番茄钟 (${pomoMode === 'work' ? '工作' : '休息'}) - 点击${pomoRunning ? '暂停' : '开始'}`}
          onClick={() => {
            if (!pomoRunning && pomoSeconds === pomoTotal && pomoMode === 'work') {
              // 首次点击或已结束，可选择时长
              const input = prompt('设置专注时间（分钟）:', '25')
              if (input) {
                const mins = Math.max(1, parseInt(input, 10) || 25)
                setPomoTotal(mins * 60)
                setPomoSeconds(mins * 60)
              }
            }
            setPomoRunning(!pomoRunning)
          }}
          onContextMenu={(e) => {
            e.preventDefault()
            setPomoRunning(false)
            setPomoMode('work')
            setPomoTotal(25 * 60)
            setPomoSeconds(25 * 60)
          }}
        >
          🍅 {String(Math.floor(pomoSeconds / 60)).padStart(2, '0')}:{String(pomoSeconds % 60).padStart(2, '0')}
        </button>
        <span className="status-item" title="字体大小 (Ctrl++/- 调整, Ctrl+0 重置)">
          🔤 {fontSize.toFixed(1)}px
        </span>
        <button
          className="status-btn"
          title="切换编辑器字体"
          onClick={() => {
            const fonts = ['默认', 'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Source Code Pro', 'Consolas', 'Menlo', 'Monaco']
            const current = fontFamily || '默认'
            const idx = fonts.indexOf(current)
            const next = fonts[(idx + 1) % fonts.length]
            setFontFamily(next === '默认' ? '' : next)
          }}
        >
          🔠 {fontFamily || '默认'}
        </button>
        <button
          className={`status-btn ${wordWrap ? 'status-btn-active' : ''}`}
          onClick={toggleWordWrap}
          title="自动换行"
        >
          ↩️ 换行
        </button>
        <button
          className={`status-btn ${showLineNumbers ? 'status-btn-active' : ''}`}
          onClick={toggleLineNumbers}
          title="显示行号"
        >
          🔢 行号
        </button>
        <span className="status-item">UTF-8</span>
        <span className="status-item">Markdown</span>
      </div>
    </div>
  )
}
