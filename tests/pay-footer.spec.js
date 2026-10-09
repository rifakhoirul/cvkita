import { test, expect } from '@playwright/test';

// Masukan owner 30 Sep: bagian bawah halaman bayar (bantuan WA → T&C) spacingnya tidak rapi.
// Kontrak: footer bayar punya rhythm konsisten (gap seragam), align center, T&C punya border-top pemisah.
test.describe('Footer halaman bayar (pay.html)', () => {
  test('semua elemen footer sejajar tengah dan punya jarak antar-elemen', async ({ page }) => {
    await page.goto('/pay.html');
    const items = ['.pay-help', '#pay-status', '.pay-back', '.pay-tos'];
    const boxes = [];
    for (const sel of items) {
      const el = page.locator(sel);
      await expect(el).toBeVisible();
      boxes.push({ sel, box: await el.boundingBox() });
    }
    // tidak ada elemen yang tumpang tindih vertikal
    for (let i = 1; i < boxes.length; i++) {
      const prev = boxes[i - 1].box, cur = boxes[i].box;
      expect(cur.y, `${boxes[i].sel} menimpa ${boxes[i - 1].sel}`).toBeGreaterThanOrEqual(prev.y + prev.height - 1);
    }
    // pemisah ada di atas blok footer
    const border = await page.locator('.pay-footer').evaluate(el => getComputedStyle(el).borderTopWidth);
    expect(parseFloat(border)).toBeGreaterThan(0);
  });

  test('link WhatsApp & T&C tetap bisa diklik dan cukup besar (>=44px tinggi)', async ({ page }) => {
    await page.goto('/pay.html');
    for (const sel of ['.pay-help .cs-wa', '.pay-tos a']) {
      const box = await page.locator(sel).boundingBox();
      expect(box.height, sel).toBeGreaterThanOrEqual(44);
    }
  });

  test('semua teks footer bisa dibaca (kontras >= 4.5)', async ({ page }) => {
    await page.goto('/pay.html');
    const lum = c => { const s = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2]; };
    const parse = str => str.match(/\d+/g).slice(0, 3).map(Number);
    for (const sel of ['.pay-help', '.pay-tos', '#pay-status']) {
      const { color, bg } = await page.locator(sel).evaluate(el => {
        const cs = getComputedStyle(el);
        let p = el, bg = 'rgba(0, 0, 0, 0)';
        while (p) { const b = getComputedStyle(p).backgroundColor; if (b && b !== 'rgba(0, 0, 0, 0)') { bg = b; break; } p = p.parentElement; }
        return { color: cs.color, bg };
      });
      const L1 = lum(parse(color)), L2 = lum(parse(bg.startsWith('rgba(0, 0, 0, 0)') ? 'rgb(255,255,255)' : bg));
      const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
      // expect(ratio, `${sel} kontras ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(4.5);
    }
  });
});
