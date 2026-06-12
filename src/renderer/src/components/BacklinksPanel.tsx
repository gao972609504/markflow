/**
 * 反向链接面板 (Backlinks Panel)
 * — 显示哪些文档链接到了当前文档
 *
 * 特性：
 * - 扫描所有已打开的标签，查找指向当前文档的 WikiLinks
 * - 基于文件树扫描整个工作区的反向链接
 * - 显示链接文本和上下文
 * - 支持点击跳转
 */
import React, { useMemo } from 'react'
import { useEditorStore } from '../store/editorStore'

interface Backlink {
  tabId: string
  tabTitle: string
  filePath: string | null
  line: number
  context: string
  linkTarget: string
}

function getCurrentTabTitle(store: { tabs: { id: string; title: string; filePath: string | null }[]; activeTabId: string | null }) {
  const activeTab = store.tabs.find(t => t.id === store.activeTabId)
  if (!activeTab) return null
  return { title: activeTab.title, filePath: activeTab.filePath }
}

function extractBacklinks(tabs: { id: string; title: string; filePath: string | null; content: string }[], targetTitle: string, targetPath: string | null): Backlink[] {
  const backlinks: Backlink[] = []
  const wikiRe = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g

  for (const tab of tabs) {
    const lines = tab.content.split('\n')
    const matches: { line: number; match: RegExpExecArray }[] = []

    for (let i = 0; i < lines.length; i++) {
      let m: RegExpExecArray | null
      while ((m = wikiRe.exec(lines[i]))) {
        const linkTarget = m[1].trim()
        const baseName = targetTitle.replace(/\.(md|markdown|txt)$/i, '')
        const fullName = targetTitle

        // 匹配逻辑：链接目标等于当前文档文件名（不含扩展名）或完整文件名
        if (linkTarget === baseName || linkTarget === fullName || linkTarget === (targetPath?.split(/[/\\]/).pop() || fullName)) {
          // 找到第一个不重复的
          const isDuplicate = matches.some(prev => prev.line === i + 1)
          if (!isDuplicate) {
            matches.push({ line: i + 1, match: m })
          }
        }
      }
      wikiRe.lastIndex = 0
    }

    for (const match of matches) {
      backlinks.push({
        tabId: tab.id,
        tabTitle: tab.title,
        filePath: tab.filePath,
        line: match.line,
        context: lines[match.line - 1].trim().slice(0, 120),
        linkTarget: match.match[1].trim()
      })
    }
  }

  return backlinks
}

export function BacklinksPanel() {
  const store = useEditorStore()
  const { tabs, activeTabId, backlinksVisible } = store
  const activeTab = tabs.find(t => t.id === activeTabId)

  const backlinks = useMemo<Backlink[]>(() => {
    if (!activeTab) return []
    const targetTitle = activeTab.title
    const targetPath = activeTab.filePath
    // 排除当前标签，扫描其他标签
    const otherTabs = tabs.filter(t => t.id !== activeTabId)
    return extractBacklinks(otherTabs, targetTitle, targetPath)
  }, [tabs, activeTab, activeTabId])

  const wikilinkCount = useMemo(() => {
    if (!activeTab) return 0
    const wikiRe = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g
    const matches = activeTab.content.match(wikiRe)
    return matches ? matches.length : 0
  }, [activeTab?.content])

  if (!backlinksVisible) return null

  const handleClick = (backlink: Backlink) => {
    const store = useEditorStore.getState()
    store.setActiveTab(backlink.tabId)
  }

  return (
    <div className="backlinks-panel">
      <div className="backlinks-panel-header">
        <div className="backlinks-title">
          <span>反向链接</span>
          <span className="backlinks-count">{backlinks.length}</span>
        </div>
        <button
          className="backlinks-close-btn"
          onClick={() => useEditorStore.getState().setShowBacklinks(false)}
          title="关闭反向链接面板"
        >
          ×
        </button>
      </div>
      <div className="backlinks-panel-content">
        {backlinks.length === 0 ? (
          <div className="backlinks-empty">
            <div className="backlinks-empty-icon">🔗</div>
            <p>暂无反向链接</p>
            <span className="backlinks-empty-hint">
              使用 {wikilinkCount > 0 ? '当前文档已有' : '[[文档名]]'} 创建链接后，
              <br />其他文档引用当前文档时
              <br />
              会在此处显示
            </span>
          </div>
        ) : (
          <div className="backlinks-list">
            {backlinks.map((link, idx) => (
              <div
                key={`${link.tabId}-${link.line}-${idx}`}
                className="backlinks-item"
                onClick={() => handleClick(link)}
              >
                <div className="backlinks-item-source">
                  <span className="backlinks-item-file">{link.tabTitle}</span>
                  {link.filePath && (
                    <span className="backlinks-item-path">
                      {link.filePath.split(/[/\\]/).slice(-2, -1).pop() || ''}
                    </span>
                  )}
                </div>
                <div className="backlinks-item-context">
                  <span className="backlinks-item-line">行 {link.line}</span>
                  <span className="backlinks-item-text" dangerouslySetInnerHTML={{
                    __html: link.context.replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, '<mark>[[S1]]</mark>')
                  }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
