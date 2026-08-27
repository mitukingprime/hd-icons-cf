const UPLOADS_KEY = '_meta/uploads.json';

// POST /api/upload (multipart/form-data)
export async function onRequestPost(context) {
  const { env, request } = context;

  try {
    const formData = await request.formData();
    const files = formData.getAll('file');
    if (!files.length) {
      return Response.json({ status: 'error', message: '没有文件上传' }, { status: 400 });
    }

    const ALLOWED = /\.(png|jpg|jpeg|gif|ico|bmp|svg|tif|tiff|webp|apng)$/i;
    const uploaded = [];

    for (const file of files) {
      if (!(file instanceof File) || !file.name) continue;
      if (!ALLOWED.test(file.name)) continue;

      const key = `upload/${file.name}`;
      await env.ICONS_BUCKET.put(key, file.stream(), {
        httpMetadata: { contentType: file.type || 'application/octet-stream' },
      });
      uploaded.push(file.name);
    }

    const existing = await env.ICONS_BUCKET.get(UPLOADS_KEY);
    let list = existing ? await existing.json() : [];
    for (const name of uploaded) {
      if (!list.find((i) => i.name === name)) {
        list.push({ name, url: `__R2__/upload/${name}` });
      }
    }
    await env.ICONS_BUCKET.put(UPLOADS_KEY, JSON.stringify(list), {
      httpMetadata: { contentType: 'application/json' },
    });

    return Response.json({ status: 'success', uploaded });
  } catch (e) {
    return Response.json({ status: 'error', message: e.message }, { status: 500 });
  }
}
