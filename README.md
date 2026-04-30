# Oxygen Vault — Offline (Android + Windows)

Fully offline, single-device anime + manga tracker. No login, no server,
no internet required after install. All data lives on the device —
`localStorage` on Android, `%APPDATA%\Oxygen Vault Offline\` on Windows.

Ships as:

- **Android APK** (Capacitor wrapper, bundled assets)
- **Windows installer `.exe`** (Electron + NSIS)
- **Windows portable `.exe`** (single-file, no install — runs from USB)

This is a **separate** app from the synced [oxygenvault.online](https://oxygenvault.online)
website / sideloaded APK. The two do not talk to each other and have
different package IDs (`offline.oxygenvault.app` vs `online.oxygenvault.app`),
so they can be installed side-by-side.

## What it does

- Track anime + manga across the usual lists (Watching / Reading, Completed,
  On Hold, Dropped, Plan to Watch / Read).
- Multi-season episodes per show.
- Cover images stored as base64 inside the local DB — no network calls.
- Glassmorphism UI on the web build, opaque high-FPS surfaces on Android.
- **Export / Import** library to a JSON file at any time. Use this to:
  - Back up to Drive / SD card / email.
  - Move your library to a new phone (install app → Import → done).
  - Migrate to / from the synced web app (the JSON shape is compatible).

## What it does **not** do

- No Telegram login. The app opens straight into the library on first launch.
- No cloud sync. Data lives only on the phone where you added it.
- No `/api` backend. There is no server-side component to deploy.

## Stack

- React 19 + Vite (shared UI)
- Capacitor 8 for Android (bundled assets — no remote URL load)
- Electron 33 + electron-builder for Windows
- `@capacitor/filesystem` + `@capacitor/share` for Android backup export
- Electron `dialog` + `fs` for Windows backup export
- `localStorage` for the library (JSON, single key per list type)

## Layout

```
src/
  App.jsx                 # Vault root; renders straight into the library
  components/
    AnimeCard.jsx         # Card display (memoised)
    AnimeModal.jsx        # Add/edit modal, multi-season support
    AppMenu.jsx           # Three-dot menu: theme + Export + Import
    MovePopover.jsx       # Quick-move popover
    Sidebar.jsx           # Glass-pill sliding sidebar
    ThemeToggle.jsx
  lib/
    backup.js             # Export → JSON / Import → JSON
    icons.jsx             # SVG icon set
    lists.js              # Anime + manga list definitions
    native.js             # Capacitor detection helper
    storage.js            # useLocalStorage hook
android/                  # Capacitor Android project
electron/
  main.cjs                # Electron main process (window, IPC, dialogs)
  preload.cjs             # Sandboxed bridge → window.oxygenElectron
build/
  icon.png                # App icon (512×512, auto-converted per platform)
```

## Build

```bash
npm install
npm run build           # web build into dist/
```

### Windows (`.exe`)

```bash
npm run electron:dev     # run the app locally via Electron (dev mode)
npm run electron:build   # build signed-style installer + portable .exe
```

Outputs land in `release/`:

- `OxygenVault-Offline-<ver>-x64.exe` — NSIS installer (double-click → Install → Start Menu + Desktop shortcut)
- `OxygenVault-Offline-<ver>-portable.exe` — single-file portable (runs from anywhere, including USB sticks)

Data on Windows is stored under `%APPDATA%\Oxygen Vault Offline\` and
survives upgrades but is cleared if you uninstall via Add/Remove Programs.

Building `.exe` on Linux needs **wine** installed (`apt install wine wine32`).

### Android (`.apk` + `.aab`)

```bash
npm run build
npx cap sync android     # copy dist/ into android/ + register plugins
```

### APK + AAB (signed release)

You need a keystore at the path referenced in `android/keystore.properties`.
The repo's `keystore.properties` is git-ignored — generate your own:

```bash
keytool -genkey -v \
  -keystore /path/to/oxygen-vault-offline-release.jks \
  -alias oxygenvaultoffline \
  -keyalg RSA -keysize 2048 -validity 25000

cat > android/keystore.properties <<EOF
storeFile=/path/to/oxygen-vault-offline-release.jks
storePassword=<your-pw>
keyAlias=oxygenvaultoffline
keyPassword=<your-pw>
EOF

cd android
./gradlew :app:assembleRelease   # APK → app/build/outputs/apk/release/
./gradlew :app:bundleRelease     # AAB → app/build/outputs/bundle/release/
```

## Install on phone

1. Copy `app-release.apk` to the device (Telegram, Drive, USB, etc.).
2. Tap → Settings → toggle "Allow from this source" → Install.
3. Open **Oxygen Vault Offline** from the launcher.
4. App opens directly into the library — no login.

## Move data between devices

1. Old device: three-dot menu → **Export backup** → save the JSON file
   (Documents/oxygen-vault-YYYYMMDD-HHMM.json on Android, share to Drive).
2. New device: install the APK, three-dot menu → **Import backup** →
   pick the JSON file → library is restored, including cover images.

## License

Personal use.
