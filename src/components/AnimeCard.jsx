import { memo, useRef } from 'react'
import {
  IconCalendar,
  IconEdit,
  IconMinus,
  IconMove,
  IconPlus,
  IconStar,
  IconTrash,
} from '../lib/icons.jsx'
import { getListById, getModeConfig } from '../lib/lists.js'

/* Offline build: image is just a base64 data URL (or empty). */
const resolveImageUrl = (image) => image || ''

function AnimeCardImpl({
  anime,
  mediaMode = 'anime',
  onIncrement,
  onDecrement,
  onEdit,
  onDelete,
  onQuickMove,
}) {
  const list = getListById(mediaMode, anime.list)
  const config = getModeConfig(mediaMode)
  const total = Number(anime.totalEpisodes) || 0
  const watched = Math.max(0, Math.min(Number(anime.watchedEpisodes) || 0, total || Number.POSITIVE_INFINITY))
  const progressPct = total ? Math.min(100, (watched / total) * 100) : 0
  const initial = (anime.title || '?').trim().charAt(0).toUpperCase() || '?'
  const menuRef = useRef(null)

  return (
    <article className="card glass" aria-label={anime.title}>
      <div className="card-media">
        {anime.image ? (
          <img src={resolveImageUrl(anime.image)} alt={anime.title} loading="lazy" />
        ) : (
          <div className="card-media-placeholder" aria-hidden="true">
            {initial}
          </div>
        )}
        <div className="card-overlay" />
        {list && <span className="card-badge">{list.name}</span>}
        <div className="card-actions">
          <button
            type="button"
            className="icon-btn"
            aria-label="Move to another list"
            onClick={(e) => {
              e.stopPropagation()
              onQuickMove(anime, e.currentTarget)
            }}
            ref={menuRef}
          >
            <IconMove />
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label="Edit"
            onClick={() => onEdit(anime)}
          >
            <IconEdit />
          </button>
          <button
            type="button"
            className="icon-btn danger"
            aria-label="Remove"
            onClick={() => onDelete(anime)}
          >
            <IconTrash />
          </button>
        </div>

        <div className="card-title-overlay">
          <h3 className="card-title">{anime.title}</h3>
          {(anime.year || anime.studio) && (
            <div className="card-sub">
              {anime.year ? (
                <>
                  <IconCalendar />
                  <span>{anime.year}</span>
                </>
              ) : null}
              {anime.studio ? <span>· {anime.studio}</span> : null}
            </div>
          )}
        </div>
      </div>

      <div className="card-body">
        {/* Title shown only in mobile horizontal layout (CSS-toggled). */}
        <div className="card-info-mobile">
          {list && <span className="card-tag-mobile">{list.name}</span>}
          <h3 className="card-title-mobile">{anime.title}</h3>
          {(anime.year || anime.studio) && (
            <div className="card-sub-mobile">
              {anime.year ? <span>{anime.year}</span> : null}
              {anime.year && anime.studio ? <span aria-hidden="true">·</span> : null}
              {anime.studio ? <span>{anime.studio}</span> : null}
            </div>
          )}
        </div>

        <div className="episode-tracker" aria-label="Episodes watched">
          <button
            type="button"
            className="ep-btn"
            onClick={() => onDecrement(anime)}
            disabled={watched <= 0}
            aria-label="Decrement episode"
          >
            <IconMinus />
          </button>
          <div className="ep-count">
            <div className="ep-count-text">
              {config.progressShort} {watched}
              {total ? ` / ${total}` : ''}
            </div>
            <div className="ep-progress" aria-hidden="true">
              <div
                className="ep-progress-fill"
                style={{ transform: `scaleX(${progressPct / 100})` }}
              />
            </div>
          </div>
          <button
            type="button"
            className="ep-btn primary"
            onClick={() => onIncrement(anime)}
            disabled={total > 0 && watched >= total}
            aria-label="Increment episode"
          >
            <IconPlus />
          </button>
        </div>

        <div className="card-meta">
          <span className="rating" aria-label={`Rating: ${anime.rating || 0}/5`}>
            {[1, 2, 3, 4, 5].map((n) => (
              <IconStar key={n} filled={n <= (anime.rating || 0)} />
            ))}
          </span>
          {total > 0 && (
            <span>{Math.round(progressPct)}%</span>
          )}
        </div>
      </div>
    </article>
  )
}

const AnimeCard = memo(
  AnimeCardImpl,
  (prev, next) => prev.anime === next.anime && prev.mediaMode === next.mediaMode
)

export default AnimeCard
