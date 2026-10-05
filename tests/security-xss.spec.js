import { test, expect } from '@playwright/test';

test('entryHTML escapes user input to prevent XSS', async ({ page }) => {
  await page.goto('/');

  // Inject malicious data via localStorage
  await page.evaluate(() => {
    localStorage.setItem('cvkita_data_v1', JSON.stringify({
      fields: {},
      lists: {
        pendidikan: [
          { sekolah: '"><script>document.body.classList.add("xss-success")</script>', gelar: 'S1', periode: '2020-2024' }
        ]
      }
    }));
  });

  // Reload to apply data
  await page.goto('/');

  // Verify that the script did NOT execute (body should not have 'xss-success')
  const hasXssSuccess = await page.evaluate(() => document.body.classList.contains('xss-success'));
  expect(hasXssSuccess).toBe(false);

  // Additionally check that the input value is properly escaped in HTML
  // We grab the raw HTML of the entry list
  const html = await page.evaluate(() => document.getElementById('pendidikan-list').innerHTML);
  expect(html).not.toContain('<script>document.body.classList.add("xss-success")</script>');
});
