import { useEffect, useRef, useState } from 'react'
import ThemeToggle from './ThemeToggle.jsx'
import { IconDots } from '../lib/icons.jsx'

export default function AppMenu({ onExport, onImport, theme, onTheme }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  const fileRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onDocClick = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const hasDesktopBridge =
    typeof window !== 'undefined' &&
    Boolean(window.oxygenElectron || window.oxygenNative)

  const triggerImport = () => {
    setOpen(false)
    if (hasDesktopBridge) {
      /* Desktop hosts (Electron or WPF/WebView2): skip the hidden
         <input> and let the host show a real Open dialog. */
      onImport(null)
    } else {
      fileRef.current?.click()
    }
  }

  const onFile = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) onImport(file)
  }

  return (
    <div className="user-chip-wrap" ref={wrapRef}>
      <button
        type="button"
        className="user-chip"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open menu"
      >
        <span className="user-chip-avatar" aria-hidden="true">
          <IconDots />
        </span>
      </button>

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        style={{ display: 'none' }}
        onChange={onFile}
      />

      {open && (
        <div className="user-popover glass-strong" role="menu">
          <div className="user-popover-info">
            <div className="user-popover-name">Oxygen Vault</div>
            <div className="user-popover-email">Offline · stored on this device</div>
          </div>
          <div className="user-popover-row">
            <ThemeToggle theme={theme} onChange={onTheme} />
          </div>
          <button
            type="button"
            className="user-popover-logout btn btn-ghost"
            onClick={() => {
              setOpen(false)
              onExport()
            }}
          >
            <span>Export backup</span>
          </button>
          <button
            type="button"
            className="user-popover-logout btn btn-ghost"
            onClick={triggerImport}
          >
            <span>Import backup</span>
          </button>
        </div>
      )}
    </div>
  )
}
