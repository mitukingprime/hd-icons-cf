import { createStorage } from '../_lib/storage.js';

const UPLOADS_KEY = '_meta/uploads.json';

function getStorageKey(category, name) {
  if (category === 'upload' || !category) return `upload/${name}`;
  return `icons/${category}/${name}`;
}

// POST /api/delete  { name, category? }
export async function onRequestPost(context) {
  const { env, request } = context;
  const storage = createStorage(env);
  if (!storage) {
    return Response.json({ status: 'error', message: 'Storage not configured' }, { status: 500 });
  }

  try {
    const { name, category } = await request.json();
    if (!name) {
      return Response.json({ status: 'error', message: '缺少文件名' }, { status: 400 });
    }

    const cat = category || 'upload';
    const key = getStorageKey(cat, name);
    await storage.deleteFile(key);

    // Backward compat: also try legacy upload path if category was not provided
    if (!category) {
      await storage.deleteFile(`upload/${name}`);
    }

    let list = (await storage.getJSON(UPLOADS_KEY)) || [];
    if (category) {
      list = list.filter((i) => !(i.name === name && (i.category || 'upload') === cat));
    } else {
      list = list.filter((i) => i.name !== name);
    }
    await storage.putJSON(UPLOADS_KEY, list);

    return Response.json({ status: 'success' });
  } catch (e) {
    return Response.json({ status: 'error', message: e.message }, { status: 500 });
  }
}
