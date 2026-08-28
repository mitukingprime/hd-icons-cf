import { createStorage } from '../_lib/storage.js';
import { getHiddenList } from '../_lib/hidden.js';

const UPLOADS_KEY = '_meta/uploads.json';
const CATEGORIES_KEY = '_meta/categories.json';

// GET /api/stats
export async function onRequestGet(context) {
  const { env, request } = context;
  const storage = createStorage(env);
  if (!storage) {
    return Response.json({ status: 'error', message: 'Storage not configured' }, { status: 500 });
  }

  const counts = { 'border-radius': 0, AI: 0, Docker: 0, NAS: 0, PT: 0, '云服务': 0, upload: 0, total: 0 };
  const hiddenSet = new Set(await getHiddenList(storage));

  const staticResp = await fetch(new URL('/icons.json', request.url));
  if (staticResp.ok) {
    const data = await staticResp.json();
    for (const icon of data.icons || []) {
      const path = icon.url.replace(/^\/icons\//, '');
      if (hiddenSet.has(path)) continue;
      const folder = path.split('/')[0];
      counts[folder] = (counts[folder] || 0) + 1;
      counts.total += 1;
    }
    counts.update_at = data.update_at;
  }

  const list = await storage.getJSON(UPLOADS_KEY);
  if (list) {
    for (const icon of list) {
      const cat = icon.category || 'upload';
      counts[cat] = (counts[cat] || 0) + 1;
      counts.total += 1;
    }
  }

  const customCategories = (await storage.getJSON(CATEGORIES_KEY)) || [];
  counts.customCategories = customCategories;

  return Response.json(counts);
}
