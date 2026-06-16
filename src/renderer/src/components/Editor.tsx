/**
 * 泊墨 编辑器 v3
 * 模块化架构：widgets / decorations / theme 拆分为独立插件
 */
import React, { useEffect, useRef } from 'react'
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, Decoration, DecorationSet, ViewPlugin, ViewUpdate } from '@codemirror/view'
import { EditorState, EditorSelection, StateEffect } from '@codemirror/state'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching, indentOnInput, foldService, foldGutter, foldEffect, unfoldEffect, foldedRanges } from '@codemirror/language'
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
import { buildDecorations } from '../plugins/decorations'
import { createEditorTheme } from '../plugins/theme'
import { createSlashCommandExtension } from '../plugins/slashCommand'
import { linkHoverTooltip } from '../plugins/linkPreview'
import { loadCustomSnippets } from './SnippetManager'
import { markdownLinter } from '../plugins/markdownLint'
import { createEmojiPickerExtension } from '../plugins/emojiPicker'
import { createWikiLinkCompletion } from '../plugins/wikiLinkCompletion'

interface EditorProps { tab: Tab }

// ============ Markdown 标题折叠服务 ============

const markdownHeadingFold = foldService.of((state, lineStart, lineEnd) => {
  const line = state.doc.lineAt(lineStart)
  const match = line.text.match(/^(#{1,6})\s/)
  if (!match) return null
  const level = match[1].length
  // 查找下一个同级或更高级标题
  let endLine = line.number
  for (let i = line.number + 1; i <= state.doc.lines; i++) {
    const nextText = state.doc.line(i).text
    const nextMatch = nextText.match(/^(#{1,6})\s/)
    if (nextMatch && nextMatch[1].length <= level) break
    endLine = i
  }
  if (endLine <= line.number) return null
  // 折叠范围：从标题行末到最后一行的末尾
  const endLineInfo = state.doc.line(endLine)
  return { from: line.to, to: endLineInfo.to }
})

// ============ 围栏代码块折叠 ============

const codeFenceFold = foldService.of((state, lineStart, _lineEnd) => {
  const line = state.doc.lineAt(lineStart)
  const open = line.text.match(/^(\s*)```/)
  if (!open) return null
  // 查找闭合围栏（同行或更深缩进的 ```）
  for (let i = line.number + 1; i <= state.doc.lines; i++) {
    const l = state.doc.line(i)
    if (/^\s*```/.test(l.text)) {
      if (i === line.number + 1) return null // 空代码块
      return { from: line.to, to: l.to }
    }
  }
  return null
})

// ============ Wiki 链接导航 ============

async function navigateToWikiLink(target: string) {
  const store = useEditorStore.getState()
  // 尝试在已打开的标签中查找
  const existing = store.tabs.find(t => {
    if (!t.filePath) return false
    const name = t.filePath.split(/[/\\]/).pop() || ''
    const baseName = name.replace(/\.(md|markdown|txt)$/i, '')
    return baseName === target || name === target || name === target + '.md'
  })
  if (existing) {
    store.setActiveTab(existing.id)
    return
  }
  // 尝试在工作区中查找文件
  const folderPath = store.folderPath
  if (folderPath && window.api) {
    const candidates = [
      target,
      target + '.md',
      target + '.markdown',
      target + '.txt',
    ]
    for (const candidate of candidates) {
      // 简单拼接路径
      const sep = folderPath.includes('\\') ? '\\' : '/'
      const fullPath = folderPath + sep + candidate
      try {
        const content = await window.api.readFile(fullPath)
        store.createTab(fullPath, content)
        return
      } catch { /* file not found, try next */ }
    }
  }
  // 文件未找到，不做任何操作
}

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

// ============ 段落间距 ============

const paragraphGap = Decoration.line({ class: 'cm-paragraph-gap' })

function createParagraphGapPlugin() {
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
        for (let i = 1; i <= doc.lines; i++) {
          const line = doc.line(i)
          // 仅在视口范围内计算
          if (line.to < view.viewport.from) continue
          if (line.from > view.viewport.to) break
          if (line.text.trim() === '' && i > 1 && doc.line(i - 1).text.trim() !== '') {
            deco.push({ from: line.from, to: line.from, value: paragraphGap })
          }
        }
        return deco.length ? Decoration.set(deco.map(d => d.value.range(d.from, d.to)), true) : Decoration.none
      }
    },
    { decorations: v => v.deco }
  )
}

// ============ 缩进参考线 ============

function createIndentGuidesPlugin() {
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
          const line = view.state.doc.line(i)
          const text = line.text
          // 计算缩进级别（每2个空格或1个tab为一级）
          const indentMatch = text.match(/^(\t|  )+/)
          if (!indentMatch) continue
          const indentStr = indentMatch[0]
          let col = 0
          for (let c = 0; c < indentStr.length;) {
            if (indentStr[c] === '\t') {
              col++
              c++
            } else if (indentStr.substr(c, 2) === '  ') {
              col++
              c += 2
            } else {
              c++
            }
          }
          // 为每一级缩进添加参考线
          for (let level = 1; level <= col; level++) {
            deco.push({
              from: line.from,
              to: line.from,
              value: Decoration.line({ attributes: { style: `border-left: 1px solid var(--border-color); margin-left: ${(level - 1) * 2}ch` } })
            })
          }
        }
        return deco.length ? Decoration.set(deco.map(d => d.value.range(d.from, d.to)), true) : Decoration.none
      }
    },
    { decorations: v => v.deco }
  )
}

// ============ 行变更指示器 ============

const lineAdded = Decoration.line({ class: 'cm-line-added' })
const lineModified = Decoration.line({ class: 'cm-line-modified' })

function createLineDiffPlugin(originalContent: string) {
  const originalLines = originalContent.split('\n')
  return ViewPlugin.fromClass(
    class {
      deco: DecorationSet
      constructor(view: EditorView) { this.deco = this.build(view) }
      update(u: ViewUpdate) {
        if (u.docChanged) this.deco = this.build(u.view)
      }
      build(view: EditorView) {
        const deco: { from: number; to: number; value: Decoration }[] = []
        const doc = view.state.doc
        for (let i = 1; i <= doc.lines; i++) {
          const line = doc.line(i)
          const lineIdx = i - 1
          if (lineIdx < originalLines.length) {
            if (line.text !== originalLines[lineIdx]) {
              deco.push({ from: line.from, to: line.from, value: lineModified })
            }
          } else {
            deco.push({ from: line.from, to: line.from, value: lineAdded })
          }
        }
        return deco.length ? Decoration.set(deco.map(d => d.value.range(d.from, d.to)), true) : Decoration.none
      }
    },
    { decorations: v => v.deco }
  )
}

// ============ ViewPlugin ============

function createDecorationPlugin() {
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

// ============ Typewriter 滚动 + 音效插件 ============

function createTypewriterPlugin() {
  return EditorView.updateListener.of(update => {
    const state = useEditorStore.getState()
    // Typewriter 滚动：光标行始终居中
    if (state.typewriterMode && (update.selectionSet || update.docChanged)) {
      const head = update.state.selection.main.head
      const line = update.state.doc.lineAt(head)
      requestAnimationFrame(() => {
        update.view.dispatch({
          effects: EditorView.scrollIntoView(line.from, { y: 'center', yMargin: 0 })
        })
      })
    }
    // 打字机音效：仅在有内容变化时触发
    if (state.typewriterSound && update.docChanged) {
      playTypewriterSound()
    }
  })
}

// ============ 打字机音效 ============

let audioCtx: AudioContext | null = null

function playTypewriterSound() {
  try {
    if (!audioCtx) audioCtx = new AudioContext()
    const ctx = audioCtx
    const now = ctx.currentTime

    // 按键音：短促的正弦波
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    // 随机微小频率变化，模拟机械键盘差异
    osc.frequency.value = 800 + Math.random() * 200
    gain.gain.setValueAtTime(0.08, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.06)

    // 附加轻微的机械弹簧声（高频噪声）
    const noise = ctx.createOscillator()
    const noiseGain = ctx.createGain()
    noise.type = 'sine'
    noise.frequency.value = 1200 + Math.random() * 300
    noiseGain.gain.setValueAtTime(0.02, now)
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03)
    noise.connect(noiseGain)
    noiseGain.connect(ctx.destination)
    noise.start(now)
    noise.stop(now + 0.03)
  } catch {
    // 浏览器不支持 AudioContext 时静默失败
  }
}

// ============ Editor 组件 ============

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
        EditorView.rulers([{ column: 80, class: 'cm-ruler' }]),
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

// ============ 表格排序与转置 ============

/** 解析光标所在的 Markdown 表格 */
function parseTableAt(view: EditorView): { startLine: number; endLine: number; rows: string[][]; isSep: boolean[]; sepIndex: number } | null {
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
function rebuildTableLines(rows: string[][], isSep: boolean[]): string[] {
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

function pad2(n: number) { return String(n).padStart(2, '0') }
function insertAtCursor(view: EditorView, text: string): boolean {
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

function addCursorAbove(view: EditorView): boolean {
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

function addCursorBelow(view: EditorView): boolean {
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

function expandSnippet(view: EditorView): boolean {
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

function promoteHeading(view: EditorView): boolean {
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

function demoteHeading(view: EditorView): boolean {
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
function autoClosePair(view: EditorView, open: string, close: string): boolean {
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

function renumberLists(view: EditorView): boolean {
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

function toggleBookmark(view: EditorView): boolean {
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

function nextBookmark(view: EditorView): boolean {
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

function prevBookmark(view: EditorView): boolean {
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

function foldToLevel(view: EditorView, level: number): boolean {
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

function unfoldAll(view: EditorView): boolean {
  const effects: StateEffect<unknown>[] = []
  const folded = foldedRanges(view.state)
  folded.between(0, view.state.doc.length, (from: number, to: number) => {
    effects.push(unfoldEffect.of({ from, to }))
  })
  if (effects.length > 0) view.dispatch({ effects })
  return effects.length > 0
}

// ============ 快速插入表格 ============

function insertTable(view: EditorView): boolean {
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

function tableCellNav(view: EditorView, forward: boolean): boolean {
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

function indentListItem(view: EditorView): boolean {
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

function dedentListItem(view: EditorView): boolean {
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

function transformCase(view: EditorView, mode: 'upper' | 'lower' | 'title'): boolean {
  const { from, to } = view.state.selection.main
  if (from === to) return false
  const text = view.state.sliceDoc(from, to)
  let transformed: string
  if (mode === 'upper') transformed = text.toUpperCase()
  else if (mode === 'lower') transformed = text.toLowerCase()
  else transformed = text.replace(/\b\w/g, c => c.toUpperCase())
  if (transformed === text) return false
  view.dispatch({ changes: { from, to, insert: transformed }, selection: { anchor: from, head: from + transformed.length } })
  return true
}

// ============ 选区行排序 ============

function sortSelectedLines(view: EditorView): boolean {
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

function reverseSelectedLines(view: EditorView): boolean {
  const { from, to } = view.state.selection.main
  if (from === to) return false
  const text = view.state.sliceDoc(from, to)
  const lines = text.split('\n')
  if (lines.length <= 1) return false
  const reversed = [...lines].reverse()
  view.dispatch({ changes: { from, to, insert: reversed.join('\n') }, selection: { anchor: from, head: from + reversed.join('\n').length } })
  return true
}

function uniqueSelectedLines(view: EditorView): boolean {
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

function numberSelectedLines(view: EditorView): boolean {
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

function insertToc(view: EditorView): boolean {
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

function isTableRow(text: string) { return /^\|.*\|\s*$/.test(text.trim()) }
function isTableSeparator(text: string) { return /^\|[\s:\-|]+\|\s*$/.test(text.trim()) }

function deleteTableRow(view: EditorView): boolean {
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

function insertTableRow(view: EditorView): boolean {
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

function insertTableColumn(view: EditorView): boolean {
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

function deleteTableColumnImpl(view: EditorView): boolean {
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

function panguSpacing(view: EditorView): boolean {
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

function toggleBlockquote(view: EditorView): boolean {
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

function toggleTaskCheckbox(view: EditorView): boolean {  const { from, to } = view.state.selection.main
  const doc = view.state.doc
  const startLine = doc.lineAt(from).number
  const endLine = doc.lineAt(to).number
  const changes: { from: number; to: number; insert: string }[] = []
  for (let i = startLine; i <= endLine; i++) {
    const line = doc.line(i)
    const m = line.text.match(/^(\s*)([-*+]|\d+\.)\s\[([ xX])\]/)
    if (m) {
      const charOff = line.from + m[1].length + m[2].length + 1 + 1 // indent + marker + space + '['
      const next = m[3].toLowerCase() === 'x' ? ' ' : 'x'
      changes.push({ from: charOff, to: charOff + 1, insert: next })
    }
  }
  if (changes.length === 0) return false
  view.dispatch({ changes })
  return true
}

// ============ 文档格式整理 ============

function normalizeDoc(view: EditorView): boolean {  const cur = view.state.doc.toString()
  const normalized = normalizeDocument(cur)
  if (normalized === cur) return false
  const head = view.state.selection.main.head
  view.dispatch({ changes: { from: 0, to: cur.length, insert: normalized } })
  // 尽量保持光标位置不越界
  const newHead = Math.min(head, normalized.length)
  view.dispatch({ selection: { anchor: newHead } })
  return true
}

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

function createSpellCheckPlugin() {
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
function parseClipboardTable(text: string): string[][] | null {
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
function convertToMarkdownTable(rows: string[][]): string {
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
