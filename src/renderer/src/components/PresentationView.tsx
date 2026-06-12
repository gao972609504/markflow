/**
 * Markdown 演示模式 (Slide Presentation)
 *
 * 将文档按 `---` 分割为幻灯片，全屏演示。
 * 支持 `???` 分隔演讲者备注。
 *
 * 快捷键：← → Space Esc F（全屏）
 */
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useEditorStore } from '../store/editorStore'
import { renderMarkdown } from '../utils/markdown'

interface Slide {
  html: string
  notes: string
}

function parseSlides(content: string): Slide[] {
  // 按 --- 分割（独立一行的三个以上短横线）
  const rawSlides = content.split(/\n(?:---)\n/)

  return rawSlides.map(raw => {
    // 按 ??? 分割演讲者备注
    const parts = raw.split(/\n\?\?\?\n/)
    const slideContent = (parts[0] || '').trim()
    const notes = (parts[1] || '').trim()

    return {
      html: renderMarkdown(slideContent),
      notes: notes ? renderMarkdown(notes) : '',
    }
  }).filter(s => s.html.trim() !== '')
}

export function PresentationView() {
  const { tabs, activeTabId, setShowPresentation, showPresentation } = useEditorStore()
  const activeTab = tabs.find(t => t.id === activeTabId)

  const slides = useMemo(() => {
    if (!activeTab?.content) return []
    return parseSlides(activeTab.content)
  }, [activeTab?.content])

  const [currentSlide, setCurrentSlide] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [direction, setDirection] = useState<'left' | 'right'>('right')
  const containerRef = useRef<HTMLDivElement>(null)

  const totalSlides = slides.length

  const goTo = useCallback((idx: number, dir: 'left' | 'right' = 'right') => {
    if (idx < 0 || idx >= totalSlides) return
    setDirection(dir)
    setCurrentSlide(idx)
  }, [totalSlides])

  const next = useCallback(() => goTo(currentSlide + 1, 'right'), [currentSlide, goTo])
  const prev = useCallback(() => goTo(currentSlide - 1, 'left'), [currentSlide, goTo])

  // 键盘导航
  useEffect(() => {
    if (!showPresentation) return

    const handler = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
        case ' ':
        case 'PageDown':
          e.preventDefault(); next(); break
        case 'ArrowLeft':
        case 'PageUp':
          e.preventDefault(); prev(); break
        case 'Home':
          e.preventDefault(); goTo(0); break
        case 'End':
          e.preventDefault(); goTo(totalSlides - 1); break
        case 'Escape':
          e.preventDefault(); setShowPresentation(false); break
        case 'f':
        case 'F':
          e.preventDefault(); toggleFullscreen(); break
        case 'n':
        case 'N':
          e.preventDefault(); setShowNotes(v => !v); break
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [showPresentation, next, prev, goTo, totalSlides])

  // 打开时重置到第一张
  useEffect(() => {
    if (showPresentation) setCurrentSlide(0)
  }, [showPresentation])

  if (!showPresentation || slides.length === 0) return null

  const slide = slides[currentSlide]

  return (
    <div className="presentation-overlay" ref={containerRef}>
      {/* ── 幻灯片区域 ── */}
      <div className="presentation-stage">
        <div
          key={currentSlide}
          className={`presentation-slide presentation-slide-${direction}`}
          dangerouslySetInnerHTML={{ __html: slide.html }}
        />
      </div>

      {/* ── 底部控制栏 ── */}
      <div className="presentation-controls">
        <div className="presentation-controls-left">
          <button className="pres-btn" onClick={prev} disabled={currentSlide === 0} title="上一张 (←)">
            <svg viewBox="0 0 16 16" width="14" height="14"><path fill="currentColor" d="M10.5 3l-5 5 5 5V3z"/></svg>
          </button>
          <span className="pres-counter">{currentSlide + 1} / {totalSlides}</span>
          <button className="pres-btn" onClick={next} disabled={currentSlide === totalSlides - 1} title="下一张 (→)">
            <svg viewBox="0 0 16 16" width="14" height="14"><path fill="currentColor" d="M5.5 3l5 5-5 5V3z"/></svg>
          </button>
        </div>
        <div className="presentation-controls-right">
          <button className="pres-btn" onClick={() => setShowNotes(v => !v)} title="演讲者备注 (N)">
            📝
          </button>
          <button className="pres-btn" onClick={toggleFullscreen} title="全屏 (F)">
            {isFullscreen ? '⛶' : '⛶'}
          </button>
          <button className="pres-btn pres-btn-close" onClick={() => setShowPresentation(false)} title="退出 (Esc)">
            ✕
          </button>
        </div>
      </div>

      {/* ── 进度条 ── */}
      <div className="presentation-progress">
        <div
          className="presentation-progress-bar"
          style={{ width: `${((currentSlide + 1) / totalSlides) * 100}%` }}
        />
      </div>

      {/* ── 演讲者备注 ── */}
      {showNotes && slide.notes && (
        <div className="presentation-notes">
          <div className="presentation-notes-label">📝 演讲者备注</div>
          <div dangerouslySetInnerHTML={{ __html: slide.notes }} />
        </div>
      )}

      {/* ── 缩略图导航 ── */}
      <div className="presentation-thumbnails">
        {slides.map((s, i) => (
          <button
            key={i}
            className={`pres-thumb ${i === currentSlide ? 'pres-thumb-active' : ''}`}
            onClick={() => goTo(i, i > currentSlide ? 'right' : 'left')}
          >
            <div className="pres-thumb-inner" dangerouslySetInnerHTML={{ __html: s.html }} />
            <span className="pres-thumb-num">{i + 1}</span>
          </button>
        ))}
      </div>
    </div>
  )

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }
}
