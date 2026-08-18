# Voxora v0.2.0 — Installer-ready preview

This release moves the MVP from a localhost-only development client toward a distributable Windows desktop application.

## Added

- Runtime Server Address field on the connection screen.
- Remembered server address between launches.
- Health check before session creation.
- Dynamic API and WebSocket endpoint selection.
- Automatic LAN LiveKit URL derivation when `LIVEKIT_URL=auto`.
- Configurable public LiveKit URL for Internet deployments.
- Tauri NSIS Windows setup configuration.
- Original Voxora Windows icon set.
- One-click `BUILD_WINDOWS_INSTALLER.bat` build helper.
- PowerShell prerequisite checks and release build script.
- GitHub Actions Windows installer build workflow.

## Installer output

A successful Windows build creates an NSIS setup executable under:

`apps/desktop/src-tauri/target/release/bundle/nsis/`

## Known MVP limitations

- Persistent users/channels/roles are not yet backed by PostgreSQL.
- Server settings and accounts are still MVP-level.
- Global PTT is currently wired to `Alt+V`; user-configurable native hotkey UI is a later milestone.
- Code signing is not configured yet, so an unsigned development installer may trigger Windows SmartScreen warnings.
