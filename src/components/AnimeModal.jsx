import { useEffect, useMemo, useRef, useState } from 'react'
import { IconImage, IconPlus, IconStar, IconTrash, IconX } from '../lib/icons.jsx'
import { getLists, getModeConfig } from '../lib/lists.js'

/* Offline build: covers stay as base64 inside the entry. We just
   pass the data URL through unchanged when rendering. */
const resolveImageUrl = (image) => image || ''

const emptyItem = (mode) => ({
  title: '',
  image: '',
  list: getModeConfig(mode).activeStartList,
  totalEpisodes: '',
  watchedEpisodes: 0,
  year: '',
  studio: '',
  rating: 0,
  notes: '',
  seasons: [],
})

const newSeason = (i) => ({
  id: `sn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
  name: `Season ${i}`,
  total: '',
  watched: 0,
})

async function fileToDataUrl(file, maxDim = 800) {
  const readerData = await new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result)
    r.onerror = reject
    r.readAsDataURL(file)
  })

  // Try to downscale to keep localStorage small.
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = reject
      i.src = readerData
    })
    const ratio = Math.min(1, maxDim / Math.max(img.width, img.height))
    const w = Math.round(img.width * ratio)
    const h = Math.round(img.height * ratio)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0, w, h)
    return canvas.toDataURL('image/jpeg', 0.85)
  } catch {
    return readerData
  }
}

export default function AnimeModal({ open, initial, mediaMode = 'anime', onClose, onSave }) {
  if (!open) return null
  return (
    <AnimeModalInner
      key={`${mediaMode}-${initial?.id || 'new'}`}
      initial={initial}
      mediaMode={mediaMode}
      onClose={onClose}
      onSave={onSave}
    />
  )
}

function AnimeModalInner({ initial, mediaMode, onClose, onSave }) {
  const config = getModeConfig(mediaMode)
  const lists = getLists(mediaMode)
  const [form, setForm] = useState(() => ({
    ...emptyItem(mediaMode),
    ...(initial || {}),
    seasons: Array.isArray(initial?.seasons) ? initial.seasons : [],
  }))
  const firstFieldRef = useRef(null)

  useEffect(() => {
    const t = setTimeout(() => firstFieldRef.current?.focus(), 80)
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t)
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const isEditing = Boolean(initial?.id)
  const showSeasons = mediaMode === 'anime'
  const hasSeasons = showSeasons && form.seasons.length > 0

  const update = (patch) => setForm((f) => ({ ...f, ...patch }))

  const updateSeason = (id, patch) =>
    setForm((f) => ({
      ...f,
      seasons: f.seasons.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }))

  const addSeason = () =>
    setForm((f) => ({
      ...f,
      seasons: [...f.seasons, newSeason(f.seasons.length + 1)],
    }))

  const removeSeason = (id) =>
    setForm((f) => ({ ...f, seasons: f.seasons.filter((s) => s.id !== id) }))

  /* Sums when in seasons mode — used to display derived totals and to
     normalise the saved item so the rest of the app keeps working
     against totalEpisodes / watchedEpisodes. */
  const sums = useMemo(() => {
    if (!hasSeasons) return null
    let total = 0
    let watched = 0
    for (const s of form.seasons) {
      total += Math.max(0, Math.floor(Number(s.total) || 0))
      watched += Math.max(0, Math.floor(Number(s.watched) || 0))
    }
    return { total, watched }
  }, [hasSeasons, form.seasons])

  const imageUploading = false
  const [imageError, setImageError] = useState('')

  const handleFile = async (file) => {
    if (!file) return
    setImageError('')
    try {
      const dataUrl = await fileToDataUrl(file)
      update({ image: dataUrl })
    } catch {
      setImageError('Could not read that image.')
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const title = (form.title || '').trim()
    if (!title) {
      firstFieldRef.current?.focus()
      return
    }

    let total
    let watched
    let seasons = form.seasons

    if (hasSeasons) {
      seasons = form.seasons.map((s, i) => ({
        id: s.id,
        name: (s.name || '').trim() || `Season ${i + 1}`,
        total: Math.max(0, Math.floor(Number(s.total) || 0)),
        watched: Math.max(
          0,
          Math.min(
            Math.floor(Number(s.watched) || 0),
            (Number(s.total) || 0) > 0
              ? Math.floor(Number(s.total))
              : Number.POSITIVE_INFINITY
          )
        ),
      }))
      total = seasons.reduce((acc, s) => acc + s.total, 0)
      watched = seasons.reduce((acc, s) => acc + s.watched, 0)
    } else {
      seasons = []
      const t = form.totalEpisodes === '' ? 0 : Number(form.totalEpisodes)
      total = Number.isFinite(t) ? Math.max(0, Math.floor(t)) : 0
      watched = Math.max(0, Math.floor(Number(form.watchedEpisodes) || 0))
    }

    onSave({
      ...form,
      title,
      totalEpisodes: total,
      watchedEpisodes: watched,
      rating: Number(form.rating) || 0,
      seasons,
    })
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <form className="modal glass-strong" onSubmit={handleSubmit}>
        <header className="modal-header">
          <div>
            <h2 className="modal-title">{isEditing ? config.editTitle : config.addTitle}</h2>
            <div className="modal-sub">
              {isEditing ? 'Update the details and save.' : 'Fill in the basics — only the title is required.'}
            </div>
          </div>
          <button type="button" className="btn btn-icon btn-ghost" onClick={onClose} aria-label="Close">
            <IconX />
          </button>
        </header>

        <div className="modal-body">
          <label
            className="image-upload"
            style={form.image ? { borderStyle: 'solid' } : undefined}
          >
            {form.image ? (
              <>
                <img src={resolveImageUrl(form.image)} alt="Cover preview" />
                <div className="change-hint">Click to change cover image</div>
              </>
            ) : (
              <div className="image-upload-hint">
                <IconImage />
                <div>
                  <strong>Upload a cover image</strong>
                  <div style={{ marginTop: 2 }}>Drag &amp; drop or click to browse</div>
                </div>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </label>
          {form.image && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ fontSize: 12 }}
                onClick={() => update({ image: '' })}
              >
                Remove image
              </button>
              {imageUploading && (
                <span style={{ fontSize: 12, color: 'var(--text-2)' }}>
                  Uploading…
                </span>
              )}
            </div>
          )}
          {imageError && (
            <div style={{ fontSize: 12, color: '#ff6b8a' }}>
              {imageError}
            </div>
          )}

          <div className="field">
            <label className="label" htmlFor="f-title">Title</label>
            <input
              id="f-title"
              ref={firstFieldRef}
              className="input"
              value={form.title}
              onChange={(e) => update({ title: e.target.value })}
              placeholder={config.titlePlaceholder}
              required
            />
          </div>

          <div className="field-row">
            <div className="field">
              <label className="label" htmlFor="f-list">List</label>
              <select
                id="f-list"
                className="select"
                value={form.list}
                onChange={(e) => update({ list: e.target.value })}
              >
                {lists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="label">Rating</label>
              <div className="rating-input" role="radiogroup" aria-label="Rating">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={n === form.rating}
                    className={n <= form.rating ? 'active' : ''}
                    onClick={() => update({ rating: form.rating === n ? 0 : n })}
                  >
                    <IconStar filled={n <= form.rating} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label className="label" htmlFor="f-watched">{config.fieldWatchedLabel}</label>
              <input
                id="f-watched"
                className="input"
                type="number"
                min="0"
                value={hasSeasons ? sums.watched : form.watchedEpisodes}
                onChange={(e) => update({ watchedEpisodes: e.target.value })}
                disabled={hasSeasons}
                title={hasSeasons ? 'Sum of all seasons' : ''}
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="f-total">{config.fieldTotalLabel}</label>
              <input
                id="f-total"
                className="input"
                type="number"
                min="0"
                placeholder="Leave empty if unknown"
                value={hasSeasons ? sums.total : form.totalEpisodes}
                onChange={(e) => update({ totalEpisodes: e.target.value })}
                disabled={hasSeasons}
                title={hasSeasons ? 'Sum of all seasons' : ''}
              />
            </div>
          </div>

          {showSeasons && (
            <div className="field seasons">
              <div className="seasons-head">
                <span className="label" style={{ marginBottom: 0 }}>
                  Seasons
                  {hasSeasons && (
                    <span className="seasons-summary">
                      {' · '}
                      {sums.watched} / {sums.total} episodes
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  className="btn btn-ghost seasons-add"
                  onClick={addSeason}
                >
                  <IconPlus />
                  <span>Add season</span>
                </button>
              </div>

              {hasSeasons ? (
                <ul className="seasons-list">
                  {form.seasons.map((s, i) => (
                    <li key={s.id} className="season-row">
                      <span className="season-num" aria-hidden="true">
                        {i + 1}
                      </span>
                      <input
                        type="text"
                        className="input season-name"
                        value={s.name}
                        onChange={(e) =>
                          updateSeason(s.id, { name: e.target.value })
                        }
                        placeholder={`Season ${i + 1}`}
                        aria-label={`Season ${i + 1} name`}
                      />
                      <input
                        type="number"
                        min="0"
                        className="input season-watched"
                        value={s.watched}
                        onChange={(e) =>
                          updateSeason(s.id, { watched: e.target.value })
                        }
                        aria-label={`Season ${i + 1} episodes watched`}
                      />
                      <span className="season-sep" aria-hidden="true">
                        /
                      </span>
                      <input
                        type="number"
                        min="0"
                        className="input season-total"
                        value={s.total}
                        onChange={(e) =>
                          updateSeason(s.id, { total: e.target.value })
                        }
                        placeholder="—"
                        aria-label={`Season ${i + 1} total episodes`}
                      />
                      <button
                        type="button"
                        className="btn btn-icon btn-ghost season-remove"
                        onClick={() => removeSeason(s.id)}
                        aria-label={`Remove ${s.name || `Season ${i + 1}`}`}
                      >
                        <IconTrash />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="seasons-hint">
                  Tracking multi-season anime? Add a season for each cour and
                  the totals above will sum automatically.
                </p>
              )}
            </div>
          )}

          <div className="field-row">
            <div className="field">
              <label className="label" htmlFor="f-year">Year</label>
              <input
                id="f-year"
                className="input"
                type="number"
                placeholder="2024"
                value={form.year}
                onChange={(e) => update({ year: e.target.value })}
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="f-studio">{config.studioLabel}</label>
              <input
                id="f-studio"
                className="input"
                placeholder={config.studioPlaceholder}
                value={form.studio}
                onChange={(e) => update({ studio: e.target.value })}
              />
            </div>
          </div>

          <div className="field">
            <label className="label" htmlFor="f-notes">Notes</label>
            <textarea
              id="f-notes"
              className="textarea"
              placeholder="Thoughts, favourite moments, anything worth remembering…"
              value={form.notes}
              onChange={(e) => update({ notes: e.target.value })}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            {isEditing ? 'Save changes' : 'Add to library'}
          </button>
        </div>
      </form>
    </div>
  )
}
