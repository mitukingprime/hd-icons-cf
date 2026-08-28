import { createStorage } from '../_lib/storage.js';

const CATEGORIES_KEY = '_meta/categories.json';
const UPLOADS_KEY = '_meta/uploads.json';
const BUILTIN = ['border-radius', 'circle', 'svg', 'AI', 'Docker', 'NAS', 'PT', '云服务'];

function getBuiltinCategories() {
  return BUILTIN.map((name) => ({ name, builtin: true }));
}

async function getCustomCategories(storage) {
  return (await storage.getJSON(CATEGORIES_KEY)) || [];
}

function isBuiltin(name) {
  return BUILTIN.includes(name);
}

function getStorageKey(category, name) {
  if (category === 'upload' || !category) return `upload/${name}`;
  return `icons/${category}/${name}`;
}

export async function onRequestGet(context) {
  const { env } = context;
  const storage = createStorage(env);
  if (!storage) {
    return Response.json({ status: 'error', message: 'Storage not configured' }, { status: 500 });
  }

  const custom = await getCustomCategories(storage);
  const categories = [
    ...getBuiltinCategories(),
    ...custom.map((name) => ({ name, builtin: false })),
  ];

  return Response.json({ categories });
}

export async function onRequestPost(context) {
  const { env, request } = context;
  const storage = createStorage(env);
  if (!storage) {
    return Response.json({ status: 'error', message: 'Storage not configured' }, { status: 500 });
  }

  try {
    const { name } = await request.json();
    const trimmed = (name || '').trim();
    if (!trimmed) {
      return Response.json({ status: 'error', message: '分类名称不能为空' }, { status: 400 });
    }
    if (isBuiltin(trimmed)) {
      return Response.json({ status: 'error', message: '不能与内置分类重名' }, { status: 400 });
    }

    const custom = await getCustomCategories(storage);
    if (custom.includes(trimmed)) {
      return Response.json({ status: 'error', message: '分类已存在' }, { status: 400 });
    }

    custom.push(trimmed);
    await storage.putJSON(CATEGORIES_KEY, custom);

    return Response.json({ status: 'success', name: trimmed });
  } catch (e) {
    return Response.json({ status: 'error', message: e.message }, { status: 500 });
  }
}

// PUT /api/categories  { oldName, newName }
export async function onRequestPut(context) {
  const { env, request } = context;
  const storage = createStorage(env);
  if (!storage) {
    return Response.json({ status: 'error', message: 'Storage not configured' }, { status: 500 });
  }

  try {
    const { oldName, newName } = await request.json();
    const oldTrimmed = (oldName || '').trim();
    const newTrimmed = (newName || '').trim();

    if (!oldTrimmed || !newTrimmed) {
      return Response.json({ status: 'error', message: '分类名称不能为空' }, { status: 400 });
    }
    if (oldTrimmed === newTrimmed) {
      return Response.json({ status: 'success', name: newTrimmed });
    }
    if (isBuiltin(oldTrimmed)) {
      return Response.json({ status: 'error', message: '不能重命名内置分类' }, { status: 400 });
    }
    if (isBuiltin(newTrimmed)) {
      return Response.json({ status: 'error', message: '不能与内置分类重名' }, { status: 400 });
    }

    const custom = await getCustomCategories(storage);
    if (!custom.includes(oldTrimmed)) {
      return Response.json({ status: 'error', message: '分类不存在' }, { status: 404 });
    }
    if (custom.includes(newTrimmed)) {
      return Response.json({ status: 'error', message: '分类已存在' }, { status: 400 });
    }

    const uploads = (await storage.getJSON(UPLOADS_KEY)) || [];
    const toMove = uploads.filter((i) => (i.category || 'upload') === oldTrimmed);

    for (const icon of toMove) {
      const oldKey = getStorageKey(oldTrimmed, icon.name);
      const newKey = getStorageKey(newTrimmed, icon.name);

      const file = await storage.getFile(oldKey);
      if (file) {
        await storage.putFile(newKey, file.body, file.contentType || 'application/octet-stream');
        await storage.deleteFile(oldKey);
      }
    }

    const updatedUploads = uploads.map((icon) => {
      if ((icon.category || 'upload') !== oldTrimmed) return icon;
      return {
        ...icon,
        category: newTrimmed,
        url: `__R2__/icons/${newTrimmed}/${icon.name}`,
      };
    });

    const updatedCustom = custom.map((c) => (c === oldTrimmed ? newTrimmed : c));

    await storage.putJSON(UPLOADS_KEY, updatedUploads);
    await storage.putJSON(CATEGORIES_KEY, updatedCustom);

    return Response.json({ status: 'success', name: newTrimmed, moved: toMove.length });
  } catch (e) {
    return Response.json({ status: 'error', message: e.message }, { status: 500 });
  }
}

export async function onRequestDelete(context) {
  const { env, request } = context;
  const storage = createStorage(env);
  if (!storage) {
    return Response.json({ status: 'error', message: 'Storage not configured' }, { status: 500 });
  }

  try {
    const { name } = await request.json();
    const trimmed = (name || '').trim();
    if (!trimmed) {
      return Response.json({ status: 'error', message: '分类名称不能为空' }, { status: 400 });
    }
    if (isBuiltin(trimmed)) {
      return Response.json({ status: 'error', message: '不能删除内置分类' }, { status: 400 });
    }

    const custom = await getCustomCategories(storage);
    if (!custom.includes(trimmed)) {
      return Response.json({ status: 'error', message: '分类不存在' }, { status: 404 });
    }

    const uploads = (await storage.getJSON(UPLOADS_KEY)) || [];
    const toRemove = uploads.filter((i) => (i.category || 'upload') === trimmed);

    for (const icon of toRemove) {
      const cat = icon.category || 'upload';
      await storage.deleteFile(getStorageKey(cat, icon.name));
    }

    const remaining = uploads.filter((i) => (i.category || 'upload') !== trimmed);
    await storage.putJSON(UPLOADS_KEY, remaining);
    await storage.putJSON(CATEGORIES_KEY, custom.filter((c) => c !== trimmed));

    return Response.json({ status: 'success', removed: toRemove.length });
  } catch (e) {
    return Response.json({ status: 'error', message: e.message }, { status: 500 });
  }
}
