import { test, expect } from '@playwright/test';

// Regresi desktop: kolom editor jadi sempit (391px) karena .tpl-row nowrap (scrollWidth ~700px)
// memaksa track preview melebar melebihi 1fr-nya. Fix: .preview-side { min-width: 0 }.
test('desktop 1440px: editor & preview seimbang (~50:50), editor tidak sempit', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const w = await page.evaluate(() => {
    const form = document.querySelector('.form-side').getBoundingClientRect().width;
    const prev = document.querySelector('.preview-side').getBoundingClientRect().width;
    return { form: Math.round(form), prev: Math.round(prev) };
  });
  // editor tidak boleh < 45% dari total kolom
  expect(w.form / (w.form + w.prev)).toBeGreaterThan(0.45);
});
