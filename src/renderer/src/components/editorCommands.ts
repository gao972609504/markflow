/**
 * 编辑器命令函数集合
 * — 从 Editor.tsx 拆分：所有 keymap/工具栏触发的 (view) => boolean 命令、
 *   光标历史栈、表格操作、Markdown 格式化、插入、toggle 等
 */
import { EditorView } from '@codemirror/view'
import { EditorSelection, StateEffect } from '@codemirror/state'
import { foldEffect, unfoldEffect, foldedRanges } from '@codemirror/language'
import { normalizeDocument } from '../utils/normalize'
import { useEditorStore } from '../store/editorStore'
import { loadCustomSnippets } from './SnippetManager'

export function wrapSel(view: EditorView, mark: string) {
  const { from, to } = view.state.selection.main
  const sel = view.state.sliceDoc(from, to)
  if (sel) {
    const bm = view.state.sliceDoc(from - mark.length, from)
    const am = view.state.sliceDoc(to, to + mark.length)
    if (bm === mark && am === mark) {
      view.dispatch({
        changes: [{ from: to, to: to + mark.length, insert: '' }, { from: from - mark.length, to: from, insert: '' }],
        selection: { anchor: from - mark.length, head: to - mark.length }
      })
    } else {
      view.dispatch({
        changes: [{ from: to, to, insert: mark }, { from, to: from, insert: mark }],
        selection: { anchor: from + mark.length, head: to + mark.length }
      })
    }
  } else {
    view.dispatch({ changes: { from, to, insert: mark + mark }, selection: { anchor: from + mark.length } })
  }
}

export function autoContinueList(view: EditorView): boolean {
  const { head } = view.state.selection.main
  const line = view.state.doc.lineAt(head)
  const t = line.text

  // 代码块自动闭合：输入 ``` 后按 Enter 自动添加闭合 ```
  const fence = t.match(/^(\s*)```\s*(\w*)\s*$/)
  if (fence && head >= line.from + fence[1].length + 3) {
    const insert = `\n\n${fence[1]}\`\`\``
    view.dispatch({
      changes: { from: head, insert },
      selection: { anchor: head + 1 }
    })
    return true
  }
  // Callout 块自动闭合：输入 :::type 后按 Enter 自动添加闭合 :::
  const callout = t.match(/^(\s*):::(tip|info|warning|danger|note|quote|success|bug|example|question)\s*$/i)
  if (callout) {
    const insert = `\n\n${callout[1]}:::`
    view.dispatch({
      changes: { from: head, insert },
      selection: { anchor: head + 1 }
    })
    return true
  }

  // 任务列表必须在无序列表之前匹配，否则 [-*+] 会先命中 ul 分支
  const tk = t.match(/^(\s*)([-*+])\s\[([ xX])\]\s(.*)$/)
  if (tk) {
    if (!tk[4].trim()) { view.dispatch({ changes: { from: line.from, to: line.to, insert: '' }, selection: { anchor: line.from } }); return true }
    view.dispatch({ changes: { from: head, insert: `\n${tk[1]}${tk[2]} [ ] ` }, selection: { anchor: head + 1 + tk[1].length + 6 } })
    return true
  }
  const ul = t.match(/^(\s*)([-*+])\s(.*)$/)
  if (ul) {
    if (!ul[3].trim()) { view.dispatch({ changes: { from: line.from, to: line.to, insert: '' }, selection: { anchor: line.from } }); return true }
    view.dispatch({ changes: { from: head, insert: `\n${ul[1]}${ul[2]} ` }, selection: { anchor: head + 1 + ul[1].length + 2 } })
    return true
  }
  const ol = t.match(/^(\s*)(\d+)\.\s(.*)$/)
  const qt = t.match(/^(>\s?)(.*)$/)
  if (qt) {
    if (!qt[2].trim()) { view.dispatch({ changes: { from: line.from, to: line.to, insert: '' }, selection: { anchor: line.from } }); return true }
    view.dispatch({ changes: { from: head, insert: `\n${qt[1]}` }, selection: { anchor: head + 1 + qt[1].length } })
    return true
  }
  return false
}

// ============ 行操作工具函数 ============

export function moveLineUp(view: EditorView): boolean {
  const { head } = view.state.selection.main
  const line = view.state.doc.lineAt(head)
  if (line.number <= 1) return false
  const prevLine = view.state.doc.line(line.number - 1)
  view.dispatch({
    changes: [
      { from: prevLine.from, to: prevLine.to, insert: line.text },
      { from: line.from, to: line.to, insert: prevLine.text }
    ],
    selection: { anchor: head - prevLine.text.length - 1 }
  })
  return true
}

export function moveLineDown(view: EditorView): boolean {
  const { head } = view.state.selection.main
  const line = view.state.doc.lineAt(head)
  if (line.number >= view.state.doc.lines) return false
  const nextLine = view.state.doc.line(line.number + 1)
  view.dispatch({
    changes: [
      { from: line.from, to: line.to, insert: nextLine.text },
      { from: nextLine.from, to: nextLine.to, insert: line.text }
    ],
    selection: { anchor: head + nextLine.text.length + 1 }
  })
  return true
}

export function duplicateLine(view: EditorView): boolean {
  const { head } = view.state.selection.main
  const line = view.state.doc.lineAt(head)
  view.dispatch({
    changes: { from: line.to, to: line.to, insert: '\n' + line.text },
    selection: { anchor: head + line.text.length + 1 }
  })
  return true
}

export function deleteLine(view: EditorView): boolean {
  const { head } = view.state.selection.main
  const line = view.state.doc.lineAt(head)
  const from = line.from
  const to = line.to + (line.to < view.state.doc.length ? 1 : 0)
  view.dispatch({
    changes: { from, to: Math.min(to, view.state.doc.length), insert: '' },
    selection: { anchor: from }
  })
  return true
}

export function insertLineBelow(view: EditorView): boolean {
  const { head } = view.state.selection.main
  const line = view.state.doc.lineAt(head)
  const indent = line.text.match(/^\s*/)?.[0] || ''
  view.dispatch({
    changes: { from: line.to, to: line.to, insert: '\n' + indent },
    selection: { anchor: line.to + 1 + indent.length }
  })
  return true
}

export function insertLineAbove(view: EditorView): boolean {
  const { head } = view.state.selection.main
  const line = view.state.doc.lineAt(head)
  const indent = line.text.match(/^\s*/)?.[0] || ''
  view.dispatch({
    changes: { from: line.from, to: line.from, insert: indent + '\n' },
    selection: { anchor: line.from + indent.length }
  })
  return true
}

// ============ Markdown 表格自动格式化 ============

export function formatMarkdownTable(view: EditorView): boolean {
  const { head } = view.state.selection.main
  const doc = view.state.doc
  const lineNum = doc.lineAt(head).number

  // 向上查找表格起始行
  let startLine = lineNum
  while (startLine > 1 && /^\|/.test(doc.line(startLine - 1).text.trim())) startLine--
  // 向下查找表格结束行
  let endLine = lineNum
  while (endLine < doc.lines && /^\|/.test(doc.line(endLine + 1).text.trim())) endLine++

  if (startLine === endLine) return false // 不是表格

  // 解析表格行
  const rows: string[][] = []
  const isSeparator: boolean[] = []
  for (let i = startLine; i <= endLine; i++) {
    const text = doc.line(i).text.trim()
    const cells = text.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length)
    rows.push(cells)
    isSeparator.push(/^\|[\s\-:|]+\|$/.test(text))
  }

  if (rows.length === 0) return false

  // 计算每列最大宽度
  const colCount = Math.max(...rows.map(r => r.length))
  const maxWidths: number[] = []
  for (let c = 0; c < colCount; c++) {
    maxWidths[c] = Math.max(3, ...rows.map(r => (r[c] || '').length))
  }

  // 重新格式化
  const changes: { from: number; to: number; insert: string }[] = []
  for (let i = 0; i < rows.length; i++) {
    const line = doc.line(startLine + i)
    const cells = rows[i]
    let formatted: string
    if (isSeparator[i]) {
      formatted = '|' + cells.map((c, ci) => {
        const w = maxWidths[ci] || 3
        if (c.includes(':') && c.endsWith(':')) return ' ' + ':'.padEnd(w - 1, '-') + ':'
        if (c.endsWith(':')) return ' '.padEnd(w - 1, '-') + ':'
        if (c.startsWith(':')) return ':' + '-'.padEnd(w - 1, '-')
        return ' ' + '-'.repeat(w - 2) + ' '
      }).join('|') + '|'
    } else {
      formatted = '| ' + cells.map((c, ci) => {
        const w = maxWidths[ci] || 3
        return c.padEnd(w)
      }).join(' | ') + ' |'
    }
    if (line.text !== formatted) {
      changes.push({ from: line.from, to: line.to, insert: formatted })
    }
  }

  if (changes.length === 0) return false
  view.dispatch({ changes })
  return true
}

// ============ 表格排序与转置 ============

/** 解析光标所在的 Markdown 表格 */
export function parseTableAt(view: EditorView): { startLine: number; endLine: number; rows: string[][]; isSep: boolean[]; sepIndex: number } | null {
  const { head } = view.state.selection.main
  const doc = view.state.doc
  const lineNum = doc.lineAt(head).number
  let startLine = lineNum
  while (startLine > 1 && /^\|/.test(doc.line(startLine - 1).text.trim())) startLine--
  let endLine = lineNum
  while (endLine < doc.lines && /^\|/.test(doc.line(endLine + 1).text.trim())) endLine++
  if (startLine === endLine) return null
  const rows: string[][] = []
  const isSep: boolean[] = []
  let sepIndex = -1
  for (let i = startLine; i <= endLine; i++) {
    const text = doc.line(i).text.trim()
    const sep = /^\|[\s\-:|]+\|$/.test(text)
    isSep.push(sep)
    if (sep && sepIndex < 0) sepIndex = i - startLine
    rows.push(text.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length))
  }
  return { startLine, endLine, rows, isSep, sepIndex }
}

/** 将行二维数组重建为对齐的 Markdown 表格文本行 */
export function rebuildTableLines(rows: string[][], isSep: boolean[]): string[] {
  const colCount = Math.max(...rows.map(r => r.length))
  const maxWidths: number[] = []
  for (let c = 0; c < colCount; c++) maxWidths[c] = Math.max(3, ...rows.map(r => (r[c] || '').length))
  return rows.map((cells, i) => {
    if (isSep[i]) {
      return '|' + cells.map((c, ci) => {
        const w = maxWidths[ci] || 3
        if (c.includes(':') && c.endsWith(':')) return ' ' + ':'.padEnd(w - 1, '-') + ':'
        if (c.endsWith(':')) return ' '.padEnd(w - 1, '-') + ':'
        if (c.startsWith(':')) return ':' + '-'.padEnd(w - 1, '-')
        return ' ' + '-'.repeat(w - 2) + ' '
      }).join('|') + '|'
    }
    const padded: string[] = []
    for (let ci = 0; ci < colCount; ci++) padded.push((cells[ci] || '').padEnd(maxWidths[ci] || 3))
    return '| ' + padded.join(' | ') + ' |'
  })
}

/** 按光标所在列排序表格（Mod-Alt-S 升序 / Shift-Mod-Alt-S 降序） */
export function sortTable(view: EditorView, desc = false): boolean {
  const t = parseTableAt(view)
  if (!t || t.sepIndex < 1) return false
  const doc = view.state.doc
  const header = t.rows[0]
  const dataRows = t.rows.slice(t.sepIndex + 1)
  if (dataRows.length === 0) return false

  // 光标所在列
  const curLine = doc.lineAt(view.state.selection.main.head)
  let col = 0
  if (/^\|/.test(curLine.text.trim())) {
    const before = curLine.text.slice(0, view.state.selection.main.head - curLine.from)
    col = Math.min(Math.max(0, (before.match(/\|/g) || []).length - 1), header.length - 1)
  }

  // 数值列检测（兼容千分位逗号）
  const isNumeric = dataRows.every(r => {
    const v = (r[col] || '').trim().replace(/[,，]/g, '')
    return v === '' || !isNaN(Number(v))
  })

  dataRows.sort((a, b) => {
    const av = (a[col] || '').trim().replace(/[,，]/g, '')
    const bv = (b[col] || '').trim().replace(/[,，]/g, '')
    const cmp = isNumeric ? (Number(av) || 0) - (Number(bv) || 0) : av.localeCompare(bv, 'zh-Hans-CN')
    return desc ? -cmp : cmp
  })

  const newRows = [...t.rows.slice(0, t.sepIndex + 1), ...dataRows]
  const newIsSep = [...t.isSep.slice(0, t.sepIndex + 1), ...dataRows.map(() => false)]
  const lines = rebuildTableLines(newRows, newIsSep)

  const changes: { from: number; to: number; insert: string }[] = []
  for (let i = 0; i < lines.length; i++) {
    const line = doc.line(t.startLine + i)
    if (line.text !== lines[i]) changes.push({ from: line.from, to: line.to, insert: lines[i] })
  }
  if (changes.length === 0) return false
  view.dispatch({ changes })
  return true
}

/** 转置表格（行列互换）Mod-Alt-R */
export function transposeTable(view: EditorView): boolean {
  const t = parseTableAt(view)
  if (!t || t.sepIndex < 1) return false
  const doc = view.state.doc
  const matrix = [t.rows[0], ...t.rows.slice(t.sepIndex + 1)] // 表头 + 数据行
  if (matrix.length === 0) return false
  const cols = Math.max(...matrix.map(r => r.length))
  const rows = matrix.length

  const transposed: string[][] = []
  for (let c = 0; c < cols; c++) {
    const newRow: string[] = []
    for (let r = 0; r < rows; r++) newRow.push(matrix[r][c] ?? '')
    transposed.push(newRow)
  }
  if (transposed.length <= 1) return false

  // 第一行作表头，第二行分隔符，其余数据
  const newIsSep = transposed.map((_, i) => i === 1)
  // 重建分隔符行（全是 ---）
  const sepCells = transposed[0].map(() => '---')
  const newRows = [transposed[0], sepCells, ...transposed.slice(1)]
  const finalIsSep = [false, true, ...transposed.slice(1).map(() => false)]
  const lines = rebuildTableLines(newRows, finalIsSep)

  const origCount = t.endLine - t.startLine + 1
  const newCount = newRows.length
  const changes: { from: number; to: number; insert: string }[] = []
  // 替换重叠部分（仅限原表格范围内的行，避免越界到表外内容）
  const overlap = Math.min(origCount, newCount)
  for (let i = 0; i < overlap; i++) {
    const line = doc.line(t.startLine + i)
    if (line.text !== lines[i]) changes.push({ from: line.from, to: line.to, insert: lines[i] })
  }
  if (newCount > origCount) {
    // 行数变多：在表格末尾追加新行
    const lastLine = doc.line(t.endLine)
    changes.push({ from: lastLine.to, to: lastLine.to, insert: '\n' + lines.slice(origCount).join('\n') })
  } else if (newCount < origCount) {
    // 行数变少：删除多余旧行
    const delFrom = doc.line(t.startLine + newCount).from
    const delTo = doc.line(t.endLine).to
    changes.push({ from: delFrom, to: delTo, insert: '' })
  }
  if (changes.length === 0) return false
  view.dispatch({ changes })
  return true
}

// ============ 日期时间插入 ============

export function pad2(n: number) { return String(n).padStart(2, '0') }
export function insertAtCursor(view: EditorView, text: string): boolean {
  const sel = view.state.selection.main
  view.dispatch({ changes: { from: sel.from, to: sel.to, insert: text }, selection: { anchor: sel.from + text.length } })
  return true
}

export function insertDate(view: EditorView): boolean {
  const d = new Date()
  return insertAtCursor(view, `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`)
}
export function insertTime(view: EditorView): boolean {
  const d = new Date()
  return insertAtCursor(view, `${pad2(d.getHours())}:${pad2(d.getMinutes())}`)
}
export function insertDateTime(view: EditorView): boolean {
  const d = new Date()
  return insertAtCursor(view, `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`)
}
export function insertTimestamp(view: EditorView): boolean {
  return insertAtCursor(view, new Date().toISOString())
}
export function insertWeekday(view: EditorView): boolean {
  const names = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  return insertAtCursor(view, names[new Date().getDay()])
}

export function addCursorAbove(view: EditorView): boolean {
  const sel = view.state.selection
  const ranges = sel.ranges.map(r => r)
  const newRanges: typeof ranges = []
  for (const range of ranges) {
    const line = view.state.doc.lineAt(range.head)
    if (line.number > 1) {
      const prevLine = view.state.doc.line(line.number - 1)
      const pos = Math.min(range.head - line.from, prevLine.length) + prevLine.from
      newRanges.push(EditorSelection.range(pos, pos))
    }
    newRanges.push(range)
  }
  if (newRanges.length === ranges.length) return false
  view.dispatch({ selection: EditorSelection.create(newRanges) })
  return true
}

export function addCursorBelow(view: EditorView): boolean {
  const sel = view.state.selection
  const ranges = sel.ranges.map(r => r)
  const newRanges: typeof ranges = []
  for (const range of ranges) {
    newRanges.push(range)
    const line = view.state.doc.lineAt(range.head)
    if (line.number < view.state.doc.lines) {
      const nextLine = view.state.doc.line(line.number + 1)
      const pos = Math.min(range.head - line.from, nextLine.length) + nextLine.from
      newRanges.push(EditorSelection.range(pos, pos))
    }
  }
  if (newRanges.length === ranges.length) return false
  view.dispatch({ selection: EditorSelection.create(newRanges) })
  return true
}

// ============ Markdown 片段快捷扩展 ============

const snippets: Record<string, string> = {
  'img': '![](url)',
  'link': '[text](url)',
  'code': '```\n\n```',
  'table': '| 列1 | 列2 | 列3 |\n| --- | --- | --- |\n| 内容 | 内容 | 内容 |',
  'table4': '| 列1 | 列2 | 列3 | 列4 |\n| --- | --- | --- | --- |\n| 内容 | 内容 | 内容 | 内容 |',
  'table5': '| 列1 | 列2 | 列3 | 列4 | 列5 |\n| --- | --- | --- | --- | --- |\n| 内容 | 内容 | 内容 | 内容 | 内容 |',
  'task': '- [ ] 任务项',
  'h1': '# ',
  'h2': '## ',
  'h3': '### ',
  'quote': '> ',
  'bold': '**粗体**',
  'italic': '*斜体*',
  'strike': '~~删除线~~',
  'hr': '---',
  'math': '$$\n\n$$',
  'callout': ':::tip\n\n:::',
  'footnote': '[^1]: ',
  'date': new Date().toLocaleDateString('zh-CN'),
  'time': new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
}

export function expandSnippet(view: EditorView): boolean {
  const sel = view.state.selection.main
  if (sel.from !== sel.to) return false
  const line = view.state.doc.lineAt(sel.from)
  const textBefore = line.text.slice(0, sel.from - line.from)
  const wordMatch = textBefore.match(/(\w+)$/)
  if (!wordMatch) return false
  const trigger = wordMatch[1]
  // 合并自定义片段（优先于内置片段）
  const custom = loadCustomSnippets()
  const allSnippets: Record<string, string> = { ...snippets }
  for (const s of custom) {
    allSnippets[s.trigger] = s.expansion
  }
  const expansion = allSnippets[trigger]
  if (!expansion) return false
  const triggerStart = sel.from - trigger.length
  view.dispatch({
    changes: { from: triggerStart, to: sel.from, insert: expansion },
    selection: { anchor: triggerStart + expansion.length }
  })
  return true
}

// ============ 标题层级升降 ============

export function promoteHeading(view: EditorView): boolean {
  const { head } = view.state.selection.main
  const line = view.state.doc.lineAt(head)
  const m = line.text.match(/^(#{1,6})\s/)
  if (!m) return false
  const level = m[1].length
  if (level <= 1) return false
  const newHash = '#'.repeat(level - 1)
  view.dispatch({
    changes: { from: line.from, to: line.from + level, insert: newHash + ' ' },
    selection: { anchor: head - 1 }
  })
  return true
}

export function demoteHeading(view: EditorView): boolean {
  const { head } = view.state.selection.main
  const line = view.state.doc.lineAt(head)
  const m = line.text.match(/^(#{1,6})\s/)
  if (!m) return false
  const level = m[1].length
  if (level >= 6) return false
  const newHash = '#'.repeat(level + 1)
  view.dispatch({
    changes: { from: line.from, to: line.from + level, insert: newHash + ' ' },
    selection: { anchor: head + 1 }
  })
  return true
}

// ============ 有序列表自动编号 ============

// 自动闭合括号
export function autoClosePair(view: EditorView, open: string, close: string): boolean {
  const { from, to } = view.state.selection.main
  const sel = view.state.sliceDoc(from, to)
  if (sel) {
    // 有选区时包裹选中内容
    view.dispatch({
      changes: [{ from, to, insert: open + sel + close }],
      selection: { anchor: from + 1, head: from + 1 + sel.length }
    })
    return true
  }
  view.dispatch({
    changes: { from, to, insert: open + close },
    selection: { anchor: from + 1 }
  })
  return true
}

export function renumberLists(view: EditorView): boolean {
  const { head } = view.state.selection.main
  const doc = view.state.doc
  const lineNum = doc.lineAt(head).number
  // 找到当前行的缩进和列表编号
  const currentLine = doc.line(lineNum)
  const listMatch = currentLine.text.match(/^(\s*)(\d+)\.\s/)
  if (!listMatch) return false
  const indent = listMatch[1].length
  const changes: { from: number; to: number; insert: string }[] = []
  // 从当前行向上找到列表开始
  let startLine = lineNum
  while (startLine > 1) {
    const prev = doc.line(startLine - 1)
    const prevMatch = prev.text.match(new RegExp(`^\\s{0,${indent}}\\d+\\.\\s`))
    if (prevMatch && prev.text.match(/^(\s*)/)![1].length === indent) startLine--
    else break
  }
  // 重新编号
  let num = 1
  for (let i = startLine; i <= doc.lines; i++) {
    const l = doc.line(i)
    const m = l.text.match(new RegExp(`^(\\s{${indent}})(\\d+)\\.(\\s.*)$`))
    if (!m) break
    if (parseInt(m[2]) !== num) {
      changes.push({ from: l.from + indent, to: l.from + indent + m[2].length, insert: String(num) })
    }
    num++
  }
  if (changes.length === 0) return false
  // 延迟执行，让原始 Backspace/Delete 先完成
  setTimeout(() => {
    const v = view
    if (v) v.dispatch({ changes })
  }, 0)
  return false // 不阻止原始操作
}

// ============ 文档书签 ============

export function toggleBookmark(view: EditorView): boolean {
  const { head } = view.state.selection.main
  const line = view.state.doc.lineAt(head)
  const store = useEditorStore.getState()
  const tabId = store.activeTabId
  if (!tabId) return false
  const bm = store.getBookmarks(tabId)
  const existing = bm.find(b => b.line === line.number)
  if (existing) {
    store.removeBookmark(tabId, line.number)
  } else {
    const label = line.text.slice(0, 40).trim() || `行 ${line.number}`
    store.addBookmark(tabId, line.number, label)
  }
  return true
}

export function nextBookmark(view: EditorView): boolean {
  const store = useEditorStore.getState()
  const tabId = store.activeTabId
  if (!tabId) return false
  const bm = store.getBookmarks(tabId)
  if (bm.length === 0) return false
  const { head } = view.state.selection.main
  const curLine = view.state.doc.lineAt(head).number
  const sorted = [...bm].sort((a, b) => a.line - b.line)
  const next = sorted.find(b => b.line > curLine) || sorted[0]
  const targetLine = view.state.doc.line(next.line)
  view.dispatch({ selection: { anchor: targetLine.from }, effects: EditorView.scrollIntoView(targetLine.from) })
  return true
}

export function prevBookmark(view: EditorView): boolean {
  const store = useEditorStore.getState()
  const tabId = store.activeTabId
  if (!tabId) return false
  const bm = store.getBookmarks(tabId)
  if (bm.length === 0) return false
  const { head } = view.state.selection.main
  const curLine = view.state.doc.lineAt(head).number
  const sorted = [...bm].sort((a, b) => b.line - a.line)
  const prev = sorted.find(b => b.line < curLine) || sorted[0]
  const targetLine = view.state.doc.line(prev.line)
  view.dispatch({ selection: { anchor: targetLine.from }, effects: EditorView.scrollIntoView(targetLine.from) })
  return true
}

// ============ 折叠到级别 ============

export function foldToLevel(view: EditorView, level: number): boolean {
  const effects: StateEffect<unknown>[] = []
  const doc = view.state.doc
  for (let i = 1; i <= doc.lines; i++) {
    const line = doc.line(i)
    const m = line.text.match(/^(#{1,6})\s/)
    if (!m) continue
    const headingLevel = m[1].length
    if (headingLevel > level) continue
    // Find fold range same as foldService
    let endLine = i
    for (let j = i + 1; j <= doc.lines; j++) {
      const nextText = doc.line(j).text
      const nextMatch = nextText.match(/^(#{1,6})\s/)
      if (nextMatch && nextMatch[1].length <= headingLevel) break
      endLine = j
    }
    if (endLine > i) {
      effects.push(foldEffect.of({ from: line.to, to: doc.line(endLine).to }))
    }
  }
  if (effects.length > 0) view.dispatch({ effects })
  return true
}

export function unfoldAll(view: EditorView): boolean {
  const effects: StateEffect<unknown>[] = []
  const folded = foldedRanges(view.state)
  folded.between(0, view.state.doc.length, (from: number, to: number) => {
    effects.push(unfoldEffect.of({ from, to }))
  })
  if (effects.length > 0) view.dispatch({ effects })
  return effects.length > 0
}

// ============ 快速插入表格 ============

export function insertTable(view: EditorView): boolean {
  const input = prompt('插入表格 (行数x列数，如 3x4):', '3x3')
  if (!input) return false
  const m = input.match(/(\d+)\s*[x×X]\s*(\d+)/)
  if (!m) return false
  const rows = Math.min(20, Math.max(1, parseInt(m[1])))
  const cols = Math.min(10, Math.max(1, parseInt(m[2])))
  const header = '| ' + Array.from({ length: cols }, (_, i) => `列${i + 1}`).join(' | ') + ' |'
  const sep = '| ' + Array.from({ length: cols }, () => '---').join(' | ') + ' |'
  const rows_str = Array.from({ length: rows - 1 }, () => '| ' + Array.from({ length: cols }, () => '内容').join(' | ') + ' |')
  const table = '\n' + [header, sep, ...rows_str].join('\n') + '\n'
  const pos = view.state.selection.main.head
  view.dispatch({ changes: { from: pos, insert: table }, selection: { anchor: pos + table.length } })
  return true
}

// ============ 表格单元格 Tab 导航 ============

export function tableCellNav(view: EditorView, forward: boolean): boolean {
  const { head } = view.state.selection.main
  const doc = view.state.doc
  const lineNum = doc.lineAt(head).number
  const line = doc.line(lineNum)
  // 检查当前行是否是表格行
  if (!/^\|/.test(line.text.trim())) return false
  // 也要检查上下文是否是表格（至少有分隔行）
  if (lineNum > 1 && !/^\|/.test(doc.line(lineNum - 1).text.trim()) && !/^\|/.test(doc.line(Math.min(lineNum + 1, doc.lines)).text.trim())) return false

  const colOffset = head - line.from
  const cells = line.text.split('|')
  // 计算 pipe 位置
  let pos = 0
  let cellIdx = 0
  for (let i = 0; i < cells.length; i++) {
    pos += cells[i].length + 1 // +1 for |
    if (pos > colOffset) { cellIdx = i; break }
  }

  if (forward) {
    // 移动到下一个 cell 或下一行第一个 cell
    if (cellIdx < cells.length - 2) {
      const nextPipeIdx = cells.slice(0, cellIdx + 1).join('|').length + 1
      const nextCellEnd = cells.slice(0, cellIdx + 2).join('|').length
      view.dispatch({ selection: { anchor: line.from + nextPipeIdx, head: line.from + nextCellEnd } })
    } else if (lineNum < doc.lines) {
      const nextLine = doc.line(lineNum + 1)
      if (/^\|/.test(nextLine.text.trim())) {
        const firstPipe = nextLine.text.indexOf('|')
        const secondPipe = nextLine.text.indexOf('|', firstPipe + 1)
        if (secondPipe > firstPipe) {
          view.dispatch({ selection: { anchor: nextLine.from + firstPipe + 1, head: nextLine.from + secondPipe } })
        }
      }
    }
  } else {
    if (cellIdx > 1) {
      const prevPipeIdx = cells.slice(0, cellIdx - 1).join('|').length + 1
      const prevCellEnd = cells.slice(0, cellIdx).join('|').length
      view.dispatch({ selection: { anchor: line.from + prevPipeIdx, head: line.from + prevCellEnd } })
    } else if (lineNum > 1) {
      const prevLine = doc.line(lineNum - 1)
      if (/^\|/.test(prevLine.text.trim())) {
        const prevCells = prevLine.text.split('|')
        const lastStart = prevCells.slice(0, prevCells.length - 2).join('|').length + 1
        const lastEnd = prevCells.slice(0, prevCells.length - 1).join('|').length
        view.dispatch({ selection: { anchor: prevLine.from + lastStart, head: prevLine.from + lastEnd } })
      }
    }
  }
  return true
}

// ============ 列表项缩进/反缩进 ============

export function indentListItem(view: EditorView): boolean {
  const { head } = view.state.selection.main
  const line = view.state.doc.lineAt(head)
  const listMatch = line.text.match(/^(\s*)([-*+]|\d+\.)\s/)
  if (!listMatch) return false
  const indent = listMatch[1]
  const ts = useEditorStore.getState().tabSize
  view.dispatch({
    changes: { from: line.from, to: line.from + indent.length, insert: indent + ' '.repeat(ts) },
    selection: { anchor: head + ts }
  })
  return true
}

export function dedentListItem(view: EditorView): boolean {
  const { head } = view.state.selection.main
  const line = view.state.doc.lineAt(head)
  const listMatch = line.text.match(/^(\s+)([-*+]|\d+\.)\s/)
  if (!listMatch) return false
  const indent = listMatch[1]
  const ts = useEditorStore.getState().tabSize
  const removeCount = Math.min(ts, indent.length)
  if (removeCount === 0) return false
  view.dispatch({
    changes: { from: line.from, to: line.from + removeCount, insert: '' },
    selection: { anchor: head - removeCount }
  })
  return true
}

// ============ 选区大小写转换 ============

export function transformCase(view: EditorView, mode: 'upper' | 'lower' | 'title' | 'sentence'): boolean {
  const { from, to } = view.state.selection.main
  if (from === to) return false
  const text = view.state.sliceDoc(from, to)
  let transformed: string
  if (mode === 'upper') transformed = text.toUpperCase()
  else if (mode === 'lower') transformed = text.toLowerCase()
  else if (mode === 'sentence') transformed = text.charAt(0).toUpperCase() + text.slice(1).replace(/([.!?。！？]\s+)([a-z一-龥])/g, (_m, p, c) => p + c.toUpperCase())
  else transformed = text.replace(/\b\w/g, c => c.toUpperCase())
  if (transformed === text) return false
  view.dispatch({ changes: { from, to, insert: transformed }, selection: { anchor: from, head: from + transformed.length } })
  return true
}

// ============ 选区行排序 ============

export function sortSelectedLines(view: EditorView): boolean {
  const { from, to } = view.state.selection.main
  if (from === to) return false
  const text = view.state.sliceDoc(from, to)
  const lines = text.split('\n')
  if (lines.length <= 1) return false
  const sorted = [...lines].sort((a, b) => a.localeCompare(b, 'zh-CN'))
  if (sorted.join('\n') === text) return false
  view.dispatch({ changes: { from, to, insert: sorted.join('\n') }, selection: { anchor: from, head: from + sorted.join('\n').length } })
  return true
}

export function reverseSelectedLines(view: EditorView): boolean {
  const { from, to } = view.state.selection.main
  if (from === to) return false
  const text = view.state.sliceDoc(from, to)
  const lines = text.split('\n')
  if (lines.length <= 1) return false
  const reversed = [...lines].reverse()
  view.dispatch({ changes: { from, to, insert: reversed.join('\n') }, selection: { anchor: from, head: from + reversed.join('\n').length } })
  return true
}

export function uniqueSelectedLines(view: EditorView): boolean {
  const { from, to } = view.state.selection.main
  if (from === to) return false
  const text = view.state.sliceDoc(from, to)
  const lines = text.split('\n')
  if (lines.length <= 1) return false
  const unique = Array.from(new Set(lines))
  if (unique.length === lines.length) return false
  view.dispatch({ changes: { from, to, insert: unique.join('\n') }, selection: { anchor: from, head: from + unique.join('\n').length } })
  return true
}

export function numberSelectedLines(view: EditorView): boolean {
  const { from, to } = view.state.selection.main
  if (from === to) return false
  const text = view.state.sliceDoc(from, to)
  const lines = text.split('\n')
  if (lines.length <= 1) return false
  const numbered = lines.map((l, i) => `${i + 1}. ${l.replace(/^\d+\.\s/, '')}`)
  view.dispatch({ changes: { from, to, insert: numbered.join('\n') }, selection: { anchor: from, head: from + numbered.join('\n').length } })
  return true
}

// ============ 插入目录 ============

export function insertToc(view: EditorView): boolean {
  const doc = view.state.doc
  const tocLines: string[] = []
  for (let i = 1; i <= doc.lines; i++) {
    const line = doc.line(i)
    const m = line.text.match(/^(#{1,6})\s+(.+)$/)
    if (!m) continue
    const level = m[1].length
    const text = m[2].trim()
    const indent = '  '.repeat(level - 1)
    const anchor = text.toLowerCase().replace(/[^\w一-鿿]+/g, '-')
    tocLines.push(`${indent}- [${text}](#${anchor})`)
  }
  if (tocLines.length === 0) return false
  const tocText = '## 目录\n\n' + tocLines.join('\n') + '\n\n'
  const pos = view.state.selection.main.head
  view.dispatch({ changes: { from: pos, insert: tocText }, selection: { anchor: pos + tocText.length } })
  return true
}

// ============ 行内链接转引用式 ============

export function inlineToRefLinks(view: EditorView): boolean {
  const doc = view.state.doc
  const text = doc.toString()
  const linkRe = /(?<!!)\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g
  const matches: { start: number; end: number; label: string; url: string }[] = []
  let m: RegExpExecArray | null
  while ((m = linkRe.exec(text))) {
    matches.push({ start: m.index, end: m.index + m[0].length, label: m[1], url: m[2] })
  }
  if (matches.length === 0) return false
  const urlToRef = new Map<string, number>()
  let counter = 0
  for (const mt of matches) {
    if (!urlToRef.has(mt.url)) urlToRef.set(mt.url, ++counter)
  }
  const changes: { from: number; to: number; insert: string }[] = []
  for (let i = matches.length - 1; i >= 0; i--) {
    const mt = matches[i]
    const n = urlToRef.get(mt.url)!
    changes.push({ from: mt.start, to: mt.end, insert: `[${mt.label}][${n}]` })
  }
  const defs = [...urlToRef.entries()].sort((a, b) => a[1] - b[1]).map(([url, n]) => `[${n}]: ${url}`).join('\n')
  changes.push({ from: doc.length, to: doc.length, insert: `\n\n${defs}\n` })
  view.dispatch({ changes })
  return true
}

// ============ 中英文加空格 (盘古之白) ============

export function isTableRow(text: string) { return /^\|.*\|\s*$/.test(text.trim()) }
export function isTableSeparator(text: string) { return /^\|[\s:\-|]+\|\s*$/.test(text.trim()) }

export function deleteTableRow(view: EditorView): boolean {
  const { head } = view.state.selection.main
  const doc = view.state.doc
  const line = doc.lineAt(head)
  if (!isTableRow(line.text)) return false
  if (isTableSeparator(line.text)) return false
  const from = line.from
  const to = line.to < doc.length ? line.to + 1 : line.to
  view.dispatch({ changes: { from, to: Math.min(to, doc.length), insert: '' } })
  return true
}

export function insertTableRow(view: EditorView): boolean {
  const { head } = view.state.selection.main
  const doc = view.state.doc
  const line = doc.lineAt(head)
  if (!isTableRow(line.text)) return false
  const cols = (line.text.match(/\|/g) || []).length - 1
  if (cols < 1) return false
  const newRow = '| ' + Array.from({ length: cols }, () => '  ').join(' | ') + ' |'
  view.dispatch({ changes: { from: line.to, to: line.to, insert: '\n' + newRow }, selection: { anchor: line.to + 1 } })
  return true
}

export function deleteTableColumn(view: EditorView): boolean {
  return deleteTableColumnImpl(view)
}

export function insertTableColumn(view: EditorView): boolean {
  const t = parseTableAt(view)
  if (!t || t.sepIndex < 0) return false
  const curLine = view.state.doc.lineAt(view.state.selection.main.head)
  if (!/^\|/.test(curLine.text.trim())) return false
  const before = curLine.text.slice(0, view.state.selection.main.head - curLine.from)
  const col = Math.min(Math.max(0, (before.match(/\|/g) || []).length - 1), t.rows[0].length)
  const newRows = t.rows.map((r, i) => {
    const c = [...r]
    c.splice(col + 1, 0, i === t.sepIndex ? '---' : '')
    return c
  })
  const lines = rebuildTableLines(newRows, t.isSep)
  const doc = view.state.doc
  const changes: { from: number; to: number; insert: string }[] = []
  for (let i = 0; i < lines.length; i++) {
    const line = doc.line(t.startLine + i)
    if (line.text !== lines[i]) changes.push({ from: line.from, to: line.to, insert: lines[i] })
  }
  if (!changes.length) return false
  view.dispatch({ changes })
  return true
}

export function deleteTableColumnImpl(view: EditorView): boolean {
  const t = parseTableAt(view)
  if (!t || t.sepIndex < 0) return false
  const curLine = view.state.doc.lineAt(view.state.selection.main.head)
  if (!/^\|/.test(curLine.text.trim())) return false
  const before = curLine.text.slice(0, view.state.selection.main.head - curLine.from)
  const col = Math.min(Math.max(0, (before.match(/\|/g) || []).length - 1), t.rows[0].length - 1)
  const newRows = t.rows.map(r => { const c = [...r]; c.splice(col, 1); return c })
  if (newRows[0].length === 0) return false
  const lines = rebuildTableLines(newRows, t.isSep)
  const doc = view.state.doc
  const changes: { from: number; to: number; insert: string }[] = []
  for (let i = 0; i < lines.length; i++) {
    const line = doc.line(t.startLine + i)
    if (line.text !== lines[i]) changes.push({ from: line.from, to: line.to, insert: lines[i] })
  }
  if (!changes.length) return false
  view.dispatch({ changes })
  return true
}

export function deleteParagraph(view: EditorView): boolean {
  const { head } = view.state.selection.main
  const doc = view.state.doc
  const cur = doc.lineAt(head).number
  if (doc.line(cur).text.trim() === '') return false
  let start = cur
  while (start > 1 && doc.line(start - 1).text.trim() !== '') start--
  let end = cur
  while (end < doc.lines && doc.line(end + 1).text.trim() !== '') end++
  const from = doc.line(start).from
  const toLine = doc.line(end)
  const to = toLine.to < doc.length ? toLine.to + 1 : toLine.to
  view.dispatch({ changes: { from, to: Math.min(to, doc.length), insert: '' } })
  return true
}

// ============ 光标历史导航 ============

let cursorHist: number[] = []   // 光标位置历史
let cursorHistIdx = -1         // 当前位置指针
let cursorHistSuppressed = false

export function pushCursor(pos: number) {
  if (cursorHistSuppressed) return
  const top = cursorHist[cursorHistIdx]
  if (top === pos) return
  cursorHist = cursorHist.slice(0, cursorHistIdx + 1)
  cursorHist.push(pos)
  if (cursorHist.length > 200) cursorHist = cursorHist.slice(-200)
  cursorHistIdx = cursorHist.length - 1
}

export function cursorHistoryBack(view: EditorView): boolean {
  if (cursorHistIdx <= 0) return false
  cursorHistIdx--
  const pos = cursorHist[cursorHistIdx]
  cursorHistSuppressed = true
  view.dispatch({ selection: { anchor: pos, head: pos }, effects: EditorView.scrollIntoView(pos) })
  cursorHistSuppressed = false
  return true
}

export function cursorHistoryForward(view: EditorView): boolean {
  if (cursorHistIdx >= cursorHist.length - 1) return false
  cursorHistIdx++
  const pos = cursorHist[cursorHistIdx]
  cursorHistSuppressed = true
  view.dispatch({ selection: { anchor: pos, head: pos }, effects: EditorView.scrollIntoView(pos) })
  cursorHistSuppressed = false
  return true
}

export function selectParagraph(view: EditorView): boolean {  const { head } = view.state.selection.main
  const doc = view.state.doc
  const cur = doc.lineAt(head).number
  let start = cur
  while (start > 1 && doc.line(start - 1).text.trim() !== '') start--
  let end = cur
  while (end < doc.lines && doc.line(end + 1).text.trim() !== '') end++
  view.dispatch({ selection: { anchor: doc.line(start).from, head: doc.line(end).to } })
  return true
}

export function wrapHtmlComment(view: EditorView): boolean {
  const { from, to } = view.state.selection.main
  const sel = view.state.sliceDoc(from, to)
  const open = '<!-- ', close = ' -->'
  view.dispatch({
    changes: { from, to, insert: open + sel + close },
    selection: sel ? { anchor: from + open.length, head: from + open.length + sel.length } : { anchor: from + open.length },
  })
  return true
}

export function appendTodayDue(view: EditorView): boolean {
  const { head } = view.state.selection.main
  const line = view.state.doc.lineAt(head)
  const d = new Date()
  const p2 = (n: number) => String(n).padStart(2, '0')
  const date = `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
  const cleaned = line.text.replace(/\s*(?:@|📅\s*)\d{4}-\d{1,2}-\d{1,2}/g, '').trimEnd()
  view.dispatch({
    changes: { from: line.from, to: line.to, insert: `${cleaned} 📅 ${date}` },
    selection: { anchor: line.from + cleaned.length + 1 },
  })
  return true
}

export function insertHr(view: EditorView): boolean {
  const pos = view.state.selection.main.head
  const before = view.state.doc.sliceString(Math.max(0, pos - 1), pos)
  const insert = (before === '\n' || pos === 0 ? '' : '\n') + '\n---\n\n'
  view.dispatch({ changes: { from: pos, insert }, selection: { anchor: pos + insert.length } })
  return true
}

export function wrapCodeFence(view: EditorView): boolean {
  const { from, to } = view.state.selection.main
  const sel = view.state.sliceDoc(from, to)
  const insert = '```\n' + sel + (sel.endsWith('\n') ? '' : sel ? '\n' : '') + '```\n'
  view.dispatch({
    changes: { from, to, insert },
    selection: sel ? { anchor: from, head: from + insert.length } : { anchor: from + 4 },
  })
  return true
}

export function wrapCallout(view: EditorView, type = 'tip'): boolean {
  const { from, to } = view.state.selection.main
  const sel = view.state.sliceDoc(from, to)
  const body = sel.endsWith('\n') ? sel : sel ? sel + '\n' : ''
  const insert = `:::${type}\n${body}:::\n`
  view.dispatch({
    changes: { from, to, insert },
    selection: sel ? { anchor: from, head: from + insert.length } : { anchor: from + type.length + 4 },
  })
  return true
}

export function smartLinkify(view: EditorView): boolean {
  const { from, to } = view.state.selection.main
  if (from === to) return false
  const sel = view.state.sliceDoc(from, to).trim()
  if (!sel) return false
  const url = /^(https?:\/\/|www\.)/i.test(sel) ? (sel.startsWith('www.') ? 'http://' + sel : sel) : null
  const email = /^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(sel) ? 'mailto:' + sel : null
  if (url) {
    const insert = `[${sel.replace(/^https?:\/\/(www\.)?/i, '')}](${url})`
    view.dispatch({ changes: { from, to, insert }, selection: { anchor: from, head: from + insert.length } })
    return true
  }
  if (email) {
    const insert = `[${sel}](${email})`
    view.dispatch({ changes: { from, to, insert }, selection: { anchor: from, head: from + insert.length } })
    return true
  }
  return false
}

export function toggleTaskItem(view: EditorView): boolean {
  const { from, to } = view.state.selection.main
  const doc = view.state.doc
  const startLine = doc.lineAt(from).number
  const endLine = doc.lineAt(to).number
  const changes: { from: number; to: number; insert: string }[] = []
  let allTask = true
  for (let i = startLine; i <= endLine; i++) {
    if (!/^(\s*)([-*+]|\d+\.)\s\[([ xX])\]\s/.test(doc.line(i).text)) { allTask = false; break }
  }
  for (let i = startLine; i <= endLine; i++) {
    const line = doc.line(i)
    const m = line.text.match(/^(\s*)([-*+]|\d+\.)\s\[([ xX])\]\s/)
    if (allTask) {
      if (m) changes.push({ from: line.from, to: line.from + m[0].length, insert: m[1] })
    } else {
      changes.push({ from: line.from, to: line.from, insert: '- [ ] ' })
    }
  }
  if (!changes.length) return false
  view.dispatch({ changes })
  return true
}

export function toggleUnorderedList(view: EditorView): boolean {
  const { from, to } = view.state.selection.main
  const doc = view.state.doc
  const startLine = doc.lineAt(from).number
  const endLine = doc.lineAt(to).number
  const changes: { from: number; to: number; insert: string }[] = []
  let allList = true
  for (let i = startLine; i <= endLine; i++) {
    if (!/^(\s*)([-*+])\s/.test(doc.line(i).text)) { allList = false; break }
  }
  for (let i = startLine; i <= endLine; i++) {
    const line = doc.line(i)
    const m = line.text.match(/^(\s*)([-*+])\s/)
    if (allList) {
      if (m) changes.push({ from: line.from, to: line.from + m[0].length, insert: m[1] })
    } else {
      changes.push({ from: line.from, to: line.from, insert: '- ' })
    }
  }
  if (!changes.length) return false
  view.dispatch({ changes })
  return true
}

export function toggleOrderedList(view: EditorView): boolean {
  const { from, to } = view.state.selection.main
  const doc = view.state.doc
  const startLine = doc.lineAt(from).number
  const endLine = doc.lineAt(to).number
  const changes: { from: number; to: number; insert: string }[] = []
  let allOrdered = true
  for (let i = startLine; i <= endLine; i++) {
    if (!/^(\s*)\d+\.\s/.test(doc.line(i).text)) { allOrdered = false; break }
  }
  if (allOrdered) {
    for (let i = startLine; i <= endLine; i++) {
      const line = doc.line(i)
      const m = line.text.match(/^(\s*)\d+\.\s/)
      if (m) changes.push({ from: line.from, to: line.from + m[0].length, insert: m[1] })
    }
  } else {
    let n = 1
    for (let i = startLine; i <= endLine; i++) {
      const line = doc.line(i)
      const indent = line.text.match(/^(\s*)/)?.[1] || ''
      changes.push({ from: line.from + indent.length, to: line.from + indent.length, insert: `${n}. ` })
      n++
    }
  }
  if (!changes.length) return false
  view.dispatch({ changes })
  return true
}

export function fullWidthToHalf(view: EditorView): boolean {
  const { from, to } = view.state.selection.main
  const doc = view.state.doc
  const target = from === to ? { from: 0, to: doc.length } : { from, to }
  const text = doc.sliceString(target.from, target.to)
  const map: Record<string, string> = {
    '，': ',', '。': '.', '；': ';', '：': ':', '！': '!', '？': '?',
    '（': '(', '）': ')', '［': '[', '］': ']', '｛': '{', '｝': '}',
    '“': '"', '”': '"', '‘': "'", '’': "'", '～': '~', '、': ',',
  }
  let changed = false
  let out = ''
  for (const ch of text) {
    if (map[ch]) { out += map[ch]; changed = true } else { out += ch }
  }
  if (!changed) return false
  view.dispatch({ changes: { from: target.from, to: target.to, insert: out } })
  return true
}

export function panguSpacing(view: EditorView): boolean {
  const { from, to } = view.state.selection.main
  const doc = view.state.doc
  const target = from === to ? { from: 0, to: doc.length } : { from, to }
  const text = doc.sliceString(target.from, target.to)
  const spaced = text
    .replace(/([一-龥])([a-zA-Z0-9])/g, '$1 $2')
    .replace(/([a-zA-Z0-9])([一-龥])/g, '$1 $2')
    .replace(/([一-龥])\s+\1/g, m => m) // 保护已有空格
  if (spaced === text) return false
  view.dispatch({ changes: { from: target.from, to: target.to, insert: spaced } })
  return true
}

// ============ 任务复选框切换 ============

export function toggleBlockquote(view: EditorView): boolean {
  const { from, to } = view.state.selection.main
  const doc = view.state.doc
  const startLine = doc.lineAt(from).number
  const endLine = doc.lineAt(to).number
  const changes: { from: number; to: number; insert: string }[] = []
  let allQuoted = true
  for (let i = startLine; i <= endLine; i++) {
    if (!/^>\s?/.test(doc.line(i).text)) { allQuoted = false; break }
  }
  for (let i = startLine; i <= endLine; i++) {
    const line = doc.line(i)
    if (allQuoted) {
      const m = line.text.match(/^>\s?/)
      if (m) changes.push({ from: line.from, to: line.from + m[0].length, insert: '' })
    } else {
      changes.push({ from: line.from, to: line.from, insert: '> ' })
    }
  }
  view.dispatch({ changes })
  return true
}

export function toggleTaskCheckbox(view: EditorView): boolean {
  const { from, to } = view.state.selection.main
  const doc = view.state.doc
  const startLine = doc.lineAt(from).number
  const endLine = doc.lineAt(to).number
  const changes: { from: number; to: number; insert: string }[] = []
  const d = new Date()
  const dateStr = ` ✅ ${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  for (let i = startLine; i <= endLine; i++) {
    const line = doc.line(i)
    const m = line.text.match(/^(\s*)([-*+]|\d+\.)\s\[([ xX])\]/)
    if (m) {
      const charOff = line.from + m[1].length + m[2].length + 1 + 1
      const isChecked = m[3].toLowerCase() === 'x'
      changes.push({ from: charOff, to: charOff + 1, insert: isChecked ? ' ' : 'x' })
      // 完成日期处理：勾选时追加，取消时移除
      const dateMatch = line.text.match(/\s*✅\s*\d{4}-\d{2}-\d{2}/)
      if (isChecked && dateMatch) {
        changes.push({ from: line.from + dateMatch.index!, to: line.from + dateMatch.index! + dateMatch[0].length, insert: '' })
      } else if (!isChecked) {
        if (dateMatch) changes.push({ from: line.from + dateMatch.index!, to: line.from + dateMatch.index! + dateMatch[0].length, insert: '' })
        changes.push({ from: line.to, to: line.to, insert: dateStr })
      }
    }
  }
  if (changes.length === 0) return false
  view.dispatch({ changes })
  return true
}

// ============ 文档格式整理 ============

export function normalizeDoc(view: EditorView): boolean {  const cur = view.state.doc.toString()
  const normalized = normalizeDocument(cur)
  if (normalized === cur) return false
  const head = view.state.selection.main.head
  view.dispatch({ changes: { from: 0, to: cur.length, insert: normalized } })
  // 尽量保持光标位置不越界
  const newHead = Math.min(head, normalized.length)
  view.dispatch({ selection: { anchor: newHead } })
  return true
}

// ============ 表格列对齐循环 ============

export function cycleColumnAlign(view: EditorView): boolean {
  const t = parseTableAt(view)
  if (!t || t.sepIndex < 0) return false
  const curLine = view.state.doc.lineAt(view.state.selection.main.head)
  if (!/^\|/.test(curLine.text.trim())) return false
  const before = curLine.text.slice(0, view.state.selection.main.head - curLine.from)
  const col = Math.min(Math.max(0, (before.match(/\|/g) || []).length - 1), t.rows[0].length - 1)
  const sepRow = t.rows[t.sepIndex]
  const c = (sepRow[col] || '').trim()
  let i = 0
  if (c.startsWith(':') && c.endsWith(':')) i = 2
  else if (c.startsWith(':')) i = 1
  else if (c.endsWith(':')) i = 3
  const states = ['---', ':---', ':---:', '---:']
  const newSepRow = [...sepRow]
  newSepRow[col] = states[(i + 1) % 4]
  const newRows = [...t.rows]
  newRows[t.sepIndex] = newSepRow
  const lines = rebuildTableLines(newRows, t.isSep)
  const doc = view.state.doc
  const changes: { from: number; to: number; insert: string }[] = []
  for (let k = 0; k < lines.length; k++) {
    const line = doc.line(t.startLine + k)
    if (line.text !== lines[k]) changes.push({ from: line.from, to: line.to, insert: lines[k] })
  }
  if (!changes.length) return false
  view.dispatch({ changes })
  return true
}
