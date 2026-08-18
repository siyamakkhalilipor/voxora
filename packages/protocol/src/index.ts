export type Role = 'owner' | 'admin' | 'moderator' | 'member' | 'guest';

export type Permission =
  | 'server.manage'
  | 'channel.create'
  | 'channel.edit'
  | 'channel.delete'
  | 'channel.join'
  | 'channel.move_user'
  | 'user.kick'
  | 'user.ban'
  | 'role.assign'
  | 'message.send'
  | 'voice.speak';

export interface VoxoraUser {
  id: string;
  nickname: string;
  role: Role;
  channelId: string | null;
  muted: boolean;
  deafened: boolean;
  speaking: boolean;
  connectedAt: string;
}

export interface VoxoraChannel {
  id: string;
  name: string;
  description: string;
  parentChannelId: string | null;
  order: number;
  maxUsers: number | null;
  passwordProtected: boolean;
  locked: boolean;
}

export interface ServerState {
  server: { id: string; name: string; welcomeMessage: string };
  channels: VoxoraChannel[];
  users: VoxoraUser[];
}

export interface SessionResponse {
  sessionToken: string;
  user: VoxoraUser;
  state: ServerState;
}

export interface VoiceCredentials {
  serverUrl: string;
  participantToken: string;
  roomName: string;
  channelId: string;
}

export type ClientEvent =
  | { type: 'presence.speaking'; speaking: boolean }
  | { type: 'presence.audio_state'; muted: boolean; deafened: boolean }
  | { type: 'message.send'; scope: 'server' | 'channel'; channelId?: string; text: string };

export type ServerEvent =
  | { type: 'state.snapshot'; state: ServerState }
  | { type: 'user.joined'; user: VoxoraUser }
  | { type: 'user.left'; userId: string }
  | { type: 'user.updated'; user: VoxoraUser }
  | { type: 'channel.created'; channel: VoxoraChannel }
  | { type: 'channel.deleted'; channelId: string }
  | { type: 'message.created'; id: string; scope: 'server' | 'channel'; channelId?: string; senderId: string; senderName: string; text: string; createdAt: string }
  | { type: 'moderation.kicked'; userId: string; reason: string };

export interface ApiError {
  code: string;
  message: string;
}
