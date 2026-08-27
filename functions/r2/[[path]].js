import { createStorage } from '../_lib/storage.js';

export async function onRequestGet(context) {
  const { env, params } = context;
  const storage = createStorage(env);
  if (!storage) return new Response('Storage not configured', { status: 500 });

  const key = params.path.join('/');
  const file = await storage.getFile(key);
  if (!file) return new Response('Not Found', { status: 404 });

  const headers = new Headers();
  if (file.contentType) headers.set('Content-Type', file.contentType);
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  headers.set('Access-Control-Allow-Origin', '*');

  return new Response(file.body, { headers });
}
