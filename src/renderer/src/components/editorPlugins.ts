/**
 * CodeMirror 6 视图插件工厂集合
 * — 从 Editor.tsx 拆分而来：折叠服务、装饰插件、打字机音效等无状态扩展
 */
import { EditorView, ViewPlugin, ViewUpdate, Decoration, DecorationSet } from '@codemirror/view'
import { foldService } from '@codemirror/language'
import { useEditorStore } from '../store/editorStore'
import { buildDecorations } from '../plugins/decorations'

// ============ Markdown 标题折叠服务 ============

export const markdownHeadingFold = foldService.of((state, lineStart, lineEnd) => {
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

export const codeFenceFold = foldService.of((state, lineStart, _lineEnd) => {
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

export async function navigateToWikiLink(target: string) {
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

export function createSelectionHighlightPlugin() {
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

export function createParagraphGapPlugin() {
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

export function createIndentGuidesPlugin() {
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

export function createLineDiffPlugin(originalContent: string) {
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

export function createDecorationPlugin() {
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

export function createTypewriterPlugin() {
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
