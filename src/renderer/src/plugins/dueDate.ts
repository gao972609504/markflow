/**
 * 任务截止日期高亮 (Due Date Highlight)
 * — 识别 @YYYY-MM-DD 或 📅 YYYY-MM-DD 日期，按过期(红)/今日(强调)/未来(绿)三色高亮
 * — 仅扫描可视区，性能友好
 */
import { ViewPlugin, ViewUpdate, EditorView, Decoration, DecorationSet } from '@codemirror/view'

const DATE_RE = /(?:@|📅\s*)(\d{4})-(\d{1,2})-(\d{1,2})/g

export function dueDateHighlight() {
  return ViewPlugin.fromClass(
    class {
      deco: DecorationSet
      constructor(view: EditorView) { this.deco = this.build(view) }
      update(u: ViewUpdate) {
        if (u.docChanged || u.viewportChanged) this.deco = this.build(u.view)
      }
      build(view: EditorView): DecorationSet {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const deco: { from: number; to: number; value: Decoration }[] = []
        const doc = view.state.doc
        const startLine = doc.lineAt(view.viewport.from).number
        const endLine = doc.lineAt(view.viewport.to).number
        for (let i = startLine; i <= endLine; i++) {
          const line = doc.line(i)
          let m: RegExpExecArray | null
          DATE_RE.lastIndex = 0
          while ((m = DATE_RE.exec(line.text))) {
            const d = new Date(+m[1], +m[2] - 1, +m[3])
            if (isNaN(d.getTime())) continue
            d.setHours(0, 0, 0, 0)
            const diff = Math.round((d.getTime() - today.getTime()) / 86400000)
            let cls = 'cm-date-future'
            if (diff < 0) cls = 'cm-date-overdue'
            else if (diff === 0) cls = 'cm-date-today'
            const from = line.from + m.index + (m[0].startsWith('📅') ? 0 : 0)
            deco.push({ from, to: from + m[0].length, value: Decoration.mark({ class: cls }) })
          }
        }
        return deco.length ? Decoration.set(deco.map(x => x.value.range(x.from, x.to)), true) : Decoration.none
      }
    },
    { decorations: v => v.deco }
  )
}
