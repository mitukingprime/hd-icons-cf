import { createStorage } from '../_lib/storage.js';

const AUTH_KEY = '_meta/auth.json';
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

function generateRandomBase64(byteLength = 16) {
  const arr = new Uint8Array(byteLength);
  crypto.getRandomValues(arr);
  return bytesToBase64(arr);
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

export async function onRequestPost(context) {
  const { env, request } = context;
  const storage = createStorage(env);
  if (!storage) {
    return Response.json({ status: 'error', message: 'Storage not configured' }, { status: 500 });
  }

  const authConfig = await getAuthConfig(env);
  if (!authConfig) {
    return Response.json(
      { status: 'error', message: '尚未设置管理员账号' },
      { status: 400 },
    );
  }

  try {
    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return Response.json(
        { status: 'error', message: '请输入当前密码和新密码' },
        { status: 400 },
      );
    }

    if (newPassword.length < 6) {
      return Response.json(
        { status: 'error', message: '新密码长度至少 6 个字符' },
        { status: 400 },
      );
    }

    const valid = await verifyPassword(
      currentPassword,
      authConfig.salt,
      authConfig.passwordHash,
    );
    if (!valid) {
      return Response.json(
        { status: 'error', message: '当前密码错误' },
        { status: 401 },
      );
    }

    const salt = generateRandomBase64(16);
    const passwordHash = await hashPassword(newPassword, salt);

    const updatedConfig = {
      username: authConfig.username,
      passwordHash,
      salt,
      jwtSecret: authConfig.jwtSecret,
    };

    await storage.putJSON(AUTH_KEY, updatedConfig);

    return Response.json({ status: 'success' });
  } catch (e) {
    return Response.json({ status: 'error', message: e.message }, { status: 400 });
  }
}
