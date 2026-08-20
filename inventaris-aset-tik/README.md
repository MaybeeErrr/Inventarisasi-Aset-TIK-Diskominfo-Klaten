# Inventaris Aset TIK — Diskominfo Klaten

Aplikasi manajemen inventaris aset TIK, siap di-deploy ke Vercel dengan
database Postgres (Neon) supaya data **shared** — semua pegawai yang buka
aplikasi ini melihat data yang sama.

## Struktur proyek

```
inventaris-aset-tik/
├── index.html        <- Seluruh aplikasi (UI + logic), 1 file
├── api/
│   └── storage.js     <- API serverless: baca/tulis data ke Postgres
├── package.json
├── .env.example
└── README.md
```

Aplikasi ini sengaja dipertahankan sebagai satu file `index.html` (tanpa
framework/build step) — cukup sedikit diubah dari versi Claude Artifacts
sebelumnya, hanya bagian penyimpanan data (`window.storage`) yang diganti
jadi memanggil `/api/storage`.

## Langkah deploy

### 1. Buat database Postgres gratis (Neon)

1. Buka [neon.tech](https://neon.tech), daftar/masuk, buat **New Project**.
2. Setelah project dibuat, copy **Connection string** yang muncul
   (formatnya `postgresql://user:pass@ep-xxxx.region.aws.neon.tech/db?sslmode=require`).
3. Simpan dulu — nanti dipakai di langkah 3.

Tabel di database akan dibuat **otomatis** oleh `api/storage.js` saat
pertama kali dipanggil, jadi tidak perlu menjalankan migration manual.

### 2. Push proyek ini ke GitHub

```bash
cd inventaris-aset-tik
git init
git add .
git commit -m "Initial commit: inventaris aset TIK"
git branch -M main
git remote add origin https://github.com/USERNAME/inventaris-aset-tik.git
git push -u origin main
```

### 3. Import ke Vercel

1. Buka [vercel.com/new](https://vercel.com/new), pilih repo GitHub yang
   barusan di-push.
2. Saat konfigurasi, **jangan ubah apa-apa** di "Build & Output Settings"
   — proyek ini tidak butuh build step (Vercel otomatis mengenali
   `index.html` sebagai static file dan `api/storage.js` sebagai
   serverless function).
3. Buka bagian **Environment Variables**, tambahkan:
   - `DATABASE_URL` = connection string Neon dari langkah 1.
4. Klik **Deploy**.

Setelah selesai, aplikasi bisa diakses lewat domain `*.vercel.app` yang
diberikan Vercel (atau domain custom kalau sudah disambungkan).

### 4. Uji coba

- Buka domain deploy-nya, tambahkan satu aset percobaan.
- Buka lagi dari device/browser lain (atau mode incognito) — aset yang
  sama harus muncul, tandanya data sudah tersimpan di database bersama,
  bukan cuma di satu browser.

## Catatan penting

- **Belum ada login/otentikasi.** Siapa pun yang tahu URL-nya bisa
  menambah/mengubah/menghapus data. Kalau memang butuh akses terbatas
  hanya untuk pegawai (sesuai rencana awal), langkah lanjutan yang bisa
  ditambahkan: proteksi password sederhana di level halaman, atau login
  dengan NextAuth/Clerk kalau butuh multi-akun dengan role.
- Data lama yang tersimpan di Claude Artifacts (`window.storage` versi
  Claude) **tidak otomatis ikut pindah** ke database Neon ini — keduanya
  penyimpanan yang berbeda. Kalau ada data penting yang mau dipindah,
  bisa export dulu lewat tombol export/print di aplikasi versi Claude,
  lalu re-input di sini (atau saya bisa bantu bikin skrip import kalau
  datanya banyak).
