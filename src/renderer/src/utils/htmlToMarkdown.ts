/**
 * HTML 转 Markdown 工具
 * — 将剪贴板中的富文本(网页/Word/Notion 复制)转为 Markdown
 * — 灵感来自 markmap/turndown 等 HTML→MD 转换器，此处实现轻量版
 */

/** 将任意 HTML 字符串转换为 Markdown */
export function htmlToMarkdown(html: string): string {
  // 清理 Word 特有的命名空间标签与注释
  let s = html.replace(/<!--[\s\S]*?-->/g, '')
  s = s.replace(/<o:p>[\s\S]*?<\/o:p>/gi, '')
  s = s.replace(/<\/?(html|head|body|meta|link|span|div|font|section|article)[^>]*>/gi, '\n')

  // 预处理：用占位符保护 <pre><code> 块，避免内部被转义
  const codeBlocks: string[] = []
  s = s.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_m, inner) => {
    const code = decodeEntities(inner.replace(/<[^>]+>/g, '')).trim()
    codeBlocks.push(code)
    return `\n\n@@CODEBLOCK${codeBlocks.length - 1}@@\n\n`
  })

  // 行内代码先保护
  const inlineCodes: string[] = []
  s = s.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (_m, inner) => {
    inlineCodes.push(decodeEntities(inner))
    return '@@INLINECODE' + (inlineCodes.length - 1) + '@@'
  })

  // 标题
  s = s.replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_m, lvl, inner) => '\n\n' + '#'.repeat(parseInt(lvl)) + ' ' + inlineText(inner) + '\n\n')

  // 粗体 / 斜体 / 删除线
  s = s.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, (_m, _t, inner) => '**' + inlineText(inner) + '**')
  s = s.replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, (_m, _t, inner) => '*' + inlineText(inner) + '*')
  s = s.replace(/<(del|s|strike)[^>]*>([\s\S]*?)<\/\1>/gi, (_m, _t, inner) => '~~' + inlineText(inner) + '~~')

  // 链接与图片
  s = s.replace(/<img[^>]*src=["']([^"']+)["'][^>]*>/gi, (_m, src) => `![](${src})`)
  s = s.replace(/<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_m, href, inner) => `[${inlineText(inner)}](${href})`)

  // 引用
  s = s.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_m, inner) =>
    '\n' + inlineText(inner).split('\n').map((l: string) => '> ' + l).join('\n') + '\n')

  // 列表
  s = s.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_m, inner) => '- ' + inlineText(inner).trim() + '\n')
  s = s.replace(/<\/?(ul|ol)[^>]*>/gi, '\n')

  // 表格简易转换（仅处理 thead+tr+td/th）
  s = s.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_m, inner) => tableToMarkdown(inner))

  // 段落 / 换行
  s = s.replace(/<p[^>]*>/gi, '\n\n')
  s = s.replace(/<\/p>/gi, '\n')
  s = s.replace(/<br\s*\/?>/gi, '\n')
  s = s.replace(/<hr\s*\/?>/gi, '\n\n---\n\n')

  // 移除其余残留标签
  s = s.replace(/<[^>]+>/g, '')

  // 还原行内代码与代码块
  s = s.replace(/@@INLINECODE(\d+)@@/g, (_m, i) => '`' + inlineCodes[+i] + '`')
  s = s.replace(/@@CODEBLOCK(\d+)@@/g, (_m, i) => '\n```\n' + codeBlocks[+i] + '\n```\n')

  s = decodeEntities(s)
  // 折叠多余空行
  s = s.replace(/\n{3,}/g, '\n\n').trim() + '\n'
  return s
}

function inlineText(s: string): string {
  return s.replace(/<[^>]+>/g, '').trim()
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&hellip;/g, '…')
}

function tableToMarkdown(inner: string): string {
  const rows: string[][] = []
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
  let rm: RegExpExecArray | null
  while ((rm = rowRe.exec(inner))) {
    const cells: string[] = []
    const cellRe = /<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi
    let cm: RegExpExecArray | null
    while ((cm = cellRe.exec(rm[1]))) {
      cells.push(inlineText(cm[1]))
    }
    if (cells.length) rows.push(cells)
  }
  if (rows.length === 0) return ''
  const cols = Math.max(...rows.map(r => r.length))
  const padded = rows.map(r => { const p = [...r]; while (p.length < cols) p.push(''); return p })
  const header = '| ' + padded[0].join(' | ') + ' |'
  const sep = '| ' + new Array(cols).fill('---').join(' | ') + ' |'
  const body = padded.slice(1).map(r => '| ' + r.join(' | ') + ' |')
  return '\n\n' + [header, sep, ...body].join('\n') + '\n\n'
}
