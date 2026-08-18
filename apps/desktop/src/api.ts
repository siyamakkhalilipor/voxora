import type { SessionResponse, VoiceCredentials, VoxoraChannel } from '@voxora/protocol';

const STORAGE_KEY = 'voxora.serverUrl';
let baseUrl = normalizeBaseUrl(localStorage.getItem(STORAGE_KEY) ?? import.meta.env.VITE_API_URL ?? 'http://localhost:8787');

function normalizeBaseUrl(input: string) {
  let value = input.trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(value)) value = `http://${value}`;
  return value;
}

export function setServerUrl(input: string) {
  baseUrl = normalizeBaseUrl(input);
  localStorage.setItem(STORAGE_KEY, baseUrl);
  return baseUrl;
}

export function getServerUrl() { return baseUrl; }
export function getWsUrl() { return baseUrl.replace(/^http/i, 'ws'); }

async function json<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${baseUrl}${url}`, options);
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try { const body = await res.json() as {message?:string}; message = body.message ?? message; } catch {}
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  health: () => json<{ok:boolean;service:string;protocolVersion:number}>('/health'),
  connect: (nickname:string, adminKey:string) => json<SessionResponse>('/api/sessions', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({nickname,adminKey:adminKey||undefined})}),
  voiceJoin: (token:string, channelId:string) => json<VoiceCredentials>('/api/voice/join',{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${token}`},body:JSON.stringify({channelId})}),
  createChannel: (token:string, input:{name:string;parentChannelId:string|null;maxUsers:number|null}) => json<VoxoraChannel>('/api/channels',{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${token}`},body:JSON.stringify(input)}),
  deleteChannel: (token:string, channelId:string) => json<void>(`/api/channels/${channelId}`,{method:'DELETE',headers:{authorization:`Bearer ${token}`}}),
  kick: (token:string,userId:string,reason='Removed by moderator') => json<void>('/api/moderation/kick',{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${token}`},body:JSON.stringify({userId,reason})})
};
