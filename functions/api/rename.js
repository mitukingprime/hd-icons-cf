import { createStorage } from '../_lib/storage.js';
import {
  addToHidden,
  builtinPath,
  fetchBuiltinIcon,
  getVisibleBuiltinIcons,
} from '../_lib/hidden.js';

const UPLOADS_KEY = '_meta/uploads.json';

function getStorageKey(category, name) {
  if (category === 'upload' || !category) return `upload/${name}`;
  return `icons/${category}/${name}`;
}

function nameExistsInCategory(list, category, name) {
  return list.some((i) => i.name === name && (i.category || 'upload') === category);
}

async function nameExistsAsVisibleBuiltin(request, storage, category, name) {
  const builtins = await getVisibleBuiltinIcons(request, storage);
  return builtins.some((icon) => {
    const folder = icon.url.replace(/^\/icons\//, '').split('/')[0];
    return folder === category && icon.name === name;
  });
}

// POST /api/rename  { category, oldName, newName, builtin? }
export async function onRequestPost(context) {
  const { env, request } = context;
  const storage = createStorage(env);
  if (!storage) {
    return Response.json({ status: 'error', message: 'Storage not configured' }, { status: 500 });
  }

  try {
    const { category, oldName, newName, builtin } = await request.json();
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

    if (builtin || idx === -1) {
      if (nameExistsInCategory(list, cat, neu)) {
        return Response.json({ status: 'error', message: '该分类下已存在同名文件' }, { status: 400 });
      }
      if (await nameExistsAsVisibleBuiltin(request, storage, cat, neu)) {
        return Response.json({ status: 'error', message: '该分类下已存在同名文件' }, { status: 400 });
      }

      const file = await fetchBuiltinIcon(request, cat, old);
      if (!file) {
        return Response.json({ status: 'error', message: '图标不存在' }, { status: 404 });
      }

      const newKey = getStorageKey(cat, neu);
      await storage.putFile(newKey, file.body, file.contentType);

      list.push({
        name: neu,
        category: cat,
        url: cat === 'upload' ? `__R2__/upload/${neu}` : `__R2__/icons/${cat}/${neu}`,
      });
      await storage.putJSON(UPLOADS_KEY, list);
      await addToHidden(storage, builtinPath(cat, old));

      return Response.json({ status: 'success', name: neu });
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
