/**
 * 链接悬浮预览扩展
 *
 * 在编辑器中鼠标悬停到 Markdown 链接 [text](url) 时，
 * 弹出浮窗显示目标 URL，并提供"在浏览器打开"和"复制链接"按钮。
 * 同时支持引用式链接 [text][ref]。
 */
import { hoverTooltip, Tooltip } from '@codemirror/view'
import { EditorState } from '@codemirror/state'

/** 从 pos 位置解析 Markdown 行内链接，返回 { from, to, url, text } 或 null */
function parseLinkAt(state: EditorState, pos: number): { from: number; to: number; url: string; text: string } | null {
  const line = state.doc.lineAt(pos)
  const text = line.text
  const offset = pos - line.from

  // 行内链接: [text](url)
  const inlineRe = /\[([^\]]*)\]\(([^)]+)\)/g
  let m: RegExpExecArray | null
  while ((m = inlineRe.exec(text)) !== null) {
    const start = m.index
    const end = start + m[0].length
    if (offset >= start && offset <= end) {
      return {
        from: line.from + start,
        to: line.from + end,
        url: m[2].trim(),
        text: m[1],
      }
    }
  }

  // 自动链接: <url>
  const autoRe = /<(https?:\/\/[^>]+)>/g
  while ((m = autoRe.exec(text)) !== null) {
    const start = m.index
    const end = start + m[0].length
    if (offset >= start && offset <= end) {
      return {
        from: line.from + start,
        to: line.from + end,
        url: m[1],
        text: m[1],
      }
    }
  }

  // 裸 URL
  const bareRe = /(?<![\\\[(])https?:\/\/[^\s)\]<>"]+/g
  while ((m = bareRe.exec(text)) !== null) {
    const start = m.index
    const end = start + m[0].length
    if (offset >= start && offset <= end) {
      return {
        from: line.from + start,
        to: line.from + end,
        url: m[0],
        text: m[0],
      }
    }
  }

  return null
}

/** 格式化 URL 用于显示（截断过长链接） */
function formatUrl(url: string, maxLen = 80): string {
  if (url.length <= maxLen) return url
  return url.slice(0, maxLen - 3) + '...'
}

export const linkHoverTooltip = hoverTooltip(
  (view, pos): Tooltip | null => {
    const link = parseLinkAt(view.state, pos)
    if (!link) return null

    const url = link.url
    // 只预览 http/https 链接
    if (!url.startsWith('http://') && !url.startsWith('https://')) return null

    const displayUrl = formatUrl(url)

    return {
      pos: link.from,
      end: link.to,
      above: true,
      create() {
        const dom = document.createElement('div')
        dom.className = 'cm-link-tooltip'

        // URL 显示区
        const urlRow = document.createElement('div')
        urlRow.className = 'cm-link-tooltip-url'

        const icon = document.createElement('span')
        icon.className = 'cm-link-tooltip-icon'
        icon.textContent = '🔗'
        urlRow.appendChild(icon)

        const urlText = document.createElement('span')
        urlText.className = 'cm-link-tooltip-text'
        urlText.textContent = displayUrl
        urlText.title = url
        urlRow.appendChild(urlText)

        dom.appendChild(urlRow)

        // 链接文字
        if (link.text && link.text !== url) {
          const labelRow = document.createElement('div')
          labelRow.className = 'cm-link-tooltip-label'
          labelRow.textContent = `"${link.text}"`
          dom.appendChild(labelRow)
        }

        // 按钮区
        const actions = document.createElement('div')
        actions.className = 'cm-link-tooltip-actions'

        const openBtn = document.createElement('button')
        openBtn.className = 'cm-link-tooltip-btn cm-link-tooltip-open'
        openBtn.textContent = '打开链接'
        openBtn.addEventListener('click', (e) => {
          e.preventDefault()
          e.stopPropagation()
          window.open(url, '_blank', 'noopener,noreferrer')
        })
        actions.appendChild(openBtn)

        const copyBtn = document.createElement('button')
        copyBtn.className = 'cm-link-tooltip-btn cm-link-tooltip-copy'
        copyBtn.textContent = '复制'
        copyBtn.addEventListener('click', (e) => {
          e.preventDefault()
          e.stopPropagation()
          navigator.clipboard.writeText(url).then(() => {
            copyBtn.textContent = '已复制!'
            setTimeout(() => { copyBtn.textContent = '复制' }, 1500)
          })
        })
        actions.appendChild(copyBtn)

        dom.appendChild(actions)
        return { dom }
      },
    }
  },
  { hoverTime: 400 }
)
