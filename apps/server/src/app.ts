import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { AccessToken } from 'livekit-server-sdk';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { hasPermission } from '@voxora/permissions';
import type { ClientEvent, ServerEvent, VoxoraUser } from '@voxora/protocol';
import { MemoryStore } from './store.js';

const JoinSchema = z.object({ nickname: z.string().trim().min(2).max(30), adminKey: z.string().optional() });
const ChannelJoinSchema = z.object({ channelId: z.string().min(1) });
const CreateChannelSchema = z.object({ name: z.string().trim().min(1).max(60), parentChannelId: z.string().nullable().default(null), maxUsers: z.number().int().positive().max(500).nullable().default(null) });
const MoveSchema = z.object({ userId: z.string().uuid(), channelId: z.string().min(1) });
const ModerateSchema = z.object({ userId: z.string().uuid(), reason: z.string().trim().min(1).max(200).default('No reason provided') });

export function buildApp(config: { adminKey: string; livekitUrl: string; livekitApiKey: string; livekitApiSecret: string; corsOrigin?: string }) {
  const app = Fastify({ logger: false, trustProxy: true });
  const store = new MemoryStore();
  const sockets = new Map<string, Set<WebSocket>>();

  function resolveLivekitUrl(req: { protocol: string; hostname: string }) {
    if (config.livekitUrl && config.livekitUrl !== 'auto') return config.livekitUrl;
    const scheme = req.protocol === 'https' ? 'wss' : 'ws';
    return `${scheme}://${req.hostname}:7880`;
  }

  app.register(cors, { origin: config.corsOrigin === '*' ? true : (config.corsOrigin ?? true) });
  app.register(websocket);

  function getBearer(raw?: string) { return raw?.startsWith('Bearer ') ? raw.slice(7) : undefined; }
  function actor(req: { headers: { authorization?: string } }): VoxoraUser {
    const user = store.getUserByToken(getBearer(req.headers.authorization));
    if (!user) throw Object.assign(new Error('Invalid or expired session'), { statusCode: 401, code: 'SESSION_INVALID' });
    return user;
  }
  function broadcast(event: ServerEvent) {
    const data = JSON.stringify(event);
    for (const set of sockets.values()) for (const socket of set) if (socket.readyState === 1) socket.send(data);
  }
  function updateAndBroadcast(userId: string, patch: Partial<VoxoraUser>) {
    const updated = store.updateUser(userId, patch);
    if (updated) broadcast({ type:'user.updated', user: updated });
    return updated;
  }

  app.get('/health', async () => ({ ok:true, service:'voxora-control-api', protocolVersion:1 }));
  app.get('/api/server', async () => store.state());

  app.post('/api/sessions', async (req, reply) => {
    const input = JoinSchema.parse(req.body);
    const { token, user } = store.createSession(input.nickname, Boolean(input.adminKey && input.adminKey === config.adminKey));
    broadcast({ type:'user.joined', user });
    return reply.code(201).send({ sessionToken: token, user, state: store.state() });
  });

  app.get('/api/state', async (req) => { actor(req); return store.state(); });

  app.post('/api/voice/join', async (req, reply) => {
    const user = actor(req);
    const { channelId } = ChannelJoinSchema.parse(req.body);
    const channel = store.channels.get(channelId);
    if (!channel) return reply.code(404).send({ code:'CHANNEL_NOT_FOUND', message:'Channel not found' });
    if (!hasPermission(user.role, 'channel.join')) return reply.code(403).send({ code:'PERMISSION_DENIED', message:'Cannot join channel' });
    if (channel.locked && !hasPermission(user.role, 'server.manage')) return reply.code(403).send({ code:'CHANNEL_LOCKED', message:'Channel is locked' });
    if (channel.maxUsers !== null) {
      const count = [...store.users.values()].filter(u => u.channelId === channelId).length;
      if (count >= channel.maxUsers) return reply.code(409).send({ code:'CHANNEL_FULL', message:'Channel is full' });
    }
    updateAndBroadcast(user.id, { channelId, speaking:false });
    const roomName = `voxora:${store.server.id}:${channelId}`;
    const token = new AccessToken(config.livekitApiKey, config.livekitApiSecret, { identity:user.id, name:user.nickname, ttl:'10m' });
    token.addGrant({ roomJoin:true, room:roomName, canPublish:true, canSubscribe:true, canPublishData:true });
    return { serverUrl: resolveLivekitUrl(req), participantToken: await token.toJwt(), roomName, channelId };
  });

  app.post('/api/channels', async (req, reply) => {
    const user = actor(req);
    if (!hasPermission(user.role, 'channel.create')) return reply.code(403).send({ code:'PERMISSION_DENIED', message:'Cannot create channels' });
    const input = CreateChannelSchema.parse(req.body);
    if (input.parentChannelId && !store.channels.has(input.parentChannelId)) return reply.code(404).send({ code:'PARENT_NOT_FOUND', message:'Parent channel not found' });
    const channel = store.createChannel(input);
    broadcast({ type:'channel.created', channel });
    return reply.code(201).send(channel);
  });

  app.delete('/api/channels/:channelId', async (req, reply) => {
    const user = actor(req);
    if (!hasPermission(user.role, 'channel.delete')) return reply.code(403).send({ code:'PERMISSION_DENIED', message:'Cannot delete channels' });
    const channelId = (req.params as {channelId:string}).channelId;
    if (!store.channels.has(channelId)) return reply.code(404).send({ code:'CHANNEL_NOT_FOUND', message:'Channel not found' });
    store.deleteChannel(channelId);
    broadcast({ type:'channel.deleted', channelId });
    return reply.code(204).send();
  });

  app.post('/api/moderation/move', async (req, reply) => {
    const user = actor(req);
    if (!hasPermission(user.role, 'channel.move_user')) return reply.code(403).send({ code:'PERMISSION_DENIED', message:'Cannot move users' });
    const input = MoveSchema.parse(req.body);
    if (!store.channels.has(input.channelId)) return reply.code(404).send({ code:'CHANNEL_NOT_FOUND', message:'Channel not found' });
    const target = updateAndBroadcast(input.userId, { channelId:input.channelId, speaking:false });
    if (!target) return reply.code(404).send({ code:'USER_NOT_FOUND', message:'User not found' });
    return target;
  });

  app.post('/api/moderation/kick', async (req, reply) => {
    const user = actor(req);
    if (!hasPermission(user.role, 'user.kick')) return reply.code(403).send({ code:'PERMISSION_DENIED', message:'Cannot kick users' });
    const input = ModerateSchema.parse(req.body);
    if (!store.users.has(input.userId)) return reply.code(404).send({ code:'USER_NOT_FOUND', message:'User not found' });
    store.removeUser(input.userId);
    broadcast({ type:'moderation.kicked', userId:input.userId, reason:input.reason });
    broadcast({ type:'user.left', userId:input.userId });
    return reply.code(204).send();
  });

  app.post('/api/moderation/ban', async (req, reply) => {
    const user = actor(req);
    if (!hasPermission(user.role, 'user.ban')) return reply.code(403).send({ code:'PERMISSION_DENIED', message:'Cannot ban users' });
    const input = ModerateSchema.parse(req.body);
    const target = store.users.get(input.userId);
    if (!target) return reply.code(404).send({ code:'USER_NOT_FOUND', message:'User not found' });
    store.bannedNicknames.add(target.nickname.toLowerCase());
    store.removeUser(input.userId);
    broadcast({ type:'moderation.kicked', userId:input.userId, reason:`Banned: ${input.reason}` });
    broadcast({ type:'user.left', userId:input.userId });
    return reply.code(204).send();
  });

  app.get('/ws', { websocket:true }, (socket, req) => {
    const url = new URL(req.url ?? '/ws', 'http://localhost');
    const token = url.searchParams.get('session') ?? undefined;
    const user = store.getUserByToken(token);
    if (!user || !token) { socket.close(1008, 'Invalid session'); return; }
    const set = sockets.get(token) ?? new Set<WebSocket>();
    set.add(socket); sockets.set(token, set);
    socket.send(JSON.stringify({ type:'state.snapshot', state:store.state() } satisfies ServerEvent));
    socket.on('message', raw => {
      try {
        const event = JSON.parse(raw.toString()) as ClientEvent;
        if (event.type === 'presence.speaking') updateAndBroadcast(user.id, { speaking:event.speaking });
        if (event.type === 'presence.audio_state') updateAndBroadcast(user.id, { muted:event.muted, deafened:event.deafened });
        if (event.type === 'message.send') {
          const fresh = store.users.get(user.id); if (!fresh || !hasPermission(fresh.role, 'message.send')) return;
          const text = event.text.trim().slice(0, 1000); if (!text) return;
          broadcast({ type:'message.created', id:randomUUID(), scope:event.scope, channelId:event.channelId, senderId:user.id, senderName:user.nickname, text, createdAt:new Date().toISOString() });
        }
      } catch { socket.send(JSON.stringify({ type:'error', code:'BAD_EVENT' })); }
    });
    socket.on('close', () => { set.delete(socket); if (set.size === 0) sockets.delete(token); });
  });

  app.setErrorHandler((error, _req, reply) => {
    const anyError = error as Error & { statusCode?:number; code?:string };
    const status = anyError.statusCode ?? (anyError.name === 'ZodError' ? 400 : 500);
    reply.code(status).send({ code:anyError.code ?? (status === 400 ? 'INVALID_REQUEST' : 'INTERNAL_ERROR'), message:anyError.message });
  });

  return { app, store };
}
