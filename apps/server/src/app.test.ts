import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from './app.js';

const instances: ReturnType<typeof buildApp>[] = [];
function make() {
  const value = buildApp({ adminKey:'secret-admin', livekitUrl:'ws://localhost:7880', livekitApiKey:'devkey', livekitApiSecret:'secret' });
  instances.push(value); return value;
}
afterEach(async () => { while (instances.length) await instances.pop()!.app.close(); });

describe('Voxora API', () => {
  it('creates a guest session', async () => {
    const { app } = make();
    const res = await app.inject({ method:'POST', url:'/api/sessions', payload:{nickname:'Alice'} });
    expect(res.statusCode).toBe(201);
    expect(res.json().user.role).toBe('guest');
  });
  it('grants owner only with the admin key', async () => {
    const { app } = make();
    const res = await app.inject({ method:'POST', url:'/api/sessions', payload:{nickname:'Owner', adminKey:'secret-admin'} });
    expect(res.json().user.role).toBe('owner');
  });
  it('blocks guest channel creation', async () => {
    const { app } = make();
    const session = await app.inject({ method:'POST', url:'/api/sessions', payload:{nickname:'Guest'} });
    const token = session.json().sessionToken;
    const res = await app.inject({ method:'POST', url:'/api/channels', headers:{authorization:`Bearer ${token}`}, payload:{name:'Nope', parentChannelId:null, maxUsers:null} });
    expect(res.statusCode).toBe(403);
  });
  it('allows owner channel creation', async () => {
    const { app } = make();
    const session = await app.inject({ method:'POST', url:'/api/sessions', payload:{nickname:'Admin', adminKey:'secret-admin'} });
    const token = session.json().sessionToken;
    const res = await app.inject({ method:'POST', url:'/api/channels', headers:{authorization:`Bearer ${token}`}, payload:{name:'Squad', parentChannelId:'gaming', maxUsers:5} });
    expect(res.statusCode).toBe(201);
    expect(res.json().name).toBe('Squad');
  });
});
