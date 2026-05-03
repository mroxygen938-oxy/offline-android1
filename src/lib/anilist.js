/* AniList GraphQL client.
 *
 * AniList exposes a public, anonymous-read GraphQL endpoint at
 *   https://graphql.anilist.co
 * with permissive CORS — works directly from browser / Capacitor.
 *
 * We only use it for *discovery*: the user's library still lives
 * 100% locally. When a user imports a title, we fetch the cover
 * image and store it as a base64 data URL inside the entry, so
 * the entry is fully viewable forever without internet.
 */

const ENDPOINT = 'https://graphql.anilist.co'

/* Map AniList's MediaType to our internal mediaMode. */
const TYPE_MAP = {
  anime: 'ANIME',
  manga: 'MANGA',
}

/* Shared field set so every screen renders identically. */
const MEDIA_FIELDS = `
  id
  idMal
  type
  format
  status
  title { romaji english native userPreferred }
  coverImage { extraLarge large medium color }
  bannerImage
  episodes
  chapters
  volumes
  duration
  genres
  averageScore
  popularity
  favourites
  season
  seasonYear
  startDate { year month day }
  endDate { year month day }
  description(asHtml: false)
  studios(isMain: true) { nodes { name } }
  staff(perPage: 4) { edges { role node { name { full } } } }
  tags { name rank isMediaSpoiler }
  isAdult
  siteUrl
`

async function gql(query, variables = {}) {
  let res
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    })
  } catch (err) {
    /* Network failure — surface a friendlier message. */
    throw new Error('Cannot reach AniList. Check your internet connection.', {
      cause: err,
    })
  }
  if (!res.ok) {
    if (res.status === 429) {
      throw new Error('AniList is rate-limiting you — wait a few seconds.')
    }
    throw new Error(`AniList request failed (${res.status})`)
  }
  const json = await res.json()
  if (json.errors?.length) {
    throw new Error(json.errors[0]?.message || 'AniList GraphQL error')
  }
  return json.data
}

function pickTitle(t) {
  if (!t) return ''
  return t.userPreferred || t.english || t.romaji || t.native || ''
}

function pickStudio(media) {
  if (media.type === 'MANGA') {
    /* For manga AniList exposes the author via the staff edges. */
    const author = media.staff?.edges?.find((e) =>
      /story|art|original/i.test(e?.role || '')
    )
    return author?.node?.name?.full || ''
  }
  return media.studios?.nodes?.[0]?.name || ''
}

function pickYear(media) {
  return (
    media.seasonYear ||
    media.startDate?.year ||
    media.endDate?.year ||
    ''
  )
}

function pickSeasonYear(media) {
  if (media.season && media.seasonYear) {
    const s = media.season.charAt(0) + media.season.slice(1).toLowerCase()
    return `${s} ${media.seasonYear}`
  }
  return media.seasonYear ? String(media.seasonYear) : ''
}

function plainDescription(html) {
  if (!html) return ''
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/* Normalised result shape consumed by the Discover UI. */
function shape(media) {
  return {
    anilistId: media.id,
    malId: media.idMal,
    type: media.type === 'MANGA' ? 'manga' : 'anime',
    title: pickTitle(media.title),
    cover: media.coverImage?.extraLarge || media.coverImage?.large || '',
    coverColor: media.coverImage?.color || '',
    banner: media.bannerImage || '',
    studio: pickStudio(media),
    year: pickYear(media),
    season: pickSeasonYear(media),
    format: media.format || '',
    status: media.status || '',
    episodes: media.episodes || 0,
    chapters: media.chapters || 0,
    volumes: media.volumes || 0,
    duration: media.duration || 0,
    score: media.averageScore || 0,
    popularity: media.popularity || 0,
    favourites: media.favourites || 0,
    genres: media.genres || [],
    description: plainDescription(media.description),
    siteUrl: media.siteUrl || '',
    isAdult: !!media.isAdult,
  }
}

/* ---------- Public queries ---------- */

export async function searchAniList(term, mediaMode = 'anime', perPage = 20) {
  const t = String(term || '').trim()
  if (!t) return []
  const data = await gql(
    `query ($search: String, $type: MediaType, $perPage: Int) {
       Page(page: 1, perPage: $perPage) {
         media(search: $search, type: $type, sort: SEARCH_MATCH, isAdult: false) {
           ${MEDIA_FIELDS}
         }
       }
     }`,
    { search: t, type: TYPE_MAP[mediaMode], perPage }
  )
  return (data.Page?.media || []).map(shape)
}

export async function trendingAniList(mediaMode = 'anime', perPage = 30) {
  const data = await gql(
    `query ($type: MediaType, $perPage: Int) {
       Page(page: 1, perPage: $perPage) {
         media(type: $type, sort: TRENDING_DESC, isAdult: false) {
           ${MEDIA_FIELDS}
         }
       }
     }`,
    { type: TYPE_MAP[mediaMode], perPage }
  )
  return (data.Page?.media || []).map(shape)
}

export async function popularSeasonAniList(mediaMode = 'anime', perPage = 30) {
  /* For anime: current season + year. For manga: AniList has no season,
     so we fall back to "currently releasing this year" sorted by popularity. */
  const now = new Date()
  const month = now.getMonth() + 1
  const season =
    month <= 3 ? 'WINTER' : month <= 6 ? 'SPRING' : month <= 9 ? 'SUMMER' : 'FALL'
  const year = now.getFullYear()

  if (mediaMode === 'manga') {
    /* AniList has no concept of a "manga season" — fall back to
       currently-releasing manga sorted by popularity. */
    const data = await gql(
      `query ($perPage: Int) {
         Page(page: 1, perPage: $perPage) {
           media(
             type: MANGA,
             status: RELEASING,
             sort: POPULARITY_DESC,
             isAdult: false
           ) {
             ${MEDIA_FIELDS}
           }
         }
       }`,
      { perPage }
    )
    return (data.Page?.media || []).map(shape)
  }

  const data = await gql(
    `query ($perPage: Int, $season: MediaSeason, $year: Int) {
       Page(page: 1, perPage: $perPage) {
         media(
           type: ANIME,
           season: $season,
           seasonYear: $year,
           sort: POPULARITY_DESC,
           isAdult: false
         ) {
           ${MEDIA_FIELDS}
         }
       }
     }`,
    { perPage, season, year }
  )
  return (data.Page?.media || []).map(shape)
}

export async function topRatedAniList(mediaMode = 'anime', perPage = 30) {
  const data = await gql(
    `query ($type: MediaType, $perPage: Int) {
       Page(page: 1, perPage: $perPage) {
         media(type: $type, sort: SCORE_DESC, isAdult: false) {
           ${MEDIA_FIELDS}
         }
       }
     }`,
    { type: TYPE_MAP[mediaMode], perPage }
  )
  return (data.Page?.media || []).map(shape)
}

export async function upcomingAniList(mediaMode = 'anime', perPage = 30) {
  const data = await gql(
    `query ($type: MediaType, $perPage: Int) {
       Page(page: 1, perPage: $perPage) {
         media(
           type: $type,
           status: NOT_YET_RELEASED,
           sort: POPULARITY_DESC,
           isAdult: false
         ) {
           ${MEDIA_FIELDS}
         }
       }
     }`,
    { type: TYPE_MAP[mediaMode], perPage }
  )
  return (data.Page?.media || []).map(shape)
}

/* Convert a remote image URL to a base64 data URL so we can store
 * the cover inside the entry and never need network to display it
 * again. AniList's image CDN sets permissive CORS headers, so
 * fetch-as-blob works directly from both web and Capacitor. */
export async function fetchImageAsDataUrl(url) {
  if (!url) return ''
  try {
    const res = await fetch(url, { mode: 'cors' })
    if (!res.ok) return ''
    const blob = await res.blob()
    return await new Promise((resolve, reject) => {
      const r = new FileReader()
      r.onload = () => resolve(r.result || '')
      r.onerror = () => reject(new Error('Could not encode image'))
      r.readAsDataURL(blob)
    })
  } catch {
    return ''
  }
}
