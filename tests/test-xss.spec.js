import { test, expect } from '@playwright/test';

test('xss in entryHTML', async ({ page }) => {
  await page.goto('/');

  // Set local storage data with XSS payload
  await page.evaluate(() => {
    localStorage.setItem('cvkita_data_v1', JSON.stringify({
      lists: {
        pendidikan: [{
          sekolah: '"><img src="x" onerror="window.XSS_TRIGGERED = true" />'
        }]
      }
    }));
  });

  await page.reload();

  // Wait a bit for the image onerror to trigger
  await page.waitForTimeout(500);

  // Wait to see if script triggered
  const isTriggered = await page.evaluate(() => window.XSS_TRIGGERED);
  console.log('XSS Triggered:', isTriggered);
  expect(isTriggered).toBeFalsy();
});
