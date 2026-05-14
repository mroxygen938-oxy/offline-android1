# Oxygen Vault Offline — Linux (Electron)

Linux desktop build of the offline tracker, packaged from the same
Electron main process used by the Windows build (`../windows/`). The
React UI in `../src/` is compiled by Vite into `../dist/` and bundled
into the Electron asar archive.

## Outputs

```bash
npm install
npm run electron:build:linux
```

Three artifacts land in `../release/`:

| File | What | When to use |
|---|---|---|
| `OxygenVault-Offline-1.0.0-x64.AppImage` | Universal portable Linux | Most distros — chmod +x and double-click. Doesn't need root or installer. |
| `OxygenVault-Offline-1.0.0-x64.deb` | Debian / Ubuntu / Mint package | Drop into apt: `sudo dpkg -i OxygenVault-Offline-*.deb`. Adds an entry under Applications → Utilities. |
| `OxygenVault-Offline-1.0.0-x64.tar.gz` | Plain extract-and-run | Manual install, immutable distros, or sandboxes. |

## Run an AppImage

```bash
chmod +x OxygenVault-Offline-1.0.0-x64.AppImage
./OxygenVault-Offline-1.0.0-x64.AppImage
```

If your distro uses **AppImageLauncher**, just double-click — it'll
register the app in your launcher automatically.

## Data location

```
~/.config/Oxygen Vault Offline/
```

Survives upgrades (overwriting the AppImage / `.deb` keeps your data).
Purge with:

```bash
rm -rf ~/.config/"Oxygen Vault Offline"
```

## Why this folder mirrors `../windows/`

`linux/main.cjs` and `linux/preload.cjs` are direct copies of the
Windows Electron files. Electron's main process is platform-agnostic,
so the same code runs on both. The duplication is intentional — it
matches the user-facing structure (`android/`, `windows/`,
`windows-native/`, `linux/`) so each platform's entry point is
self-evident in the repo tree.

The active `main` is selected at build time via electron-builder's
`extraMetadata.main` field — see `../package.json`'s `build.win` and
`build.linux` blocks.
