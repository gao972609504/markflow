/**
 * 关系图谱 (Graph View)
 * — Obsidian 标志性功能：将文档间的 WikiLink 双向链接可视化为力导向网络图
 * — Canvas 实现轻量物理引擎（节点斥力 + 连线弹簧 + 中心引力），无外部依赖
 * — 支持拖拽节点、点击跳转、滚轮缩放、拖拽平移
 */
import { useRef, useEffect, useMemo, useCallback } from 'react'
import { useEditorStore } from '../store/editorStore'

interface GNode {
  id: string
  label: string
  x: number
  y: number
  vx: number
  vy: number
  degree: number
  isOpen: boolean        // 是否为已打开的标签
  isActive: boolean      // 是否为当前激活文档
  pinned: boolean        // 是否被拖拽固定
}

interface GEdge {
  source: string
  target: string
}

const WIKI_RE = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g

/** 从标签列表构建图数据（节点 + 边） */
function buildGraph(tabs: { id: string; title: string; filePath: string | null; content: string }[], activeTabId: string | null) {
  // 为每个标签计算可被链接匹配的名称集合
  const tabNames = new Map<string, Set<string>>()
  for (const tab of tabs) {
    const names = new Set<string>()
    const base = tab.title.replace(/\.(md|markdown|txt|mdx)$/i, '')
    names.add(base)
    names.add(tab.title)
    if (tab.filePath) {
      const fp = tab.filePath.split(/[/\\]/).pop() || tab.title
      names.add(fp)
      names.add(fp.replace(/\.(md|markdown|txt|mdx)$/i, ''))
    }
    tabNames.set(tab.id, names)
  }

  // 反向索引：名称 → tabId（取第一个匹配）
  const nameToTab = new Map<string, string>()
  for (const [tabId, names] of tabNames) {
    for (const n of names) {
      if (!nameToTab.has(n)) nameToTab.set(n, tabId)
    }
  }

  const nodes: GNode[] = tabs.map(t => ({
    id: t.id,
    label: t.title.replace(/\.(md|markdown|txt|mdx)$/i, ''),
    x: 0, y: 0, vx: 0, vy: 0,
    degree: 0,
    isOpen: true,
    isActive: t.id === activeTabId,
    pinned: false,
  }))
  const nodeMap = new Map(nodes.map(n => [n.id, n]))

  // 虚拟节点：被链接但未打开的文档
  const edges: GEdge[] = []
  const seenEdge = new Set<string>()
  for (const tab of tabs) {
    let m: RegExpExecArray | null
    WIKI_RE.lastIndex = 0
    while ((m = WIKI_RE.exec(tab.content))) {
      const target = m[1].trim()
      const targetTabId = nameToTab.get(target)
      if (targetTabId && targetTabId !== tab.id) {
        const key = [tab.id, targetTabId].sort().join('→')
        if (!seenEdge.has(key)) {
          seenEdge.add(key)
          edges.push({ source: tab.id, target: targetTabId })
          nodeMap.get(tab.id)!.degree++
          nodeMap.get(targetTabId)!.degree++
        }
      } else if (!targetTabId) {
        // 虚拟节点（未打开的链接目标）
        if (!nodeMap.has(target)) {
          nodeMap.set(target, {
            id: target,
            label: target,
            x: 0, y: 0, vx: 0, vy: 0,
            degree: 1,
            isOpen: false,
            isActive: false,
            pinned: false,
          })
          nodes.push(nodeMap.get(target)!)
        }
        const key = [tab.id, target].sort().join('→')
        if (!seenEdge.has(key)) {
          seenEdge.add(key)
          edges.push({ source: tab.id, target })
          nodeMap.get(tab.id)!.degree++
        }
      }
    }
  }

  return { nodes, edges, nodeMap }
}

export function GraphView() {
  const { showGraphView, setShowGraphView, tabs, activeTabId, theme } = useEditorStore()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dataRef = useRef<{ nodes: GNode[]; edges: GEdge[]; nodeMap: Map<string, GNode> }>({ nodes: [], edges: [], nodeMap: new Map() })
  const viewRef = useRef({ scale: 1, offsetX: 0, offsetY: 0 })
  const dragRef = useRef<{ node: GNode | null; panning: boolean; lastX: number; lastY: number; moved: boolean }>({ node: null, panning: false, lastX: 0, lastY: 0, moved: false })
  const rafRef = useRef<number>(0)

  const graph = useMemo(() => buildGraph(tabs, activeTabId), [tabs, activeTabId])

  // 颜色配置
  const colors = useMemo(() => theme === 'dark'
    ? { bg: '#1e1e1e', node: '#4eb0d6', edge: '#3a3a3a', text: '#cccccc', active: '#ffb86c', virtual: '#666666', glow: 'rgba(78,176,214,0.4)' }
    : { bg: '#fafafa', node: '#4183c4', edge: '#c8c8c8', text: '#333333', active: '#d2691e', virtual: '#999999', glow: 'rgba(65,131,196,0.3)' },
  [theme])

  // 初始化 / 图数据变化时重置节点位置（圆形布局）
  useEffect(() => {
    if (!showGraphView) return
    const { nodes } = graph
    const cx = window.innerWidth / 2
    const cy = window.innerHeight / 2
    const radius = Math.min(window.innerWidth, window.innerHeight) * 0.3
    nodes.forEach((n, i) => {
      if (!n.pinned) {
        const angle = (i / Math.max(nodes.length, 1)) * Math.PI * 2
        n.x = cx + Math.cos(angle) * radius + (Math.random() - 0.5) * 40
        n.y = cy + Math.sin(angle) * radius + (Math.random() - 0.5) * 40
        n.vx = 0
        n.vy = 0
      }
    })
    dataRef.current = graph
  }, [graph, showGraphView])

  // 力导向模拟 + 渲染循环
  useEffect(() => {
    if (!showGraphView) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth * window.devicePixelRatio
      canvas.height = window.innerHeight * window.devicePixelRatio
      canvas.style.width = window.innerWidth + 'px'
      canvas.style.height = window.innerHeight + 'px'
      ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const step = () => {
      const { nodes, edges } = dataRef.current
      const cx = window.innerWidth / 2
      const cy = window.innerHeight / 2
      const REPULSION = 12000
      const SPRING_LEN = 140
      const SPRING_K = 0.02
      const GRAVITY = 0.008
      const DAMP = 0.82

      // 节点间斥力
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j]
          let dx = b.x - a.x, dy = b.y - a.y
          let dist = Math.sqrt(dx * dx + dy * dy) + 0.01
          if (dist > 600) continue
          const f = REPULSION / (dist * dist)
          const fx = (dx / dist) * f, fy = (dy / dist) * f
          a.vx -= fx; a.vy -= fy
          b.vx += fx; b.vy += fy
        }
      }
      // 连线弹簧力
      for (const e of edges) {
        const a = dataRef.current.nodeMap.get(e.source)
        const b = dataRef.current.nodeMap.get(e.target)
        if (!a || !b) continue
        let dx = b.x - a.x, dy = b.y - a.y
        let dist = Math.sqrt(dx * dx + dy * dy) + 0.01
        const f = (dist - SPRING_LEN) * SPRING_K
        const fx = (dx / dist) * f, fy = (dy / dist) * f
        a.vx += fx; a.vy += fy
        b.vx -= fx; b.vy -= fy
      }
      // 中心引力 + 阻尼 + 位置更新
      for (const n of nodes) {
        if (n.pinned) { n.vx = 0; n.vy = 0; continue }
        n.vx += (cx - n.x) * GRAVITY
        n.vy += (cy - n.y) * GRAVITY
        n.vx *= DAMP; n.vy *= DAMP
        n.x += n.vx; n.y += n.vy
      }
      render()
      rafRef.current = requestAnimationFrame(step)
    }

    const render = () => {
      const { scale, offsetX, offsetY } = viewRef.current
      const w = window.innerWidth, h = window.innerHeight
      ctx.fillStyle = colors.bg
      ctx.fillRect(0, 0, w, h)

      ctx.save()
      ctx.translate(offsetX, offsetY)
      ctx.scale(scale, scale)

      // 边
      ctx.strokeStyle = colors.edge
      ctx.lineWidth = 1 / scale
      for (const e of dataRef.current.edges) {
        const a = dataRef.current.nodeMap.get(e.source)
        const b = dataRef.current.nodeMap.get(e.target)
        if (!a || !b) continue
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.stroke()
      }
      // 节点
      for (const n of dataRef.current.nodes) {
        const r = 6 + Math.min(n.degree * 2.5, 14)
        if (n.isActive) {
          ctx.beginPath()
          ctx.arc(n.x, n.y, r + 6, 0, Math.PI * 2)
          ctx.fillStyle = colors.glow
          ctx.fill()
        }
        ctx.beginPath()
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2)
        ctx.fillStyle = n.isActive ? colors.active : (n.isOpen ? colors.node : colors.virtual)
        ctx.fill()
        if (!n.isOpen) {
          ctx.strokeStyle = colors.virtual
          ctx.lineWidth = 1.5 / scale
          ctx.stroke()
        }
        // 标签
        ctx.fillStyle = colors.text
        ctx.font = `${11 / scale}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        const label = n.label.length > 18 ? n.label.slice(0, 17) + '…' : n.label
        ctx.fillText(label, n.x, n.y + r + 3)
      }
      ctx.restore()
    }

    rafRef.current = requestAnimationFrame(step)
    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [showGraphView, colors])

  // 屏幕坐标 → 世界坐标
  const toWorld = useCallback((sx: number, sy: number) => {
    const { scale, offsetX, offsetY } = viewRef.current
    return { x: (sx - offsetX) / scale, y: (sy - offsetY) / scale }
  }, [])

  // 命中检测
  const hitTest = useCallback((wx: number, wy: number): GNode | null => {
    const nodes = dataRef.current.nodes
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i]
      const r = 6 + Math.min(n.degree * 2.5, 14)
      const dx = wx - n.x, dy = wy - n.y
      if (dx * dx + dy * dy <= (r + 4) * (r + 4)) return n
    }
    return null
  }, [])

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top
    const { x, y } = toWorld(sx, sy)
    const node = hitTest(x, y)
    dragRef.current.moved = false
    if (node) {
      node.pinned = true
      dragRef.current.node = node
    } else {
      dragRef.current.panning = true
    }
    dragRef.current.lastX = sx
    dragRef.current.lastY = sy
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top
    const d = dragRef.current
    if (Math.abs(sx - d.lastX) > 3 || Math.abs(sy - d.lastY) > 3) d.moved = true
    if (d.node) {
      const { x, y } = toWorld(sx, sy)
      d.node.x = x; d.node.y = y
    } else if (d.panning) {
      viewRef.current.offsetX += sx - d.lastX
      viewRef.current.offsetY += sy - d.lastY
    }
    d.lastX = sx; d.lastY = sy
  }

  const handleMouseUp = (e: React.MouseEvent) => {
    const d = dragRef.current
    // 点击（未拖动）节点 → 打开该文档
    if (d.node && !d.moved && d.node.isOpen) {
      useEditorStore.getState().setActiveTab(d.node.id)
    }
    if (d.node) d.node.pinned = false
    d.node = null
    d.panning = false
  }

  const handleWheel = (e: React.WheelEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top
    const v = viewRef.current
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    const newScale = Math.max(0.2, Math.min(3, v.scale * delta))
    // 以鼠标位置为中心缩放
    v.offsetX = sx - (sx - v.offsetX) * (newScale / v.scale)
    v.offsetY = sy - (sy - v.offsetY) * (newScale / v.scale)
    v.scale = newScale
  }

  const reLayout = () => {
    for (const n of dataRef.current.nodes) { n.pinned = false; n.vx = 0; n.vy = 0 }
    viewRef.current = { scale: 1, offsetX: 0, offsetY: 0 }
    // 触发圆形布局重置
    const { nodes } = dataRef.current
    const cx = window.innerWidth / 2, cy = window.innerHeight / 2
    const radius = Math.min(window.innerWidth, window.innerHeight) * 0.3
    nodes.forEach((n, i) => {
      const angle = (i / Math.max(nodes.length, 1)) * Math.PI * 2
      n.x = cx + Math.cos(angle) * radius
      n.y = cy + Math.sin(angle) * radius
    })
  }

  if (!showGraphView) return null

  return (
    <div className="graph-view-overlay">
      <div className="graph-view-toolbar">
        <div className="graph-view-title">
          <span className="graph-view-icon" aria-hidden="true">🕸️</span>
          <span>关系图谱</span>
          <span className="graph-view-stats">
            {graph.nodes.length} 节点 · {graph.edges.length} 连接
          </span>
        </div>
        <div className="graph-view-actions">
          <button className="graph-view-btn" onClick={reLayout} title="重新布局">↻ 重排</button>
          <button className="graph-view-btn" onClick={() => { viewRef.current = { scale: 1, offsetX: 0, offsetY: 0 } }} title="重置视图">⊙ 重置</button>
          <button className="graph-view-btn graph-view-close" onClick={() => setShowGraphView(false)} title="关闭 (Esc)">✕</button>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        className="graph-view-canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />
      <div className="graph-view-legend">
        <span><i style={{ background: colors.node }} /> 已打开</span>
        <span><i style={{ background: colors.virtual, border: `1px solid ${colors.virtual}` }} /> 未打开</span>
        <span><i style={{ background: colors.active }} /> 当前文档</span>
        <span className="graph-view-hint">拖拽移动节点 · 点击打开 · 滚轮缩放 · 空白处拖拽平移</span>
      </div>
    </div>
  )
}
