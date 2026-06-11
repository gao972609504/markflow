/**
 * CodeMirror 编辑器主题
 * — GitHub 风格亮色/暗色主题
 */
import { EditorView } from '@codemirror/view'

export const monoFont = '"JetBrains Mono", "Fira Code", "Cascadia Code", "SF Mono", Consolas, monospace'

export function createEditorTheme(isDark: boolean, fontSize: number = 15.5, fontFamily: string = '') {
  const editorFont = fontFamily ? `"${fontFamily}", ${monoFont}` : monoFont
  const c = {
    bg: isDark ? '#0d1117' : '#ffffff',
    bg2: isDark ? '#161b22' : '#f6f8fa',
    bg3: isDark ? '#1c2128' : '#eff1f3',
    text: isDark ? '#e6edf3' : '#1f2328',
    text2: isDark ? '#8b949e' : '#59636e',
    textMuted: isDark ? '#484f58' : '#8b949e',
    border: isDark ? '#30363d' : '#d1d9e0',
    accent: isDark ? '#58a6ff' : '#0969da',
    accentHover: isDark ? '#79c0ff' : '#0550ae',
    cursor: isDark ? '#58a6ff' : '#0969da',
    sel: isDark ? '#264f78' : '#add6ff',
    heading: isDark ? '#e6edf3' : '#1f2328',
    headingBorder: isDark ? '#21262d' : '#d1d9e0',
    quoteBg: isDark ? '#161b22' : '#f6f8fa',
    codeBg: isDark ? '#1c2128' : '#eff1f3',
    codeBlockBg: isDark ? '#161b22' : '#f6f8fa',
    hr: isDark ? '#30363d' : '#d1d9e0',
    gutter: isDark ? '#0d1117' : '#fafafa',
    gutterColor: isDark ? '#484f58' : '#afb8c1',
    activeGutterBg: isDark ? '#161b22' : '#f6f8fa',
    activeGutterColor: isDark ? '#e6edf3' : '#656d76',
  }

  return EditorView.theme({
    '&': { backgroundColor: c.bg, color: c.text, height: '100%' },
    '.cm-content': {
      fontFamily: '"Segoe UI", "Noto Sans", system-ui, -apple-system, Helvetica, Arial, sans-serif',
      fontSize: `${fontSize}px`,
      lineHeight: '1.75',
      padding: '20px 0',
      letterSpacing: '0.01em',
      caretColor: c.cursor,
    },
    '.cm-line': { padding: '3px 24px' },
    '.cm-gutters': { backgroundColor: c.gutter, color: c.gutterColor, border: 'none', minWidth: '40px' },
    '.cm-activeLineGutter': { backgroundColor: c.activeGutterBg, color: c.activeGutterColor },
    '.cm-activeLine': { backgroundColor: 'transparent' },
    '.cm-cursor': { borderLeftWidth: '2px', borderLeftColor: c.cursor },
    '.cm-selectionBackground': { backgroundColor: `${c.sel} !important` },
    '&.cm-focused .cm-selectionBackground': { backgroundColor: `${c.sel} !important` },

    // 标题 — 层级分明，间距优美
    '.cm-heading': { marginTop: '12px', marginBottom: '4px' },
    '.cm-heading-1 .cm-lineContent': {
      fontSize: '30px', fontWeight: '800', lineHeight: '1.25',
      color: c.heading, letterSpacing: '-0.02em',
      borderBottom: `1px solid ${c.headingBorder}`, paddingBottom: '8px',
    },
    '.cm-heading-2 .cm-lineContent': {
      fontSize: '24px', fontWeight: '700', lineHeight: '1.3',
      color: c.heading, letterSpacing: '-0.01em',
      borderBottom: `1px solid ${c.headingBorder}`, paddingBottom: '6px',
    },
    '.cm-heading-3 .cm-lineContent': {
      fontSize: '20px', fontWeight: '600', lineHeight: '1.35',
      color: c.heading,
    },
    '.cm-heading-4 .cm-lineContent': {
      fontSize: '16px', fontWeight: '600', lineHeight: '1.4',
      color: c.text2,
    },
    '.cm-heading-5 .cm-lineContent': {
      fontSize: '14px', fontWeight: '600', lineHeight: '1.4',
      color: c.text2,
    },
    '.cm-heading-6 .cm-lineContent': {
      fontSize: '13px', fontWeight: '600', lineHeight: '1.4',
      color: c.textMuted,
    },

    // 行内
    '.cm-bold-rendered': { fontWeight: '700', color: c.text },
    '.cm-italic-rendered': { fontStyle: 'italic', color: c.text2 },
    '.cm-strike-rendered': { textDecoration: 'line-through', opacity: '0.6', color: c.textMuted },
    '.cm-inline-code': {
      background: c.codeBg, border: `1px solid ${c.border}`, borderRadius: '6px',
      padding: '0.2em 0.4em',
      fontFamily: editorFont,
      fontSize: '0.85em',
    },
    '.cm-link-rendered': { color: c.accent, cursor: 'pointer', fontWeight: '500' },
    '.cm-link-rendered:hover': { color: c.accentHover, textDecoration: 'underline', textUnderlineOffset: '2px' },

    // 引用块
    '.cm-blockquote': {
      borderLeft: `4px solid ${c.accent}`, paddingLeft: '16px', paddingRight: '14px',
      color: c.text2, fontStyle: 'italic',
      background: c.quoteBg, borderRadius: '0 6px 6px 0', margin: '4px 0',
    },

    // 分割线 — 渐变
    '.cm-hr-line .cm-lineContent': { display: 'block', border: 'none', padding: '24px 0' },

    // 代码块 — 左边框 + 圆角
    '.cm-code-block-line': {
      background: `${c.codeBlockBg} !important`,
      fontFamily: editorFont,
      fontSize: '13.5px', lineHeight: '1.65', padding: '1px 16px',
      borderLeft: `3px solid ${c.accent}`,
    },
    '.cm-code-block-first': { borderRadius: '8px 8px 0 0', paddingTop: '12px !important' },
    '.cm-code-block-last': { borderRadius: '0 0 8px 8px', paddingBottom: '12px !important' },

    // 任务列表
    '.cm-task-checked': { textDecoration: 'line-through', opacity: '0.5', color: c.textMuted },

    // 语法隐藏/显示
    '.cm-mark-hidden': {
      display: 'inline', color: 'transparent', fontSize: '1px', lineHeight: '0', letterSpacing: '-1px', overflow: 'hidden',
      caretColor: c.text,
    },
    '.cm-activeLine .cm-mark-hidden': {
      color: isDark ? '#484f58' : '#afb8c1', fontSize: 'inherit', lineHeight: 'inherit', letterSpacing: 'normal', overflow: 'visible',
    },

    // 图片行内预览
    '.cm-inline-image': {
      maxWidth: '100%', maxHeight: '400px', borderRadius: '8px', marginTop: '8px', marginBottom: '8px',
      display: 'block', boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.4)' : '0 2px 12px rgba(0,0,0,0.08)',
      border: `1px solid ${c.border}`,
    },

    // 复选框
    '.cm-checkbox-wrap': { display: 'inline-flex', alignItems: 'center', marginRight: '6px' },
    '.cm-checkbox-input': { width: '16px', height: '16px', cursor: 'pointer', accentColor: c.accent, borderRadius: '3px' },

    // Focus 模式
    '.cm-focus-dim': { opacity: '0.25', transition: 'opacity 0.3s ease' },
    '.cm-focus-dim.cm-activeLine': { opacity: '1' },

    // 搜索
    '.cm-searchMatch': { backgroundColor: isDark ? '#554400' : '#fff3b0', borderRadius: '2px' },
    '.cm-searchMatch.cm-searchMatch-selected': { backgroundColor: isDark ? '#776600' : '#ffe088' },
  })
}
