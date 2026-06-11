# MarkFlow 迭代日志

**项目**: MarkFlow — 轻量美观的 Markdown 编辑器
**技术栈**: Electron + React + CodeMirror 6 + Zustand + TypeScript
**启动日期**: 2026-06-11
**当前进度**: 20/100

---

## 迭代记录

### Iteration 1/100 — 文档大纲面板
- 实时解析标题层级，可点击导航树，快捷键 Ctrl+Shift+O

### Iteration 2/100 — 增强状态栏
- 光标位置(Ln/Col)、阅读时间、段落数统计

### Iteration 3/100 — 自动保存
- 防抖写入 + 状态指示器(保存中/已保存)

### Iteration 4/100 — 阅读进度条
- 编辑器顶部渐变色滚动进度条

### Iteration 5/100 — 文件树搜索过滤
- 侧边栏实时搜索匹配文件，自动展开目录

### Iteration 6/100 — 快速打开 (Ctrl+P)
- 模糊搜索工作区文件，键盘导航

### Iteration 7/100 — 命令面板 (Ctrl+Shift+P)
- 可搜索命令列表，分类显示

### Iteration 8/100 — 字体缩放
- Ctrl++/- 调整编辑器字体，Ctrl+0 重置，localStorage 持久化

### Iteration 9/100 — 标签页右键菜单
- 关闭其他/关闭右侧/关闭全部/复制路径/复制文件名

### Iteration 10/100 — 会话持久化
- 重启后恢复标签页、活动标签和工作区

### Iteration 11/100 — [TOC] 目录标记
- 输入 [TOC] 自动渲染为文档内嵌目录

### Iteration 12/100 — Emoji 短代码渲染
- :smile: → 😊，支持 200+ 短代码映射

### Iteration 13/100 — Admonition/Callout 提示框
- :::tip/warning/danger 等提示块渲染（10种类型）

### Iteration 14/100 — 脚注渲染
- [^1] 脚注引用上标渲染 + 定义行样式

### Iteration 15/100 — 行操作快捷键
- Alt+↑↓移动行 / Ctrl+D复制行 / Ctrl+Shift+K删除行 / Ctrl+Enter插入行

### Iteration 16/100 — Wiki 双链
- [[页面名]] 和 [[页面|显示名]] 渲染为样式链接

### Iteration 17/100 — 跳转到行 (Ctrl+G)
- 输入行号快速定位

### Iteration 18/100 — Markdown 快捷插入工具栏
- 表格/代码块/公式/分割线等16种元素一键插入

### Iteration 19/100 — 标题自动编号
- 层级编号 (1.1.1) 显示，状态栏开关

### Iteration 20/100 — YAML Front Matter 渲染
- 文档顶部 --- 元数据块样式，key/value 高亮
