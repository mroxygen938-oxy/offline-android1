import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Sidebar from './components/Sidebar.jsx'
import AnimeCard from './components/AnimeCard.jsx'
import AnimeModal from './components/AnimeModal.jsx'
import MovePopover from './components/MovePopover.jsx'
import AppMenu from './components/AppMenu.jsx'
import Discover from './components/Discover.jsx'
import {
  getListById,
  getListIds,
  getLists,
  getModeConfig,
} from './lib/lists.js'
import { uid, useLocalStorage } from './lib/storage.js'
import { exportLibrary, importLibrary } from './lib/backup.js'
import { IconMenu, IconPlus, IconSearch, IconSparkle, IconX } from './lib/icons.jsx'

/* Single-tenant: this APK is for one user (the device owner) so we
   don't namespace storage keys per Telegram ID anymore — everything
   goes straight in localStorage under a stable key. */
const KEY_ANIME = 'oxygen-vault-offline/animes/v1'
const KEY_MANGA = 'oxygen-vault-offline/mangas/v1'
const KEY_LIST_ANIME = 'oxygen-vault-offline/active-list-anime'
const KEY_LIST_MANGA = 'oxygen-vault-offline/active-list-manga'
const KEY_MODE = 'oxygen-vault-offline/media-mode'
const KEY_THEME = 'oxygen-vault-offline/theme'
const KEY_VIEW = 'oxygen-vault-offline/view'

const SAMPLE_ANIME = () => [
  {
    id: uid(),
    title: "Frieren: Beyond Journey's End",
    image: '',
    list: 'watching',
    totalEpisodes: 28,
    watchedEpisodes: 18,
    year: '2023',
    studio: 'Madhouse',
    rating: 5,
    notes: 'Slow, melancholic, gorgeous.',
    createdAt: Date.now() - 4000,
  },
  {
    id: uid(),
    title: 'Vinland Saga',
    image: '',
    list: 'completed',
    totalEpisodes: 48,
    watchedEpisodes: 48,
    year: '2019',
    studio: 'Wit / MAPPA',
    rating: 5,
    notes: '',
    createdAt: Date.now() - 3000,
  },
  {
    id: uid(),
    title: 'Mushoku Tensei',
    image: '',
    list: 'onHold',
    totalEpisodes: 23,
    watchedEpisodes: 11,
    year: '2021',
    studio: 'Bind',
    rating: 4,
    notes: '',
    createdAt: Date.now() - 2000,
  },
  {
    id: uid(),
    title: 'Dandadan',
    image: '',
    list: 'planToWatch',
    totalEpisodes: 12,
    watchedEpisodes: 0,
    year: '2024',
    studio: 'Science SARU',
    rating: 0,
    notes: '',
    createdAt: Date.now() - 1000,
  },
]

const SAMPLE_MANGA = () => [
  {
    id: uid(),
    title: 'Berserk',
    image: '',
    list: 'reading',
    totalEpisodes: 0,
    watchedEpisodes: 374,
    year: '1989',
    studio: 'Kentaro Miura',
    rating: 5,
    notes: 'A masterpiece of dark fantasy.',
    createdAt: Date.now() - 4000,
  },
  {
    id: uid(),
    title: 'Vagabond',
    image: '',
    list: 'onHold',
    totalEpisodes: 327,
    watchedEpisodes: 220,
    year: '1998',
    studio: 'Takehiko Inoue',
    rating: 5,
    notes: '',
    createdAt: Date.now() - 3000,
  },
  {
    id: uid(),
    title: 'Chainsaw Man',
    image: '',
    list: 'completed',
    totalEpisodes: 97,
    watchedEpisodes: 97,
    year: '2018',
    studio: 'Tatsuki Fujimoto',
    rating: 5,
    notes: '',
    createdAt: Date.now() - 2000,
  },
  {
    id: uid(),
    title: 'Vinland Saga',
    image: '',
    list: 'planToRead',
    totalEpisodes: 0,
    watchedEpisodes: 0,
    year: '2005',
    studio: 'Makoto Yukimura',
    rating: 0,
    notes: '',
    createdAt: Date.now() - 1000,
  },
]

export default function App() {
  return <Vault />
}

function Vault() {
  const [theme, setTheme] = useLocalStorage(KEY_THEME, 'dark')
  const [mediaMode, setMediaMode] = useLocalStorage(KEY_MODE, 'anime')
  const [view, setView] = useLocalStorage(KEY_VIEW, 'library')
  const [animes, setAnimes] = useLocalStorage(KEY_ANIME, SAMPLE_ANIME)
  const [mangas, setMangas] = useLocalStorage(KEY_MANGA, SAMPLE_MANGA)
  const [activeListAnime, setActiveListAnime] = useLocalStorage(
    KEY_LIST_ANIME,
    'watching'
  )
  const [activeListManga, setActiveListManga] = useLocalStorage(
    KEY_LIST_MANGA,
    'reading'
  )

  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [movePopover, setMovePopover] = useState(null)
  const [toasts, setToasts] = useState([])
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const searchRef = useRef(null)

  // Per-mode derived state.
  const config = getModeConfig(mediaMode)
  const lists = getLists(mediaMode)
  const listIds = useMemo(() => getListIds(mediaMode), [mediaMode])
  const items = mediaMode === 'manga' ? mangas : animes
  const setItems = mediaMode === 'manga' ? setMangas : setAnimes
  const activeList = mediaMode === 'manga' ? activeListManga : activeListAnime
  const setActiveList =
    mediaMode === 'manga' ? setActiveListManga : setActiveListAnime

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.setAttribute('data-media-mode', mediaMode)
  }, [mediaMode])

  // Debounce search input — keeps typing buttery smooth on long lists.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim().toLowerCase()), 80)
    return () => clearTimeout(t)
  }, [query])

  // Cmd/Ctrl + K to focus search; Esc inside search to clear.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
        searchRef.current?.select()
      } else if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Body scroll lock when mobile nav open.
  useEffect(() => {
    if (mobileNavOpen) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = prev
      }
    }
  }, [mobileNavOpen])

  const counts = useMemo(() => {
    const c = Object.fromEntries(listIds.map((id) => [id, 0]))
    for (const a of items) c[a.list] = (c[a.list] ?? 0) + 1
    return c
  }, [items, listIds])

  const filtered = useMemo(() => {
    const q = debouncedQuery
    return items
      .filter((a) => (activeList === 'all' ? true : a.list === activeList))
      .filter((a) => {
        if (!q) return true
        const list = getListById(mediaMode, a.list)
        return (
          a.title.toLowerCase().includes(q) ||
          (a.studio || '').toLowerCase().includes(q) ||
          (a.notes || '').toLowerCase().includes(q) ||
          String(a.year || '').includes(q) ||
          (list?.name || '').toLowerCase().includes(q)
        )
      })
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
  }, [items, activeList, debouncedQuery, mediaMode])

  const listInfo =
    activeList === 'all'
      ? {
          id: 'all',
          name: config.allLabel,
          tag: 'Library',
          subtitle: config.allSubtitle,
        }
      : getListById(mediaMode, activeList) || lists[0]

  const headerStats = useMemo(() => {
    const list =
      activeList === 'all' ? items : items.filter((a) => a.list === activeList)
    const totalEpisodes = list.reduce(
      (sum, a) => sum + (Number(a.totalEpisodes) || 0),
      0
    )
    const watchedEpisodes = list.reduce(
      (sum, a) => sum + (Number(a.watchedEpisodes) || 0),
      0
    )
    const avgRating = (() => {
      const rated = list.filter((a) => a.rating > 0)
      if (!rated.length) return 0
      return rated.reduce((s, a) => s + a.rating, 0) / rated.length
    })()
    return {
      titles: list.length,
      episodesWatched: watchedEpisodes,
      totalEpisodes,
      avgRating,
    }
  }, [items, activeList])

  const toast = useCallback((msg) => {
    const id = uid()
    setToasts((t) => [...t, { id, msg }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2400)
  }, [])

  const openAdd = useCallback(() => {
    setEditing(null)
    setModalOpen(true)
  }, [])

  const openEdit = useCallback((anime) => {
    setEditing(anime)
    setModalOpen(true)
  }, [])

  const saveItem = useCallback(
    (data) => {
      setEditing((current) => {
        if (current?.id) {
          setItems((a) =>
            a.map((x) =>
              x.id === current.id ? { ...x, ...data, id: current.id } : x
            )
          )
          toast('Updated')
        } else {
          const entry = { ...data, id: uid(), createdAt: Date.now() }
          setItems((a) => [entry, ...a])
          setActiveList(entry.list)
          toast('Added to your library')
        }
        return null
      })
      setModalOpen(false)
    },
    [setItems, setActiveList, toast]
  )

  const deleteItem = useCallback(
    (anime) => {
      setItems((a) => a.filter((x) => x.id !== anime.id))
      toast('Removed')
    },
    [setItems, toast]
  )

  const moveItem = useCallback(
    (anime, listId) => {
      setItems((a) =>
        a.map((x) => {
          if (x.id !== anime.id) return x
          const patch = { list: listId }
          if (listId === config.completedList && x.totalEpisodes > 0) {
            patch.watchedEpisodes = x.totalEpisodes
          }
          return { ...x, ...patch }
        })
      )
      const list = getListById(mediaMode, listId)
      toast(`Moved to ${list?.name}`)
      setMovePopover(null)
    },
    [setItems, toast, mediaMode, config]
  )

  const increment = useCallback(
    (anime) => {
      setItems((a) =>
        a.map((x) => {
          if (x.id !== anime.id) return x
          let seasons = Array.isArray(x.seasons) ? x.seasons : []
          let total = Number(x.totalEpisodes) || 0
          let watched = Number(x.watchedEpisodes || 0)

          if (seasons.length > 0) {
            let bumped = false
            seasons = seasons.map((s) => {
              if (bumped) return s
              const sTotal = Number(s.total) || 0
              const sWatched = Number(s.watched) || 0
              if (sTotal === 0 || sWatched < sTotal) {
                bumped = true
                return { ...s, watched: sWatched + 1 }
              }
              return s
            })
            if (!bumped) return x
            total = seasons.reduce((acc, s) => acc + (Number(s.total) || 0), 0)
            watched = seasons.reduce(
              (acc, s) => acc + (Number(s.watched) || 0),
              0
            )
          } else {
            const next = watched + 1
            watched = total > 0 ? Math.min(next, total) : next
          }

          const patch = { watchedEpisodes: watched, totalEpisodes: total, seasons }
          if (
            total > 0 &&
            watched >= total &&
            x.list !== config.completedList
          ) {
            patch.list = config.completedList
          } else if (watched > 0 && x.list === config.planList) {
            patch.list = config.activeReadingList
          }
          return { ...x, ...patch }
        })
      )
    },
    [setItems, config]
  )

  const decrement = useCallback(
    (anime) => {
      setItems((a) =>
        a.map((x) => {
          if (x.id !== anime.id) return x
          let seasons = Array.isArray(x.seasons) ? x.seasons : []
          let total = Number(x.totalEpisodes) || 0
          let watched = Math.max(0, Number(x.watchedEpisodes || 0) - 1)

          if (seasons.length > 0) {
            let dropped = false
            const reversed = [...seasons].reverse().map((s) => {
              if (dropped) return s
              const sWatched = Number(s.watched) || 0
              if (sWatched > 0) {
                dropped = true
                return { ...s, watched: sWatched - 1 }
              }
              return s
            })
            if (!dropped) return x
            seasons = reversed.reverse()
            total = seasons.reduce((acc, s) => acc + (Number(s.total) || 0), 0)
            watched = seasons.reduce(
              (acc, s) => acc + (Number(s.watched) || 0),
              0
            )
          }

          return {
            ...x,
            watchedEpisodes: watched,
            totalEpisodes: total,
            seasons,
          }
        })
      )
    },
    [setItems]
  )

  const openQuickMove = useCallback((anime, anchorEl) => {
    const rect = anchorEl.getBoundingClientRect()
    setMovePopover({
      anime,
      rect: {
        top: rect.top,
        bottom: rect.bottom,
        left: rect.left,
        right: rect.right,
      },
    })
  }, [])

  const closeModal = useCallback(() => {
    setModalOpen(false)
    setEditing(null)
  }, [])

  const onExport = useCallback(async () => {
    try {
      await exportLibrary({ animes, mangas })
      toast('Backup exported')
    } catch (e) {
      toast(`Export failed: ${e.message || 'unknown'}`)
    }
  }, [animes, mangas, toast])

  const onImport = useCallback(
    async (file) => {
      try {
        const data = await importLibrary(file)
        if (Array.isArray(data.animes)) setAnimes(data.animes)
        if (Array.isArray(data.mangas)) setMangas(data.mangas)
        toast('Backup imported')
      } catch (e) {
        toast(`Import failed: ${e.message || 'unknown'}`)
      }
    },
    [setAnimes, setMangas, toast]
  )

  const onSelectList = useCallback(
    (id) => {
      setActiveList(id)
      setMobileNavOpen(false)
    },
    [setActiveList]
  )

  const onChangeMode = useCallback(
    (mode) => {
      setMediaMode(mode)
      setQuery('')
    },
    [setMediaMode]
  )

  const onSelectView = useCallback(
    (next) => {
      setView(next)
      setMobileNavOpen(false)
    },
    [setView]
  )

  /* Set of AniList IDs already imported — used by Discover to mark
     cards as 'In library' and prevent duplicate imports. */
  const importedAnilistIds = useMemo(() => {
    const all = mediaMode === 'manga' ? mangas : animes
    return all.map((x) => x.anilistId).filter(Boolean)
  }, [animes, mangas, mediaMode])

  const importFromAniList = useCallback(
    async (item, coverDataUrl) => {
      const targetMode = item.type === 'manga' ? 'manga' : 'anime'
      const targetSetter = targetMode === 'manga' ? setMangas : setAnimes
      const targetList = targetMode === 'manga' ? 'planToRead' : 'planToWatch'
      const totalKey = targetMode === 'manga' ? item.chapters : item.episodes
      targetSetter((prev) => {
        const existing = prev.find((x) => x.anilistId === item.anilistId)
        if (existing) return prev
        /* Prefer the offline base64 copy. If that download failed
           (rare — flaky network at import time), fall back to the
           remote URL so the card still renders when online. */
        const offlineCover = coverDataUrl || ''
        const entry = {
          id: uid(),
          anilistId: item.anilistId,
          malId: item.malId || null,
          title: item.title,
          image: offlineCover || item.cover || '',
          imageRemote: item.cover || '',
          list: targetList,
          totalEpisodes: Number(totalKey) || 0,
          watchedEpisodes: 0,
          year: item.year ? String(item.year) : '',
          studio: item.studio || '',
          rating: 0,
          notes: item.description ? item.description.slice(0, 400) : '',
          genres: item.genres || [],
          score: item.score || 0,
          format: item.format || '',
          status: item.status || '',
          season: item.season || '',
          createdAt: Date.now(),
        }
        return [entry, ...prev]
      })
      if (mediaMode !== targetMode) setMediaMode(targetMode)
      setActiveListAnime((id) => (targetMode === 'anime' ? targetList : id))
      setActiveListManga((id) => (targetMode === 'manga' ? targetList : id))
      toast(`Added “${item.title}” to your library`)
    },
    [
      mediaMode,
      setMangas,
      setAnimes,
      setMediaMode,
      setActiveListAnime,
      setActiveListManga,
      toast,
    ]
  )

  const filteredCount = filtered.length
  const totalForActive =
    activeList === 'all' ? items.length : counts[activeList] ?? 0
  const isSearching = debouncedQuery.length > 0

  return (
    <div className="app">
      <div className="ambient" aria-hidden="true" />

      <div
        className={`sidebar-backdrop ${mobileNavOpen ? 'visible' : ''}`}
        aria-hidden="true"
        onClick={() => setMobileNavOpen(false)}
      />

      <div className={`sidebar-mobile-wrap ${mobileNavOpen ? 'open' : ''}`}>
        <Sidebar
          mediaMode={mediaMode}
          onChangeMode={onChangeMode}
          lists={lists}
          activeList={activeList}
          onSelect={(id) => {
            if (view !== 'library') setView('library')
            onSelectList(id)
          }}
          counts={counts}
          theme={theme}
          onTheme={setTheme}
          totalCount={items.length}
          allLabel={config.allLabel}
          sectionTitle={config.sectionTitle}
          onClose={() => setMobileNavOpen(false)}
          view={view}
          onSelectView={onSelectView}
        />
      </div>

      <main className="main">
        <div className="topbar glass">
          <button
            type="button"
            className="btn btn-icon btn-ghost mobile-sidebar-toggle"
            onClick={() => setMobileNavOpen((v) => !v)}
            aria-label="Toggle navigation"
            aria-expanded={mobileNavOpen}
          >
            {mobileNavOpen ? <IconX /> : <IconMenu />}
          </button>
          {view === 'library' ? (
            <>
              <div className="search">
                <IconSearch />
                <input
                  ref={searchRef}
                  type="search"
                  placeholder={config.searchPlaceholder}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Search library"
                  enterKeyHint="search"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck="false"
                />
                {isSearching && (
                  <span className="search-count" aria-live="polite">
                    {filteredCount}
                  </span>
                )}
                {query && (
                  <button
                    type="button"
                    className="search-clear"
                    onClick={() => {
                      setQuery('')
                      searchRef.current?.focus()
                    }}
                    aria-label="Clear search"
                  >
                    <IconX />
                  </button>
                )}
                <kbd className="search-kbd" aria-hidden="true">⌘K</kbd>
              </div>
              <button
                type="button"
                className="btn btn-primary topbar-add"
                onClick={openAdd}
                aria-label={config.addLabel}
              >
                <IconPlus />
                <span className="topbar-add-label">{config.addLabel}</span>
              </button>
            </>
          ) : (
            <div className="topbar-spacer" aria-hidden="true" />
          )}
          <AppMenu
            onExport={onExport}
            onImport={onImport}
            theme={theme}
            onTheme={setTheme}
          />
        </div>

        {view === 'discover' ? (
          <Discover
            mediaMode={mediaMode}
            importedAnilistIds={importedAnilistIds}
            onImport={importFromAniList}
          />
        ) : (
        <>
        <section className="list-header glass">
          <div className="list-header-text">
            <span className="list-tag">{listInfo.tag}</span>
            <h1 className="list-title">{listInfo.name}</h1>
            <p className="list-subtitle">
              {listInfo.subtitle || `Your curated ${config.label.toLowerCase()} shelf.`}
            </p>
          </div>
          <div className="list-stats">
            <div className="stat">
              <div className="stat-label">Titles</div>
              <div className="stat-value">
                {isSearching
                  ? `${filteredCount}/${totalForActive}`
                  : headerStats.titles}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">{config.progressLabel}</div>
              <div className="stat-value">
                {headerStats.episodesWatched}
                {headerStats.totalEpisodes > 0 ? (
                  <span style={{ color: 'var(--fg-3)', fontSize: 14, fontWeight: 500 }}>
                    {' / '}
                    {headerStats.totalEpisodes}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">Avg Rating</div>
              <div className="stat-value">
                {headerStats.avgRating > 0
                  ? headerStats.avgRating.toFixed(1)
                  : '—'}
              </div>
            </div>
          </div>
        </section>

        {filtered.length === 0 ? (
          <section className="empty glass">
            <div className="empty-icon">
              <IconSparkle />
            </div>
            <h2 className="empty-title">
              {isSearching
                ? 'Nothing matches that search'
                : 'This shelf is empty'}
            </h2>
            <p className="empty-text">
              {isSearching
                ? `Try a different title, ${config.studioLabel.toLowerCase()}, year, or list.`
                : `Add your first ${config.label.toLowerCase()} to start building this list.`}
            </p>
            {!isSearching && (
              <button type="button" className="btn btn-primary" onClick={openAdd}>
                <IconPlus />
                <span>{config.addFirstLabel}</span>
              </button>
            )}
          </section>
        ) : (
          <section className="grid">
            {filtered.map((a) => (
              <AnimeCard
                key={a.id}
                anime={a}
                mediaMode={mediaMode}
                onIncrement={increment}
                onDecrement={decrement}
                onEdit={openEdit}
                onDelete={deleteItem}
                onQuickMove={openQuickMove}
              />
            ))}
          </section>
        )}
        </>
        )}
      </main>

      {view === 'library' && (
        <button
          type="button"
          className="fab"
          onClick={openAdd}
          aria-label={config.addLabel}
        >
          <IconPlus />
        </button>
      )}

      <AnimeModal
        open={modalOpen}
        initial={editing}
        mediaMode={mediaMode}
        onClose={closeModal}
        onSave={saveItem}
      />

      {movePopover && (
        <MovePopover
          anchorRect={movePopover.rect}
          mediaMode={mediaMode}
          currentList={movePopover.anime.list}
          onSelect={(listId) => moveItem(movePopover.anime, listId)}
          onClose={() => setMovePopover(null)}
        />
      )}

      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="toast">
            <span className="toast-dot" />
            <span>{t.msg}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
