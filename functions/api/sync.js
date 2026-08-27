const GITHUB_ICONS_JSON = 'https://raw.githubusercontent.com/xushier/HD-Icons/main/icons.json';
const META_KEY = '_meta/icons.json';

// POST /api/sync
export async function onRequestPost(context) {
  const { env } = context;

  try {
    const resp = await fetch(GITHUB_ICONS_JSON, {
      headers: { 'User-Agent': 'HD-Icons-CF/1.0' },
    });
    if (!resp.ok) {
      return Response.json(
        { status: 'error', message: `GitHub returned ${resp.status}` },
        { status: 502 }
      );
    }
    const data = await resp.json();

    await env.ICONS_BUCKET.put(META_KEY, JSON.stringify(data), {
      httpMetadata: { contentType: 'application/json' },
    });

    return Response.json({
      status: 'success',
      total: data.total_count,
      update_at: data.update_at,
    });
  } catch (e) {
    return Response.json({ status: 'error', message: e.message }, { status: 500 });
  }
}
