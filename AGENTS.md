# AGENTS.md — Panduan untuk AI Coding Agent (Jules, Codex, dkk.)

Selamat datang! Repo ini adalah **CVKita** — CV builder gratis untuk fresh graduate Indonesia.
Live di https://cvkita.id (GitHub Pages, branch `master`). Vanilla HTML/CSS/JS, tanpa framework.

## Aturan Kerja (WAJIB)

### 1. TDD — Test-Driven Development
- Tulis test dulu (merah), baru implementasi (hijau). Tidak ada pengecualian.
- Test suite: **Playwright** — jalankan dengan `npx playwright test` dari root repo.
- Suite **auto-start `http.server` sendiri** — jangan jalankan server manual, jangan ubah port.
- Setiap perubahan perilaku = test baru. Setiap bug fix = test regresi yang mereproduksi bug-nya.

### 2. npm registry — JEBAKAN PALING BERBAHAYA DI REPO INI
File `package-lock.json` HARUS dibangun dengan registry resmi npmjs, BUKAN mirror
(mirror seperti `mirrors.tencentyun.com` menghasilkan lockfile yang membuat GitHub Actions
`npm ci` gagal `ENOTFOUND` — ini pernah terjadi, jangan ulangi).

```bash
# JIKA perlu install package / regenerasi lockfile:
rm package-lock.json && npm install --registry=https://registry.npmjs.org/
```

Jangan pernah commit lockfile yang dihasilkan dari registry mirror. Cek `resolved` URL di
lockfile harus `registry.npmjs.org`.

### 3. Cache busting versi file
Frontend load script/CSS dengan query versi: `js/app.js?v=27`, `css/style.css?v=38`, dst.
**Setiap mengubah file `js/` atau `css/`, WAJIB naikkan param `?v=` di `index.html` / `pay.html`**
yang memuatnya — kalau tidak, pengunjung dapat versi lama dari cache. Perubahan tanpa bump
versi = perubahan yang tidak live.

### 4. Konteks produk (kenapa kode seperti ini)
- Freemium: PDF & Skor ATS **gratis tanpa watermark**. Fitur AI (improve, Analisis Karier+SWOT,
  Cover Letter) berbayar sekali-bayar via lisensi — JANGAN pernah membayar-kan fitur gratis
  atau mengubah logika kuota di frontend (kuota dikunci server-side di Worker repo terpisah).
- Urutan tombol preview sengaja: Cek ATS (Gratis) → Unduh PDF (Gratis) → Analisis Karier (AI)
  → Cover Letter (AI). Jangan ubah urutan tanpa diminta.
- Copywriting Bahasa Indonesia santai (aku/kamu). Hero final: "Bikin CV simpel, cepat, nggak pake ribet."
- WhatsApp CS resmi hanya `wa.me/6282118217075`, ditampilkan sebagai hyperlink tanpa nomor.
- Fitur "Kirim PDF ke WhatsApp" sengaja DIHIDE (kualitas render jsPDF di bawah Unduh PDF).
  Kode di `js/share-pdf.js` + `tests-disabled/`. JANGAN hapus, JANGAN aktifkan tanpa diminta.

### 5. Konvensi kode
- Vanilla JS, tanpa framework/bundler. IIFE sederhana, event delegation dengan `closest()`
  (bukan `e.target.id` — ikon SVG anak tombol tidak terdeteksi, ini bug lama yang sudah diperbaiki).
- CSS satu file `css/style.css`, mobile-first, breakpoint utama 900px.
- Aksesibilitas: kontras teks minimum WCAG AA (4.5:1), touch target ≥44px, label form di atas box.
- Ikon via sprite SVG inline (`<use href="#i-...">`), bukan emoji, di tombol fungsional.

### 6. Jangan sentuh tanpa diminta
- `vendor/` (jspdf, html2canvas — arsip fitur hidden)
- Logika kuota/premium di `js/premium.js` & `js/quota-modal.js` kecuali ada test pendamping
- `js/analytics.js` struktur event (kontrak dengan Worker `/api/track`)
- Struktur harga di `pay.html` (harga + anchor diskon dikunci secara kesepakatan produk)

### 7. Definisi selesai
- `npx playwright test` → semua hijau
- Lockfile bersih dari registry npmjs
- Bump versi file yang berubah
- PR description: apa yang berubah + test apa yang menjaminnya

## Yang sering diminta (contoh task yang sesuai untuk agent)
- Menambah test coverage modul yang tipis
- Memperbaiki typo/copy Indonesian
- Optimasi CSS/performa kecil dengan test visual
- Refactor kecil tanpa mengubah perilaku
