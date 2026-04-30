/* Electron main process for Oxygen Vault Offline (Windows desktop).

   Loads the same React bundle that the Android APK ships. No server,
   no remote URL, no network traffic — everything is served from the
   app's own asar archive and user data lives in
   %APPDATA%\Oxygen Vault Offline\. */

const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron')
const path = require('path')
const fs = require('fs/promises')

const isDev = !app.isPackaged

let mainWindow = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0E0B1F',
    autoHideMenuBar: true,
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    title: 'Oxygen Vault Offline',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  /* Hide the default menu bar entirely — this is a single-window app
     with no File/Edit/View menus. Keep F11 for fullscreen + F12 for
     dev-tools during dev only. */
  Menu.setApplicationMenu(null)

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  /* External links should open in the user's real browser, not inside
     the Electron window. Telegram login is already gone, but this is
     defensive in case the user clicks something in the notes field. */
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

/* -------------------- Backup IPC ------------------- */

const defaultBackupName = () => {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return (
    `oxygen-vault-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `-${pad(d.getHours())}${pad(d.getMinutes())}.json`
  )
}

/* Renderer asks us to save the backup JSON. We show a native Save
   dialog defaulting to Downloads/, then write the file ourselves. */
ipcMain.handle('backup:export', async (_event, { json }) => {
  if (typeof json !== 'string') {
    throw new Error('Backup payload must be a string')
  }
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Oxygen Vault backup',
    defaultPath: path.join(app.getPath('downloads'), defaultBackupName()),
    filters: [{ name: 'Oxygen Vault backup', extensions: ['json'] }],
  })
  if (canceled || !filePath) return { canceled: true }
  await fs.writeFile(filePath, json, 'utf8')
  return { canceled: false, filePath }
})

/* Renderer asks us to read a backup JSON off disk. Show Open dialog,
   read the file, return its contents. */
ipcMain.handle('backup:import', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Open Oxygen Vault backup',
    defaultPath: app.getPath('downloads'),
    filters: [{ name: 'Oxygen Vault backup', extensions: ['json'] }],
    properties: ['openFile'],
  })
  if (canceled || !filePaths?.length) return { canceled: true }
  const content = await fs.readFile(filePaths[0], 'utf8')
  return { canceled: false, filePath: filePaths[0], content }
})
