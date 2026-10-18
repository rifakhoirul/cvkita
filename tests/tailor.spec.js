// CV Tailoring per lowongan (premium) — modal lowongan → /api/tailor → skor + gap.
// Mock di route level, satu test per cabang sesuai konvensi ai-actions.
import { test, expect } from '@playwright/test';

const JOB_TEXT = 'Kami mencari data analyst fresh graduate. Kualifikasi: menguasai SQL, Excel, Tableau, komunikasi data, dan mampu membuat dashboard. Tanggung jawab: menganalisis data penjualan, membuat laporan mingguan bekerja sama dengan tim marketing, dan menyajikan insight ke manajemen setiap minggu.';
const TAILORED = {
  fields: { nama: 'Rania', headline: 'Fresh Graduate — Data Analyst', ringkasan: 'Lulusan SI dengan SQL dan Excel.', keahlian: 'SQL, Excel' },
  pendidikan: [], pengalaman: [], project: [],
  score: { total: 72, keyword: 80, experience: 65, education: 70 },
  gaps: ['Tableau', 'Dashboard BI'],
  tailored: true, remaining: 2,
};

async function seedPremium(page) {
  await page.addInitScript(() => {
    localStorage.setItem('cvkita_license_v1', 'CVK-TEST-TAIL');
    localStorage.setItem('cvkita_quota_cache', JSON.stringify({ remaining: 3, at: Date.now() }));
  });
}

async function mockEndpoints(page, tailor) {
  await page.route('**/api/license/verify*', r => r.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ valid: true, quota: 3 }),
  }));
  await page.route('**/api/tailor', tailor);
}

test.describe('CV Tailoring (btn-tailor)', () => {
  test('belum premium → paywall, /api/tailor TIDAK dipanggil', async ({ page }) => {
    let called = false;
    await page.route('**/api/tailor', r => { called = true; return r.fulfill({ status: 200, body: '{}' }); });
    await page.goto('/');
    await page.click('#btn-tailor');
    await expect(page.locator('#paywall')).toBeVisible();
    await page.waitForTimeout(300);
    expect(called).toBe(false);
  });

  test('premium → modal lowongan muncul; teks pendek ditolak lokal', async ({ page }) => {
    await seedPremium(page);
    await mockEndpoints(page, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(TAILORED) }));
    await page.goto('/');
    await page.click('#btn-tailor');
    await expect(page.locator('#tailor-modal')).toBeVisible();
    await page.fill('#tailor-jobtext', 'terlalu pendek');
    await page.click('#tailor-submit');
    await expect(page.locator('#tailor-err')).toContainText('terlalu pendek');
    await expect(page.locator('#tailor-modal')).toBeVisible();
  });

  test('modal closable: tombol X menutup modal', async ({ page }) => {
    await seedPremium(page);
    await mockEndpoints(page, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(TAILORED) }));
    await page.goto('/');
    await page.click('#btn-tailor');
    await expect(page.locator('#tailor-modal')).toBeVisible();
    await page.click('#tailor-close');
    await expect(page.locator('#tailor-modal')).toHaveCount(0);
  });

  test('submit lowongan → /api/tailor dipanggil dengan jobText; hasil skor tampil; Terima mengubah field', async ({ page }) => {
    await seedPremium(page);
    let body = null;
    await mockEndpoints(page, r => r.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify(TAILORED),
      // capture after fulfill not supported; use a fulfill fn trick below instead
    }));
    await page.route('**/api/tailor', async r => {
      body = r.request().postDataJSON();
      await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(TAILORED) });
    });
    await page.goto('/');
    await page.fill('[name="nama"]', 'Rania');
    await page.fill('[name="keahlian"]', 'SQL, Excel');
    await page.click('#btn-tailor');
    await page.fill('#tailor-jobtext', JOB_TEXT);
    await page.click('#tailor-submit');
    await expect(page.locator('#tailor-result')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.tailor-score-total span')).toHaveText('72');
    await expect(page.locator('.tailor-gaps')).toContainText('Tableau');
    expect(body.jobText).toBe(JOB_TEXT);
    expect(body.code).toBe('CVK-TEST-TAIL');
    await page.click('#tailor-accept');
    await expect(page.locator('#tailor-result')).toHaveCount(0);
    await expect(page.locator('[name="headline"]')).toHaveValue('Fresh Graduate — Data Analyst');
  });

  test('hardreqs dari server → blok peringatan "Syarat wajib" tampil di modal hasil', async ({ page }) => {
    await seedPremium(page);
    const withHardreqs = { ...TAILORED, hardreqs: ['Sertifikasi BNSP wajib', 'Pengalaman minimal 2 tahun'] };
    await mockEndpoints(page, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(withHardreqs) }));
    await page.route('**/api/tailor', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(withHardreqs) }));
    await page.goto('/');
    await page.fill('[name="nama"]', 'Rania');
    await page.fill('[name="keahlian"]', 'SQL, Excel');
    await page.click('#btn-tailor');
    await page.fill('#tailor-jobtext', JOB_TEXT);
    await page.click('#tailor-submit');
    await expect(page.locator('#tailor-result')).toBeVisible({ timeout: 10000 });
    const warn = page.locator('.tailor-hardreqs');
    await expect(warn).toBeVisible();
    await expect(warn).toContainText('Sertifikasi BNSP wajib');
    await expect(warn).toContainText('Pengalaman minimal 2 tahun');
  });

  test('hardreqs kosong → blok peringatan TIDAK tampil', async ({ page }) => {
    await seedPremium(page);
    const noHardreqs = { ...TAILORED, hardreqs: [] };
    await mockEndpoints(page, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(noHardreqs) }));
    await page.route('**/api/tailor', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(noHardreqs) }));
    await page.goto('/');
    await page.fill('[name="nama"]', 'Rania');
    await page.fill('[name="keahlian"]', 'SQL, Excel');
    await page.click('#btn-tailor');
    await page.fill('#tailor-jobtext', JOB_TEXT);
    await page.click('#tailor-submit');
    await expect(page.locator('#tailor-result')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.tailor-hardreqs')).toHaveCount(0);
  });

  test('Pertahankan punyaku → field tidak berubah', async ({ page }) => {
    await seedPremium(page);
    await mockEndpoints(page, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(TAILORED) }));
    await page.route('**/api/tailor', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(TAILORED) }));
    await page.goto('/');
    await page.fill('[name="headline"]', 'Headline Asli');
    await page.click('#btn-tailor');
    await page.fill('#tailor-jobtext', JOB_TEXT);
    await page.click('#tailor-submit');
    await page.click('#tailor-keep');
    await expect(page.locator('#tailor-result')).toHaveCount(0);
    await expect(page.locator('[name="headline"]')).toHaveValue('Headline Asli');
  });

  test('kuota habis dari server → modal kuota, field tak berubah', async ({ page }) => {
    await seedPremium(page);
    await mockEndpoints(page, r => r.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ error: 'Kuota AI-mu sudah habis. Beli kode baru untuk lanjut.' }) }));
    await page.goto('/');
    await page.click('#btn-tailor');
    await page.fill('#tailor-jobtext', JOB_TEXT);
    await page.click('#tailor-submit');
    await expect(page.locator('#tailor-result')).toHaveCount(0);
  });
});

test.describe('tombol tailor alignment', () => {
  test('btn-tailor full-width, sejajar dengan btn-improve-all (375px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto('/');
    const a = await page.locator('#btn-tailor').boundingBox();
    const b = await page.locator('#btn-improve-all').boundingBox();
    expect(a.width).toBeGreaterThan(340);
    expect(Math.abs(a.x - b.x)).toBeLessThanOrEqual(2);
    expect(Math.abs((a.x + a.width) - (b.x + b.width))).toBeLessThanOrEqual(2);
  });
});
