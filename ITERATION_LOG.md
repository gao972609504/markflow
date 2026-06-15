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
| 10 | 打字机音效 | Web Audio API 实时生成机械键盘音效，独立开关控制 | ✅ |
| 11 | 词频分析面板 | WordFrequency.tsx，中英文分词+停用词过滤+高频词检测，点击触发查找 | ✅ |
| 12 | 关系图谱 | GraphView.tsx，Canvas 力导向网络图可视化 WikiLink 连接，拖拽/缩放/点击跳转 | ✅ |
| 13 | 每日笔记日历 | DailyNotes.tsx，月历视图，点击日期创建/打开 YYYY-MM-DD.md，标记已有笔记 | ✅ |
| 14 | 书签面板 | BookmarksPanel.tsx，跨文档列出书签，点击跳转+居中滚动，分组管理+删除 | ✅ |
| 15 | 选中匹配高亮 | highlightSelectionMatches 扩展，选中词高亮所有出现位置，状态栏开关+命令 | ✅ |
| 16 | 表格排序与转置 | sortTable/transposeTable，按光标列升降序排序、行列互换，命令面板+快捷键 | ✅ |
| 17 | 可读性分析 | Readability.tsx，Flesch 阅读容易度+年级水平+复杂词占比+音节统计，conic 分数环 | ✅ |

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

---

## 迭代 10 — 打字机音效 (Typewriter Sound)

**日期**: 2026-06-12

### 特性描述
在打字机模式下（或独立开启时），每次输入字符时通过 Web Audio API 实时生成机械键盘音效，增强写作沉浸感。音效开关独立控制，不与打字机滚动模式绑定。

### 核心改动
- **修改** `src/renderer/src/store/editorStore.ts`
  - 新增 `typewriterSound: boolean` 状态（默认 `false`）
  - 新增 `toggleTypewriterSound` action 切换音效开关
- **修改** `src/renderer/src/components/StatusBar.tsx`
  - 导入 `typewriterSound` 和 `toggleTypewriterSound`
  - 新增「音效」按钮，带喇叭图标，位于「打字机」按钮旁
  - 激活状态使用 `status-btn-active` 样式
- **修改** `src/renderer/src/components/Editor.tsx`
  - 导入 `typewriterSound`
  - 重构 `createTypewriterPlugin()`：同时处理打字机滚动和音效触发
  - 新增 `playTypewriterSound()` 函数：使用 Web Audio API `AudioContext` 实时生成音效
    - 主音：三角波振荡器 800-1000Hz，6ms 衰减
    - 弹簧声：正弦波 1200-1500Hz，3ms 衰减
    - 音量较低（gain 0.08 / 0.02），不干扰写作
  - `useEffect` 依赖数组加入 `typewriterSound`，开关变化时重建编辑器插件

### 技术点
- Web Audio API：`AudioContext` + `OscillatorNode` + `GainNode`
- 随机频率变化（`Math.random() * 200`）模拟真实机械键盘每次按键的微小差异
- 延迟加载 `AudioContext`：首次按键时才创建，避免页面加载时的音频权限问题
- 插件合并策略：将音效触发和打字机滚动统一在一个 `updateListener` 中，减少监听器数量

### 验证结果
- `npm run build` 通过，无 TypeScript 错误
- 构建耗时约 72 秒

### 非重复性说明
- 迭代 1-9 均未涉及音频/音效功能
- 项目已有「打字机模式」（迭代前就存在的打字机滚动功能），但仅控制光标居中滚动，无声音反馈
- 本迭代首次实现「实时按键音效」，是全新的感官反馈能力，与现有打字机滚动模式互补而非重复

---

## 迭代 11 — 词频分析面板 (Word Frequency Analysis)

**日期**: 2026-06-15

### 特性描述
类似 Hemingway Editor / ProWritingAid 的词汇重复检测面板。实时统计当前文档（或全部打开文档）中出现 ≥ 2 次的词汇并按频率排序，帮助写作者发现过度使用的词汇。支持中英文混合分词、停用词过滤、范围切换、点击词项直接跳转查找。

### 核心改动
- **新增** `src/renderer/src/components/WordFrequency.tsx`
  - 中英文混合分词：英文按单词（长度 ≥ 3）+ 中文逐字统计（字频）
  - 双语停用词过滤：~90 个英文虚词 + ~95 个中文虚词/语气词/代词
  - 可切换"包含停用词"开关，查看 the/的/了 等高频虚词
  - "当前文档 / 全部打开" 范围切换
  - 频率条可视化（≥5 次红色 hot、≥3 次橙色 warm、其余 accent 色）
  - 400ms 防抖，打字时不卡顿
  - 点击任意词项 → 打开查找替换面板并预填该词（CustomEvent `markflow:find-prefill`）
  - "显示更多"分页加载（每次 +25）
  - 汇总统计：总词数 + 不重复词数
- **修改** `src/renderer/src/store/editorStore.ts`
  - 新增 `wordFreqVisible` 状态和 `setShowWordFreq` action
- **修改** `src/renderer/src/components/FindReplace.tsx`
  - 新增 `markflow:find-prefill` 事件监听，接收词项并预填查找框
- **修改** `src/renderer/src/App.tsx`
  - 导入 WordFrequency 组件并加入渲染树
  - 新增 `Ctrl+Shift+K` 快捷键切换面板
- **修改** `src/renderer/src/components/CommandPalette.tsx`
  - 注册 `view.word-freq` 命令
- **修改** `src/renderer/src/styles/global.css`
  - 新增 `.wordfreq-*` 全套样式（右侧浮动面板、频率条、切换组、汇总栏）

### 技术点
- 中英文混合分词策略：英文 `[a-zA-Z][a-zA-Z'-]*` 正则 + 中文 `[一-鿿]` 单字正则
- 停用词集合用 `Set` 实现 O(1) 查找
- 跨组件通信用 `window.dispatchEvent(new CustomEvent(...))` + `addEventListener`，松耦合
- 频率条宽度按 `count / maxCount * 100%` 归一化，热力分级配色
- 防抖分析：`setTimeout` + cleanup，避免每个按键触发重算

### 验证结果
- `npm run build` 通过，零 TypeScript 错误，零警告
- 构建耗时 1 分 30 秒

### 非重复性说明
- 项目已有 WritingStats（迭代 3，追踪 WPM/字数/会话时长）和 DocStats，但均不涉及**词汇重复频率分析**
- 项目已有 TagPanel（#tag 标签管理），但处理的是显式标签而非自然语言词频
- 本迭代首次实现"自然语言词频统计 + 停用词过滤 + 点击查找跳转"组合能力，是全新的写作辅助维度

---

## 迭代 12 — 关系图谱 (Graph View)

**日期**: 2026-06-15

### 特性描述
Obsidian 标志性功能。将文档间的 WikiLink `[[双链]]` 关系可视化为力导向网络图：每个文档是一个节点，每条双链是一条边，节点按物理引擎自然排布。支持拖拽节点、点击跳转、滚轮缩放、空白处拖拽平移。

### 核心改动
- **新增** `src/renderer/src/components/GraphView.tsx`
  - Canvas 全屏渲染，devicePixelRatio 高清适配
  - 自研轻量力导向物理引擎（无 D3 等外部依赖）：
    - 节点间库仑斥力（REPULSION / dist²）
    - 连线胡克弹簧力（(dist - SPRING_LEN) × SPRING_K）
    - 中心引力（GRAVITY 拉向屏幕中心）
    - 速度阻尼（DAMP × 0.82）
  - 图数据构建：解析所有已打开标签的 `[[wikilink]]`，匹配文档名（含/不含扩展名、路径基名），建立节点与边
  - 虚拟节点：被链接但未打开的文档显示为虚线圈
  - 节点度数驱动半径大小（degree 越高节点越大）
  - 活跃文档高亮：accent 色 + 光晕
  - 交互：
    - 拖拽节点 → pin 固定并实时跟随鼠标
    - 点击节点（未拖动）→ 激活对应标签页
    - 滚轮 → 以鼠标为中心缩放（0.2x–3x）
    - 空白拖拽 → 平移视图
  - 工具栏：节点/边计数、重新布局、重置视图、关闭
  - 图例：已打开/未打开/当前文档 三色说明
- **修改** `src/renderer/src/store/editorStore.ts`
  - 新增 `showGraphView` 状态和 `setShowGraphView` action
- **修改** `src/renderer/src/App.tsx`
  - 导入 GraphView 组件并加入渲染树
  - 新增 `Ctrl+Shift+G` 快捷键
- **修改** `src/renderer/src/components/CommandPalette.tsx`
  - 注册 `view.graph` 命令
- **修改** `src/renderer/src/styles/global.css`
  - 新增 `.graph-view-*` 全套样式（全屏覆盖层、浮动工具栏、图例栏）

### 技术点
- 力导向布局经典三力模型：斥力 + 弹簧 + 引力，requestAnimationFrame 驱动稳定收敛
- 坐标变换：屏幕坐标 ↔ 世界坐标（scale + offset 逆变换），命中检测在 世界坐标系
- devicePixelRatio setTransform 保证 Retina 屏锐利
- 节点 pin 机制：拖拽时 pinned=true 零速度，松开恢复
- 滚轮缩放以鼠标为锚点：`offset = mouse - (mouse - offset) × (newScale/oldScale)`
- 名称匹配复用迭代 8 BacklinksPanel 的逻辑（baseName / fullName / 路径基名）

### 验证结果
- `npm run build` 通过，零 TypeScript 错误，零警告
- 构建耗时 2 分 1 秒

### 非重复性说明
- 项目已有 WikiLink 补全（迭代 8）和反向链接面板，但均无**可视化网络图**
- 项目已有 Mermaid 图表渲染（迭代 2），但那是渲染用户编写的图表代码；本迭代是**自动分析文档链接结构**生成图谱
- 本迭代首次实现"文档关系力导向可视化"，是知识管理维度的全新能力

---

## 迭代 13 — 每日笔记 + 日历 (Daily Notes + Calendar)

**日期**: 2026-06-15

### 特性描述
Obsidian/Notion/Logseq 核心笔记管理功能。月历模态视图，点击任意日期即可创建或打开当天的每日笔记（文件名 `YYYY-MM-DD.md`）。自动在工作区文件树中标记已有笔记的日期，支持月份导航、跳转今天。

### 核心改动
- **新增** `src/renderer/src/components/DailyNotes.tsx`
  - 月历模态：周一起始的 6×7 网格，含星期标题行
  - 月份导航（‹ / ›）+ 「今天」快捷跳转
  - 已有笔记日期：底部圆点标记（递归扫描 fileTree + 已打开标签）
  - 今天高亮（accent 底色 + 白字加粗）
  - 周末日期弱化色
  - 点击日期逻辑：
    - 若该日期笔记已打开 → 直接激活对应标签
    - 工作区已打开 → `readFile` 尝试读取，成功则打开；失败则 `writeFile` 创建模板后打开
    - 未打开工作区 → 创建未命名标签（带警告提示）
  - 每日笔记模板：YAML front matter（date 字段）+ 一级标题（日期 + 星期）
  - Esc / 背景点击关闭
  - 底部统计：本月已写篇数 + 图例
  - 路径拼接兼容 Windows 反斜杠
- **修改** `src/renderer/src/store/editorStore.ts`
  - 新增 `showDailyNotes` 状态和 `setShowDailyNotes` action
- **修改** `src/renderer/src/App.tsx`
  - 导入 DailyNotes 组件并加入渲染树
  - 新增 `Ctrl+Shift+D` 快捷键
- **修改** `src/renderer/src/components/CommandPalette.tsx`
  - 注册 `view.daily-notes` 命令
- **修改** `src/renderer/src/styles/global.css`
  - 新增 `.dailynotes-*` 全套样式（模态弹窗、日历网格、单元格状态、图例）

### 技术点
- 日期正则 `^(\d{4})-(\d{2})-(\d{2})\.(md|markdown|mdx|txt)$` 识别每日笔记文件
- 周一起始日历：`startOffset = firstDay.getDay() - 1`（周日=0 映射到偏移 6）
- 文件存在性检测：`readFile` 成功=已存在，catch=需新建（避免额外的 stat 调用）
- FileTreeNode 递归扫描收集所有匹配日期
- 复用迭代 11/12 的 store 扩展模式（state + action + setShow 三件套）

### 验证结果
- `npm run build` 通过，零 TypeScript 错误，零警告
- 构建耗时 1 分 28 秒

### 非重复性说明
- 项目已有文件树、最近文件、标签管理，但均无**日历驱动的每日笔记**功能
- 项目已有标签页创建/文件读写能力，本迭代是首次将这些能力组合为「日期 → 笔记」的笔记管理工作流
- 是知识管理（配合迭代 8 双链、迭代 12 图谱）的日记维度补充

---

## 迭代 14 — 书签面板 (Bookmarks Panel)

**日期**: 2026-06-15

### 特性描述
跨所有打开文档的书签管理面板。项目此前已有书签数据（`toggleBookmark` / `nextBookmark` / `prevBookmark`）但缺少统一的查看/跳转界面。本迭代新增浮层面板，按文档分组列出全部书签，点击即可跳转到对应标签页并居中滚动到目标行，支持删除单个书签和清空某文档书签。

### 核心改动
- **新增** `src/renderer/src/components/BookmarksPanel.tsx`
  - 复用 editorStore 中已有的 `bookmarks: Record<tabId, {line, label}[]>` 数据
  - 按标签分组渲染，活跃文档高亮（accent 色 + 圆点指示）
  - 每条书签：行号徽章 + 标签文本（书签所在行前 40 字符）
  - 点击跳转：`setActiveTab` + `EditorView.scrollIntoView(from, { y: 'center' })` 居中定位
  - 跨标签跳转延迟 60ms 等待编辑器重建后再滚动
  - 悬停显示删除按钮，单条删除 + 清空整组
  - 空状态引导（提示书签快捷键）
  - 头部计数徽章
- **修改** `src/renderer/src/store/editorStore.ts`
  - 新增 `bookmarksVisible` 状态和 `setShowBookmarks` action
- **修改** `src/renderer/src/App.tsx`
  - 导入 BookmarksPanel 组件并加入渲染树
  - 新增 `Ctrl+Shift+M` 快捷键
- **修改** `src/renderer/src/components/CommandPalette.tsx`
  - 注册 `view.bookmarks` 命令
- **修改** `src/renderer/src/styles/global.css`
  - 新增 `.bookmarks-*` 全套样式（右侧浮动面板、分组头、书签项、删除按钮）

### 技术点
- 数据驱动复用：直接消费已有 store.bookmarks，无需新增数据模型
- 跨标签跳转：`setActiveTab` 后编辑器会重建，用 `setTimeout(60ms)` 延迟 dispatch 滚动
- `EditorView.scrollIntoView(pos, { y: 'center' })` 让目标行居中显示
- 行号 clamp：`Math.min(line, view.state.doc.lines)` 防止文档变短后越界

### 验证结果
- `npm run build` 通过，零 TypeScript 错误，零警告
- 构建耗时 1 分 23 秒

### 非重复性说明
- 项目已有书签的增删和上/下一个导航逻辑（Editor.tsx），但**无面板列表查看/跨文档跳转 UI**
- 与迭代 4 链接悬浮预览、迭代 8 反向链接面板不同：本迭代专门管理用户手动标记的"收藏行"
- 是文档内导航（配合大纲、书签跳转、行号跳转）的补全

---

## 迭代 15 — 选中匹配高亮 (Selection Match Highlight)

**日期**: 2026-06-15

### 特性描述
VS Code / Sublime 标配的编辑器特性。选中一个词（或光标停留在一个词上）时，自动高亮文档中所有其他相同词的出现位置，便于快速定位和审阅重复内容。可通过状态栏按钮和命令面板开关。

### 核心改动
- **修改** `src/renderer/src/components/Editor.tsx`
  - 从 `@codemirror/search` 新增导入 `highlightSelectionMatches`
  - 扩展数组新增条件项：`selectionHighlight ? [highlightSelectionMatches({ minSelectionLength: 2, wholeWords: false, highlightWordAroundCursor: true })] : []`
  - 解构新增 `selectionHighlight`
  - 编辑器创建依赖数组新增 `selectionHighlight`（切换时重建编辑器以应用/移除扩展）
- **修改** `src/renderer/src/store/editorStore.ts`
  - 新增 `selectionHighlight: boolean`（默认 `true`）和 `toggleSelectionHighlight` action
- **修改** `src/renderer/src/components/StatusBar.tsx`
  - 解构新增 `selectionHighlight` / `toggleSelectionHighlight`
  - 行号按钮旁新增「匹配」开关按钮（自定义 SVG 图标 + 激活态）
- **修改** `src/renderer/src/components/CommandPalette.tsx`
  - 注册 `edit.toggle-selection-highlight` 命令（显示当前开关状态）
- **修改** `src/renderer/src/styles/global.css`
  - 新增 `.cm-selectionMatch` 样式（accent-softer 底色 + 圆角）
  - 主匹配项 `.cm-selectionMatch-main` 更深底色

### 技术点
- `@codemirror/search` 的 `highlightSelectionMatches`：基于选区自动构建 RegExp 匹配并添加装饰
- `highlightWordAroundCursor: true`：无选区时也高亮光标所在词
- `minSelectionLength: 2`：避免单字符误触发大量高亮
- 复用编辑器重建机制（与 wordWrap/showLineNumbers 同一 useEffect 依赖）

### 验证结果
- `npm run build` 通过，零 TypeScript 错误，零警告
- 构建耗时 1 分 57 秒

### 非重复性说明
- 项目已有查找替换面板（Ctrl+H）和搜索，但无**选区驱动的实时高亮**
- 已确认扩展数组此前不含 `highlightSelectionMatches`
- 是编辑器交互体验（配合迭代 6 lint、已有括号匹配）的补全

---

## 迭代 16 — 表格排序与转置 (Table Sort & Transpose)

**日期**: 2026-06-15

### 特性描述
为 Markdown 表格增加数据操作能力：按光标所在列升序/降序排序（智能识别数值列，兼容千分位逗号），以及行列转置（transpose）。配合已有的表格格式化（Ctrl+Shift+F）和插入（Ctrl+Shift+T），形成完整的表格工具链。

### 核心改动
- **修改** `src/renderer/src/components/Editor.tsx`
  - 新增 `parseTableAt(view)` 公共解析器：定位光标所在表格边界，解析为 `string[][]` 行 + 分隔符标记 + 分隔符行号
  - 新增 `rebuildTableLines(rows, isSep)` 格式化器：按最大列宽对齐重建表格文本（复用 formatMarkdownTable 的对齐与分隔符逻辑）
  - 新增 `sortTable(view, desc)`：按光标所在列排序数据行（分隔符前为表头，不参与排序）；数值列用数值比较、文本列用 `localeCompare('zh-Hans-CN')` 中文排序
  - 新增 `transposeTable(view)`：表头+数据行构成矩阵，转置后重建（新表头=旧首列，自动生成 `---` 分隔符）；正确处理转置后行数增减（追加新行 / 删除多余行）
  - 新增 keymap：`Mod-Alt-S`（升序）/ `Shift-Mod-Alt-S`（降序，用 keymap 的 shift 变体）/ `Mod-Alt-R`（转置）
- **修改** `src/renderer/src/components/CommandPalette.tsx`
  - 新增 `editor.sort-table` / `editor.sort-table-desc` / `editor.transpose-table` 三条命令（dispatch keydown 复用 keymap）

### 技术点
- 光标所在列推断：`curLine.text.slice(0, cursorPos)` 中 `|` 的数量 − 1
- 数值列检测：`every` 行 trim 后去掉千分位逗号 `isNaN(Number(v))` 取反
- CodeMirror keymap 的 `shift` 变体：`{ key: 'Mod-Alt-s', run: asc, shift: desc }` 自动响应 Shift 键
- 转置边界处理：`overlap = min(origCount, newCount)` 仅替换重叠行，多出的行追加、少掉的行删除，避免越界改到表外内容

### 验证结果
- `npm run build` 通过，零 TypeScript 错误，零警告
- 构建耗时 2 分 37 秒

### 非重复性说明
- 项目已有 `formatMarkdownTable`（对齐）和 `insertTable`（插入空表），但**无排序、无转置**
- 排序与转置是数据表格的全新操作维度，迭代 1-15 均未涉及

---

## 迭代 17 — 可读性分析 (Readability Analysis)

**日期**: 2026-06-15

### 特性描述
基于 Flesch 阅读容易度（Reading Ease）和 Flesch-Kincaid 年级水平的文本可读性评估面板，类似 Hemingway Editor / Grammarly / readable.com 的难度分析。计算阅读分数（0-100）、年级水平、平均句长、平均音节、复杂词占比、最长句子等指标，帮助写作者调整文本难度。

### 核心改动
- **新增** `src/renderer/src/components/Readability.tsx`
  - Flesch Reading Ease = 206.835 − 1.015×(词/句) − 84.6×(音节/词)
  - Flesch-Kincaid Grade = 0.39×(词/句) + 11.8×(音节/词) − 15.59
  - 英文音节数估算（启发式：去除常见后缀 es/ed/e 后计元音组）
  - 中英文混合处理：中文字符按 1 词 1 音节计入（每个汉字≈1音节）
  - 句子切分：中英文标点 `[。！？!?]` + 换行段落
  - 复杂词占比：3+ 音节英文词占比
  - 分数环可视化：conic-gradient 按分数着色（红→橙→绿渐变）
  - 分数解读：7 级标签（非常容易 5年级 → 非常困难 研究生）
  - 难度刻度条 + 指针标记
  - 复杂词过高时给出优化建议
  - 400ms 防抖
- **修改** `src/renderer/src/store/editorStore.ts`
  - 新增 `readabilityVisible` 状态和 `setShowReadability` action
- **修改** `src/renderer/src/App.tsx`
  - 导入 Readability 组件并加入渲染树
  - 新增 `Ctrl+Shift+E` 快捷键
- **修改** `src/renderer/src/components/CommandPalette.tsx`
  - 注册 `view.readability` 命令
- **修改** `src/renderer/src/styles/global.css`
  - 新增 `.readability-*` 全套样式（conic 分数环、年级卡片、4 格统计、刻度条、提示框）

### 技术点
- 音节计数启发式：`word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '')` 后匹配 `[aeiouy]{1,2}` 元音组
- conic-gradient 分数环：`conic-gradient(var(--ease-color) calc(var(--ease-pct)), var(--bg-secondary) 0)` + 内圈白色覆盖
- CSS 自定义属性通过 `as CSSProperties` 类型断言传入 style
- 除零保护：words/sentences 为 0 时分数返回 null

### 验证结果
- `npm run build` 通过，零 TypeScript 错误，零警告
- 构建耗时 1 分 49 秒

### 非重复性说明
- 项目已有 WritingStats（迭代 3，WPM/字数/会话）、DocStats（基础统计）、词频分析（迭代 11），但均无**阅读难度/年级水平**评估
- 可读性是写作质量分析的新维度（基于国际通用 Flesch 公式）


