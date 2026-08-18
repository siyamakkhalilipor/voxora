import { randomUUID } from 'node:crypto';
import type { ServerState, VoxoraChannel, VoxoraUser } from '@voxora/protocol';

export interface Session { token: string; userId: string; banned: boolean }

export class MemoryStore {
  readonly server = { id: 'voxora-dev', name: 'Voxora Development', welcomeMessage: 'Voice first. No account required.' };
  readonly channels = new Map<string, VoxoraChannel>();
  readonly users = new Map<string, VoxoraUser>();
  readonly sessions = new Map<string, Session>();
  readonly bannedNicknames = new Set<string>();

  constructor() {
    const seeded: VoxoraChannel[] = [
      { id:'lobby', name:'Lobby', description:'Default meeting point', parentChannelId:null, order:10, maxUsers:null, passwordProtected:false, locked:false },
      { id:'gaming', name:'Gaming', description:'Game rooms', parentChannelId:null, order:20, maxUsers:null, passwordProtected:false, locked:false },
      { id:'cs2', name:'CS2', description:'Counter-Strike 2', parentChannelId:'gaming', order:10, maxUsers:12, passwordProtected:false, locked:false },
      { id:'valorant', name:'Valorant', description:'Valorant squads', parentChannelId:'gaming', order:20, maxUsers:10, passwordProtected:false, locked:false },
      { id:'community', name:'Community', description:'General voice rooms', parentChannelId:null, order:30, maxUsers:null, passwordProtected:false, locked:false },
      { id:'music', name:'Music', description:'Music and chill', parentChannelId:'community', order:10, maxUsers:20, passwordProtected:false, locked:false },
      { id:'afk', name:'AFK', description:'Away from keyboard', parentChannelId:null, order:99, maxUsers:null, passwordProtected:false, locked:false }
    ];
    seeded.forEach(c => this.channels.set(c.id, c));
  }

  createSession(nickname: string, owner: boolean) {
    if (this.bannedNicknames.has(nickname.toLowerCase())) throw Object.assign(new Error('You are banned'), { code: 'USER_BANNED' });
    const user: VoxoraUser = {
      id: randomUUID(), nickname, role: owner ? 'owner' : 'guest', channelId: null,
      muted: false, deafened: false, speaking: false, connectedAt: new Date().toISOString()
    };
    const token = randomUUID();
    this.users.set(user.id, user);
    this.sessions.set(token, { token, userId: user.id, banned: false });
    return { token, user };
  }

  getUserByToken(token: string | undefined): VoxoraUser | null {
    if (!token) return null;
    const session = this.sessions.get(token);
    if (!session || session.banned) return null;
    return this.users.get(session.userId) ?? null;
  }

  state(): ServerState {
    return { server: this.server, channels: [...this.channels.values()], users: [...this.users.values()] };
  }

  updateUser(id: string, patch: Partial<VoxoraUser>) {
    const current = this.users.get(id);
    if (!current) return null;
    const updated = { ...current, ...patch };
    this.users.set(id, updated);
    return updated;
  }

  createChannel(input: { name: string; parentChannelId: string | null; maxUsers: number | null }): VoxoraChannel {
    const channel: VoxoraChannel = {
      id: randomUUID(), name: input.name, description: '', parentChannelId: input.parentChannelId,
      order: Date.now(), maxUsers: input.maxUsers, passwordProtected: false, locked: false
    };
    this.channels.set(channel.id, channel);
    return channel;
  }

  deleteChannel(channelId: string) {
    if (['lobby','gaming','community','afk'].includes(channelId)) throw Object.assign(new Error('Seed channel cannot be deleted'), { code:'CHANNEL_PROTECTED' });
    this.channels.delete(channelId);
    for (const user of this.users.values()) if (user.channelId === channelId) this.updateUser(user.id, { channelId: null, speaking:false });
  }

  removeUser(userId: string) {
    const user = this.users.get(userId);
    if (!user) return;
    this.users.delete(userId);
    for (const [token, session] of this.sessions) if (session.userId === userId) this.sessions.delete(token);
  }
}
