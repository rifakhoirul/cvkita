import { test, expect } from '@playwright/test';

// Masukan pengunjung (30 Sep): "Tambah contoh CV untuk jurusan non-IT."
// Tombol contoh kini menawarkan 3 profil: IT/Data, Non-IT (Administrasi), Marketing/Sales.
// Modal pilihan muncul sebelum isi; masing-masing profil mengisi form lengkap.

test('klik Contoh -> modal pilih jurusan muncul dengan 3 pilihan', async ({ page }) => {
  await page.goto('/');
  await page.click('#btn-sample-top');
  await expect(page.locator('#sample-modal')).toBeVisible();
  await expect(page.locator('[data-sample="it"]')).toBeVisible();
  await expect(page.locator('[data-sample="nonit"]')).toBeVisible();
  await expect(page.locator('[data-sample="marketing"]')).toBeVisible();
});

test('pilih contoh non-IT -> form terisi profil administrasi (bukan IT)', async ({ page }) => {
  await page.goto('/');
  await page.click('#btn-sample-top');
  await page.click('[data-sample="nonit"]');
  await page.waitForTimeout(700);
  const nama = await page.inputValue('[name="nama"]');
  const ringkasan = await page.inputValue('[name="ringkasan"]');
  expect(nama.length).toBeGreaterThan(3);
  expect(ringkasan.toLowerCase()).not.toMatch(/sistem informasi|sql|python/);
});

test('pilih contoh marketing -> form terisi profil marketing/sales', async ({ page }) => {
  await page.goto('/');
  await page.click('#btn-sample-top');
  await page.click('[data-sample="marketing"]');
  await page.waitForTimeout(700);
  const ringkasan = await page.inputValue('[name="ringkasan"]');
  expect(ringkasan.toLowerCase()).toMatch(/marketing|penjualan|sales/);
});

test('pilih contoh IT -> tetap berfungsi seperti dulu', async ({ page }) => {
  await page.goto('/');
  await page.click('#btn-sample-top');
  await page.click('[data-sample="it"]');
  await page.waitForTimeout(700);
  const ringkasan = await page.inputValue('[name="ringkasan"]');
  expect(ringkasan.toLowerCase()).toMatch(/data|sistem informasi/);
});

test('modal contoh bisa dibatalkan tanpa mengubah form', async ({ page }) => {
  await page.goto('/');
  await page.click('#btn-sample-top');
  await page.click('#sample-cancel');
  await expect(page.locator('#sample-modal')).toBeHidden();
});
