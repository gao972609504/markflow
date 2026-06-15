import React, { useState, useEffect, useRef } from 'react'
import { Tab, useEditorStore } from '../store/editorStore'

interface StatusBarProps {
  tab: Tab
  autoSaveStatus?: 'idle' | 'saving' | 'saved'
}

/* ══════════════ 内联 SVG 图标库 — 线性 1.5 笔触 ══════════════ */

const Icon = {
  Cursor: () => (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3 2l3.5 11 1.6-4.4 4.4-1.6L3 2z" />
    </svg>
  ),
  Type: () => (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2 4h12M8 4v9M5 13h6" />
    </svg>
  ),
  Hash: () => (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M5.5 2L4 14M11 2L9.5 14M3 6h10M2.5 10h10" />
    </svg>
  ),
  Rows: () => (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2 4h12M2 8h12M2 12h12" />
    </svg>
  ),
  Paragraph: () => (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M9 2v12M9 2H5a3 3 0 100 6h4M5 2v6" />
    </svg>
  ),
  CheckSquare: () => (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <rect x="2.5" y="2.5" width="11" height="11" rx="1.5" />
      <path d="M5 8l2 2 4-4" />
    </svg>
  ),
  Selection: () => (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2 2l4 12 1.4-4 4-1.4L2 2z" transform="translate(3 0)" />
      <path d="M11 13l3 3M2 6l-1 1" />
    </svg>
  ),
  BookTime: () => (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3 2.5h7a2 2 0 012 2v9M3 2.5v11h7a2 2 0 002-2M3 13.5h7" />
    </svg>
  ),
  Target: () => (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="5.5" />
      <circle cx="8" cy="8" r="2.5" />
      <circle cx="8" cy="8" r="0.5" fill="currentColor" />
    </svg>
  ),
  Save: () => (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3 2h8l2 2v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" />
      <path d="M5 2v3h5V2M5 14V9h6v5" />
    </svg>
  ),
  Clock: () => (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="5.5" />
      <path d="M8 5v3l2 1.5" />
    </svg>
  ),
  ListOrdered: () => (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2 4h1v2H2M2.5 5.5L4 5M5 7.5h1v2.5L4 12h2.5" />
      <path d="M8 4h6M8 8h6M8 12h6" />
    </svg>
  ),
  Tag: () => (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2.5 8.5L7.5 13l6-6V2.5H8.5l-6 6z" />
      <circle cx="10.5" cy="5.5" r="0.8" fill="currentColor" />
    </svg>
  ),
  Outline: () => (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3 4h10M3 8h10M3 12h7" />
      <path d="M2 4h.5M2 8h.5M2 12h.5" />
    </svg>
  ),
  Focus: () => (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="2" />
      <path d="M8 1.5v3M8 11.5v3M1.5 8h3M11.5 8h3M3.5 3.5l2 2M10.5 10.5l2 2M3.5 12.5l2-2M10.5 5.5l2-2" />
    </svg>
  ),
  Typewriter: () => (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2 6h12v2H2zM4 4h8M4 12h8M8 8v4" />
    </svg>
  ),
  Sound: () => (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3 6h2.5L8 3v10L4.5 10H2V6z" />
      <path d="M11 5.5c.8.7 1.2 1.5 1.2 2.5s-.4 1.8-1.2 2.5" />
    </svg>
  ),
  Sun: () => (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="3" />
      <path d="M8 1.5v1.5M8 13v1.5M1.5 8h1.5M13 8h1.5M3.3 3.3l1 1M11.7 11.7l1 1M3.3 12.7l1-1M11.7 4.3l1-1" />
    </svg>
  ),
  Moon: () => (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M13 9.5A5.5 5.5 0 016.5 3a5.5 5.5 0 106.5 6.5z" />
    </svg>
  ),
  Tomato: () => (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="9.5" r="5" />
      <path d="M5 4.5C5.5 3.5 6.5 3 8 3s2.5.5 3 1.5" />
      <path d="M8 3V1.5M6.5 2.2L8 3l1.5-.8" />
    </svg>
  ),
  TextSize: () => (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2 12l3-7 3 7M3.2 9.5h3.6M11 12V6M9 8h4" />
    </svg>
  ),
  FontFamily: () => (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3 12l4-9 4 9M4.5 9h5" />
    </svg>
  ),
  Wrap: () => (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2 4h10a2 2 0 010 4H4l3 3M4 8L7 11" />
    </svg>
  ),
  LineNumbers: () => (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2 4h1M2 8h1M2 12h1M4 4h10M4 8h10M4 12h10" />
    </svg>
  ),
  Tab: () => (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3 4l3 4-3 4M7 12h6" />
    </svg>
  ),
  Speaker: () => (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2 6h2.5L8 3v10L4.5 10H2V6z" />
      <path d="M11 5.5c.8.7 1.2 1.5 1.2 2.5s-.4 1.8-1.2 2.5M12.5 3.5c1.5 1.2 2.3 2.8 2.3 4.5s-.8 3.3-2.3 4.5" />
    </svg>
  ),
  Stop: () => (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <rect x="3.5" y="3.5" width="9" height="9" rx="1" />
    </svg>
  ),
  Check: () => (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3 8l3.5 3.5L13 4.5" />
    </svg>
  ),
  Spinner: () => (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 2.5a5.5 5.5 0 015.5 5.5" />
    </svg>
  ),
}

function Divider() {
  return <span className="status-divider" aria-hidden="true" />
}

export function StatusBar({ tab, autoSaveStatus = 'idle' }: StatusBarProps) {
  const { theme, toggleTheme, focusMode, toggleFocusMode, typewriterMode, toggleTypewriterMode, typewriterSound, toggleTypewriterSound, outlineVisible, toggleOutline, autoSave, toggleAutoSave, autoSaveDelay, setAutoSaveDelay, fontSize, headingNumbering, toggleHeadingNumbering, tagPanelVisible, toggleTagPanel, wordWrap, toggleWordWrap, showLineNumbers, toggleLineNumbers, selectionHighlight, toggleSelectionHighlight, wordGoal, setWordGoal, fontFamily, setFontFamily, tabSize, setTabSize, accentPreset, setAccentPreset } = useEditorStore()

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

  // 选区统计
  const [selInfo, setSelInfo] = useState<{ chars: number; words: number; lines: number } | null>(null)
  useEffect(() => {
    const updateSel = () => {
      const sel = window.getSelection()
      if (sel && sel.toString().trim()) {
        const text = sel.toString()
        setSelInfo({ chars: text.length, words: text.trim().split(/\s+/).length, lines: text.split('\n').length })
      } else {
        setSelInfo(null)
      }
    }
    document.addEventListener('mouseup', updateSel)
    document.addEventListener('keyup', updateSel)
    return () => { document.removeEventListener('mouseup', updateSel); document.removeEventListener('keyup', updateSel) }
  }, [])

  // 阅读时间估算
  const chineseChars = (tab.content.match(/[一-鿿]/g) || []).length
  const englishWords = (tab.content.match(/[a-zA-Z]+/g) || []).length
  const readingMinutes = Math.max(1, Math.ceil(chineseChars / 300 + englishWords / 200))
  const readingTime = readingMinutes < 60 ? `${readingMinutes} 分钟` : `${Math.floor(readingMinutes / 60)} 小时 ${readingMinutes % 60} 分`

  // 任务列表
  const taskAll = (tab.content.match(/- \[[ xX]\]/g) || []).length
  const taskDone = (tab.content.match(/- \[[xX]\]/g) || []).length
  const taskPercent = taskAll > 0 ? Math.round((taskDone / taskAll) * 100) : 0

  return (
    <div className="status-bar">
      {/* ═══════════ 左侧 — 文档信息 ═══════════ */}
      <div className="status-left">
        <span className="status-item" title={`光标位置：第 ${tab.cursorLine} 行，第 ${tab.cursorCol} 列`}>
          <Icon.Cursor />
          <span className="status-item-num">{tab.cursorLine}</span>
          <span className="status-item-label">:</span>
          <span className="status-item-num">{tab.cursorCol}</span>
        </span>

        <Divider />

        <span className="status-item" title={`字符数（不含空白 ${(tab.content.replace(/\s/g, '')).length}）`}>
          <Icon.Type />
          <span className="status-item-num">{charCount.toLocaleString()}</span>
        </span>
        <span className="status-item" title="词数">
          <Icon.Hash />
          <span className="status-item-num">{wordCount.toLocaleString()}</span>
        </span>
        <span className="status-item" title="行数">
          <Icon.Rows />
          <span className="status-item-num">{lineCount.toLocaleString()}</span>
        </span>
        <span className="status-item" title="段落数">
          <Icon.Paragraph />
          <span className="status-item-num">{paragraphCount.toLocaleString()}</span>
        </span>

        {taskAll > 0 && (
          <>
            <Divider />
            <span
              className={`status-progress ${taskPercent >= 100 ? 'status-progress-done' : 'status-progress-running'}`}
              title={`任务进度: ${taskDone}/${taskAll} 已完成（${taskPercent}%）`}
            >
              <Icon.CheckSquare />
              <span className="status-progress-track">
                <span className="status-progress-fill" style={{ width: `${taskPercent}%` }} />
              </span>
              <span className="status-progress-text">{taskDone}/{taskAll}</span>
            </span>
          </>
        )}

        {selInfo && (
          <>
            <Divider />
            <span className="status-item" title="选区统计" style={{ color: 'var(--accent-color)' }}>
              <Icon.Selection />
              <span className="status-item-num">{selInfo.chars}</span>
              <span className="status-item-label">选</span>
            </span>
          </>
        )}

        <Divider />

        <span className="status-item" title="预计阅读时间">
          <Icon.BookTime />
          <span className="status-item-num">{readingTime}</span>
        </span>

        {wordGoal > 0 ? (() => {
          const progress = Math.min(100, Math.round((wordCount / wordGoal) * 100))
          return (
            <>
              <Divider />
              <span
                className={`status-progress ${progress >= 100 ? 'status-progress-done' : 'status-progress-running'}`}
                title={`写作目标: ${wordCount}/${wordGoal} 词（${progress}%）`}
                onClick={() => {
                  const input = prompt('设置字数目标（输入 0 取消）:', String(wordGoal))
                  if (input !== null) setWordGoal(parseInt(input, 10) || 0)
                }}
              >
                <Icon.Target />
                <span className="status-progress-track">
                  <span className="status-progress-fill" style={{ width: `${progress}%` }} />
                </span>
                <span className="status-progress-text">{wordCount}/{wordGoal}</span>
              </span>
            </>
          )
        })() : (
          <>
            <Divider />
            <button
              className="status-btn"
              title="设置字数写作目标"
              onClick={() => {
                const input = prompt('设置字数目标:', '1000')
                if (input) setWordGoal(parseInt(input, 10) || 0)
              }}
            >
              <Icon.Target />
              <span>设目标</span>
            </button>
          </>
        )}

        {tab.isModified && autoSave && autoSaveStatus === 'saving' && (
          <>
            <Divider />
            <span className="status-save status-save-saving" title="正在自动保存…">
              <Icon.Spinner />
              <span>保存中</span>
            </span>
          </>
        )}
        {autoSaveStatus === 'saved' && (
          <>
            <Divider />
            <span className="status-save status-save-saved" title="已自动保存">
              <Icon.Check />
              <span>已保存</span>
            </span>
          </>
        )}
      </div>

      {/* ═══════════ 右侧 — 视图控制 ═══════════ */}
      <div className="status-right">
        <button
          className={`status-btn ${autoSave ? 'status-btn-active' : ''}`}
          onClick={toggleAutoSave}
          title={`自动保存: ${autoSave ? '已开启' : '已关闭'}`}
        >
          <Icon.Save />
          <span>自动保存</span>
        </button>
        <button
          className="status-btn"
          title={`自动保存延迟: ${(autoSaveDelay / 1000).toFixed(1)}秒（点击修改）`}
          onClick={() => {
            const input = prompt('自动保存延迟（秒）:', String(autoSaveDelay / 1000))
            if (input) setAutoSaveDelay(Math.max(0.5, parseFloat(input) || 2) * 1000)
          }}
        >
          <Icon.Clock />
          <span className="status-item-num">{(autoSaveDelay / 1000).toFixed(1)}s</span>
        </button>

        <Divider />

        <button
          className={`status-btn ${headingNumbering ? 'status-btn-active' : ''}`}
          onClick={toggleHeadingNumbering}
          title="标题自动编号"
        >
          <Icon.ListOrdered />
          <span>编号</span>
        </button>
        <button
          className={`status-btn ${tagPanelVisible ? 'status-btn-active' : ''}`}
          onClick={toggleTagPanel}
          title="标签面板"
        >
          <Icon.Tag />
          <span>标签</span>
        </button>
        <button
          className={`status-btn ${outlineVisible ? 'status-btn-active' : ''}`}
          onClick={toggleOutline}
          title="大纲面板 (Ctrl+Shift+O)"
        >
          <Icon.Outline />
          <span>大纲</span>
        </button>

        <Divider />

        <button
          className={`status-btn ${focusMode ? 'status-btn-active' : ''}`}
          onClick={toggleFocusMode}
          title="Focus 模式：只高亮当前段落"
        >
          <Icon.Focus />
          <span>Focus</span>
        </button>
        <button
          className={`status-btn ${typewriterMode ? 'status-btn-active' : ''}`}
          onClick={toggleTypewriterMode}
          title="Typewriter 模式：光标行始终居中"
        >
          <Icon.Typewriter />
          <span>打字机</span>
        </button>
        <button
          className={`status-btn ${typewriterSound ? 'status-btn-active' : ''}`}
          onClick={toggleTypewriterSound}
          title={`打字机音效：${typewriterSound ? '已开启' : '已关闭'}`}
        >
          <Icon.Sound />
          <span>音效</span>
        </button>
        <button className="status-btn" onClick={toggleTheme} title="切换主题">
          {theme === 'light' ? <Icon.Moon /> : <Icon.Sun />}
          <span>{theme === 'light' ? '暗色' : '亮色'}</span>
        </button>
        <button
          className="status-btn status-accent-btn"
          title="切换强调色主题"
          onClick={() => {
            const presets = ['blue', 'forest', 'berry', 'amber', 'ocean', 'rose']
            const idx = presets.indexOf(accentPreset)
            setAccentPreset(presets[(idx + 1) % presets.length])
          }}
        >
          <span className="status-accent-swatch" style={{ background: 'var(--accent-color)' }} />
          <span>{accentPreset === 'forest' ? '绿' : accentPreset === 'berry' ? '紫' : accentPreset === 'amber' ? '橙' : accentPreset === 'ocean' ? '青' : accentPreset === 'rose' ? '玫' : '蓝'}</span>
        </button>

        <Divider />

        <button
          className={`status-pomo ${pomoRunning ? (pomoMode === 'work' ? 'status-pomo-active' : 'status-pomo-break') : ''}`}
          title={`番茄钟 (${pomoMode === 'work' ? '工作' : '休息'}) - 点击${pomoRunning ? '暂停' : '开始'}`}
          onClick={() => {
            if (!pomoRunning && pomoSeconds === pomoTotal && pomoMode === 'work') {
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
          {pomoRunning && <span className="status-pomo-pulse" aria-hidden="true" />}
          <Icon.Tomato />
          <span>{String(Math.floor(pomoSeconds / 60)).padStart(2, '0')}:{String(pomoSeconds % 60).padStart(2, '0')}</span>
        </button>

        <Divider />

        <span className="status-item" title="字体大小 (Ctrl++/- 调整, Ctrl+0 重置)">
          <Icon.TextSize />
          <span className="status-item-num">{fontSize.toFixed(1)}</span>
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
          <Icon.FontFamily />
          <span>{fontFamily || '默认'}</span>
        </button>
        <button
          className={`status-btn ${wordWrap ? 'status-btn-active' : ''}`}
          onClick={toggleWordWrap}
          title="自动换行"
        >
          <Icon.Wrap />
          <span>换行</span>
        </button>
        <button
          className={`status-btn ${showLineNumbers ? 'status-btn-active' : ''}`}
          onClick={toggleLineNumbers}
          title="显示行号"
        >
          <Icon.LineNumbers />
          <span>行号</span>
        </button>
        <button
          className={`status-btn ${selectionHighlight ? 'status-btn-active' : ''}`}
          onClick={toggleSelectionHighlight}
          title={`选中匹配高亮：${selectionHighlight ? '已开启' : '已关闭'}（选中一个词，高亮所有出现位置）`}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 3h12M2 7h8M2 11h12M2 13.5h5" /><circle cx="13" cy="13.5" r="2" fill="currentColor" stroke="none" /></svg>
          <span>匹配</span>
        </button>
        <button
          className="status-btn"
          title="切换 Tab 大小"
          onClick={() => setTabSize(tabSize === 2 ? 4 : 2)}
        >
          <Icon.Tab />
          <span>Tab:{tabSize}</span>
        </button>

        <Divider />

        <span className="status-item" title="文件编码">UTF-8</span>
        <span className="status-item" title="文件类型">Markdown</span>

        <Divider />

        <button
          className="status-btn"
          title="朗读选中文字 / 停止朗读"
          onClick={() => {
            if (window.speechSynthesis.speaking) {
              window.speechSynthesis.cancel()
              return
            }
            const sel = window.getSelection()
            const text = sel?.toString().trim() || tab.content.slice(0, 5000)
            if (text) {
              const utter = new SpeechSynthesisUtterance(text)
              utter.lang = /[一-鿿]/.test(text) ? 'zh-CN' : 'en-US'
              utter.rate = 1
              window.speechSynthesis.speak(utter)
            }
          }}
        >
          {window.speechSynthesis.speaking ? <Icon.Stop /> : <Icon.Speaker />}
          <span>{window.speechSynthesis.speaking ? '停止' : '朗读'}</span>
        </button>
      </div>
    </div>
  )
}
