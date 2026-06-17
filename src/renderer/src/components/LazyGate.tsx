import React, { Suspense } from 'react'
import { useEditorStore } from '../store/editorStore'

/**
 * LazyGate — 仅在指定 store visibility 为 true 时才挂载（并按需加载）子组件。
 *
 * 用法：
 *   const LazySettings = React.lazy(() => import('./SettingsDialog').then(m => ({ default: m.SettingsDialog })))
 *   <LazyGate visible={s => s.showSettings} lazy={LazySettings} />
 *
 * - visibility 为 false 时不渲染任何内容，也不会触发懒加载 chunk 下载，
 *   从而显著减小首屏 bundle。
 * - 各 gate 各自订阅 store，与 App.tsx 隔离，避免 App 因 modal 切换而重渲染。
 */
interface LazyGateProps {
  /** 从 store 派生的可见性 selector */
  visible: (s: ReturnType<typeof useEditorStore.getState>) => boolean
  /** 已 React.lazy 包裹的组件 */
  lazy: React.LazyExoticComponent<React.ComponentType<any>>
  /** 懒加载时的 fallback，默认 null（占位极轻量） */
  fallback?: React.ReactNode
  /** 额外禁用条件（如 zenMode 下不显示），与 visible 取交集 */
  and?: boolean
}

export const LazyGate = React.memo(function LazyGate({
  visible,
  lazy,
  fallback = null,
  and = true,
}: LazyGateProps) {
  const isVisible = useEditorStore(visible) && and
  if (!isVisible) return null
  const Comp = lazy
  return (
    <Suspense fallback={fallback}>
      <Comp />
    </Suspense>
  )
})
