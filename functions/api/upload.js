import { createStorage } from '../_lib/storage.js';

const UPLOADS_KEY = '_meta/uploads.json';

// POST /api/upload (multipart/form-data)
export async function onRequestPost(context) {
  const { env, request } = context;
  const storage = createStorage(env);
  if (!storage) {
    return Response.json({ status: 'error', message: 'Storage not configured' }, { status: 500 });
  }

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
      await storage.putFile(key, file.stream(), file.type || 'application/octet-stream');
      uploaded.push(file.name);
    }

    let list = (await storage.getJSON(UPLOADS_KEY)) || [];
    for (const name of uploaded) {
      if (!list.find((i) => i.name === name)) {
        list.push({ name, url: `__R2__/upload/${name}` });
      }
    }
    await storage.putJSON(UPLOADS_KEY, list);

    return Response.json({ status: 'success', uploaded });
  } catch (e) {
    return Response.json({ status: 'error', message: e.message }, { status: 500 });
  }
}
