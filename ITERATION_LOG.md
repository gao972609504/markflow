# MarkFlow 迭代日志

> 记录每次迭代的特性、核心改动和技术点，防止重复开发。

| 迭代 | 特性名称 | 核心改动 | 状态 |
|------|---------|---------|------|
| 1 | Slash Commands 斜杠命令快速插入 | 新增 `slashCommand.ts` 插件，接入 Editor.tsx，添加面板样式 | ✅ |
| 2 | Mermaid 图表实时渲染 | MermaidWidget + decorations 集成，mermaid 异步加载 | ✅ |
| 3 | 写作会话统计 (Writing Stats) | WritingStats.tsx 组件，实时 WPM/字数/会话时长/连续天数 | ✅ |
| 4 | 链接悬浮预览 (Link Hover Preview) | linkPreview.ts 扩展，悬停链接弹出 URL 预览+操作按钮 | ✅ |
| 5 | 自定义代码片段管理器 (Snippet Manager) | SnippetManager.tsx + expandSnippet 合并自定义片段 | ✅ |
| 6 | Markdown Lint 风格检查 | markdownLint.ts 扩展，11 条规则实时检测 | ✅ |
| 7 | Emoji 选择器 | emojiPicker.ts 扩展，输入 `:` 触发浮动面板，70+ emoji 搜索 | ✅ |
| 8 | WikiLink 双向链接系统 | wikiLinkCompletion.ts + BacklinksPanel.tsx，支持 [[触发补全和反向链接面板 | ✅ |
| 9 | 智能表格粘贴 | Editor.tsx pasteHandler 增加表格数据自动转 Markdown 表格 | ✅ |

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

## 迭代 5 — 自定义代码片段管理器 (Custom Snippet Manager)

**日期**: 2026-06-12

### 特性描述
用户可创建、编辑、删除自定义代码片段（snippet）。在编辑器中输入触发词按 Tab 即可展开为预设内容。支持搜索、编辑、多行片段。

### 核心改动
- **新增** `src/renderer/src/components/SnippetManager.tsx`
  - 左右分栏 UI：左侧列表 + 搜索，右侧编辑表单
  - CRUD 操作：创建/编辑/删除片段，触发词唯一性校验
  - localStorage 持久化（markflow-custom-snippets）
  - 导出 `loadCustomSnippets()` 供 Editor.tsx 调用
- **修改** `src/renderer/src/components/Editor.tsx`
  - `expandSnippet()` 合并自定义片段（优先于内置片段）
  - 导入 `loadCustomSnippets` 函数
- **修改** `src/renderer/src/store/editorStore.ts`
  - 新增 `showSnippetManager` 状态和 `setShowSnippetManager` action
- **修改** `src/renderer/src/App.tsx`
  - 导入 SnippetManager 组件并加入渲染树
- **修改** `src/renderer/src/components/CommandPalette.tsx`
  - 注册 `view.snippet-manager` 命令
- **修改** `src/renderer/src/styles/global.css`
  - 新增 `.snippet-*` 全套样式（分栏布局、列表项、表单、提示区）

### 技术点
- 自定义片段与内置片段合并策略：自定义优先（可覆盖内置触发词）
- 触发词去空格处理，编辑模式下禁用触发词修改
- 每次展开时实时从 localStorage 读取，无需重启编辑器

## 迭代 6 — Markdown Lint 风格检查

**日期**: 2026-06-12

### 特性描述
实时检测常见 Markdown 格式问题，在编辑器中以波浪线/下划线标注，悬停显示具体规则说明和错误代码。共 11 条规则。

### 核心改动
- **新增** `src/renderer/src/plugins/markdownLint.ts`
  - MD001: 标题层级跳跃检测
  - MD009: 行尾空格
  - MD010: 硬制表符
  - MD012: 连续多个空行
  - MD013: 行过长（>120 字符）
  - MD022: 标题前后缺少空行
  - MD034: 裸 URL
  - MD040: 代码块缺少语言标识
  - MD045: 图片缺少 alt 文本
  - MD047: 文件末尾缺少换行
  - 800ms 防抖延迟，避免编辑时频繁触发
- **修改** `src/renderer/src/components/Editor.tsx`
  - 导入 `markdownLinter` 并加入扩展数组
- **修改** `package.json`
  - 新增 `@codemirror/lint` 显式依赖
- **修改** `src/renderer/src/styles/editor.css`
  - 新增 `.cm-diagnostic` / `.cm-lintRange` 主题适配样式

### 技术点
- CodeMirror 6 `linter()` API，返回 `Diagnostic[]`
- 按 severity 分级：error（红）、warning（橙）、info（蓝）
- 纯文本分析 + 正则匹配，无 AST 依赖，性能优良

## 迭代 7 — Emoji 选择器

**日期**: 2026-06-12

### 特性描述
在编辑器中输入 `:` 后弹出浮动 emoji 选择面板，支持中英文关键词搜索、键盘导航（↑↓ 选择，Tab/Enter 确认，Esc 关闭）。内置 70+ 常用 emoji。

### 核心改动
- **新增** `src/renderer/src/plugins/emojiPicker.ts`
  - CodeMirror 6 StateField + ViewPlugin + keymap 扩展
  - 70+ emoji 数据，支持中英文关键词搜索
  - `:` 触发，代码块/Callout 内自动屏蔽
  - 浮动面板定位在光标下方
  - 鼠标点击和键盘双模式选择
- **修改** `src/renderer/src/components/Editor.tsx`
  - 导入并集成 `createEmojiPickerExtension()`
- **修改** `src/renderer/src/styles/editor.css`
  - 新增 `.cm-emoji-*` 全套样式

### 技术点
- StateEffect 驱动面板状态，ViewPlugin 渲染 DOM
- 触发检测排除代码块（syntaxTree 检查）和 Callout（`:::`前缀）
- coordsAtPos 定位面板，父元素相对定位

---

## 迭代 8 — WikiLink 双向链接系统

**日期**: 2026-06-12

### 特性描述
类似 Obsidian / Logseq 的 WikiLink 双向链接系统。输入 `[[` 触发文档补全，自动列出工作区中所有 Markdown 文件；反向链接面板显示哪些文档链接到了当前文档，支持点击跳转。

### 核心改动
- **新增** `src/renderer/src/plugins/wikiLinkCompletion.ts`
  - CodeMirror 6 扩展：StateField + ViewPlugin + keymap
  - 输入 `[[` 触发补全面板，列出当前工作区所有 Markdown 文件
  - 支持中英文模糊搜索过滤
  - 键盘导航（↑↓ 选择，Tab/Enter 确认，Esc 关闭）
  - 自动补全为 `[[文件名]]` 格式
  - 构建文件列表来源：已打开标签 + 文件树扫描
- **新增** `src/renderer/src/components/BacklinksPanel.tsx`
  - 扫描所有已打开标签中的 WikiLinks
  - 匹配逻辑：链接目标等于当前文档文件名（不含扩展名）或完整文件名
  - 显示来源文档、行号、上下文片段
  - 点击跳转到引用文档
  - 空状态提示 + 当前文档 outgoing links 计数
- **修改** `src/renderer/src/components/Editor.tsx`
  - 导入并集成 `createWikiLinkCompletion()`
- **修改** `src/renderer/src/store/editorStore.ts`
  - 新增 `backlinksVisible` 状态和 `setShowBacklinks` action
- **修改** `src/renderer/src/App.tsx`
  - 导入 BacklinksPanel 组件并加入渲染树
- **修改** `src/renderer/src/components/CommandPalette.tsx`
  - 注册 `view.backlinks` 命令，快捷键 `Ctrl+Shift+B`
- **修改** `src/renderer/src/styles/global.css`
  - 新增 `.backlinks-*` 全套样式（面板、列表项、空状态、高亮）

### 技术点
- CodeMirror StateEffect 驱动补全面板状态
- 文件列表去重：已打开标签 + 文件树扫描合并后排序
- 反向链接匹配：正则 `\[\[[^\]|]+(?:\|[^\]]+)?\]\]` 提取链接目标
- 点击反向链接项直接激活对应标签页

### 验证结果
- `npm run build` 通过，无 TypeScript 错误
- 构建耗时约 68 秒

### 非重复性说明
- 迭代 1-7 均未涉及 WikiLink 或双向链接功能
- 本迭代首次实现 `[[` 触发文档补全 + 反向链接面板，属于全新的笔记关联能力
- 与迭代 4 的「链接悬浮预览」不同：后者处理标准 Markdown 链接 `[text](url)` 的悬停预览；本迭代处理 WikiLink `[[...]]` 的补全和反向索引

---

## 迭代 9 — 智能表格粘贴 (Smart Table Paste)

**日期**: 2026-06-12

### 特性描述
从 Excel / Google Sheets / Numbers 等工具复制制表符分隔的数据后，在 MarkFlow 中粘贴时自动识别并转换为标准 Markdown 表格格式。支持 CSV（逗号分隔）数据作为降级方案。

### 核心改动
- **修改** `src/renderer/src/components/Editor.tsx`
  - 在 `pasteHandler` 的 `paste` 事件中增加文本内容检测逻辑
  - 新增 `parseClipboardTable(text)` 函数：检测剪贴板文本是否包含制表符（`\t`）分隔的多行数据；若无制表符则尝试逗号分隔（CSV）
  - 新增 `convertToMarkdownTable(rows)` 函数：将二维数组转为标准 Markdown 表格，自动计算每列最大宽度进行对齐，缺失单元格自动填充空字符串
  - 触发条件：文本粘贴且图片粘贴未命中时检测

### 技术点
- Excel / Sheets 复制数据的格式：行以 `\r\n` 或 `\n` 分隔，单元格以 `\t` 分隔
- CSV 降级检测：要求至少有一行有 2+ 个逗号分隔项
- Markdown 表格列对齐：计算每列最大宽度，所有单元格统一右补空格

### 验证结果
- `npm run build` 通过，无 TypeScript 错误
- 构建耗时约 62 秒

### 非重复性说明
- 迭代 1-8 均未涉及表格粘贴功能
- 项目已有 `formatMarkdownTable`（Mod+Shift+F 格式化现有表格）和 `insertTable`（Mod+Shift+T 插入新表格），但均不处理从外部工具粘贴的数据转换
- 本迭代首次实现「外部制表符/CSV 数据 → Markdown 表格」的自动转换，是全新的数据导入能力

