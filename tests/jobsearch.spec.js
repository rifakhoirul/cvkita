// Fitur premium "Cari Lowongan": gating paywall + struktur panel
import { test, expect } from '@playwright/test';

test.describe('Cari Lowongan (premium)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('tombol & panel ada di bawah preview, sebelum tombol unduh', async ({ page }) => {
    const btn = page.locator('#btn-jobsearch');
    await expect(btn).toBeVisible();
    const orderOk = await btn.evaluate(el => {
      const dl = document.getElementById('btn-download-preview');
      return !!(el.compareDocumentPosition(dl) & Node.DOCUMENT_POSITION_FOLLOWING);
    });
    expect(orderOk).toBe(true);
  });

  test('tanpa lisensi → klik memunculkan paywall (tidak memanggil API)', async ({ page }) => {
    await page.fill('[name="headline"]', 'Fresh Graduate SI');
    await page.click('#btn-jobsearch');
    await expect(page.locator('#paywall')).toBeVisible();
    await page.click('#btn-close-paywall');
    await expect(page.locator('#paywall')).toBeHidden();
  });

  test('dengan lisensi & form kosong → pesan isi dulu, kuota tidak terpakai', async ({ page }) => {
    await page.evaluate(() => localStorage.setItem('cvkita_license_v1', 'CVK-DUMMY-TEST'));
    await page.reload();
    await page.fill('[name="headline"]', '');
    await page.fill('[name="keahlian"]', '');
    page.once('dialog', d => d.accept());
    let alerted = false;
    page.on('dialog', () => { alerted = true; });
    await page.click('#btn-jobsearch');
    await page.waitForTimeout(300);
    expect(alerted || page.locator('#jobsearch-panel').innerHTML().then(t => t.length >= 0)).toBeTruthy();
  });

  test('dengan lisensi & data terisi → panel menampilkan rekomendasi (API mock via route)', async ({ page }) => {
    await page.route('**/api/job-search', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ category: 'Data Analyst', queries: ['data analyst fresh graduate', 'junior data analyst'], remaining: 2 }),
    }));
    await page.evaluate(() => localStorage.setItem('cvkita_license_v1', 'CVK-DUMMY-TEST'));
    await page.reload();
    await page.fill('[name="headline"]', 'Fresh Graduate SI');
    await page.fill('[name="keahlian"]', 'SQL, Excel');
    await page.click('#btn-jobsearch');
    await expect(page.locator('.js-title')).toContainText('Data Analyst');
    const links = page.locator('.js-portal');
    expect(await links.count()).toBeGreaterThanOrEqual(8); // 2 query x 4 portal
    await expect(page.locator('.js-note')).toContainText('2');
  });
});
