// QA 2026-09-29: SWOT analysis (Opsi A) — dirender di panel jobsearch setelah hasil lowongan
import { test, expect } from '@playwright/test';

const SWOT = {
  s: ['Skill SQL dari project kuliah', 'Pengalaman magang data di startup'],
  w: ['Belum ada sertifikasi data — ambil Google Data Analytics', 'Portofolio visualisasi minim'],
  o: ['Permintaan data analyst tumbuh pesat', 'Banyak startup cari entry-level'],
  t: ['Persaingan ketat dari lulusan statistik', 'ATS menyaring CV tanpa keyword tool'],
};

test('SWOT 4 kuadran dirender di bawah hasil lowongan', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('cvkita_license_v1', 'CVK-FAKE-CODE'));
  await page.fill('[name="nama"]', 'Rania');
  await page.fill('[name="headline"]', 'Fresh Graduate Sistem Informasi');
  await page.fill('[name="keahlian"]', 'SQL, Excel');
  await page.route('**/api/job-search', route => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({
      category: 'Data Analyst',
      queries: ['data analyst fresh graduate', 'junior data analyst', 'sql analyst'],
      reason: 'Cocok karena jurusan SI dan skill SQL kamu.',
      swot: SWOT,
      remaining: 2,
    }),
  }));
  await page.click('#btn-jobsearch');
  const grid = page.locator('.swot-grid');
  await expect(grid).toBeVisible();
  await expect(grid.locator('.swot-s li')).toHaveCount(2);
  await expect(grid.locator('.swot-w')).toContainText('sertifikasi');
  await expect(grid.locator('.swot-o li')).toHaveCount(2);
  await expect(grid.locator('.swot-t li')).toHaveCount(2);
  await expect(page.locator('.swot-cap')).toContainText('Data Analyst');
  // Hasil lowongan tetap ada di atas SWOT
  await expect(page.locator('.js-card').first()).toBeVisible();
});

test('tanpa swot (null) → grid tidak dirender, hasil lowongan tetap muncul', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('cvkita_license_v1', 'CVK-FAKE-CODE'));
  await page.fill('[name="nama"]', 'Rania');
  await page.fill('[name="headline"]', 'Fresh Graduate Sistem Informasi');
  await page.fill('[name="keahlian"]', 'SQL, Excel');
  await page.route('**/api/job-search', route => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({
      category: 'QA Engineer',
      queries: ['qa engineer', 'quality assurance', 'qa intern'],
      reason: 'x', swot: null, remaining: 1,
    }),
  }));
  await page.click('#btn-jobsearch');
  await expect(page.locator('.js-card').first()).toBeVisible();
  await expect(page.locator('.swot-grid')).toHaveCount(0);
});
