const GITHUB_RAW_PREFIX = 'https://raw.githubusercontent.com/xushier/HD-Icons/main/';
const META_KEY = '_meta/icons.json';
const UPLOADS_KEY = '_meta/uploads.json';

// GET /api/stats
export async function onRequestGet(context) {
  const { env } = context;
  const meta = await env.ICONS_BUCKET.get(META_KEY);
  const uploads = await env.ICONS_BUCKET.get(UPLOADS_KEY);

  const counts = { 'border-radius': 0, circle: 0, svg: 0, upload: 0, total: 0 };

  if (meta) {
    const data = await meta.json();
    for (const icon of data.icons || []) {
      const folder = icon.url.replace(GITHUB_RAW_PREFIX, '').split('/')[0];
      counts[folder] = (counts[folder] || 0) + 1;
    }
    counts.total += data.icons?.length || 0;
    counts.update_at = data.update_at;
  }

  if (uploads) {
    const list = await uploads.json();
    counts.upload = list.length;
    counts.total += list.length;
  }

  return Response.json(counts);
}
