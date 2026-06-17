/**
 * Slash Commands Plugin for CodeMirror 6
 *
 * 类似 Notion / Obsidian 的斜杠命令面板：
 * 输入 "/" 后弹出快速插入菜单，支持模糊搜索、键盘导航。
 */
import { EditorView, keymap, ViewPlugin, ViewUpdate, Decoration, DecorationSet, WidgetType } from '@codemirror/view'
import { StateField, StateEffect } from '@codemirror/state'
import { syntaxTree } from '@codemirror/language'

// ============ 命令定义 ============

interface SlashItem {
  label: string          // 显示名称
  alias: string[]        // 搜索别名
  icon: string           // emoji 图标
  insert: string         // 插入文本（{cursor} 标记光标位置）
  category: string       // 分类
  description: string    // 简短描述
}

const slashItems: SlashItem[] = [
  // ── 标题 ──
  { label: '一级标题', alias: ['h1', 'heading1', '一级', '标题1'], icon: '𝗛₁', insert: '# {cursor}', category: '标题', description: '大标题' },
  { label: '二级标题', alias: ['h2', 'heading2', '二级', '标题2'], icon: '𝗛₂', insert: '## {cursor}', category: '标题', description: '中标题' },
  { label: '三级标题', alias: ['h3', 'heading3', '三级', '标题3'], icon: '𝗛₃', insert: '### {cursor}', category: '标题', description: '小标题' },
  { label: '四级标题', alias: ['h4', 'heading4', '四级', '标题4'], icon: '𝗛₄', insert: '#### {cursor}', category: '标题', description: '四级标题' },
  { label: '五级标题', alias: ['h5', 'heading5', '五级', '标题5'], icon: '𝗛₅', insert: '##### {cursor}', category: '标题', description: '五级标题' },
  { label: '六级标题', alias: ['h6', 'heading6', '六级', '标题6'], icon: '𝗛₆', insert: '###### {cursor}', category: '标题', description: '六级标题' },

  // ── 列表 ──
  { label: '无序列表', alias: ['bullet', 'ul', '无序', '列表'], icon: '•', insert: '- {cursor}', category: '列表', description: '项目符号列表' },
  { label: '有序列表', alias: ['number', 'ol', '有序', '数字'], icon: '1.', insert: '1. {cursor}', category: '列表', description: '数字编号列表' },
  { label: '任务列表', alias: ['task', 'todo', 'check', '任务', '待办'], icon: '☐', insert: '- [ ] {cursor}', category: '列表', description: '可勾选的任务列表' },

  // ── 代码与数学 ──
  { label: '代码块', alias: ['code', '代码'], icon: '⟨⟩', insert: '```\n{cursor}\n```', category: '代码', description: '代码块' },
  { label: '行内代码', alias: ['inline', 'inline code', '行内代码'], icon: '`', insert: '`{cursor}`', category: '代码', description: '行内代码' },
  { label: '数学公式', alias: ['math', '公式', 'katex', 'latex'], icon: '∑', insert: '$$\n{cursor}\n$$', category: '代码', description: 'LaTeX 数学公式块' },
  { label: '行内公式', alias: ['inline math', '行内公式'], icon: 'π', insert: '${cursor}$', category: '代码', description: '行内数学公式' },

  // ── 插入 ──
  { label: '表格', alias: ['table', '表格'], icon: '⊞', insert: '| 列1 | 列2 | 列3 |\n| --- | --- | --- |\n| {cursor} | 内容 | 内容 |', category: '插入', description: '插入 3×2 表格' },
  { label: '分割线', alias: ['hr', 'divider', 'line', '分割线', '分隔'], icon: '—', insert: '\n---\n', category: '插入', description: '水平分割线' },
  { label: '图片', alias: ['image', 'img', '图片', '图像'], icon: '🖼', insert: '![{cursor}](url)', category: '插入', description: '插入图片' },
  { label: '链接', alias: ['link', 'url', '链接'], icon: '🔗', insert: '[{cursor}](url)', category: '插入', description: '插入链接' },
  { label: '脚注', alias: ['footnote', 'fn', '脚注'], icon: '†', insert: '[^{cursor}]\n\n[^]: ', category: '插入', description: '插入脚注引用' },

  // ── 格式 ──
  { label: '引用', alias: ['quote', 'blockquote', '引用', '块引用'], icon: '❝', insert: '> {cursor}', category: '格式', description: '引用块' },
  { label: '加粗', alias: ['bold', 'b', '加粗', '粗体'], icon: '𝗕', insert: '**{cursor}**', category: '格式', description: '加粗文字' },
  { label: '斜体', alias: ['italic', 'i', '斜体', 'em'], icon: '𝐼', insert: '*{cursor}*', category: '格式', description: '斜体文字' },
  { label: '删除线', alias: ['strike', 'strikethrough', '删除线'], icon: 'S̶', insert: '~~{cursor}~~', category: '格式', description: '删除线' },
  { label: '高亮', alias: ['highlight', 'mark', '高亮', '标记'], icon: '▮', insert: '=={cursor}==', category: '格式', description: '高亮文字' },

  // ── 高级 ──
  { label: 'Callout 提示', alias: ['callout', 'tip', '提示', 'admonition'], icon: '💡', insert: ':::tip\n{cursor}\n:::', category: '高级', description: '提示块' },
  { label: 'Callout 信息', alias: ['info', '信息'], icon: 'ℹ️', insert: ':::info\n{cursor}\n:::', category: '高级', description: '信息块' },
  { label: 'Callout 警告', alias: ['warning', 'warn', '警告'], icon: '⚠️', insert: ':::warning\n{cursor}\n:::', category: '高级', description: '警告块' },
  { label: 'Callout 危险', alias: ['danger', '危险'], icon: '🚫', insert: ':::danger\n{cursor}\n:::', category: '高级', description: '危险提示块' },
  { label: 'Wiki 链接', alias: ['wiki', '双链', 'wikilink'], icon: '[[]]', insert: '[[{cursor}]]', category: '高级', description: '双向链接' },
  { label: '日期', alias: ['date', '日期', 'today', '今天'], icon: '📅', insert: new Date().toLocaleDateString('zh-CN'), category: '高级', description: '插入当前日期' },
  { label: '时间', alias: ['time', '时间', 'now', '现在'], icon: '🕐', insert: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }), category: '高级', description: '插入当前时间' },
  { label: '目录', alias: ['toc', '目录', 'table of contents'], icon: '📑', insert: '## 目录\n\n{cursor}', category: '高级', description: '插入目录占位' },
]

// ============ 模糊搜索 ============

function filterItems(query: string): SlashItem[] {
  if (!query) return slashItems
  const q = query.toLowerCase()
  return slashItems.filter(item => {
    if (item.label.toLowerCase().includes(q)) return true
    if (item.alias.some(a => a.toLowerCase().includes(q))) return true
    // 拼音首字母 / 简单子串匹配
    return item.category.toLowerCase().includes(q)
  })
}

// ============ State Effects ============

interface SlashState {
  visible: boolean
  pos: number        // "/" 的位置
  filter: string     // "/" 后面的过滤文本
  selectedIndex: number
  filteredItems: SlashItem[]
}

const slashEffect = StateEffect.define<SlashState | null>()

const slashState = StateField.define<SlashState | null>({
  create: () => null,
  update: (val, tr) => {
    for (const e of tr.effects) {
      if (e.is(slashEffect)) return e.value
    }
    return val
  }
})

// ============ 浮动面板 DOM ============

let panelEl: HTMLDivElement | null = null
let panelCleanup: (() => void) | null = null

function ensurePanel(): HTMLDivElement {
  if (panelEl && panelEl.parentNode) return panelEl
  panelEl = document.createElement('div')
  panelEl.className = 'cm-slash-panel'
  panelEl.setAttribute('role', 'listbox')
  document.body.appendChild(panelEl)
  return panelEl
}

function removePanel() {
  if (panelEl) {
    panelEl.remove()
    panelEl = null
  }
  if (panelCleanup) {
    panelCleanup()
    panelCleanup = null
  }
}

function renderPanel(view: EditorView, state: SlashState | null) {
  const panel = ensurePanel()
  if (!state || !state.visible) {
    removePanel()
    return
  }

  const items = state.filteredItems
  if (items.length === 0) {
    removePanel()
    return
  }

  // 计算面板位置（光标下方）
  const slashPos = state.pos + state.filter.length + 1 // +1 for "/"
  const coords = view.coordsAtPos(slashPos)
  if (!coords) { removePanel(); return }

  // 构建分类组
  const grouped: Map<string, SlashItem[]> = new Map()
  for (const item of items) {
    const group = grouped.get(item.category) || []
    group.push(item)
    grouped.set(item.category, group)
  }

  let html = ''
  let globalIdx = 0
  for (const [category, groupItems] of grouped) {
    html += `<div class="cm-slash-category">${category}</div>`
    for (const item of groupItems) {
      const selected = globalIdx === state.selectedIndex
      html += `<div class="cm-slash-item${selected ? ' selected' : ''}" data-idx="${globalIdx}" role="option">
        <span class="cm-slash-icon">${item.icon}</span>
        <div class="cm-slash-info">
          <span class="cm-slash-label">${item.label}</span>
          <span class="cm-slash-desc">${item.description}</span>
        </div>
      </div>`
      globalIdx++
    }
  }

  panel.innerHTML = html

  // 定位
  const panelHeight = panel.offsetHeight || 280
  const panelWidth = panel.offsetWidth || 260
  let top = (coords.bottom || 0) + 4
  let left = (coords.left || 0)

  // 防止超出视口底部
  if (top + panelHeight > window.innerHeight) {
    top = (coords.top || 0) - panelHeight - 4
  }
  // 防止超出视口右侧
  if (left + panelWidth > window.innerWidth) {
    left = window.innerWidth - panelWidth - 8
  }

  panel.style.top = `${top}px`
  panel.style.left = `${left}px`

  // 滚动选中项到可见
  const selectedEl = panel.querySelector('.cm-slash-item.selected')
  if (selectedEl) {
    selectedEl.scrollIntoView({ block: 'nearest' })
  }

  // 鼠标点击处理
  panelCleanup?.()
  const handler = (e: MouseEvent) => {
    const target = (e.target as HTMLElement).closest('.cm-slash-item') as HTMLElement | null
    if (target && target.dataset.idx !== undefined) {
      e.preventDefault()
      e.stopPropagation()
      const idx = parseInt(target.dataset.idx)
      executeItem(view, idx, state)
    }
  }
  panel.addEventListener('mousedown', handler)
  panelCleanup = () => panel.removeEventListener('mousedown', handler)
}

function executeItem(view: EditorView, idx: number, state: SlashState) {
  const items = state.filteredItems
  if (idx < 0 || idx >= items.length) return
  const item = items[idx]
  const from = state.pos
  const to = from + 1 + state.filter.length // "/" + filter text
  const insertText = item.insert.replace('{cursor}', '')
  const cursorOffset = item.insert.indexOf('{cursor}')

  view.dispatch({
    changes: { from, to, insert: insertText },
    selection: cursorOffset >= 0
      ? { anchor: from + cursorOffset }
      : { anchor: from + insertText.length },
    effects: slashEffect.of(null)
  })
  view.focus()
  removePanel()
}

// ============ 输入检测插件 ============

const slashPlugin = ViewPlugin.fromClass(
  class {
    constructor(readonly view: EditorView) {}

    update(update: ViewUpdate) {
      if (!update.docChanged) {
        // 选区变化时不处理
        renderPanel(this.view, this.view.state.field(slashState, false) ?? null)
        return
      }

      const tr = update.transactions[0]
      if (!tr) return

      // 检查是否由输入触发（非粘贴/程序修改）
      const isUserInput = tr.isUserEvent('input.type')

      const state = this.view.state.field(slashState, false)

      // 如果面板已打开，更新过滤
      if (state && state.visible) {
        // 检查光标是否还在 "/" 后面
        const head = this.view.state.selection.main.head
        if (head <= state.pos) {
          // 光标移到了 "/" 前面，关闭面板
          this.view.dispatch({ effects: slashEffect.of(null) })
          removePanel()
          return
        }
        // 更新过滤文本
        const filterText = this.view.state.sliceDoc(state.pos + 1, head)
        if (filterText.includes('\n')) {
          this.view.dispatch({ effects: slashEffect.of(null) })
          removePanel()
          return
        }
        const filtered = filterItems(filterText)
        this.view.dispatch({
          effects: slashEffect.of({
            visible: true,
            pos: state.pos,
            filter: filterText,
            selectedIndex: Math.min(state.selectedIndex, Math.max(0, filtered.length - 1)),
            filteredItems: filtered,
          })
        })
        return
      }

      // 检查是否输入了 "/"
      if (!isUserInput) return
      tr.changes.iterChangedRanges((fromA: number, _toA: number, fromB: number, toB: number) => {
        if (state && state.visible) return
        const insertText = tr.newDoc.sliceString(fromB, toB)
        const slashOffset = insertText.lastIndexOf('/')
        if (slashOffset < 0) return
        // "/" 在新文档中的位置 = 插入起点 + 其在 inserted 中的偏移
        const slashPos = fromA + slashOffset
        // 检查是否在行首或空格后（不在代码块内）
        const line = this.view.state.doc.lineAt(slashPos)
        const textBefore = line.text.slice(0, slashPos - line.from)

        // 在代码块内不触发
        const tree = syntaxTree(this.view.state)
        let inCodeBlock = false
        tree.iterate({
          from: slashPos,
          to: slashPos,
          enter(node) {
            if (node.type.name === 'FencedCode' || node.type.name === 'InlineCode') {
              inCodeBlock = true
              return false
            }
          }
        })
        if (inCodeBlock) return

        // 行首或前面是空格时触发
        if (textBefore === '' || textBefore.endsWith(' ')) {
          const filtered = filterItems('')
          this.view.dispatch({
            effects: slashEffect.of({
              visible: true,
              pos: slashPos,
              filter: '',
              selectedIndex: 0,
              filteredItems: filtered,
            })
          })
        }
      })
    }

    destroy() {
      removePanel()
    }
  },
  {
    decorations: () => Decoration.none,
  }
)

// ============ 键盘导航 ============

const slashKeymap = keymap.of([
  {
    key: 'ArrowDown',
    run(view) {
      const state = view.state.field(slashState, false)
      if (!state || !state.visible) return false
      const newIdx = Math.min(state.selectedIndex + 1, state.filteredItems.length - 1)
      view.dispatch({
        effects: slashEffect.of({ ...state, selectedIndex: newIdx })
      })
      return true
    }
  },
  {
    key: 'ArrowUp',
    run(view) {
      const state = view.state.field(slashState, false)
      if (!state || !state.visible) return false
      const newIdx = Math.max(state.selectedIndex - 1, 0)
      view.dispatch({
        effects: slashEffect.of({ ...state, selectedIndex: newIdx })
      })
      return true
    }
  },
  {
    key: 'Enter',
    run(view) {
      const state = view.state.field(slashState, false)
      if (!state || !state.visible) return false
      executeItem(view, state.selectedIndex, state)
      return true
    }
  },
  {
    key: 'Tab',
    run(view) {
      const state = view.state.field(slashState, false)
      if (!state || !state.visible) return false
      executeItem(view, state.selectedIndex, state)
      return true
    }
  },
  {
    key: 'Escape',
    run(view) {
      const state = view.state.field(slashState, false)
      if (!state || !state.visible) return false
      view.dispatch({ effects: slashEffect.of(null) })
      removePanel()
      return true
    }
  },
])

// ============ 点击外部关闭 ============

const clickOutsidePlugin = EditorView.domEventHandlers({
  mousedown() {
    // 通过 view plugin 的 update 来检查
    return false
  },
  blur(_event: FocusEvent, view: EditorView) {
    // 延迟关闭，以允许面板点击事件先处理
    setTimeout(() => {
      const state = view.state.field(slashState, false)
      if (state && state.visible && !panelEl?.matches(':hover')) {
        view.dispatch({ effects: slashEffect.of(null) })
        removePanel()
      }
    }, 150)
  }
})

// ============ 导出 ============

/**
 * 创建 Slash Commands 扩展
 * 用法: extensions: [createSlashCommandExtension(), ...]
 */
export function createSlashCommandExtension() {
  return [
    slashState,
    slashPlugin,
    slashKeymap,
    clickOutsidePlugin,
    // 面板渲染插件
    EditorView.updateListener.of((update) => {
      if (update.state.field(slashState, false) !== update.startState.field(slashState, false)) {
        renderPanel(update.view, update.state.field(slashState, false) ?? null)
      }
    }),
  ]
}
