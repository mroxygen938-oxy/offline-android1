import { useEffect, useRef } from 'react'
import { getLists } from '../lib/lists.js'
import { ICON_MAP } from '../lib/iconMap.js'
import { IconCheck } from '../lib/icons.jsx'

export default function MovePopover({ anchorRect, mediaMode = 'anime', currentList, onSelect, onClose }) {
  const lists = getLists(mediaMode)
  const ref = useRef(null)

  useEffect(() => {
    const onDown = (e) => {
      if (!ref.current) return
      if (!ref.current.contains(e.target)) onClose()
    }
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  if (!anchorRect) return null

  const width = 220
  let left = anchorRect.right - width
  let top = anchorRect.bottom + 8
  left = Math.max(12, Math.min(left, window.innerWidth - width - 12))
  top = Math.max(12, Math.min(top, window.innerHeight - 320))

  return (
    <div
      ref={ref}
      className="glass-strong"
      role="menu"
      aria-label="Move to list"
      style={{
        position: 'fixed',
        top,
        left,
        width,
        zIndex: 150,
        padding: 8,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        animation: 'rise 0.2s var(--ease)',
      }}
    >
      <div
        style={{
          padding: '6px 10px 8px',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'var(--fg-3)',
        }}
      >
        Move to
      </div>
      {lists.map((l) => {
        const Icon = ICON_MAP[l.icon]
        const isCurrent = l.id === currentList
        return (
          <button
            key={l.id}
            type="button"
            role="menuitem"
            className="nav-item"
            style={{ padding: '9px 10px' }}
            onClick={() => onSelect(l.id)}
          >
            <span className="nav-icon">
              <Icon />
            </span>
            <span style={{ fontSize: 13 }}>{l.name}</span>
            {isCurrent && (
              <span style={{ marginLeft: 'auto', color: 'var(--accent-a)' }}>
                <IconCheck size={16} />
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
