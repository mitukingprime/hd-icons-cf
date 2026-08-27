const GITHUB_RAW_PREFIX = 'https://raw.githubusercontent.com/mitukingprime/HD-Icons/main/';
const META_KEY = '_meta/icons.json';
const UPLOADS_KEY = '_meta/uploads.json';

// GET /api/icons?type=all&search=xxx
export async function onRequestGet(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const type = (url.searchParams.get('type') || 'all').toLowerCase();
  const search = (url.searchParams.get('search') || '').toLowerCase();

  const meta = await env.ICONS_BUCKET.get(META_KEY);
  let icons = [];
  if (meta) {
    const data = await meta.json();
    icons = (data.icons || []).map((icon) => {
      const urlPath = icon.url.replace(GITHUB_RAW_PREFIX, '');
      const folder = urlPath.split('/')[0];
      return { name: icon.name, type: folder, url: icon.url };
    });
  }

  const uploads = await env.ICONS_BUCKET.get(UPLOADS_KEY);
  let uploadedIcons = [];
  if (uploads) {
    uploadedIcons = await uploads.json();
  }

  let all = [...icons, ...uploadedIcons.map((u) => ({ ...u, type: 'upload' }))];

  if (type !== 'all') {
    all = all.filter((i) => i.type === type);
  }
  if (search) {
    all = all.filter((i) => i.name.toLowerCase().includes(search));
  }

  return Response.json({ total: all.length, icons: all });
}
