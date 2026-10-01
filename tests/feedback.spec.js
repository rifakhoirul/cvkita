import { test, expect } from '@playwright/test';

test.describe('Feedback Module', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the page and open feedback modal
    await page.goto('/');
    await page.evaluate(() => {
      if (window.__cvkitaFeedback) {
        window.__cvkitaFeedback();
      }
    });
    // Wait for the modal to be visible
    await expect(page.locator('#feedback-modal')).toBeVisible();
  });

  test('modal renders with correct elements', async ({ page }) => {
    await expect(page.locator('#fb-title')).toHaveText('Bantu CVKita jadi lebih baik');
    await expect(page.locator('#fb-text')).toBeVisible();
    await expect(page.locator('#fb-n')).toHaveText('0');
    await expect(page.locator('#fb-cancel')).toBeVisible();
    await expect(page.locator('#fb-send')).toBeVisible();
  });

  test('character count updates correctly', async ({ page }) => {
    const textToType = 'Ini adalah masukan untuk fitur baru.';
    await page.locator('#fb-text').fill(textToType);
    await expect(page.locator('#fb-n')).toHaveText(textToType.length.toString());
  });

  test('modal can be closed via Batal button', async ({ page }) => {
    await page.locator('#fb-cancel').click();
    await expect(page.locator('#feedback-modal')).toBeHidden();
  });

  test('modal can be closed by clicking outside', async ({ page }) => {
    // Click outside the modal box, which has class fb-backdrop
    await page.locator('#feedback-modal').click({ position: { x: 10, y: 10 } });
    await expect(page.locator('#feedback-modal')).toBeHidden();
  });

  test('empty input returns error', async ({ page }) => {
    await page.locator('#fb-send').click();
    await expect(page.locator('#fb-status')).toHaveText('Tulis dulu masukannya ya.');
  });

  test('submission writes to localStorage and handles successful fetch', async ({ page }) => {
    // Mock successful fetch response
    await page.route('https://cvkita-api.cvkita-rifakhoirul.workers.dev/api/feedback', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    const inputText = 'Masukan yang sangat berguna.';
    await page.locator('#fb-text').fill(inputText);

    // Check initial localStorage
    let feedbackData = await page.evaluate(() => JSON.parse(localStorage.getItem('cvkita_feedback_v1') || '[]'));
    const initialCount = feedbackData.length;

    await page.locator('#fb-send').click();

    // Verify localStorage was updated
    feedbackData = await page.evaluate(() => JSON.parse(localStorage.getItem('cvkita_feedback_v1') || '[]'));
    expect(feedbackData.length).toBe(initialCount + 1);
    expect(feedbackData[feedbackData.length - 1].text).toBe(inputText);

    // Verify UI updates
    await expect(page.locator('#fb-send')).toBeDisabled();
    await expect(page.locator('#fb-status')).toHaveText('Terima kasih! Masukanmu sudah terkirim.');

    // Wait for the modal to close automatically (timeout is 1400ms in source)
    await expect(page.locator('#feedback-modal')).toBeHidden({ timeout: 2000 });
  });

  test('handles fetch network error', async ({ page }) => {
    // Mock network error
    await page.route('https://cvkita-api.cvkita-rifakhoirul.workers.dev/api/feedback', async route => {
      await route.abort('failed');
    });

    await page.locator('#fb-text').fill('Testing network error');
    await page.locator('#fb-send').click();

    // Verify UI updates
    await expect(page.locator('#fb-send')).toBeEnabled();
    await expect(page.locator('#fb-status')).toHaveText('Tidak bisa menghubungi server. Periksa koneksi internetmu.');
  });

  test('handles fetch non-ok response with custom error', async ({ page }) => {
    // Mock 400 response with custom error
    await page.route('https://cvkita-api.cvkita-rifakhoirul.workers.dev/api/feedback', async route => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Feedback terlalu pendek' }),
      });
    });

    await page.locator('#fb-text').fill('Test');
    await page.locator('#fb-send').click();

    // Verify UI updates
    await expect(page.locator('#fb-send')).toBeEnabled();
    await expect(page.locator('#fb-status')).toHaveText('Feedback terlalu pendek');
  });

  test('handles fetch non-ok response with default error', async ({ page }) => {
    // Mock 500 response without custom error
    await page.route('https://cvkita-api.cvkita-rifakhoirul.workers.dev/api/feedback', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({}),
      });
    });

    await page.locator('#fb-text').fill('Test 500 error');
    await page.locator('#fb-send').click();

    // Verify UI updates
    await expect(page.locator('#fb-send')).toBeEnabled();
    await expect(page.locator('#fb-status')).toHaveText('Gagal mengirim. Coba lagi.');
  });
});
