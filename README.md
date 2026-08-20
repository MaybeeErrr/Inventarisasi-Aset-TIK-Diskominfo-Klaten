# Inventaris Aset TIK — Diskominfo Klaten

Aplikasi manajemen inventaris aset TIK, siap di-deploy ke Vercel dengan
database Postgres (Neon) supaya data **shared** — semua pegawai yang buka
aplikasi ini melihat data yang sama. Aplikasi ini sekarang juga dilindungi
**halaman login** sederhana, jadi hanya pegawai yang tahu username/password
yang bisa membuka atau mengubah data.

## Struktur proyek

```
inventaris-aset-tik/
├── index.html         <- Dashboard aplikasi (UI + logic), 1 file
├── login.html          <- Halaman login
├── middleware.js        <- Edge Middleware: mengunci semua halaman kecuali login
├── api/
│   ├── storage.js       <- API serverless: baca/tulis data ke Postgres
│   ├── login.js          <- API serverless: verifikasi login, set cookie sesi
│   └── logout.js         <- API serverless: hapus cookie sesi
├── package.json
├── .env.example
└── README.md
```

## Cara kerja login (ringkas)

- `middleware.js` berjalan sebelum permintaan apa pun sampai ke `index.html`
  atau `/api/storage`. Kalau tidak ada cookie sesi yang valid, pengunjung
  dialihkan ke `login.html`.
- `login.html` mengirim username/password ke `/api/login`, yang
  mencocokkannya dengan env var `AUTH_USERNAME` / `AUTH_PASSWORD`. Kalau
  cocok, server menyetel cookie sesi yang ditandatangani (HMAC) dan berlaku
  7 hari.
- Tombol **Keluar** di sidebar memanggil `/api/logout` untuk menghapus
  cookie tersebut.
- Ini **bukan** sistem multi-akun/role — satu username & password dipakai
  bersama oleh semua pegawai, tujuannya hanya membatasi akses dari luar.
  Kalau ke depan butuh akun terpisah per pegawai dengan peran berbeda,
  langkah lanjutannya adalah migrasi ke layanan auth seperti Clerk/NextAuth.

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
   `index.html`/`login.html` sebagai static file, `middleware.js` sebagai
   Edge Middleware, dan file di `api/` sebagai serverless function).
3. Buka bagian **Environment Variables**, tambahkan **keempat** variabel
   berikut (isi nilainya sendiri, jangan pakai contoh apa adanya):

   | Key | Contoh nilai | Keterangan |
   |---|---|---|
   | `DATABASE_URL` | `postgresql://...` | Connection string Neon dari langkah 1 |
   | `AUTH_USERNAME` | `admin` | Username untuk login ke aplikasi |
   | `AUTH_PASSWORD` | `password-kuat-anda` | Password untuk login ke aplikasi |
   | `AUTH_SECRET` | string acak panjang | Kunci rahasia penandatangan sesi login. Buat dengan menjalankan `openssl rand -hex 32` di terminal (Mac/Linux/Git Bash), atau situs generator random string mana pun |

4. Klik **Deploy**.

> **Penting:** kalau `AUTH_USERNAME`, `AUTH_PASSWORD`, atau `AUTH_SECRET`
> belum diisi, `middleware.js` akan otomatis **membiarkan aplikasi terbuka
> tanpa login** (supaya deploy pertama tidak mengunci Anda sendiri di
> luar). Jadi pastikan ketiganya sudah diisi sebelum membagikan link
> aplikasi ke pegawai lain.

### 4. Uji coba

- Buka domain deploy-nya (`https://nama-project-anda.vercel.app`) — Anda
  akan diarahkan otomatis ke `/login.html`. Masuk dengan `AUTH_USERNAME` /
  `AUTH_PASSWORD` yang tadi diisi.
- Setelah masuk, tambahkan satu aset percobaan.
- Buka lagi dari device/browser lain (login lagi kalau diminta) — aset yang
  sama harus muncul, tandanya data sudah tersimpan di database bersama,
  bukan cuma di satu browser.
- Coba klik **Keluar** di sidebar — Anda harus diarahkan balik ke halaman
  login dan tidak bisa membuka dashboard lagi sampai login ulang.

### 5. Kalau mau ganti username/password nanti

Buka **Project Settings → Environment Variables** di Vercel, ubah nilai
`AUTH_USERNAME`/`AUTH_PASSWORD`, lalu klik **Redeploy** (atau tunggu deploy
otomatis berikutnya). Sesi yang sudah terlanjur login sebelumnya tetap
berlaku sampai kedaluwarsa (7 hari) atau sampai pengguna klik **Keluar**.

## Catatan penting

- Data lama yang tersimpan di Claude Artifacts (`window.storage` versi
  Claude) **tidak otomatis ikut pindah** ke database Neon ini — keduanya
  penyimpanan yang berbeda. Kalau ada data penting yang mau dipindah,
  bisa export dulu lewat tombol export/print di aplikasi versi Claude,
  lalu re-input di sini (atau saya bisa bantu bikin skrip import kalau
  datanya banyak).
- Login ini memakai cookie HTTP-only + tanda tangan HMAC, cukup untuk
  membatasi akses dari publik. Untuk kebutuhan keamanan yang lebih ketat
  (mis. audit siapa mengubah apa, akun per pegawai), pertimbangkan upgrade
  ke layanan auth khusus di kemudian hari.
