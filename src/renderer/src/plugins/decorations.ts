/**
 * CodeMirror 装饰系统
 * — 标题、行内元素、代码块、引用、分割线、任务列表等装饰
 */
import { EditorView, Decoration, DecorationSet } from '@codemirror/view'
import { EditorState, RangeSet } from '@codemirror/state'
import { useEditorStore } from '../store/editorStore'
import { ImageWidget, CheckboxWidget, TocWidget, EmojiWidget, CalloutWidget, FootnoteRefWidget, CodeBlockHeaderWidget, KatexWidget } from './widgets'
import { emojiMap, emojiPattern } from '../utils/emoji'

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
  let inCallout = false
  let inFrontMatter = false
  let frontMatterChecked = false
  let calloutType = ''
  let calloutContent: string[] = []
  let calloutStartFrom = 0
  let codeBlockLang = ''
  let codeBlockStartFrom = 0
  let codeBlockContentLines: string[] = []
  let inMathBlock = false
  let mathBlockStartFrom = 0
  let mathBlockContent: string[] = []

  const cursorLine = doc.lineAt(view.state.selection.main.head).number
  const focusMode = useEditorStore.getState().focusMode

  // ── 收集所有标题（供 [TOC] 和编号使用） ──
  const headings: { level: number; text: string; lineNum: number }[] = []
  for (let i = 1; i <= doc.lines; i++) {
    const hm = doc.line(i).text.match(/^(#{1,6})\s+(.+)$/)
    if (hm) headings.push({ level: hm[1].length, text: hm[2].trim(), lineNum: i })
  }

  // ── 计算标题编号 ──
  const headingNumbers = new Map<number, string>()
  const headingNumbering = useEditorStore.getState().headingNumbering
  if (headingNumbering && headings.length > 0) {
    const counters = [0, 0, 0, 0, 0, 0]
    for (const h of headings) {
      counters[h.level - 1]++
      for (let j = h.level; j < 6; j++) counters[j] = 0
      headingNumbers.set(h.lineNum, counters.slice(0, h.level).join('.'))
    }
  }

  for (let i = 1; i <= doc.lines; i++) {
    const line = doc.line(i)
    const t = line.text
    const on = isCursorOnLine(view.state, i)

    // ── YAML Front Matter ──
    if (!inCodeBlock && !inCallout) {
      if (!frontMatterChecked && i === 1 && /^---\s*$/.test(t.trim())) {
        inFrontMatter = true
        frontMatterChecked = true
        deco.push({ from: line.from, to: line.from, value: Decoration.line({ class: 'cm-front-matter cm-front-matter-start' }) })
        if (!on) deco.push({ from: line.from, to: line.to, value: hideMark })
        continue
      }
      if (inFrontMatter) {
        if (/^---\s*$/.test(t.trim())) {
          inFrontMatter = false
          deco.push({ from: line.from, to: line.from, value: Decoration.line({ class: 'cm-front-matter cm-front-matter-end' }) })
          if (!on) deco.push({ from: line.from, to: line.to, value: hideMark })
          continue
        }
        // Front matter content line — render as key-value pairs
        deco.push({ from: line.from, to: line.from, value: Decoration.line({ class: 'cm-front-matter-content' }) })
        const kvMatch = t.match(/^(\w[\w-]*):\s*(.*)$/)
        if (kvMatch && !on) {
          // Highlight the key
          deco.push({ from: line.from, to: line.from + kvMatch[1].length, value: Decoration.mark({ class: 'cm-yaml-key' }) })
          // Highlight the value
          if (kvMatch[2]) {
            deco.push({ from: line.from + kvMatch[0].length - kvMatch[2].length, to: line.from + kvMatch[0].length, value: Decoration.mark({ class: 'cm-yaml-value' }) })
          }
        }
        continue
      }
      if (i === 1) frontMatterChecked = true
    }

    // ── 围栏代码块 ──
    if (/^\s{0,3}```/.test(t)) {
      if (!inCodeBlock) {
        // 开始代码块
        inCodeBlock = true
        codeBlockLang = t.replace(/^\s{0,3}```/, '').trim()
        codeBlockStartFrom = line.from
        codeBlockContentLines = []
        deco.push({ from: line.from, to: line.from, value: Decoration.line({ class: 'cm-code-block-line cm-code-block-first' }) })
        if (!on) {
          const fenceEnd = t.indexOf('`') + 3
          deco.push({ from: line.from, to: line.from + Math.min(fenceEnd, t.length), value: hideMark })
        }
      } else {
        // 结束代码块
        inCodeBlock = false
        deco.push({ from: line.from, to: line.from, value: Decoration.line({ class: 'cm-code-block-line cm-code-block-last' }) })
        if (!on) {
          deco.push({ from: line.from, to: line.to, value: hideMark })
        }
        // 添加代码块头部（语言标签 + 复制按钮）
        const codeContent = codeBlockContentLines.join('\n')
        deco.push({
          from: codeBlockStartFrom, to: codeBlockStartFrom,
          value: Decoration.widget({ widget: new CodeBlockHeaderWidget(codeBlockLang, codeContent), side: -1 }).range(codeBlockStartFrom)
        })
      }
      continue
    }
    if (inCodeBlock) {
      codeBlockContentLines.push(t)
      deco.push({ from: line.from, to: line.from, value: codeLine })
      continue
    }

    // ── 显示数学块 $$...$$ ──
    if (/^\s*\$\$\s*$/.test(t) && !inMathBlock) {
      // 单行 $$ 公式：$$ E = mc^2 $$
      const singleLine = t.match(/^\s*\$\$\s+(.+?)\s+\$\$\s*$/)
      if (singleLine) {
        deco.push({ from: line.from, to: line.to, value: hideMark })
        deco.push({ from: line.to, to: line.to, value: Decoration.widget({ widget: new KatexWidget(singleLine[1], true), side: 1 }).range(line.to) })
        deco.push({ from: line.from, to: line.from, value: Decoration.line({ class: 'cm-math-block-line' }) })
        continue
      }
      inMathBlock = true
      mathBlockStartFrom = line.from
      mathBlockContent = []
      deco.push({ from: line.from, to: line.to, value: hideMark })
      deco.push({ from: line.from, to: line.from, value: Decoration.line({ class: 'cm-math-block-line' }) })
      continue
    }
    if (inMathBlock) {
      if (/^\s*\$\$\s*$/.test(t)) {
        inMathBlock = false
        const latex = mathBlockContent.join('\n')
        deco.push({ from: line.from, to: line.to, value: hideMark })
        deco.push({ from: line.to, to: line.to, value: Decoration.widget({ widget: new KatexWidget(latex, true), side: 1 }).range(line.to) })
        deco.push({ from: line.from, to: line.from, value: Decoration.line({ class: 'cm-math-block-line' }) })
        continue
      }
      mathBlockContent.push(t)
      deco.push({ from: line.from, to: line.to, value: hideMark })
      deco.push({ from: line.from, to: line.from, value: Decoration.line({ class: 'cm-math-block-line' }) })
      continue
    }

    // ── Admonition/Callout 块 ──
    if (inCallout) {
      if (/^:::\s*$/.test(t.trim())) {
        // 结束 callout
        const content = calloutContent.join('\n')
        deco.push({ from: calloutStartFrom, to: line.to, value: hideMark })
        deco.push({ from: line.to, to: line.to, value: Decoration.widget({ widget: new CalloutWidget(calloutType, content), side: 1 }).range(line.to) })
        deco.push({ from: calloutStartFrom, to: calloutStartFrom, value: Decoration.line({ class: 'cm-callout-line' }) })
        inCallout = false
        calloutContent = []
      } else {
        calloutContent.push(t)
        deco.push({ from: line.from, to: line.to, value: hideMark })
      }
      continue
    }
    const calloutMatch = t.match(/^:::(tip|info|warning|danger|note|quote|success|bug|example|question)\s*$/i)
    if (calloutMatch) {
      inCallout = true
      calloutType = calloutMatch[1].toLowerCase()
      calloutContent = []
      calloutStartFrom = line.from
      deco.push({ from: line.from, to: line.to, value: hideMark })
      continue
    }

    // ── [TOC] 目录标记 ──
    if (/^\[TOC\]\s*$/i.test(t.trim())) {
      deco.push({ from: line.from, to: line.to, value: hideMark })
      deco.push({ from: line.to, to: line.to, value: Decoration.widget({ widget: new TocWidget(headings.map(h => ({ level: h.level, text: h.text }))), side: 1 }).range(line.to) })
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
      // 标题编号
      if (headingNumbering && headingNumbers.has(i)) {
        const num = headingNumbers.get(i)!
        deco.push({
          from: line.from, to: line.from, value: Decoration.line({ attributes: { 'data-heading-num': num } })
        })
      }
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

  // 高亮标记 ==text==
  const hlRe = /==([^=]+)==/g
  while ((m = hlRe.exec(text))) {
    const f = lf + m.index, t = f + m[0].length
    deco.push({ from: f, to: t, value: Decoration.mark({ class: 'cm-highlight-mark' }) })
    if (!on) { deco.push({ from: f, to: f + 2, value: hideMark }); deco.push({ from: t - 2, to: t, value: hideMark }) }
  }

  // 下划线 ++text++
  const ulRe = /\+\+([^+]+)\+\+/g
  while ((m = ulRe.exec(text))) {
    const f = lf + m.index, t = f + m[0].length
    deco.push({ from: f, to: t, value: Decoration.mark({ class: 'cm-underline' }) })
    if (!on) { deco.push({ from: f, to: f + 2, value: hideMark }); deco.push({ from: t - 2, to: t, value: hideMark }) }
  }

  // 上标 ^text^
  const supRe = /\^([^^]+)\^/g
  while ((m = supRe.exec(text))) {
    const f = lf + m.index, t = f + m[0].length
    deco.push({ from: f, to: t, value: Decoration.mark({ class: 'cm-superscript' }) })
    if (!on) { deco.push({ from: f, to: f + 1, value: hideMark }); deco.push({ from: t - 1, to: t, value: hideMark }) }
  }

  // 下标 ~text~
  const subRe = /~([^~]+)~/g
  while ((m = subRe.exec(text))) {
    const f = lf + m.index, t = f + m[0].length
    // 排除删除线 ~~
    if (text[m.index - 1] === '~' || text[m.index + m[0].length] === '~') continue
    deco.push({ from: f, to: t, value: Decoration.mark({ class: 'cm-subscript' }) })
    if (!on) { deco.push({ from: f, to: f + 1, value: hideMark }); deco.push({ from: t - 1, to: t, value: hideMark }) }
  }

  // HTML 注释隐藏
  const commentRe = /<!--[\s\S]*?-->/g
  while ((m = commentRe.exec(text))) {
    const f = lf + m.index, t = f + m[0].length
    deco.push({ from: f, to: t, value: Decoration.mark({ class: 'cm-mark-hidden' }) })
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

  // Emoji 短代码 :shortcode:
  const emRe = new RegExp(emojiPattern.source, 'g')
  while ((m = emRe.exec(text))) {
    const emoji = emojiMap[m[1]]
    if (emoji) {
      const f = lf + m.index, t = f + m[0].length
      if (!on) {
        deco.push({ from: f, to: t, value: Decoration.replace({ widget: new EmojiWidget(emoji) }) })
      }
    }
  }

  // 脚注引用 [^id]
  const fnRefRe = /\[\^([^\]]+)\]/g
  while ((m = fnRefRe.exec(text))) {
    const f = lf + m.index, t = f + m[0].length
    if (!on) {
      deco.push({ from: f, to: t, value: Decoration.replace({ widget: new FootnoteRefWidget(m[1]) }) })
    } else {
      deco.push({ from: f, to: t, value: Decoration.mark({ class: 'cm-footnote-ref-active' }) })
    }
  }

  // 脚注定义 [^id]: text
  const fnDefRe = /^\[\^([^\]]+)\]:\s+(.+)$/
  const fnDef = t.match(fnDefRe)
  if (fnDef) {
    deco.push({ from: line.from, to: line.from, value: Decoration.line({ class: 'cm-footnote-def' }) })
    if (!on) {
      deco.push({ from: line.from, to: line.from + fnDef[0].indexOf(':') + 2, value: hideMark })
    }
  }

  // Wiki 双链 [[...]]
  const wikiRe = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g
  while ((m = wikiRe.exec(text))) {
    const f = lf + m.index, t = f + m[0].length
    const displayText = m[2] || m[1]
    deco.push({ from: f, to: t, value: Decoration.mark({ class: 'cm-wikilink' }) })
    if (!on) {
      deco.push({ from: f, to: f + 2, value: hideMark })
      if (!m[2]) {
        deco.push({ from: t - 2, to: t, value: hideMark })
      } else {
        deco.push({ from: f + 2 + m[1].length, to: t, value: hideMark })
      }
    }
  }

  // 标签 #tag（排除标题 # 开头的行）
  if (!hm) {
    const tagRe = /(?:^|\s)#([a-zA-Z一-鿿][\w一-鿿-]*)/g
    while ((m = tagRe.exec(text))) {
      const hashStart = m[0].startsWith(' ') ? m.index + 1 : m.index
      const f = lf + hashStart, t = lf + m.index + m[0].length
      deco.push({ from: f, to: t, value: Decoration.mark({ class: 'cm-tag' }) })
    }
  }

  // 行内数学 $...$（排除 $$ 和货币用法）
  const inlineMathRe = /(?<!\$)\$(?!\$)([^\s$](?:[^\$]*[^\s$])?)\$(?!\$)/g
  while ((m = inlineMathRe.exec(text))) {
    const f = lf + m.index, t = f + m[0].length
    if (!on) {
      deco.push({ from: f, to: t, value: Decoration.replace({ widget: new KatexWidget(m[1], false) }) })
    } else {
      deco.push({ from: f, to: t, value: Decoration.mark({ class: 'cm-math-inline-active' }) })
    }
  }
}
