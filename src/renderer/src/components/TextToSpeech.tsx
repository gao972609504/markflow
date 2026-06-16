/**
 * 朗读模式 (Read Aloud / Text-to-Speech)
 * — 使用浏览器原生 SpeechSynthesis API 朗读文档
 * — 灵感来自 Obsidian Read Aloud 插件，辅助校对与无障碍阅读
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useEditorStore } from '../store/editorStore'

export function TextToSpeech() {
  const { showTTS, setShowTTS, tabs, activeTabId } = useEditorStore()
  const [rate, setRate] = useState(1)
  const [voiceURI, setVoiceURI] = useState('')
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [speaking, setSpeaking] = useState(false)
  const [paused, setPaused] = useState(false)
  const [chunkIdx, setChunkIdx] = useState(0)
  const [chunks, setChunks] = useState<string[]>([])
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null)

  const activeTab = tabs.find(t => t.id === activeTabId)

  useEffect(() => {
    const load = () => {
      const v = window.speechSynthesis?.getVoices() || []
      setVoices(v)
      if (v.length && !voiceURI) {
        const zh = v.find(x => x.lang.startsWith('zh'))
        setVoiceURI((zh || v[0]).voiceURI)
      }
    }
    load()
    window.speechSynthesis?.addEventListener?.('voiceschanged', load)
    return () => window.speechSynthesis?.removeEventListener?.('voiceschanged', load)
  }, [voiceURI])

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel()
    setSpeaking(false); setPaused(false); setChunkIdx(0)
  }, [])

  const speakFrom = useCallback((startIdx: number, textChunks: string[], r: number, uri: string) => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const speak = (idx: number) => {
      if (idx >= textChunks.length) { setSpeaking(false); setPaused(false); setChunkIdx(0); return }
      setChunkIdx(idx)
      const u = new SpeechSynthesisUtterance(textChunks[idx])
      u.rate = r
      const v = voices.find(x => x.voiceURI === uri)
      if (v) u.voice = v
      u.onend = () => { if (speakingRef.current && !pausedRef.current) speak(idx + 1) }
      utterRef.current = u
      window.speechSynthesis.speak(u)
    }
    speak(startIdx)
  }, [voices])

  const speakingRef = useRef(false)
  const pausedRef = useRef(false)
  useEffect(() => { speakingRef.current = speaking }, [speaking])
  useEffect(() => { pausedRef.current = paused }, [paused])

  const start = () => {
    if (!activeTab?.content?.trim()) return
    const text = activeTab.content
      .replace(/```[\s\S]*?```/g, ' 代码块 ')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' 图片 ')
      .replace(/\$\$[\s\S]*?\$\$/g, ' 数学公式 ')
      .replace(/[#>*_`~\-\[\]()|]/g, ' ')
    const cs = text.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean)
    setChunks(cs); setSpeaking(true); setPaused(false); setChunkIdx(0)
    speakFrom(0, cs, rate, voiceURI)
  }

  const togglePause = () => {
    if (!window.speechSynthesis) return
    if (paused) { window.speechSynthesis.resume(); setPaused(false) }
    else { window.speechSynthesis.pause(); setPaused(true) }
  }

  const skip = (dir: 1 | -1) => {
    const next = Math.max(0, Math.min(chunks.length - 1, chunkIdx + dir))
    speakFrom(next, chunks, rate, voiceURI)
    setSpeaking(true); setPaused(false)
  }

  useEffect(() => () => { window.speechSynthesis?.cancel() }, [])
  useEffect(() => { if (!showTTS) stop() }, [showTTS, stop])

  if (!showTTS) return null

  return (
    <div className="tts-bar">
      <span className="tts-title">🔊 朗读</span>
      <button className="tts-btn" onClick={() => speaking ? stop() : start()} title={speaking ? '停止' : '朗读全文'}>
        {speaking ? '⏹' : '▶'}
      </button>
      <button className="tts-btn" onClick={togglePause} disabled={!speaking} title={paused ? '继续' : '暂停'}>
        {paused ? '▶' : '⏸'}
      </button>
      <button className="tts-btn" onClick={() => skip(-1)} disabled={!speaking} title="上一段">⏮</button>
      <button className="tts-btn" onClick={() => skip(1)} disabled={!speaking} title="下一段">⏭</button>
      <label className="tts-rate">
        语速 <input type="range" min="0.5" max="2" step="0.1" value={rate}
          onChange={e => setRate(parseFloat(e.target.value))} /> <span>{rate.toFixed(1)}x</span>
      </label>
      <select className="tts-voice" value={voiceURI} onChange={e => setVoiceURI(e.target.value)}>
        {voices.slice(0, 30).map(v => <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>)}
      </select>
      {speaking && <span className="tts-pos">{chunkIdx + 1}/{chunks.length}</span>}
      <button className="tts-close" onClick={() => setShowTTS(false)}>×</button>
    </div>
  )
}
