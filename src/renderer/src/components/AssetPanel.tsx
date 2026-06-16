/**
 * 资源与引用管理面板 (Asset & Reference Manager)
 * — 扫描全文的图片、外链、WikiLink、脚注引用，分类汇总
 * — 点击跳转行、复制地址，辅助长文档资源核查
 * — 灵感来自 Notion/Obsidian 的反向资源管理
 */
import { useMemo, useState } from 'react'
import { EditorView } from '@codemirror/view'
import { useEditorStore } from '../store/editorStore'
import { getEditorView } from '../plugins/widgets'

type Kind = 'image' | 'link' | 'wiki' | 'footnote'
interface RefItem { kind: Kind; label: string; target: string; line: number }

const KIND_META: Record<Kind, { icon: string; name: string }> = {
  image: { icon: '🖼', name: '图片' },
  link: { icon: '🔗', name: '链接' },
  wiki: { icon: '🗂', name: '双链' },
  footnote: { icon: 'ⁱ', name: '脚注' },
}

export function AssetPanel() {
  const { tabs, activeTabId, showAssetPanel, setShowAssetPanel } = useEditorStore()
  const activeTab = tabs.find(t => t.id === activeTabId)
  const [filter, setFilter] = useState<Kind | 'all'>('all')

  const items = useMemo<RefItem[]>(() => {
    if (!activeTab?.content) return []
    const out: RefItem[] = []
    const lines = activeTab.content.split('\n')
    lines.forEach((text, i) => {
      let m: RegExpExecArray | null
      const imgRe = /!\[([^\]]*)\]\(([^)]+)\)/g
      while ((m = imgRe.exec(text))) out.push({ kind: 'image', label: m[1] || m[2], target: m[2], line: i })
      const linkRe = /(?<!!)\[([^\]]+)\]\(([^)]+)\)/g
      while ((m = linkRe.exec(text))) out.push({ kind: 'link', label: m[1], target: m[2], line: i })
      const wikiRe = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g
      while ((m = wikiRe.exec(text))) out.push({ kind: 'wiki', label: m[2] || m[1], target: m[1], line: i })
      const fnRe = /\[\^([^\]]+)\]/g
      while ((m = fnRe.exec(text))) out.push({ kind: 'footnote', label: m[1], target: m[1], line: i })
    })
    return out
  }, [activeTab?.content])

  if (!showAssetPanel) return null

  const counts: Record<string, number> = { image: 0, link: 0, wiki: 0, footnote: 0 }
  items.forEach(it => { counts[it.kind]++ })

  const filtered = filter === 'all' ? items : items.filter(it => it.kind === filter)

  const jumpTo = (line: number) => {
    const el = document.querySelector('.cm-editor')
    const view = el ? getEditorView(el as HTMLElement) : null
    if (!view) return
    const info = view.state.doc.line(line + 1)
    view.dispatch({ selection: { anchor: info.from }, effects: EditorView.scrollIntoView(info.from) })
    view.focus()
  }

  const copy = (text: string) => { navigator.clipboard?.writeText(text).catch(() => {}) }

  return (
    <div className="asset-panel">
      <div className="asset-header">
        <span>资源与引用</span>
        <button className="asset-close" onClick={() => setShowAssetPanel(false)}>×</button>
      </div>
      <div className="asset-filters">
        <button className={`asset-filter${filter === 'all' ? ' active' : ''}`} onClick={() => setFilter('all')}>全部 {items.length}</button>
        {(Object.keys(KIND_META) as Kind[]).map(k => (
          <button key={k} className={`asset-filter${filter === k ? ' active' : ''}`} onClick={() => setFilter(k)}>
            {KIND_META[k].icon} {KIND_META[k].name} {counts[k]}
          </button>
        ))}
      </div>
      <div className="asset-list">
        {filtered.length === 0 ? (
          <div className="asset-empty">未找到资源</div>
        ) : (
          filtered.map((it, idx) => (
            <div key={idx} className="asset-row" onClick={() => jumpTo(it.line)}>
              <span className="asset-row-icon">{KIND_META[it.kind].icon}</span>
              <span className="asset-row-label" title={it.target}>{it.label}</span>
              <button className="asset-row-copy" onClick={(e) => { e.stopPropagation(); copy(it.target) }} title="复制地址">⧉</button>
              <span className="asset-row-line">L{it.line + 1}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
