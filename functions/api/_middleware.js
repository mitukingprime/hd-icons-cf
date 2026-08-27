async function getPublicKeys(teamDomain) {
  const certsUrl = `https://${teamDomain}.cloudflareaccess.com/cdn-cgi/access/certs`;
  const response = await fetch(certsUrl);
  if (!response.ok) return null;
  const { keys } = await response.json();
  return keys;
}

function decodeBase64Url(str) {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  return atob(base64);
}

async function verifyJwt(token, keys, aud) {
  const parts = token.split('.');
  if (parts.length !== 3) return false;

  let header, payload;
  try {
    header = JSON.parse(decodeBase64Url(parts[0]));
    payload = JSON.parse(decodeBase64Url(parts[1]));
  } catch {
    return false;
  }

  const audClaim = payload.aud;
  const audMatch = Array.isArray(audClaim)
    ? audClaim.includes(aud)
    : audClaim === aud;
  if (!audMatch) return false;

  if (payload.exp && Date.now() / 1000 > payload.exp) return false;

  const key = keys.find((k) => k.kid === header.kid);
  if (!key) return false;

  const cryptoKey = await crypto.subtle.importKey(
    'jwk',
    key,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  );

  const signingInput = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
  const signature = Uint8Array.from(
    decodeBase64Url(parts[2]),
    (c) => c.charCodeAt(0),
  );

  return crypto.subtle.verify('RSASSA-PKCS1-v1_5', cryptoKey, signature, signingInput);
}

function unauthorized(message = 'Unauthorized') {
  return Response.json({ status: 'error', message }, { status: 401 });
}

export async function onRequest(context) {
  const { request, env } = context;
  const method = request.method;

  if (method === 'GET' || method === 'OPTIONS') {
    return context.next();
  }

  const teamDomain = env.CF_ACCESS_TEAM_DOMAIN;
  const aud = env.CF_ACCESS_AUD;
  if (!teamDomain || !aud) {
    return context.next();
  }

  const jwt = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!jwt) {
    return unauthorized('需要登录后才能执行此操作');
  }

  const keys = await getPublicKeys(teamDomain);
  if (!keys || !keys.length) {
    return unauthorized('无法验证身份');
  }

  try {
    const valid = await verifyJwt(jwt, keys, aud);
    if (!valid) {
      return unauthorized('身份验证失败');
    }
  } catch {
    return unauthorized('身份验证失败');
  }

  return context.next();
}
