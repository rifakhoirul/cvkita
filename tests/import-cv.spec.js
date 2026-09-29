// QA 2026-09-29: fitur impor CV PDF (gratis) — UI muncul, status ditampilkan, gagal → pesan jelas
import { test, expect } from '@playwright/test';

test('label impor CV terlihat & input file ada', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.import-cv')).toBeVisible();
  await expect(page.locator('#import-file')).toHaveCount(1);
  await expect(page.locator('#import-status')).toBeHidden();
});

test('impor sukses → baris pendidikan & pengalaman ikut ter-render (regresi: dulu hanya Data Diri)', async ({ page }) => {
  await page.goto('/');
  await page.route('**/api/import-cv', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      fields: { nama: 'Rifa Khoirul Muqtafa', headline: 'Final Year Psychology Student', email: 'r@x.com', phone: '0812', city: 'Bandung', ringkasan: 'Passionate in HR' },
      pendidikan: [{ sekolah: 'Universitas Padjadjaran', gelar: 'S1 Psikologi', periode: '2017 – 2021' }],
      pengalaman: [
        { posisi: 'Data Scientist Intern', perusahaan: 'Telkom DDB', periode: '2020', bullets: ['Nge-build dashboard'] },
        { posisi: 'Chairperson', perusahaan: 'KMP Bandung', periode: '2019', bullets: ['Pimpin 80 orang'] },
      ],
      projects: [{ nama: 'CVKita', deskripsi: 'Web CV builder', link: '' }],
      skills: ['SQL', 'Excel', 'Public Speaking'],
    }),
  }));
  // siapkan file PDF dummy lalu picu change
  await page.setInputFiles('#import-file', {
    name: 'cv.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 dummy payload panjang untuk lolos validasi panjang minimal 50 karakter base64 ya'),
  });
  await expect(page.locator('#import-status')).toContainText('terimpor');
  await expect(page.locator('input[name="nama"]')).toHaveValue('Rifa Khoirul Muqtafa');
  // 1 baris pendidikan + 2 baris pengalaman + 1 project HARUS ter-render
  await expect(page.locator('#pendidikan-list .entry')).toHaveCount(1);
  await expect(page.locator('#pengalaman-list .entry')).toHaveCount(2);
  await expect(page.locator('#pendidikan-list input[name="pendidikan.sekolah"]')).toHaveValue('Universitas Padjadjaran');
  // Keahlian terisi dari skills (dipisah koma)
  await expect(page.locator('[name="keahlian"]')).toHaveValue('SQL, Excel, Public Speaking');
});

test('file bukan PDF terlalu kecil → status error tampil, tidak crash', async ({ page }) => {
  await page.goto('/');
  await page.setInputFiles('#import-file', {
    name: 'tiny.pdf', mimeType: 'application/pdf', buffer: Buffer.from('kecil'),
  });
  await expect(page.locator('#import-status')).toBeVisible();
  await expect(page.locator('#import-status')).toContainText(/tidak terbaca|besar|Gagal/);
});
