# Voxora Windows Installer

Voxora desktop uses Tauri 2 and is configured to produce an NSIS setup executable for Windows.

## What the installer does

- Installs Voxora for the current Windows user (no administrator rights required by default).
- Creates the normal Windows application entry/uninstaller.
- Uses the Voxora application icon.
- Uses the system WebView2 runtime when available and the Tauri WebView2 bootstrapper flow when required.
- Produces a `*-setup.exe` artifact.

## Build on a Windows PC

Requirements:

1. Windows 10/11 x64
2. Node.js 22+
3. Rust stable MSVC toolchain
4. Microsoft C++ Build Tools / Tauri Windows prerequisites
5. Internet access for the first dependency install/build

Then double-click:

`BUILD_WINDOWS_INSTALLER.bat`

Or from PowerShell:

```powershell
.\\scripts\\windows\\build-installer.ps1
```

The resulting installer is written to:

`apps\\desktop\\src-tauri\\target\\release\\bundle\\nsis\\`

## Build in GitHub Actions

The repository includes:

`.github/workflows/build-windows-installer.yml`

Run **Build Voxora Windows Installer** from the Actions tab. The workflow uploads the generated setup executable as an artifact.

## Connecting installed clients

At first launch the client asks for a Server Address. Examples:

- `192.168.1.50:8787`
- `https://voice.example.com`

Do not use `localhost` unless the Voxora server is running on the same PC as the client.

For a LAN deployment, keep `LIVEKIT_URL=auto` on the server. Voxora will derive a LiveKit URL using the server hostname and port `7880`.

For an Internet deployment behind TLS/reverse proxy, set a public reachable LiveKit URL explicitly, for example:

`LIVEKIT_URL=wss://voice.example.com`

The LiveKit UDP ports also need to be reachable according to the server deployment configuration.
