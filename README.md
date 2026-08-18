# Voxora v0.2.0 — Voice Communication MVP

Voxora is an original, self-hostable TeamSpeak-style voice communication project focused on low-latency voice channels, push-to-talk, permissions and moderation.

## Windows installer status

The repository is now **Windows-installer ready** using Tauri 2 + NSIS.

On Windows, double-click:

`BUILD_WINDOWS_INSTALLER.bat`

The generated installer is placed in:

`apps/desktop/src-tauri/target/release/bundle/nsis/`

A GitHub Actions workflow is also included at:

`.github/workflows/build-windows-installer.yml`

See `docs/deployment/WINDOWS_INSTALLER.md` for details.

## What works in this MVP

- Runtime Server Address entry (LAN IP, domain, HTTP/HTTPS)
- Remembered last server
- Guest connection with optional admin key
- Seeded nested voice-channel tree
- Real-time presence over WebSocket
- Join/move between voice channels
- LiveKit token issuance from the backend
- LiveKit audio room connection in the client
- Push-to-talk (keyboard + Tauri global shortcut wiring)
- Voice activation / continuous microphone modes
- Mute and deafen controls
- Speaking indicators
- Owner/admin permissions
- Create/delete channels
- Kick/ban/move moderation API
- Channel/server text chat events
- Docker Compose for PostgreSQL + LiveKit + API
- Tauri 2 desktop shell
- NSIS installer configuration and app icons

## Quick server start

Copy the environment file:

```bash
cp .env.example .env
```

Install dependencies:

```bash
npm install
```

Start services:

```bash
docker compose up -d
```

For LAN use, leave:

```env
LIVEKIT_URL=auto
```

Then installed clients can connect to the host PC using an address such as:

`192.168.1.50:8787`

For Internet deployment, configure a public TLS endpoint and set `LIVEKIT_URL` to the public `wss://` address.

## Development

Start the control server:

```bash
npm run dev:server
```

Start the frontend:

```bash
npm run dev:desktop
```

For Tauri development:

```bash
npm run tauri:dev -w @voxora/desktop
```

## Security notes

The LiveKit API secret remains on the server. Clients receive short-lived room-scoped tokens only after authorization checks. The client does not contain the LiveKit secret.

This is still an MVP. Persistent database-backed identity, production-grade account authentication, code signing and hardened deployment are follow-up milestones.
