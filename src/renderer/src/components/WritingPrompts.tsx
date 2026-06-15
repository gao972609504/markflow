/**
 * 写作灵感 (Writing Prompts)
 * — 随机展示写作提示，激发创作灵感（iA Writer / 写作类 App 常见功能）
 * — 5 个分类（全部/创意/日记/观点/故事），~40 条精选双语提示
 * — 支持换一题、复制、插入到文档（作为引用块）
 */
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useEditorStore } from '../store/editorStore'
import { getEditorView } from '../plugins/widgets'

type Category = 'all' | 'creative' | 'journal' | 'opinion' | 'story'

const PROMPTS: { text: string; category: Exclude<Category, 'all'> }[] = [
  { text: '描写一个只有你能看见的颜色，它会出现在哪里？', category: 'creative' },
  { text: '如果今天的时间可以倒流一小时，你会怎么度过？', category: 'journal' },
  { text: '你认为"成功"的最小定义是什么？用 200 字说服我。', category: 'opinion' },
  { text: '一个失忆的人每天醒来读到同一封信，信里写了什么？', category: 'story' },
  { text: '写一种你从未尝过、但能想象出味道的食物。', category: 'creative' },
  { text: '此刻你最感激的三件小事是什么？', category: 'journal' },
  { text: '科技让生活更简单还是更复杂？给出你的论据。', category: 'opinion' },
  { text: '一栋无人居住的老房子里，每天准时响起一次钢琴声。', category: 'story' },
  { text: '假如你可以和十年前的自己通一封信，只允许写一句话。', category: 'creative' },
  { text: '描述今天最打动你的一个瞬间，哪怕很微小。', category: 'journal' },
  { text: '为什么人们害怕沉默？谈谈你的看法。', category: 'opinion' },
  { text: '主角发现地图上的某个岛屿，在任何其他地图上都找不到。', category: 'story' },
  { text: '发明一个节日，描述人们如何庆祝它。', category: 'creative' },
  { text: '本周你学到了什么新东西？是怎么学到的？', category: 'journal' },
  { text: '人工智能能拥有"品味"吗？为什么。', category: 'opinion' },
  { text: '深夜便利店的收银员记得每一位常客的故事。', category: 'story' },
  { text: '如果情绪有颜色，你今天的情绪是什么色？写下来。', category: 'creative' },
  { text: '写一写那个你一直想说"不"却没说出口的事。', category: 'journal' },
  { text: '独处和孤独的区别是什么？', category: 'opinion' },
  { text: '一座灯塔的看守人收到了一封来自海的信。', category: 'story' },
  { text: '用五种感官描写一个下雨的早晨。', category: 'creative' },
  { text: '最近什么让你发自内心地笑过？', category: 'journal' },
  { text: '你同意"慢即是快"吗？用例子说明。', category: 'opinion' },
  { text: '一只会说话的猫，只对陌生人开口。', category: 'story' },
  { text: '描述一个虚构城市的清晨通勤场景。', category: 'creative' },
  { text: '今年你最想完成却还没开始的事是什么？阻碍是什么？', category: 'journal' },
  { text: '阅读还有未来吗？论证你的立场。', category: 'opinion' },
  { text: '主角继承了祖父的怀表，表针永远停在 3:14。', category: 'story' },
  { text: '写一段对话，两个人在说完全相反的意思，却都很真诚。', category: 'creative' },
  { text: '此刻坐下来五分钟，什么都不做，然后写下脑海里浮现的。', category: 'journal' },
  { text: '"选择"和"机会"哪个更重要？', category: 'opinion' },
  { text: '一位面包师每天烤一个不卖的面包，留给一个从未来的人。', category: 'story' },
  { text: '假如你的城市突然多出一个小时的白昼，人们会做什么？', category: 'creative' },
  { text: '回想一个改变你看法的瞬间，是什么促成了改变？', category: 'journal' },
  { text: '完美是好的敌人——你同意吗？', category: 'opinion' },
  { text: '一个孩子坚信阁楼上的影子是朋友，而大人们看不见。', category: 'story' },
  { text: '为一种不存在的乐器写一段演奏说明。', category: 'creative' },
  { text: '你最近对自己有了什么新的认识？', category: 'journal' },
  { text: '旅行的意义是"看见不同"还是"看见自己"？', category: 'opinion' },
  { text: '末班地铁上，所有乘客都默契地不说话，除了一个人。', category: 'story' },
]

const CATEGORY_LABELS: Record<Category, string> = {
  all: '全部', creative: '创意', journal: '日记', opinion: '观点', story: '故事',
}

export function WritingPrompts() {
  const { showPrompts, setShowPrompts } = useEditorStore()
  const [category, setCategory] = useState<Category>('all')
  const [idx, setIdx] = useState(0)
  const [copied, setCopied] = useState(false)

  const filtered = useMemo(
    () => category === 'all' ? PROMPTS : PROMPTS.filter(p => p.category === category),
    [category]
  )

  const current = filtered[idx % filtered.length]

  // 切换分类时重置索引
  useEffect(() => { setIdx(0) }, [category])

  const next = useCallback(() => {
    setIdx(i => (i + 1) % filtered.length)
    setCopied(false)
  }, [filtered.length])

  // Esc 关闭
  useEffect(() => {
    if (!showPrompts) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowPrompts(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [showPrompts, setShowPrompts])

  const copy = useCallback(() => {
    if (!current) return
    navigator.clipboard.writeText(current.text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }, [current])

  const insertToDoc = useCallback(() => {
    if (!current) return
    const editorEl = document.querySelector('.cm-editor')
    const view = editorEl ? getEditorView(editorEl as HTMLElement) : undefined
    if (view) {
      const sel = view.state.selection.main
      const insertText = `> ${current.text}\n\n`
      view.dispatch({
        changes: { from: sel.from, to: sel.to, insert: insertText },
        selection: { anchor: sel.from + insertText.length },
      })
    }
    setShowPrompts(false)
  }, [current, setShowPrompts])

  if (!showPrompts) return null

  return (
    <div className="prompts-overlay" onClick={() => setShowPrompts(false)}>
      <div className="prompts-modal" onClick={e => e.stopPropagation()}>
        <div className="prompts-header">
          <span className="prompts-icon" aria-hidden="true">✨</span>
          <span className="prompts-title">写作灵感</span>
          <button className="prompts-close" onClick={() => setShowPrompts(false)} title="关闭 (Esc)">×</button>
        </div>

        <div className="prompts-categories">
          {(Object.keys(CATEGORY_LABELS) as Category[]).map(cat => (
            <button
              key={cat}
              className={`prompts-cat ${category === cat ? 'active' : ''}`}
              onClick={() => setCategory(cat)}
            >{CATEGORY_LABELS[cat]}</button>
          ))}
        </div>

        <div className="prompts-card" key={`${category}-${idx}`}>
          <span className="prompts-quote-mark">"</span>
          <p className="prompts-text">{current?.text}</p>
        </div>

        <div className="prompts-actions">
          <button className="prompts-btn prompts-btn-primary" onClick={next} title="换一道提示">
            <span aria-hidden="true">🎲</span> 换一题
          </button>
          <button className="prompts-btn" onClick={copy} title="复制到剪贴板">
            {copied ? '✓ 已复制' : '📋 复制'}
          </button>
          <button className="prompts-btn" onClick={insertToDoc} title="作为引用块插入到当前文档">
            ⤓ 插入文档
          </button>
        </div>

        <div className="prompts-foot">{filtered.length} 条提示 · {idx + 1}/{filtered.length}</div>
      </div>
    </div>
  )
}
