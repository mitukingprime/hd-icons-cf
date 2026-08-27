const UPLOADS_KEY = '_meta/uploads.json';

// GET /api/stats
export async function onRequestGet(context) {
  const { env, request } = context;

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

  const uploads = await env.ICONS_BUCKET.get(UPLOADS_KEY);
  if (uploads) {
    const list = await uploads.json();
    counts.upload = list.length;
    counts.total += list.length;
  }

  return Response.json(counts);
}
