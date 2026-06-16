# 泊墨 迭代日志

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
| 18 | 主题强调色预设 | data-accent 属性 + 5 套预设（绿/紫/橙/青/玫），状态栏 swatch 循环切换，localStorage 持久化 | ✅ |
| 19 | 日期时间插入 | insertDate/Time/DateTime/Timestamp/Weekday 命令，Alt+D/T/W 快捷键，命令面板 5 条 | ✅ |
| 20 | 写作灵感 | WritingPrompts.tsx，~40 条双语提示库，5 分类，换一题/复制/插入文档 | ✅ |
| 21 | 颜色色块装饰 | colorSwatch.ts ViewPlugin，#hex/rgb()/hsl() 颜色值旁显示真实色块 | ✅ |

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
从 Excel / Google Sheets / Numbers 等工具复制制表符分隔的数据后，在 泊墨 中粘贴时自动识别并转换为标准 Markdown 表格格式。支持 CSV（逗号分隔）数据作为降级方案。

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

---

## 迭代 18 — 主题强调色预设 (Accent Theme Presets)

**日期**: 2026-06-15

### 特性描述
项目此前仅有亮/暗双主题。本迭代新增 6 套强调色预设（蓝/绿/紫/橙/青/玫），通过 CSS 变量覆盖机制实时切换整个应用的强调色调（按钮、链接、高亮、激活态、进度条等所有使用 --accent-color 的元素），与亮/暗主题兼容。选择持久化到 localStorage。

### 核心改动
- **修改** `src/renderer/src/store/editorStore.ts`
  - 新增 `accentPreset: string`（默认 'blue'，localStorage 读取）
  - 新增 `setAccentPreset` action（写 localStorage + 更新状态）
- **修改** `src/renderer/src/App.tsx`
  - 解构新增 `accentPreset`
  - 新增 useEffect：`document.documentElement.setAttribute('data-accent', accentPreset)`
- **修改** `src/renderer/src/styles/global.css`
  - 在暗色主题块后新增 5 套 `[data-accent="xxx"]` 预设块（forest/berry/amber/ocean/rose）
  - 每套覆盖 `--accent-color` / `--accent-hover` / `--accent-soft` / `--accent-softer`
  - 新增 `.status-accent-swatch` 圆点样式
- **修改** `src/renderer/src/components/StatusBar.tsx`
  - 解构新增 `accentPreset` / `setAccentPreset`
  - 主题按钮旁新增强调色 swatch 循环按钮（圆点显示当前 accent 色 + 中文标签，点击循环 6 套）

### 技术点
- CSS 变量覆盖：`[data-accent="xxx"]`（属性选择器，特异性 0,1,0）置于暗色主题块之后，级联覆盖 `:root` 和 `[data-theme="dark"]` 的 accent 变量
- blue 预设无 CSS 规则 → 回退到基座亮/暗 accent（亮 #4183c4 / 暗 #4eb0d6），其余 5 套显式覆盖
- 状态栏 swatch 用 `background: var(--accent-color)` 实时反映当前色
- localStorage 持久化（markflow-accent），IIFE 初始值读取

### 验证结果
- `npm run build` 通过，零 TypeScript 错误，零警告
- 构建耗时 1 分 27 秒

### 非重复性说明
- 项目已有亮/暗主题切换（data-theme），但无**强调色个性化**
- 本迭代是外观主题维度的全新能力（VS Code / Obsidian 均支持 accent 自定义）

---

## 迭代 19 — 日期时间插入 (Date/Time Insertion)

**日期**: 2026-06-15

### 特性描述
一键插入当前日期、时间、日期时间、ISO 时间戳、星期。配合每日笔记（迭代 13）形成完整的日记/时间记录工作流。通过快捷键和命令面板两种方式触发。

### 核心改动
- **修改** `src/renderer/src/components/Editor.tsx`
  - 新增 `insertAtCursor(view, text)` 通用插入助手（替换选区、光标定位到末尾）
  - 新增 5 个命令：`insertDate`（YYYY-MM-DD）、`insertTime`（HH:MM）、`insertDateTime`（YYYY-MM-DD HH:MM）、`insertTimestamp`（ISO 8601）、`insertWeekday`（星期X）
  - 新增 keymap：
    - `Alt-D` → 日期 / `Shift-Alt-D` → 日期时间（shift 变体）
    - `Alt-T` → 时间 / `Shift-Alt-T` → ISO 时间戳
    - `Alt-W` → 星期
- **修改** `src/renderer/src/components/CommandPalette.tsx`
  - 新增「插入」分类下 5 条命令（dispatch keydown 复用 keymap）

### 技术点
- `view.dispatch({ changes, selection })` 插入文本并把光标移到插入内容末尾
- CodeMirror keymap `shift` 变体：同一基础键 + Shift 映射到相关命令（Alt-D 日期 → Alt-Shift-D 日期时间）
- `pad2()` 工具保证月/日/时/分两位补零

### 验证结果
- `npm run build` 通过，零 TypeScript 错误，零警告
- 构建耗时 2 分 44 秒

### 非重复性说明
- 项目已有斜杠命令（迭代 1）和自定义片段（迭代 5），但无**实时日期/时间插入**
- 与每日笔记（迭代 13）互补：后者按日期创建文件，本迭代在任意位置插入时间标记

---

## 迭代 20 — 写作灵感 (Writing Prompts)

**日期**: 2026-06-15

### 特性描述
随机展示写作提示以激发创作灵感（iA Writer、Obsidian 提示插件等写作类工具的常见功能）。内置 ~40 条精选中文写作提示，分 5 类（全部/创意/日记/观点/故事），支持换一题、复制到剪贴板、作为引用块插入到当前文档。

### 核心改动
- **新增** `src/renderer/src/components/WritingPrompts.tsx`
  - ~40 条双语写作提示数据（创意/日记/观点/故事四类）
  - 模态弹窗：大号引号装饰 + 衬线字体提示文本
  - 5 个分类筛选 pill（全部/创意/日记/观点/故事）
  - "换一题" 随机/顺序切换（index 循环 + 卡片淡入动画）
  - "复制" 写入剪贴板 + 1.5s 反馈
  - "插入文档" → 通过 getEditorView 将提示作为 `> 引用块` 插入光标处
  - 分类切换时重置索引；Esc / 背景点击关闭
  - 底部计数（N 条 · i/N）
- **修改** `src/renderer/src/store/editorStore.ts`
  - 新增 `showPrompts` 状态和 `setShowPrompts` action
- **修改** `src/renderer/src/App.tsx`
  - 导入 WritingPrompts 组件并加入渲染树
  - 新增 `Ctrl+Shift+J` 快捷键
- **修改** `src/renderer/src/components/CommandPalette.tsx`
  - 注册 `view.prompts` 命令
- **修改** `src/renderer/src/styles/global.css`
  - 新增 `.prompts-*` 全套样式（模态弹窗、分类 pill、引用卡片、操作按钮）

### 技术点
- 提示库为静态数组，按 category 过滤后取模索引
- 插入文档复用 `getEditorView` + `view.dispatch({ changes, selection })`
- 引用大引号用 Georgia serif + opacity 装饰
- 卡片切换 `key={category-idx}` 触发 React 重挂载播放淡入动画

### 验证结果
- `npm run build` 通过，零 TypeScript 错误，零警告
- 构建耗时 2 分 17 秒

### 非重复性说明
- 项目已有斜杠命令（迭代 1）、自定义片段（迭代 5）、每日笔记（迭代 13），但无**灵感激发式提示**
- 是写作流程起点的全新维度（从"写什么"切入，而非"怎么写"）

---

## 迭代 21 — 颜色色块装饰 (Color Swatch Decorator)

**日期**: 2026-06-15

### 特性描述
在文档中的 CSS 颜色值旁自动显示真实色块预览，类似 VS Code 内置 color decorator 和 Obsidian 颜色插件。支持 `#hex`（3/4/6/8 位）、`rgb()`、`rgba()`、`hsl()`、`hsla()` 等格式。鼠标悬停显示颜色值。对设计文档、CSS-in-Markdown、前端笔记等场景实用。

### 核心改动
- **新增** `src/renderer/src/plugins/colorSwatch.ts`
  - CodeMirror 6 `ViewPlugin` 装饰，仅扫描可视区域（`view.visibleRanges`），性能友好
  - `ColorSwatchWidget`：13×13 圆角色块，背景色 = 颜色值，悬停 title 显示色值
  - 双正则：`HEX_RE`（8/6/4/3 位 hex + 词边界）、`FN_RE`（rgba?/hsla? 函数）
  - 色块 widget 以 `side: 1` 置于颜色文本之后
  - `update` 在 `docChanged` / `viewportChanged` 时重建
- **修改** `src/renderer/src/components/Editor.tsx`
  - 导入 `colorSwatches` 并加入扩展数组（常驻开启）
- **修改** `src/renderer/src/styles/global.css`
  - 新增 `.cm-color-swatch` 样式（圆角、边框、内阴影高光）

### 技术点
- `view.state.doc.sliceString(from, to)` 取可视区文本，偏移量 = range.from + match.index
- widget `side: 1` 确保色块在颜色文本右侧、不干扰光标定位
- `Decoration.set(ranges, true)` 第二参 true 表示已排序，省去内部排序
- hex 长度分支 `{8}|{6}|{4}|{3}` 优先匹配长的，避免 `#abcdef` 被截成 `#abc`

### 验证结果
- `npm run build` 通过，零 TypeScript 错误，零警告
- 构建耗时 59 秒

### 非重复性说明
- 项目已有图片预览（ImageWidget）、KaTeX 公式、Mermaid 等渲染装饰，但无**颜色值色块**
- 与行内代码高亮（`#hex` 若写在反引号内）正交：本迭代针对裸颜色文本
- 是技术/设计类文档的视觉增强新维度



---

## 迭代 22 — 大纲面板折叠/展开 (Outline Folding)

**日期**: 2026-06-16

### 特性描述
在大纲导航中针对有子内容的标题显示三角形折叠图标，点击可折叠/展开编辑器中该标题下的内容（通过 CodeMirror 内置折叠机制）。这是 Obsidian、Typora、VS Code 等工具大纲面板的标配交互。让你能在长文档中快速收起/展开章节，专注于当前关心的部分。

### 核心改动
- **修改** `src/renderer/src/components/OutlinePanel.tsx`
  - 用 `useState<Set<number>>` 维护已折叠标题索引集合
  - 新增 `headingHasChildren(idx)`：判断当前标题是否拥有更深层级子标题
  - 新增 `toggleFold(e, idx)`：通过 CodeMirror `foldEffect` / `unfoldEffect` 操作编辑器的折叠状态，同步本地 React 状态
  - JSX 中在 `.outline-item` 内条件渲染 `.outline-fold-icon` 三角形（▶ 收起 / ▼ 展开）
  - 阻止折叠图标点击冒泡，避免触发 `scrollToLine`
- **修改** `src/renderer/src/styles/layout.css`
  - 新增 `.outline-fold-icon` 样式：14×14 圆角方块、悬停 accent 高亮、transform 过渡

### 技术点
- 复用 CodeMirror `@codemirror/language` 已提供的 `foldEffect` / `unfoldEffect` / `foldedRanges` API
- 折叠区间 = 当前标题行末 → 下一个同级/更高级标题前一行
- 展开时遍历 `foldedRanges(view.state).between(from, to)` 逐个 `unfoldEffect.of({from,to})`
- `e.stopPropagation()` 避免点击图标同时也跳转编辑器滚动
- 本地 React 状态仅用于图标三角方向显示；折叠的真相在编辑器实例里

### 验证结果
- `npm run build` 通过，零 TypeScript 错误，零警告
- 构建产物 outline 面板交互完整

### 非重复性说明
- 项目已有大纲导航（原始功能），未提交代码 + 本次 CSS 构成完整的「折叠」维度
- 与编辑器自带的代码折叠不同：本迭代从大纲反向控制编辑器折叠区，跨越面板与编辑器两个组件

---

## 迭代 23 — Focus Mode 段落聚焦 (Paragraph Focus Dimming)

**日期**: 2026-06-16

### 特性描述
真正实现专注写作模式：开启 Focus Mode 后，编辑器中非当前光标所在段落的文字自动淡化（opacity + 去饱和），仅突出你正在写作的段落。参考 iA Writer、Ulysses、Typora 的专注写作体验。store 早有 `focusMode` 字段和命令面板开关，但此前未实现真正的视觉淡化。

### 核心改动
- **新增** `src/renderer/src/plugins/focusMode.ts`
  - `createFocusModePlugin()`：CodeMirror ViewPlugin 装饰
  - `currentParagraphRange()`：以空行分隔定位光标所在段落
  - 仅扫描可视区，对非当前段落行添加 `.cm-focus-dim` line 装饰
  - 监听 selectionSet / docChanged / viewportChanged 重建
- **修改** `src/renderer/src/components/Editor.tsx`
  - 导入并挂载 `createFocusModePlugin()` 到扩展数组
- **修改** `src/renderer/src/styles/editor.css`
  - `.cm-focus-dim`：opacity 0.32 + saturate 0.6 + 0.25s 过渡

### 技术点
- `useEditorStore.getState().focusMode` 读取全局状态，无需通过 props 注入
- Editor 已有 `useEffect([focusMode])` 触发 selection dispatch，会引发 selectionSet → 插件重建
- 段落边界以"空行"为分隔符，符合 Markdown 段落语义
- 仅装饰 viewport 内行，性能友好

### 验证结果
- `npm run build` 通过，零错误零警告，58.64s

### 非重复性说明
- store 早有 focusMode 开关（命令面板可切换），但此前无视觉淡化效果
- 与 Typewriter Mode（光标居中）正交，可叠加使用

---

## 迭代 24 — 番茄钟 (Pomodoro Timer)

**日期**: 2026-06-16

### 特性描述
内置番茄工作法计时器：25 分钟专注 + 5 分钟休息自动循环，SVG 圆环进度可视化，阶段切换时播放和弦提示音，统计今日完成番茄数。帮助写作者保持专注节奏。

### 核心改动
- **新增** `src/renderer/src/components/Pomodoro.tsx`
  - 状态机 focus/break 双阶段，FOCUS_SECONDS/BREAK_SECONDS 常量
  - setInterval 倒计时，归零自动切换阶段 + playChime() 三音和弦
  - SVG 圆环进度（circumference + strokeDashoffset 动画）
  - 开始/暂停/重置/手动切换阶段按钮
  - completedFocus 计数
- **修改** `src/renderer/src/store/editorStore.ts`
  - 新增 `showPomodoro` 状态 + `setShowPomodoro` action
- **修改** `src/renderer/src/App.tsx`
  - 导入并挂载 `<Pomodoro />`
- **修改** `src/renderer/src/components/CommandPalette.tsx`
  - 注册 `view.pomodoro` 命令
- **修改** `src/renderer/src/styles/global.css`
  - 新增 `.pomodoro-*` 全套样式（overlay/modal/圆环/按钮/阶段色）

### 技术点
- Web Audio API 三音和弦（880/1108/1318Hz）作为阶段切换提示
- SVG `stroke-dasharray` + `stroke-dashoffset` 实现圆环进度，rotate(-90) 从顶部开始
- useEffect 清理 interval 避免泄漏；切换阶段时通过 setRemaining 重置

### 验证结果
- `npm run build` 通过，零错误零警告，1m 7s

### 非重复性说明
- 项目此前无任何计时/专注辅助工具
- 与 WritingStats（写作速度统计）正交：本迭代是时间管理维度

---

## 迭代 25 — 朗读模式 TTS (Read Aloud)

**日期**: 2026-06-16

### 特性描述
使用浏览器原生 SpeechSynthesis API 朗读文档，逐段播放，支持播放/暂停/停止/上下段跳转、语速调节(0.5-2x)、语音选择(自动优先中文)。辅助校对、无障碍阅读。参考 Obsidian "Read Aloud" 插件。

### 核心改动
- **新增** `src/renderer/src/components/TextToSpeech.tsx`
  - SpeechSynthesis 逐段朗读（按空行分块）
  - 预处理：剥离代码块/图片/公式/Markdown 符号
  - 播放/暂停/停止/⏮⏭ 跳段控制
  - voiceschanged 异步加载系统语音，优先 zh 语音
  - 语速滑块 + 语音下拉
  - 浮动底部控制条
- **修改** store/App/CommandPalette/CSS 接入

### 技术点
- onend 递归播放下一段；speakingRef/pausedRef 解决闭包过期
- pause()/resume() 浏览器原生 API
- 卸载时 cancel() 避免后台继续朗读

### 验证结果
- `npm run build` 通过，零错误零警告，52.48s

### 非重复性说明
- 项目此前无语音/朗读功能，全新无障碍+校对维度

---

## 迭代 26 — 复制为富文本 HTML (Copy as HTML)

**日期**: 2026-06-16

### 特性描述
将当前文档经 markdown-it 渲染为 HTML 并以富文本(text/html + text/plain 双 MIME)写入剪贴板，可直接粘贴到 Word、邮件、富文本编辑器保留格式。Notion/Typora 同款能力。

### 核心改动
- **修改** `src/renderer/src/components/CommandPalette.tsx`
  - 导入 `renderMarkdown`，新增 `copyAsHtml()` 函数
  - 用 ClipboardItem 同时写入 text/html 与 text/plain，无支持时回退纯文本
  - 命令面板新增 `file.copy-html`

### 技术点
- `ClipboardItem` 双 MIME 写入保证富文本应用读取 HTML、纯文本应用读取源码
- 复用项目已有 markdown-it 渲染管线(含 hljs/katex/表格)

### 验证结果
- `npm run build` 通过，零错误零警告，56s

### 非重复性说明
- 项目此前仅有「导出 HTML 文件」(写文件)，无「复制到剪贴板」；全新跨应用粘贴维度

---

## 迭代 27 — HTML 粘贴转 Markdown (Paste as Markdown)

**日期**: 2026-06-16

### 特性描述
从网页/Word/Notion 等复制富文本粘贴进编辑器时，自动检测 text/html 并转为 Markdown（标题/粗斜体/删除线/链接/图片/列表/引用/表格/代码块/段落）。与迭代 26「复制为 HTML」互为逆操作。参考 turndown/markmap。

### 核心改动
- **新增** `src/renderer/src/utils/htmlToMarkdown.ts`
  - 标题 h1-6、strong/b→**、em/i→*、del/s→~~
  - img→![]()、a→[text](url)
  - blockquote→>、li→-、table→MD 表格、pre/code 保护后还原
  - 实体解码(nbsp/amp/lt/gt/quot 等)、Word 命名空间清理
- **修改** `src/renderer/src/components/Editor.tsx`
  - pasteHandler 优先检测 text/html，转 MD 后插入

### 技术点
- 占位符保护 pre/code，避免内部内容被行内规则二次处理
- 与既有「智能表格粘贴」(tab 分隔)共存：HTML 优先，否则回落纯文本表格检测

### 验证结果
- `npm run build` 通过，零错误零警告，63s

### 非重复性说明
- 迭代 9 是「制表符表格→MD」，本迭代是「任意富文本 HTML→MD」，覆盖面全新

---

## 迭代 28 — 任务清单汇总面板 (Task Summary Panel)

**日期**: 2026-06-16

### 特性描述
扫描全文 `- [ ]` / `- [x]` 任务项，在右侧面板集中展示：进度百分比+进度条、点击复选框直接切换文档中状态、点击文本跳转对应行。参考 Obsidian Tasks 插件。

### 核心改动
- **新增** `src/renderer/src/components/TaskPanel.tsx` — TASK_RE 正则提取、toggle 改写文档行、jumpTo 用 EditorView.scrollIntoView
- store 新增 showTaskPanel/setShowTaskPanel
- App 挂载、CommandPalette 注册 `view.task-panel`、global.css `.task-*` 样式

### 技术点
- toggle 直接 split('\n') 改写对应行后整体 updateTabContent，与编辑器内容双向绑定
- 完成率实时随文档变化(useMemo 依赖 content)

### 验证结果
- `npm run build` 通过，零错误零警告，55.64s

### 非重复性说明
- 项目此前有任务列表语法自动续行(迭代内)，但无集中管理面板，全新任务管理维度

---

## 迭代 29 — 自定义 CSS 注入 (Custom CSS)

**日期**: 2026-06-16

### 特性描述
用户在模态框输入任意 CSS，实时应用到整个应用并持久化到 localStorage（启动自动加载）。可覆盖 CSS 变量、字体、间距等。参考 Obsidian CSS snippets 主题定制。

### 核心改动
- **新增** `src/renderer/src/components/CustomCSS.tsx`
  - `applyCustomCSS(css)` 注入/更新 `<style id="markflow-custom-style">`
  - `loadCustomCSS()` 读取 localStorage
  - 模态框：textarea 编辑 + 保存并应用 + 清空
- store 新增 showCustomCSS
- App 启动 useEffect 应用已存 CSS、挂载对话框、命令面板 `view.custom-css`
- global.css `.customcss-*` 样式

### 技术点
- 单一 `<style>` 标签复用，textContent 覆盖更新，避免重复注入
- JSX 中含 `{}` 的示例文本用 `{'{ ... }'}` 字符串表达式转义

### 验证结果
- `npm run build` 通过(修复一处 JSX 花括号转义错误)，零错误零警告，54.71s

### 非重复性说明
- 项目有 accent 主题预设(迭代18)但仅限预设切换；本迭代为任意 CSS，完全开放的主题/样式定制维度

---

## 迭代 30 — 资源与引用管理面板 (Asset & Reference Manager)

**日期**: 2026-06-16

### 特性描述
扫描全文的图片 `![]()`、外链 `[]()`、WikiLink `[[]]`、脚注引用 `[^id]`，按类型分类汇总计数，点击跳转对应行、悬停复制地址。辅助长文档资源核查与管理。

### 核心改动
- **新增** `src/renderer/src/components/AssetPanel.tsx`
  - 四类正则提取(含负向 lookbehind 排除图片干扰链接)
  - 分类筛选 pill + 计数、点击跳转、复制地址
- store showAssetPanel、App 挂载、CommandPalette、global.css `.asset-*`

### 技术点
- `(?<!!)\[...\]\(...\)` 负向 lookbehind 避免把图片当链接
- 复制按钮 stopPropagation 防误触跳转

### 验证结果
- `npm run build` 通过，零错误零警告，55.22s

### 非重复性说明
- 迭代8(双链)、迭代4(链接预览)是单点功能；本迭代是全文资源聚合视图，全新管理维度

---

## 迭代 31 — 纯文本提取 (Strip Markdown / Copy as Plain Text)

**日期**: 2026-06-16

### 特性描述
将文档去除所有 Markdown 标记（标题井号、链接、图片、列表、表格管道、粗斜体、代码块围栏、HTML 标签等）后复制为可读纯文本。用于粘贴到不支持 Markdown 的环境或朗读。参考 Typora 导出纯文本。

### 核心改动
- **新增** `src/renderer/src/utils/stripMarkdown.ts` — 全套 Markdown 反向剥离规则
- **修改** `CommandPalette.tsx` — 导入 + `copyAsPlainText()` + `file.copy-plain` 命令

### 技术点
- 链接 `[t](u)`→t、图片→alt、WikiLink→target、代码块保留内容去围栏
- 表格分隔行删除、`|`→双空格；HTML 标签整体移除
- 负向 lookbehind/lookahead 避免误伤 `*` 词内斜体

### 验证结果
- `npm run build` 通过，零错误零警告，47.17s

### 非重复性说明
- 迭代26是「MD→HTML富文本」，本迭代是「MD→纯文本」，互补的第三种复制维度

---

## 迭代 32 — 文档格式整理 (Normalize Document)

**日期**: 2026-06-16

### 特性描述
一键整理全文格式：去除每行行尾空白、折叠 3+ 连续空行为段落空隙(≤2)、去除首部空行、确保文件末尾单一换行。快捷键 Ctrl+Shift+Alt+F 或命令面板。参考 VS Code 的 trim trailing whitespace + final newline。

### 核心改动
- **新增** `src/renderer/src/utils/normalize.ts` — `normalizeDocument()` 规整规则
- **修改** `Editor.tsx` — `normalizeDoc()` keymap (Mod-Shift-Alt-F)，替换全文档本并保持光标不越界
- **修改** `CommandPalette.tsx` — `editor.normalize` 命令

### 技术点
- 行尾 `\s+$` 去除保留行首缩进
- blankRun 计数折叠连续空行，避免破坏段落间隔
- 替换后 clamp 光标到新文档长度

### 验证结果
- `npm run build` 通过，零错误零警告，49.54s

### 非重复性说明
- 迭代16是表格格式化，本迭代是全文格式规整，不同作用域

---

## 迭代 33 — 选中所有匹配项 (Select All Occurrences)

**日期**: 2026-06-16

### 特性描述
选中一段文本后按 Ctrl+Shift+L，一次性选中全文所有相同片段并进入多光标模式，批量同步编辑。VS Code / Sublime 标志性功能。

### 核心改动
- **修改** `src/renderer/src/components/Editor.tsx`
  - 从 `@codemirror/search` 导入 `selectSelectionMatches`
  - keymap 绑定 `Mod-Shift-L`
- **修改** `CommandPalette.tsx` — 注册 `editor.select-all-matches` 命令

### 技术点
- 复用 CodeMirror 内置 `selectSelectionMatches`，对选区文本创建全文多选区
- 命令面板通过 dispatch keydown 复用 keymap

### 验证结果
- `npm run build` 通过，零错误零警告

### 非重复性说明
- 项目此前有多光标添加(Mod-Alt-Arrow)，但无「选中所有匹配」；本迭代补齐多光标批量编辑闭环

---

## 迭代 34 — 写作热力图 (Writing Heatmap)

**日期**: 2026-06-16

### 特性描述
GitHub 贡献图风格的写作日历：记录过去一年每天的写作字数，5 级颜色深浅可视化，含写作天数/累计字数/本月字数统计，悬停 tooltip。参考 GitHub contributions 与 Obsidian Activity Tracker。

### 核心改动
- **新增** `src/renderer/src/components/WritingHeatmap.tsx`
  - localStorage `markflow-writing-heatmap` 持久化每日字数
  - useEffect 监听 tabs 总字数增量(中英混合计字)，累加到今日
  - 53 周 × 7 天网格，levelOf() 5 级分级，LEVEL_COLOR 配色
  - 统计面板 + 图例 + 悬停 tooltip
- store showHeatmap、App 挂载、CommandPalette `view.heatmap`、global.css `.heatmap-*`

### 技术点
- 增量记录：lastTotalRef 比较前后总字数差值，仅累加正增量，避免删字回退
- 中文按字符 [一-龥]、英文按词计字
- 网格按周列排布，未来日期透明占位

### 验证结果
- `npm run build` 通过，零错误零警告，57.85s

### 非重复性说明
- 迭代3(WritingStats)记录 WPM/连续天数，本迭代是「每日字数可视化时间轴」全新维度

---

## 迭代 35 — 脚注管理面板 (Footnote Manager)

**日期**: 2026-06-16

### 特性描述
扫描全文脚注定义 `[^id]:` 与引用 `[^id]`，集中列出：脚注 ID、文本、引用次数，点击跳转定义行；孤儿检测——定义未被引用(warn)、引用未定义(err)。学术/长文写作脚注治理利器。

### 核心改动
- **新增** `src/renderer/src/components/FootnotePanel.tsx`
  - 双正则：定义 `^\[\^([^\]]+)\]:\s?(.*)$`、引用 `\[\^([^\]]+)\]`
  - 合并 def+ref 计数、refLines、orphan 状态(ok/unreferenced/undefined)
  - 左边框色标 + 标签提示孤儿
  - jumpTo 定位定义行
- store showFootnotePanel、App 挂载(右侧面板列)、CommandPalette `view.footnote`、CSS `.footnote-*`

### 技术点
- 定义行与引用行分别扫描后按 id 归并，Set 合并全集
- orphan 三态：未定义(err)、未引用(warn)、正常
- 按定义行号排序，无定义的排末尾

### 验证结果
- `npm run build` 通过，零错误零警告，43.55s

### 非重复性说明
- 项目此前脚注仅渲染+Ctrl+Click跳转(迭代内)，无集中管理与孤儿检测面板；全新脚注治理维度

---

## 迭代 36 — 护眼模式 (Eye-care Mode)

**日期**: 2026-06-16

### 特性描述
全屏暖色滤镜覆盖层，降低蓝光、缓解夜间写作视疲劳。命令面板一键开关，状态持久化(localStorage)。亮色 multiply 暖橙、暗色 screen 暖光，两种主题自适应。参考 f.lux / Obsidian 护眼插件。

### 核心改动
- **修改** `store/editorStore.ts` — `eyeCare` 布尔(IIFE 读 localStorage)、`toggleEyeCare`(写 localStorage)
- **修改** `App.tsx` — 解构 eyeCare、渲染 `.eye-care-overlay` fixed 层(pointer-events none)
- **修改** `CommandPalette.tsx` — `view.eye-care` 开关命令(显示当前态)
- **修改** `global.css` — `.eye-care-overlay` 径向暖色渐变 + 亮/暗双 blend-mode

### 技术点
- pointer-events:none 确保覆盖层不拦截交互
- mix-blend-mode multiply(亮色加深变暖) / screen(暗色提亮变暖) 按主题切换
- z-index 9998 低于模态弹窗(10000)，不遮挡对话框

### 验证结果
- `npm run build` 通过，零错误零警告，43.50s

### 非重复性说明
- 项目有亮/暗主题与强调色，但无「色温/护眼」滤镜维度；全新视觉舒适层

---

## 迭代 37 — 相对行号 (Relative Line Numbers)

**日期**: 2026-06-16

### 特性描述
开启后，光标所在行显示绝对行号，其余行显示距光标的相对行数(1,2,3...)，便于配合 j/k 上下跳转估算距离。Vim relativenumber / VS Code 经典特性。状态持久化。

### 核心改动
- **新增** `src/renderer/src/plugins/relativeLineNumbers.ts` — `lineNumbers({ formatNumber: (n, state) => ... })`，读 state.selection 算相对值
- **修改** store — `relativeLineNumbers` 布尔(localStorage 持久化) + `toggleRelativeLineNumbers`
- **修改** `Editor.tsx` — 解构 useRelative，gutter 条件选择 relativeLineNumbers()/lineNumbers()，加入 useEffect 依赖
- **修改** `CommandPalette.tsx` — `view.relative-numbers` 开关命令

### 技术点
- 利用 CM6 `lineNumbers` 的 `formatNumber(lineNo, state)` 第二参 state 读取当前选区行
- toggle 后通过依赖数组触发编辑器重建，自动刷新 gutter
- 与 showLineNumbers(总开关)正交：仅在行号开启时生效

### 验证结果
- `npm run build` 通过，零错误零警告，43.31s

### 非重复性说明
- 项目此前只有绝对行号(toggleLineNumbers)，无相对行号；全新 Vim 风格导航辅助

---

## 迭代 38 — 全局写作仪表盘 (Workspace Dashboard)

**日期**: 2026-06-16

### 特性描述
聚合工作区全貌的卡片式仪表盘：打开标签数、工作区文件数、累计字数、今日字数(热力图)、连续天数(streak)、任务完成率、标签数、双链数。一目了然掌握写作进度。参考 Notion/Obsidian 概览页。

### 核心改动
- **新增** `src/renderer/src/components/Dashboard.tsx`
  - countWords(中英混合)、countFiles(递归 FileTreeNode)
  - 扫描所有 tabs：任务 [ ]/[x]、#tag、[[wikilink]] 去重
  - 读 localStorage heatmap(今日字数)、streak(连续天数)
  - 3 列卡片网格，悬停上浮
- store showDashboard、App 挂载、CommandPalette `view.dashboard`、CSS `.dashboard-*`

### 技术点
- 复用迭代34 heatmap 与 WritingStats streak 的 localStorage 数据，跨模块聚合
- 任务完成率实时随文档变化(useMemo 依赖 tabs)
- folderPath 文件夹路径展示(可复制)

### 验证结果
- `npm run build` 通过，零错误零警告，42.77s

### 非重复性说明
- 此前面板均为单文档维度，本迭代是「跨标签/工作区」聚合视图，全新概览维度

---

## 迭代 39 — 写作目标设置 (Word Goal Setter)

**日期**: 2026-06-16

### 特性描述
为既有 wordGoal 状态提供完整设置 UI：7 档预设目标(轻量300→挑战5000, 含 NaNo 日均1667) + 自定义输入 + 当前进度环 + 清除目标。补齐状态栏进度条缺失的设置入口。

### 核心改动
- **新增** `src/renderer/src/components/GoalSetter.tsx`
  - 预设网格、自定义输入(回车确认)、SVG 进度环
  - 实时显示当前字数/目标百分比
  - 复用 store wordGoal/setWordGoal
- store showGoalSetter、App 挂载、CommandPalette `view.goal-setter`、CSS `.goal-*`

### 技术点
- 进度环 strokeDashoffset 动画，pct clamp 0-100
- 中英混合 countWords 复用
- setWordGoal(0) 清除目标(底层 Math.max(0,goal))

### 验证结果
- `npm run build` 通过，零错误零警告，42.13s

### 非重复性说明
- StatusBar 仅展示进度，本迭代提供「设置入口 + 预设 + 可视化环」，补齐目标管理闭环

---

## 迭代 40 — 句子与段落结构分析 (Sentence & Paragraph Analyzer)

**日期**: 2026-06-16

### 特性描述
结构维度分析面板：句子数、段落数、总字数、平均句长、最长句、平均段落数、预估阅读时长、预估朗读时长。与 Flesch 难度公式(迭代17)正交，关注文档骨架结构。

### 核心改动
- **新增** `src/renderer/src/components/SentenceStats.tsx`
  - 句子分割 `(?<=[。！？!?…])\s*` 保留句末标点(lookbehind)
  - 段落空行分割、countWords 中英混合
  - 阅读时长(350字/分)、朗读时长(200字/分)，fmtDuration 格式化
- store showSentenceStats、App 挂载、CommandPalette、CSS `.sentence-*`

### 技术点
- lookbehind 正则在现代 V8 支持，构建/运行无碍
- 表格化展示，等宽字体对齐数值

### 验证结果
- `npm run build` 通过，零错误零警告，43.94s

### 非重复性说明
- 迭代17(Readability)是 Flesch 难度公式，本迭代是结构计数(句子/段落/时长)，互补分析维度

---

## 迭代 41 — YAML Front Matter 编辑器 (Front Matter Editor)

**日期**: 2026-06-16

### 特性描述
结构化编辑文档头部 `---` 块的元信息(title/date/tags 等)：图形化键值行、数组/标量切换、增删字段、启用开关。轻量解析支持 `key: value` 与 `key: [a, b]`，无法图形化的行原样保留。博客/文档写作者友好。

### 核心改动
- **新增** `src/renderer/src/components/FrontMatterEditor.tsx`
  - FM_RE 匹配头部块、parse() 分离 fields 与 rawLines
  - serialize() 重建块、apply() 替换文档头部(保留正文 rest)
  - 数组/标量切换、回车应用、新建时预填 title/date/tags
- store showFrontMatter、App 挂载、CommandPalette `view.front-matter`、CSS `.fm-*`

### 技术点
- 非图形化行(如嵌套、多行值)进 rawLines 原样回写，避免数据丢失
- isArray 以 `[...]` 语法判定，UI 用 `[…]`/`—` 按钮切换
- 无文档 front matter 时启用即新建默认三字段

### 验证结果
- `npm run build` 通过，零错误零警告，45.66s

### 非重复性说明
- 项目此前无 front matter 结构化编辑；与每日笔记(迭代13)模板正交，本迭代是任意文档元信息编辑器

---

## 迭代 42 — 任务复选框键盘切换 (Toggle Task Checkbox)

**日期**: 2026-06-16

### 特性描述
Alt+X 在光标所在任务行(或选区内所有任务行)快速切换 `[ ]` ↔ `[x]` 状态。Obsidian/Logseq Ctrl+Enter 同款核心交互，键盘流不打断写作。

### 核心改动
- **新增** `Editor.tsx` `toggleTaskCheckbox(view)` — 正则 `^(\s*)([-*+]|\d+\.)\s\[([ xX])\]` 定位复选框字符，精确替换偏移量处单字符
- keymap `Alt-x`、CommandPalette `editor.toggle-task`

### 技术点
- 复选框字符偏移 = indent + marker + space + '[' 各长度累加，替换 1 字符
- 支持选区跨多任务行批量切换

### 验证结果
- `npm run build` 通过，零错误零警告，44.20s

### 非重复性说明
- 迭代28(TaskPanel)是鼠标点击切换，本迭代是键盘快捷键切换当前/选区行，互补的交互维度

---

## 迭代 43 — 块引用切换 (Toggle Blockquote)

**日期**: 2026-06-16

### 特性描述
Ctrl+Shift+Q 对选区内所有行(或当前行)切换块引用：全部已 `>` 引用则去除前缀，否则逐行添加 `> `。Markdown 引用块的一键包裹/解包。

### 核心改动
- **新增** `Editor.tsx` `toggleBlockquote(view)` — 检测选区行是否全 `^>\s?`，统一加/去前缀
- keymap `Mod-Shift-q`、CommandPalette `editor.toggle-blockquote`

### 技术点
- allQuoted 预判：全引用才去除，避免误删；去前缀用 match `^>\s?` 长度精确删
- 与列表缩进(Mod-]/[)正交：本迭代是块级标记前缀

### 验证结果
- `npm run build` 通过，零错误零警告，43.44s

### 非重复性说明
- 迭代内 autoContinueList 仅续行引用，本迭代是「整块切换」，补齐块级格式快捷操作

---

## 迭代 44 — 任务截止日期高亮 (Due Date Highlight)

**日期**: 2026-06-16

### 特性描述
自动识别文档中的日期标记 `@YYYY-MM-DD` 或 `📅 YYYY-MM-DD`，按相对今天三色高亮：过期(红底)、今日(强调色)、未来(绿)。任务/计划类文档一眼看清紧迫度。

### 核心改动
- **新增** `src/renderer/src/plugins/dueDate.ts` — ViewPlugin 装饰，仅扫描可视区，DATE_RE 匹配，算 diff 天数分级
- **修改** `Editor.tsx` — 挂载 dueDateHighlight()
- **修改** `editor.css` — `.cm-date-overdue/today/future` 胶囊样式

### 技术点
- DATE_RE 兼容 @ 和 📅 两种前缀，`\d{1,2}` 容错月日
- NaN 日期校验跳过，diff 用 86400000 取整天数
- always-on 装饰，被动高亮不影响编辑

### 验证结果
- `npm run build` 通过，零错误零警告，43.19s

### 非重复性说明
- 项目此前无日期语义识别；与颜色色块(迭代21)、拼写检查同属装饰类，但本迭代是「日期语义着色」全新维度

---

## 迭代 45 — 朗读跟随滚动 (TTS Auto-scroll)

**日期**: 2026-06-16

### 特性描述
增强迭代25朗读模式：朗读时编辑器自动滚动并居中显示正在朗读的段落，视读与听读同步。提升校对与长文伴随阅读体验。

### 核心改动
- **修改** `src/renderer/src/components/TextToSpeech.tsx`
  - 抽取 preprocess() 单段预处理
  - start() 重构：按空行分段并记录每段起始行号(chunkLines)，与 chunkTexts 对齐
  - 新增 useEffect(chunkIdx)：通过 getEditorView + EditorView.scrollIntoView 居中滚动到当前段

### 技术点
- 段落分组保留原始行号映射，preprocess 仅作用于朗读文本不影响定位
- chunkLines 与 chunks 同长(filter 同条件)，按下一段时滚动到位
- scrollIntoView { y: 'center' } 段落居中

### 验证结果
- `npm run build` 通过，零错误零警告，42.12s

### 非重复性说明
- 迭代25是纯语音播放，本迭代补齐「视读同步」交互，朗读可用性闭环

---

## 迭代 46 — 行内链接转引用式 (Inline → Reference Links)

**日期**: 2026-06-16

### 特性描述
一键将全文行内链接 `[text](url)` 转为引用式 `[text][n]` 并在文末追加 `[n]: url` 定义块。相同 URL 复用同一编号。Markdown 学术/技术写作的引用式链接规范，Pandoc/markdownlint 常见要求。

### 核心改动
- **新增** `Editor.tsx` 导出函数 `inlineToRefLinks(view)` — 扫描行内链接、按 URL 首现分配编号、倒序替换保持偏移、末尾追加定义
- **修改** `CommandPalette.tsx` — 导入函数与 getEditorView，`editor.inline-to-ref` 命令(仅命令面板触发，避免误触)

### 技术点
- 倒序遍历 matches 替换，避免前序替换影响后续偏移
- urlToRef Map 去重，相同 URL 复用编号
- 排除图片：lookbehind `(?<!!)`
- 可撤销(单次 dispatch)，安全

### 验证结果
- `npm run build` 通过，零错误零警告，42.51s

### 非重复性说明
- 项目此前无链接风格转换；与复制为 HTML(迭代26)正交，本迭代是源码层面的链接规范化

---

## 迭代 47 — 代码块折叠 (Code Block Folding)

**日期**: 2026-06-16

### 特性描述
为 ``` 围栏代码块添加折叠服务：折叠后仅显示开头围栏行(```lang)，长代码块一键收起，配合既有 foldGutter 出现折叠标记。与标题折叠(markdownHeadingFold)并列。

### 核心改动
- **新增** `Editor.tsx` `codeFenceFold` foldService — 检测 ``` 开头行，向下找闭合围栏，返回 {from: 开头行末, to: 闭合行末}
- **修改** extensions 数组挂载 codeFenceFold

### 技术点
- foldService 返回区间即折叠范围，CM 自动在 foldGutter 显示三角
- 空代码块(相邻围栏)return null 不折叠
- 闭合检测 `^\s*```/` 容错缩进

### 验证结果
- `npm run build` 通过，零错误零警告，42.77s

### 非重复性说明
- 项目有标题折叠(迭代22 大纲面板/内置)，但围栏代码块此前不可折叠；本迭代补齐代码块折叠维度

---

## 迭代 48 — 浮动字数徽标 (Floating Word Badge)

**日期**: 2026-06-16

### 特性描述
右下角常驻浮动徽标：实时显示当前字数，设置目标后显示「/ 目标 (进度%)」，达标变绿。禅模式下更低透明度不打扰。状态栏在禅/全屏隐藏时的字数监控补充。

### 核心改动
- **新增** `src/renderer/src/components/WordBadge.tsx` — 字数(中英混合) + 目标百分比 + 达标高亮
- store showWordBadge、App 挂载(eyeCare 层旁)、CommandPalette `view.word-badge` 开关、CSS `.word-badge`

### 技术点
- backdrop-filter 毛玻璃、opacity 悬停恢复、pointer-events:none 不挡编辑
- 复用 store wordGoal，与 GoalSetter/StatusBar 数据同源
- zen 模式额外降透明度

### 验证结果
- `npm run build` 通过，零错误零警告，41.84s

### 非重复性说明
- StatusBar 在禅模式隐藏，本迭代提供「禅/全屏下可见」的浮动字数监控，补齐专注写作场景

---

## 迭代 49 — 重复段落检测 (Duplicate Detection)

**日期**: 2026-06-16

### 特性描述
扫描全文段落(空行分隔)，按归一化(去空白+小写)比对，找出出现 ≥2 次的重复段落，按次数排序展示，点击跳转首次出现行。长文去冗、避免重复表述。

### 核心改动
- **新增** `src/renderer/src/components/DuplicatePanel.tsx` — 分段+归一化+Map 计数+过滤 count>1
- store showDuplicatePanel、App 挂载、CommandPalette `view.duplicates`(分析类)、CSS `.dupe-*`

### 技术点
- normalize: trim+lowercase+折叠空白，容忍排版差异
- 仅统计归一化后 ≥8 字符的实质段落，排除短句噪声
- 模态列表，左 warning 边框警示

### 验证结果
- `npm run build` 通过，零错误零警告，42.95s

### 非重复性说明
- 项目此前无重复检测；与词频(迭代11)、可读性(迭代17)同属分析类但本迭代是「段落级重复」全新维度

---

## 迭代 50 — 自动备份 (Auto-backup on Save) 🎯 半程

**日期**: 2026-06-16

### 特性描述
每次保存已存在文件且内容有变化时，自动将旧版本备份到文件同目录的 `.bomo-backup/` 隐藏文件夹，文件名含 ISO 时间戳；每文件仅保留最近 20 份，自动轮换。防止误保存/覆盖丢失。参考 Obsidian/Typora 自动备份。

### 核心改动
- **修改** `src/main/index.ts` `file:write` 处理器
  - 写入前 stat 检测文件已存在 → 读旧内容 → 若不同则写入 `.bomo-backup/{name}.{timestamp}.bak`
  - readdir 过滤该文件 `.bak`、倒序保留 20、其余 unlink 轮换
  - 全程 try/catch，备份失败不影响主写入

### 技术点
- 备份目录 join(dirname, '.bomo-backup')，mkdir recursive
- 时间戳 `:` `.` 替换为 `-` 保证文件名合法
- 仅当 oldContent !== content 才备份，避免无变化产生空备份
- 主写入在备份 try 外层，确保备份异常不阻断保存

### 验证结果
- `npm run build` 通过，零错误零警告，43.18s

### 非重复性说明
- 项目有版本快照(手动)，但无「保存即自动留档」；本迭代是底层文件安全网，全新数据保护维度

---

## 迭代 51 — ==高亮== 语法渲染 (Highlight Syntax)

**日期**: 2026-06-16

### 特性描述
支持 Obsidian/Marktext 流行的 `==高亮==` 扩展语法：在编辑器中为 `==文本==` 内部文字添加黄色高亮背景，标注重点。亮/暗主题双配色。

### 核心改动
- **新增** `src/renderer/src/plugins/highlightMark.ts` — ViewPlugin mark 装饰，HL_RE 匹配 ==inner==，标记 inner 区间
- **修改** `Editor.tsx` 挂载 highlightMark()
- **修改** `editor.css` `.cm-highlight-mark` 黄色背景 + 暗主题适配

### 技术点
- 仅标记 inner(from+2, to-2)，保留 == 标记可见可编辑
- {1,200} 长度上限避免贪婪误匹配长文档
- viewport 扫描性能友好

### 验证结果
- `npm run build` 通过，零错误零警告，43.67s

### 非重复性说明
- 项目支持粗体/斜体/删除线/代码，但无高亮标记；本迭代补齐 ==mark== 语法维度

---

## 迭代 52 — 写作目标达成庆祝 toast (Goal Celebration)

**日期**: 2026-06-16

### 特性描述
当当前文档字数达到设定的 wordGoal 时，顶部弹出渐变庆祝 toast「🎉 达成写作目标 N 字！」，4.5s 自动消失。每轮仅触发一次（字数回落到目标下后重新可触发）。为写作目标注入正向反馈。

### 核心改动
- **新增** `src/renderer/src/components/GoalToast.tsx` — useMemo 字数、reachedRef 去重、useEffect 触发/超时、切文档/目标重置
- **修改** App.tsx 常驻挂载、global.css `.goal-toast` 渐变胶囊 + 入场动画

### 技术点
- reachedRef 防止反复弹窗；低于目标重置可再次触发
- activeTabId/wordGoal 变化时重置 reachedRef
- pointer-events:none 不挡交互，cubic-bezier 弹性入场

### 验证结果
- `npm run build` 通过，零错误零警告，42.52s

### 非重复性说明
- 迭代39(GoalSetter)+48(WordBadge)是目标展示，本迭代是「达成反馈」情感化维度
