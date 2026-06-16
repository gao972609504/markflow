/**
 * 全局写作仪表盘 (Workspace Dashboard)
 * — 聚合工作区全貌：标签、字数、任务、标签、双链、今日字数、连续天数
 * — 灵感来自 Notion / Obsidian 的概览页
 */
import { useMemo } from 'react'
import { useEditorStore, FileTreeNode } from '../store/editorStore'

function countWords(text: string): number {
  const c = text.trim()
  const cn = (c.match(/[一-龥]/g) || []).length
  const en = (c.replace(/[一-龥]/g, ' ').trim().split(/\s+/).filter(Boolean)).length
  return cn + en
}

function countFiles(nodes: FileTreeNode[]): number {
  let n = 0
  for (const node of nodes) {
    if (!node.isDirectory) n++
    if (node.children) n += countFiles(node.children)
  }
  return n
}

export function Dashboard() {
  const { tabs, fileTree, folderPath, showDashboard, setShowDashboard } = useEditorStore()

  const stats = useMemo(() => {
    let totalWords = 0, tasksDone = 0, tasksTotal = 0
    const tags = new Set<string>(), wikis = new Set<string>()
    for (const t of tabs) {
      totalWords += countWords(t.content)
      let m: RegExpExecArray | null
      const tkRe = /^(\s*)([-*+])\s\[([ xX])\]/gm
      while ((m = tkRe.exec(t.content))) { tasksTotal++; if (m[3].toLowerCase() === 'x') tasksDone++ }
      const tagRe = /(?:^|\s)#([\w一-龥]+)/g
      while ((m = tagRe.exec(t.content))) tags.add(m[1])
      const wikiRe = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g
      while ((m = wikiRe.exec(t.content))) wikis.add(m[1])
    }
    let todayWords = 0
    try {
      const hm = JSON.parse(localStorage.getItem('markflow-writing-heatmap') || '{}')
      const d = new Date()
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      todayWords = hm[key] || 0
    } catch { /* noop */ }
    let streak = 0
    try { streak = parseInt(localStorage.getItem('markflow-writing-streak') || '0', 10) || 0 } catch { /* noop */ }
    return {
      tabs: tabs.length, files: countFiles(fileTree), totalWords,
      tasksDone, tasksTotal, tags: tags.size, wikis: wikis.size, todayWords, streak,
    }
  }, [tabs, fileTree])

  if (!showDashboard) return null
  const taskPct = stats.tasksTotal ? Math.round((stats.tasksDone / stats.tasksTotal) * 100) : 0

  const cards = [
    { icon: '📂', label: '打开标签', value: stats.tabs, hint: folderPath ? `${stats.files} 个工作区文件` : '未打开文件夹' },
    { icon: '✍️', label: '累计字数', value: stats.totalWords.toLocaleString(), hint: '所有标签合计' },
    { icon: '📅', label: '今日字数', value: stats.todayWords.toLocaleString(), hint: '热力图记录' },
    { icon: '🔥', label: '连续天数', value: stats.streak, hint: '写作连胜' },
    { icon: '✓', label: '任务完成', value: `${stats.tasksDone}/${stats.tasksTotal}`, hint: taskPct + '%' },
    { icon: '#', label: '标签数', value: stats.tags, hint: '去重' },
    { icon: '🗂', label: '双链数', value: stats.wikis, hint: '去重' },
  ]

  return (
    <div className="dashboard-overlay" onClick={() => setShowDashboard(false)}>
      <div className="dashboard-modal" onClick={e => e.stopPropagation()}>
        <div className="dashboard-header">
          <span>📊 写作仪表盘</span>
          <button className="dashboard-close" onClick={() => setShowDashboard(false)}>×</button>
        </div>
        {folderPath && <div className="dashboard-path" title={folderPath}>📁 {folderPath}</div>}
        <div className="dashboard-grid">
          {cards.map((c, i) => (
            <div key={i} className="dashboard-card">
              <div className="dashboard-card-icon">{c.icon}</div>
              <div className="dashboard-card-value">{c.value}</div>
              <div className="dashboard-card-label">{c.label}</div>
              <div className="dashboard-card-hint">{c.hint}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
