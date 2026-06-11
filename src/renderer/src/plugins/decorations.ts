/**
 * CodeMirror 装饰系统
 * — 标题、行内元素、代码块、引用、分割线、任务列表等装饰
 */
import { EditorView, Decoration, DecorationSet } from '@codemirror/view'
import { EditorState, RangeSet } from '@codemirror/state'
import { useEditorStore } from '../store/editorStore'
import { ImageWidget, CheckboxWidget, TocWidget } from './widgets'

// ============ 装饰常量 ============

const hideMark = Decoration.mark({ class: 'cm-mark-hidden' })
const headingLine = (n: number) => Decoration.line({ class: `cm-heading cm-heading-${n}` })
const blockquoteLine = Decoration.line({ class: 'cm-blockquote' })
const hrLine = Decoration.line({ class: 'cm-hr-line' })
const codeLine = Decoration.line({ class: 'cm-code-block-line' })
const focusDimLine = Decoration.line({ class: 'cm-focus-dim' })

const inlineCode = Decoration.mark({ class: 'cm-inline-code' })
const boldMark = Decoration.mark({ class: 'cm-bold-rendered' })
const italicMark = Decoration.mark({ class: 'cm-italic-rendered' })
const strikeMark = Decoration.mark({ class: 'cm-strike-rendered' })
const linkMark = Decoration.mark({ class: 'cm-link-rendered' })
const taskChecked = Decoration.mark({ class: 'cm-task-checked' })

// ============ 装饰构建 ============

function isCursorOnLine(state: EditorState, lineNum: number): boolean {
  return state.doc.lineAt(state.selection.main.head).number === lineNum
}

export function buildDecorations(view: EditorView): DecorationSet {
  const deco: { from: number; to: number; value: Decoration }[] = []
  const doc = view.state.doc
  let inCodeBlock = false

  const cursorLine = doc.lineAt(view.state.selection.main.head).number
  const focusMode = useEditorStore.getState().focusMode

  // ── 收集所有标题（供 [TOC] 使用） ──
  const headings: { level: number; text: string }[] = []
  for (let i = 1; i <= doc.lines; i++) {
    const hm = doc.line(i).text.match(/^(#{1,6})\s+(.+)$/)
    if (hm) headings.push({ level: hm[1].length, text: hm[2].trim() })
  }

  for (let i = 1; i <= doc.lines; i++) {
    const line = doc.line(i)
    const t = line.text
    const on = isCursorOnLine(view.state, i)

    // ── 围栏代码块 ──
    if (/^\s{0,3}```/.test(t)) {
      inCodeBlock = !inCodeBlock
      const isFirst = inCodeBlock
      deco.push({ from: line.from, to: line.from, value: isFirst
        ? Decoration.line({ class: 'cm-code-block-line cm-code-block-first' })
        : Decoration.line({ class: 'cm-code-block-line cm-code-block-last' })
      })
      if (!on) {
        const fenceEnd = t.indexOf('`') + 3
        deco.push({ from: line.from, to: line.from + Math.min(fenceEnd, t.length), value: hideMark })
      }
      continue
    }
    if (inCodeBlock) {
      deco.push({ from: line.from, to: line.from, value: codeLine })
      continue
    }

    // ── [TOC] 目录标记 ──
    if (/^\[TOC\]\s*$/i.test(t.trim())) {
      deco.push({ from: line.from, to: line.to, value: hideMark })
      deco.push({ from: line.to, to: line.to, value: Decoration.widget({ widget: new TocWidget(headings), side: 1 }).range(line.to) })
      deco.push({ from: line.from, to: line.from, value: Decoration.line({ class: 'cm-toc-line' }) })
      continue
    }

    // ── Focus 模式：非光标附近 3 行变暗 ──
    if (focusMode && Math.abs(i - cursorLine) > 2) {
      deco.push({ from: line.from, to: line.from, value: focusDimLine })
    }

    // ── 标题 ──
    const hm = t.match(/^(#{1,6})\s/)
    if (hm) {
      const lv = hm[1].length
      deco.push({ from: line.from, to: line.from, value: headingLine(lv) })
      if (!on) deco.push({ from: line.from, to: line.from + lv + 1, value: hideMark })
    }

    // ── 引用块 ──
    if (/^>\s?/.test(t)) {
      deco.push({ from: line.from, to: line.from, value: blockquoteLine })
      if (!on) {
        const qLen = t.match(/^(>\s?)+/)![0].length
        deco.push({ from: line.from, to: line.from + qLen, value: hideMark })
      }
    }

    // ── 分割线 ──
    if (/^(\*{3,}|-{3,}|_{3,})\s*$/.test(t.trim())) {
      deco.push({ from: line.from, to: line.from, value: hrLine })
      continue
    }

    // ── 无序列表 ──
    const ul = t.match(/^(\s*)([-*+])\s/)
    if (ul && !/^(\*{3,})\s*$/.test(t.trim())) {
      if (!on) deco.push({ from: line.from, to: line.from + ul[0].length - 1, value: hideMark })
    }

    // ── 有序列表 ──
    const ol = t.match(/^(\s*)(\d+\.)\s/)
    if (ol && !on) {
      deco.push({ from: line.from, to: line.from + ol[1].length + ol[2].length + 1, value: hideMark })
    }

    // ── 任务列表 ──
    const tk = t.match(/^(\s*[-*+]\s+)\[([ xX])\]\s/)
    if (tk) {
      const cs = line.from + tk[1].length
      const checked = tk[2] !== ' '
      deco.push({ from: cs, to: cs + 3, value: Decoration.widget({ widget: new CheckboxWidget(checked, line.from), side: -1 }).range(cs) })
      if (!on) {
        deco.push({ from: cs, to: cs + 3, value: hideMark })
        if (checked) deco.push({ from: cs, to: line.to, value: taskChecked })
      }
    }

    // ── 行内元素 ──
    inlineDeco(t, line.from, on, deco)
  }

  deco.sort((a, b) => a.from - b.from || a.value.startSide - b.value.startSide)
  return RangeSet.of(deco.map(d => d.value.range(d.from, d.to)), true)
}

// ============ 行内元素装饰 ============

function inlineDeco(text: string, lf: number, on: boolean, deco: { from: number; to: number; value: Decoration }[]) {
  let m: RegExpExecArray | null

  // 行内代码
  const codeRe = /`([^`]+)`/g
  while ((m = codeRe.exec(text))) {
    const f = lf + m.index, t = f + m[0].length
    deco.push({ from: f, to: t, value: inlineCode })
    if (!on) { deco.push({ from: f, to: f + 1, value: hideMark }); deco.push({ from: t - 1, to: t, value: hideMark }) }
  }

  // 加粗
  const boldRe = /(\*\*|__)(.*?)\1/g
  while ((m = boldRe.exec(text))) {
    const f = lf + m.index, t = f + m[0].length, ml = m[1].length
    deco.push({ from: f, to: t, value: boldMark })
    if (!on) { deco.push({ from: f, to: f + ml, value: hideMark }); deco.push({ from: t - ml, to: t, value: hideMark }) }
  }

  // 斜体
  const itaRe = /(?<!\*|_)(\*|_)(?!\*|_)(.+?)(?<!\*|_)\1(?!\*|_)/g
  while ((m = itaRe.exec(text))) {
    const f = lf + m.index, t = f + m[0].length
    deco.push({ from: f, to: t, value: italicMark })
    if (!on) { deco.push({ from: f, to: f + 1, value: hideMark }); deco.push({ from: t - 1, to: t, value: hideMark }) }
  }

  // 删除线
  const strRe = /~~(.*?)~~/g
  while ((m = strRe.exec(text))) {
    const f = lf + m.index, t = f + m[0].length
    deco.push({ from: f, to: t, value: strikeMark })
    if (!on) { deco.push({ from: f, to: f + 2, value: hideMark }); deco.push({ from: t - 2, to: t, value: hideMark }) }
  }

  // 图片 ![alt](url) — 行内预览
  const imgRe = /!\[([^\]]*)\]\(([^)]+)\)/g
  while ((m = imgRe.exec(text))) {
    const f = lf + m.index, t = f + m[0].length
    const alt = m[1], src = m[2]
    if (!on) {
      deco.push({ from: f, to: t, value: hideMark })
      deco.push({ from: t, to: t, value: Decoration.widget({ widget: new ImageWidget(src, alt), side: 1 }).range(t) })
    }
  }

  // 链接 [text](url)
  const lkRe = /\[([^\]]+)\]\(([^)]+)\)/g
  while ((m = lkRe.exec(text))) {
    const f = lf + m.index, t = f + m[0].length
    deco.push({ from: f, to: t, value: linkMark })
    if (!on) { deco.push({ from: f, to: f + 1, value: hideMark }); deco.push({ from: f + 1 + m[1].length, to: t, value: hideMark }) }
  }
}
