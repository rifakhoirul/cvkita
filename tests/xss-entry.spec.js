import { test, expect } from '@playwright/test';

test('list entries safely escape malicious HTML (XSS prevention)', async ({ page }) => {
  // Inject malicious data directly into localStorage to simulate crafted data
  // (e.g. from importing a malicious CV or tampering with state)
  const maliciousData = {
    fields: {
      nama: 'Hacker',
    },
    lists: {
      pendidikan: [
        {
          sekolah: '"><script>document.body.classList.add("xss-hacked")</script>',
          periode: '2020-2024',
          gelar: 'S1'
        }
      ]
    }
  };

  await page.goto('/');
  await page.evaluate((data) => {
    localStorage.setItem('cvkita_data_v1', JSON.stringify(data));
  }, maliciousData);

  // Reload page to apply the loaded data
  await page.reload();

  // Verify that the XSS payload did NOT execute
  const hasHackedClass = await page.evaluate(() => document.body.classList.contains('xss-hacked'));
  expect(hasHackedClass).toBe(false);

  // Verify that the injected HTML is rendered securely as a text value within the input
  const inputEl = page.locator('input[name="pendidikan.sekolah"]').first();
  await expect(inputEl).toBeVisible();
  await expect(inputEl).toHaveValue('"><script>document.body.classList.add("xss-hacked")</script>');

  // Also verify that the HTML source of the container does not have an unescaped script tag
  const containerHTML = await page.locator('#pendidikan-list').innerHTML();
  expect(containerHTML).not.toContain('<script>');
  expect(containerHTML).toContain('&lt;script&gt;');
});
