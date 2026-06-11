<div align="center">

<img src="logo.jpg" alt="MarkFlow Logo" width="120" height="120" />

# ✨ MarkFlow

**轻量美观的类 Typora Markdown 所见即所得编辑器**

A lightweight, beautiful Typora-like Markdown editor with live rendering

基于 Electron + React + CodeMirror 6 构建 | Built with Electron + React + CodeMirror 6

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Electron](https://img.shields.io/badge/Electron-33-blue?logo=electron)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-18-61dafb?logo=react)](https://react.dev/)
[![CodeMirror](https://img.shields.io/badge/CodeMirror-6-orange?logo=codemirror)](https://codemirror.net/)

[English](#-english) · [功能特性](#-功能特性) · [快速开始](#-快速开始) · [技术架构](#-技术架构) · [快捷键](#-快捷键)

</div>

---

## 📸 截图预览

> 🖼️ MarkFlow 提供类 Typora 的沉浸式 Markdown 写作体验
>
> *截图即将添加 — 欢迎 PR 提供应用截图*
>
> *Screenshots coming soon — PRs welcome for app screenshots*

---

## 🌟 为什么选择 MarkFlow

| 特性 | MarkFlow | Typora | VS Code | Obsidian |
|------|----------|--------|---------|----------|
| 所见即所得编辑 | ✅ 实时渲染 | ✅ 实时渲染 | ❌ 分屏预览 | ⚠️ 所见即所得/源码 |
| 开源免费 | ✅ MIT | ❌ 付费 | ✅ MIT | ✅ 部分开源 |
| 跨平台 | ✅ Win/Mac/Linux | ✅ | ✅ | ✅ |
| 安装体积 | 🪶 轻量 | 🪶 轻量 | 📦 较重 | 📦 中等 |
| 插件生态 | 🔧 开发中 | ❌ | ✅ 丰富 | ✅ 丰富 |
| 交互式表格 | ✅ 可视化编辑 | ✅ | ❌ | ⚠️ |
| 数学公式 | ✅ KaTeX | ✅ MathJax | ⚠️ 需插件 | ✅ |
| 本地离线使用 | ✅ | ✅ | ✅ | ✅ |

---

## 🌟 功能特性

### 📝 所见即所得编辑

MarkFlow 的核心是 CodeMirror 6 驱动的实时渲染编辑器，在编辑的同时即可看到渲染效果：

- **标题** — H1 到 H6 层级分明，字号和间距精细调整
- **加粗 / 斜体 / 删除线** — 语法标记在非光标行自动隐藏，光标所在行完整显示
- **行内代码** — 圆角背景高亮，等宽字体渲染
- **链接** — 蓝色可点击样式，hover 时下划线
- **图片** — 行内预览，支持拖拽打开 `.md` 文件

### 📊 交互式表格

基于 `@markwhen/codemirror-tables`（源自 Joplin 编辑器）实现：

- Markdown 表格自动渲染为可视化 HTML 表格
- **点击单元格** 即可编辑，内嵌 CodeMirror 编辑器
- **浮动工具栏** — 插入/删除行列、对齐方式、格式化
- **键盘导航** — `Tab` / `Shift+Tab` / `Enter` / 方向键在单元格间移动
- 支持单元格内 Markdown 格式（加粗、斜体、代码、链接等）

### 💻 代码块

- 围栏代码块自动检测，语言标签右上角显示
- 等宽字体 + 左侧彩色边框 + 圆角背景
- 支持 **20+ 种常用编程语言** 的语法高亮（JavaScript、TypeScript、Python、Go、Rust、Java、C/C++、SQL、Bash、YAML 等）

```javascript
// MarkFlow 中输入 ```javascript 即可触发代码块渲染
function fibonacci(n) {
  if (n <= 1) return n
  return fibonacci(n - 1) + fibonacci(n - 2)
}
```

### 🔢 数学公式

集成 KaTeX，支持行内和块级数学公式：

- 行内公式：`$E = mc^2$` → 渲染为科学公式
- 块级公式：
  ```
  $$
  \sum_{i=1}^{n} i = \frac{n(n+1)}{2}
  $$
  ```
- 公式错误时显示原始内容和错误提示

### ✅ 任务列表

- 复选框以原生 checkbox 控件渲染
- 点击即可切换 `[ ]` ↔ `[x]`，同步更新文档
- 已勾选项自动添加删除线 + 降低透明度

### 📂 文件管理

- **文件树** — 左侧栏展示文件夹结构，点击打开文件
- **多标签页** — 支持同时打开多个文件，标签页显示修改状态（● 标记）
- **拖拽打开** — 将 `.md` 文件拖入窗口即可打开
- **自动保存提示** — 文件修改后标签页标记已更改状态

### 🎨 主题系统

- **亮色 / 暗色** 双主题，GitHub 风格设计语言
- 主题偏好自动保存到 `localStorage`，重启保留
- 首次启动自动检测系统主题偏好（`prefers-color-scheme`）

### 🔍 查找替换

- `Ctrl+H` 打开查找替换面板
- 支持单个替换和全部替换

### 🎯 辅助模式

- **Focus 模式** — 只高亮当前光标附近 3 行，其余内容降低透明度，帮助集中注意力
- **Typewriter 模式** — 光标所在行始终保持在视窗居中位置，模拟打字机滚动体验

---

## 🚀 快速开始

### 环境要求

- **Node.js** ≥ 18
- **npm** ≥ 9

### 安装与运行

```bash
# 克隆仓库
git clone https://github.com/gao972609504/markflow.git
cd markflow

# 安装依赖
npm install

# 开发模式（热重载）
npm run dev

# 生产构建
npm run build

# 预览构建结果
npm run preview
```

### 开发模式

运行 `npm run dev` 后会自动启动 Electron 窗口，修改源代码后自动热重载。

### 打包分发

```bash
# 安装 electron-builder（首次需要）
npm install -D electron-builder

# 打包为当前平台安装包
npm run dist

# 仅 Windows
npm run build:win

# 仅 macOS
npm run build:mac

# 仅 Linux
npm run build:linux
```

Windows 打包会同时生成：
- **NSIS 安装程序**（`MarkFlow-Setup-x.x.x.exe`）— 可选安装目录的标准安装版
- **便携版**（`MarkFlow-Portable-x.x.x.exe`）— 免安装直接运行

---

## 🏗️ 技术架构

### 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| [Electron](https://www.electronjs.org/) | 33 | 桌面应用框架 |
| [React](https://react.dev/) | 18 | UI 渲染层 |
| [CodeMirror 6](https://codemirror.net/) | 6 | 核心编辑器引擎 |
| [Zustand](https://zustand-demo.pmnd.rs/) | 4 | 轻量状态管理 |
| [markdown-it](https://github.com/markdown-it/markdown-it) | 14 | Markdown 解析（预览模式） |
| [KaTeX](https://katex.org/) | 0.16 | 数学公式渲染 |
| [highlight.js](https://highlightjs.org/) | 11 | 代码语法高亮 |

### 项目结构

```
markflow/
├── src/
│   ├── main/                    # Electron 主进程
│   │   └── index.ts
│   ├── preload/                 # 预加载脚本（IPC 桥接）
│   │   └── index.ts
│   └── renderer/                # 渲染进程（React 应用）
│       ├── index.html
│       ├── main.tsx             # 入口
│       ├── App.tsx              # 主应用组件
│       ├── components/
│       │   ├── Editor.tsx       # 编辑器组件（~155 行，模块化）
│       │   ├── FileTree.tsx     # 文件树
│       │   ├── FindReplace.tsx  # 查找替换
│       │   ├── StatusBar.tsx    # 状态栏
│       │   └── TabBar.tsx       # 标签栏
│       ├── plugins/             # 编辑器插件模块
│       │   ├── decorations.ts   # 实时渲染装饰系统（标题/加粗/代码等）
│       │   ├── theme.ts         # GitHub 风格主题工厂
│       │   └── widgets.ts       # 自定义 Widget（图片预览/复选框）
│       ├── store/
│       │   └── editorStore.ts   # Zustand 全局状态
│       ├── styles/
│       │   ├── editor.css       # 编辑器补充样式（伪元素/表格 widget）
│       │   ├── global.css       # CSS 变量 + 全局样式
│       │   └── layout.css       # 布局样式
│       └── utils/
│           └── markdown.ts      # markdown-it 渲染器（预览模式）
├── resources/                   # 应用图标和资源
├── electron.vite.config.ts      # Electron-Vite 配置
├── package.json
└── tsconfig.json
```

### 核心设计

**实时渲染机制**

MarkFlow 不使用传统的"源码/预览"双栏模式，而是通过 CodeMirror 6 的 Decoration 系统**直接在编辑器中渲染 Markdown**：

1. **`plugins/decorations.ts`** — 核心装饰构建器 `buildDecorations()`，扫描文档逐行添加装饰：
   - 行级装饰（`Decoration.line`）— 标题层级、代码块背景、引用块左边框
   - 标记装饰（`Decoration.mark`）— 加粗、斜体、行内代码、链接样式 + 语法标记隐藏
   - Widget 装饰（`Decoration.widget`）— 图片行内预览、复选框控件

2. **光标感知** — 仅光标所在行显示原始 Markdown 语法，其余行隐藏语法标记、渲染富文本效果

3. **`@markwhen/codemirror-tables`** — 表格区域由独立扩展接管，渲染为交互式 HTML 表格 widget

**模块化架构**

Editor.tsx 从最初的 600+ 行单文件重构为模块化架构：

| 模块 | 职责 |
|------|------|
| `plugins/widgets.ts` | ImageWidget（图片预览）、CheckboxWidget（复选框交互） |
| `plugins/decorations.ts` | 装饰常量 + `buildDecorations()` + `inlineDeco()` |
| `plugins/theme.ts` | `createEditorTheme()` 主题工厂（亮色/暗色） |
| `Editor.tsx` | React 组件 + ViewPlugin + 键盘快捷键 + 工具函数 |

**性能优化**

- highlight.js **按需注册 20 种语言**，避免全量导入（包体积减少 36%）
- Markdown 预览渲染结果 **LRU 缓存**（上限 50 条），避免重复解析
- 代码块语言检测使用 `@codemirror/language-data`，按需加载

---

## ⌨️ 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+N` | 新建文件 |
| `Ctrl+O` | 打开文件 |
| `Ctrl+S` | 保存文件 |
| `Ctrl+B` | **加粗** |
| `Ctrl+I` | *斜体* |
| `` Ctrl+` `` | `行内代码` |
| `Ctrl+Shift+X` | ~~删除线~~ |
| `Ctrl+H` | 查找替换 |
| `Ctrl+/` | 快捷操作 |
| `Enter` | 智能续行（列表/引用/表格） |

**编辑器内自动续行：**

- 在列表行按 `Enter` 自动续接列表标记（`- ` / `1. `）
- 在任务列表行按 `Enter` 自动续接 `[ ] `
- 在引用行按 `Enter` 自动续接 `> `
- 空列表/引用行按 `Enter` 清除标记

---

## 🗺️ 路线图

- [x] 实时渲染 Markdown 编辑
- [x] 交互式表格
- [x] 代码块语法高亮
- [x] KaTeX 数学公式
- [x] 文件管理（文件树、多标签页）
- [ ] 🔜 撤销/重做增强（Undo Tree）
- [ ] 🔜 导出 PDF / HTML
- [ ] 🔜 大纲导航（TOC）
- [ ] 🔜 文档搜索（跨文件全文搜索）
- [ ] 图片上传（粘贴/拖拽上传到图床）
- [ ] 自定义主题编辑器
- [ ] Vim 模式支持
- [ ] 多语言界面（i18n）
- [ ] 拼写检查
- [ ] 协作编辑（CRDT）

---

## ❓ 常见问题

<details>
<summary><strong>MarkFlow 是免费的吗？</strong></summary>

是的，MarkFlow 完全免费开源，采用 MIT 许可证发布。你可以自由使用、修改和分发。
</details>

<details>
<summary><strong>MarkFlow 支持 Windows / macOS / Linux 吗？</strong></summary>

是的，MarkFlow 基于 Electron 构建，支持 Windows（安装版和便携版）、macOS（DMG）和 Linux（AppImage/deb）。
</details>

<details>
<summary><strong>MarkFlow 和 Typora 有什么区别？</strong></summary>

MarkFlow 的核心编辑体验与 Typora 类似（所见即所得），但 MarkFlow 是完全开源免费的。Typora 是优秀的商业软件，如果你需要稳定成熟的产品体验，推荐使用 Typora。MarkFlow 更适合想要定制、学习或参与开源贡献的用户。
</details>

<details>
<summary><strong>支持哪些 Markdown 扩展语法？</strong></summary>

支持表格、任务列表、数学公式（KaTeX）、围栏代码块（20+ 语言高亮）、删除线等。暂不支持 Mermaid 图表和脚注，这些在路线图中。
</details>

<details>
<summary><strong>如何打包分发？</strong></summary>

运行 `npm run dist` 即可生成当前平台的安装包。Windows 会同时生成 NSIS 安装版和便携版。详见 [快速开始 - 打包分发](#-快速开始)。
</details>

---

## 🤝 贡献

欢迎贡献！请阅读 [CONTRIBUTING.md](CONTRIBUTING.md) 了解详情。

1. Fork 本仓库
2. 创建功能分支：`git checkout -b feature/amazing-feature`
3. 提交更改：`git commit -m 'feat: add amazing feature'`
4. 推送分支：`git push origin feature/amazing-feature`
5. 提交 Pull Request

---

## 🙏 致谢

MarkFlow 的诞生离不开以下开源项目：

- [CodeMirror 6](https://codemirror.net/) — 强大的代码编辑器框架
- [Electron](https://www.electronjs.org/) — 跨平台桌面应用框架
- [React](https://react.dev/) — UI 渲染框架
- [@markwhen/codemirror-tables](https://github.com/markwhen/codemirror-tables) — 交互式表格扩展（源自 Joplin）
- [KaTeX](https://katex.org/) — 快速数学公式渲染
- [highlight.js](https://highlightjs.org/) — 代码语法高亮
- [markdown-it](https://github.com/markdown-it/markdown-it) — Markdown 解析器
- 灵感来源：[Typora](https://typora.io/) — 优秀的 Markdown 写作体验标杆

---

## 📄 许可证

[MIT License](LICENSE) © 2024-2026 MarkFlow Contributors

---

<div align="center">

**MarkFlow** — 让 Markdown 写作更沉浸 ✨

[⬆ 回到顶部](#-markflow)

</div>

---

---

<div id="-english">

<div align="center">

<img src="logo.jpg" alt="MarkFlow Logo" width="120" height="120" />

# ✨ MarkFlow

**A Lightweight, Beautiful Typora-like Markdown Editor with Live Rendering**

Built with Electron + React + CodeMirror 6

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Electron](https://img.shields.io/badge/Electron-33-blue?logo=electron)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-18-61dafb?logo=react)](https://react.dev/)
[![CodeMirror](https://img.shields.io/badge/CodeMirror-6-orange?logo=codemirror)](https://codemirror.net/)

[中文文档](#-功能特性) · [Features](#features) · [Quick Start](#quick-start) · [Architecture](#architecture) · [Shortcuts](#keyboard-shortcuts)

</div>

---

## 📸 Screenshots

> 🖼️ MarkFlow provides a Typora-like immersive Markdown writing experience
>
> *Screenshots coming soon — PRs welcome for app screenshots*

---

## 🌟 Why MarkFlow

| Feature | MarkFlow | Typora | VS Code | Obsidian |
|---------|----------|--------|---------|----------|
| Live Rendering | ✅ Live render | ✅ Live render | ❌ Split preview | ⚠️ Mixed |
| Free & Open Source | ✅ MIT | ❌ Paid | ✅ MIT | ✅ Partial |
| Cross-platform | ✅ Win/Mac/Linux | ✅ | ✅ | ✅ |
| Install Size | 🪶 Lightweight | 🪶 Lightweight | 📦 Heavy | 📦 Medium |
| Plugin Ecosystem | 🔧 In development | ❌ | ✅ Rich | ✅ Rich |
| Interactive Tables | ✅ Visual editing | ✅ | ❌ | ⚠️ |
| Math Formulas | ✅ KaTeX | ✅ MathJax | ⚠️ Plugin needed | ✅ |
| Offline Usage | ✅ | ✅ | ✅ | ✅ |

---

## Features

### 📝 Live Rendering

MarkFlow's core is a CodeMirror 6-powered editor — see rendered output as you type:

- **Headings** — H1 through H6 with scaled typography and refined spacing
- **Bold / Italic / Strikethrough** — Syntax markers auto-hide on non-cursor lines, fully visible on cursor line
- **Inline Code** — Rounded background highlight, monospace rendering
- **Links** — Blue clickable style, underline on hover
- **Images** — Inline preview, drag-and-drop `.md` file opening

### 📊 Interactive Tables

Built on `@markwhen/codemirror-tables` (from the Joplin editor):

- Markdown tables auto-render as visual HTML tables
- **Click a cell** to edit with an embedded CodeMirror editor
- **Floating toolbar** — Insert/delete rows & columns, alignment, formatting
- **Keyboard navigation** — `Tab` / `Shift+Tab` / `Enter` / Arrow keys between cells
- Supports Markdown formatting inside cells (bold, italic, code, links, etc.)

### 💻 Code Blocks

- Auto-detection of fenced code blocks, language badge in top-right corner
- Monospace font + colored left border + rounded background
- Syntax highlighting for **20+ programming languages** (JavaScript, TypeScript, Python, Go, Rust, Java, C/C++, SQL, Bash, YAML, etc.)

```javascript
// Type ```javascript in MarkFlow to trigger code block rendering
function fibonacci(n) {
  if (n <= 1) return n
  return fibonacci(n - 1) + fibonacci(n - 2)
}
```

### 🔢 Math Formulas

KaTeX integration for inline and block-level math:

- Inline: `$E = mc^2$` → rendered scientific formula
- Block:
  ```
  $$
  \sum_{i=1}^{n} i = \frac{n(n+1)}{2}
  $$
  ```
- Error display with raw content when formula parsing fails

### ✅ Task Lists

- Checkboxes rendered as native checkbox controls
- Click to toggle `[ ]` ↔ `[x]`, synced with document
- Completed items auto-strikethrough + reduced opacity

### 📂 File Management

- **File Tree** — Sidebar folder structure, click to open files
- **Multi-tab** — Open multiple files simultaneously, unsaved change indicators (●)
- **Drag & Drop** — Drop `.md` files into the window to open
- **Auto-save hint** — Tab shows changed state after file modification

### 🎨 Theme System

- **Light / Dark** dual themes with GitHub-style design language
- Theme preference auto-saved to `localStorage`, persists across restarts
- First launch auto-detects system theme preference (`prefers-color-scheme`)

### 🔍 Find & Replace

- `Ctrl+H` to open find & replace panel
- Single replace and replace all support

### 🎯 Focus Modes

- **Focus Mode** — Highlights only 3 lines around the cursor, dims everything else
- **Typewriter Mode** — Keeps the cursor line centered in the viewport

---

## Quick Start

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9

### Install & Run

```bash
# Clone the repository
git clone https://github.com/gao972609504/markflow.git
cd markflow

# Install dependencies
npm install

# Development mode (hot reload)
npm run dev

# Production build
npm run build

# Preview build output
npm run preview
```

### Packaging & Distribution

```bash
# Install electron-builder (first time only)
npm install -D electron-builder

# Package for current platform
npm run dist

# Windows only
npm run build:win

# macOS only
npm run build:mac

# Linux only
npm run build:linux
```

Windows packaging produces:
- **NSIS Installer** (`MarkFlow-Setup-x.x.x.exe`) — Standard installer with custom install directory
- **Portable** (`MarkFlow-Portable-x.x.x.exe`) — Run without installation

---

## Architecture

### Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| [Electron](https://www.electronjs.org/) | 33 | Desktop app framework |
| [React](https://react.dev/) | 18 | UI rendering layer |
| [CodeMirror 6](https://codemirror.net/) | 6 | Core editor engine |
| [Zustand](https://zustand-demo.pmnd.rs/) | 4 | Lightweight state management |
| [markdown-it](https://github.com/markdown-it/markdown-it) | 14 | Markdown parser (preview mode) |
| [KaTeX](https://katex.org/) | 0.16 | Math formula rendering |
| [highlight.js](https://highlightjs.org/) | 11 | Code syntax highlighting |

### Project Structure

```
markflow/
├── src/
│   ├── main/                    # Electron main process
│   │   └── index.ts
│   ├── preload/                 # Preload script (IPC bridge)
│   │   └── index.ts
│   └── renderer/                # Renderer process (React app)
│       ├── index.html
│       ├── main.tsx             # Entry point
│       ├── App.tsx              # Main app component
│       ├── components/
│       │   ├── Editor.tsx       # Editor component (~155 lines, modular)
│       │   ├── FileTree.tsx     # File tree
│       │   ├── FindReplace.tsx  # Find & replace
│       │   ├── StatusBar.tsx    # Status bar
│       │   └── TabBar.tsx       # Tab bar
│       ├── plugins/             # Editor plugin modules
│       │   ├── decorations.ts   # Live rendering decoration system
│       │   ├── theme.ts         # GitHub-style theme factory
│       │   └── widgets.ts       # Custom widgets (image preview, checkbox)
│       ├── store/
│       │   └── editorStore.ts   # Zustand global state
│       ├── styles/
│       │   ├── editor.css       # Editor supplementary styles
│       │   ├── global.css       # CSS variables + global styles
│       │   └── layout.css       # Layout styles
│       └── utils/
│           └── markdown.ts      # markdown-it renderer (preview mode)
├── resources/                   # App icons and assets
├── electron.vite.config.ts      # Electron-Vite config
├── package.json
└── tsconfig.json
```

### Core Design

**Live Rendering Mechanism**

MarkFlow doesn't use the traditional "source/preview" split-pane approach. Instead, it renders Markdown **directly in the editor** via CodeMirror 6's Decoration system:

1. **`plugins/decorations.ts`** — Core decoration builder `buildDecorations()`, scans the document line by line:
   - Line decorations (`Decoration.line`) — Heading levels, code block backgrounds, blockquote left borders
   - Mark decorations (`Decoration.mark`) — Bold, italic, inline code, link styles + syntax marker hiding
   - Widget decorations (`Decoration.widget`) — Image inline preview, checkbox controls

2. **Cursor-aware** — Only the cursor line shows raw Markdown syntax; other lines hide markers and render rich text

3. **`@markwhen/codemirror-tables`** — Table regions handled by a separate extension, rendered as interactive HTML table widgets

**Modular Architecture**

Editor.tsx was refactored from a 600+ line monolith into a modular architecture:

| Module | Responsibility |
|--------|---------------|
| `plugins/widgets.ts` | ImageWidget (image preview), CheckboxWidget (checkbox interaction) |
| `plugins/decorations.ts` | Decoration constants + `buildDecorations()` + `inlineDeco()` |
| `plugins/theme.ts` | `createEditorTheme()` theme factory (light/dark) |
| `Editor.tsx` | React component + ViewPlugin + keyboard shortcuts + utilities |

**Performance**

- highlight.js **on-demand registration of 20 languages**, avoiding full import (36% bundle reduction)
- Markdown preview results **LRU cached** (50 entries max), avoiding redundant parsing
- Code block language detection uses `@codemirror/language-data` for lazy loading

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | New file |
| `Ctrl+O` | Open file |
| `Ctrl+S` | Save file |
| `Ctrl+B` | **Bold** |
| `Ctrl+I` | *Italic* |
| `` Ctrl+` `` | `Inline code` |
| `Ctrl+Shift+X` | ~~Strikethrough~~ |
| `Ctrl+H` | Find & Replace |
| `Ctrl+/` | Quick actions |
| `Enter` | Smart continuation (lists/quotes/tables) |

**Auto-continuation:**

- Press `Enter` in a list to auto-continue list markers (`- ` / `1. `)
- Press `Enter` in a task list to auto-continue `[ ] `
- Press `Enter` in a blockquote to auto-continue `> `
- Press `Enter` on an empty list/quote to clear the marker

---

## Roadmap

- [x] Live rendering Markdown editing
- [x] Interactive tables
- [x] Code block syntax highlighting
- [x] KaTeX math formulas
- [x] File management (file tree, multi-tab)
- [ ] 🔜 Undo/Redo enhancement (Undo Tree)
- [ ] 🔜 Export PDF / HTML
- [ ] 🔜 Outline navigation (TOC)
- [ ] 🔜 Cross-file full-text search
- [ ] Image upload (paste/drag to image host)
- [ ] Custom theme editor
- [ ] Vim mode support
- [ ] Multi-language UI (i18n)
- [ ] Spell checking
- [ ] Collaborative editing (CRDT)

---

## ❓ FAQ

<details>
<summary><strong>Is MarkFlow free?</strong></summary>

Yes! MarkFlow is completely free and open source under the MIT license. You can freely use, modify, and distribute it.
</details>

<details>
<summary><strong>Does MarkFlow support Windows / macOS / Linux?</strong></summary>

Yes. MarkFlow is built on Electron and supports Windows (installer + portable), macOS (DMG), and Linux (AppImage/deb).
</details>

<details>
<summary><strong>How is MarkFlow different from Typora?</strong></summary>

MarkFlow's core editing experience is similar to Typora (live rendering), but MarkFlow is fully open source and free. Typora is an excellent commercial product — if you need a stable, mature experience, we recommend Typora. MarkFlow is ideal for users who want to customize, learn, or contribute to open source.
</details>

<details>
<summary><strong>What Markdown extensions are supported?</strong></summary>

Tables, task lists, math formulas (KaTeX), fenced code blocks (20+ language highlighting), and strikethrough. Mermaid diagrams and footnotes are not yet supported but are on the roadmap.
</details>

<details>
<summary><strong>How do I create a distributable package?</strong></summary>

Run `npm run dist` to generate an installer for your platform. On Windows, both NSIS installer and portable versions are produced. See [Quick Start - Packaging](#packaging--distribution) for details.
</details>

---

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details.

1. Fork this repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'feat: add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 🙏 Acknowledgments

MarkFlow is made possible by these open source projects:

- [CodeMirror 6](https://codemirror.net/) — Powerful code editor framework
- [Electron](https://www.electronjs.org/) — Cross-platform desktop app framework
- [React](https://react.dev/) — UI rendering framework
- [@markwhen/codemirror-tables](https://github.com/markwhen/codemirror-tables) — Interactive table extension (from Joplin)
- [KaTeX](https://katex.org/) — Fast math formula rendering
- [highlight.js](https://highlightjs.org/) — Code syntax highlighting
- [markdown-it](https://github.com/markdown-it/markdown-it) — Markdown parser
- Inspired by: [Typora](https://typora.io/) — The gold standard for Markdown writing experience

---

## 📄 License

[MIT License](LICENSE) © 2024-2026 MarkFlow Contributors

---

<div align="center">

**MarkFlow** — Making Markdown writing more immersive ✨

[⬆ Back to top](#-markflow)

</div>
