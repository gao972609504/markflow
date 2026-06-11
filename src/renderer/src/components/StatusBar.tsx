import React from 'react'
import { Tab, useEditorStore } from '../store/editorStore'

interface StatusBarProps {
  tab: Tab
  autoSaveStatus?: 'idle' | 'saving' | 'saved'
}

export function StatusBar({ tab, autoSaveStatus = 'idle' }: StatusBarProps) {
  const { theme, toggleTheme, focusMode, toggleFocusMode, typewriterMode, toggleTypewriterMode, outlineVisible, toggleOutline, autoSave, toggleAutoSave, fontSize, headingNumbering, toggleHeadingNumbering, tagPanelVisible, toggleTagPanel, wordWrap, toggleWordWrap } = useEditorStore()

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
        <span className="status-item" title="字体大小 (Ctrl++/- 调整, Ctrl+0 重置)">
          🔤 {fontSize.toFixed(1)}px
        </span>
        <button
          className={`status-btn ${wordWrap ? 'status-btn-active' : ''}`}
          onClick={toggleWordWrap}
          title="自动换行"
        >
          ↩️ 换行
        </button>
        <span className="status-item">UTF-8</span>
        <span className="status-item">Markdown</span>
      </div>
    </div>
  )
}
