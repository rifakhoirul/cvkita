import { test, expect } from '@playwright/test';

test.describe('Fitur baru: Reset & Export/Import', () => {
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

  test('tombol Export mengunduh file JSON berisi data', async ({ page }) => {
    await page.fill('[name="nama"]', 'Budi Export');
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('#btn-export'),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.json$/);
    const path = await download.path();
    const fs = await import('fs');
    const data = JSON.parse(fs.readFileSync(path, 'utf8'));
    expect(data.fields.nama).toBe('Budi Export');
  });

  test('Import JSON memuat data ke form dan preview', async ({ page }) => {
    const payload = {
      fields: { nama: 'Siti Import', keahlian: 'Figma' },
      lists: { pendidikan: [{ sekolah: 'UI', gelar: 'S1', periode: '2021-2025' }] },
    };
    await page.setInputFiles('#file-import', {
      name: 'cv.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(payload)),
    });
    await expect(page.locator('#cv-paper h1')).toHaveText('Siti Import');
    await expect(page.locator('#cv-paper h2', { hasText: 'Education' })).toBeVisible();
  });
});

test.describe('Fitur baru: ATS Score', () => {
  test('menampilkan skor ATS dan saran ketika data minimal', async ({ page }) => {
    await page.goto('/');
    await page.fill('[name="nama"]', 'Budi');
    await page.click('#btn-ats');
    await expect(page.locator('#ats-panel')).toBeVisible();
    const score = await page.locator('#ats-score').textContent();
    expect(parseInt(score)).toBeGreaterThanOrEqual(0);
    expect(parseInt(score)).toBeLessThanOrEqual(100);
  });

  test('skor naik ketika profil lebih lengkap', async ({ page }) => {
    await page.goto('/');
    await page.fill('[name="nama"]', 'Budi');
    await page.click('#btn-ats');
    const low = parseInt(await page.locator('#ats-score').textContent());

    await page.fill('[name="email"]', 'budi@mail.com');
    await page.fill('[name="telepon"]', '0812');
    await page.fill('[name="ringkasan"]', 'Fresh graduate yang bersemangat');
    await page.fill('[name="keahlian"]', 'Python, SQL, Excel');
    await page.click('[data-add="pengalaman"]');
    await page.click('#btn-ats');
    const high = parseInt(await page.locator('#ats-score').textContent());
    expect(high).toBeGreaterThan(low);
  });
});
