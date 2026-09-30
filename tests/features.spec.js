import { test, expect } from '@playwright/test';

test.describe('Fitur: Reset, Contoh, Sticky Download', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('tombol Reset menghapus semua data', async ({ page }) => {
    page.on('dialog', d => d.accept());
    await page.fill('[name="nama"]', 'Budi Lama');
    await expect(page.locator('#cv-paper h1')).toHaveText('Budi Lama');
    await page.click('#btn-reset');
    await expect(page.locator('#cv-paper h1')).toHaveText('Nama Kamu');
    await expect(page.locator('[name="nama"]')).toHaveValue('');
  });

  test('tombol Backup/Import SUDAH DIHAPUS dari UI', async ({ page }) => {
    // Feedback pemilik: orang awam bingung dengan Backup/Import.
    await expect(page.locator('#btn-export')).toHaveCount(0);
    await expect(page.locator('#file-import')).toHaveCount(0);
  });

  test('tombol Contoh mengisi seluruh CV dengan data contoh', async ({ page }) => {
    // 30 Sep: modal pilih bidang dulu (IT / Non-IT / Marketing)
    await page.click('#btn-sample-top');
    await page.click('[data-sample="it"]');
    // Setelah reload, preview harus menampilkan nama contoh
    await expect(page.locator('#cv-paper h1')).toHaveText('Rania Putri Andini');
    await expect(page.locator('[name="headline"]')).toHaveValue(/Sistem Informasi/);
    await expect(page.locator('[name="keahlian"]')).toHaveValue(/SQL/);
    await expect(page.locator('#cv-paper')).toContainText('Universitas Indonesia');
    await expect(page.locator('#cv-paper')).toContainText('Magang — Data Analyst');
  });

  test('Contoh dibatalkan bila user menutup modal', async ({ page }) => {
    await page.click('#btn-sample-top');
    await page.click('#sample-cancel'); // modal tertutup, tidak ada reload
    await expect(page.locator('#sample-modal')).toBeHidden();
    await expect(page.locator('#cv-paper h1')).toHaveText('Nama Kamu');
  });

  test('sticky download bar MUNCUL di mobile setelah nama diisi', async ({ page, viewport }) => {
    test.skip(viewport && viewport.width >= 900, 'hanya relevan di layar sempit');
    await expect(page.locator('#sticky-download')).toBeHidden();
    await page.fill('[name="nama"]', 'Budi Sticky');
    await expect(page.locator('#sticky-download')).toBeVisible();
    await expect(page.locator('.sd-label')).toContainText('di bawah');
  });

  test('sticky download bar TIDAK muncul di desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.fill('[name="nama"]', 'Budi Desktop');
    await expect(page.locator('#sticky-download')).toBeHidden();
  });

  test('skor ATS tetap jalan setelah perubahan', async ({ page }) => {
    await page.fill('[name="nama"]', 'Budi');
    await page.click('#btn-ats-preview');
    await expect(page.locator('#ats-panel')).toBeVisible();
    const score = parseInt(await page.locator('#ats-score').textContent());
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  test('skor naik ketika profil lebih lengkap', async ({ page }) => {
    await page.fill('[name="nama"]', 'Budi');
    await page.click('#btn-ats-preview');
    const low = parseInt(await page.locator('#ats-score').textContent());

    await page.fill('[name="email"]', 'budi@mail.com');
    await page.fill('[name="telepon"]', '0812');
    await page.fill('[name="ringkasan"]', 'Fresh graduate yang bersemangat');
    await page.fill('[name="keahlian"]', 'Python, SQL, Excel');
    await page.click('[data-add="pengalaman"]');
    await page.click('#btn-ats-preview');
    const high = parseInt(await page.locator('#ats-score').textContent());
    expect(high).toBeGreaterThan(low);
  });
});
