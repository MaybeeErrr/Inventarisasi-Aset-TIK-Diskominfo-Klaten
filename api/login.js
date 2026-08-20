// Endpoint login. Memeriksa username/password terhadap env var
// AUTH_USERNAME / AUTH_PASSWORD, lalu (jika cocok) menyetel cookie sesi yang
// ditandatangani (HMAC-SHA256) dengan AUTH_SECRET. Cookie ini yang kemudian
// diperiksa oleh middleware.js pada setiap permintaan berikutnya.

import crypto from 'crypto';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const SEVEN_DAYS_S = 7 * 24 * 60 * 60;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method tidak didukung.' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  const { username, password } = body || {};

  const validUser = process.env.AUTH_USERNAME;
  const validPass = process.env.AUTH_PASSWORD;
  const secret = process.env.AUTH_SECRET;

  if (!validUser || !validPass || !secret) {
    return res.status(500).json({
      error: 'Login belum dikonfigurasi di server. Tambahkan AUTH_USERNAME, AUTH_PASSWORD, dan AUTH_SECRET di Environment Variables Vercel.',
    });
  }

  if (!username || !password || username !== validUser || password !== validPass) {
    return res.status(401).json({ error: 'Username atau password salah.' });
  }

  const payload = JSON.stringify({ u: username, exp: Date.now() + SEVEN_DAYS_MS });
  const payloadB64 = Buffer.from(payload).toString('base64');
  const sig = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64');
  const token = `${payloadB64}.${sig}`;

  res.setHeader(
    'Set-Cookie',
    `session=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SEVEN_DAYS_S}`
  );
  return res.status(200).json({ ok: true });
}
