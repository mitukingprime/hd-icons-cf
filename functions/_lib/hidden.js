const HIDDEN_KEY = '_meta/hidden.json';

export async function getHiddenList(storage) {
  return (await storage.getJSON(HIDDEN_KEY)) || [];
}

export async function addToHidden(storage, path) {
  const list = await getHiddenList(storage);
  if (!list.includes(path)) {
    list.push(path);
    await storage.putJSON(HIDDEN_KEY, list);
  }
}

export function builtinPath(category, name) {
  return `${category}/${name}`;
}

export async function fetchBuiltinIcon(request, category, name) {
  const resp = await fetch(new URL(`/icons/${category}/${name}`, request.url));
  if (!resp.ok) return null;
  return {
    body: await resp.arrayBuffer(),
    contentType: resp.headers.get('Content-Type') || 'application/octet-stream',
  };
}

export async function getVisibleBuiltinIcons(request, storage) {
  const hidden = await getHiddenList(storage);
  const hiddenSet = new Set(hidden);
  const staticResp = await fetch(new URL('/icons.json', request.url));
  if (!staticResp.ok) return [];
  const data = await staticResp.json();
  return (data.icons || []).filter((icon) => {
    const path = icon.url.replace(/^\/icons\//, '');
    return !hiddenSet.has(path);
  });
}
