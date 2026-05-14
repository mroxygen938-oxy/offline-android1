import { useLayoutEffect, useRef, useState } from 'react'
import { ICON_MAP } from '../lib/iconMap.js'
import { IconX } from '../lib/icons.jsx'
import ThemeToggle from './ThemeToggle.jsx'

export default function Sidebar({
  mediaMode,
  onChangeMode,
  lists,
  activeList,
  onSelect,
  counts,
  theme,
  onTheme,
  totalCount,
  allLabel,
  sectionTitle,
  onClose,
  view,
  onSelectView,
}) {
  /* Sliding glass pill that tracks the active nav item. We measure
     the active button's position relative to the .nav container
     whenever the active list (or layout) changes, then translate the
     pill to that spot via a transform-only transition. */
  const navRef = useRef(null)
  const itemRefs = useRef(new Map())
  const [pill, setPill] = useState({ top: 0, height: 0, ready: false })

  /* The sliding pill follows whichever nav button is active. When
     viewing Discover, key off 'discover'; otherwise key off the
     active list id. */
  const activeKey = view === 'discover' ? 'discover' : activeList

  useLayoutEffect(() => {
    const navEl = navRef.current
    const btn = itemRefs.current.get(activeKey)
    if (!navEl || !btn) {
      setPill((p) => ({ ...p, ready: false }))
      return
    }
    const navRect = navEl.getBoundingClientRect()
    const btnRect = btn.getBoundingClientRect()
    setPill({
      top: btnRect.top - navRect.top + navEl.scrollTop,
      height: btnRect.height,
      ready: true,
    })
  }, [activeKey, lists, mediaMode, totalCount])

  const setItemRef = (key) => (el) => {
    if (el) itemRefs.current.set(key, el)
    else itemRefs.current.delete(key)
  }
  return (
    <aside className="sidebar glass" role="navigation" aria-label="Lists navigation">
      <div className="brand">
        <div className="brand-logo" aria-hidden="true">
          <img src="./logo.png" alt="" width="42" height="42" />
        </div>
        <div>
          <div className="brand-title">Oxygen Vault</div>
          <div className="brand-subtitle">{sectionTitle}</div>
        </div>
        {onClose && (
          <button
            type="button"
            className="sidebar-close btn btn-icon btn-ghost"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <IconX />
          </button>
        )}
      </div>

      <div className="mode-switch" role="tablist" aria-label="Media type">
        <button
          type="button"
          role="tab"
          aria-selected={mediaMode === 'anime'}
          className={`mode-tab ${mediaMode === 'anime' ? 'active' : ''}`}
          onClick={() => onChangeMode('anime')}
        >
          <span className="mode-tab-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="5" width="18" height="14" rx="2.5" />
              <polygon points="10 9 15 12 10 15" fill="currentColor" stroke="none" />
            </svg>
          </span>
          Anime
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mediaMode === 'manga'}
          className={`mode-tab ${mediaMode === 'manga' ? 'active' : ''}`}
          onClick={() => onChangeMode('manga')}
        >
          <span className="mode-tab-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 5.5C4 4.7 4.7 4 5.5 4H11v15H5.5C4.7 19 4 18.3 4 17.5v-12z" />
              <path d="M20 5.5C20 4.7 19.3 4 18.5 4H13v15h5.5c.8 0 1.5-.7 1.5-1.5v-12z" />
              <line x1="6.5" y1="8" x2="9" y2="8" />
              <line x1="6.5" y1="11" x2="9" y2="11" />
              <line x1="15" y1="8" x2="17.5" y2="8" />
              <line x1="15" y1="11" x2="17.5" y2="11" />
            </svg>
          </span>
          Manga
        </button>
      </div>

      <nav className="nav" aria-label="Lists" ref={navRef}>
        <span
          className="nav-active-pill"
          aria-hidden="true"
          style={{
            transform: `translate3d(0, ${pill.top}px, 0)`,
            height: `${pill.height}px`,
            opacity: pill.ready && pill.height > 0 ? 1 : 0,
          }}
        />
        <div className="nav-section">Discover</div>
        <button
          type="button"
          ref={setItemRef('discover')}
          className={`nav-item ${view === 'discover' ? 'active' : ''}`}
          onClick={() => onSelectView && onSelectView('discover')}
        >
          <span className="nav-icon">
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="9" />
              <polygon points="15 9 13 13 9 15 11 11" fill="currentColor" stroke="none" />
            </svg>
          </span>
          <span>Discover</span>
          <span className="nav-count" aria-hidden="true">•</span>
        </button>

        <div className="nav-section">Library</div>
        <button
          type="button"
          ref={setItemRef('all')}
          className={`nav-item ${view !== 'discover' && activeList === 'all' ? 'active' : ''}`}
          onClick={() => onSelect('all')}
        >
          <span className="nav-icon">
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" />
            </svg>
          </span>
          <span>{allLabel}</span>
          <span className="nav-count">{totalCount}</span>
        </button>

        <div className="nav-section">Lists</div>
        {lists.map((list) => {
          const Icon = ICON_MAP[list.icon]
          return (
            <button
              key={list.id}
              type="button"
              ref={setItemRef(list.id)}
              className={`nav-item ${view !== 'discover' && activeList === list.id ? 'active' : ''}`}
              onClick={() => onSelect(list.id)}
            >
              <span className="nav-icon">
                <Icon />
              </span>
              <span>{list.name}</span>
              <span className="nav-count">{counts[list.id] ?? 0}</span>
            </button>
          )
        })}
      </nav>

      <div className="sidebar-footer">
        <ThemeToggle theme={theme} onChange={onTheme} />
        <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--fg-3)' }}>v1.0</div>
      </div>
    </aside>
  )
}
