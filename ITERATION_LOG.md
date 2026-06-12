# MarkFlow 迭代日志

> 记录每次迭代的特性、核心改动和技术点，防止重复开发。

| 迭代 | 特性名称 | 核心改动 | 状态 |
|------|---------|---------|------|
| 1 | Slash Commands 斜杠命令快速插入 | 新增 `slashCommand.ts` 插件，接入 Editor.tsx，添加面板样式 | ✅ |
| 2 | Mermaid 图表实时渲染 | MermaidWidget + decorations 集成，mermaid 异步加载 | ✅ |
| 3 | 写作会话统计 (Writing Stats) | WritingStats.tsx 组件，实时 WPM/字数/会话时长/连续天数 | ✅ |
| 4 | 链接悬浮预览 (Link Hover Preview) | linkPreview.ts 扩展，悬停链接弹出 URL 预览+操作按钮 | ✅ |

---

## 迭代 1 — Slash Commands 斜杠命令快速插入

**日期**: 2026-06-12

### 特性描述
类似 Notion / Obsidian 的斜杠命令面板。在编辑器中输入 `/` 后弹出快速插入菜单，支持模糊搜索、键盘导航（↑↓ 选择，Enter/Tab 确认，Esc 关闭）。

### 核心改动
- **新增** `src/renderer/src/plugins/slashCommand.ts`
  - CodeMirror 6 扩展：StateField + ViewPlugin + keymap
  - 32 个命令项覆盖 7 个分类（标题/列表/代码/插入/格式/高级/Callout）
  - 模糊搜索（支持中英文别名）
  - 浮动面板定位（自动避免超出视口）
  - 代码块内自动屏蔽触发
- **修改** `src/renderer/src/components/Editor.tsx`
  - 导入并集成 `createSlashCommandExtension()`
- **修改** `src/renderer/src/styles/editor.css`
  - 新增 `.cm-slash-panel` 全套样式（亮/暗色适配、动画、滚动条）

### 技术点
- CodeMirror StateEffect 驱动面板状态
- DOM 浮动面板定位（coordsAtPos + 视口边界检测）
- 语法树检测避免在代码块内触发

## 迭代 2 — Mermaid 图表实时渲染

**日期**: 2026-06-12

### 特性描述
在编辑器中输入 mermaid 代码块（\`\`\`mermaid）时，自动将流程图、序列图、甘特图等渲染为 SVG 内联显示在代码块下方。支持亮/暗色主题自适应。

### 核心改动
- **新增** `MermaidWidget` (widgets.ts)
  - 异步动态 import mermaid 库
  - 自动适配亮/暗色主题
  - 渲染失败显示友好错误提示
  - SVG 自适应容器宽度
- **修改** `decorations.ts`
  - 导入 MermaidWidget
  - 代码块结束时检测 mermaid 语言并插入渲染 Widget
- **修改** `editor.css`
  - 新增 `.cm-mermaid-widget` 和 `.cm-mermaid-error` 样式

### 技术点
- mermaid 动态 import 按需加载，不影响首屏性能
- MermaidWidget.eq() 比较代码内容和主题确保正确更新
- 渲染 ID 使用随机字符串避免冲突

## 迭代 3 — 写作会话统计 (Writing Session Statistics)

**日期**: 2026-06-12

### 特性描述
实时写作统计面板，追踪当前写作会话数据：会话时长、新增词数/字符数、实时打字速度（WPM）、每日连续写作天数、字数目标进度。通过 `Ctrl+Shift+W` 或命令面板打开。

### 核心改动
- **新增** `src/renderer/src/components/WritingStats.tsx`
  - 实时会话计时器（秒级精度）
  - 中英文混合词数统计（中文字符逐个计数 + 英文按空格分词）
  - 实时 WPM 计算（滑动窗口：最近 60 秒内的词数变化）
  - 每日连续写作天数追踪（localStorage 持久化，最多 365 天）
  - 字数目标进度条（复用 store 中已有的 wordGoal）
  - 会话数据持久化（localStorage，支持页面刷新恢复）
  - 重置会话功能
- **修改** `src/renderer/src/store/editorStore.ts`
  - 新增 `showWritingStats` 状态和 `setShowWritingStats` action
- **修改** `src/renderer/src/App.tsx`
  - 导入 WritingStats 组件并加入渲染树
  - 添加 `Ctrl+Shift+W` 快捷键绑定
  - 修复未使用变量 `filePath` 的 TS 警告
- **修改** `src/renderer/src/components/CommandPalette.tsx`
  - 注册 `view.writing-stats` 命令
- **修改** `src/renderer/src/styles/global.css`
  - 新增 `.writing-stats-*` 全套样式（6 卡片网格、目标进度条、响应式布局）

### 技术点
- 中英文混合词数统计算法（正则匹配 CJK 统一汉字 + 英文空格分词）
- 滑动窗口 WPM 计算（保留最近 60 秒的词数变化时间戳）
- localStorage 持久化：会话数据（markflow-writing-session）+ 连续天数记录（markflow-writing-streak）
- React useEffect 管理定时器和状态生命周期，组件卸载时自动清理

## 迭代 4 — 链接悬浮预览 (Link Hover Preview)

**日期**: 2026-06-12

### 特性描述
在编辑器中鼠标悬停到 Markdown 链接 `[text](url)`、自动链接 `<url>` 或裸 URL 时，弹出浮窗显示目标 URL，并提供"在浏览器打开"和"复制链接"按钮。

### 核心改动
- **新增** `src/renderer/src/plugins/linkPreview.ts`
  - CodeMirror 6 `hoverTooltip` 扩展
  - 解析三种链接格式：行内链接 `[text](url)`、自动链接 `<url>`、裸 URL
  - URL 自动截断显示（超过 80 字符）
  - 仅预览 http/https 协议链接
  - "打开链接"按钮（新窗口 noopener）+ "复制链接"按钮
  - 400ms 悬浮延迟避免误触
- **修改** `src/renderer/src/components/Editor.tsx`
  - 导入 `linkHoverTooltip` 并加入扩展数组
- **修改** `src/renderer/src/styles/editor.css`
  - 新增 `.cm-link-tooltip` 全套样式（圆角卡片、按钮交互、主题变量适配）

### 技术点
- CodeMirror 6 `hoverTooltip` API，返回 `Tooltip` 对象
- 正则匹配三种 Markdown 链接语法，计算精确的 from/to 位置
- DOM 事件处理：按钮 click 使用 preventDefault/stopPropagation 阻止编辑器干扰
