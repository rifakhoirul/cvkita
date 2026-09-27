import { test, expect } from '@playwright/test';

test.describe('Halaman artikel & masukan', () => {
  test('artikel ATS terbuka dan berisi judul yang benar', async ({ page }) => {
    await page.goto('/blog/apa-itu-ats.html');
    await expect(page.locator('h1')).toContainText('ATS');
    // meta description wajib ada untuk SEO
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content', /ATS|CV/i
    );
  });

  test('artikel punya CTA kembali ke pembuat CV', async ({ page }) => {
    await page.goto('/blog/apa-itu-ats.html');
    const cta = page.locator('.cta-box a');
    await expect(cta).toBeVisible();
    await expect(cta).toContainText(/CV/i);
  });

  test('halaman indeks blog memuat dan menaut ke artikel', async ({ page }) => {
    await page.goto('/blog/');
    await expect(page.locator('h1')).toBeVisible();
    await page.locator('.art h2 a').first().click();
    await expect(page.locator('h1')).toContainText('ATS');
  });

  test('footer memuat tautan panduan & masukan', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.footer-links a', { hasText: 'Panduan Karier' })).toBeVisible();
    await expect(page.locator('.footer-links a', { hasText: 'Kirim Masukan' })).toBeVisible();
  });

  test('form masukan terbuka, bisa diisi, dan tersimpan', async ({ page }) => {
    await page.goto('/');
    await page.locator('.footer-links a', { hasText: 'Kirim Masukan' }).click();
    await expect(page.locator('#feedback-modal')).toBeVisible();

    const teks = 'Tambah contoh CV untuk jurusan non-IT.';
    await page.fill('#fb-text', teks);
    await expect(page.locator('#fb-n')).toHaveText(String(teks.length));

    await page.click('#fb-send');
    await expect(page.locator('#fb-status')).not.toBeEmpty();

    const saved = await page.evaluate(() =>
      localStorage.getItem('cvkita_feedback_v1')
    );
    expect(saved).toContain('jurusan non-IT');
  });

  test('form masukan menolak isian kosong', async ({ page }) => {
    await page.goto('/');
    await page.locator('.footer-links a', { hasText: 'Kirim Masukan' }).click();
    await page.click('#fb-send');
    await expect(page.locator('#fb-status')).toContainText('Tulis dulu');
  });

  test('modal masukan bisa ditutup', async ({ page }) => {
    await page.goto('/');
    await page.locator('.footer-links a', { hasText: 'Kirim Masukan' }).click();
    await page.click('#fb-cancel');
    await expect(page.locator('#feedback-modal')).toHaveCount(0);
  });
});
