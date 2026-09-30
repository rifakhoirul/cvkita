import { test, expect } from '@playwright/test';

// 30 Sep: tombol AI di section Project/Portofolio & Prestasi + pastikan
// Improve seluruh CV mengirim SEMUA field (bug lama: telepon/kota/linkedin/bahasa/prestasi terlewat).

const LICENSE = 'CVK-TEST-SECT';

async function seedPremium(page) {
  await page.addInitScript((lic) => { localStorage.setItem('cvkita_license_v1', lic); }, LICENSE);
}
async function mockVerify(page) {
  await page.route('**/api/license/verify', route => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ valid: true, quota: 3 }),
  }));
}

test.describe('Tombol AI per section', () => {
  test('entri Project punya tombol AI (Improve / Translate)', async ({ page }) => {
    await seedPremium(page);
    await mockVerify(page);
    await page.goto('/');
    await page.click('[data-add="project"]');
    const entry = page.locator('#project-list .entry').last();
    await expect(entry.locator('.btn-ai')).toBeVisible();
    await expect(entry.locator('.btn-translate')).toHaveCount(0); // sudah digabung
  });

  test('Project: pilih Improve -> mode project dikirim, deskripsi diganti hasil AI', async ({ page }) => {
    await seedPremium(page);
    await mockVerify(page);
    let body = null;
    await page.route('**/api/rewrite', route => {
      body = JSON.parse(route.request().postData() || '{}');
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ result: '- Membangun sistem akademik untuk 500+ mahasiswa', remaining: 2 }) });
    });
    await page.goto('/');
    await page.click('[data-add="project"]');
    const entry = page.locator('#project-list .entry').last();
    await entry.locator('[name="project.nama"]').fill('Sistem Informasi Akademik');
    await entry.locator('[name="project.deskripsi"]').fill('bikin sistem buat kampus');
    await entry.locator('.btn-ai').click();
    await page.click('#btn-ai-improve');
    await expect(entry.locator('[name="project.deskripsi"]')).toHaveValue(/Membangun sistem akademik/);
    expect(body.mode).toBe('project');
  });

  test('Project: pilih Translate -> field project.deskripsi tertimpa terjemahan', async ({ page }) => {
    await seedPremium(page);
    await mockVerify(page);
    let body = null;
    await page.route('**/api/translate', route => {
      body = JSON.parse(route.request().postData() || '{}');
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ result: '- Built an academic information system for 500+ students', remaining: 2 }) });
    });
    await page.goto('/');
    await page.click('[data-add="project"]');
    const entry = page.locator('#project-list .entry').last();
    await entry.locator('[name="project.deskripsi"]').fill('bikin sistem buat kampus');
    await entry.locator('.btn-ai').click();
    await page.click('#btn-ai-translate');
    await expect(entry.locator('[name="project.deskripsi"]')).toHaveValue(/Built an academic information system/);
    expect(body.text).toContain('bikin sistem');
  });

  test('Prestasi: tombol AI ada; pilih Improve -> mode prestasi dikirim', async ({ page }) => {
    await seedPremium(page);
    await mockVerify(page);
    let body = null;
    await page.route('**/api/rewrite', route => {
      body = JSON.parse(route.request().postData() || '{}');
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ result: '- Finalis — Lomba Data Analysis Nasional 2023, Top 10 dari 250 tim', remaining: 2 }) });
    });
    await page.goto('/');
    await expect(page.locator('#btn-ai-prestasi')).toBeVisible();
    await page.fill('[name="prestasi"]', 'finalis lomba data analysis nasional 2023 top 10 dari 250 tim');
    await page.click('#btn-ai-prestasi');
    await page.click('#btn-ai-improve');
    await expect(page.locator('[name="prestasi"]')).toHaveValue(/Lomba Data Analysis Nasional 2023/);
    expect(body.mode).toBe('prestasi');
  });

  test('Prestasi: pilih Translate -> field prestasi tertimpa terjemahan', async ({ page }) => {
    await seedPremium(page);
    await mockVerify(page);
    await page.route('**/api/translate', route => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify({ result: '- Finalist — National Data Analysis Competition 2023', remaining: 2 }),
    }));
    await page.goto('/');
    await page.fill('[name="prestasi"]', 'finalis lomba data analysis nasional 2023');
    await page.click('#btn-ai-prestasi');
    await page.click('#btn-ai-translate');
    await expect(page.locator('[name="prestasi"]')).toHaveValue(/National Data Analysis Competition/);
  });

  test('Improve seluruh CV mengirim semua field (telepon, kota, linkedin, bahasa, prestasi)', async ({ page }) => {
    await seedPremium(page);
    await mockVerify(page);
    let body = null;
    await page.route('**/api/improve-all', route => {
      body = JSON.parse(route.request().postData() || '{}');
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ improved: true, fields: {}, remaining: 2 }) });
    });
    await page.goto('/');
    await page.fill('[name="nama"]', 'Rania');
    await page.fill('[name="telepon"]', '0812-3456-7890');
    await page.fill('[name="kota"]', 'Jakarta');
    await page.fill('[name="linkedin"]', 'linkedin.com/in/raniaputri');
    await page.fill('[name="bahasa"]', 'Indonesia (Native), Inggris (Profesional)');
    await page.fill('[name="prestasi"]', 'Finalis Lomba Data Analysis Nasional 2023');
    await page.click('[name="ringkasan"]');
    await page.fill('[name="ringkasan"]', 'Lulusan SI.');
    await page.click('#btn-improve-all');
    await page.click('#btn-improve-lang-id');
    // tunggu request terkirim
    await expect.poll(() => body && body.cv && body.cv.fields ? Object.keys(body.cv.fields).length : 0).toBeGreaterThan(0);
    expect(body.cv.fields.telepon).toBe('0812-3456-7890');
    expect(body.cv.fields.kota).toBe('Jakarta');
    expect(body.cv.fields.linkedin).toBe('linkedin.com/in/raniaputri');
    expect(body.cv.fields.bahasa).toContain('Indonesia');
    expect(body.cv.fields.prestasi).toContain('Finalis');
  });
});
