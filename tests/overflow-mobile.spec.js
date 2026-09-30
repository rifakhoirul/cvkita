import { test, expect } from '@playwright/test';

// Deteksi elemen terpotong (overflow horizontal) di viewport mobile — laporan "jadi kepotong".
test('tidak ada elemen terpotong di viewport mobile 375px', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await page.waitForTimeout(500);
  const issues = await page.evaluate(() => {
    const out = [];
    const vw = document.documentElement.clientWidth;
    document.querySelectorAll('body *').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && (r.right > vw + 1 || r.left < -1)) {
        const cs = getComputedStyle(el);
        if (cs.position === 'fixed' || cs.display === 'none') return;
        // container scroll horizontal memang boleh (tpl-row) — tapi ANAK di dalamnya tidak dihitung
        let p = el.parentElement, inScroller = false;
        while (p) {
          const pcs = getComputedStyle(p);
          if ((pcs.overflowX === 'auto' || pcs.overflowX === 'scroll') && p.scrollWidth > p.clientWidth) { inScroller = true; break; }
          p = p.parentElement;
        }
        if (inScroller) return;
        out.push({
          tag: el.tagName, id: el.id,
          cls: typeof el.className === 'string' ? el.className.slice(0, 50) : '',
          left: Math.round(r.left), right: Math.round(r.right), vw,
          txt: (el.textContent || '').trim().slice(0, 50),
        });
      }
    });
    return out;
  });
  console.log('OVERFLOW ISSUES:', JSON.stringify(issues, null, 1));
  expect(issues, 'elemen terpotong ditemukan').toEqual([]);
});
