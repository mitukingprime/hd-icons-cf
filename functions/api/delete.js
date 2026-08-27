import { createStorage } from '../_lib/storage.js';

const UPLOADS_KEY = '_meta/uploads.json';

// POST /api/delete  { "name": "xxx.png" }
export async function onRequestPost(context) {
  const { env, request } = context;
  const storage = createStorage(env);
  if (!storage) {
    return Response.json({ status: 'error', message: 'Storage not configured' }, { status: 500 });
  }

  try {
    const { name } = await request.json();
    if (!name) {
      return Response.json({ status: 'error', message: '缺少文件名' }, { status: 400 });
    }

    await storage.deleteFile(`upload/${name}`);

    let list = (await storage.getJSON(UPLOADS_KEY)) || [];
    list = list.filter((i) => i.name !== name);
    await storage.putJSON(UPLOADS_KEY, list);

    return Response.json({ status: 'success' });
  } catch (e) {
    return Response.json({ status: 'error', message: e.message }, { status: 500 });
  }
}
