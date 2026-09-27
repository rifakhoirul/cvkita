import { test, expect } from '@playwright/test';

// Smoke test terhadap API production (bukan mock).
// Butuh jaringan; di-skip otomatis bila API tidak terjangkau.
const API = 'https://cvkita-api.cvkita-rifakhoirul.workers.dev';

test.describe('Smoke test API production', () => {
  test('endpoint verify merespons dan menolak kode palsu', async ({ request }) => {
    let res;
    try {
      res = await request.post(`${API}/api/license/verify`, {
        data: { code: 'KODE-PALSU-XYZ' },
        headers: { Origin: 'https://rifakhoirul.github.io' },
      });
    } catch (e) {
      test.skip(true, `API tidak terjangkau dari runner: ${e.message}`);
      return;
    }
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.valid).toBe(false);
  });

  test('CORS mengizinkan origin GitHub Pages', async ({ request }) => {
    let res;
    try {
      res = await request.post(`${API}/api/license/verify`, {
        data: { code: 'X' },
        headers: { Origin: 'https://rifakhoirul.github.io' },
      });
    } catch (e) {
      test.skip(true, `API tidak terjangkau: ${e.message}`);
      return;
    }
    expect(res.headers()['access-control-allow-origin']).toContain('rifakhoirul.github.io');
  });
});
