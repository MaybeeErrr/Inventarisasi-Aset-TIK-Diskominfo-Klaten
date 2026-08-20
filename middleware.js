// Middleware ini berjalan di Vercel Edge Runtime, SEBELUM setiap permintaan
// sampai ke index.html atau /api/storage. Kalau tidak ada cookie sesi login
// yang valid, pengguna dialihkan ke /login.html.
//
// Perlu env var AUTH_SECRET (dipakai untuk memverifikasi tanda tangan HMAC
// pada cookie sesi yang dibuat oleh /api/login.js).

export const config = {
  // Lindungi semua path KECUALI halaman login itu sendiri dan endpoint
  // login/logout (supaya tidak terjadi redirect loop), serta file statis umum.
  matcher: ['/((?!api/login|api/logout|login.html|favicon.ico|robots.txt).*)'],
};

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  header.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    const k = pair.slice(0, idx).trim();
    const v = pair.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  });
  return out;
}

function base64ToBytes(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function verifyToken(token, secret) {
  if (!token || !secret) return false;
  const dot = token.lastIndexOf('.');
  if (dot === -1) return false;
  const payloadB64 = token.slice(0, dot);
  const sigB64 = token.slice(dot + 1);
  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    const sigBytes = base64ToBytes(sigB64);
    const ok = await crypto.subtle.verify('HMAC', key, sigBytes, enc.encode(payloadB64));
    if (!ok) return false;
    const payload = JSON.parse(atob(payloadB64));
    return typeof payload.exp === 'number' && payload.exp > Date.now();
  } catch (e) {
    return false;
  }
}

export default async function middleware(request) {
  const secret = process.env.AUTH_SECRET;

  // Kalau env var login belum diatur sama sekali, jangan kunci semua orang
  // di luar aplikasi (memudahkan first deploy) — tapi ini berarti proteksi
  // login BELUM aktif sampai AUTH_SECRET/AUTH_USERNAME/AUTH_PASSWORD diisi.
  if (!secret) return;

  const cookies = parseCookies(request.headers.get('cookie'));
  const valid = await verifyToken(cookies['session'], secret);

  if (!valid) {
    const url = new URL('/login.html', request.url);
    return Response.redirect(url, 307);
  }
}
