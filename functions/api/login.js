import { createStorage } from '../_lib/storage.js';

const AUTH_KEY = '_meta/auth.json';
const COOKIE_NAME = 'hd_icons_token';
const PBKDF2_ITERATIONS = 100000;

async function getAuthConfig(env) {
  const storage = createStorage(env);
  if (!storage) return null;
  return storage.getJSON(AUTH_KEY);
}

function base64ToBytes(base64) {
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

function bytesToBase64(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}

async function hashPassword(password, saltBase64) {
  const salt = base64ToBytes(saltBase64);
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    256,
  );
  return bytesToBase64(hashBuffer);
}

async function verifyPassword(password, salt, passwordHash) {
  const hash = await hashPassword(password, salt);
  return hash === passwordHash;
}

async function createToken(secret, username, expiresInHours = 24) {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const payload = btoa(JSON.stringify({
    sub: username,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + expiresInHours * 3600,
  })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signingInput = new TextEncoder().encode(`${header}.${payload}`);
  const sigBuffer = await crypto.subtle.sign('HMAC', key, signingInput);
  const signature = btoa(String.fromCharCode(...new Uint8Array(sigBuffer)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  return `${header}.${payload}.${signature}`;
}

function setAuthCookie(token) {
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=86400`;
}

export async function onRequestPost(context) {
  const { env, request } = context;

  const authConfig = await getAuthConfig(env);
  if (!authConfig) {
    return Response.json({ status: 'success' });
  }

  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return Response.json(
        { status: 'error', message: '请输入用户名和密码' },
        { status: 400 },
      );
    }

    if (username !== authConfig.username) {
      return Response.json(
        { status: 'error', message: '用户名或密码错误' },
        { status: 401 },
      );
    }

    const valid = await verifyPassword(password, authConfig.salt, authConfig.passwordHash);
    if (!valid) {
      return Response.json(
        { status: 'error', message: '用户名或密码错误' },
        { status: 401 },
      );
    }

    const token = await createToken(authConfig.jwtSecret, authConfig.username);

    return new Response(JSON.stringify({ status: 'success' }), {
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': setAuthCookie(token),
      },
    });
  } catch (e) {
    return Response.json({ status: 'error', message: e.message }, { status: 400 });
  }
}
