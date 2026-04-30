export const ANIME_LISTS = [
  {
    id: 'watching',
    name: 'Watching',
    tag: 'Currently watching',
    subtitle: 'Series you\'re actively following right now.',
    icon: 'play',
  },
  {
    id: 'completed',
    name: 'Completed',
    tag: 'Finished',
    subtitle: 'Every anime you\'ve wrapped up from start to finish.',
    icon: 'check',
  },
  {
    id: 'onHold',
    name: 'On Hold',
    tag: 'Paused',
    subtitle: 'Shelved for later — not forgotten, just parked.',
    icon: 'pause',
  },
  {
    id: 'planToWatch',
    name: 'Plan to Watch',
    tag: 'Up next',
    subtitle: 'Your future watch-list queue.',
    icon: 'bookmark',
  },
  {
    id: 'dropped',
    name: 'Dropped',
    tag: 'Dropped',
    subtitle: 'Didn\'t click? No shame — filed here.',
    icon: 'x',
  },
]

export const MANGA_LISTS = [
  {
    id: 'reading',
    name: 'Reading',
    tag: 'Currently reading',
    subtitle: 'Manga you\'re reading right now.',
    icon: 'play',
  },
  {
    id: 'completed',
    name: 'Completed',
    tag: 'Finished',
    subtitle: 'Every series you\'ve finished cover to cover.',
    icon: 'check',
  },
  {
    id: 'onHold',
    name: 'On Hold',
    tag: 'Paused',
    subtitle: 'Shelved for later — not forgotten, just parked.',
    icon: 'pause',
  },
  {
    id: 'planToRead',
    name: 'Plan to Read',
    tag: 'Up next',
    subtitle: 'Your future reading queue.',
    icon: 'bookmark',
  },
  {
    id: 'dropped',
    name: 'Dropped',
    tag: 'Dropped',
    subtitle: 'Didn\'t click? No shame — filed here.',
    icon: 'x',
  },
]

export const MEDIA_MODES = ['anime', 'manga']

export const MODE_CONFIG = {
  anime: {
    key: 'anime',
    label: 'Anime',
    sectionTitle: 'Your anime library',
    allLabel: 'All Anime',
    allSubtitle: 'Every series across every list in one glass shelf.',
    addLabel: 'Add anime',
    addFirstLabel: 'Add your first anime',
    editTitle: 'Edit anime',
    addTitle: 'Add anime',
    titlePlaceholder: "e.g. Frieren: Beyond Journey's End",
    studioLabel: 'Studio',
    studioPlaceholder: 'Madhouse, MAPPA…',
    progressShort: 'EP',
    progressLabel: 'Episodes',
    fieldWatchedLabel: 'Episodes watched',
    fieldTotalLabel: 'Total episodes',
    searchPlaceholder: 'Search title, studio, year, list…',
    activeStartList: 'watching',
    completedList: 'completed',
    planList: 'planToWatch',
    activeReadingList: 'watching',
    moveAriaLabel: 'Move to another list',
  },
  manga: {
    key: 'manga',
    label: 'Manga',
    sectionTitle: 'Your manga library',
    allLabel: 'All Manga',
    allSubtitle: 'Every title across every list in one glass shelf.',
    addLabel: 'Add manga',
    addFirstLabel: 'Add your first manga',
    editTitle: 'Edit manga',
    addTitle: 'Add manga',
    titlePlaceholder: 'e.g. Berserk',
    studioLabel: 'Author',
    studioPlaceholder: 'Eiichiro Oda, ONE, Kentaro Miura…',
    progressShort: 'CH',
    progressLabel: 'Chapters',
    fieldWatchedLabel: 'Chapters read',
    fieldTotalLabel: 'Total chapters',
    searchPlaceholder: 'Search title, author, year, list…',
    activeStartList: 'reading',
    completedList: 'completed',
    planList: 'planToRead',
    activeReadingList: 'reading',
    moveAriaLabel: 'Move to another list',
  },
}

export const getLists = (mode) =>
  mode === 'manga' ? MANGA_LISTS : ANIME_LISTS

export const getListIds = (mode) => getLists(mode).map((l) => l.id)

export const getListById = (mode, id) =>
  getLists(mode).find((l) => l.id === id)

export const getModeConfig = (mode) =>
  MODE_CONFIG[mode] || MODE_CONFIG.anime

/* Backward-compat re-exports — older imports may still reach these. */
export const LISTS = ANIME_LISTS
export const LIST_IDS = ANIME_LISTS.map((l) => l.id)
export const listById = (id) => ANIME_LISTS.find((l) => l.id === id)
