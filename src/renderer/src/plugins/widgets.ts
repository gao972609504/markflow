/**
 * CodeMirror Widget 类型
 * — 图片行内预览、任务列表复选框
 */
import { WidgetType, EditorView } from '@codemirror/view'
import katex from 'katex'

// ============ 图片行内预览 Widget ============

export class ImageWidget extends WidgetType {
  constructor(readonly src: string, readonly alt: string) { super() }
  toDOM() {
    const img = document.createElement('img')
    img.src = this.src
    img.alt = this.alt
    img.className = 'cm-inline-image'
    img.loading = 'lazy'
    img.onerror = () => { img.style.display = 'none' }
    return img
  }
  eq(other: ImageWidget) { return this.src === other.src && this.alt === other.alt }
}

// ============ TOC 目录 Widget ============

interface TocEntry {
  level: number
  text: string
}

export class TocWidget extends WidgetType {
  constructor(readonly entries: TocEntry[]) { super() }
  toDOM() {
    const container = document.createElement('div')
    container.className = 'cm-toc-widget'
    const title = document.createElement('div')
    title.className = 'cm-toc-title'
    title.textContent = '目录'
    container.appendChild(title)

    for (const entry of this.entries) {
      const item = document.createElement('div')
      item.className = `cm-toc-item cm-toc-level-${entry.level}`
      item.textContent = entry.text
      container.appendChild(item)
    }

    if (this.entries.length === 0) {
      const empty = document.createElement('div')
      empty.className = 'cm-toc-empty'
      empty.textContent = '暂无标题'
      container.appendChild(empty)
    }

    return container
  }
  eq(other: TocWidget) {
    if (this.entries.length !== other.entries.length) return false
    return this.entries.every((e, i) => e.level === other.entries[i].level && e.text === other.entries[i].text)
  }
  ignoreEvent() { return false }
}

// ============ Emoji 渲染 Widget ============

export class EmojiWidget extends WidgetType {
  constructor(readonly emoji: string) { super() }
  toDOM() {
    const span = document.createElement('span')
    span.textContent = this.emoji
    span.className = 'cm-emoji-rendered'
    return span
  }
  eq(other: EmojiWidget) { return this.emoji === other.emoji }
  ignoreEvent() { return false }
}

// ============ Admonition/Callout Widget ============

const calloutConfig: Record<string, { icon: string; label: string; className: string }> = {
  'tip': { icon: '💡', label: '提示', className: 'cm-callout-tip' },
  'info': { icon: 'ℹ️', label: '信息', className: 'cm-callout-info' },
  'warning': { icon: '⚠️', label: '警告', className: 'cm-callout-warning' },
  'danger': { icon: '🔴', label: '危险', className: 'cm-callout-danger' },
  'note': { icon: '📝', label: '笔记', className: 'cm-callout-note' },
  'quote': { icon: '💬', label: '引用', className: 'cm-callout-quote' },
  'success': { icon: '✅', label: '成功', className: 'cm-callout-success' },
  'bug': { icon: '🐛', label: 'Bug', className: 'cm-callout-bug' },
  'example': { icon: '📋', label: '示例', className: 'cm-callout-example' },
  'question': { icon: '❓', label: '问题', className: 'cm-callout-question' },
}

export class CalloutWidget extends WidgetType {
  constructor(readonly type: string, readonly content: string) { super() }
  toDOM() {
    const config = calloutConfig[this.type] || calloutConfig['note']
    const box = document.createElement('div')
    box.className = `cm-callout-widget ${config.className}`

    const header = document.createElement('div')
    header.className = 'cm-callout-header'
    header.innerHTML = `<span class="cm-callout-icon">${config.icon}</span> <span class="cm-callout-label">${config.label}</span>`
    box.appendChild(header)

    if (this.content.trim()) {
      const body = document.createElement('div')
      body.className = 'cm-callout-body'
      body.textContent = this.content
      box.appendChild(body)
    }

    return box
  }
  eq(other: CalloutWidget) { return this.type === other.type && this.content === other.content }
  ignoreEvent() { return false }
}

// ============ 脚注引用 Widget ============

export class FootnoteRefWidget extends WidgetType {
  constructor(readonly id: string) { super() }
  toDOM() {
    const sup = document.createElement('sup')
    sup.className = 'cm-footnote-ref'
    sup.textContent = this.id
    return sup
  }
  eq(other: FootnoteRefWidget) { return this.id === other.id }
  ignoreEvent() { return false }
}

// ============ 复选框 Widget ============

export class CheckboxWidget extends WidgetType {
  constructor(readonly checked: boolean, readonly lineFrom: number) { super() }
  toDOM() {
    const wrap = document.createElement('span')
    wrap.className = 'cm-checkbox-wrap'
    const cb = document.createElement('input')
    cb.type = 'checkbox'
    cb.checked = this.checked
    cb.className = 'cm-checkbox-input'
    cb.addEventListener('click', (e) => {
      e.preventDefault()
      const view = getEditorView(e.target as HTMLElement)
      if (!view) return
      const line = view.state.doc.lineAt(this.lineFrom)
      const text = line.text
      const newChar = this.checked ? ' ' : 'x'
      const checkIdx = text.indexOf(this.checked ? '[x]' : '[ ]')
      if (checkIdx >= 0) {
        view.dispatch({
          changes: { from: line.from + checkIdx + 1, to: line.from + checkIdx + 2, insert: newChar }
        })
      }
    })
    wrap.appendChild(cb)
    return wrap
  }
  eq(other: CheckboxWidget) { return this.checked === other.checked && this.lineFrom === other.lineFrom }
}

// ============ 代码块头部 Widget ============

export class CodeBlockHeaderWidget extends WidgetType {
  constructor(readonly lang: string, readonly codeContent: string) { super() }
  toDOM() {
    const header = document.createElement('div')
    header.className = 'cm-code-block-header'

    const langLabel = document.createElement('span')
    langLabel.className = 'cm-code-lang'
    langLabel.textContent = this.lang || 'code'
    header.appendChild(langLabel)

    const copyBtn = document.createElement('button')
    copyBtn.className = 'cm-code-copy-btn'
    copyBtn.textContent = '复制'
    copyBtn.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      navigator.clipboard.writeText(this.codeContent).then(() => {
        copyBtn.textContent = '已复制!'
        copyBtn.classList.add('cm-code-copy-done')
        setTimeout(() => {
          copyBtn.textContent = '复制'
          copyBtn.classList.remove('cm-code-copy-done')
        }, 2000)
      })
    })
    header.appendChild(copyBtn)
    return header
  }
  eq(other: CodeBlockHeaderWidget) { return this.lang === other.lang && this.codeContent === other.codeContent }
  ignoreEvent() { return false }
}

// ============ KaTeX 数学公式 Widget ============

export class KatexWidget extends WidgetType {
  constructor(readonly latex: string, readonly displayMode: boolean) { super() }
  toDOM() {
    const container = document.createElement('div')
    container.className = this.displayMode ? 'cm-katex-block' : 'cm-katex-inline'
    try {
      katex.render(this.latex, container, {
        displayMode: this.displayMode,
        throwOnError: false,
        trust: true,
      })
    } catch {
      container.textContent = this.latex
      container.className += ' cm-katex-error'
    }
    return container
  }
  eq(other: KatexWidget) { return this.latex === other.latex && this.displayMode === other.displayMode }
  ignoreEvent() { return false }
}

// ============ 工具函数 ============

/** 从 DOM 元素向上查找最近的 EditorView */
export function getEditorView(el: HTMLElement): EditorView | undefined {
  return el.closest('.cm-editor')?.cmView?.view as EditorView | undefined
}
