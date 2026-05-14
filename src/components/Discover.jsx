import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  fetchImageAsDataUrl,
  popularSeasonAniList,
  searchAniList,
  topRatedAniList,
  trendingAniList,
  upcomingAniList,
} from '../lib/anilist.js'
import { IconCheck, IconPlus, IconSearch, IconSparkle, IconX } from '../lib/icons.jsx'

const CATEGORIES = [
  { id: 'trending', label: 'Trending Now', loader: trendingAniList },
  { id: 'season', label: 'Popular This Season', loader: popularSeasonAniList },
  { id: 'top', label: 'All-Time Top', loader: topRatedAniList },
  { id: 'upcoming', label: 'Upcoming', loader: upcomingAniList },
]

export default function Discover({
  mediaMode,
  importedAnilistIds,
  onImport,
}) {
  const [tab, setTab] = useState('trending')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [importing, setImporting] = useState(null)
  const [preview, setPreview] = useState(null)
  const cache = useRef(new Map())
  const abortRef = useRef(0)

  const cacheKey = (tabId, mode, q) => `${tabId}:${mode}:${q || ''}`

  const load = useCallback(
    async (tabId, currentQuery) => {
      const key = cacheKey(tabId, mediaMode, currentQuery)
      const cached = cache.current.get(key)
      if (cached) {
        setResults(cached)
        setError('')
        return
      }
      setLoading(true)
      setError('')
      const reqId = ++abortRef.current
      try {
        let data
        if (tabId === 'search') {
          if (!currentQuery) {
            data = []
          } else {
            data = await searchAniList(currentQuery, mediaMode)
          }
        } else {
          const cat = CATEGORIES.find((c) => c.id === tabId)
          data = await cat.loader(mediaMode)
        }
        if (reqId !== abortRef.current) return
        cache.current.set(key, data)
        setResults(data)
      } catch (err) {
        if (reqId !== abortRef.current) return
        setError(err.message || 'Could not load from AniList')
        setResults([])
      } finally {
        if (reqId === abortRef.current) setLoading(false)
      }
    },
    [mediaMode]
  )

  /* Reload whenever tab or media mode changes (search has its own
     debounce path). */
  useEffect(() => {
    if (tab !== 'search') {
      load(tab, '')
    }
  }, [tab, mediaMode, load])

  /* Debounced search. */
  useEffect(() => {
    if (tab !== 'search') return undefined
    const t = setTimeout(() => {
      load('search', query.trim())
    }, 320)
    return () => clearTimeout(t)
  }, [query, tab, mediaMode, load])

  const importedSet = useMemo(
    () => new Set(importedAnilistIds || []),
    [importedAnilistIds]
  )

  const handleImport = useCallback(
    async (item) => {
      if (importedSet.has(item.anilistId)) return
      setImporting(item.anilistId)
      try {
        const dataUrl = await fetchImageAsDataUrl(item.cover)
        await onImport(item, dataUrl)
        setPreview(null)
      } finally {
        setImporting(null)
      }
    },
    [importedSet, onImport]
  )

  const tabs = [
    { id: 'search', label: 'Search' },
    ...CATEGORIES.map((c) => ({ id: c.id, label: c.label })),
  ]

  return (
    <section className="discover">
      <header className="discover-head glass">
        <div className="discover-head-text">
          <span className="list-tag">Discover via AniList</span>
          <h1 className="list-title">Find new {mediaMode === 'manga' ? 'manga' : 'anime'}</h1>
          <p className="list-subtitle">
            Browse trending titles, popular this season, and all-time
            top rated — pulled live from AniList. Tap a card to add it
            to your offline library with one tap.
          </p>
        </div>
        <div className="discover-pillrow">
          <div className="discover-tabs" role="tablist">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                className={`discover-tab ${tab === t.id ? 'active' : ''}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {tab === 'search' && (
        <div className="discover-searchbar glass">
          <IconSearch />
          <input
            type="search"
            placeholder={`Search AniList for ${mediaMode}…`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck="false"
            enterKeyHint="search"
          />
          {query && (
            <button
              type="button"
              className="search-clear"
              onClick={() => setQuery('')}
              aria-label="Clear"
            >
              <IconX />
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="discover-empty glass">
          <h2 className="empty-title">Could not load from AniList</h2>
          <p className="empty-text">{error}</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => load(tab, query.trim())}
          >
            Retry
          </button>
        </div>
      )}

      {!error && loading && results.length === 0 && (
        <div className="discover-grid">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="discover-card discover-skel" aria-hidden="true">
              <div className="discover-cover" />
              <div className="discover-card-body">
                <div className="discover-skel-line" />
                <div className="discover-skel-line short" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!error && !loading && tab === 'search' && !query && (
        <div className="discover-empty glass">
          <div className="empty-icon">
            <IconSearch />
          </div>
          <h2 className="empty-title">Search AniList</h2>
          <p className="empty-text">
            Type a title to find it on AniList. Anime and manga both
            supported — switch in the sidebar.
          </p>
        </div>
      )}

      {!error && !loading && results.length === 0 && tab === 'search' && query && (
        <div className="discover-empty glass">
          <div className="empty-icon">
            <IconSparkle />
          </div>
          <h2 className="empty-title">No matches</h2>
          <p className="empty-text">
            Try a slightly different spelling, or switch to {mediaMode === 'manga' ? 'anime' : 'manga'}.
          </p>
        </div>
      )}

      {results.length > 0 && (
        <div className="discover-grid">
          {results.map((item) => {
            const imported = importedSet.has(item.anilistId)
            return (
              <button
                key={item.anilistId}
                type="button"
                className={`discover-card ${imported ? 'is-imported' : ''}`}
                onClick={() => setPreview(item)}
              >
                <div
                  className="discover-cover"
                  style={
                    item.coverColor
                      ? { background: item.coverColor }
                      : undefined
                  }
                >
                  {item.cover && (
                    <img
                      src={item.cover}
                      alt=""
                      loading="lazy"
                      decoding="async"
                    />
                  )}
                  {imported && (
                    <span className="discover-imported-pill">
                      <IconCheck size={14} /> In library
                    </span>
                  )}
                  {item.score > 0 && (
                    <span className="discover-score-pill">
                      {Math.round(item.score)}
                    </span>
                  )}
                </div>
                <div className="discover-card-body">
                  <div className="discover-card-title">{item.title}</div>
                  <div className="discover-card-meta">
                    {item.format ? formatLabel(item.format) : ''}
                    {item.format && (item.year || item.episodes) ? ' · ' : ''}
                    {item.year}
                    {item.year && item.episodes ? ' · ' : ''}
                    {item.episodes
                      ? `${item.episodes} ep`
                      : item.chapters
                      ? `${item.chapters} ch`
                      : ''}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {preview && (
        <PreviewSheet
          item={preview}
          imported={importedSet.has(preview.anilistId)}
          importing={importing === preview.anilistId}
          onClose={() => setPreview(null)}
          onImport={handleImport}
        />
      )}
    </section>
  )
}

function PreviewSheet({ item, imported, importing, onClose, onImport }) {
  return (
    <div
      className="discover-modal"
      role="dialog"
      aria-modal="true"
      aria-label={item.title}
      onClick={onClose}
    >
      <div className="discover-sheet glass" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="btn btn-icon btn-ghost discover-sheet-close"
          aria-label="Close"
          onClick={onClose}
        >
          <IconX />
        </button>

        <div
          className={`discover-sheet-banner${item.banner ? '' : ' discover-sheet-banner-empty'}`}
        >
          {item.banner && <img src={item.banner} alt="" />}
        </div>

        <div className="discover-sheet-body">
          <div className="discover-sheet-cover">
            {item.cover && <img src={item.cover} alt="" />}
          </div>
          <div className="discover-sheet-text">
            <h2>{item.title}</h2>
            <div className="discover-sheet-meta">
              {item.format && <span>{formatLabel(item.format)}</span>}
              {item.season && <span>{item.season}</span>}
              {!item.season && item.year && <span>{item.year}</span>}
              {item.studio && <span>{item.studio}</span>}
              {item.score > 0 && <span>{Math.round(item.score)} / 100</span>}
            </div>
            <div className="discover-sheet-stats">
              {item.episodes > 0 && (
                <div>
                  <div className="stat-label">Episodes</div>
                  <div className="stat-value">{item.episodes}</div>
                </div>
              )}
              {item.chapters > 0 && (
                <div>
                  <div className="stat-label">Chapters</div>
                  <div className="stat-value">{item.chapters}</div>
                </div>
              )}
              {item.volumes > 0 && (
                <div>
                  <div className="stat-label">Volumes</div>
                  <div className="stat-value">{item.volumes}</div>
                </div>
              )}
              {item.duration > 0 && (
                <div>
                  <div className="stat-label">Per ep</div>
                  <div className="stat-value">{item.duration}m</div>
                </div>
              )}
            </div>
            {item.genres?.length > 0 && (
              <div className="discover-sheet-tags">
                {item.genres.slice(0, 8).map((g) => (
                  <span key={g} className="discover-tag">
                    {g}
                  </span>
                ))}
              </div>
            )}
            {item.description && (
              <p className="discover-sheet-desc">{item.description}</p>
            )}
            <div className="discover-sheet-actions">
              <button
                type="button"
                className="btn btn-primary"
                disabled={imported || importing}
                onClick={() => onImport(item)}
              >
                {imported ? (
                  <>
                    <IconCheck /> In library
                  </>
                ) : importing ? (
                  <>Importing…</>
                ) : (
                  <>
                    <IconPlus /> Add to library
                  </>
                )}
              </button>
              {item.siteUrl && (
                <a
                  className="btn btn-ghost"
                  href={item.siteUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  View on AniList
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function formatLabel(f) {
  if (!f) return ''
  return f
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
