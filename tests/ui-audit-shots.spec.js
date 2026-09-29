// UI Audit: ambil screenshot semua halaman + state penting untuk audit menyeluruh
import { test, expect } from '@playwright/test';
import path from 'path';

const OUT = '/tmp/ui-audit';
const S = (p) => path.join(OUT, p);

test('kumpulkan screenshot audit', async ({ browser }) => {
  test.setTimeout(120000);

  // Desktop
  const dctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
  const d = await dctx.newPage();
  await d.goto('/');
  await d.waitForLoadState('networkidle');
  await d.screenshot({ path: S('01-home-hero-desktop.png') });

  // Isi contoh
  await d.click('#btn-sample-top');
  await d.waitForTimeout(1200);
  const c = d.locator('#btn-ats-close');
  if (await c.isVisible().catch(() => false)) await c.click();
  await d.screenshot({ path: S('02-form-terisi-desktop.png') });

  // Preview area
  await d.locator('#cv-paper').scrollIntoViewIfNeeded();
  await d.screenshot({ path: S('03-preview-desktop.png') });

  // Paywall
  await d.locator('#btn-jobsearch').click();
  await d.waitForTimeout(400);
  await d.screenshot({ path: S('04-paywall-desktop.png') });
  await d.keyboard.press('Escape');

  // Panel ATS
  await d.locator('#btn-ats-preview').click();
  await d.waitForTimeout(400);
  await d.locator('#ats-panel').scrollIntoViewIfNeeded();
  await d.screenshot({ path: S('05-ats-panel.png') });
  await dctx.close();

  // Mobile — alur utama
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const m = await mctx.newPage();
  await m.goto('/');
  await m.waitForLoadState('networkidle');
  await m.screenshot({ path: S('10-home-mobile.png') });
  await m.click('#btn-sample-top');
  await m.waitForTimeout(1200);
  const c2 = m.locator('#btn-ats-close');
  if (await c2.isVisible().catch(() => false)) await c2.click();
  // area tombol aksi
  await m.locator('#btn-ats-preview').scrollIntoViewIfNeeded();
  await m.waitForTimeout(300);
  await m.screenshot({ path: S('11-tombol-aksi-mobile.png') });

  // Pay page
  await m.goto('/pay.html');
  await m.waitForLoadState('networkidle');
  await m.screenshot({ path: S('12-pay-mobile.png'), fullPage: true });
  await mctx.close();

  // Blog mobile
  const bctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const b = await bctx.newPage();
  await b.goto('/blog/');
  await b.waitForLoadState('networkidle');
  await b.screenshot({ path: S('13-blog-mobile.png') });
  await bctx.close();

  expect(true).toBe(true);
});
