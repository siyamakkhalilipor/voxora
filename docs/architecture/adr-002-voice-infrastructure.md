# ADR-002: LiveKit self-hosted for voice transport

Status: Accepted.

Voxora does not implement an SFU/RTP stack from scratch in the MVP. Each Voxora voice channel maps to a LiveKit room named `voxora:{serverId}:{channelId}`. The control API authorizes the channel change and issues a short-lived room-scoped participant token. API secrets are never shipped to clients.
