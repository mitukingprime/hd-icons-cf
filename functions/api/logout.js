const COOKIE_NAME = 'hd_icons_token';

export async function onRequestPost(context) {
  return new Response(JSON.stringify({ status: 'success' }), {
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`,
    },
  });
}
