// Banding Lowongan (gratis) — btn-rank → modal multi-lowongan → /api/rank → tabel ranking.
// Mock di route level, konvensi sama dengan tailor.spec.js.
import { test, expect } from '@playwright/test';

const JOB_A = 'Kami mencari data analyst fresh graduate. Kualifikasi: menguasai SQL, Excel, Tableau, komunikasi data, dan mampu membuat dashboard. Tanggung jawab: menganalisis data penjualan, membuat laporan mingguan, bekerja sama dengan tim marketing, dan menyajikan insight ke manajemen setiap minggu secara rutin.';
const JOB_B = 'Kami mencari backend engineer. Kualifikasi: menguasai Node.js, PostgreSQL, REST API, Docker, dan Git. Tanggung jawab: membangun dan memelihara layanan backend, menulis test otomatis, serta melakukan deployment ke cloud setiap minggu bersama tim engineering.';
const RANKED = [
  { index: 0, score: { total: 82 }, verdict: 'Cocok', gaps: ['Tableau'], hardreqs: [] },
  { index: 1, score: { total: 45 }, verdict: 'Pertimbangkan', gaps: ['Node.js', 'PostgreSQL'], hardreqs: ['Pengalaman backend 1 tahun'] },
];

async function seedPremium(page) {
  await page.addInitScript(() => {
    localStorage.setItem('cvkita_license_v1', 'CVK-TEST-RANK');
    localStorage.setItem('cvkita_quota_cache', JSON.stringify({ remaining: 3, at: Date.now() }));
  });
}

async function mockEndpoints(page, rank) {
  await page.route('**/api/rank', rank);
}

const TWO_JOBS = [JOB_A, JOB_B];

test.describe('Banding Lowongan (btn-rank)', () => {
  test('submit 2 lowongan → /api/rank dipanggil dengan jobs[]; tabel ranking urut tampil', async ({ page }) => {
    let body = null;
    await mockEndpoints(page, async r => {
      body = r.request().postDataJSON();
      await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ranked: RANKED }) });
    });
    await page.goto('/');
    await page.fill('[name="nama"]', 'Rania');
    await page.fill('[name="keahlian"]', 'SQL, Excel');
    await page.click('#btn-rank');
    await expect(page.locator('#rank-modal')).toBeVisible();
    await page.fill('#rank-jobtext', `${JOB_A}\n---\n${JOB_B}`);
    await page.click('#rank-submit');
    await expect(page.locator('#rank-result')).toBeVisible({ timeout: 10000 });
    // urut skor desc: 82 dulu, lalu 45
    const scores = await page.locator('#rank-result .rank-row .rank-score').allTextContents();
    expect(scores[0]).toContain('82');
    expect(scores[1]).toContain('45');
    const rows = page.locator('#rank-result .rank-row');
    await expect(rows.first()).toContainText('Tableau', { timeout: 5000 });
    await expect(rows.nth(1)).toContainText('Pengalaman backend 1 tahun', { timeout: 5000 });
    expect(body.jobs).toHaveLength(2);
    expect(body.jobs[0]).toContain('Tableau');
    // gratis: tidak ada kode lisensi dikirim
    expect(body.code).toBeUndefined();
  });

  test('CTA "Tailor lowongan ini" pada baris teratas → modal tailor terbuka dengan jobText terisi', async ({ page }) => {
    await seedPremium(page);
    await mockEndpoints(page, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ranked: RANKED }) }));
    await page.route('**/api/license/verify*', r => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ valid: true, quota: 3 }) }));
    await page.goto('/');
    await page.fill('[name="nama"]', 'Rania');
    await page.fill('[name="keahlian"]', 'SQL, Excel');
    await page.click('#btn-rank');
    await page.fill('#rank-jobtext', `${JOB_A}\n---\n${JOB_B}`);
    await page.click('#rank-submit');
    await expect(page.locator('#rank-result')).toBeVisible({ timeout: 10000 });
    await page.locator('#rank-result .rank-row').first().locator('.rank-tailor').click();
    await expect(page.locator('#tailor-modal')).toBeVisible();
    await expect(page.locator('#tailor-jobtext')).not.toHaveValue('');
  });

  test('lowongan terlalu pendek → error inline, /api/rank TIDAK dipanggil', async ({ page }) => {
    const spy = { called: false };
    await mockEndpoints(page, r => { spy.called = true; return r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); });
    await page.goto('/');
    await page.fill('[name="nama"]', 'Rania');
    await page.click('#btn-rank');
    await page.fill('#rank-jobtext', 'terlalu pendek');
    await page.click('#rank-submit');
    await expect(page.locator('#rank-err')).toContainText('pendek');
    await expect(page.locator('#rank-result')).toHaveCount(0);
    expect(spy.called).toBe(false);
  });

  test('rate limit 429 dari server → pesan ramah, tanpa hasil', async ({ page }) => {
    await mockEndpoints(page, r => r.fulfill({ status: 429, contentType: 'application/json', body: JSON.stringify({ error: 'Terlalu banyak pembandingan. Coba lagi dalam satu jam.' }) }));
    await page.goto('/');
    await page.fill('[name="nama"]', 'Rania');
    await page.click('#btn-rank');
    await page.fill('#rank-jobtext', `${JOB_A}\n---\n${JOB_B}`);
    await page.click('#rank-submit');
    await expect(page.locator('#rank-err')).toContainText('satu jam');
    await expect(page.locator('#rank-result')).toHaveCount(0);
  });

  test('tombol btn-rank full-width sejajar btn-tailor (375px) dan diberi badge Gratis', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto('/');
    const a = await page.locator('#btn-rank').boundingBox();
    const b = await page.locator('#btn-tailor').boundingBox();
    expect(a.width).toBeGreaterThan(340);
    expect(Math.abs(a.x - b.x)).toBeLessThanOrEqual(2);
    await expect(page.locator('#btn-rank')).toContainText('Gratis');
  });
});
