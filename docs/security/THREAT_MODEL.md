# Voxora MVP threat model

Trust boundaries:

- Desktop clients are untrusted.
- LiveKit API credentials are server-only.
- A session token grants control-plane identity until process restart in this MVP.
- Moderation actions are authorized exclusively by the backend.

MVP protections:

- Input validation with Zod.
- Centralized role/permission checks.
- Short-lived LiveKit room tokens.
- No voice recording.
- No telemetry.
- No password/account database in the guest-only MVP.

Before internet production use, add TLS/WSS termination, persistent account authentication, database-backed bans, rate limiting, audit logs, secret rotation and a restrictive CORS policy.
