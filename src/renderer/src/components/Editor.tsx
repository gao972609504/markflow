/**
 * 泊墨 编辑器 v3
 * 模块化架构：widgets / decorations / theme / 命令 / 插件 拆分为独立模块
 *
 * 本文件仅保留 React 组件主体（EditorView 装配 + 生命周期 effect + JSX），
 * 其余职责拆分至：
 *   - ./editorPlugins    CM6 视图插件工厂（折叠、装饰、打字机音效等）
 *   - ./editorCommands   keymap/工具栏命令、光标历史栈、表格/格式化操作
 *   - ./clipboardTable   智能表格粘贴、拼写检查
 */
import { useEffect, useRef } from 'react'
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter } from '@codemirror/view'
import { EditorState, EditorSelection } from '@codemirror/state'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching, indentOnInput, foldGutter } from '@codemirror/language'
import { searchKeymap, highlightSelectionMatches, selectSelectionMatches } from '@codemirror/search'
import { colorSwatches } from '../plugins/colorSwatch'
import { createFocusModePlugin } from '../plugins/focusMode'
import { relativeLineNumbers } from '../plugins/relativeLineNumbers'
import { dueDateHighlight } from '../plugins/dueDate'
import { highlightMark } from '../plugins/highlightMark'
import { htmlToMarkdown } from '../utils/htmlToMarkdown'
import { normalizeDocument } from '../utils/normalize'
import { createTableExtension, tableLightTheme, tableDarkTheme } from '@markwhen/codemirror-tables'
import { Tab, useEditorStore } from '../store/editorStore'
import { createEditorTheme } from '../plugins/theme'
import { createSlashCommandExtension } from '../plugins/slashCommand'
import { linkHoverTooltip } from '../plugins/linkPreview'
import { markdownLinter } from '../plugins/markdownLint'
import { createEmojiPickerExtension } from '../plugins/emojiPicker'
import { createWikiLinkCompletion } from '../plugins/wikiLinkCompletion'

// 视图插件工厂（折叠服务、装饰、打字机、wiki 导航）
import {
  markdownHeadingFold,
  codeFenceFold,
  navigateToWikiLink,
  createSelectionHighlightPlugin,
  createParagraphGapPlugin,
  createIndentGuidesPlugin,
  createLineDiffPlugin,
  createDecorationPlugin,
  createTypewriterPlugin,
} from './editorPlugins'
// 命令函数 + 光标历史栈
import {
  pushCursor,
  cursorHistoryBack,
  cursorHistoryForward,
  wrapSel,
  autoContinueList,
  moveLineUp,
  moveLineDown,
  duplicateLine,
  deleteLine,
  insertLineBelow,
  insertLineAbove,
  formatMarkdownTable,
  sortTable,
  transposeTable,
  insertDate,
  insertTime,
  insertDateTime,
  insertTimestamp,
  insertWeekday,
  addCursorAbove,
  addCursorBelow,
  expandSnippet,
  promoteHeading,
  demoteHeading,
  autoClosePair,
  renumberLists,
  toggleBookmark,
  nextBookmark,
  prevBookmark,
  foldToLevel,
  unfoldAll,
  insertTable,
  tableCellNav,
  indentListItem,
  dedentListItem,
  transformCase,
  sortSelectedLines,
  reverseSelectedLines,
  uniqueSelectedLines,
  numberSelectedLines,
  insertToc,
  inlineToRefLinks,
  deleteTableRow,
  insertTableRow,
  deleteTableColumn,
  insertTableColumn,
  deleteParagraph,
  wrapHtmlComment,
  appendTodayDue,
  insertHr,
  wrapCodeFence,
  toggleBlockquote,
  panguSpacing,
  toggleTaskCheckbox,
  normalizeDoc,
} from './editorCommands'
// 智能表格粘贴 + 拼写检查
import {
  parseClipboardTable,
  convertToMarkdownTable,
  createSpellCheckPlugin,
} from './clipboardTable'

interface EditorProps { tab: Tab }

export function Editor({ tab }: EditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const { updateTabContent, updateTabCursor, setScrollProgress, theme, focusMode, typewriterMode, fontSize, wordWrap, showLineNumbers, fontFamily, tabSize, typewriterSound, selectionHighlight, relativeLineNumbers: useRelative } = useEditorStore()
  const isDark = theme === 'dark'

  useEffect(() => {
    if (!editorRef.current) return

    const updateHandler = EditorView.updateListener.of(update => {
      if (update.docChanged) updateTabContent(tab.id, update.state.doc.toString())
      if (update.selectionSet) {
        const head = update.state.selection.main.head
        const line = update.state.doc.lineAt(head)
        updateTabCursor(tab.id, line.number, head - line.from + 1)
        pushCursor(head)
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
        // 智能表格粘贴：检测制表符分隔的多行文本
        const text = event.clipboardData?.getData('text/plain')
        const htmlData = event.clipboardData?.getData('text/html')
        // 优先：富文本 HTML → Markdown（网页/Word/Notion 复制）
        if (htmlData && htmlData.length > 20) {
          const md = htmlToMarkdown(htmlData)
          if (md && md.trim().length > 2) {
            event.preventDefault()
            const pos = view.state.selection.main.head
            view.dispatch({ changes: { from: pos, insert: md }, selection: { anchor: pos + md.length } })
            return true
          }
        }
        if (text) {
          const tableRows = parseClipboardTable(text)
          if (tableRows) {
            event.preventDefault()
            const mdTable = convertToMarkdownTable(tableRows)
            const pos = view.state.selection.main.head
            view.dispatch({
              changes: { from: pos, insert: mdTable },
              selection: { anchor: pos + mdTable.length }
            })
            return true
          }
        }
        return false
      },
      drop(event, view) {
        const files = event.dataTransfer?.files
        if (!files || files.length === 0) return false
        const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'))
        if (imageFiles.length === 0) return false
        event.preventDefault()
        // 获取拖放位置
        const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
        const insertFrom = pos ?? view.state.selection.main.head
        let offset = 0
        for (const file of imageFiles) {
          const reader = new FileReader()
          reader.onload = async () => {
            const base64 = (reader.result as string).split(',')[1]
            if (!window.api) return
            try {
              const relPath = await window.api.savePastedImage(base64, tab.filePath || null)
              const insertText = `\n![](${relPath})\n`
              view.dispatch({
                changes: { from: insertFrom + offset, insert: insertText }
              })
              offset += insertText.length
            } catch (err) { console.error('拖拽图片保存失败:', err) }
          }
          reader.readAsDataURL(file)
        }
        return true
      }
    })

    const state = EditorState.create({
      doc: tab.content,
      selection: { anchor: 0 },
      extensions: [
        EditorState.tabSize.of(tabSize),
        EditorState.allowMultipleSelections.of(true),
        ...(showLineNumbers ? [(useRelative ? relativeLineNumbers() : lineNumbers()), highlightActiveLineGutter()] : []),
        history(),
        indentOnInput(),
        bracketMatching(),
        foldGutter(),
        markdownHeadingFold,
        codeFenceFold,
        ...(wordWrap ? [EditorView.lineWrapping] : []),
        ...(selectionHighlight ? [highlightSelectionMatches({ minSelectionLength: 2, wholeWords: false, highlightWordAroundCursor: true })] : []),
        colorSwatches(),
        // 80 列标尺由 theme.ts 的 .cm-content::after (CSS) 绘制，无需额外扩展
        createEditorTheme(isDark, fontSize, fontFamily),
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
          { key: 'Mod-Alt-s', run: v => sortTable(v, false), shift: v => sortTable(v, true) },
          { key: 'Mod-Alt-T', run: transposeTable },
          { key: 'Mod-Shift-Alt-F', run: normalizeDoc },
          { key: 'Alt-x', run: toggleTaskCheckbox },
          { key: 'Mod-Shift-q', run: toggleBlockquote },
          { key: 'Mod-Alt-p', run: panguSpacing },
          { key: 'Mod-Alt-d', run: deleteTableRow },
          { key: 'Mod-Alt-n', run: insertTableRow },
          { key: 'Mod-Alt-c', run: deleteTableColumn },
          { key: 'Mod-Alt-v', run: insertTableColumn },
          { key: 'Mod-Alt-k', run: deleteParagraph },
          { key: 'Mod-Alt-/', run: wrapHtmlComment },
          { key: 'Mod-Alt-0', run: appendTodayDue },
          { key: 'Mod-Alt-h', run: insertHr },
          { key: 'Mod-Alt-f', run: wrapCodeFence },
          { key: 'Alt-d', run: insertDate, shift: insertDateTime },
          { key: 'Alt-t', run: insertTime, shift: insertTimestamp },
          { key: 'Alt-w', run: insertWeekday },
          { key: 'Mod-Alt-ArrowUp', run: addCursorAbove },
          { key: 'Mod-Alt-ArrowDown', run: addCursorBelow },
          { key: 'Mod-Shift-BracketLeft', run: promoteHeading },
          { key: 'Mod-Shift-BracketRight', run: demoteHeading },
          { key: 'Mod-Shift-U', run: v => transformCase(v, 'upper') },
          { key: 'Mod-Shift-L', run: v => transformCase(v, 'lower') },
          { key: 'Mod-Alt-T', run: v => transformCase(v, 'title') },
          { key: 'Mod-Alt-j', run: v => transformCase(v, 'sentence') },
          { key: 'Alt-ArrowLeft', run: cursorHistoryBack },
          { key: 'Alt-ArrowRight', run: cursorHistoryForward },
          { key: 'Mod-Shift-L', run: selectSelectionMatches },
          { key: 'F5', run: sortSelectedLines },
          { key: 'F6', run: reverseSelectedLines },
          { key: 'F7', run: uniqueSelectedLines },
          { key: 'F8', run: numberSelectedLines },
          { key: 'F9', run: insertToc },
          { key: 'Mod-1', run: v => foldToLevel(v, 1) },
          { key: 'Mod-2', run: v => foldToLevel(v, 2) },
          { key: 'Mod-3', run: v => foldToLevel(v, 3) },
          { key: 'Mod-4', run: v => foldToLevel(v, 4) },
          { key: 'Mod-Shift-1', run: unfoldAll },
          { key: 'Mod-Shift-T', run: insertTable },
          { key: 'Mod-]', run: indentListItem },
          { key: 'Mod-[', run: dedentListItem },
          { key: 'Tab', run: v => tableCellNav(v, true) || expandSnippet(v) },
          { key: 'Enter', run: v => autoContinueList(v) },
          { key: 'Backspace', run: renumberLists },
          { key: 'Delete', run: renumberLists },
          // 自动闭合括号
          { key: '(', run: v => autoClosePair(v, '(', ')') },
          { key: '[', run: v => autoClosePair(v, '[', ']') },
          { key: '{', run: v => autoClosePair(v, '{', '}') },
          { key: '"', run: v => autoClosePair(v, '"', '"') },
          { key: "'", run: v => autoClosePair(v, "'", "'") },
          // 书签
          { key: 'Mod-F2', run: toggleBookmark },
          { key: 'F2', run: nextBookmark },
          { key: 'Shift-F2', run: prevBookmark },
        ]),
        updateHandler,
        pasteHandler,
        EditorView.domEventHandlers({
          mousedown(event, view) {
            if (event.button !== 0) return false
            const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
            if (pos === null) return false

            // Ctrl+Click: wiki 链接导航
            if (event.ctrlKey) {
              const line = view.state.doc.lineAt(pos)
              const text = line.text
              const offset = pos - line.from
              // 检查是否在 [[...]] 内
              const wikiRe = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g
              let m
              while ((m = wikiRe.exec(text))) {
                const start = m.index
                const end = start + m[0].length
                if (offset >= start && offset <= end) {
                  event.preventDefault()
                  const linkTarget = m[1].trim()
                  navigateToWikiLink(linkTarget)
                  return true
                }
              }
              // 检查是否在 [text](url) 内
              const mdLinkRe = /\[([^\]]+)\]\(([^)]+)\)/g
              while ((m = mdLinkRe.exec(text))) {
                const start = m.index
                const end = start + m[0].length
                if (offset >= start && offset <= end) {
                  const url = m[2]
                  if (url.startsWith('http://') || url.startsWith('https://')) {
                    event.preventDefault()
                    window.open(url, '_blank')
                    return true
                  }
                }
              }
              // 检查是否在脚注引用 [^xxx] 内
              const fnRefRe = /\[\^([^\]]+)\]/g
              while ((m = fnRefRe.exec(text))) {
                const start = m.index
                const end = start + m[0].length
                if (offset >= start && offset <= end) {
                  event.preventDefault()
                  const fnName = m[1]
                  // 搜索脚注定义 [^xxx]:
                  for (let li = 1; li <= view.state.doc.lines; li++) {
                    const dl = view.state.doc.line(li)
                    const defMatch = dl.text.match(new RegExp(`^\\[^${fnName}\\]:\\s`))
                    if (defMatch) {
                      view.dispatch({ selection: { anchor: dl.from }, effects: EditorView.scrollIntoView(dl.from) })
                      return true
                    }
                  }
                  return true
                }
              }
              // 添加额外光标
              event.preventDefault()
              const sel = view.state.selection
              const newRanges = [...sel.ranges, EditorSelection.range(pos, pos)]
              view.dispatch({ selection: EditorSelection.create(newRanges) })
              return true
            }
            return false
          },
          mousemove(event, view) {
            const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
            if (pos === null) { document.querySelector('.cm-link-tooltip')?.remove(); return false }
            const line = view.state.doc.lineAt(pos)
            const text = line.text
            const offset = pos - line.from
            // 检查链接
            const linkRe = /\[([^\]]+)\]\(([^)]+)\)/g
            let m
            let found = false
            while ((m = linkRe.exec(text))) {
              if (offset >= m.index && offset <= m.index + m[0].length) {
                const url = m[2]
                const display = url.length > 60 ? url.slice(0, 57) + '...' : url
                let tip = document.querySelector('.cm-link-tooltip') as HTMLElement | null
                if (!tip) {
                  tip = document.createElement('div')
                  tip.className = 'cm-link-tooltip'
                  tip.style.cssText = 'position:fixed;z-index:9999;padding:4px 8px;border-radius:4px;font-size:12px;max-width:400px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;pointer-events:none;background:var(--bg-tertiary);color:var(--text-primary);box-shadow:var(--shadow)'
                  document.body.appendChild(tip)
                }
                tip.textContent = display
                tip.style.left = event.clientX + 10 + 'px'
                tip.style.top = event.clientY + 20 + 'px'
                found = true
                break
              }
            }
            if (!found) document.querySelector('.cm-link-tooltip')?.remove()
            return false
          },
          contextmenu(event, view) {
            event.preventDefault()
            document.querySelector('.cm-editor-ctx-menu')?.remove()
            const menu = document.createElement('div')
            menu.className = 'context-menu cm-editor-ctx-menu'
            menu.style.left = `${event.clientX}px`
            menu.style.top = `${event.clientY}px`
            const items: { label?: string; action?: () => void; divider?: true }[] = [
              { label: '✂️ 剪切', action: () => document.execCommand('cut') },
              { label: '📋 复制', action: () => document.execCommand('copy') },
              { label: '📌 粘贴', action: () => document.execCommand('paste') },
              { divider: true },
              { label: '☑️ 全选', action: () => view.dispatch({ selection: { anchor: 0, head: view.state.doc.length } }) },
              { divider: true },
              { label: '** 加粗', action: () => wrapSel(view, '**') },
              { label: '* 斜体', action: () => wrapSel(view, '*') },
              { label: '` 代码', action: () => wrapSel(view, '`') },
              { label: '~~ 删除线', action: () => wrapSel(view, '~~') },
            ]
            for (const item of items) {
              if (item.divider) {
                const d = document.createElement('div')
                d.className = 'context-menu-divider'
                menu.appendChild(d)
              } else if (item.label && item.action) {
                const el = document.createElement('div')
                el.className = 'context-menu-item'
                el.textContent = item.label
                el.addEventListener('click', () => { item.action!(); menu.remove() })
                menu.appendChild(el)
              }
            }
            document.addEventListener('click', () => menu.remove(), { once: true })
            document.body.appendChild(menu)
            return true
          }
        }),
        createSelectionHighlightPlugin(),
        createIndentGuidesPlugin(),
        createParagraphGapPlugin(),
        createFocusModePlugin(),
        dueDateHighlight(),
        highlightMark(),
        createSpellCheckPlugin(),
        createLineDiffPlugin(tab.originalContent),
        createDecorationPlugin(),
        createTypewriterPlugin(),
        createSlashCommandExtension(),
        linkHoverTooltip,
        markdownLinter,
        ...createEmojiPickerExtension(),
        ...createWikiLinkCompletion(),
      ]
    })

    const view = new EditorView({ state, parent: editorRef.current })
    viewRef.current = view
    return () => { view.destroy(); viewRef.current = null }
  }, [tab.id, isDark, fontSize, fontFamily, tabSize, wordWrap, showLineNumbers, typewriterSound, selectionHighlight, useRelative])

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

// ============ 对外命令 re-export（保持 CommandPalette 等外部 import 路径不变） ============

export {
  formatMarkdownTable,
  sortTable,
  transposeTable,
  insertDate,
  insertTime,
  insertDateTime,
  insertTimestamp,
  insertWeekday,
  inlineToRefLinks,
  deleteTableColumn,
  selectParagraph,
  wrapCallout,
  smartLinkify,
  toggleTaskItem,
  toggleUnorderedList,
  toggleOrderedList,
  fullWidthToHalf,
  cycleColumnAlign,
} from './editorCommands'
