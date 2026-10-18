// Cek Kecocokan CV vs Lowongan (premium) — index.html?cocok=<kalibrrUrl> → /api/job-match.
// Mock di route level. Halaman detail /job/{id}/{slug} dirender Worker; tombolnya diuji di repo Worker.
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const JOB_URL = 'https://www.kalibrr.com/c/pt-cosmax-indonesia/jobs/273056/purchasing-intern';
const PAGE = `/?cocok=${encodeURIComponent(JOB_URL)}`;

const CV_DATA = {
  fields: { nama: 'Rania', headline: 'Fresh Graduate' },
  lists: {
    pendidikan: [{ sekolah: 'UI', gelar: 'S1 SI', periode: '2021–2025' }],
    pengalaman: [{ posisi: 'Intern', organisasi: 'Tokopedia', periode: '2024', deskripsi: 'membuat fitur web' }],
    project: [],
  },
};

const RESULT = {
  score: 78,
  summary: 'Pengalaman web kamu nyambung, tapi SQL belum kelihatan di CV.',
  gaps: [
    { label: 'SQL', tip: 'Tambahkan proyek analisis data yang pakai SQL.' },
    { label: 'Tableau', tip: 'Ikut kursus dasar Tableau atau Power BI.' },
  ],
  strengths: ['Pengalaman web development', 'Latar belakang SI'],
  remaining: 2,
};

async function seedPremium(page) {
  await page.addInitScript(data => {
    localStorage.setItem('cvkita_license_v1', 'CVK-TEST-JM');
    localStorage.setItem('cvkita_data_v1', JSON.stringify(data));
  }, CV_DATA);
}

async function mockCommon(page) {
  await page.route('**/api/license/verify*', r => r.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ valid: true, quota: 3 }),
  }));
}

function jsonRoute(status, body) {
  return r => r.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

test.describe('Cek Kecocokan CV (job-match)', () => {
  test('tanpa parameter cocok → tidak ada modal dan endpoint tidak dipanggil', async ({ page }) => {
    await seedPremium(page);
    await mockCommon(page);
    let called = false;
    await page.route('**/api/job-match', r => { called = true; return r.fulfill({ status: 200, body: '{}' }); });
    await page.goto('/');
    await page.waitForTimeout(300);
    await expect(page.locator('#jm-modal')).toHaveCount(0);
    expect(called).toBe(false);
  });

  test('cocok bukan URL Kalibrr → diabaikan', async ({ page }) => {
    await seedPremium(page);
    await mockCommon(page);
    let called = false;
    await page.route('**/api/job-match', r => { called = true; return r.fulfill({ status: 200, body: '{}' }); });
    await page.goto(`/?cocok=${encodeURIComponent('https://evil.example.com/c/x/jobs/1/y')}`);
    await page.waitForTimeout(300);
    await expect(page.locator('#jm-modal')).toHaveCount(0);
    expect(called).toBe(false);
  });

  test('premium → API baru dipanggil setelah klik konfirmasi (reload tidak memotong kuota)', async ({ page }) => {
    await seedPremium(page);
    await mockCommon(page);
    let calls = 0;
    await page.route('**/api/job-match', r => { calls++; return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(RESULT) }); });
    await page.goto(PAGE);
    await expect(page.locator('#jm-submit')).toBeVisible();
    await page.waitForTimeout(300);
    expect(calls).toBe(0);
    await page.click('#jm-submit');
    await expect(page.locator('#jm-score')).toHaveText('78');
    expect(calls).toBe(1);
  });

  test('belum premium → diarahkan ke pay.html, endpoint tidak dipanggil', async ({ page }) => {
    await mockCommon(page);
    let called = false;
    await page.route('**/api/job-match', r => { called = true; return r.fulfill({ status: 200, body: '{}' }); });
    await page.goto(PAGE);
    await page.waitForURL(/\/pay\.html/);
    expect(called).toBe(false);
  });

  test('premium → skeleton saat loading, lalu skor, summary, strengths, dan gap dengan tip', async ({ page }) => {
    await seedPremium(page);
    await mockCommon(page);
    let body = null;
    await page.route('**/api/job-match', async r => {
      body = r.request().postDataJSON();
      await new Promise(res => setTimeout(res, 400));
      await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(RESULT) });
    });
    await page.goto(PAGE);
    await expect(page.locator('#jm-modal')).toBeVisible();
    await page.click('#jm-submit');
    await expect(page.locator('#jm-loading .sk-line').first()).toBeVisible();
    await expect(page.locator('#jm-score')).toHaveText('78');
    await expect(page.locator('#jm-summary')).toHaveText(RESULT.summary);
    await expect(page.locator('#jm-strengths li')).toHaveCount(2);
    await expect(page.locator('#jm-strengths li').first()).toHaveText('Pengalaman web development');
    const gaps = page.locator('#jm-gaps .jm-gap');
    await expect(gaps).toHaveCount(2);
    await expect(gaps.first().locator('.jm-gap-label')).toHaveText('SQL');
    await expect(gaps.first().locator('.jm-gap-tip')).toHaveText('Tambahkan proyek analisis data yang pakai SQL.');
    await expect(page.locator('#jm-loading')).toBeHidden();
    expect(body.code).toBe('CVK-TEST-JM');
    expect(body.jobUrl).toBe(JOB_URL);
    expect(body.cv.pengalaman).toHaveLength(1);
    expect(body.cv.fields.nama).toBe('Rania');
  });

  test('teks dari server dirender sebagai teks, bukan HTML', async ({ page }) => {
    await seedPremium(page);
    await mockCommon(page);
    await page.route('**/api/job-match', jsonRoute(200, {
      ...RESULT,
      summary: '<img src=x onerror="window.__xss=1">',
      gaps: [{ label: '<b>SQL</b>', tip: 'tip' }],
    }));
    await page.goto(PAGE);
    await page.click('#jm-submit');
    await expect(page.locator('#jm-summary')).toHaveText('<img src=x onerror="window.__xss=1">');
    await expect(page.locator('#jm-modal img')).toHaveCount(0);
    await expect(page.locator('#jm-gaps b')).toHaveCount(0);
    expect(await page.evaluate(() => window.__xss)).toBeUndefined();
  });

  test('400 (CV tanpa pengalaman) → pesan server tampil inline', async ({ page }) => {
    await seedPremium(page);
    await mockCommon(page);
    await page.route('**/api/job-match', jsonRoute(400, { error: 'CV-mu belum ada pengalaman. Isi dulu biar bisa dicek.' }));
    await page.goto(PAGE);
    await page.click('#jm-submit');
    await expect(page.locator('#jm-err')).toContainText('CV-mu belum ada pengalaman');
    await expect(page.locator('#jm-err')).toHaveAttribute('role', 'alert');
    await expect(page.locator('#jm-score')).toBeHidden();
  });

  test('403 kuota habis → jalur kuota habis (quota modal), bukan pesan biasa', async ({ page }) => {
    await seedPremium(page);
    await mockCommon(page);
    await page.route('**/api/job-match', jsonRoute(403, { error: 'Kuota AI-mu sudah habis. Beli kode baru untuk lanjut.', quota: 0 }));
    await page.goto(PAGE);
    await page.click('#jm-submit');
    await expect(page.locator('#quota-modal')).not.toHaveClass(/hidden/);
  });

  test('502 → pesan error tampil dan modal tetap bisa ditutup', async ({ page }) => {
    await seedPremium(page);
    await mockCommon(page);
    await page.route('**/api/job-match', jsonRoute(502, { error: 'Layanan AI sedang bermasalah. Coba lagi.' }));
    await page.goto(PAGE);
    await page.click('#jm-submit');
    await expect(page.locator('#jm-err')).toContainText('Layanan AI sedang bermasalah');
    await page.click('#jm-close');
    await expect(page.locator('#jm-modal')).toHaveCount(0);
  });

  test('modal bisa ditutup dengan Escape', async ({ page }) => {
    await seedPremium(page);
    await mockCommon(page);
    await page.route('**/api/job-match', jsonRoute(200, RESULT));
    await page.goto(PAGE);
    await expect(page.locator('#jm-modal')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#jm-modal')).toHaveCount(0);
  });

  test('sisa kuota dari respons disinkronkan ke badge premium', async ({ page }) => {
    await seedPremium(page);
    await mockCommon(page);
    await page.route('**/api/job-match', jsonRoute(200, RESULT));
    await page.goto(PAGE);
    await page.click('#jm-submit');
    await expect(page.locator('#jm-score')).toHaveText('78');
    await expect(page.locator('#premium-badge')).toContainText('Premium · 2×');
  });

  test('versi file: job-match.js?v=1 dimuat dan css v55 di semua halaman', async () => {
    const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    expect(index).toContain('js/job-match.js?v=1');
    for (const f of ['index.html', 'pay.html', 'lowongan.html']) {
      const html = readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
      expect(html, f).toContain('css/style.css?v=60');
      expect(html, f).not.toMatch(/css\/style\.css\?v=5[0-9]\b/);
    }
  });
});
