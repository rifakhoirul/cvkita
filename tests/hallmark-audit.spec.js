// Regresi hallmark-audit 18 Okt: larang emoji sebagai ikon fungsional di pay.html,
// larang transition:all, larang .hero-title em (italic header tell).
import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';

test('pay.html tanpa emoji sebagai ikon (pakai sprite SVG)', async ({ page }) => {
  const html = readFileSync(new URL('../pay.html', import.meta.url), 'utf8');
  expect(html).not.toMatch(/[⚡✅🎉🚀🔥✨💡🎯]/u);
  expect(html).toContain('#i-bolt');
  expect(html).toContain('#i-check');
});

test('css tanpa transition:all dan tanpa italic pada heading hero', async () => {
  const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
  expect(css).not.toMatch(/transition:\s*all/);
  expect(css).not.toMatch(/\.hero-title em/);
  // z-index pakai skala ter-kontrol: tidak ada 9999
  expect(css).not.toMatch(/z-index:\s*9999/);
});
