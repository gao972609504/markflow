/**
 * 智能表格粘贴与拼写检查
 * — 从 Editor.tsx 拆分：剪贴板表格解析、Markdown 表格转换、常见拼写错误高亮
 */
import { EditorView, ViewPlugin, ViewUpdate, Decoration } from '@codemirror/view'

// ============ 常见拼写错误检查 ============

const commonTypos: [RegExp, string][] = [
  [/\bteh\b/g, 'the'],
  [/\brecieve\b/g, 'receive'],
  [/\boccured\b/g, 'occurred'],
  [/\bseperate\b/g, 'separate'],
  [/\bdefinately\b/g, 'definitely'],
  [/\boccassion\b/g, 'occasion'],
  [/\buntill\b/g, 'until'],
  [/\bwich\b/g, 'which'],
  [/\baccommodate\b/gi, 'accommodate'],
]

const typoMark = Decoration.mark({ class: 'cm-typo-mark' })

export function createSpellCheckPlugin() {
  return ViewPlugin.fromClass(
    class {
      deco
      constructor(view: EditorView) { this.deco = this.build(view) }
      update(u: ViewUpdate) {
        if (u.docChanged || u.viewportChanged) this.deco = this.build(u.view)
      }
      build(view: EditorView) {
        const deco: { from: number; to: number; value: Decoration }[] = []
        const doc = view.state.doc
        const startLine = doc.lineAt(view.viewport.from).number
        const endLine = doc.lineAt(view.viewport.to).number
        for (let i = startLine; i <= endLine; i++) {
          const line = doc.line(i)
          const text = line.text
          for (const [re] of commonTypos) {
            re.lastIndex = 0
            let m
            while ((m = re.exec(text))) {
              const f = line.from + m.index
              const t = f + m[0].length
              deco.push({ from: f, to: t, value: typoMark })
            }
          }
        }
        return deco.length ? Decoration.set(deco.map(d => d.value.range(d.from, d.to)), true) : Decoration.none
      }
    },
    { decorations: v => v.deco }
  )
}

// ============ 智能表格粘贴 ============

/**
 * 解析剪贴板中的制表符分隔表格文本
 * 支持 Excel / Sheets / 纯文本的 \t 分隔数据
 */
export function parseClipboardTable(text: string): string[][] | null {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return null

  // 检测是否包含制表符（Excel 复制的标准格式）
  const hasTabs = lines.some(l => l.includes('\t'))
  if (!hasTabs) {
    // 也支持逗号分隔（CSV 粘贴）
    const hasCommas = lines.some(l => l.split(',').length > 2)
    if (!hasCommas) return null
    return lines.map(l => l.split(',').map(c => c.trim()))
  }

  return lines.map(l => l.split('\t').map(c => c.trim()))
}

/**
 * 将解析后的二维数组转换为 Markdown 表格
 */
export function convertToMarkdownTable(rows: string[][]): string {
  if (rows.length === 0) return ''
  const colCount = Math.max(...rows.map(r => r.length))
  // 填充缺失的单元格
  const padded = rows.map(r => {
    const paddedRow = [...r]
    while (paddedRow.length < colCount) paddedRow.push('')
    return paddedRow
  })

  // 计算每列最大宽度，用于对齐
  const maxWidths: number[] = []
  for (let c = 0; c < colCount; c++) {
    maxWidths[c] = Math.max(3, ...padded.map(r => r[c].length))
  }

  const formatRow = (cells: string[]) =>
    '| ' + cells.map((c, i) => c.padEnd(maxWidths[i])).join(' | ') + ' |'

  const header = formatRow(padded[0])
  const separator = '| ' + maxWidths.map(w => '-'.repeat(w)).join(' | ') + ' |'
  const body = padded.slice(1).map(formatRow)

  return '\n' + [header, separator, ...body].join('\n') + '\n'
}
