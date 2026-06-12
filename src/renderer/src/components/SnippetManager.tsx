/**
 * 自定义代码片段管理器
 *
 * 用户可以创建、编辑、删除自定义 snippet。
 * 输入触发词按 Tab 即可展开。
 * 数据持久化到 localStorage。
 */
import { useState, useEffect, useCallback } from 'react'
import { useEditorStore } from '../store/editorStore'

export interface SnippetEntry {
  id: string
  trigger: string
  expansion: string
  description: string
}

const STORAGE_KEY = 'markflow-custom-snippets'

export function loadCustomSnippets(): SnippetEntry[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch { return [] }
}

function saveCustomSnippets(snippets: SnippetEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snippets))
  } catch { /* noop */ }
}

export function SnippetManager() {
  const { showSnippetManager, setShowSnippetManager } = useEditorStore()
  const [snippets, setSnippets] = useState<SnippetEntry[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [trigger, setTrigger] = useState('')
  const [expansion, setExpansion] = useState('')
  const [description, setDescription] = useState('')
  const [filter, setFilter] = useState('')

  useEffect(() => {
    if (showSnippetManager) {
      setSnippets(loadCustomSnippets())
      setEditingId(null)
      setTrigger('')
      setExpansion('')
      setDescription('')
      setFilter('')
    }
  }, [showSnippetManager])

  const resetForm = useCallback(() => {
    setEditingId(null)
    setTrigger('')
    setExpansion('')
    setDescription('')
  }, [])

  const saveSnippet = useCallback(() => {
    if (!trigger.trim() || !expansion.trim()) return
    const updated = [...snippets]
    if (editingId) {
      const idx = updated.findIndex(s => s.id === editingId)
      if (idx >= 0) {
        updated[idx] = { id: editingId, trigger: trigger.trim(), expansion, description: description.trim() }
      }
    } else {
      // 检查 trigger 是否重复
      if (updated.some(s => s.trigger === trigger.trim())) {
        alert(`触发词 "${trigger.trim()}" 已存在，请使用其他名称`)
        return
      }
      updated.push({
        id: Date.now().toString(36),
        trigger: trigger.trim(),
        expansion,
        description: description.trim(),
      })
    }
    setSnippets(updated)
    saveCustomSnippets(updated)
    resetForm()
  }, [trigger, expansion, description, editingId, snippets, resetForm])

  const deleteSnippet = useCallback((id: string) => {
    const updated = snippets.filter(s => s.id !== id)
    setSnippets(updated)
    saveCustomSnippets(updated)
    if (editingId === id) resetForm()
  }, [snippets, editingId, resetForm])

  const editSnippet = useCallback((entry: SnippetEntry) => {
    setEditingId(entry.id)
    setTrigger(entry.trigger)
    setExpansion(entry.expansion)
    setDescription(entry.description)
  }, [])

  if (!showSnippetManager) return null

  const filtered = filter
    ? snippets.filter(s =>
        s.trigger.toLowerCase().includes(filter.toLowerCase()) ||
        s.description.toLowerCase().includes(filter.toLowerCase()) ||
        s.expansion.toLowerCase().includes(filter.toLowerCase())
      )
    : snippets

  return (
    <div className="snippet-overlay" onClick={() => setShowSnippetManager(false)}>
      <div className="snippet-modal" onClick={e => e.stopPropagation()}>
        {/* ── 头部 ── */}
        <div className="snippet-header">
          <h3>📝 代码片段管理</h3>
          <button className="snippet-close" onClick={() => setShowSnippetManager(false)}>×</button>
        </div>

        <div className="snippet-body">
          {/* ── 左侧：片段列表 ── */}
          <div className="snippet-list-panel">
            <input
              className="snippet-filter"
              type="text"
              placeholder="搜索片段..."
              value={filter}
              onChange={e => setFilter(e.target.value)}
            />
            <div className="snippet-list">
              {filtered.length === 0 ? (
                <div className="snippet-empty">
                  <div className="snippet-empty-icon">📋</div>
                  <p>{filter ? '无匹配片段' : '暂无自定义片段'}</p>
                  {!filter && <p className="snippet-empty-hint">在右侧添加新片段</p>}
                </div>
              ) : (
                filtered.map(s => (
                  <div
                    key={s.id}
                    className={`snippet-item ${editingId === s.id ? 'snippet-item-active' : ''}`}
                    onClick={() => editSnippet(s)}
                  >
                    <div className="snippet-item-trigger">
                      <kbd>{s.trigger}</kbd>
                      <span className="snippet-item-tab">Tab</span>
                    </div>
                    {s.description && <div className="snippet-item-desc">{s.description}</div>}
                    <div className="snippet-item-preview">{s.expansion.slice(0, 80)}{s.expansion.length > 80 ? '...' : ''}</div>
                    <div className="snippet-item-actions">
                      <button
                        className="snippet-item-btn"
                        onClick={(e) => { e.stopPropagation(); editSnippet(s) }}
                        title="编辑"
                      >✏️</button>
                      <button
                        className="snippet-item-btn snippet-item-btn-danger"
                        onClick={(e) => { e.stopPropagation(); deleteSnippet(s.id) }}
                        title="删除"
                      >🗑</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ── 右侧：编辑区 ── */}
          <div className="snippet-editor-panel">
            <div className="snippet-editor-title">
              {editingId ? '编辑片段' : '新建片段'}
            </div>

            <label className="snippet-label">
              触发词 <span className="snippet-hint">（输入后按 Tab 展开）</span>
            </label>
            <input
              className="snippet-input"
              type="text"
              placeholder="例如: sign, addr, todo"
              value={trigger}
              onChange={e => setTrigger(e.target.value.replace(/\s/g, ''))}
              disabled={!!editingId}
            />

            <label className="snippet-label">
              描述 <span className="snippet-hint">（可选）</span>
            </label>
            <input
              className="snippet-input"
              type="text"
              placeholder="片段用途说明"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />

            <label className="snippet-label">
              展开内容
            </label>
            <textarea
              className="snippet-textarea"
              placeholder="输入展开后的文本内容..."
              value={expansion}
              onChange={e => setExpansion(e.target.value)}
              rows={8}
            />

            <div className="snippet-editor-actions">
              <button
                className="snippet-btn snippet-btn-primary"
                onClick={saveSnippet}
                disabled={!trigger.trim() || !expansion.trim()}
              >
                {editingId ? '保存修改' : '添加片段'}
              </button>
              {editingId && (
                <button className="snippet-btn" onClick={resetForm}>
                  取消编辑
                </button>
              )}
            </div>

            <div className="snippet-tips">
              <p>💡 <strong>使用方法：</strong>在编辑器中输入触发词，然后按 <kbd>Tab</kbd> 键展开</p>
              <p>💡 支持多行内容，例如签名、模板段落等</p>
              <p>💡 系统内置片段: <kbd>h1</kbd>~<kbd>h6</kbd>, <kbd>bold</kbd>, <kbd>italic</kbd>, <kbd>date</kbd>, <kbd>time</kbd> 等</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
