# Oxygen Vault Offline — Native Windows (C# / WPF / WebView2)

A native Windows build of the offline tracker, written in C# on .NET 8
using **WPF** for the host window and **WebView2** for rendering the
React UI. No Electron, no Chromium bundle — the app relies on the
Microsoft Edge WebView2 runtime that ships with Windows 10 21H2+ and
Windows 11 by default.

## Why this exists alongside `../windows/` (Electron)

Two implementations of the same Windows app so you can compare:

| | Electron (`../windows/`) | Native C# (this folder) |
|---|---|---|
| Language | JavaScript | C# |
| Host | Electron main + preload | WPF Window + WebView2 control |
| EXE size (self-contained) | ~89 MB | ~157 MB |
| EXE size (runtime-dependent) | n/a | ~2.6 MB (needs .NET 8 Desktop Runtime) |
| Prerequisite on user's PC | none | Edge WebView2 runtime (preinstalled on Win 10/11) |
| Build host requirements | Node, wine (on Linux) | .NET 8 SDK |

Both wrap the same React bundle out of the repo root's `dist/` folder.

## Layout

```
windows-native/
  OxygenVaultOffline.csproj   # WPF + WebView2 project file
  App.xaml / App.xaml.cs      # WPF application entry
  MainWindow.xaml             # Single-window shell — WebView2 fills it
  MainWindow.xaml.cs          # WebView2 bootstrap + native Save/Open dialogs
  Assets/app.ico              # Multi-size Windows icon
  web/                        # Copy of the React build output (dist/)
```

## Build

```bash
# 1. Build the React UI (from the repo root):
npm install
npm run build

# 2. Mirror the React output into windows-native/web/:
rm -rf windows-native/web
cp -r dist windows-native/web

# 3. Publish the Windows EXE. Pick ONE of the two targets below.
cd windows-native

# Self-contained single-file (no .NET install needed by the user):
dotnet publish -c Release -r win-x64 --self-contained \
  -o bin/Release/self-contained

# Runtime-dependent single-file (smaller; user must install .NET 8 Desktop Runtime):
dotnet publish -c Release -r win-x64 --self-contained false \
  -p:PublishSingleFile=true -o bin/Release/framework-dependent
```

## First launch

SmartScreen will warn because the EXE is not code-signed. Click **More
info → Run anyway** once. After that it opens directly.

## Data location

`%LOCALAPPDATA%\OxygenVaultOffline\` — that is where WebView2 persists
the library (`localStorage`). Delete the folder to wipe the app state.

## IPC bridge

The C# host injects a small shim on every document creation that
exposes `window.oxygenNative.{exportBackup, importBackup}`. These post
messages to the WPF process, which opens real `SaveFileDialog` /
`OpenFileDialog` windows and writes / reads the JSON directly with
`System.IO.File`. The bridge lives in `MainWindow.xaml.cs` — look for
`JsShim`, `OnWebMessageReceived`, `HandleExportAsync`, and
`HandleImportAsync`.

On the renderer side, `src/lib/backup.js` in the repo root already
detects `window.oxygenNative` and routes through it. So the React code
is identical on web, Android, Electron, and this build.
