const UPLOADS_KEY = '_meta/uploads.json';

// POST /api/delete  { "name": "xxx.png" }
export async function onRequestPost(context) {
  const { env, request } = context;

  try {
    const { name } = await request.json();
    if (!name) {
      return Response.json({ status: 'error', message: '缺少文件名' }, { status: 400 });
    }

    await env.ICONS_BUCKET.delete(`upload/${name}`);

    const existing = await env.ICONS_BUCKET.get(UPLOADS_KEY);
    let list = existing ? await existing.json() : [];
    list = list.filter((i) => i.name !== name);
    await env.ICONS_BUCKET.put(UPLOADS_KEY, JSON.stringify(list), {
      httpMetadata: { contentType: 'application/json' },
    });

    return Response.json({ status: 'success' });
  } catch (e) {
    return Response.json({ status: 'error', message: e.message }, { status: 500 });
  }
}
