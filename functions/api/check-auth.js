import { createStorage } from '../_lib/storage.js';

const AUTH_KEY = '_meta/auth.json';
const COOKIE_NAME = 'hd_icons_token';

async function getAuthConfig(env) {
  const storage = createStorage(env);
  if (!storage) return null;
  return storage.getJSON(AUTH_KEY);
}

async function verifyToken(token, secret) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );

    const signingInput = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
    const signature = Uint8Array.from(
      atob(parts[2].replace(/-/g, '+').replace(/_/g, '/')),
      (c) => c.charCodeAt(0),
    );

    const valid = await crypto.subtle.verify('HMAC', key, signature, signingInput);
    if (!valid) return false;

    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (payload.exp && Date.now() / 1000 > payload.exp) return false;

    return true;
  } catch {
    return false;
  }
}

function getCookie(request, name) {
  const cookieHeader = request.headers.get('Cookie') || '';
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? match[1] : null;
}

export async function onRequestGet(context) {
  const { request, env } = context;

  const authConfig = await getAuthConfig(env);
  if (!authConfig) {
    return Response.json({ authenticated: false, needsSetup: true });
  }

  const token = getCookie(request, COOKIE_NAME);
  if (!token) {
    return Response.json({ authenticated: false, needsSetup: false });
  }

  const valid = await verifyToken(token, authConfig.jwtSecret);
  return Response.json({
    authenticated: valid,
    needsSetup: false,
    username: valid ? authConfig.username : undefined,
  });
}
