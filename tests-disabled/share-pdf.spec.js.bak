// QA 2026-09-29: Kirim PDF CV ke WhatsApp (Web Share API) — yang user HARAPKAN
// saat menekan tombol ber-ikon WA, bukan sekadar link situs.
import { test, expect } from '@playwright/test';

// Stub Web Share API: tangkap payload yang akan dikirim
async function stubShare(page) {
  await page.addInitScript(() => {
    window.__shared = null;
    navigator.canShare = data => !!(data && data.files);
    navigator.share = async data => { window.__shared = data; return true; };
  });
}

test('tombol "Kirim PDF ke WhatsApp" ada dan mengirim FILE PDF (bukan cuma URL)', async ({ page }) => {
  await stubShare(page);
  await page.goto('/');
  await page.fill('[name="nama"]', 'Rania Putri Andini');
  await page.fill('[name="headline"]', 'Fresh Graduate Sistem Informasi');
  const btn = page.locator('#btn-share-pdf');
  await expect(btn).toBeVisible();
  await btn.click();
  // Tunggu hingga share() benar-benar terpanggil (PDF selesai dibuat)
  await page.waitForFunction(() => window.__shared, null, { timeout: 20000 });
  const shared = await page.evaluate(() => {
    const d = window.__shared;
    if (!d) return null;
    return { hasFiles: !!d.files, name: d.files && d.files[0] && d.files[0].name, type: d.files && d.files[0] && d.files[0].type };
  });
  expect(shared).not.toBeNull();
  expect(shared.hasFiles).toBe(true);
  expect(shared.name).toMatch(/^CV-Rania.*\.pdf$/);
  expect(shared.type).toBe('application/pdf');
});

test('browser tanpa Web Share → fallback: PDF diunduh + tombol WA teks', async ({ page }) => {
  await page.addInitScript(() => { delete navigator.share; delete navigator.canShare; });
  await page.goto('/');
  await page.fill('[name="nama"]', 'Rani');
  await page.locator('#btn-share-pdf').click();
  await expect(page.locator('#share-pdf-status')).toContainText(/unduh|diunduh|browser/i, { timeout: 20000 });
});
