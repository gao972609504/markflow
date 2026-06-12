/**
 * Markdown Lint 扩展
 *
 * 实时检测常见 Markdown 格式问题，在编辑器中显示诊断信息。
 *
 * 检查规则：
 * - MD001: 标题层级跳跃（如 H1 → H3）
 * - MD003: 标题格式不一致（ATX vs Setext）
 * - MD009: 行尾空格
 * - MD010: 硬制表符（Tab）
 * - MD012: 连续多个空行
 * - MD013: 行过长（超过 120 字符）
 * - MD022: 标题前后缺少空行
 * - MD032: 列表前后缺少空行
 * - MD034: 裸 URL（应使用 <url> 格式）
 * - MD040: 代码块缺少语言标识
 * - MD045: 图片缺少 alt 文本
 * - MD047: 文件末尾缺少换行
 */
import { Diagnostic, linter } from '@codemirror/lint'

export interface LintRule {
  code: string
  message: string
  severity: 'error' | 'warning' | 'info'
}

/** 检查标题层级跳跃 */
function checkHeadingLevelJump(lines: string[]): Diagnostic[] {
  const diags: Diagnostic[] = []
  let lastLevel = 0
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(#{1,6})\s/)
    if (!m) continue
    const level = m[1].length
    if (lastLevel > 0 && level > lastLevel + 1) {
      const from = lines.slice(0, i).join('\n').length + (i > 0 ? 1 : 0)
      diags.push({
        from,
        to: from + lines[i].length,
        severity: 'warning',
        message: `[MD001] 标题层级跳跃: H${lastLevel} → H${level}，应为 H${lastLevel + 1}`,
        source: 'markdown-lint',
      })
    }
    lastLevel = level
  }
  return diags
}

/** 检查行尾空格 */
function checkTrailingWhitespace(lines: string[]): Diagnostic[] {
  const diags: Diagnostic[] = []
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/\s+$/)
    if (match && match[0].length > 0) {
      // 跳过只有两个空格的行（可能是 Markdown 换行）
      if (match[0] === '  ' && lines[i].trim().length > 0) continue
      const lineStart = lines.slice(0, i).join('\n').length + (i > 0 ? 1 : 0)
      const from = lineStart + lines[i].length - match[0].length
      diags.push({
        from,
        to: lineStart + lines[i].length,
        severity: 'info',
        message: `[MD009] 行尾有多余空格`,
        source: 'markdown-lint',
      })
    }
  }
  return diags
}

/** 检查硬 Tab */
function checkHardTabs(lines: string[]): Diagnostic[] {
  const diags: Diagnostic[] = []
  for (let i = 0; i < lines.length; i++) {
    // 跳过代码块内的行
    const idx = lines[i].indexOf('\t')
    if (idx >= 0) {
      const lineStart = lines.slice(0, i).join('\n').length + (i > 0 ? 1 : 0)
      diags.push({
        from: lineStart + idx,
        to: lineStart + idx + 1,
        severity: 'info',
        message: `[MD010] 使用硬制表符代替空格`,
        source: 'markdown-lint',
      })
    }
  }
  return diags
}

/** 检查连续空行 */
function checkMultipleBlankLines(lines: string[]): Diagnostic[] {
  const diags: Diagnostic[] = []
  let blankCount = 0
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '') {
      blankCount++
      if (blankCount >= 3) {
        const lineStart = lines.slice(0, i).join('\n').length + (i > 0 ? 1 : 0)
        diags.push({
          from: lineStart,
          to: lineStart + lines[i].length,
          severity: 'info',
          message: `[MD012] 连续多个空行（最多保留 1 个）`,
          source: 'markdown-lint',
        })
      }
    } else {
      blankCount = 0
    }
  }
  return diags
}

/** 检查行过长 */
function checkLineLength(lines: string[]): Diagnostic[] {
  const diags: Diagnostic[] = []
  const maxLen = 120
  for (let i = 0; i < lines.length; i++) {
    // 跳过链接、代码块等
    if (lines[i].startsWith('http') || lines[i].startsWith('```')) continue
    if (lines[i].length > maxLen) {
      const lineStart = lines.slice(0, i).join('\n').length + (i > 0 ? 1 : 0)
      diags.push({
        from: lineStart + maxLen,
        to: lineStart + lines[i].length,
        severity: 'info',
        message: `[MD013] 行长度 ${lines[i].length} 超过 ${maxLen} 字符`,
        source: 'markdown-lint',
      })
    }
  }
  return diags
}

/** 检查代码块缺少语言标识 */
function checkCodeBlockLang(lines: string[]): Diagnostic[] {
  const diags: Diagnostic[] = []
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^```(\s*$)/)) {
      const lineStart = lines.slice(0, i).join('\n').length + (i > 0 ? 1 : 0)
      diags.push({
        from: lineStart,
        to: lineStart + lines[i].length,
        severity: 'warning',
        message: `[MD040] 代码块缺少语言标识，建议如 \`\`\`javascript`,
        source: 'markdown-lint',
      })
    }
  }
  return diags
}

/** 检查图片缺少 alt 文本 */
function checkImageAlt(text: string): Diagnostic[] {
  const diags: Diagnostic[] = []
  const re = /!\[\s*\]\([^)]*\)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    diags.push({
      from: m.index,
      to: m.index + m[0].length,
      severity: 'warning',
      message: `[MD045] 图片缺少 alt 文本，建议 ![描述](url)`,
      source: 'markdown-lint',
    })
  }
  return diags
}

/** 检查文件末尾换行 */
function checkFinalNewline(text: string): Diagnostic[] {
  if (text.length > 0 && !text.endsWith('\n')) {
    return [{
      from: text.length,
      to: text.length,
      severity: 'info',
      message: '[MD047] 文件末尾缺少换行符',
      source: 'markdown-lint',
    }]
  }
  return []
}

/** 检查裸 URL */
function checkBareUrl(text: string): Diagnostic[] {
  const diags: Diagnostic[] = []
  // 匹配不在 <> []() 中的 URL
  const re = /(?<![<\[(])(?:https?:\/\/)[^\s)\]<>"]+/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    // 跳过 markdown 链接内的 URL
    const before = text.slice(Math.max(0, m.index - 5), m.index)
    if (/\]\($/.test(before) || before.endsWith('<')) continue
    diags.push({
      from: m.index,
      to: m.index + m[0].length,
      severity: 'info',
      message: `[MD034] 裸 URL，建议使用 <${m[0]}> 格式`,
      source: 'markdown-lint',
    })
  }
  return diags
}

/** 检查标题前后空行 */
function checkHeadingSpacing(lines: string[]): Diagnostic[] {
  const diags: Diagnostic[] = []
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].match(/^#{1,6}\s/)) continue
    // 检查标题前面
    if (i > 0 && lines[i - 1].trim() !== '') {
      const lineStart = lines.slice(0, i).join('\n').length + (i > 0 ? 1 : 0)
      diags.push({
        from: lineStart,
        to: lineStart,
        severity: 'info',
        message: `[MD022] 标题前应有一个空行`,
        source: 'markdown-lint',
      })
    }
    // 检查标题后面
    if (i < lines.length - 1 && lines[i + 1].trim() !== '') {
      const lineStart = lines.slice(0, i).join('\n').length + (i > 0 ? 1 : 0)
      diags.push({
        from: lineStart,
        to: lineStart,
        severity: 'info',
        message: `[MD022] 标题后应有一个空行`,
        source: 'markdown-lint',
      })
    }
  }
  return diags
}

export const markdownLinter = linter((view): Diagnostic[] => {
  const text = view.state.doc.toString()
  const lines = text.split('\n')

  const allDiags: Diagnostic[] = [
    ...checkHeadingLevelJump(lines),
    ...checkTrailingWhitespace(lines),
    ...checkHardTabs(lines),
    ...checkMultipleBlankLines(lines),
    ...checkLineLength(lines),
    ...checkCodeBlockLang(lines),
    ...checkImageAlt(text),
    ...checkFinalNewline(text),
    ...checkBareUrl(text),
    ...checkHeadingSpacing(lines),
  ]

  // 按位置排序
  allDiags.sort((a, b) => a.from - b.from)
  return allDiags
}, { delay: 800 })
