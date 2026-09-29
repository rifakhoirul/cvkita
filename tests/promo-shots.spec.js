// Ambil screenshot promo untuk X: CV terisi contoh (desktop & mobile) + halaman utama
import { test, expect } from '@playwright/test';
import path from 'path';

const OUT = process.env.HOME + '/cvkita-promo-x';
const SHOT = (p) => path.join(OUT, p);

test('siapkan screenshot promo', async ({ page }) => {
  test.setTimeout(90000);

  // 1) Editor terisi contoh, desktop — tampil CV di kanan
  const ctx1 = await page.context().browser().newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
  const p1 = await ctx1.newPage();
  await p1.goto('http://localhost:3000/');
  await p1.waitForLoadState('networkidle');
  await p1.click('#btn-sample-top');
  await p1.waitForTimeout(1500);
  // tutup panel ATS biar bersih
  const close = p1.locator('#btn-ats-close');
  if (await close.isVisible().catch(() => false)) await close.click();
  await p1.screenshot({ path: SHOT('1-editor-desktop.png') });
  // preview CV saja
  const paper = p1.locator('#cv-paper');
  await paper.screenshot({ path: SHOT('2-cv-paper.png') });
  await ctx1.close();

  // 2) Mobile — hero + kartu impor (kesan pertama)
  const ctx2 = await page.context().browser().newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
  const p2 = await ctx2.newPage();
  await p2.goto('http://localhost:3000/');
  await p2.waitForLoadState('networkidle');
  await p2.screenshot({ path: SHOT('3-hero-mobile.png') });
  // mobile CV terisi
  await p2.click('#btn-sample-top');
  await p2.waitForTimeout(1500);
  const c2 = p2.locator('#btn-ats-close');
  if (await c2.isVisible().catch(() => false)) await c2.click();
  const pv = p2.locator('#cv-preview');
  if (await pv.isVisible().catch(() => false)) {
    await pv.scrollIntoViewIfNeeded();
    await pv.screenshot({ path: SHOT('4-cv-mobile.png') });
  }
  await ctx2.close();
  expect(true).toBe(true);
});
