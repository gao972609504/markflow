import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js/lib/core'
import katex from 'katex'

// ── 按需注册 highlight.js 语言（避免全量导入 ~400KB） ──
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import python from 'highlight.js/lib/languages/python'
import css from 'highlight.js/lib/languages/css'
import json from 'highlight.js/lib/languages/json'
import xml from 'highlight.js/lib/languages/xml'
import bash from 'highlight.js/lib/languages/bash'
import markdown from 'highlight.js/lib/languages/markdown'
import sql from 'highlight.js/lib/languages/sql'
import shell from 'highlight.js/lib/languages/shell'
import yaml from 'highlight.js/lib/languages/yaml'
import java from 'highlight.js/lib/languages/java'
import cpp from 'highlight.js/lib/languages/cpp'
import c from 'highlight.js/lib/languages/c'
import go from 'highlight.js/lib/languages/go'
import rust from 'highlight.js/lib/languages/rust'
import diff from 'highlight.js/lib/languages/diff'
import plaintext from 'highlight.js/lib/languages/plaintext'

const registeredLangs = new Set<string>()

function registerLang(name: string, lang: any) {
  hljs.registerLanguage(name, lang)
  registeredLangs.add(name)
}

registerLang('javascript', javascript)
registerLang('typescript', typescript)
registerLang('js', javascript)
registerLang('ts', typescript)
registerLang('python', python)
registerLang('py', python)
registerLang('css', css)
registerLang('json', json)
registerLang('html', xml)
registerLang('xml', xml)
registerLang('svg', xml)
registerLang('bash', bash)
registerLang('sh', bash)
registerLang('shell', shell)
registerLang('markdown', markdown)
registerLang('md', markdown)
registerLang('sql', sql)
registerLang('yaml', yaml)
registerLang('yml', yaml)
registerLang('java', java)
registerLang('cpp', cpp)
registerLang('c', c)
registerLang('go', go)
registerLang('rust', rust)
registerLang('diff', diff)
registerLang('text', plaintext)
registerLang('plaintext', plaintext)

// ── KaTeX 渲染插件 ──

function katexPlugin(md: MarkdownIt) {
  // 行内公式 $...$
  md.inline.ruler.after('escape', 'math_inline', (state, silent) => {
    if (state.src.charCodeAt(state.pos) !== 0x24/* $ */) return false
    if (state.src.charCodeAt(state.pos - 1) === 0x5C /* \ */) return false

    const start = state.pos + 1
    const end = state.src.indexOf('$', start)
    if (end === -1 || end === start) return false

    if (!silent) {
      const token = state.push('math_inline', 'math', 0)
      token.content = state.src.slice(start, end)
      token.markup = '$'
    }

    state.pos = end + 1
    return true
  })

  // 块级公式 $$...$$
  md.block.ruler.before('fence', 'math_block', (state, start, end, silent) => {
    const firstCharPos = state.bMarks[start] + state.tShift[start]
    if (state.src.charCodeAt(firstCharPos) !== 0x24/* $ */) return false
    if (state.src.charCodeAt(firstCharPos + 1) !== 0x24/* $ */) return false

    const firstLine = state.src.slice(firstCharPos + 2, state.eMarks[start]).trim()
    if (firstLine.endsWith('$$')) {
      if (!silent) {
        const token = state.push('math_block', 'math', 0)
        token.content = firstLine.slice(0, -2).trim()
        token.markup = '$$'
      }
      state.line = start + 1
      return true
    }

    let next = start + 1
    while (next < end) {
      const line = state.src.slice(state.bMarks[next] + state.tShift[next], state.eMarks[next]).trim()
      if (line === '$$') {
        if (!silent) {
          const token = state.push('math_block', 'math', 0)
          token.content = state.src.slice(firstCharPos + 2, state.bMarks[next] + state.tShift[next]).trim()
          token.markup = '$$'
        }
        state.line = next + 1
        return true
      }
      next++
    }
    return false
  })

  md.renderer.rules.math_inline = (tokens, idx) => {
    try {
      return katex.renderToString(tokens[idx].content, { throwOnError: false, displayMode: false })
    } catch (e) {
      return `<span class="katex-error" title="${escapeAttr(String(e))}">${escapeHtml(tokens[idx].content)}</span>`
    }
  }

  md.renderer.rules.math_block = (tokens, idx) => {
    try {
      return `<div class="katex-block">${katex.renderToString(tokens[idx].content, { throwOnError: false, displayMode: true })}</div>`
    } catch (e) {
      return `<div class="katex-error katex-block-error" title="${escapeAttr(String(e))}">${escapeHtml(tokens[idx].content)}</div>`
    }
  }
}

// ── Markdown 实例 ──

const md = new MarkdownIt({
  html: false,       // 禁止原始 HTML（防 XSS）
  linkify: true,
  typographer: true,
  highlight: (str: string, lang: string) => {
    const language = lang?.toLowerCase() || ''
    if (language && registeredLangs.has(language)) {
      try {
        const result = hljs.highlight(str, { language, ignoreIllegals: true })
        return `<pre class="hljs-code-block"><div class="code-lang">${language}</div><code class="hljs language-${language}">${result.value}</code></pre>`
      } catch { /* fallback below */ }
    }
    const escaped = escapeHtml(str)
    return `<pre class="hljs-code-block"><code class="hljs">${escaped}</code></pre>`
  }
})

md.use(katexPlugin)

// ── 任务列表支持 ──

md.core.ruler.after('inline', 'task-lists', (state) => {
  for (let i = 0; i < state.tokens.length; i++) {
    if (state.tokens[i].type === 'inline') {
      const content = state.tokens[i].content
      if (/^\[[ xX]\]\s/.test(content)) {
        const checked = /^\[[xX]\]/.test(content)
        state.tokens[i].content = content.replace(/^\[[ xX]\]\s/, '')
        const checkbox = `<input type="checkbox" ${checked ? 'checked' : ''} disabled /> `
        state.tokens[i].children = state.tokens[i].children || []
        const htmlToken = new state.Token('html_inline', '', 0)
        htmlToken.content = checkbox
        state.tokens[i].children!.unshift(htmlToken)
      }
    }
  }
})

// ── ==高亮== 语法 → <mark>（导出/复制 HTML 渲染，与编辑器装饰迭代51一致）──
md.inline.ruler.before('emphasis', 'mark', (state, silent) => {
  const start = state.pos
  if (state.src.charCodeAt(start) !== 0x3d /* = */ || state.src.charCodeAt(start + 1) !== 0x3d) return false
  const end = state.src.indexOf('==', start + 2)
  if (end < 0) return false
  const content = state.src.slice(start + 2, end)
  if (!content || content.length > 200 || content.includes('\n')) return false
  if (!silent) {
    const open = state.push('mark_open', 'mark', 1); open.markup = '=='
    const text = state.push('text', '', 0); text.content = content
    state.push('mark_close', 'mark', -1)
  }
  state.pos = end + 2
  return true
})

// ── ~~删除线~~ 语法 → <s>（导出/复制 HTML 渲染，与编辑器一致）──
md.inline.ruler.before('emphasis', 'strikethrough', (state, silent) => {
  const start = state.pos
  if (state.src.charCodeAt(start) !== 0x7e /* ~ */ || state.src.charCodeAt(start + 1) !== 0x7e) return false
  if (state.src.charCodeAt(start + 2) === 0x7e) return false
  const end = state.src.indexOf('~~', start + 2)
  if (end < 0) return false
  const content = state.src.slice(start + 2, end)
  if (!content || content.length > 200 || content.includes('\n')) return false
  if (!silent) {
    const open = state.push('s_open', 's', 1); open.markup = '~~'
    const text = state.push('text', '', 0); text.content = content
    state.push('s_close', 's', -1)
  }
  state.pos = end + 2
  return true
})

// ── 简易渲染缓存 ──

const renderCache = new Map<string, string>()
const CACHE_MAX_SIZE = 50

export function renderMarkdown(content: string): string {
  const cached = renderCache.get(content)
  if (cached) return cached

  const result = md.render(content)

  if (renderCache.size >= CACHE_MAX_SIZE) {
    // 删除最早的缓存项
    const firstKey = renderCache.keys().next().value
    if (firstKey !== undefined) renderCache.delete(firstKey)
  }
  renderCache.set(content, result)

  return result
}

// ── 工具函数 ──

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
