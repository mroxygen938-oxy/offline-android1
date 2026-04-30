using System;
using System.IO;
using System.Runtime.InteropServices;
using System.Text.Json;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Interop;
using Microsoft.Web.WebView2.Core;
using Microsoft.Win32;

namespace OxygenVaultOffline;

/*  WPF host window. A WebView2 control fills the window and loads the
    React bundle shipped in the app's `web/` folder as a virtual HTTPS
    host. Backup Export/Import are bridged via postMessage: JS does
    window.chrome.webview.postMessage({ type, payload }) and the C# side
    responds by opening a native Save/Open dialog and writing to the
    real filesystem. */
public partial class MainWindow : Window
{
    public MainWindow()
    {
        InitializeComponent();
        SourceInitialized += OnSourceInitialized;
        Loaded += OnLoaded;
    }

    /* -------------------- Dark title bar -------------------- */

    private const int DWMWA_USE_IMMERSIVE_DARK_MODE = 20;
    private const int DWMWA_USE_IMMERSIVE_DARK_MODE_PRE_20H1 = 19;
    private const int DWMWA_CAPTION_COLOR = 35;
    private const int DWMWA_BORDER_COLOR = 34;

    [DllImport("dwmapi.dll", PreserveSig = true)]
    private static extern int DwmSetWindowAttribute(
        IntPtr hwnd, int attr, ref int attrValue, int attrSize);

    private void OnSourceInitialized(object? sender, EventArgs e)
    {
        /* Ask the DWM to draw the title bar + border in dark mode. Works
           on Windows 10 2004+ and Windows 11. Silently no-ops on older
           builds. */
        var hwnd = new WindowInteropHelper(this).EnsureHandle();
        int useDark = 1;
        if (DwmSetWindowAttribute(hwnd, DWMWA_USE_IMMERSIVE_DARK_MODE,
                ref useDark, sizeof(int)) != 0)
        {
            DwmSetWindowAttribute(hwnd, DWMWA_USE_IMMERSIVE_DARK_MODE_PRE_20H1,
                ref useDark, sizeof(int));
        }

        /* On Windows 11 22H2+, explicitly paint the caption + border to
           match the React background (#0E0B1F). 0x001F0B0E is the BGR
           value. Gracefully ignored on older Windows builds that don't
           support these DWMWA_ values. */
        int captionColor = 0x001F0B0E;
        DwmSetWindowAttribute(hwnd, DWMWA_CAPTION_COLOR,
            ref captionColor, sizeof(int));
        DwmSetWindowAttribute(hwnd, DWMWA_BORDER_COLOR,
            ref captionColor, sizeof(int));
    }

    private async void OnLoaded(object sender, RoutedEventArgs e)
    {
        try
        {
            await InitWebViewAsync();
        }
        catch (Exception ex)
        {
            MessageBox.Show(this,
                "WebView2 runtime could not be initialised.\n\n" +
                "Make sure the Microsoft Edge WebView2 runtime is installed " +
                "(it ships with Windows 10/11 by default since mid-2021).\n\n" +
                $"Details: {ex.Message}",
                "Oxygen Vault Offline",
                MessageBoxButton.OK,
                MessageBoxImage.Error);
            Close();
        }
    }

    private async Task InitWebViewAsync()
    {
        /* Keep the WebView2 user data (localStorage / IndexedDB / cookies)
           under %LOCALAPPDATA%\OxygenVaultOffline — survives updates,
           wiped on uninstall. */
        var userDataFolder = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "OxygenVaultOffline");
        Directory.CreateDirectory(userDataFolder);

        var env = await CoreWebView2Environment.CreateAsync(
            browserExecutableFolder: null,
            userDataFolder: userDataFolder);

        await WebView.EnsureCoreWebView2Async(env);

        var core = WebView.CoreWebView2;

        /* The React bundle lives next to the exe in `web/`. Map it to a
           virtual host so relative URLs (which Vite emits as ./assets/…)
           resolve correctly, and so localStorage is scoped to a stable
           origin instead of file://. */
        var appDir = AppContext.BaseDirectory;
        var webDir = Path.Combine(appDir, "web");
        core.SetVirtualHostNameToFolderMapping(
            "oxygenvault.local", webDir, CoreWebView2HostResourceAccessKind.Allow);

        /* Strip the default menus, hide the dev-tools hotkey in release,
           and route window.open / target=_blank through the system
           browser instead of opening a new WebView. */
        core.Settings.AreDevToolsEnabled = false;
        core.Settings.AreDefaultContextMenusEnabled = false;
        core.Settings.AreBrowserAcceleratorKeysEnabled = false;
        core.Settings.IsStatusBarEnabled = false;

        core.NewWindowRequested += (_, args) =>
        {
            args.Handled = true;
            try
            {
                System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo
                {
                    FileName = args.Uri,
                    UseShellExecute = true
                });
            }
            catch { /* ignore */ }
        };

        /* Bridge: renderer posts { type: "export" | "import", json? }. */
        core.WebMessageReceived += OnWebMessageReceived;

        /* Expose a tiny shim on the JS side so existing backup.js can
           detect "native Windows" host and use the real Save/Open
           dialogs instead of the browser download. */
        await core.AddScriptToExecuteOnDocumentCreatedAsync(JsShim);

        core.Navigate("https://oxygenvault.local/index.html");
    }

    private const string JsShim = @"
        (function () {
            const pending = new Map();
            let seq = 0;

            window.oxygenNative = {
                platform: 'win32-native',
                exportBackup: function (json) {
                    const id = ++seq;
                    return new Promise((resolve, reject) => {
                        pending.set(id, { resolve, reject });
                        window.chrome.webview.postMessage({
                            type: 'export', id, json
                        });
                    });
                },
                importBackup: function () {
                    const id = ++seq;
                    return new Promise((resolve, reject) => {
                        pending.set(id, { resolve, reject });
                        window.chrome.webview.postMessage({
                            type: 'import', id
                        });
                    });
                }
            };

            window.chrome.webview.addEventListener('message', function (e) {
                const { id, ok, result, error } = e.data || {};
                const p = pending.get(id);
                if (!p) return;
                pending.delete(id);
                if (ok) p.resolve(result); else p.reject(new Error(error || 'failed'));
            });
        })();
    ";

    private async void OnWebMessageReceived(object? sender, CoreWebView2WebMessageReceivedEventArgs args)
    {
        try
        {
            using var doc = JsonDocument.Parse(args.WebMessageAsJson);
            var root = doc.RootElement;
            var type = root.GetProperty("type").GetString();
            var id = root.GetProperty("id").GetInt32();

            switch (type)
            {
                case "export":
                    await HandleExportAsync(id, root.GetProperty("json").GetString() ?? "");
                    break;
                case "import":
                    await HandleImportAsync(id);
                    break;
                default:
                    Reply(id, false, error: $"Unknown message type: {type}");
                    break;
            }
        }
        catch (Exception ex)
        {
            /* Best-effort — we can't know the id if parse failed. */
            System.Diagnostics.Debug.WriteLine($"WebMessage error: {ex}");
        }
    }

    private Task HandleExportAsync(int id, string json)
    {
        var defaultName = $"oxygen-vault-{DateTime.Now:yyyyMMdd-HHmm}.json";
        var dlg = new SaveFileDialog
        {
            Title = "Save Oxygen Vault backup",
            FileName = defaultName,
            DefaultExt = ".json",
            Filter = "Oxygen Vault backup (*.json)|*.json|All files (*.*)|*.*",
            InitialDirectory = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile) + @"\Downloads"
        };
        var ok = dlg.ShowDialog(this) == true;
        if (!ok)
        {
            Reply(id, true, result: new { canceled = true });
            return Task.CompletedTask;
        }
        File.WriteAllText(dlg.FileName, json);
        Reply(id, true, result: new { canceled = false, filePath = dlg.FileName });
        return Task.CompletedTask;
    }

    private Task HandleImportAsync(int id)
    {
        var dlg = new OpenFileDialog
        {
            Title = "Open Oxygen Vault backup",
            DefaultExt = ".json",
            Filter = "Oxygen Vault backup (*.json)|*.json|All files (*.*)|*.*",
            Multiselect = false,
            CheckFileExists = true,
            InitialDirectory = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile) + @"\Downloads"
        };
        var ok = dlg.ShowDialog(this) == true;
        if (!ok)
        {
            Reply(id, true, result: new { canceled = true });
            return Task.CompletedTask;
        }
        var content = File.ReadAllText(dlg.FileName);
        Reply(id, true, result: new { canceled = false, filePath = dlg.FileName, content });
        return Task.CompletedTask;
    }

    private void Reply(int id, bool ok, object? result = null, string? error = null)
    {
        var payload = JsonSerializer.Serialize(new { id, ok, result, error });
        WebView.CoreWebView2.PostWebMessageAsJson(payload);
    }
}
