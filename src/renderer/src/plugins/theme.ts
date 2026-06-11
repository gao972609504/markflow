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
    textMuted: isDark ? '#6e7681' : '#8b949e',
    border: isDark ? '#30363d' : '#d1d9e0',
    accent: isDark ? '#58a6ff' : '#0969da',
    accentHover: isDark ? '#79c0ff' : '#0550ae',
    cursor: isDark ? '#58a6ff' : '#0969da',
    sel: isDark ? 'rgba(88, 166, 255, 0.30)' : 'rgba(9, 105, 218, 0.20)',
    heading: isDark ? '#e6edf3' : '#1f2328',
    headingBorder: isDark ? '#21262d' : '#d1d9e0',
    quoteBg: isDark ? 'rgba(110, 118, 129, 0.10)' : '#f6f8fa',
    codeBg: isDark ? 'rgba(110, 118, 129, 0.15)' : 'rgba(175, 184, 193, 0.20)',
    codeBlockBg: isDark ? '#161b22' : '#f6f8fa',
    hr: isDark ? '#30363d' : '#d1d9e0',
    gutter: isDark ? '#0d1117' : '#fafafa',
    gutterColor: isDark ? '#6e7681' : '#afb8c1',
    activeGutterBg: isDark ? '#161b22' : '#f6f8fa',
    activeGutterColor: isDark ? '#e6edf3' : '#656d76',
    // 暗色模式专属：避免纯黑
    codeKeyword: isDark ? '#ff7b72' : '#cf222e',
    codeString: isDark ? '#a5d6ff' : '#0a3069',
    codeNumber: isDark ? '#79c0ff' : '#0550ae',
    codeComment: isDark ? '#8b949e' : '#6e7781',
    codeFunction: isDark ? '#d2a8ff' : '#8250df',
    codeVariable: isDark ? '#ffa657' : '#953800',
    codeType: isDark ? '#ffa657' : '#953800',
    codeOperator: isDark ? '#ff7b72' : '#cf222e',
    codePunct: isDark ? '#c9d1d9' : '#24292f',
  }

  return EditorView.theme({
    '&': { backgroundColor: c.bg, color: c.text, height: '100%' },
    '.cm-scroller': {
      scrollBehavior: 'smooth',
      fontFeatureSettings: '"kern" 1, "liga" 1, "calt" 1',
    },
    '.cm-scroller::-webkit-scrollbar': { width: '6px', height: '6px' },
    '.cm-scroller::-webkit-scrollbar-track': { background: 'transparent' },
    '.cm-scroller::-webkit-scrollbar-thumb': { background: 'transparent', borderRadius: '3px', transition: 'background 0.18s' },
    '.cm-scroller::-webkit-scrollbar-thumb:hover': { background: c.textMuted, opacity: 0.5 },
    '.cm-scroller::-webkit-scrollbar-corner': { background: 'transparent' },
    '.cm-content': {
      fontFamily: '"Segoe UI", "PingFang SC", "Microsoft YaHei", "Noto Sans", system-ui, -apple-system, Helvetica, Arial, sans-serif',
      fontSize: `${fontSize}px`,
      lineHeight: '1.75',
      padding: '32px 0 64px',
      letterSpacing: '0.01em',
      caretColor: c.cursor,
      position: 'relative',
      fontVariantLigatures: 'common-ligatures contextual',
    },
    '.cm-content::after': {
      content: '""',
      position: 'absolute',
      top: '0',
      bottom: '0',
      left: `calc(24px + 80ch + 24px)`,
      borderLeft: `1px dashed ${isDark ? '#30363d' : '#d1d9e0'}`,
      pointerEvents: 'none',
      zIndex: '1',
    },
    // 多标尺线（40、120字符位置）
    '.cm-content::before': {
      content: '""',
      position: 'absolute',
      top: '0',
      bottom: '0',
      left: `calc(24px + 120ch + 24px)`,
      borderLeft: `1px dotted ${isDark ? '#21262d' : '#e8eaed'}`,
      pointerEvents: 'none',
      zIndex: '1',
    },
    '.cm-line': { padding: '3px 24px' },
    '.cm-paragraph-gap': { height: '10px' },
    '.cm-content[contenteditable="true"] .cm-line:only-child:empty::before': {
      content: '"开始写作吧… (Ctrl+N 新建文件)"',
      color: c.textMuted,
      fontStyle: 'italic',
      pointerEvents: 'none',
    },
    '.cm-gutters': {
      backgroundColor: c.gutter,
      color: c.gutterColor,
      border: 'none',
      minWidth: '52px',
      width: 'auto',
      fontSize: '12px',
      lineHeight: '1.75',
      fontFamily: 'inherit',
    },
    '.cm-gutter': {
      lineHeight: '1.75',
    },
    '.cm-gutter.cm-lineNumbers .cm-gutterElement': {
      lineHeight: '1.75',
      padding: '0 8px 0 12px',
      minHeight: `${fontSize * 1.75}px`,
    },
    '.cm-activeLineGutter': {
      backgroundColor: c.activeGutterBg,
      color: c.activeGutterColor,
      fontWeight: '500',
    },
    '.cm-activeLine': {
      backgroundColor: isDark ? 'rgba(88, 166, 255, 0.06)' : 'rgba(9, 105, 218, 0.04)',
    },
    '.cm-cursor': {
      borderLeftWidth: '2px',
      borderLeftColor: c.cursor,
      animation: 'cm-blink 1.2s step-end infinite',
    },
    '@keyframes cm-blink': {
      '0%, 100%': { borderLeftColor: c.cursor },
      '50%': { borderLeftColor: 'transparent' },
    },
    '.cm-selectionBackground': { backgroundColor: `${c.sel} !important` },
    '&.cm-focused .cm-selectionBackground': { backgroundColor: `${c.sel} !important` },
    '.cm-focused .cm-cursor': { borderLeftColor: c.cursor },
    '.cm-focused .cm-activeLine': {
      backgroundColor: isDark ? 'rgba(88, 166, 255, 0.08)' : 'rgba(9, 105, 218, 0.05)',
    },

    // 标题 — 层级分明，间距优美
    '.cm-heading': {
      marginTop: '20px',
      marginBottom: '8px',
      fontFeatureSettings: '"kern" 1, "liga" 1',
    },
    '.cm-heading-1 .cm-lineContent': {
      fontSize: '32px', fontWeight: '800', lineHeight: '1.2',
      color: c.heading, letterSpacing: '-0.025em',
      borderBottom: `1px solid ${c.headingBorder}`, paddingBottom: '10px',
      marginBottom: '4px',
    },
    '.cm-heading-2 .cm-lineContent': {
      fontSize: '25px', fontWeight: '700', lineHeight: '1.3',
      color: c.heading, letterSpacing: '-0.018em',
      borderBottom: `1px solid ${c.headingBorder}`, paddingBottom: '6px',
    },
    '.cm-heading-3 .cm-lineContent': {
      fontSize: '20px', fontWeight: '650', lineHeight: '1.35',
      color: c.heading, letterSpacing: '-0.012em',
    },
    '.cm-heading-4 .cm-lineContent': {
      fontSize: '16px', fontWeight: '600', lineHeight: '1.45',
      color: isDark ? '#c9d1d9' : '#24292f',
    },
    '.cm-heading-5 .cm-lineContent': {
      fontSize: '14px', fontWeight: '600', lineHeight: '1.45',
      color: c.text2,
    },
    '.cm-heading-6 .cm-lineContent': {
      fontSize: '13px', fontWeight: '600', lineHeight: '1.45',
      color: c.textMuted, letterSpacing: '0.02em',
    },

    // 行内
    '.cm-bold-rendered': { fontWeight: '700', color: c.text },
    '.cm-italic-rendered': { fontStyle: 'italic', color: c.text2 },
    '.cm-strike-rendered': { textDecoration: 'line-through', opacity: '0.6', color: c.textMuted },
    '.cm-inline-code': {
      background: c.codeBg,
      border: `1px solid ${isDark ? 'rgba(110, 118, 129, 0.25)' : 'rgba(175, 184, 193, 0.30)'}`,
      borderRadius: '5px',
      padding: '0.15em 0.45em',
      fontFamily: editorFont,
      fontSize: '0.875em',
      fontWeight: '500',
    },
    '.cm-link-rendered': {
      color: c.accent,
      cursor: 'pointer',
      fontWeight: '500',
      textDecoration: 'underline',
      textDecorationColor: isDark ? 'rgba(88, 166, 255, 0.4)' : 'rgba(9, 105, 218, 0.3)',
      textUnderlineOffset: '2px',
      textDecorationThickness: '1px',
    },
    '.cm-link-rendered:hover': {
      color: c.accentHover,
      textDecorationColor: c.accentHover,
    },

    // 引用块 — 精致化
    '.cm-blockquote': {
      borderLeft: `3px solid ${isDark ? '#444c56' : '#d0d7de'}`,
      paddingLeft: '18px',
      paddingRight: '14px',
      paddingTop: '2px',
      paddingBottom: '2px',
      color: c.text2,
      fontStyle: 'italic',
      background: c.quoteBg,
      borderRadius: '0 6px 6px 0',
      margin: '8px 0',
    },

    // 分割线 — 渐变
    '.cm-hr-line .cm-lineContent': { display: 'block', border: 'none', padding: '20px 0' },

    // 代码块 — 左边框 + 圆角
    '.cm-code-block-line': {
      background: `${c.codeBlockBg} !important`,
      fontFamily: editorFont,
      fontSize: '13.5px', lineHeight: '1.65', padding: '1px 16px',
      borderLeft: `3px solid ${isDark ? '#444c56' : '#d0d7de'}`,
    },
    '.cm-code-block-first': { borderRadius: '8px 8px 0 0', paddingTop: '12px !important' },
    '.cm-code-block-last': { borderRadius: '0 0 8px 8px', paddingBottom: '12px !important' },

    // 任务列表
    '.cm-task-checked': { textDecoration: 'line-through', opacity: '0.55', color: c.textMuted },

    // 列表 marker
    '.cm-list-mark': { color: c.textMuted, fontWeight: '600' },

    // 语法隐藏/显示
    '.cm-mark-hidden': {
      display: 'inline', color: 'transparent', fontSize: '1px', lineHeight: '0', letterSpacing: '-1px', overflow: 'hidden',
      caretColor: c.text,
    },
    '.cm-activeLine .cm-mark-hidden': {
      color: isDark ? '#6e7681' : '#afb8c1', fontSize: 'inherit', lineHeight: 'inherit', letterSpacing: 'normal', overflow: 'visible',
    },

    // 图片行内预览
    '.cm-inline-image': {
      maxWidth: '100%', maxHeight: '400px', borderRadius: '8px', marginTop: '8px', marginBottom: '8px',
      display: 'block', boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.4)' : '0 2px 12px rgba(0,0,0,0.08)',
      border: `1px solid ${c.border}`,
    },

    // 复选框
    '.cm-checkbox-wrap': { display: 'inline-flex', alignItems: 'center', marginRight: '6px' },
    '.cm-checkbox-input': { width: '15px', height: '15px', cursor: 'pointer', accentColor: c.accent, borderRadius: '3px' },

    // Focus 模式
    '.cm-focus-dim': { opacity: '0.28', transition: 'opacity 0.3s ease' },
    '.cm-focus-dim.cm-activeLine': { opacity: '1' },

    // 搜索
    '.cm-searchMatch': {
      backgroundColor: isDark ? 'rgba(187, 128, 9, 0.30)' : 'rgba(255, 243, 176, 0.85)',
      borderRadius: '2px',
      outline: `1px solid ${isDark ? 'rgba(187, 128, 9, 0.5)' : 'rgba(187, 128, 9, 0.4)'}`,
    },
    '.cm-searchMatch.cm-searchMatch-selected': {
      backgroundColor: isDark ? 'rgba(187, 128, 9, 0.50)' : 'rgba(255, 224, 136, 0.95)',
      outline: `1.5px solid ${isDark ? '#d29922' : '#bf8700'}`,
    },
  })
}
