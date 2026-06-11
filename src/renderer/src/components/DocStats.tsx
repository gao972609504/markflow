/**
 * 文档统计面板
 * — 展示当前文档的详细统计信息
 */
import React, { useMemo } from 'react'
import { useEditorStore } from '../store/editorStore'

export function DocStats() {
  const { tabs, activeTabId, showDocStats, setShowDocStats } = useEditorStore()
  const activeTab = tabs.find((t) => t.id === activeTabId)

  const stats = useMemo(() => {
    if (!activeTab) return null
    const content = activeTab.content
    const lines = content.split('\n')
    const text = content.trim()

    // 基础统计
    const charCount = content.length
    const charNoSpaces = content.replace(/\s/g, '').length
    const lineCount = lines.length
    const emptyLines = lines.filter(l => !l.trim()).length
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim()).length
    const words = text ? text.split(/\s+/).length : 0

    // 中英文分别统计
    const chineseChars = (content.match(/[一-鿿]/g) || []).length
    const englishWords = (content.match(/[a-zA-Z]+/g) || []).length

    // 标题统计
    const headings = lines.filter(l => /^#{1,6}\s/.test(l))
    const headingCount = headings.length

    // 链接/图片统计
    const links = (content.match(/\[([^\]]+)\]\(([^)]+)\)/g) || []).length
    const images = (content.match(/!\[([^\]]*)\]\(([^)]+)\)/g) || []).length

    // 代码块统计
    const codeBlocks = (content.match(/```[\s\S]*?```/g) || []).length
    const inlineCode = (content.match(/`[^`]+`/g) || []).length

    // 任务列表
    const tasks = (content.match(/^(\s*)[-*+]\s\[([ xX])\]/gm) || []).length
    const tasksDone = (content.match(/^(\s*)[-*+]\s\[[xX]\]/gm) || []).length

    // 阅读时间
    const readingMinutes = Math.max(1, Math.ceil(chineseChars / 300 + englishWords / 200))
    const readingTime = readingMinutes < 60 ? `${readingMinutes} 分钟` : `${Math.floor(readingMinutes / 60)} 小时 ${readingMinutes % 60} 分`

    // 写作时间（按产出速度的一半估算）
    const writingMinutes = Math.max(1, Math.ceil(chineseChars / 100 + englishWords / 50))
    const writingTime = writingMinutes < 60 ? `${writingMinutes} 分钟` : `${Math.floor(writingMinutes / 60)} 小时 ${writingMinutes % 60} 分`

    // 最长行
    const longestLine = Math.max(...lines.map(l => l.length))

    // 平均行长
    const avgLineLength = lineCount > 0 ? Math.round(charCount / lineCount) : 0

    return {
      charCount, charNoSpaces, lineCount, emptyLines, paragraphs, words,
      chineseChars, englishWords, headingCount, links, images,
      codeBlocks, inlineCode, tasks, tasksDone,
      readingTime, writingTime, longestLine, avgLineLength
    }
  }, [activeTab?.content])

  if (!showDocStats || !stats) return null

  const rows = [
    { label: '总字符数', value: stats.charCount.toLocaleString() },
    { label: '字符数（不含空格）', value: stats.charNoSpaces.toLocaleString() },
    { label: '总行数', value: stats.lineCount.toLocaleString() },
    { label: '空行数', value: stats.emptyLines.toLocaleString() },
    { label: '段落数', value: stats.paragraphs.toLocaleString() },
    { label: '总词数', value: stats.words.toLocaleString() },
    { label: '中文字符', value: stats.chineseChars.toLocaleString() },
    { label: '英文单词', value: stats.englishWords.toLocaleString() },
    { label: '标题数量', value: stats.headingCount.toLocaleString() },
    { label: '链接数量', value: stats.links.toLocaleString() },
    { label: '图片数量', value: stats.images.toLocaleString() },
    { label: '代码块', value: stats.codeBlocks.toLocaleString() },
    { label: '行内代码', value: stats.inlineCode.toLocaleString() },
    { label: '任务列表', value: `${stats.tasksDone}/${stats.tasks} 已完成` },
    { label: '最长行', value: `${stats.longestLine} 字符` },
    { label: '平均行长', value: `${stats.avgLineLength} 字符` },
    { label: '📖 阅读时间', value: stats.readingTime },
    { label: '✍️ 写作时间', value: stats.writingTime },
  ]

  return (
    <div className="doc-stats-overlay" onClick={() => setShowDocStats(false)}>
      <div className="doc-stats-modal" onClick={e => e.stopPropagation()}>
        <div className="doc-stats-header">
          <h3>📊 文档统计</h3>
          <button className="doc-stats-close" onClick={() => setShowDocStats(false)}>×</button>
        </div>
        <div className="doc-stats-grid">
          {rows.map((row, i) => (
            <div key={i} className="doc-stats-row">
              <span className="doc-stats-label">{row.label}</span>
              <span className="doc-stats-value">{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
