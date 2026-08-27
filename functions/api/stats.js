import { createStorage } from '../_lib/storage.js';

const UPLOADS_KEY = '_meta/uploads.json';

// GET /api/stats
export async function onRequestGet(context) {
  const { env, request } = context;
  const storage = createStorage(env);
  if (!storage) {
    return Response.json({ status: 'error', message: 'Storage not configured' }, { status: 500 });
  }

  const counts = { 'border-radius': 0, circle: 0, svg: 0, upload: 0, total: 0 };

  const staticResp = await fetch(new URL('/icons.json', request.url));
  if (staticResp.ok) {
    const data = await staticResp.json();
    for (const icon of data.icons || []) {
      const folder = icon.url.replace(/^\/icons\//, '').split('/')[0];
      counts[folder] = (counts[folder] || 0) + 1;
    }
    counts.total += data.icons?.length || 0;
    counts.update_at = data.update_at;
  }

  const list = await storage.getJSON(UPLOADS_KEY);
  if (list) {
    counts.upload = list.length;
    counts.total += list.length;
  }

  return Response.json(counts);
}
