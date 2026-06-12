/**
 * 写作会话统计面板
 *
 * 追踪当前写作会话的实时数据：
 * - 会话时长
 * - 本次新增字数 / 词数
 * - 实时打字速度（WPM / 字符/分钟）
 * - 每日写作连续天数
 * - 字数目标进度
 *
 * 数据通过 localStorage 持久化连续天数。
 */
import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useEditorStore } from '../store/editorStore'

interface SessionData {
  startTime: number
  startWordCount: number
  startCharCount: number
}

interface DailyRecord {
  date: string      // YYYY-MM-DD
  wordCount: number // 当日总写作词数
}

const STREAK_KEY = 'markflow-writing-streak'
const SESSION_KEY = 'markflow-writing-session'

function countWords(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  // 中文：每个字符算一个词；英文：空格分隔
  const chineseChars = (trimmed.match(/[一-鿿㐀-䶿]/g) || []).length
  const englishWords = trimmed
    .replace(/[一-鿿㐀-䶿]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 0).length
  return chineseChars + englishWords
}

function countChars(text: string): number {
  return text.replace(/\s/g, '').length
}

function getTodayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function loadDailyRecords(): DailyRecord[] {
  try {
    return JSON.parse(localStorage.getItem(STREAK_KEY) || '[]')
  } catch { return [] }
}

function saveDailyRecords(records: DailyRecord[]) {
  try {
    localStorage.setItem(STREAK_KEY, JSON.stringify(records.slice(-365)))
  } catch { /* noop */ }
}

function calcStreak(records: DailyRecord[]): number {
  if (records.length === 0) return 0
  let streak = 0
  const today = new Date()
  // 检查今天或昨天是否有记录
  for (let offset = 0; offset < 400; offset++) {
    const d = new Date(today)
    d.setDate(d.getDate() - offset)
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const record = records.find(r => r.date === dateStr)
    if (record && record.wordCount > 0) {
      streak++
    } else if (offset > 0) {
      break
    }
    // offset === 0 允许今天还没写
  }
  return streak
}

export function WritingStats() {
  const { tabs, activeTabId, showWritingStats, setShowWritingStats, wordGoal } = useEditorStore()
  const activeTab = tabs.find(t => t.id === activeTabId)

  const [session, setSession] = useState<SessionData | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [wpm, setWpm] = useState(0)
  const [streak, setStreak] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const keystrokeTimesRef = useRef<number[]>([])
  const prevWordCountRef = useRef(0)

  const currentWordCount = useMemo(() => countWords(activeTab?.content || ''), [activeTab?.content])
  const currentCharCount = useMemo(() => countChars(activeTab?.content || ''), [activeTab?.content])
  const wordsWritten = session ? Math.max(0, currentWordCount - session.startWordCount) : 0
  const charsWritten = session ? Math.max(0, currentCharCount - session.startCharCount) : 0

  // 会话管理：当面板打开时开始追踪
  useEffect(() => {
    if (!showWritingStats) return
    if (!activeTab) return

    // 加载已有会话或创建新会话
    try {
      const saved = localStorage.getItem(SESSION_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as SessionData & { tabContent?: string }
        // 如果 tab 没变，恢复会话
        if (parsed.startTime) {
          setSession({ startTime: parsed.startTime, startWordCount: parsed.startWordCount, startCharCount: parsed.startCharCount })
        } else {
          startNewSession()
        }
      } else {
        startNewSession()
      }
    } catch {
      startNewSession()
    }

    // 计算连续天数
    const records = loadDailyRecords()
    setStreak(calcStreak(records))

    return () => {
      // 保存会话
      if (session) {
        try {
          localStorage.setItem(SESSION_KEY, JSON.stringify(session))
        } catch { /* noop */ }
      }
    }
  }, [showWritingStats, activeTabId])

  function startNewSession() {
    const wc = countWords(activeTab?.content || '')
    const cc = countChars(activeTab?.content || '')
    const newSession: SessionData = {
      startTime: Date.now(),
      startWordCount: wc,
      startCharCount: cc,
    }
    setSession(newSession)
    prevWordCountRef.current = wc
    keystrokeTimesRef.current = []
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(newSession))
    } catch { /* noop */ }
  }

  // 计时器
  useEffect(() => {
    if (!showWritingStats || !session) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }

    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - session.startTime) / 1000))
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [showWritingStats, session])

  // 追踪打字速度（监听 content 变化）
  useEffect(() => {
    if (!showWritingStats || !session) return

    const delta = currentWordCount - prevWordCountRef.current
    if (delta > 0) {
      const now = Date.now()
      keystrokeTimesRef.current.push(now)
      // 只保留最近 60 秒的记录
      keystrokeTimesRef.current = keystrokeTimesRef.current.filter(t => now - t < 60000)
    }
    prevWordCountRef.current = currentWordCount

    // 计算最近 60 秒的 WPM
    const recentTimes = keystrokeTimesRef.current
    if (recentTimes.length >= 2) {
      const span = (recentTimes[recentTimes.length - 1] - recentTimes[0]) / 60000
      if (span > 0) {
        setWpm(Math.round(recentTimes.length / span))
      }
    } else {
      setWpm(0)
    }
  }, [currentWordCount, showWritingStats, session])

  // 更新每日写作记录
  useEffect(() => {
    if (!showWritingStats || wordsWritten === 0) return

    const records = loadDailyRecords()
    const today = getTodayStr()
    const existing = records.findIndex(r => r.date === today)
    if (existing >= 0) {
      records[existing].wordCount = Math.max(records[existing].wordCount, wordsWritten)
    } else {
      records.push({ date: today, wordCount: wordsWritten })
    }
    saveDailyRecords(records)
    setStreak(calcStreak(records))
  }, [wordsWritten, showWritingStats])

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`
    if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`
    return `${s}s`
  }

  const goalProgress = wordGoal > 0 && currentWordCount > 0
    ? Math.min(100, Math.round((currentWordCount / wordGoal) * 100))
    : 0

  const resetSession = useCallback(() => {
    startNewSession()
    setElapsed(0)
    setWpm(0)
  }, [activeTab?.content])

  if (!showWritingStats) return null

  return (
    <div className="writing-stats-overlay" onClick={() => setShowWritingStats(false)}>
      <div className="writing-stats-modal" onClick={e => e.stopPropagation()}>
        {/* ── 头部 ── */}
        <div className="writing-stats-header">
          <h3>📊 写作统计</h3>
          <div className="writing-stats-header-actions">
            <button className="writing-stats-reset" onClick={resetSession} title="重置会话">
              🔄 重置
            </button>
            <button className="writing-stats-close" onClick={() => setShowWritingStats(false)}>×</button>
          </div>
        </div>

        {/* ── 核心统计 ── */}
        <div className="writing-stats-grid">
          <div className="writing-stats-card">
            <div className="writing-stats-card-icon">⏱</div>
            <div className="writing-stats-card-value">{formatDuration(elapsed)}</div>
            <div className="writing-stats-card-label">会话时长</div>
          </div>
          <div className="writing-stats-card">
            <div className="writing-stats-card-icon">✍️</div>
            <div className="writing-stats-card-value">{wordsWritten}</div>
            <div className="writing-stats-card-label">新增词数</div>
          </div>
          <div className="writing-stats-card">
            <div className="writing-stats-card-icon">🔤</div>
            <div className="writing-stats-card-value">{charsWritten}</div>
            <div className="writing-stats-card-label">新增字符</div>
          </div>
          <div className="writing-stats-card">
            <div className="writing-stats-card-icon">⚡</div>
            <div className="writing-stats-card-value">{wpm > 0 ? `${wpm}` : '—'}</div>
            <div className="writing-stats-card-label">词/分钟 (WPM)</div>
          </div>
          <div className="writing-stats-card">
            <div className="writing-stats-card-icon">📄</div>
            <div className="writing-stats-card-value">{currentWordCount}</div>
            <div className="writing-stats-card-label">总词数</div>
          </div>
          <div className="writing-stats-card">
            <div className="writing-stats-card-icon">🔥</div>
            <div className="writing-stats-card-value">{streak}</div>
            <div className="writing-stats-card-label">连续天数</div>
          </div>
        </div>

        {/* ── 字数目标进度 ── */}
        {wordGoal > 0 && (
          <div className="writing-stats-goal">
            <div className="writing-stats-goal-header">
              <span>🎯 字数目标</span>
              <span>{currentWordCount} / {wordGoal} ({goalProgress}%)</span>
            </div>
            <div className="writing-stats-goal-bar">
              <div
                className="writing-stats-goal-fill"
                style={{
                  width: `${goalProgress}%`,
                  background: goalProgress >= 100
                    ? 'linear-gradient(90deg, #4caf50, #66bb6a)'
                    : 'linear-gradient(90deg, var(--accent), var(--accent-light))',
                }}
              />
            </div>
            {goalProgress >= 100 && (
              <div className="writing-stats-goal-done">🎉 目标达成！</div>
            )}
          </div>
        )}

        {/* ── 会话信息 ── */}
        <div className="writing-stats-footer">
          <span>💡 快捷键 Ctrl+Shift+W 开启/关闭写作统计</span>
          {session && (
            <span className="writing-stats-session-time">
              会话开始于 {new Date(session.startTime).toLocaleTimeString('zh-CN')}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
