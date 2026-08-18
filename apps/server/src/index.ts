import 'dotenv/config';
import { buildApp } from './app.js';

const port = Number(process.env.PORT ?? 8787);
const host = process.env.HOST ?? '0.0.0.0';
const { app } = buildApp({
  adminKey: process.env.VOXORA_ADMIN_KEY ?? 'change-me-now',
  livekitUrl: process.env.LIVEKIT_URL ?? 'auto',
  livekitApiKey: process.env.LIVEKIT_API_KEY ?? 'devkey',
  livekitApiSecret: process.env.LIVEKIT_API_SECRET ?? 'voxora_dev_secret_change_me_123456789',
  corsOrigin: process.env.CORS_ORIGIN ?? '*'
});

await app.listen({ port, host });
console.log(`Voxora control API listening on http://${host}:${port}`);
