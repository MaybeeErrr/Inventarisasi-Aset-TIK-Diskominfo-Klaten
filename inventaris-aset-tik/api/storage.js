// API penyimpanan sederhana (key-value) untuk aplikasi Inventaris Aset TIK.
// Dipakai sebagai pengganti window.storage bawaan Claude Artifacts supaya
// data BENAR-BENAR shared antar semua pegawai lewat database, bukan cuma
// tersimpan di satu browser.
//
// Perlu env var DATABASE_URL berisi connection string Neon Postgres.

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

let tableReady = false;
async function ensureTable() {
  if (tableReady) return;
  await sql`
    CREATE TABLE IF NOT EXISTS kv_store (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  tableReady = true;
}

export default async function handler(req, res) {
  try {
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({
        error: 'DATABASE_URL belum diatur di environment variables Vercel.'
      });
    }
    await ensureTable();

    if (req.method === 'GET') {
      const key = req.query.key;
      if (!key) return res.status(400).json({ error: 'Parameter "key" wajib diisi.' });

      const rows = await sql`SELECT value FROM kv_store WHERE key = ${key}`;
      if (!rows.length) return res.status(404).json({ error: 'Tidak ditemukan.' });

      return res.status(200).json({ key, value: rows[0].value, shared: true });
    }

    if (req.method === 'POST') {
      const { key, value } = req.body || {};
      if (!key || typeof value !== 'string') {
        return res.status(400).json({ error: '"key" dan "value" (string) wajib diisi.' });
      }
      await sql`
        INSERT INTO kv_store (key, value, updated_at)
        VALUES (${key}, ${value}, now())
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
      `;
      return res.status(200).json({ key, value, shared: true });
    }

    if (req.method === 'DELETE') {
      const key = req.query.key;
      if (!key) return res.status(400).json({ error: 'Parameter "key" wajib diisi.' });
      await sql`DELETE FROM kv_store WHERE key = ${key}`;
      return res.status(200).json({ key, deleted: true, shared: true });
    }

    res.setHeader('Allow', 'GET, POST, DELETE');
    return res.status(405).json({ error: `Method ${req.method} tidak didukung.` });
  } catch (err) {
    console.error('storage API error:', err);
    return res.status(500).json({ error: err.message || 'Terjadi kesalahan pada server.' });
  }
}
