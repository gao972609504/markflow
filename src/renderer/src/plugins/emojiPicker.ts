/**
 * Emoji 选择器扩展
 *
 * 在编辑器中输入 `:` 后弹出 emoji 选择面板，
 * 支持模糊搜索、键盘导航（↑↓ 选择，Enter/Tab 确认，Esc 关闭）。
 * 选中后替换 `:query` 为 emoji 字符。
 */
import { EditorView, ViewPlugin, Decoration, keymap } from '@codemirror/view'
import { StateEffect, StateField, Extension } from '@codemirror/state'
import { syntaxTree } from '@codemirror/language'

// ============ Emoji 数据 ============

interface EmojiEntry {
  emoji: string
  name: string
  keywords: string[]
}

const emojiData: EmojiEntry[] = [
  { emoji: '😀', name: 'smile', keywords: ['笑脸', '开心', 'happy'] },
  { emoji: '😂', name: 'joy', keywords: ['笑哭', '大笑', 'lol'] },
  { emoji: '🥰', name: 'love', keywords: ['爱心', '喜欢', 'heart'] },
  { emoji: '😎', name: 'cool', keywords: ['酷', '墨镜'] },
  { emoji: '🤔', name: 'think', keywords: ['思考', '疑问'] },
  { emoji: '😮', name: 'wow', keywords: ['惊讶', '哇'] },
  { emoji: '😴', name: 'sleep', keywords: ['睡觉', '困'] },
  { emoji: '🤗', name: 'hug', keywords: ['拥抱'] },
  { emoji: '😅', name: 'sweat', keywords: ['尴尬', '汗'] },
  { emoji: '😢', name: 'cry', keywords: ['哭', '伤心'] },
  { emoji: '😡', name: 'angry', keywords: ['生气', '愤怒'] },
  { emoji: '🥳', name: 'party', keywords: ['庆祝', '派对'] },
  { emoji: '🤩', name: 'star', keywords: ['星星', '惊叹'] },
  { emoji: '🤖', name: 'robot', keywords: ['机器人'] },
  { emoji: '💀', name: 'skull', keywords: ['骷髅', '死'] },
  { emoji: '👍', name: 'thumbsup', keywords: ['赞', '好', 'like'] },
  { emoji: '👎', name: 'thumbsdown', keywords: ['踩', '差'] },
  { emoji: '👏', name: 'clap', keywords: ['鼓掌'] },
  { emoji: '🙏', name: 'pray', keywords: ['祈祷', '谢谢'] },
  { emoji: '✌️', name: 'peace', keywords: ['和平', '胜利'] },
  { emoji: '🤝', name: 'handshake', keywords: ['握手', '合作'] },
  { emoji: '💪', name: 'muscle', keywords: ['肌肉', '力量'] },
  { emoji: '👋', name: 'wave', keywords: ['挥手', '你好'] },
  { emoji: '🫶', name: 'heart_hands', keywords: ['比心', '爱'] },
  { emoji: '❤️', name: 'red_heart', keywords: ['红心', '爱'] },
  { emoji: '🧡', name: 'orange_heart', keywords: ['橙心'] },
  { emoji: '💛', name: 'yellow_heart', keywords: ['黄心'] },
  { emoji: '💚', name: 'green_heart', keywords: ['绿心'] },
  { emoji: '💙', name: 'blue_heart', keywords: ['蓝心'] },
  { emoji: '💜', name: 'purple_heart', keywords: ['紫心'] },
  { emoji: '⭐', name: 'star2', keywords: ['星星'] },
  { emoji: '✨', name: 'sparkles', keywords: ['闪光'] },
  { emoji: '🔥', name: 'fire', keywords: ['火', '热门'] },
  { emoji: '💯', name: '100', keywords: ['满分', '百'] },
  { emoji: '✅', name: 'check', keywords: ['完成', '对'] },
  { emoji: '❌', name: 'cross', keywords: ['错', '删除'] },
  { emoji: '❓', name: 'question', keywords: ['问号', '疑问'] },
  { emoji: '⚠️', name: 'warning', keywords: ['警告', '注意'] },
  { emoji: '💡', name: 'bulb', keywords: ['灯泡', '想法'] },
  { emoji: '🌈', name: 'rainbow', keywords: ['彩虹'] },
  { emoji: '☀️', name: 'sun', keywords: ['太阳', '晴天'] },
  { emoji: '🌙', name: 'moon', keywords: ['月亮', '夜晚'] },
  { emoji: '🌸', name: 'cherry', keywords: ['樱花', '花'] },
  { emoji: '🍀', name: 'clover', keywords: ['四叶草', '幸运'] },
  { emoji: '☕', name: 'coffee', keywords: ['咖啡', '茶'] },
  { emoji: '🍺', name: 'beer', keywords: ['啤酒', '酒'] },
  { emoji: '🍕', name: 'pizza', keywords: ['披萨'] },
  { emoji: '🎂', name: 'cake', keywords: ['蛋糕', '生日'] },
  { emoji: '📝', name: 'memo', keywords: ['笔记', '备忘'] },
  { emoji: '📖', name: 'book', keywords: ['书', '阅读'] },
  { emoji: '💻', name: 'computer', keywords: ['电脑'] },
  { emoji: '📱', name: 'phone', keywords: ['手机'] },
  { emoji: '🔑', name: 'key', keywords: ['钥匙'] },
  { emoji: '🔒', name: 'lock', keywords: ['锁', '安全'] },
  { emoji: '📎', name: 'clip', keywords: ['回形针', '附件'] },
  { emoji: '🎯', name: 'target', keywords: ['目标', '靶子'] },
  { emoji: '🚀', name: 'rocket', keywords: ['火箭', '发射'] },
  { emoji: '⚡', name: 'zap', keywords: ['闪电', '快'] },
  { emoji: '🔔', name: 'bell', keywords: ['铃铛', '通知'] },
  { emoji: '📌', name: 'pin', keywords: ['图钉', '标记'] },
  { emoji: '🏠', name: 'house', keywords: ['家', '房子'] },
  { emoji: '✈️', name: 'plane', keywords: ['飞机', '旅行'] },
  { emoji: '🚗', name: 'car', keywords: ['汽车'] },
]

// ============ 状态 ============

interface EmojiState {
  visible: boolean
  selectedIdx: number
  triggerStart: number
  filtered: EmojiEntry[]
}

const setEmoji = StateEffect.define<EmojiState>()
const noEmoji: EmojiState = { visible: false, selectedIdx: 0, triggerStart: -1, filtered: [] }

function filterEmoji(query: string): EmojiEntry[] {
  if (!query) return emojiData.slice(0, 25)
  const q = query.toLowerCase()
  return emojiData.filter(e =>
    e.name.includes(q) || e.keywords.some(k => k.includes(q))
  ).slice(0, 30)
}

// ============ 扩展 ============

export function createEmojiPickerExtension(): Extension[] {
  const emojiField = StateField.define<EmojiState>({
    create: () => noEmoji,
    update: (val, tr) => {
      for (const e of tr.effects) {
        if (e.is(setEmoji)) return e.value
      }
      return val
    },
  })

  // 文档变化时更新搜索
  const updatePlugin = EditorView.updateListener.of((update) => {
    const state = update.state.field(emojiField)
    if (!state.visible) {
      // 检测 `:` 触发
      if (update.docChanged) {
        const sel = update.state.selection.main
        if (sel.from !== sel.to) return
        const line = update.state.doc.lineAt(sel.from)
        const textBefore = line.text.slice(0, sel.from - line.from)
        if (textBefore.endsWith(':') && !textBefore.endsWith('::') && !textBefore.endsWith(':::')) {
          // 不在代码块内触发
          try {
            const node = syntaxTree(update.state).resolveInner(sel.from, 1)
            if (node.name === 'CodeText' || node.name === 'FencedCode') return
          } catch { /* ok */ }
          const filtered = filterEmoji('')
          update.view.dispatch({
            effects: setEmoji.of({ visible: true, selectedIdx: 0, triggerStart: sel.from - 1, filtered })
          })
        }
      }
      return
    }

    // 已显示：根据 `:` 后的文本过滤
    if (update.docChanged || update.selectionSet) {
      const sel = update.state.selection.main
      const line = update.state.doc.lineAt(sel.from)
      const textBefore = line.text.slice(0, sel.from - line.from)
      const m = textBefore.match(/:([a-zA-Z一-鿿 _]*)$/)
      if (!m) {
        update.view.dispatch({ effects: setEmoji.of(noEmoji) })
        return
      }
      const query = m[1]
      const filtered = filterEmoji(query)
      update.view.dispatch({
        effects: setEmoji.of({
          visible: true,
          selectedIdx: Math.min(state.selectedIdx, Math.max(0, filtered.length - 1)),
          triggerStart: state.triggerStart,
          filtered,
        })
      })
    }
  })

  // 面板渲染
  const panelPlugin = ViewPlugin.fromClass(class {
    dom: HTMLElement
    constructor(readonly view: EditorView) {
      this.dom = document.createElement('div')
      this.dom.className = 'cm-emoji-panel'
      this.dom.style.display = 'none'
      this.view.dom.parentNode?.appendChild(this.dom)
      this.render()
    }
    update() { this.render() }
    destroy() { this.dom.remove() }

    render() {
      const state = this.view.state.field(emojiField)
      if (!state.visible || state.filtered.length === 0) {
        this.dom.style.display = 'none'
        return
      }
      this.dom.style.display = 'block'
      this.dom.innerHTML = ''

      // 定位
      try {
        const coords = this.view.coordsAtPos(state.triggerStart)
        if (coords) {
          const editorRect = this.view.dom.getBoundingClientRect()
          this.dom.style.left = (coords.left - editorRect.left) + 'px'
          this.dom.style.top = (coords.bottom - editorRect.top + 4) + 'px'
        }
      } catch { /* ignore */ }

      const list = document.createElement('div')
      list.className = 'cm-emoji-list'

      state.filtered.forEach((entry, idx) => {
        const item = document.createElement('div')
        item.className = `cm-emoji-item${idx === state.selectedIdx ? ' cm-emoji-active' : ''}`
        item.innerHTML = `<span class="cm-emoji-char">${entry.emoji}</span><span class="cm-emoji-name">:${entry.name}</span>`
        item.addEventListener('mousedown', (e) => {
          e.preventDefault()
          this.insert(entry)
        })
        list.appendChild(item)
      })

      this.dom.appendChild(list)

      if (state.filtered.length > state.filtered.length - 1) {
        const hint = document.createElement('div')
        hint.className = 'cm-emoji-hint'
        hint.textContent = '↑↓ 选择 · Tab/Enter 确认 · Esc 关闭'
        this.dom.appendChild(hint)
      }
    }

    insert(entry: EmojiEntry) {
      const state = this.view.state.field(emojiField)
      const sel = this.view.state.selection.main
      this.view.dispatch({
        changes: { from: state.triggerStart, to: sel.head, insert: entry.emoji },
        effects: setEmoji.of(noEmoji),
      })
    }
  })

  // 键盘处理
  const emojiKeys = keymap.of([
    {
      key: 'Escape',
      run(view) {
        const s = view.state.field(emojiField)
        if (s.visible) {
          view.dispatch({ effects: setEmoji.of(noEmoji) })
          return true
        }
        return false
      },
    },
    {
      key: 'ArrowDown',
      run(view) {
        const s = view.state.field(emojiField)
        if (!s.visible) return false
        view.dispatch({
          effects: setEmoji.of({ ...s, selectedIdx: Math.min(s.selectedIdx + 1, s.filtered.length - 1) })
        })
        return true
      },
    },
    {
      key: 'ArrowUp',
      run(view) {
        const s = view.state.field(emojiField)
        if (!s.visible) return false
        view.dispatch({
          effects: setEmoji.of({ ...s, selectedIdx: Math.max(s.selectedIdx - 1, 0) })
        })
        return true
      },
    },
    {
      key: 'Tab',
      run(view) {
        const s = view.state.field(emojiField)
        if (!s.visible) return false
        const entry = s.filtered[s.selectedIdx]
        if (!entry) { view.dispatch({ effects: setEmoji.of(noEmoji) }); return true }
        const sel = view.state.selection.main
        view.dispatch({
          changes: { from: s.triggerStart, to: sel.head, insert: entry.emoji },
          effects: setEmoji.of(noEmoji),
        })
        return true
      },
    },
    {
      key: 'Enter',
      run(view) {
        const s = view.state.field(emojiField)
        if (!s.visible) return false
        const entry = s.filtered[s.selectedIdx]
        if (!entry) { view.dispatch({ effects: setEmoji.of(noEmoji) }); return true }
        const sel = view.state.selection.main
        view.dispatch({
          changes: { from: s.triggerStart, to: sel.head, insert: entry.emoji },
          effects: setEmoji.of(noEmoji),
        })
        return true
      },
    },
  ])

  return [emojiField, updatePlugin, panelPlugin, emojiKeys]
}
