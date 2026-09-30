import { test } from '@playwright/test';
test('inspect widths', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const w = await page.evaluate(() => {
    const prev = document.querySelector('.preview-side');
    const paper = document.querySelector('#cv-paper');
    const tpl = document.querySelector('.tpl-row');
    return {
      prevMin: getComputedStyle(prev).minWidth,
      paperW: Math.round(paper.scrollWidth), paperCS: getComputedStyle(paper).width,
      tplW: Math.round(tpl?.scrollWidth || 0),
      tplMin: tpl ? getComputedStyle(tpl).minWidth : null,
      prevScroll: Math.round(prev.scrollWidth),
      bodyMin: Math.round(document.body.scrollWidth),
    };
  });
  console.log('WIDTHS ' + JSON.stringify(w));
});
