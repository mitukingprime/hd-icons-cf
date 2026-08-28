import { createStorage } from '../_lib/storage.js';

const UPLOADS_KEY = '_meta/uploads.json';

function getStorageKey(category, name) {
  if (category === 'upload' || !category) return `upload/${name}`;
  return `icons/${category}/${name}`;
}

// POST /api/rename  { category, oldName, newName }
export async function onRequestPost(context) {
  const { env, request } = context;
  const storage = createStorage(env);
  if (!storage) {
    return Response.json({ status: 'error', message: 'Storage not configured' }, { status: 500 });
  }

  try {
    const { category, oldName, newName } = await request.json();
    const cat = category || 'upload';
    const old = (oldName || '').trim();
    const neu = (newName || '').trim();

    if (!old || !neu) {
      return Response.json({ status: 'error', message: '文件名不能为空' }, { status: 400 });
    }
    if (old === neu) {
      return Response.json({ status: 'error', message: '新名称与旧名称相同' }, { status: 400 });
    }

    const list = (await storage.getJSON(UPLOADS_KEY)) || [];
    const idx = list.findIndex((i) => i.name === old && (i.category || 'upload') === cat);
    if (idx === -1) {
      return Response.json({ status: 'error', message: '图标不存在' }, { status: 404 });
    }

    const duplicate = list.find(
      (i) => i.name === neu && (i.category || 'upload') === cat,
    );
    if (duplicate) {
      return Response.json({ status: 'error', message: '该分类下已存在同名文件' }, { status: 400 });
    }

    const oldKey = getStorageKey(cat, old);
    const newKey = getStorageKey(cat, neu);

    const file = await storage.getFile(oldKey);
    if (!file) {
      return Response.json({ status: 'error', message: '文件不存在' }, { status: 404 });
    }

    await storage.putFile(newKey, file.body, file.contentType || 'application/octet-stream');
    await storage.deleteFile(oldKey);

    list[idx] = {
      ...list[idx],
      name: neu,
      url: cat === 'upload' ? `__R2__/upload/${neu}` : `__R2__/icons/${cat}/${neu}`,
    };
    await storage.putJSON(UPLOADS_KEY, list);

    return Response.json({ status: 'success', name: neu });
  } catch (e) {
    return Response.json({ status: 'error', message: e.message }, { status: 500 });
  }
}
