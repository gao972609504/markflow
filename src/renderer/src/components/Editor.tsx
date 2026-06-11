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
  const { updateTabContent, updateTabCursor, setScrollProgress, theme, focusMode, typewriterMode } = useEditorStore()
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

    const state = EditorState.create({
      doc: tab.content,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        history(),
        indentOnInput(),
        bracketMatching(),
        EditorView.lineWrapping,
        createEditorTheme(isDark),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        markdown({ base: markdownLanguage, codeLanguages: languages }),
        createTableExtension({ cellEditorExtensions: [isDark ? tableDarkTheme : tableLightTheme] }),
        keymap.of([
          ...defaultKeymap, ...historyKeymap, ...searchKeymap, indentWithTab,
          { key: 'Mod-b', run: v => (wrapSel(v, '**'), true) },
          { key: 'Mod-i', run: v => (wrapSel(v, '*'), true) },
          { key: 'Mod-`', run: v => (wrapSel(v, '`'), true) },
          { key: 'Mod-Shift-x', run: v => (wrapSel(v, '~~'), true) },
          { key: 'Enter', run: v => autoContinueList(v) },
        ]),
        updateHandler,
        createWysiwygPlugin(),
        createTypewriterPlugin(),
      ]
    })

    const view = new EditorView({ state, parent: editorRef.current })
    viewRef.current = view
    return () => { view.destroy(); viewRef.current = null }
  }, [tab.id, isDark])

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
