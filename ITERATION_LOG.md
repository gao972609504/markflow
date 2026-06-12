# MarkFlow 迭代日志

> 记录每次迭代的特性、核心改动和技术点，防止重复开发。

| 迭代 | 特性名称 | 核心改动 | 状态 |
|------|---------|---------|------|
| 1 | Slash Commands 斜杠命令快速插入 | 新增 `slashCommand.ts` 插件，接入 Editor.tsx，添加面板样式 | ✅ |
| 2 | Mermaid 图表实时渲染 | MermaidWidget + decorations 集成，mermaid 异步加载 | ✅ |

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
