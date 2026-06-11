/**
 * 快捷键参考面板 (Ctrl+Shift+/)
 * — 展示所有可用快捷键，支持搜索
 */
import React, { useState, useRef, useEffect } from 'react'
import { useEditorStore } from '../store/editorStore'

interface Shortcut {
  keys: string
  action: string
  category: string
}

const shortcuts: Shortcut[] = [
  // 文件
  { keys: 'Ctrl+N', action: '新建文件', category: '文件' },
  { keys: 'Ctrl+O', action: '打开文件', category: '文件' },
  { keys: 'Ctrl+S', action: '保存文件', category: '文件' },
  { keys: 'Ctrl+Shift+S', action: '文档统计', category: '文件' },
  // 编辑
  { keys: 'Ctrl+Z', action: '撤销', category: '编辑' },
  { keys: 'Ctrl+Shift+Z', action: '重做', category: '编辑' },
  { keys: 'Ctrl+X', action: '剪切', category: '编辑' },
  { keys: 'Ctrl+C', action: '复制', category: '编辑' },
  { keys: 'Ctrl+V', action: '粘贴', category: '编辑' },
  { keys: 'Ctrl+H', action: '查找替换', category: '编辑' },
  { keys: 'Ctrl+B', action: '加粗 (**text**)', category: '格式' },
  { keys: 'Ctrl+I', action: '斜体 (*text*)', category: '格式' },
  { keys: 'Ctrl+`', action: '行内代码 (`code`)', category: '格式' },
  { keys: 'Ctrl+Shift+X', action: '删除线 (~~text~~)', category: '格式' },
  // 行操作
  { keys: 'Alt+↑', action: '上移当前行', category: '行操作' },
  { keys: 'Alt+↓', action: '下移当前行', category: '行操作' },
  { keys: 'Ctrl+D', action: '复制当前行', category: '行操作' },
  { keys: 'Ctrl+Shift+K', action: '删除当前行', category: '行操作' },
  { keys: 'Ctrl+Enter', action: '在下方插入空行', category: '行操作' },
  { keys: 'Ctrl+Shift+Enter', action: '在上方插入空行', category: '行操作' },
  // 导航
  { keys: 'Ctrl+P', action: '快速打开文件', category: '导航' },
  { keys: 'Ctrl+Shift+P', action: '命令面板', category: '导航' },
  { keys: 'Ctrl+G', action: '跳转到指定行', category: '导航' },
  { keys: 'Ctrl+Shift+O', action: '切换大纲面板', category: '导航' },
  // 视图
  { keys: 'Ctrl++', action: '增大字体', category: '视图' },
  { keys: 'Ctrl+-', action: '缩小字体', category: '视图' },
  { keys: 'Ctrl+0', action: '重置字体大小', category: '视图' },
  { keys: 'Ctrl+Shift+/', action: '快捷键参考', category: '视图' },
  { keys: 'F11', action: '禅模式（无干扰写作）', category: '视图' },
  { keys: 'Escape', action: '关闭弹窗/面板', category: '通用' },
]

export function ShortcutReference() {
  const { showShortcuts, setShowShortcuts } = useEditorStore()
  const [query, setQuery] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [showShortcuts])

  const results = query.trim()
    ? shortcuts.filter(s =>
        s.action.toLowerCase().includes(query.toLowerCase()) ||
        s.keys.toLowerCase().includes(query.toLowerCase()) ||
        s.category.toLowerCase().includes(query.toLowerCase())
      )
    : shortcuts

  useEffect(() => { setSelectedIdx(0) }, [query])

  if (!showShortcuts) return null

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { setShowShortcuts(false); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter') { setShowShortcuts(false) }
  }

  // 按 category 分组
  const grouped: Record<string, Shortcut[]> = {}
  for (const s of results) {
    if (!grouped[s.category]) grouped[s.category] = []
    grouped[s.category].push(s)
  }

  return (
    <div className="quick-open-overlay" onClick={() => setShowShortcuts(false)}>
      <div className="quick-open-modal" style={{ width: '560px' }} onClick={e => e.stopPropagation()}>
        <div className="quick-open-input-wrap">
          <span className="quick-open-icon">⌨️</span>
          <input
            ref={inputRef}
            type="text"
            placeholder="搜索快捷键..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="quick-open-input"
          />
        </div>
        <div className="quick-open-results" style={{ maxHeight: '380px' }}>
          {Object.entries(grouped).map(([cat, items]) => (
            <React.Fragment key={cat}>
              <div className="shortcut-category">{cat}</div>
              {items.map((s, i) => (
                <div key={`${s.keys}-${i}`} className="shortcut-row">
                  <span className="shortcut-action">{s.action}</span>
                  <kbd className="shortcut-keys">{s.keys}</kbd>
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  )
}
