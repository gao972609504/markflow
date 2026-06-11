/**
 * 标签面板
 * — 提取当前文档中的 #tag 标签，显示标签云
 */
import React, { useMemo } from 'react'
import { useEditorStore } from '../store/editorStore'

export function TagPanel() {
  const { tabs, activeTabId, tagPanelVisible } = useEditorStore()
  const activeTab = tabs.find((t) => t.id === activeTabId)

  const tags = useMemo(() => {
    if (!activeTab) return []
    const tagMap = new Map<string, number>()
    const tagRe = /(?:^|\s)#([a-zA-Z一-鿿][\w一-鿿-]*)/g
    let m: RegExpExecArray | null
    const content = activeTab.content
    while ((m = tagRe.exec(content))) {
      // 排除标题行
      const lineStart = content.lastIndexOf('\n', m.index) + 1
      const lineText = content.slice(lineStart, lineStart + 10)
      if (/^#{1,6}\s/.test(lineText)) continue
      const tag = m[1]
      tagMap.set(tag, (tagMap.get(tag) || 0) + 1)
    }
    return Array.from(tagMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }))
  }, [activeTab?.content])

  if (!tagPanelVisible) return null

  return (
    <div className="tag-panel">
      <div className="tag-panel-header">
        <span>标签</span>
        <button className="outline-close-btn" onClick={() => useEditorStore.getState().toggleTagPanel()}>×</button>
      </div>
      <div className="tag-panel-content">
        {tags.length === 0 ? (
          <div className="tag-panel-empty">文档中暂无标签</div>
        ) : (
          <div className="tag-cloud">
            {tags.map(tag => (
              <span key={tag.name} className="tag-item" title={`${tag.name}: ${tag.count} 次`}>
                #{tag.name}
                {tag.count > 1 && <span className="tag-count">{tag.count}</span>}
              </span>
            ))}
          </div>
        )}
        <div className="tag-panel-hint">💡 在文档中使用 #标签名 添加标签</div>
      </div>
    </div>
  )
}
