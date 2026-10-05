// Batch 1 brainstorm user 2026-09-29:
// 1. Tombol Contoh juga tersedia di awal form (sebelum "1. Data Diri")
// 2. Tombol Cek ATS tersedia di bawah preview CV, sebelum tombol Unduh PDF
// 3. Tombol Hapus di tiap entry punya ikon (SVG, bukan teks saja)
// 4. Tombol "Improve dengan AI" juga ada di section Ringkasan (premium)
import { test, expect } from '@playwright/test';

test.describe('Batch-1 UX: sample di awal, ATS di bawah preview, ikon hapus, AI ringkasan', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('tombol Contoh terlihat di awal form sebelum section Data Diri', async ({ page }) => {
    const btn = page.locator('#btn-sample-top');
    await expect(btn).toBeVisible();
    // posisi: sebelum summary "1. Data Diri" di dalam form
    const form = page.locator('#cv-form');
    const idxBtn = await btn.evaluate(el => {
      const form = el.closest('form');
      return [...form.querySelectorAll('*')].indexOf(el);
    });
    const firstSummary = await page.locator('#cv-form summary').first().evaluate(
      el => [...el.closest('form').querySelectorAll('*')].indexOf(el)
    );
    expect(idxBtn).toBeLessThan(firstSummary);
    await expect(form).toBeVisible();
  });

  test('tombol Cek ATS ada di bawah preview, sebelum tombol Unduh PDF', async ({ page }) => {
    const ats = page.locator('#btn-ats-preview');
    const dl = page.locator('#btn-download-preview');
    await expect(ats).toBeVisible();
    // dl-below hanya tampil di mobile; verifikasi urutan DOM di viewport apapun
    await expect(ats).toBeAttached();
    // dl-below hanya tampil di mobile; urutan DOM dicek via document position
    const orderOk = await ats.evaluate(el => {
      const dl = document.getElementById('btn-download-preview');
      return !!(el.compareDocumentPosition(dl) & Node.DOCUMENT_POSITION_FOLLOWING);
    });
    expect(orderOk).toBe(true);
    // kliknya menghitung skor & menampilkan panel
    await page.fill('[name="nama"]', 'Tes User');
    await page.click('#btn-ats-preview');
    await expect(page.locator('#ats-panel')).toBeVisible();
  });

  test('tombol Hapus di tiap entry memiliki ikon svg', async ({ page }) => {
    await page.fill('[name="nama"]', 'Tes User');
    const del = page.locator('#pengalaman-list .entry button[data-del]').first();
    await expect(del).toBeVisible();
    const hasIcon = await del.evaluate(el => !!el.querySelector('svg use'));
    expect(hasIcon).toBe(true);
  });

  test('section Data Diri punya tombol Improve AI untuk Ringkasan (premium gating)', async ({ page }) => {
    const btn = page.locator('#btn-ai-ringkasan');
    await expect(btn).toBeVisible();
    // tanpa lisensi → klik memunculkan paywall, bukan memanggil API
    await page.click('#btn-ai-ringkasan');
    await expect(page.locator('#paywall')).toBeVisible();
    await page.click('#btn-close-paywall');
    await expect(page.locator('#paywall')).toBeHidden();
  });
});
