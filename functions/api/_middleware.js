import { createStorage } from '../_lib/storage.js';

const AUTH_KEY = '_meta/auth.json';
const COOKIE_NAME = 'hd_icons_token';

function unauthorized(message = '需要登录后才能执行此操作') {
  return Response.json({ status: 'error', message }, { status: 401 });
}

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

export async function onRequest(context) {
  const { request, env } = context;
  const method = request.method;

  if (method === 'GET' || method === 'OPTIONS') {
    return context.next();
  }

  const url = new URL(request.url);
  const publicPaths = ['/api/login', '/api/logout', '/api/setup', '/api/check-auth'];
  if (publicPaths.includes(url.pathname)) {
    return context.next();
  }

  const authConfig = await getAuthConfig(env);
  if (!authConfig) {
    return context.next();
  }

  const token = getCookie(request, COOKIE_NAME);
  if (!token) {
    return unauthorized();
  }

  const valid = await verifyToken(token, authConfig.jwtSecret);
  if (!valid) {
    return unauthorized('登录已过期，请重新登录');
  }

  return context.next();
}
