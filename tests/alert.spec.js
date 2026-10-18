// Kartu "Dapat kabar lowongan baru" di lowongan.html → POST /api/alert/subscribe.
// Semua test memakai page.route — TIDAK pernah memanggil Worker asli.
import { test, expect } from '@playwright/test';

const JOBS = [
  { id: 101, title: 'Marketing Intern', company: 'PT Maju Jaya', location: 'South Jakarta', tenure: 'Full time', isIntern: true, freshGrad: true, url: 'https://www.kalibrr.com/c/maju-jaya/jobs/101/marketing-intern', description: '' },
];

async function openPage(page, { subscribe } = {}) {
  const bodies = [];
  await page.route('**/api/jobs**', route => route.fulfill({ json: { jobs: JOBS, total: JOBS.length } }));
  await page.route('**/api/alert/subscribe', async route => {
    const body = route.request().postDataJSON();
    bodies.push(body);
    if (subscribe) return subscribe(route, body);
    return route.fulfill({ json: { ok: true } });
  });
  await page.goto('/lowongan.html');
  await expect(page.locator('.job-card')).toHaveCount(1);
  return bodies;
}

test.describe('Alert lowongan via email', () => {
  test('tombol Tampilkan lebih banyak tepat setelah daftar, sebelum kartu alert', async ({ page }) => {
    await openPage(page);
    const card = page.locator('#alert-card');
    await expect(card).toBeVisible();
    await expect(card.locator('#alert-email')).toBeVisible();
    await expect(card.locator('#alert-q')).toBeVisible();
    await expect(card.locator('#alert-submit')).toHaveText('Aktifkan alert');
    const order = await page.evaluate(() => {
      const list = document.getElementById('jobs-list');
      const alert = document.getElementById('alert-card');
      const more = document.querySelector('.lw-more');
      return {
        listBeforeMore: !!(list.compareDocumentPosition(more) & Node.DOCUMENT_POSITION_FOLLOWING),
        moreBeforeAlert: !!(more.compareDocumentPosition(alert) & Node.DOCUMENT_POSITION_FOLLOWING),
      };
    });
    expect(order).toEqual({ listBeforeMore: true, moreBeforeAlert: true });
  });

  test('kata kunci terisi dari query aktif dan ikut berubah saat mencari', async ({ page }) => {
    await openPage(page);
    await expect(page.locator('#alert-q')).toHaveValue('intern');
    await page.fill('#jobs-q', 'data analyst');
    await page.locator('#jobs-go').click();
    await expect(page.locator('#alert-q')).toHaveValue('data analyst');
  });

  test('email tidak valid → pesan validasi, tidak ada request ke Worker', async ({ page }) => {
    const bodies = await openPage(page);
    await page.fill('#alert-email', 'bukan-email');
    await page.locator('#alert-submit').click();
    await expect(page.locator('#alert-msg')).toContainText('email yang valid');
    await expect(page.locator('#alert-email')).toHaveAttribute('aria-invalid', 'true');
    expect(bodies).toHaveLength(0);
  });

  test('kata kunci kurang dari 2 karakter → pesan validasi, tidak ada request', async ({ page }) => {
    const bodies = await openPage(page);
    await page.fill('#alert-email', 'budi@example.com');
    await page.fill('#alert-q', 'x');
    await page.locator('#alert-submit').click();
    await expect(page.locator('#alert-msg')).toContainText('2–60 karakter');
    expect(bodies).toHaveLength(0);
  });

  test('submit valid → POST {email, q} dan pesan "Cek email-mu untuk konfirmasi ✅"', async ({ page }) => {
    const bodies = await openPage(page);
    await page.fill('#alert-email', '  Budi@Example.com ');
    await page.fill('#alert-q', 'data analyst');
    await page.locator('#alert-submit').click();
    await expect(page.locator('#alert-msg')).toHaveText('Cek email-mu untuk konfirmasi ✅');
    expect(bodies).toEqual([{ email: 'Budi@Example.com', q: 'data analyst' }]);
  });

  test('429 dari Worker → pesan batas permintaan', async ({ page }) => {
    await openPage(page, { subscribe: route => route.fulfill({ status: 429, json: { error: 'x' } }) });
    await page.fill('#alert-email', 'budi@example.com');
    await page.locator('#alert-submit').click();
    await expect(page.locator('#alert-msg')).toContainText('Terlalu banyak permintaan');
  });

  test('koneksi gagal → pesan koneksi bermasalah, tombol aktif lagi', async ({ page }) => {
    await openPage(page, { subscribe: route => route.abort() });
    await page.fill('#alert-email', 'budi@example.com');
    await page.locator('#alert-submit').click();
    await expect(page.locator('#alert-msg')).toContainText('Koneksi lagi bermasalah');
    await expect(page.locator('#alert-submit')).toBeEnabled();
  });

  test('klik kirim mencatat event alert_subscribe_click via __cvkitaTrack', async ({ page }) => {
    await openPage(page);
    await page.evaluate(() => {
      window.__trk = [];
      window.__cvkitaTrack = e => window.__trk.push(e);
    });
    await page.fill('#alert-email', 'budi@example.com');
    await page.locator('#alert-submit').click();
    await expect(page.locator('#alert-msg')).toHaveText('Cek email-mu untuk konfirmasi ✅');
    expect(await page.evaluate(() => window.__trk)).toContain('alert_subscribe_click');
  });

  test('mobile: input dan tombol kirim minimal 44px (touch target)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openPage(page);
    const email = await page.locator('#alert-email').boundingBox();
    const submit = await page.locator('#alert-submit').boundingBox();
    expect(email.height).toBeGreaterThanOrEqual(44);
    expect(submit.height).toBeGreaterThanOrEqual(44);
  });
});
