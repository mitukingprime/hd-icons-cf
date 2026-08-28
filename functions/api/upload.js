import { createStorage } from '../_lib/storage.js';

const CATEGORIES_KEY = '_meta/categories.json';
const UPLOADS_KEY = '_meta/uploads.json';

async function resolveCategory(storage, requested) {
  if (requested && requested.trim()) return requested.trim();
  const custom = (await storage.getJSON(CATEGORIES_KEY)) || [];
  if (custom.length > 0) return custom[0];
  return 'upload';
}

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

    const category = await resolveCategory(storage, formData.get('category'));
    const ALLOWED = /\.(png|jpg|jpeg|gif|ico|bmp|svg|tif|tiff|webp|apng)$/i;
    const uploaded = [];

    for (const file of files) {
      if (!(file instanceof File) || !file.name) continue;
      if (!ALLOWED.test(file.name)) continue;

      const key = category === 'upload'
        ? `upload/${file.name}`
        : `icons/${category}/${file.name}`;
      await storage.putFile(key, file.stream(), file.type || 'application/octet-stream');
      uploaded.push({ name: file.name, category });
    }

    let list = (await storage.getJSON(UPLOADS_KEY)) || [];
    for (const item of uploaded) {
      const url = item.category === 'upload'
        ? `__R2__/upload/${item.name}`
        : `__R2__/icons/${item.category}/${item.name}`;
      const existing = list.findIndex(
        (i) => i.name === item.name && (i.category || 'upload') === item.category,
      );
      const entry = { name: item.name, category: item.category, url };
      if (existing >= 0) {
        list[existing] = entry;
      } else {
        list.push(entry);
      }
    }
    await storage.putJSON(UPLOADS_KEY, list);

    return Response.json({
      status: 'success',
      uploaded: uploaded.map((i) => i.name),
      category,
    });
  } catch (e) {
    return Response.json({ status: 'error', message: e.message }, { status: 500 });
  }
}
