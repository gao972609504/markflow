/**
 * YAML Front Matter 编辑器
 * — 结构化编辑文档头部 --- 块的键值元信息（title/date/tags 等）
 * — 轻量解析：支持 key: value 与 key: [a, b] 数组，未知行原样保留
 */
import { useState, useMemo, useEffect } from 'react'
import { useEditorStore } from '../store/editorStore'

interface FMField { key: string; value: string; isArray: boolean }
interface ParseResult { hasFM: boolean; fields: FMField[]; rawLines: string[]; rest: string }

const FM_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/

function parse(content: string): ParseResult {
  const m = content.match(FM_RE)
  if (!m) return { hasFM: false, fields: [], rawLines: [], rest: content }
  const lines = m[1].split(/\r?\n/)
  const fields: FMField[] = []
  const rawLines: string[] = []
  for (const line of lines) {
    const fm = line.match(/^([\w\-]+)\s*:\s*(.*)$/)
    if (fm) {
      const val = fm[2].trim()
      const isArray = /^\[[\s\S]*\]$/.test(val)
      fields.push({ key: fm[1], value: isArray ? val.slice(1, -1).trim() : val, isArray })
    } else {
      rawLines.push(line)
    }
  }
  return { hasFM: true, fields, rawLines, rest: content.slice(m[0].length) }
}

function serialize(fields: FMField[], rawLines: string[]): string {
  const out: string[] = []
  for (const f of fields) {
    out.push(`${f.key}: ${f.isArray ? `[${f.value}]` : f.value}`)
  }
  if (rawLines.length) out.push(...rawLines)
  return `---\n${out.join('\n')}\n---\n`
}

export function FrontMatterEditor() {
  const { tabs, activeTabId, showFrontMatter, setShowFrontMatter, updateTabContent } = useEditorStore()
  const activeTab = tabs.find(t => t.id === activeTabId)
  const parsed = useMemo(() => activeTab ? parse(activeTab.content) : null, [activeTab?.content, showFrontMatter])

  const [fields, setFields] = useState<FMField[]>([])
  const [enabled, setEnabled] = useState(false)
  useEffect(() => {
    if (parsed) {
      setFields(parsed.hasFM ? parsed.fields.map(f => ({ ...f })) : [{ key: 'title', value: '', isArray: false }, { key: 'date', value: new Date().toISOString().slice(0, 10), isArray: false }, { key: 'tags', value: '', isArray: true }])
      setEnabled(parsed.hasFM)
    }
  }, [parsed])

  if (!showFrontMatter || !activeTab || !parsed) return null

  const update = (i: number, patch: Partial<FMField>) => setFields(fs => fs.map((f, idx) => idx === i ? { ...f, ...patch } : f))
  const addField = () => setFields(fs => [...fs, { key: '', value: '', isArray: false }])
  const removeField = (i: number) => setFields(fs => fs.filter((_, idx) => idx !== i))

  const apply = () => {
    const fmText = enabled ? serialize(fields, parsed.rawLines) : ''
    updateTabContent(activeTab.id, fmText + parsed.rest)
    setShowFrontMatter(false)
  }

  return (
    <div className="fm-overlay" onClick={() => setShowFrontMatter(false)}>
      <div className="fm-modal" onClick={e => e.stopPropagation()}>
        <div className="fm-header">
          <span>🏷 文档元信息 (Front Matter)</span>
          <button className="fm-close" onClick={() => setShowFrontMatter(false)}>×</button>
        </div>
        <label className="fm-toggle">
          <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} />
          启用 Front Matter 块
        </label>
        <div className="fm-fields">
          {fields.map((f, i) => (
            <div key={i} className="fm-row">
              <input className="fm-key" value={f.key} onChange={e => update(i, { key: e.target.value })} placeholder="字段名" />
              <span className="fm-colon">:</span>
              <input className="fm-val" value={f.value} onChange={e => update(i, { value: e.target.value })} placeholder={f.isArray ? '逗号分隔值' : '值'} />
              <button className="fm-array-btn" title="切换数组/标量" onClick={() => update(i, { isArray: !f.isArray })}>{f.isArray ? '[…]' : '—'}</button>
              <button className="fm-del" onClick={() => removeField(i)}>✕</button>
            </div>
          ))}
        </div>
        <button className="fm-add" onClick={addField}>+ 添加字段</button>
        <div className="fm-actions">
          <button className="fm-btn primary" onClick={apply}>应用到文档</button>
        </div>
        {parsed.rawLines.length > 0 && <div className="fm-hint">⚠ 含 {parsed.rawLines.length} 行无法图形化的原始内容，将原样保留</div>}
      </div>
    </div>
  )
}
