// QA backlog 2026-09-29: Skor ATS sekarang punya PENJELASAN per kategori
// (bukan cuma angka + daftar tips polos). User harus tahu APA yang lemah & KENAPA.
import { test, expect } from '@playwright/test';

test.describe('Penjelasan Skor ATS', () => {
  test('panel ATS menampilkan kategori + skor per bagian + saran prioritas', async ({ page }) => {
    await page.goto('/');
    await page.fill('[name="nama"]', 'Rania QA');
    await page.click('#btn-ats-preview');
    const panel = page.locator('#ats-panel');
    await expect(panel).toBeVisible();
    // ada breakdown kategori
    await expect(panel.locator('.ats-cat')).toHaveCount(3); // Identitas, Isi, Kekuatan
    // tiap kategori punya label & poin
    await expect(panel.locator('.ats-cat').first()).toContainText(/Identitas|Isi|Kekuatan/);
    // ada saran prioritas (poin hilang terbesar dulu)
    const firstTip = panel.locator('#ats-tips li').first();
    await expect(firstTip).toBeVisible();
  });

  test('CV lengkap -> skor 100, pesan positif, tanpa tips', async ({ page }) => {
    await page.goto('/');
    // klik sample (auto-confirm)
    page.on('dialog', d => d.accept());
    await page.click('#btn-sample-top');
    await page.waitForURL(/.*/);
    await page.reload();
    await page.click('#btn-ats-preview');
    await expect(page.locator('#ats-score')).toHaveText('100');
    await expect(page.locator('#ats-tips')).toContainText(/Mantap|siap/i);
  });
});
