# Voxora MVP build status

## Milestone 1 implemented

- Original desktop UI shell
- Guest and owner sessions
- Nested voice channel tree
- WebSocket presence and chat
- Centralized role permissions
- Channel creation/deletion
- Kick, ban and move APIs
- Backend-issued LiveKit voice tokens
- LiveKit client audio connection
- Push-to-talk (Space in focused client, Alt+V through Tauri global shortcut)
- Voice activation / continuous modes
- Mute / deafen
- Talking/presence indicators
- Docker Compose for LiveKit, PostgreSQL and control API
- Tauri 2 desktop shell
- API and permission test suites

## Next milestone

The current control-plane state is intentionally ephemeral. The next production milestone is persistent users/roles/bans/audit logs in PostgreSQL, rate limiting, reconnect session recovery, installer signing and full Windows hardware smoke tests.

## Verification performed in this delivery environment

- JSON configuration parse check
- TypeScript syntax transpilation check across source files
- `@voxora/protocol` strict TypeScript typecheck
- Source structure smoke check

Full dependency install, Vitest execution, LiveKit runtime test, Docker boot and Tauri/Rust compilation could not be performed in the delivery container because it has no outbound npm DNS, Docker or Rust toolchain.
