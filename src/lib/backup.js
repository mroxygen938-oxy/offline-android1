/* Offline backup format. We dump animes + mangas (with their full
   inline base64 cover images, if any) into a single JSON file the
   user can save anywhere — Drive, an SD card, email to themselves —
   and re-import on a new device.

   Backups are SELF-CONTAINED: covers travel inside the JSON as
   data: URLs, so a restore on a brand-new device with no network
   yields the exact same library down to the artwork. */

import { isNative } from './native.js'

const BACKUP_VERSION = 1

/* Electron (Windows/macOS/Linux desktop) exposes a small bridge via
   preload; the renderer is sandboxed so we can't touch the filesystem
   directly. */
const isElectron = () =>
  typeof window !== 'undefined' && Boolean(window.oxygenElectron)

function buildPayload({ animes, mangas }) {
  return JSON.stringify(
    {
      app: 'oxygen-vault-offline',
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      animes: Array.isArray(animes) ? animes : [],
      mangas: Array.isArray(mangas) ? mangas : [],
    },
    null,
    2
  )
}

function timestampedFilename() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return (
    `oxygen-vault-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `-${pad(d.getHours())}${pad(d.getMinutes())}.json`
  )
}

export async function exportLibrary({ animes, mangas }) {
  const json = buildPayload({ animes, mangas })
  const filename = timestampedFilename()

  if (isElectron()) {
    const res = await window.oxygenElectron.exportBackup(json)
    if (res?.canceled) return { canceled: true }
    return { filePath: res?.filePath, filename }
  }

  if (isNative()) {
    /* On Android, write to the app's Documents folder via the
       Filesystem plugin and surface a Share sheet so the user can
       drop the file into Drive / Telegram / Email / Files. */
    try {
      const [{ Filesystem, Directory, Encoding }, share] = await Promise.all([
        import('@capacitor/filesystem'),
        import('@capacitor/share').catch(() => null),
      ])
      const written = await Filesystem.writeFile({
        path: filename,
        data: json,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
        recursive: true,
      })
      if (share?.Share) {
        try {
          await share.Share.share({
            title: 'Oxygen Vault backup',
            url: written.uri,
            dialogTitle: 'Save backup',
          })
        } catch {
          /* user dismissed share sheet — file is still on disk */
        }
      }
      return { uri: written.uri, filename }
    } catch (e) {
      throw new Error(
        `Could not write backup (${e?.message || 'permission denied?'}).`,
        { cause: e }
      )
    }
  }

  /* Web: trigger a normal download. */
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, 0)
  return { filename }
}

function parseBackupText(text) {
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('That file is not valid JSON')
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Unrecognised backup file')
  }
  if (parsed.app && parsed.app !== 'oxygen-vault-offline') {
    throw new Error(`Backup is from "${parsed.app}", not Oxygen Vault Offline`)
  }
  return {
    animes: Array.isArray(parsed.animes) ? parsed.animes : [],
    mangas: Array.isArray(parsed.mangas) ? parsed.mangas : [],
  }
}

/* Called with no args on Electron (we open our own dialog); called
   with a File on the web + Android (the renderer already picked one
   via <input type=file>). */
export async function importLibrary(file) {
  if (isElectron() && !file) {
    const res = await window.oxygenElectron.importBackup()
    if (res?.canceled) return { canceled: true }
    return parseBackupText(res.content)
  }
  if (!file) throw new Error('No file selected')
  const text = await file.text()
  return parseBackupText(text)
}
