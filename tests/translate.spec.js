import { test, expect } from '@playwright/test';

// Fitur Translate CV -> English (30 Sep). 1 kuota AI per section, premium-only.
// Endpoint Worker di-mock di level route supaya test frontend tetap deterministik.

const LICENSE = 'CVK-TEST-TRAN';

async function seedPremium(page) {
  await page.addInitScript((lic) => {
    localStorage.setItem('cvkita_license_v1', lic);
  }, LICENSE);
}

async function mockTranslate(page, { status = 200, result = 'Managed monthly warehouse stock using spreadsheet systems.' } = {}) {
  await page.route('**/api/translate', route => {
    if (status !== 200) {
      return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ error: 'Kuota AI-mu sudah habis.' }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ result, remaining: 2 }) });
  });
}

test.describe('Translate CV ke English', () => {
  test('tanpa premium -> paywall muncul, tidak memanggil API', async ({ page }) => {
    let called = false;
    await page.route('**/api/translate', route => { called = true; route.fulfill({ status: 200, body: '{}' }); });
    await page.goto('/');
    await page.fill('[name="nama"]', 'Budi');
    await page.click('[data-add="pengalaman"]');
    await page.fill('[name="pengalaman.deskripsi"]', 'Mengelola stok gudang.');
    await page.click('.btn-translate');
    await expect(page.locator('#paywall')).toBeVisible();
    expect(called).toBe(false);
  });

  test('premium: terjemah deskripsi pengalaman (isi field tertimpa hasil)', async ({ page }) => {
    await seedPremium(page);
    await mockTranslate(page);
    await page.goto('/');
    await page.click('[data-add="pengalaman"]');
    const entry = page.locator('#pengalaman-list .entry').last();
    await entry.locator('[name="pengalaman.posisi"]').fill('Data Analyst');
    await entry.locator('[name="pengalaman.organisasi"]').fill('PT Contoh');
    const ta = entry.locator('[name="pengalaman.deskripsi"]');
    await ta.fill('Mengelola stok gudang bulanan.');
    await entry.locator('.btn-translate').click();
    await expect(ta).toHaveValue(/Managed monthly warehouse stock/);
    // preview ikut ter-update
    await expect(page.locator('#cv-paper')).toContainText('Managed monthly warehouse stock');
  });

  test('premium: terjemah ringkasan', async ({ page }) => {
    await seedPremium(page);
    await mockTranslate(page, { result: 'Information Systems graduate with data analysis internship experience.' });
    await page.goto('/');
    await page.fill('[name="ringkasan"]', 'Lulusan Sistem Informasi dengan pengalaman magang analisis data.');
    await page.click('#btn-translate-ringkasan');
    await expect(page.locator('[name="ringkasan"]')).toHaveValue(/Information Systems graduate/);
  });

  test('field kosong -> pesan jelas, tidak memanggil API', async ({ page }) => {
    await seedPremium(page);
    let called = false;
    await page.route('**/api/translate', route => { called = true; route.fulfill({ status: 200, body: '{}' }); });
    await page.goto('/');
    await page.click('[data-add="pengalaman"]');
    // error muncul sebagai dialog alert — auto-accept dan tangkap pesannya
    const msgPromise = page.waitForEvent('dialog', { timeout: 10000 }).then(d => { const m = d.message(); d.accept(); return m; });
    await page.locator('#pengalaman-list .btn-translate').last().click();
    expect(await msgPromise).toMatch(/isi dulu/i);
    expect(called).toBe(false);
  });

  test('kuota habis (429) -> pesan error, isi field tidak berubah', async ({ page }) => {
    await seedPremium(page);
    await mockTranslate(page, { status: 429 });
    await page.goto('/');
    await page.click('[data-add="pengalaman"]');
    const original = 'Mengelola stok gudang bulanan.';
    const ta = page.locator('#pengalaman-list .entry').last().locator('[name="pengalaman.deskripsi"]');
    await ta.fill(original);
    await page.locator('#pengalaman-list .btn-translate').last().click();
    await expect(ta).toHaveValue(original);
  });

  test('tombol ada di tiap entri pengalaman & di ringkasan', async ({ page }) => {
    await seedPremium(page);
    await page.goto('/');
    await expect(page.locator('#btn-translate-ringkasan')).toBeVisible();
    await page.click('[data-add="pengalaman"]');
    // tiap entri pengalaman punya tombolnya sendiri
    const entryCount = await page.locator('#pengalaman-list .entry').count();
    expect(entryCount).toBeGreaterThanOrEqual(1);
    await expect(page.locator('#pengalaman-list .entry .btn-translate')).toHaveCount(entryCount);
  });
});
