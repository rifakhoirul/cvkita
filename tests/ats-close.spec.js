import { test, expect } from '@playwright/test';

test('panel ATS bisa ditutup dengan tombol ✕', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    document.querySelector('[name="nama"]').value = 'Rania Putri Andini';
    document.querySelector('[name="headline"]').value = 'Fresh Graduate SI';
    document.querySelector('[name="keahlian"]').value = 'SQL, Python';
    document.querySelector('[name="ringkasan"]').value = 'Fresh graduate siap belajar analisis data nyata di industri.';
  });
  // buka panel ATS
  await page.locator('#btn-ats-preview').click();
  await expect(page.locator('#ats-panel')).toBeVisible();
  // tutup
  await page.locator('#btn-ats-close').click();
  await expect(page.locator('#ats-panel')).toBeHidden();
});
