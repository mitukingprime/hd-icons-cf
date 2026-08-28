import { createStorage } from '../_lib/storage.js';
import { addToHidden, builtinPath } from '../_lib/hidden.js';

const UPLOADS_KEY = '_meta/uploads.json';

function getStorageKey(category, name) {
  if (category === 'upload' || !category) return `upload/${name}`;
  return `icons/${category}/${name}`;
}

// POST /api/delete  { name, category?, builtin? }
export async function onRequestPost(context) {
  const { env, request } = context;
  const storage = createStorage(env);
  if (!storage) {
    return Response.json({ status: 'error', message: 'Storage not configured' }, { status: 500 });
  }

  try {
    const { name, category, builtin } = await request.json();
    if (!name) {
      return Response.json({ status: 'error', message: '缺少文件名' }, { status: 400 });
    }

    const cat = category || 'upload';
    const list = (await storage.getJSON(UPLOADS_KEY)) || [];
    const uploadIdx = list.findIndex(
      (i) => i.name === name && (i.category || 'upload') === cat,
    );

    if (builtin || uploadIdx === -1) {
      await addToHidden(storage, builtinPath(cat, name));
      return Response.json({ status: 'success' });
    }

    const key = getStorageKey(cat, name);
    await storage.deleteFile(key);

    // Backward compat: also try legacy upload path if category was not provided
    if (!category) {
      await storage.deleteFile(`upload/${name}`);
    }

    list.splice(uploadIdx, 1);
    await storage.putJSON(UPLOADS_KEY, list);

    return Response.json({ status: 'success' });
  } catch (e) {
    return Response.json({ status: 'error', message: e.message }, { status: 500 });
  }
}
