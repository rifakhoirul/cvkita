// QA backlog 2026-09-29: tombol share WhatsApp setelah CV jadi.
// Konteks Indonesia: share CVKita ke teman = kanal viral termurah.
// Share URL memakai nama user utk personalisasi, TANPA data CV (privasi).
import { test, expect } from '@playwright/test';

test('tombol Bagikan WhatsApp tampil setelah nama terisi & membuka wa.me dgn teks benar', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 780 });
  await page.goto('/');
  const btn = page.locator('#btn-share-wa');
  // awal: tersembunyi (belum ada nama)
  await expect(btn).toBeHidden();
  await page.fill('[name="nama"]', 'Rania Putri');
  await expect(btn).toBeVisible();
  // klik -> buka wa.me (cek URL, tidak benar2navigasi)
  const href = await btn.getAttribute('data-url');
  expect(href).toContain('wa.me');
  expect(href).toContain(encodeURIComponent('Rania Putri'));
  expect(href).toContain('cvkita.id');
});
