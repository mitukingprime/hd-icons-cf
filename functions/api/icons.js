import { createStorage } from '../_lib/storage.js';

const UPLOADS_KEY = '_meta/uploads.json';

function parseBuiltinIcon(icon) {
  const urlPath = icon.url.replace(/^\/icons\//, '');
  const folder = urlPath.split('/')[0];
  return { name: icon.name, type: folder, url: icon.url };
}

// GET /api/icons?type=all&search=xxx
export async function onRequestGet(context) {
  const { env, request } = context;
  const storage = createStorage(env);
  if (!storage) {
    return Response.json({ status: 'error', message: 'Storage not configured' }, { status: 500 });
  }

  const url = new URL(request.url);
  const type = (url.searchParams.get('type') || 'all').toLowerCase();
  const search = (url.searchParams.get('search') || '').toLowerCase();

  let icons = [];
  const staticResp = await fetch(new URL('/icons.json', request.url));
  if (staticResp.ok) {
    const data = await staticResp.json();
    icons = (data.icons || []).map(parseBuiltinIcon);
  }

  const uploadedIcons = (await storage.getJSON(UPLOADS_KEY)) || [];

  let all = [...icons, ...uploadedIcons.map((u) => ({ ...u, type: 'upload' }))];

  if (type !== 'all') {
    all = all.filter((i) => i.type === type);
  }
  if (search) {
    all = all.filter((i) => i.name.toLowerCase().includes(search));
  }

  return Response.json({ total: all.length, icons: all });
}
