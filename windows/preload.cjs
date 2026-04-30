/* Preload — exposes a minimal, safe API surface on window.oxygenElectron.
   Renderer is sandboxed + context-isolated; this is the only bridge. */

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('oxygenElectron', {
  platform: process.platform,
  exportBackup: (json) => ipcRenderer.invoke('backup:export', { json }),
  importBackup: () => ipcRenderer.invoke('backup:import'),
})
