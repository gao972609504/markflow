<div align="center">

<img src="logo.jpg" alt="MarkFlow" width="260" height="260" />


**轻量美观的类 Typora 所见即所得 Markdown 编辑器**

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](LICENSE)
[![Electron](https://img.shields.io/badge/Electron-33-47848f?style=flat-square&logo=electron&logoColor=white)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-18-61dafb?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![CodeMirror](https://img.shields.io/badge/CodeMirror-6-dd6a5f?style=flat-square&logo=codemirror&logoColor=white)](https://codemirror.net/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

[下载](#-下载安装) · [功能](#-功能一览) · [快捷键](#-快捷键) · [开始使用](#-快速开始) · [English](#english)

</div>

---

## 🎯 为什么选择 MarkFlow

<table>
<tr>
<td width="50%">

### 🪶 轻量
单个可执行文件，无运行时依赖。启动快速，内存占用低。

</td>
<td width="50%">

### ✍️ 沉浸
类 Typora 所见即所得，语法标记自动隐藏，专注写作本身。

</td>
</tr>
<tr>
<td width="50%">

### 🎨 精美
GitHub 风格双主题，标题层级分明，代码块圆角着色。

</td>
<td width="50%">

### 🔓 开源
完全免费，MIT 许可证。自由使用、修改和分发。

</td>
</tr>
</table>

---

## 📥 下载安装

> [!NOTE]
> 从 GitHub Releases 下载最新版本，或克隆仓库自行构建。

| 平台 | 格式 | 说明 |
|:----:|:----:|------|
| 🪟 Windows | `.exe` | 便携版，解压即用 |
| 🍎 macOS | `.dmg` | 即将支持 |
| 🐧 Linux | `.AppImage` | 即将支持 |

---

## 📸 功能一览

<table>
<tr>
<th width="50%" align="center">📝 编辑体验</th>
<th width="50%" align="center">📁 文件管理</th>
</tr>
<tr>
<td>

- **所见即所得** — 实时渲染 Markdown
- **交互式表格** — 可视化单元格编辑
- **代码高亮** — 20+ 语言语法着色
- **数学公式** — KaTeX 行内/块级渲染
- **任务列表** — 可点击复选框
- **Callout 块** — 18 种提示框样式
- **Wiki 链接** — `[[双链]]` 支持
- **脚注** — `[^1]` 定义与引用
- **Mermaid** — 图表代码块渲染

</td>
<td>

- **文件树** — 侧栏目录结构浏览
- **多标签页** — 拖拽排序 & 固定标签
- **全局搜索** — 跨文件内容检索
- **快速打开** — `Ctrl+P` 即时跳转
- **收藏文件** — 快速访问常用文档
- **会话恢复** — 重启后自动还原状态
- **自动保存** — 可配置延迟保存

</td>
</tr>
<tr>
<th width="50%" align="center">🎯 写作辅助</th>
<th width="50%" align="center">🛠️ 编辑工具</th>
</tr>
<tr>
<td>

- **Focus 模式** — 聚焦当前段落
- **打字机模式** — 光标行始终居中
- **禅模式** — 全屏沉浸写作
- **大纲导航** — 标题结构快速跳转
- **字数目标** — 进度追踪与提醒
- **番茄钟** — 内置专注计时器
- **朗读** — 语音朗读选中文本
- **阅读时间** — 自动估算

</td>
<td>

- **查找替换** — `Ctrl+H`
- **多光标** — `Ctrl+Alt+↑/↓`
- **代码折叠** — 按标题层级折叠
- **书签** — 行标记与跳转
- **行排序** — 排序/反转/去重/编号
- **大小写** — UPPER / lower / Title
- **TOC 生成** — 自动创建目录
- **Snippet** — 快捷输入模板

</td>
</tr>
<tr>
<th colspan="2" align="center">🎨 个性化</th>
</tr>
<tr>
<td colspan="2" align="center">

亮色 / 暗色双主题 · 字体大小 `Ctrl++/−` · 字体切换 · 行号开关 · 自动换行 · Tab 宽度 · 标题编号 · 标签面板 · 拼写检查

</td>
</tr>
</table>

---

## ⌨️ 快捷键

### 文件操作

| 快捷键 | 功能 | 快捷键 | 功能 |
|:------:|------|:------:|------|
| `Ctrl+N` | 新建文件 | `Ctrl+O` | 打开文件 |
| `Ctrl+S` | 保存 | `Ctrl+W` | 关闭标签 |
| `Ctrl+P` | 快速打开 | `Ctrl+G` | 跳转到行 |
| `Ctrl+Shift+T` | 重开已关标签 | `Ctrl+Shift+H` | 全局搜索 |

### 格式

| 快捷键 | 功能 | 快捷键 | 功能 |
|:------:|------|:------:|------|
| `Ctrl+B` | **加粗** | `Ctrl+I` | *斜体* |
| `` Ctrl+` `` | `行内代码` | `Ctrl+Shift+X` | ~~删除线~~ |
| `Ctrl+H` | 查找替换 | `Ctrl+/` | 快捷操作 |

### 编辑

| 快捷键 | 功能 | 快捷键 | 功能 |
|:------:|------|:------:|------|
| `Alt+↑/↓` | 移动当前行 | `Ctrl+D` | 复制当前行 |
| `Ctrl+Shift+K` | 删除当前行 | `Ctrl+Enter` | 下方插入行 |
| `Ctrl+Alt+↑/↓` | 添加多光标 | `Ctrl+Shift+[/]` | 提升/降低标题 |
| `Ctrl+]/[` | 列表缩进/反缩进 | `Ctrl+Shift+T` | 插入表格 |
| `Tab` | 表格导航 / 展开 Snippet | `Enter` | 智能续行 |

### 高级

| 快捷键 | 功能 | 快捷键 | 功能 |
|:------:|------|:------:|------|
| `Ctrl+1~4` | 折叠到标题层级 | `Ctrl+Shift+1` | 展开全部 |
| `Ctrl+Shift+U/L` | 大写/小写 | `Ctrl+Alt+T` | 标题大小写 |
| `F5~F8` | 排序/反转/去重/编号 | `F9` | 插入目录 |
| `Ctrl+F2` | 切换书签 | `F2/Shift+F2` | 上/下一个书签 |
| `Ctrl+Shift+F` | 格式化表格 | `Ctrl+Shift+S` | 文档统计 |

### 视图

| 快捷键 | 功能 | 快捷键 | 功能 |
|:------:|------|:------:|------|
| `Ctrl+=/-` | 字体放大/缩小 | `Ctrl+0` | 重置字体 |
| `Ctrl+Shift+O` | 大纲面板 | `F11` | 禅模式 |
| `Ctrl+Shift+P` | 命令面板 | `Ctrl+Shift+/` | 快捷键参考 |

---

## 🚀 快速开始

### 环境要求

- **Node.js** ≥ 18
- **npm** ≥ 9

### 开发

```bash
git clone https://github.com/gao972609504/markflow.git
cd markflow
npm install

npm run dev          # 开发模式（热重载）
npm run build        # 生产构建
npm run preview      # 预览构建结果
```

### 打包分发

```bash
npm run build:win    # Windows（NSIS + 便携版）
npm run build:mac    # macOS（DMG）
npm run build:linux  # Linux（AppImage）
```

---

## 🏗️ 技术架构

<table>
<tr>
<th>技术</th><th>版本</th><th>用途</th>
</tr>
<tr><td><a href="https://www.electronjs.org/">Electron</a></td><td align="center">33</td><td>跨平台桌面应用框架</td></tr>
<tr><td><a href="https://react.dev/">React</a></td><td align="center">18</td><td>UI 渲染层</td></tr>
<tr><td><a href="https://codemirror.net/">CodeMirror 6</a></td><td align="center">6</td><td>核心编辑器引擎</td></tr>
<tr><td><a href="https://zustand-demo.pmnd.rs/">Zustand</a></td><td align="center">4</td><td>轻量状态管理</td></tr>
<tr><td><a href="https://katex.org/">KaTeX</a></td><td align="center">0.16</td><td>数学公式渲染</td></tr>
<tr><td><a href="https://highlightjs.org/">highlight.js</a></td><td align="center">11</td><td>代码语法高亮</td></tr>
<tr><td><a href="https://github.com/markdown-it/markdown-it">markdown-it</a></td><td align="center">14</td><td>Markdown 解析</td></tr>
</table>

### 项目结构

```
markflow/
├── src/
│   ├── main/                    # Electron 主进程
│   ├── preload/                 # 预加载脚本（IPC 桥接）
│   └── renderer/                # 渲染进程（React）
│       ├── components/          # UI 组件
│       │   ├── Editor.tsx       # 编辑器（ViewPlugin + 快捷键）
│       │   ├── FileTree.tsx     # 文件树 + 收藏
│       │   ├── StatusBar.tsx    # 状态栏（统计/番茄钟/工具）
│       │   ├── TabBar.tsx       # 标签栏（拖拽排序/固定）
│       │   ├── GlobalSearch.tsx # 全局搜索
│       │   └── FindReplace.tsx  # 查找替换
│       ├── plugins/             # 编辑器扩展
│       │   ├── decorations.ts   # 实时渲染装饰系统
│       │   ├── theme.ts         # GitHub 风格主题
│       │   └── widgets.ts       # Widget（图片/复选框/Callout）
│       ├── store/
│       │   └── editorStore.ts   # Zustand 全局状态
│       └── styles/              # CSS 样式
├── resources/                   # 应用图标
├── electron.vite.config.ts      # 构建配置
└── package.json
```

### 核心原理

> [!TIP]
> MarkFlow 不使用传统的「源码 / 预览」分栏，而是通过 CodeMirror 6 的 **Decoration 系统**直接在编辑器中渲染 Markdown。

**三步渲染流水线：**

```
buildDecorations()
  ├── Line Decoration  → 标题层级、代码块背景、引用左边框
  ├── Mark Decoration  → 加粗/斜体/代码样式 + 语法标记隐藏
  └── Widget Decoration → 图片预览、复选框控件、数学公式
```

- **光标感知** — 仅光标行显示原始语法，其余行隐藏标记、渲染富文本
- **视口优化** — 仅对可见行计算装饰，大文件流畅编辑
- **按需加载** — highlight.js 按需注册语言，包体积减少 36%

---

## 🗺️ 路线图

**已完成 ✅**

- [x] 所见即所得 Markdown 编辑
- [x] 交互式表格 + 可视化编辑
- [x] 代码块语法高亮（20+ 语言）
- [x] KaTeX 数学公式
- [x] 文件树 & 多标签页 & 拖拽排序
- [x] Callout / Admonition 提示块（18 种）
- [x] 全局搜索 + 快速打开 + 命令面板
- [x] 大纲导航 + 书签 + 标签面板
- [x] Focus / 打字机 / 禅模式
- [x] 自动保存 + 会话恢复
- [x] 番茄钟 + 字数目标 + 朗读
- [x] 多光标 + 代码折叠 + 代码片段

**进行中 🔧**

- [ ] 导出 PDF / HTML
- [ ] 自定义主题编辑器
- [ ] 图片上传到图床

**计划中 📋**

- [ ] Vim 模式
- [ ] 多语言界面（i18n）
- [ ] 协作编辑（CRDT）
- [ ] 插件系统

---

## 🤝 贡献

欢迎贡献代码！请先阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。

1. Fork → 2. 创建分支 → 3. 提交 PR

```bash
git checkout -b feature/amazing-feature
git commit -m 'feat: add amazing feature'
git push origin feature/amazing-feature
```

---

## 🙏 致谢

- [CodeMirror 6](https://codemirror.net/) — 强大的代码编辑器框架
- [Electron](https://www.electronjs.org/) — 跨平台桌面应用框架
- [React](https://react.dev/) — UI 渲染框架
- [KaTeX](https://katex.org/) — 快速数学公式渲染
- [highlight.js](https://highlightjs.org/) — 代码语法高亮
- [markdown-it](https://github.com/markdown-it/markdown-it) — Markdown 解析器
- 灵感来源：[Typora](https://typora.io/) — 优秀的 Markdown 写作体验标杆

---

## 📄 许可证

[MIT License](LICENSE) © 2024-2026 MarkFlow Contributors

<div align="center">

**MarkFlow** — 让 Markdown 写作更沉浸 ✨

[⬆ 回到顶部](#-markflow)

</div>

<br/>
<br/>

---

<div id="english">

<div align="center">

<img src="logo.jpg" alt="MarkFlow" width="260" height="260" />


**A Lightweight, Beautiful Typora-like Markdown Editor with Live Rendering**

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](LICENSE)
[![Electron](https://img.shields.io/badge/Electron-33-47848f?style=flat-square&logo=electron&logoColor=white)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-18-61dafb?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![CodeMirror](https://img.shields.io/badge/CodeMirror-6-dd6a5f?style=flat-square&logo=codemirror&logoColor=white)](https://codemirror.net/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

[Download](#-download) · [Features](#features) · [Shortcuts](#keyboard-shortcuts) · [Quick Start](#quick-start) · [中文文档](#-markflow)

</div>

---

## 🎯 Why MarkFlow

<table>
<tr>
<td width="50%">

### 🪶 Lightweight
Single executable, no runtime dependencies. Fast startup, low memory.

</td>
<td width="50%">

### ✍️ Immersive
Typora-like live rendering. Syntax markers auto-hide. Focus on writing.

</td>
</tr>
<tr>
<td width="50%">

### 🎨 Beautiful
GitHub-style dual themes. Refined typography. Rounded code blocks.

</td>
<td width="50%">

### 🔓 Open Source
Completely free, MIT licensed. Use, modify, and distribute freely.

</td>
</tr>
</table>

---

## 📥 Download

> [!NOTE]
> Download the latest release from GitHub Releases, or clone and build from source.

| Platform | Format | Notes |
|:--------:|:------:|-------|
| 🪟 Windows | `.exe` | Portable, run directly |
| 🍎 macOS | `.dmg` | Coming soon |
| 🐧 Linux | `.AppImage` | Coming soon |

---

## 📸 Features

<table>
<tr>
<th width="50%">📝 Editing</th>
<th width="50%">📁 File Management</th>
</tr>
<tr>
<td>

- **Live Rendering** — WYSIWYG Markdown
- **Interactive Tables** — Visual cell editing
- **Code Highlighting** — 20+ languages
- **Math Formulas** — KaTeX inline/block
- **Task Lists** — Clickable checkboxes
- **Callout Blocks** — 18 admonition types
- **Wiki Links** — `[[bidirectional]]` support
- **Footnotes** — `[^1]` definition & reference
- **Mermaid** — Diagram code blocks

</td>
<td>

- **File Tree** — Sidebar directory browser
- **Multi-tab** — Drag reorder & pin tabs
- **Global Search** — Cross-file content search
- **Quick Open** — `Ctrl+P` instant jump
- **Favorites** — Quick access to pinned files
- **Session Restore** — Auto-restore on restart
- **Auto-save** — Configurable delay

</td>
</tr>
<tr>
<th width="50%">🎯 Writing Aids</th>
<th width="50%">🛠️ Editor Tools</th>
</tr>
<tr>
<td>

- **Focus Mode** — Highlight current paragraph
- **Typewriter Mode** — Cursor always centered
- **Zen Mode** — Fullscreen immersive writing
- **Outline** — Heading structure navigation
- **Word Goal** — Progress tracking
- **Pomodoro Timer** — Built-in focus timer
- **Text-to-Speech** — Read selection aloud
- **Reading Time** — Auto estimate

</td>
<td>

- **Find & Replace** — `Ctrl+H`
- **Multi-cursor** — `Ctrl+Alt+↑/↓`
- **Code Folding** — Fold by heading level
- **Bookmarks** — Mark & jump to lines
- **Line Ops** — Sort/reverse/unique/number
- **Case Convert** — UPPER / lower / Title
- **TOC Insert** — Auto-generate table of contents
- **Snippets** — Quick template expansion

</td>
</tr>
<tr>
<th colspan="2">🎨 Customization</th>
</tr>
<tr>
<td colspan="2" align="center">

Light / Dark dual themes · Font size `Ctrl++/-` · Font switch · Line numbers · Word wrap · Tab width · Heading numbering · Tag panel · Spell check

</td>
</tr>
</table>

---

## ⌨️ Keyboard Shortcuts

### File

| Shortcut | Action | Shortcut | Action |
|:--------:|--------|:--------:|--------|
| `Ctrl+N` | New file | `Ctrl+O` | Open file |
| `Ctrl+S` | Save | `Ctrl+W` | Close tab |
| `Ctrl+P` | Quick open | `Ctrl+G` | Go to line |
| `Ctrl+Shift+T` | Reopen closed tab | `Ctrl+Shift+H` | Global search |

### Formatting

| Shortcut | Action | Shortcut | Action |
|:--------:|--------|:--------:|--------|
| `Ctrl+B` | **Bold** | `Ctrl+I` | *Italic* |
| `` Ctrl+` `` | `Inline code` | `Ctrl+Shift+X` | ~~Strikethrough~~ |
| `Ctrl+H` | Find & replace | `Ctrl+/` | Quick actions |

### Editing

| Shortcut | Action | Shortcut | Action |
|:--------:|--------|:--------:|--------|
| `Alt+↑/↓` | Move line | `Ctrl+D` | Duplicate line |
| `Ctrl+Shift+K` | Delete line | `Ctrl+Enter` | Insert line below |
| `Ctrl+Alt+↑/↓` | Add cursor | `Ctrl+Shift+[/]` | Promote/demote heading |
| `Ctrl+]/[` | List indent/dedent | `Ctrl+Shift+T` | Insert table |
| `Tab` | Table nav / Snippet | `Enter` | Smart continuation |

### Advanced

| Shortcut | Action | Shortcut | Action |
|:--------:|--------|:--------:|--------|
| `Ctrl+1~4` | Fold to heading level | `Ctrl+Shift+1` | Unfold all |
| `Ctrl+Shift+U/L` | UPPER / lower | `Ctrl+Alt+T` | Title Case |
| `F5~F8` | Sort/Rev/Uniq/Number | `F9` | Insert TOC |
| `Ctrl+F2` | Toggle bookmark | `F2/Shift+F2` | Next/Prev bookmark |
| `Ctrl+Shift+F` | Format table | `Ctrl+Shift+S` | Doc statistics |

### View

| Shortcut | Action | Shortcut | Action |
|:--------:|--------|:--------:|--------|
| `Ctrl+=/-` | Zoom in/out | `Ctrl+0` | Reset zoom |
| `Ctrl+Shift+O` | Outline panel | `F11` | Zen mode |
| `Ctrl+Shift+P` | Command palette | `Ctrl+Shift+/` | Shortcut reference |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9

### Development

```bash
git clone https://github.com/gao972609504/markflow.git
cd markflow
npm install

npm run dev          # Dev mode (hot reload)
npm run build        # Production build
npm run preview      # Preview build output
```

### Packaging

```bash
npm run build:win    # Windows (NSIS + Portable)
npm run build:mac    # macOS (DMG)
npm run build:linux  # Linux (AppImage)
```

---

## 🏗️ Architecture

<table>
<tr>
<th>Tech</th><th>Version</th><th>Purpose</th>
</tr>
<tr><td><a href="https://www.electronjs.org/">Electron</a></td><td align="center">33</td><td>Cross-platform desktop framework</td></tr>
<tr><td><a href="https://react.dev/">React</a></td><td align="center">18</td><td>UI rendering layer</td></tr>
<tr><td><a href="https://codemirror.net/">CodeMirror 6</a></td><td align="center">6</td><td>Core editor engine</td></tr>
<tr><td><a href="https://zustand-demo.pmnd.rs/">Zustand</a></td><td align="center">4</td><td>Lightweight state management</td></tr>
<tr><td><a href="https://katex.org/">KaTeX</a></td><td align="center">0.16</td><td>Math formula rendering</td></tr>
<tr><td><a href="https://highlightjs.org/">highlight.js</a></td><td align="center">11</td><td>Code syntax highlighting</td></tr>
<tr><td><a href="https://github.com/markdown-it/markdown-it">markdown-it</a></td><td align="center">14</td><td>Markdown parsing</td></tr>
</table>

### How It Works

> [!TIP]
> MarkFlow doesn't use a split-pane approach. It renders Markdown **directly in the editor** via CodeMirror 6's Decoration system.

```
buildDecorations()
  ├── Line Decoration  → Heading levels, code block backgrounds, blockquote borders
  ├── Mark Decoration  → Bold/italic/code styles + syntax marker hiding
  └── Widget Decoration → Image preview, checkboxes, math formulas
```

- **Cursor-aware** — Only the active line shows raw syntax; other lines render rich text
- **Viewport-optimized** — Decorations computed only for visible lines
- **Lazy loading** — highlight.js registers languages on demand (36% bundle reduction)

---

## 🗺️ Roadmap

**Done ✅**

- [x] Live rendering Markdown editor
- [x] Interactive tables with visual editing
- [x] Code block syntax highlighting (20+ languages)
- [x] KaTeX math formulas
- [x] File tree, multi-tab, drag reorder
- [x] Callout / Admonition blocks (18 types)
- [x] Global search + Quick open + Command palette
- [x] Outline + Bookmarks + Tag panel
- [x] Focus / Typewriter / Zen mode
- [x] Auto-save + Session restore
- [x] Pomodoro timer + Word goal + TTS
- [x] Multi-cursor + Code folding + Snippets

**In Progress 🔧**

- [ ] Export PDF / HTML
- [ ] Custom theme editor
- [ ] Image upload to hosting

**Planned 📋**

- [ ] Vim mode
- [ ] Multi-language UI (i18n)
- [ ] Collaborative editing (CRDT)
- [ ] Plugin system

---

## 🤝 Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

1. Fork → 2. Create branch → 3. Submit PR

```bash
git checkout -b feature/amazing-feature
git commit -m 'feat: add amazing feature'
git push origin feature/amazing-feature
```

---

## 🙏 Acknowledgments

- [CodeMirror 6](https://codemirror.net/) — Powerful code editor framework
- [Electron](https://www.electronjs.org/) — Cross-platform desktop app framework
- [React](https://react.dev/) — UI rendering framework
- [KaTeX](https://katex.org/) — Fast math formula rendering
- [highlight.js](https://highlightjs.org/) — Code syntax highlighting
- [markdown-it](https://github.com/markdown-it/markdown-it) — Markdown parser
- Inspired by: [Typora](https://typora.io/) — The gold standard for Markdown writing experience

---

## 📄 License

[MIT License](LICENSE) © 2024-2026 MarkFlow Contributors

<div align="center">

**MarkFlow** — Making Markdown writing more immersive ✨

[⬆ Back to top](#-markflow)

</div>

</div>
