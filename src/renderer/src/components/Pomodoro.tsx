/**
 * 番茄钟 (Pomodoro Timer)
 * — 25 分钟专注写作 + 5 分钟休息循环，提升写作专注度
 * — 灵感来自番茄工作法及各类写作专注工具
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useEditorStore } from '../store/editorStore'

type Phase = 'focus' | 'break'

const FOCUS_SECONDS = 25 * 60
const BREAK_SECONDS = 5 * 60

let audioCtx: AudioContext | null = null
function playChime() {
  try {
    if (!audioCtx) audioCtx = new AudioContext()
    const ctx = audioCtx
    const now = ctx.currentTime
    ;[880, 1108, 1318].forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0, now + i * 0.18)
      gain.gain.linearRampToValueAtTime(0.15, now + i * 0.18 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.18 + 0.4)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + i * 0.18)
      osc.stop(now + i * 0.18 + 0.4)
    })
  } catch { /* noop */ }
}

function fmt(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function Pomodoro() {
  const { showPomodoro, setShowPomodoro } = useEditorStore()
  const [phase, setPhase] = useState<Phase>('focus')
  const [remaining, setRemaining] = useState(FOCUS_SECONDS)
  const [running, setRunning] = useState(false)
  const [completedFocus, setCompletedFocus] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const total = phase === 'focus' ? FOCUS_SECONDS : BREAK_SECONDS

  const switchPhase = useCallback((next: Phase) => {
    setPhase(next)
    setRemaining(next === 'focus' ? FOCUS_SECONDS : BREAK_SECONDS)
  }, [])

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
      return
    }
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          playChime()
          if (phase === 'focus') {
            setCompletedFocus(c => c + 1)
            switchPhase('break')
            return BREAK_SECONDS
          } else {
            switchPhase('focus')
            return FOCUS_SECONDS
          }
        }
        return prev - 1
      })
    }, 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running, phase, switchPhase])

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [])

  if (!showPomodoro) return null

  const progress = ((total - remaining) / total) * 100
  const circumference = 2 * Math.PI * 52
  const dashOffset = circumference * (1 - progress / 100)

  return (
    <div className="pomodoro-overlay" onClick={() => setShowPomodoro(false)}>
      <div className="pomodoro-modal" onClick={e => e.stopPropagation()}>
        <div className="pomodoro-header">
          <span className={`pomodoro-phase ${phase}`}>{phase === 'focus' ? '🍅 专注' : '☕ 休息'}</span>
          <button className="pomodoro-close" onClick={() => setShowPomodoro(false)}>×</button>
        </div>
        <div className="pomodoro-ring">
          <svg width="140" height="140" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" className="pomodoro-ring-bg" fill="none" strokeWidth="8" />
            <circle
              cx="60" cy="60" r="52" fill="none" strokeWidth="8"
              className={`pomodoro-ring-fg ${phase}`}
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              transform="rotate(-90 60 60)"
            />
          </svg>
          <div className="pomodoro-time">{fmt(remaining)}</div>
        </div>
        <div className="pomodoro-controls">
          <button className="pomodoro-btn primary" onClick={() => setRunning(r => !r)}>
            {running ? '⏸ 暂停' : '▶ 开始'}
          </button>
          <button className="pomodoro-btn" onClick={() => { setRunning(false); setRemaining(total) }}>↻ 重置</button>
          <button className="pomodoro-btn" onClick={() => switchPhase(phase === 'focus' ? 'break' : 'focus')}>
            ⇄ {phase === 'focus' ? '休息' : '专注'}
          </button>
        </div>
        <div className="pomodoro-stats">
          今日完成 <strong>{completedFocus}</strong> 个番茄
        </div>
      </div>
    </div>
  )
}
