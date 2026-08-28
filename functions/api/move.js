import { createStorage } from '../_lib/storage.js';

const CATEGORIES_KEY = '_meta/categories.json';
const UPLOADS_KEY = '_meta/uploads.json';
const BUILTIN = ['border-radius', 'circle', 'svg'];

function getStorageKey(category, name) {
  if (category === 'upload' || !category) return `upload/${name}`;
  return `icons/${category}/${name}`;
}

async function categoryExists(storage, name) {
  if (BUILTIN.includes(name)) return true;
  const custom = (await storage.getJSON(CATEGORIES_KEY)) || [];
  return custom.includes(name);
}

// POST /api/move  { name, fromCategory, toCategory }
export async function onRequestPost(context) {
  const { env, request } = context;
  const storage = createStorage(env);
  if (!storage) {
    return Response.json({ status: 'error', message: 'Storage not configured' }, { status: 500 });
  }

  try {
    const { name, fromCategory, toCategory } = await request.json();
    const iconName = (name || '').trim();
    const from = fromCategory || 'upload';
    const to = toCategory || '';

    if (!iconName || !to) {
      return Response.json({ status: 'error', message: '缺少必要参数' }, { status: 400 });
    }
    if (from === to) {
      return Response.json({ status: 'error', message: '目标分类与当前分类相同' }, { status: 400 });
    }
    if (BUILTIN.includes(to)) {
      return Response.json({ status: 'error', message: '不能移动到内置分类' }, { status: 400 });
    }
    if (!(await categoryExists(storage, to))) {
      return Response.json({ status: 'error', message: '目标分类不存在' }, { status: 404 });
    }

    const list = (await storage.getJSON(UPLOADS_KEY)) || [];
    const idx = list.findIndex(
      (i) => i.name === iconName && (i.category || 'upload') === from,
    );
    if (idx === -1) {
      return Response.json({ status: 'error', message: '图标不存在' }, { status: 404 });
    }

    const duplicate = list.find(
      (i) => i.name === iconName && (i.category || 'upload') === to,
    );
    if (duplicate) {
      return Response.json({ status: 'error', message: '目标分类下已存在同名文件' }, { status: 400 });
    }

    const oldKey = getStorageKey(from, iconName);
    const newKey = getStorageKey(to, iconName);

    const file = await storage.getFile(oldKey);
    if (!file) {
      return Response.json({ status: 'error', message: '文件不存在' }, { status: 404 });
    }

    await storage.putFile(newKey, file.body, file.contentType || 'application/octet-stream');
    await storage.deleteFile(oldKey);

    list[idx] = {
      ...list[idx],
      category: to,
      url: `__R2__/icons/${to}/${iconName}`,
    };
    await storage.putJSON(UPLOADS_KEY, list);

    return Response.json({ status: 'success', category: to });
  } catch (e) {
    return Response.json({ status: 'error', message: e.message }, { status: 500 });
  }
}
