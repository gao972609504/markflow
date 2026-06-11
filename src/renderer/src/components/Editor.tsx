/**
 * MarkFlow 编辑器 v3
 * 模块化架构：widgets / decorations / theme 拆分为独立插件
 */
import React, { useEffect, useRef } from 'react'
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, Decoration, ViewPlugin, ViewUpdate } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching, indentOnInput } from '@codemirror/language'
import { searchKeymap } from '@codemirror/search'
import { createTableExtension, tableLightTheme, tableDarkTheme } from '@markwhen/codemirror-tables'
import { Tab, useEditorStore } from '../store/editorStore'
import { buildDecorations } from '../plugins/decorations'
import { createEditorTheme } from '../plugins/theme'

interface EditorProps { tab: Tab }

// ============ 选中文字高亮所有匹配项 ============

const selectionHighlightMark = Decoration.mark({ class: 'cm-selection-match' })

function createSelectionHighlightPlugin() {
  return ViewPlugin.fromClass(
    class {
      deco
      constructor(view: EditorView) { this.deco = this.build(view) }
      update(u: ViewUpdate) {
        if (u.selectionSet || u.docChanged) this.deco = this.build(u.view)
      }
      build(view: EditorView) {
        const sel = view.state.selection.main
        if (sel.from === sel.to) return Decoration.none
        const text = view.state.sliceDoc(sel.from, sel.to)
        if (!text || text.length < 2 || text.includes('\n')) return Decoration.none
        const deco: { from: number; to: number; value: Decoration }[] = []
        const doc = view.state.doc
        const search = text.toLowerCase()
        for (let pos = 0; pos < doc.length;) {
          const chunk = doc.sliceString(pos, Math.min(pos + 10000, doc.length)).toLowerCase()
          const idx = chunk.indexOf(search)
          if (idx < 0) { pos += 10000; continue }
          const matchFrom = pos + idx
          const matchTo = matchFrom + text.length
          if (!(matchFrom >= sel.from && matchTo <= sel.to)) {
            deco.push({ from: matchFrom, to: matchTo, value: selectionHighlightMark })
          }
          pos = matchTo
        }
        return deco.length ? Decoration.set(deco.map(d => d.value.range(d.from, d.to)), true) : Decoration.none
      }
    },
    { decorations: v => v.deco }
  )
}

// ============ ViewPlugin ============

function createWysiwygPlugin() {
  return ViewPlugin.fromClass(
    class {
      deco
      constructor(view: EditorView) { this.deco = buildDecorations(view) }
      update(u: ViewUpdate) {
        if (u.docChanged || u.selectionSet || u.viewportChanged) {
          this.deco = buildDecorations(u.view)
        }
      }
    },
    { decorations: v => v.deco }
  )
}

// ============ Typewriter 滚动插件 ============

function createTypewriterPlugin() {
  return EditorView.updateListener.of(update => {
    if (!useEditorStore.getState().typewriterMode) return
    if (update.selectionSet || update.docChanged) {
      const head = update.state.selection.main.head
      const line = update.state.doc.lineAt(head)
      requestAnimationFrame(() => {
        update.view.dispatch({
          effects: EditorView.scrollIntoView(line.from, { y: 'center', yMargin: 0 })
        })
      })
    }
  })
}

// ============ Editor 组件 ============

export function Editor({ tab }: EditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const { updateTabContent, updateTabCursor, setScrollProgress, theme, focusMode, typewriterMode, fontSize, wordWrap, showLineNumbers } = useEditorStore()
  const isDark = theme === 'dark'

  useEffect(() => {
    if (!editorRef.current) return

    const updateHandler = EditorView.updateListener.of(update => {
      if (update.docChanged) updateTabContent(tab.id, update.state.doc.toString())
      if (update.selectionSet) {
        const head = update.state.selection.main.head
        const line = update.state.doc.lineAt(head)
        updateTabCursor(tab.id, line.number, head - line.from + 1)
      }
      if (update.geometryChanged || update.viewportChanged) {
        const el = update.view.scrollDOM
        const progress = el.scrollHeight <= el.clientHeight ? 0 : el.scrollTop / (el.scrollHeight - el.clientHeight) * 100
        setScrollProgress(Math.min(100, Math.max(0, progress)))
      }
    })

    const pasteHandler = EditorView.domEventHandlers({
      paste(event, view) {
        const items = event.clipboardData?.items
        if (!items) return false
        for (let i = 0; i < items.length; i++) {
          const item = items[i]
          if (item.type.startsWith('image/')) {
            event.preventDefault()
            const file = item.getAsFile()
            if (!file) continue
            const reader = new FileReader()
            reader.onload = async () => {
              const base64 = (reader.result as string).split(',')[1]
              if (!window.api) return
              try {
                const relPath = await window.api.savePastedImage(base64, tab.filePath || null)
                const insertText = `![](${relPath})`
                view.dispatch({
                  changes: { from: view.state.selection.main.head, insert: insertText }
                })
              } catch (err) { console.error('粘贴图片保存失败:', err) }
            }
            reader.readAsDataURL(file)
            return true
          }
        }
        return false
      }
    })

    const state = EditorState.create({
      doc: tab.content,
      extensions: [
        ...(showLineNumbers ? [lineNumbers(), highlightActiveLineGutter()] : []),
        history(),
        indentOnInput(),
        bracketMatching(),
        ...(wordWrap ? [EditorView.lineWrapping] : []),
        createEditorTheme(isDark, fontSize),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        markdown({ base: markdownLanguage, codeLanguages: languages }),
        createTableExtension({ cellEditorExtensions: [isDark ? tableDarkTheme : tableLightTheme] }),
        keymap.of([
          ...defaultKeymap, ...historyKeymap, ...searchKeymap, indentWithTab,
          { key: 'Mod-b', run: v => (wrapSel(v, '**'), true) },
          { key: 'Mod-i', run: v => (wrapSel(v, '*'), true) },
          { key: 'Mod-`', run: v => (wrapSel(v, '`'), true) },
          { key: 'Mod-Shift-x', run: v => (wrapSel(v, '~~'), true) },
          { key: 'Alt-ArrowUp', run: moveLineUp },
          { key: 'Alt-ArrowDown', run: moveLineDown },
          { key: 'Mod-d', run: duplicateLine },
          { key: 'Mod-Shift-k', run: deleteLine },
          { key: 'Mod-Enter', run: insertLineBelow },
          { key: 'Mod-Shift-Enter', run: insertLineAbove },
          { key: 'Mod-Shift-f', run: formatMarkdownTable },
          { key: 'Enter', run: v => autoContinueList(v) },
        ]),
        updateHandler,
        pasteHandler,
        createSelectionHighlightPlugin(),
        createWysiwygPlugin(),
        createTypewriterPlugin(),
      ]
    })

    const view = new EditorView({ state, parent: editorRef.current })
    viewRef.current = view
    return () => { view.destroy(); viewRef.current = null }
  }, [tab.id, isDark, fontSize, wordWrap, showLineNumbers])

  // focusMode / typewriterMode 变化时触发装饰重建
  useEffect(() => {
    const v = viewRef.current
    if (v) {
      const pos = v.state.selection.main.head
      v.dispatch({ selection: { anchor: pos } })
    }
  }, [focusMode, typewriterMode])

  useEffect(() => {
    const v = viewRef.current
    if (v) {
      const cur = v.state.doc.toString()
      if (cur !== tab.content) v.dispatch({ changes: { from: 0, to: cur.length, insert: tab.content } })
    }
  }, [tab.content])

  return <div className="editor-wrapper"><div ref={editorRef} className="codemirror-container" /></div>
}

// ============ 工具函数 ============

function wrapSel(view: EditorView, mark: string) {
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

function autoContinueList(view: EditorView): boolean {
  const { head } = view.state.selection.main
  const line = view.state.doc.lineAt(head)
  const t = line.text

  const ul = t.match(/^(\s*)([-*+])\s(.*)$/)
  if (ul) {
    if (!ul[3].trim()) { view.dispatch({ changes: { from: line.from, to: line.to, insert: '' }, selection: { anchor: line.from } }); return true }
    view.dispatch({ changes: { from: head, insert: `\n${ul[1]}${ul[2]} ` }, selection: { anchor: head + 1 + ul[1].length + 2 } })
    return true
  }
  const ol = t.match(/^(\s*)(\d+)\.\s(.*)$/)
  if (ol) {
    if (!ol[3].trim()) { view.dispatch({ changes: { from: line.from, to: line.to, insert: '' }, selection: { anchor: line.from } }); return true }
    const n = parseInt(ol[2]) + 1
    view.dispatch({ changes: { from: head, insert: `\n${ol[1]}${n}. ` }, selection: { anchor: head + 1 + ol[1].length + n.toString().length + 2 } })
    return true
  }
  const tk = t.match(/^(\s*)([-*+])\s\[([ xX])\]\s(.*)$/)
  if (tk) {
    if (!tk[4].trim()) { view.dispatch({ changes: { from: line.from, to: line.to, insert: '' }, selection: { anchor: line.from } }); return true }
    view.dispatch({ changes: { from: head, insert: `\n${tk[1]}${tk[2]} [ ] ` }, selection: { anchor: head + 1 + tk[1].length + 6 } })
    return true
  }
  const qt = t.match(/^(>\s?)(.*)$/)
  if (qt) {
    if (!qt[2].trim()) { view.dispatch({ changes: { from: line.from, to: line.to, insert: '' }, selection: { anchor: line.from } }); return true }
    view.dispatch({ changes: { from: head, insert: `\n${qt[1]}` }, selection: { anchor: head + 1 + qt[1].length } })
    return true
  }
  return false
}

// ============ 行操作工具函数 ============

function moveLineUp(view: EditorView): boolean {
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

function moveLineDown(view: EditorView): boolean {
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

function duplicateLine(view: EditorView): boolean {
  const { head } = view.state.selection.main
  const line = view.state.doc.lineAt(head)
  view.dispatch({
    changes: { from: line.to, to: line.to, insert: '\n' + line.text },
    selection: { anchor: head + line.text.length + 1 }
  })
  return true
}

function deleteLine(view: EditorView): boolean {
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

function insertLineBelow(view: EditorView): boolean {
  const { head } = view.state.selection.main
  const line = view.state.doc.lineAt(head)
  const indent = line.text.match(/^\s*/)?.[0] || ''
  view.dispatch({
    changes: { from: line.to, to: line.to, insert: '\n' + indent },
    selection: { anchor: line.to + 1 + indent.length }
  })
  return true
}

function insertLineAbove(view: EditorView): boolean {
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
