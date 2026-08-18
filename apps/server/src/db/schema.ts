// Persistence schema planned for the next milestone. The current MVP intentionally keeps
// guest presence ephemeral while Docker already provisions PostgreSQL for account/ban history.
export interface PersistedBanRecord {
  id: string;
  serverId: string;
  normalizedNickname: string;
  reason: string;
  createdAt: string;
  expiresAt: string | null;
}
