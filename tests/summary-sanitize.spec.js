// 1 Okt: hasil AI "Improve ringkasan" kadang masih berbentuk dash/bullet
// ("- Graduated ... - Delivered ..."). Field ringkasan dirender sebagai SATU paragraf,
// jadi dash inline jadi kalimat bersambung aneh di PDF. Jaring pengaman frontend:
// hasil AI untuk ringkasan dibersihkan dari bullet/dash leading sebelum masuk textarea.
import { test, expect } from '@playwright/test';

async function mockRewrite(page, resultText) {
  await page.route('**/api/rewrite', async (route) => {
    const req = route.request().postDataJSON();
    if (req.mode !== 'ringkasan') return route.fulfill({ status: 400, body: '{}' });
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ result: resultText, remaining: 5 }),
    });
  });
  await page.route('**/api/license/verify', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ valid: true, quota: 5, remaining: 5 }) });
  });
}

test('improve ringkasan: dash-list dari AI dibersihkan jadi paragraf mengalir', async ({ page }) => {
  await mockRewrite(page, '- Lulusan Sistem Informasi - Magang 6 bulan di analisis data - Terbiasa SQL dan Excel');
  await page.addInitScript(() => {
    localStorage.setItem('cvkita_license_v1', 'CVK-TEST-FFUL');
  });
  await page.addInitScript(() => {
    localStorage.setItem('cvkita_license_v1', 'CVK-TEST-FFUL');
  });
  await page.goto('/');
  await page.fill('[name="nama"]', 'Budi');
  await page.fill('[name="ringkasan"]', 'ringkasan lama');
  await page.locator('#btn-ai-ringkasan').click();
  // modal pilihan muncul (pre-check quota sudah lolos) → pilih Improve
  await page.locator('#btn-ai-improve').click();
  const ta = page.locator('[name="ringkasan"]');
  await expect(ta).toHaveValue(/Sistem Informasi/);
  const val = await ta.inputValue();
  // tidak boleh dimulai dash, tidak boleh ada " - " sebagai pemisah list
  expect(val.startsWith('-')).toBe(false);
  expect(val).not.toMatch(/\s-\s/);
});
