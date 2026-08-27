// GET /r2/* — serve images from R2
export async function onRequestGet(context) {
  const { env, params } = context;
  const key = params.path.join('/');

  const obj = await env.ICONS_BUCKET.get(key);
  if (!obj) {
    return new Response('Not Found', { status: 404 });
  }

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  headers.set('Access-Control-Allow-Origin', '*');

  return new Response(obj.body, { headers });
}
