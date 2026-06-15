/**
 * 每日笔记 + 日历 (Daily Notes + Calendar)
 * — Obsidian/Notion/Logseq 核心笔记管理功能
 * — 月历视图，点击日期创建/打开当天笔记 (YYYY-MM-DD.md)
 * — 自动标记已有笔记的日期，支持月份导航
 */
import { useState, useMemo, useCallback, useEffect } from 'react'
import { useEditorStore, FileTreeNode } from '../store/editorStore'

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']
const MONTH_NAMES = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
const WEEKDAY_FULL = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})\.(md|markdown|mdx|txt)$/i

/** 格式化日期为 YYYY-MM-DD */
function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 递归扫描文件树，收集已存在的每日笔记日期 */
function collectNoteDates(nodes: FileTreeNode[], set: Set<string>) {
  for (const node of nodes) {
    if (!node.isDirectory) {
      const m = node.name.match(DATE_RE)
      if (m) set.add(`${m[1]}-${m[2]}-${m[3]}`)
    }
    if (node.children) collectNoteDates(node.children, set)
  }
}

/** 生成每日笔记模板 */
function buildTemplate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const weekday = WEEKDAY_FULL[date.getDay()]
  return `---\ndate: ${dateStr}\n---\n\n# ${dateStr} ${weekday}\n\n\n`
}

/** 拼接路径（兼容 Windows 反斜杠） */
function joinPath(folder: string, filename: string): string {
  return folder.endsWith('/') || folder.endsWith('\\') ? folder + filename : folder + '/' + filename
}

export function DailyNotes() {
  const { showDailyNotes, setShowDailyNotes, folderPath, fileTree, tabs } = useEditorStore()
  const today = new Date()
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1))

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowDailyNotes(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setShowDailyNotes])

  const todayStr = formatDate(today)

  // 收集已有每日笔记的日期（文件树 + 已打开标签）
  const noteDates = useMemo(() => {
    const set = new Set<string>()
    collectNoteDates(fileTree, set)
    for (const tab of tabs) {
      if (!tab.filePath) continue
      const name = tab.filePath.split(/[/\\]/).pop() || ''
      const m = name.match(DATE_RE)
      if (m) set.add(`${m[1]}-${m[2]}-${m[3]}`)
    }
    return set
  }, [fileTree, tabs])

  // 构建日历网格（周一起始，6 行 × 7 列）
  const calendarDays = useMemo(() => {
    const year = viewDate.getFullYear()
    const month = viewDate.getMonth()
    const firstDay = new Date(year, month, 1)
    // 周一 = 0 ... 周日 = 6
    let startOffset = firstDay.getDay() - 1
    if (startOffset < 0) startOffset = 6
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells: { date: Date | null; str: string | null }[] = []
    // 前置空格
    for (let i = 0; i < startOffset; i++) cells.push({ date: null, str: null })
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d)
      cells.push({ date, str: formatDate(date) })
    }
    // 补足到 42 格（6 周）
    while (cells.length < 42) cells.push({ date: null, str: null })
    return cells
  }, [viewDate])

  const prevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))
  const nextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))
  const goToday = () => setViewDate(new Date(today.getFullYear(), today.getMonth(), 1))

  const openDailyNote = useCallback(async (dateStr: string) => {
    const store = useEditorStore.getState()
    const filename = `${dateStr}.md`

    // 若已打开该日期的笔记，直接激活
    const existing = store.tabs.find(t => t.filePath && t.filePath.split(/[/\\]/).pop() === filename)
    if (existing) {
      store.setActiveTab(existing.id)
      store.setShowDailyNotes(false)
      return
    }

    if (store.folderPath && window.api) {
      const path = joinPath(store.folderPath, filename)
      try {
        const content = await window.api.readFile(path)
        store.createTab(path, content)
      } catch {
        // 文件不存在 → 创建
        const template = buildTemplate(dateStr)
        try {
          await window.api.writeFile(path, template)
          store.createTab(path, template)
        } catch {
          store.createTab(undefined, template)
        }
      }
    } else {
      // 未打开工作区 → 创建未命名标签
      store.createTab(undefined, buildTemplate(dateStr))
    }
    store.setShowDailyNotes(false)
  }, [])

  if (!showDailyNotes) return null

  return (
    <div className="dailynotes-overlay" onClick={() => setShowDailyNotes(false)}>
      <div className="dailynotes-modal" onClick={e => e.stopPropagation()}>
        <div className="dailynotes-header">
          <button className="dailynotes-nav-btn" onClick={prevMonth} title="上个月">‹</button>
          <div className="dailynotes-month-title">
            {viewDate.getFullYear()} 年 {MONTH_NAMES[viewDate.getMonth()]}
          </div>
          <button className="dailynotes-nav-btn" onClick={nextMonth} title="下个月">›</button>
          <button className="dailynotes-today-btn" onClick={goToday} title="回到今天">今天</button>
          <button className="dailynotes-close" onClick={() => setShowDailyNotes(false)} title="关闭 (Esc)">×</button>
        </div>

        {!folderPath && (
          <div className="dailynotes-warn">
            ⚠ 未打开工作区文件夹，新建的每日笔记将以未命名标签打开（不会保存到磁盘）。建议先「打开文件夹」。
          </div>
        )}

        <div className="dailynotes-weekdays">
          {WEEKDAYS.map(w => <div key={w} className="dailynotes-weekday">{w}</div>)}
        </div>

        <div className="dailynotes-grid">
          {calendarDays.map((cell, idx) => {
            if (!cell.date || !cell.str) {
              return <div key={idx} className="dailynotes-cell dailynotes-cell-empty" />
            }
            const isToday = cell.str === todayStr
            const hasNote = noteDates.has(cell.str)
            const isWeekend = cell.date.getDay() === 0 || cell.date.getDay() === 6
            return (
              <button
                key={idx}
                className={`dailynotes-cell ${isToday ? 'dailynotes-cell-today' : ''} ${hasNote ? 'dailynotes-cell-has-note' : ''} ${isWeekend ? 'dailynotes-cell-weekend' : ''}`}
                onClick={() => openDailyNote(cell.str!)}
                title={hasNote ? `${cell.str}（已有笔记，点击打开）` : `${cell.str}（点击创建笔记）`}
              >
                <span className="dailynotes-day-num">{cell.date.getDate()}</span>
                {hasNote && <span className="dailynotes-dot" />}
              </button>
            )
          })}
        </div>

        <div className="dailynotes-footer">
          <span className="dailynotes-stat">
            本月已写 <strong>{[...noteDates].filter(d => d.startsWith(formatDate(viewDate).slice(0, 7))).length}</strong> 篇
          </span>
          <span className="dailynotes-legend">
            <span className="dailynotes-legend-item"><i className="dailynotes-legend-dot today" /> 今天</span>
            <span className="dailynotes-legend-item"><i className="dailynotes-legend-dot" /> 有笔记</span>
          </span>
        </div>
      </div>
    </div>
  )
}
