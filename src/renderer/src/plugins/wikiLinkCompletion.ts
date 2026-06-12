/**
 * WikiLink 自动补全插件
 * — 在编辑器中输入 `[[` 时弹出建议面板，列出所有可链接的文档
 *
 * 特性：
 * - 输入 `[[` 触发，列出当前工作区中的所有 Markdown 文件
 * - 支持中英文模糊搜索
 * - 键盘导航（↑↓ 选择，Tab/Enter 确认，Esc 关闭）
 * - 自动补全为 [[文件名.md]] 格式
 */
import { EditorView, keymap, ViewPlugin, ViewUpdate } from '@codemirror/view'
import { StateEffect, StateField } from '@codemirror/state'
import { useEditorStore } from '../store/editorStore'
import { FileTreeNode } from '../store/editorStore'

// ============ 状态管理 ============

interface CompletionItem {
  label: string
  value: string
}

interface CompletionState {
  open: boolean
  items: CompletionItem[]
  selectedIndex: number
  query: string
  startPos: number
  panelEl: HTMLDivElement | null
}

const setCompletionEffect = StateEffect.define<Partial<CompletionState>>()
const closeCompletionEffect = StateEffect.define<void>()

const completionField = StateField.define<CompletionState>({
  create() {
    return { open: false, items: [], selectedIndex: 0, query: '', startPos: 0, panelEl: null }
  },
  update(value, tr) {
    for (const e of tr.effects) {
      if (e.is(setCompletionEffect)) {
        return { ...value, ...e.value }
      }
      if (e.is(closeCompletionEffect)) {
        // 移除 panel
        if (value.panelEl) value.panelEl.remove()
        return { open: false, items: [], selectedIndex: 0, query: '', startPos: 0, panelEl: null }
      }
    }
    return value
  },
})
// ============ 构建文件列表 ============

function buildFileList(): CompletionItem[] {
  const store = useEditorStore.getState()
  const items: CompletionItem[] = []

  // 从已打开的标签中获取
  for (const tab of store.tabs) {
    if (tab.filePath) {
      const name = tab.filePath.split(/[/\\]/).pop() || tab.title
      const baseName = name.replace(/\.(md|markdown|txt)$/i, '')
      if (!items.find(i => i.value === baseName)) {
        items.push({ label: name, value: baseName })
      }
    } else {
      // 未命名标签
      items.push({ label: tab.title, value: tab.title })
    }
  }

  // 从文件树中获取
  function walkTree(nodes: FileTreeNode[]) {
    for (const node of nodes) {
      if (node.isDirectory) {
        if (node.children) walkTree(node.children)
      } else if (/\.(md|markdown|txt)$/i.test(node.name)) {
        const baseName = node.name.replace(/\.(md|markdown|txt)$/i, '')
        if (!items.find(i => i.value === baseName)) {
          items.push({ label: node.name, value: baseName })
        }
      }
    }
  }
  walkTree(store.fileTree)

  return items.sort((a, b) => a.label.localeCompare(b.label, 'zh-CN'))
}

// ============ 面板渲染 ============

function renderCompletionPanel(
  view: EditorView,
  state: CompletionState
): HTMLDivElement | null {
  // 移除旧面板
  const existing = document.querySelector('.cm-wikilink-panel') as HTMLDivElement
  existing?.remove()

  if (!state.open || state.items.length === 0) return null

  const panel = document.createElement('div')
  panel.className = 'cm-wikilink-panel'

  // 定位
  const coords = view.coordsAtPos(state.startPos)
  if (coords) {
    const editorRect = view.dom.getBoundingClientRect()
    panel.style.position = 'absolute'
    panel.style.left = `${coords.left - editorRect.left}px`
    panel.style.top = `${coords.bottom - editorRect.top + 4}px`
  }

  // 过滤匹配项
  const q = state.query.toLowerCase().trim()
  const filtered = q
    ? state.items.filter(item =>
        item.label.toLowerCase().includes(q) ||
        item.value.toLowerCase().includes(q)
      )
    : state.items

  const selected = state.selectedIndex % Math.max(filtered.length, 1)

  if (filtered.length === 0) {
    panel.innerHTML = '<div class="cm-wikilink-empty">无匹配文件</div>'
  } else {
    filtered.slice(0, 10).forEach((item, idx) => {
      const div = document.createElement('div')
      div.className = `cm-wikilink-item${idx === selected ? ' selected' : ''}`
      div.innerHTML = `<span class="cm-wikilink-label">${item.label}</span>`
      div.addEventListener('mousedown', (e) => {
        e.preventDefault()
        applyCompletion(view, item.value)
      })
      panel.appendChild(div)
    })
  }

  return panel
}

// ============ 应用补全 ============

function applyCompletion(view: EditorView, value: string) {
  const state = view.state.field(completionField)
  const cursor = view.state.selection.main.head

  // 计算需要替换的范围：从 [[ 之后到光标位置
  const doc = view.state.doc
  const line = doc.lineAt(state.startPos)
  const from = state.startPos + 2 // 跳过 [[
  const to = cursor

  view.dispatch({
    changes: { from, to, insert: value },
    effects: closeCompletionEffect.of(),
    selection: { anchor: state.startPos + 2 + value.length, head: state.startPos + 2 + value.length }
  })
}

// ============ 主插件 ============

export function createWikiLinkCompletion() {
  return [
    completionField,

    ViewPlugin.fromClass(
      class {
        constructor(view: EditorView) {
          this.checkAndOpen(view)
        }
        update(update: ViewUpdate) {
          // 文本变化时检查
          if (update.docChanged) {
            this.checkAndOpen(update.view)
          }
        }
        private checkAndOpen(view: EditorView) {
          const cursor = view.state.selection.main.head
          const doc = view.state.doc
          const line = doc.lineAt(cursor)
          const textBefore = doc.sliceString(line.from, cursor)

          // 检查光标是否在 [[ 之后
          const lastOpen = textBefore.lastIndexOf('[[')
          const lastClose = textBefore.lastIndexOf(']]')

          if (lastOpen >= 0 && lastOpen > lastClose) {
            // 当前在 [[ ... 内部
            const query = textBefore.slice(lastOpen + 2)
            const state = view.state.field(completionField)
            const items = buildFileList()
            const startPos = line.from + lastOpen

            view.dispatch({
              effects: setCompletionEffect.of({
                open: true,
                items,
                query,
                startPos,
                selectedIndex: 0,
              })
            })

            // 渲染面板
            const panel = renderCompletionPanel(view, { ...state, open: true, items, query, startPos })
            if (panel) {
              const editorEl = view.dom.closest('.editor-wrapper')
              if (editorEl) editorEl.appendChild(panel)
            }
          } else {
            // 不在 [[ 内，关闭面板
            const state = view.state.field(completionField)
            if (state.open) {
              if (state.panelEl) state.panelEl.remove()
              view.dispatch({ effects: closeCompletionEffect.of() })
            }
          }
        }
      }
    ),

    // 键盘处理
    keymap.of([
      {
        key: 'ArrowDown',
        run: (view) => {
          const state = view.state.field(completionField)
          if (!state.open) return false
          const q = state.query.toLowerCase().trim()
          const filtered = q
            ? state.items.filter(item =>
                item.label.toLowerCase().includes(q) ||
                item.value.toLowerCase().includes(q)
              )
            : state.items
          view.dispatch({
            effects: setCompletionEffect.of({
              selectedIndex: (state.selectedIndex + 1) % Math.max(filtered.length, 1)
            })
          })
          return true
        }
      },
      {
        key: 'ArrowUp',
        run: (view) => {
          const state = view.state.field(completionField)
          if (!state.open) return false
          const q = state.query.toLowerCase().trim()
          const filtered = q
            ? state.items.filter(item =>
                item.label.toLowerCase().includes(q) ||
                item.value.toLowerCase().includes(q)
              )
            : state.items
          view.dispatch({
            effects: setCompletionEffect.of({
              selectedIndex: (state.selectedIndex - 1 + Math.max(filtered.length, 1)) % Math.max(filtered.length, 1)
            })
          })
          return true
        }
      },
      {
        key: 'Enter',
        run: (view) => {
          const state = view.state.field(completionField)
          if (!state.open || state.items.length === 0) return false
          const q = state.query.toLowerCase().trim()
          const filtered = q
            ? state.items.filter(item =>
                item.label.toLowerCase().includes(q) ||
                item.value.toLowerCase().includes(q)
              )
            : state.items
          if (filtered.length === 0) return false
          const selected = filtered[state.selectedIndex % filtered.length]
          applyCompletion(view, selected.value)
          return true
        }
      },
      {
        key: 'Tab',
        run: (view) => {
          const state = view.state.field(completionField)
          if (!state.open || state.items.length === 0) return false
          const q = state.query.toLowerCase().trim()
          const filtered = q
            ? state.items.filter(item =>
                item.label.toLowerCase().includes(q) ||
                item.value.toLowerCase().includes(q)
              )
            : state.items
          if (filtered.length === 0) return false
          const selected = filtered[state.selectedIndex % filtered.length]
          applyCompletion(view, selected.value)
          return true
        }
      },
      {
        key: 'Escape',
        run: (view) => {
          const state = view.state.field(completionField)
          if (!state.open) return false
          view.dispatch({ effects: closeCompletionEffect.of() })
          return true
        }
      }
    ])
  ]
}
