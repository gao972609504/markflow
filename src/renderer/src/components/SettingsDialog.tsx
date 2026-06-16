/**
 * 设置中心 (Settings Hub)
 * — 集中管理编辑器偏好：字号、字体、Tab、自动保存延迟、行号、换行、相对行号、护眼
 */
import { useEditorStore } from '../store/editorStore'

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="settings-row">
      <span className="settings-label">{label}</span>
      <div className="settings-control">{children}</div>
    </div>
  )
}

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button className={`settings-toggle${on ? ' on' : ''}`} onClick={onChange} role="switch" aria-checked={on}>
      <span className="settings-toggle-knob" />
    </button>
  )
}

export function SettingsDialog() {
  const s = useEditorStore()
  if (!s.showSettings) return null

  const fonts = [
    { v: '', label: '系统默认' },
    { v: '"LXGW WenKai", "Source Serif 4", serif', label: '霞鹜文楷（衬线）' },
    { v: '"JetBrains Mono", monospace', label: '等宽' },
    { v: 'Georgia, "Songti SC", serif', label: 'Georgia 宋体' },
  ]

  return (
    <div className="settings-overlay" onClick={() => s.setShowSettings(false)}>
      <div className="settings-modal" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <span>⚙️ 设置</span>
          <button className="settings-close" onClick={() => s.setShowSettings(false)}>×</button>
        </div>
        <div className="settings-body">
          <div className="settings-section">编辑器外观</div>
          <Row label={`字号 (${s.fontSize}px)`}>
            <input type="range" min="11" max="24" step="0.5" value={s.fontSize}
              onChange={e => s.setFontSize(parseFloat(e.target.value))} />
            <button className="settings-mini" onClick={() => s.resetFontSize()}>重置</button>
          </Row>
          <Row label="正文字体">
            <select className="settings-select" value={s.fontFamily} onChange={e => s.setFontFamily(e.target.value)}>
              {fonts.map(f => <option key={f.label} value={f.v}>{f.label}</option>)}
            </select>
          </Row>
          <Row label="Tab 宽度">
            <select className="settings-select" value={s.tabSize} onChange={e => s.setTabSize(parseInt(e.target.value, 10))}>
              <option value={2}>2 空格</option>
              <option value={4}>4 空格</option>
              <option value={8}>8 空格</option>
            </select>
          </Row>

          <div className="settings-section">显示与编辑</div>
          <Row label="显示行号"><Toggle on={s.showLineNumbers} onChange={() => s.toggleLineNumbers()} /></Row>
          <Row label="相对行号"><Toggle on={s.relativeLineNumbers} onChange={() => s.toggleRelativeLineNumbers()} /></Row>
          <Row label="自动换行"><Toggle on={s.wordWrap} onChange={() => s.toggleWordWrap()} /></Row>
          <Row label="护眼模式"><Toggle on={s.eyeCare} onChange={() => s.toggleEyeCare()} /></Row>

          <div className="settings-section">保存</div>
          <Row label="自动保存">
            <Toggle on={s.autoSave} onChange={() => s.toggleAutoSave()} />
          </Row>
          {s.autoSave && (
            <Row label="保存延迟">
              <select className="settings-select" value={s.autoSaveDelay} onChange={e => s.setAutoSaveDelay(parseInt(e.target.value, 10))}>
                <option value={1000}>1 秒</option>
                <option value={2000}>2 秒</option>
                <option value={5000}>5 秒</option>
                <option value={10000}>10 秒</option>
              </select>
            </Row>
          )}
        </div>
      </div>
    </div>
  )
}
