/**
 * 可读性分析面板 (Readability Analysis)
 * — 基于 Flesch 阅读容易度（Reading Ease）和 Flesch-Kincaid 年级水平
 * — 显示平均句长、平均音节、复杂词占比、最长句子等写作指标
 * — 类似 Hemingway Editor / Grammarly / 可读性.com 的文本难度评估
 */
import { useState, useEffect, useMemo } from 'react'
import type { CSSProperties } from 'react'
import { useEditorStore } from '../store/editorStore'

/** 估算英文单词音节数（标准启发式） */
function countSyllables(word: string): number {
  let w = word.toLowerCase().replace(/[^a-z]/g, '')
  if (!w) return 0
  if (w.length <= 3) return 1
  w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '')
  w = w.replace(/^y/, '')
  const groups = w.match(/[aeiouy]{1,2}/g)
  return groups ? Math.max(1, groups.length) : 1
}

interface Metrics {
  fleschEase: number | null
  grade: number | null
  sentences: number
  words: number
  syllables: number
  avgSentenceLen: number
  avgSyllablesPerWord: number
  complexWordPct: number
  longestSentence: number
  easeLabel: string
  easeColor: string
}

function easeInterpretation(score: number): { label: string; color: string } {
  if (score >= 90) return { label: '非常容易 · 5年级', color: '#3fa34d' }
  if (score >= 80) return { label: '容易 · 6年级', color: '#5cb85c' }
  if (score >= 70) return { label: '较易 · 7年级', color: '#8cc63f' }
  if (score >= 60) return { label: '标准 · 8-9年级', color: '#e8a64a' }
  if (score >= 50) return { label: '较难 · 高中', color: '#e8852a' }
  if (score >= 30) return { label: '困难 · 大学', color: '#e0564f' }
  return { label: '非常困难 · 研究生', color: '#c0392b' }
}

function analyze(text: string): Metrics {
  // 英文单词
  const enWords: string[] = []
  const enRe = /[a-zA-Z]+/g
  let m: RegExpExecArray | null
  while ((m = enRe.exec(text))) enWords.push(m[0])

  // 中文字符（每个字 = 1 词 + 1 音节）
  const cnChars = (text.match(/[一-鿿]/g) || []).length

  // 句子：中英文标点 + 换行段落
  const sentenceRe = /[^。！？!?\n]+[。！？!?]+|[^。！？!?\n]+$/g
  const sentences = (text.match(sentenceRe) || []).filter(s => s.trim()).length
  const effectiveSentences = Math.max(sentences, text.trim() ? 1 : 0)

  const words = enWords.length + cnChars
  let enSyllables = 0
  let complexWords = 0
  for (const w of enWords) {
    const s = countSyllables(w)
    enSyllables += s
    if (s >= 3) complexWords++
  }
  const syllables = enSyllables + cnChars

  let fleschEase: number | null = null
  let grade: number | null = null
  if (words > 0 && effectiveSentences > 0) {
    const asl = words / effectiveSentences
    const asw = syllables / words
    fleschEase = 206.835 - 1.015 * asl - 84.6 * asw
    grade = 0.39 * asl + 11.8 * asw - 15.59
  }

  // 最长句子（按词数）
  const sentList = (text.match(sentenceRe) || []).filter(s => s.trim())
  let longestSentence = 0
  for (const s of sentList) {
    const sc = (s.match(/[a-zA-Z]+/g) || []).length + (s.match(/[一-鿿]/g) || []).length
    if (sc > longestSentence) longestSentence = sc
  }

  const interp = fleschEase != null ? easeInterpretation(fleschEase) : { label: '—', color: 'var(--text-muted)' }

  return {
    fleschEase,
    grade,
    sentences: effectiveSentences,
    words,
    syllables,
    avgSentenceLen: effectiveSentences > 0 ? words / effectiveSentences : 0,
    avgSyllablesPerWord: words > 0 ? syllables / words : 0,
    complexWordPct: words > 0 ? (complexWords / words) * 100 : 0,
    longestSentence,
    easeLabel: interp.label,
    easeColor: interp.color,
  }
}

export function Readability() {
  const { readabilityVisible, setShowReadability, tabs, activeTabId } = useEditorStore()
  const activeTab = tabs.find(t => t.id === activeTabId)
  const text = activeTab?.content ?? ''

  const [metrics, setMetrics] = useState<Metrics | null>(null)
  useEffect(() => {
    const timer = setTimeout(() => setMetrics(analyze(text)), 400)
    return () => clearTimeout(timer)
  }, [text])

  if (!readabilityVisible) return null

  const ease = metrics?.fleschEase
  const easePct = ease != null ? Math.max(0, Math.min(100, ease)) : 0

  return (
    <div className="readability-panel">
      <div className="readability-header">
        <div className="readability-title">
          <span className="readability-icon" aria-hidden="true">📖</span>
          <span>可读性分析</span>
        </div>
        <button className="outline-close-btn" onClick={() => setShowReadability(false)} title="关闭">×</button>
      </div>

      {!text.trim() ? (
        <div className="readability-empty">暂无文本可分析</div>
      ) : metrics && (
        <div className="readability-body">
          {/* 主分数环 */}
          <div className="readability-score-wrap">
            <div className="readability-score-ring" style={{ '--ease-pct': `${easePct}%`, '--ease-color': metrics.easeColor } as CSSProperties}>
              <div className="readability-score-inner">
                <span className="readability-score-num">{ease != null ? Math.round(ease) : '—'}</span>
                <span className="readability-score-unit">/ 100</span>
              </div>
            </div>
            <div className="readability-score-label" style={{ color: metrics.easeColor }}>{metrics.easeLabel}</div>
          </div>

          {/* 年级水平 */}
          {metrics.grade != null && (
            <div className="readability-grade">
              <span className="readability-grade-num">{Math.max(0, metrics.grade).toFixed(1)}</span>
              <span className="readability-grade-text">年级阅读水平<br /><small>(Flesch-Kincaid Grade)</small></span>
            </div>
          )}

          {/* 统计卡片 */}
          <div className="readability-stats">
            <div className="readability-stat">
              <span className="readability-stat-num">{metrics.avgSentenceLen.toFixed(1)}</span>
              <span className="readability-stat-label">词/句</span>
            </div>
            <div className="readability-stat">
              <span className="readability-stat-num">{metrics.avgSyllablesPerWord.toFixed(2)}</span>
              <span className="readability-stat-label">音节/词</span>
            </div>
            <div className="readability-stat">
              <span className="readability-stat-num">{metrics.complexWordPct.toFixed(0)}%</span>
              <span className="readability-stat-label">复杂词</span>
            </div>
            <div className="readability-stat">
              <span className="readability-stat-num">{metrics.longestSentence}</span>
              <span className="readability-stat-label">最长句词数</span>
            </div>
          </div>

          {/* 刻度提示 */}
          <div className="readability-scale">
            <div className="readability-scale-bar">
              <span className="readability-scale-marker" style={{ left: `${easePct}%` }} />
            </div>
            <div className="readability-scale-labels">
              <span>困难</span><span>标准</span><span>容易</span>
            </div>
          </div>

          {metrics.complexWordPct > 15 && (
            <div className="readability-tip">💡 复杂词占比偏高（{metrics.complexWordPct.toFixed(0)}%），可考虑用更短的词替换以提升可读性</div>
          )}
        </div>
      )}
    </div>
  )
}
