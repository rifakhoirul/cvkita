// Halaman "Cari Lowongan" (lowongan.html): sumber Kalibrr lewat Worker GET /api/jobs.
// Semua test memakai page.route — TIDAK pernah memanggil Worker/Kalibrr asli.
import { test, expect } from '@playwright/test';

// Logo Kalibrr (di-host di rec-data.kalibrr.com). PNG 1x1 transparan dipakai sebagai isi gambar.
const LOGO_URL = 'https://rec-data.kalibrr.com/www.kalibrr.com/logos/ASTRO123-logo.png';
const PNG_1X1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

const JOBS = [
  { id: 101, title: 'Marketing Intern', company: 'PT Maju Jaya', location: 'South Jakarta', tenure: 'Full time', isIntern: true, freshGrad: true, url: 'https://www.kalibrr.com/c/maju-jaya/jobs/101/marketing-intern', description: 'Bantu tim marketing.' },
  { id: 102, title: 'Data Analyst', company: 'Astro Technologies', location: 'West Jakarta', tenure: 'Full time', isIntern: false, freshGrad: false, url: 'https://www.kalibrr.com/c/astro/jobs/102/data-analyst', description: '', logo: LOGO_URL },
  { id: 103, title: 'Video Editor', company: 'Studio Kreatif', location: 'Bandung', tenure: 'Freelance', isIntern: false, freshGrad: false, url: 'https://www.kalibrr.com/c/studio/jobs/103/video-editor', description: '' },
];

// Pasang mock; kembalikan daftar query yang diminta UI.
async function mockJobs(page, handler) {
  const queries = [];
  await page.route('**/api/jobs**', async route => {
    const q = new URL(route.request().url()).searchParams.get('q');
    queries.push(q);
    if (handler) return handler(route, q);
    return route.fulfill({ json: { jobs: JOBS, total: JOBS.length } });
  });
  return queries;
}

test.describe('Cari Lowongan', () => {
  test('default query "intern" otomatis dicari & hasil dikartikan', async ({ page }) => {
    const queries = await mockJobs(page);
    await page.goto('/lowongan.html');
    await expect(page.locator('h1')).toContainText(/lowongan/i);
    await expect(page.locator('#jobs-q')).toHaveValue('intern');
    const cards = page.locator('.job-card');
    await expect(cards).toHaveCount(3);
    expect(queries[0]).toBe('intern');
  });

  test('kartu: judul, perusahaan, lokasi, tenure; badge Open to Fresh Grad hanya jika true', async ({ page }) => {
    await mockJobs(page);
    await page.goto('/lowongan.html');
    const first = page.locator('.job-card').nth(0);
    await expect(first.locator('.job-title')).toHaveText('Marketing Intern');
    await expect(first.locator('.job-company')).toHaveText('PT Maju Jaya');
    await expect(first.locator('.job-loc')).toContainText('South Jakarta');
    await expect(first.locator('.job-tenure')).toHaveText('Magang');
    await expect(first.locator('.job-badge')).toHaveText(/Open to Fresh Grad/i);
    const second = page.locator('.job-card').nth(1);
    await expect(second.locator('.job-tenure')).toHaveText('Full-time');
    await expect(second.locator('.job-badge')).toHaveCount(0);
    await expect(page.locator('.job-card').nth(2).locator('.job-tenure')).toHaveText('Freelance');
  });

  test('tombol "Lihat & Lamar" buka URL kalibrr di tab baru (aman: noopener)', async ({ page }) => {
    await mockJobs(page);
    await page.goto('/lowongan.html');
    const a = page.locator('.job-card').first().locator('a.job-apply');
    await expect(a).toHaveText(/Lihat & Lamar/);
    await expect(a).toHaveAttribute('href', 'https://www.kalibrr.com/c/maju-jaya/jobs/101/marketing-intern');
    await expect(a).toHaveAttribute('target', '_blank');
    await expect(a).toHaveAttribute('rel', /noopener/);
    const box = await a.boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(44);
  });

  test('URL non-kalibrr dari API ditolak (tidak jadi link) — pertahanan XSS/open redirect', async ({ page }) => {
    await mockJobs(page, route => route.fulfill({ json: { jobs: [
      { ...JOBS[0], url: 'javascript:alert(1)' },
      { ...JOBS[1], url: 'https://evil.example.com/x' },
    ], total: 2 } }));
    await page.goto('/lowongan.html');
    await expect(page.locator('.job-card')).toHaveCount(0);
    await expect(page.locator('#jobs-status')).toContainText(/Belum ada lowongan yang cocok/);
  });

  test('judul berisi HTML ditampilkan sebagai teks, bukan dieksekusi', async ({ page }) => {
    await mockJobs(page, route => route.fulfill({ json: { jobs: [
      { ...JOBS[0], title: '<img src=x onerror="window.__pwned=1">Intern', company: '<b>PT</b>' },
    ], total: 1 } }));
    await page.goto('/lowongan.html');
    await expect(page.locator('.job-title')).toHaveText('<img src=x onerror="window.__pwned=1">Intern');
    expect(await page.evaluate(() => window.__pwned)).toBeUndefined();
    await expect(page.locator('.job-card img')).toHaveCount(0);
  });

  test('input + tombol cari (touch target ≥44px); submit memanggil API dengan kata kunci', async ({ page }) => {
    const queries = await mockJobs(page);
    await page.goto('/lowongan.html');
    await expect(page.locator('.job-card')).toHaveCount(3);
    for (const sel of ['#jobs-q', '#jobs-go']) {
      const box = await page.locator(sel).boundingBox();
      expect(box.height, sel).toBeGreaterThanOrEqual(44);
    }
    await page.fill('#jobs-q', 'data analyst');
    await page.click('#jobs-go');
    await expect.poll(() => queries.length).toBe(2);
    expect(queries[1]).toBe('data analyst');
    await page.fill('#jobs-q', 'desain grafis');
    await page.press('#jobs-q', 'Enter');
    await expect.poll(() => queries.length).toBe(3);
    expect(queries[2]).toBe('desain grafis');
  });

  test('input kosong → kembali ke default "intern"', async ({ page }) => {
    const queries = await mockJobs(page);
    await page.goto('/lowongan.html');
    await page.fill('#jobs-q', '   ');
    await page.click('#jobs-go');
    await expect.poll(() => queries.length).toBe(2);
    expect(queries[1]).toBe('intern');
  });

  test('input pencarian punya label di atas box (aksesibel)', async ({ page }) => {
    await mockJobs(page);
    await page.goto('/lowongan.html');
    await expect(page.getByLabel(/cari/i).first()).toBeVisible();
    const labelBox = await page.locator('label[for="jobs-q"]').boundingBox();
    const inputBox = await page.locator('#jobs-q').boundingBox();
    expect(labelBox.y + labelBox.height).toBeLessThanOrEqual(inputBox.y + 1);
  });

  test('quick-filter chips: Magang, Fresh Graduate, Data, Marketing, Design, IT', async ({ page }) => {
    const queries = await mockJobs(page);
    await page.goto('/lowongan.html');
    const chips = page.locator('#jobs-chips .chip');
    await expect(chips).toHaveText(['Magang', 'Fresh Graduate', 'Data', 'Marketing', 'Design', 'IT']);
    for (let i = 0; i < 6; i++) {
      const box = await chips.nth(i).boundingBox();
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
    await chips.nth(1).click();
    await expect.poll(() => queries.length).toBe(2);
    expect(queries[1]).toBe('fresh graduate');
    await expect(page.locator('#jobs-q')).toHaveValue('fresh graduate');
    await expect(chips.nth(1)).toHaveAttribute('aria-pressed', 'true');
    await chips.nth(0).click();
    await expect.poll(() => queries.length).toBe(3);
    expect(queries[2]).toBe('magang');
    await expect(chips.nth(1)).toHaveAttribute('aria-pressed', 'false');
  });

  test('chip bisa diklik di ikon/anak elemen (event delegation closest)', async ({ page }) => {
    const queries = await mockJobs(page);
    await page.goto('/lowongan.html');
    await expect(page.locator('.job-card')).toHaveCount(3);
    // Sisipkan ikon SVG anak di dalam chip lalu klik ikonnya: target klik BUKAN tombol itu sendiri
    await page.evaluate(() => {
      document.querySelectorAll('#jobs-chips .chip')[2].insertAdjacentHTML('afterbegin',
        '<svg id="chip-ic" class="ic" width="20" height="20" aria-hidden="true"><rect width="20" height="20"/></svg>');
    });
    await page.locator('#chip-ic').click();
    await expect.poll(() => queries.length).toBe(2);
    expect(queries[1]).toBe('data');
  });

  test('loading state tampil saat menunggu, hilang setelah selesai', async ({ page }) => {
    let release;
    const gate = new Promise(r => { release = r; });
    await mockJobs(page, async route => { await gate; await route.fulfill({ json: { jobs: JOBS, total: 3 } }); });
    await page.goto('/lowongan.html');
    await expect(page.locator('#jobs-status')).toContainText(/Mencari/i);
    await expect(page.locator('#jobs-status')).toHaveAttribute('role', 'status');
    release();
    await expect(page.locator('.job-card')).toHaveCount(3);
    await expect(page.locator('#jobs-status')).not.toContainText(/Mencari/i);
  });

  test('empty state: pesan santai kalau tidak ada hasil', async ({ page }) => {
    await mockJobs(page, route => route.fulfill({ json: { jobs: [], total: 0 } }));
    await page.goto('/lowongan.html');
    await expect(page.locator('#jobs-status')).toHaveText('Belum ada lowongan yang cocok, coba kata kunci lain ya');
    await expect(page.locator('.job-card')).toHaveCount(0);
  });

  test('error sumber (200 + error) → pesan santai, bukan empty state biasa', async ({ page }) => {
    await mockJobs(page, route => route.fulfill({ json: { jobs: [], total: 0, error: 'sumber_lowongan_gagal' } }));
    await page.goto('/lowongan.html');
    await expect(page.locator('#jobs-status')).toContainText(/lagi gangguan|coba lagi/i);
    await expect(page.locator('#jobs-status')).not.toContainText('Belum ada lowongan yang cocok');
  });

  test('rate limit 429 → pesan batas pencarian; jaringan putus → pesan santai', async ({ page }) => {
    let mode = 429;
    await mockJobs(page, route => mode === 429
      ? route.fulfill({ status: 429, json: { jobs: [], total: 0, error: 'Terlalu banyak pencarian. Coba lagi dalam satu jam.' } })
      : route.abort());
    await page.goto('/lowongan.html');
    await expect(page.locator('#jobs-status')).toContainText(/Terlalu banyak pencarian/);
    mode = 0;
    await page.click('#jobs-go');
    await expect(page.locator('#jobs-status')).toContainText(/koneksi|coba lagi/i);
    await expect(page.locator('.job-card')).toHaveCount(0);
  });

  test('respons lama yang telat tidak menimpa hasil pencarian terbaru', async ({ page }) => {
    await mockJobs(page, async (route, q) => {
      if (q === 'intern') { await new Promise(r => setTimeout(r, 700)); return route.fulfill({ json: { jobs: [JOBS[0]], total: 1 } }); }
      return route.fulfill({ json: { jobs: [JOBS[1], JOBS[2]], total: 2 } });
    });
    await page.goto('/lowongan.html');
    await page.fill('#jobs-q', 'data');
    await page.click('#jobs-go');
    await expect(page.locator('.job-card')).toHaveCount(2);
    await page.waitForTimeout(1000);
    await expect(page.locator('.job-card')).toHaveCount(2);
    await expect(page.locator('.job-card').first().locator('.job-title')).toHaveText('Data Analyst');
  });

  test('analytics: event jobs_search dikirim via /api/track tiap pencarian (tanpa mengubah struktur event)', async ({ page }) => {
    await mockJobs(page);
    const events = [];
    await page.route('**/api/track', async route => {
      events.push(JSON.parse(route.request().postData() || '{}'));
      await route.fulfill({ json: { ok: true } });
    });
    await page.goto('/lowongan.html');
    await expect(page.locator('.job-card')).toHaveCount(3);
    await page.fill('#jobs-q', 'marketing');
    await page.click('#jobs-go');
    await expect.poll(() => events.filter(e => e.event === 'jobs_search').length).toBe(2);
    const e = events.find(x => x.event === 'jobs_search');
    expect(Object.keys(e).sort()).toEqual(['event', 'qa']);
  });

  test('footer CTA: "CV kamu sudah siap?" → link ke index', async ({ page }) => {
    await mockJobs(page);
    await page.goto('/lowongan.html');
    const cta = page.locator('.jobs-cta');
    await expect(cta).toContainText('CV kamu sudah siap? Bikin CV dulu di CVKita');
    const link = cta.locator('a');
    await expect(link).toHaveAttribute('href', '/');
    const box = await link.boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(44);
    await link.click();
    await expect(page).toHaveURL(/localhost:8090\/(index\.html)?$/);
  });

  test('ikon pakai sprite SVG (<use href>), bukan emoji, di tombol fungsional', async ({ page }) => {
    await mockJobs(page);
    await page.goto('/lowongan.html');
    await expect(page.locator('.job-card')).toHaveCount(3);
    await expect(page.locator('#jobs-go svg use')).toHaveAttribute('href', /^#i-/);
    await expect(page.locator('.job-apply svg use').first()).toHaveAttribute('href', /^#i-/);
    const emoji = /\p{Extended_Pictographic}/u;
    for (const sel of ['#jobs-go', '.job-apply', '#jobs-chips .chip']) {
      for (const t of await page.locator(sel).allInnerTexts()) expect(t).not.toMatch(emoji);
    }
  });

  test('versi cache-busting: css & js dimuat dengan ?v=', async ({ page }) => {
    await mockJobs(page);
    await page.goto('/lowongan.html');
    const srcs = await page.evaluate(() => [
      ...[...document.querySelectorAll('link[rel=stylesheet]')].map(l => l.getAttribute('href')),
      ...[...document.querySelectorAll('script[src]')].map(s => s.getAttribute('src')),
    ].filter(u => /^(css|js)\//.test(u)));
    expect(srcs.length).toBeGreaterThanOrEqual(3);
    for (const u of srcs) expect(u).toMatch(/\?v=\d+$/);
  });

  test('kontras badge & tenure memenuhi WCAG AA (≥4.5:1)', async ({ page }) => {
    await mockJobs(page);
    await page.goto('/lowongan.html');
    await expect(page.locator('.job-card')).toHaveCount(3);
    const ratios = await page.evaluate(() => {
      const lum = ([r, g, b]) => {
        const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
      };
      const rgb = s => s.match(/[\d.]+/g).slice(0, 3).map(Number);
      const out = {};
      for (const sel of ['.job-badge', '.job-tenure', '.job-company', '.job-loc', '.chip', '.job-apply']) {
        const el = document.querySelector(sel);
        let bgEl = el, bg;
        while (bgEl) {
          const c = getComputedStyle(bgEl).backgroundColor;
          if (c && !/rgba\(.*,\s*0\)$/.test(c) && c !== 'transparent') { bg = c; break; }
          bgEl = bgEl.parentElement;
        }
        const l1 = lum(rgb(getComputedStyle(el).color)), l2 = lum(rgb(bg || 'rgb(255,255,255)'));
        out[sel] = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      }
      return out;
    });
    for (const [sel, r] of Object.entries(ratios)) expect(r, sel).toBeGreaterThanOrEqual(4.5);
  });

  test('mobile 375px: tidak ada scroll horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 700 });
    await mockJobs(page, route => route.fulfill({ json: { jobs: [
      { ...JOBS[0], title: 'Sales Trainee Academy by Ruangguru Brain Academy Pasir Pengaraian Kabupaten Rokan Hulu', company: 'PT Sangat Panjang Sekali Nama Perusahaannya Indonesia Tbk' },
      JOBS[1],
    ], total: 2 } }));
    await page.goto('/lowongan.html');
    await expect(page.locator('.job-card')).toHaveCount(2);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe('Logo perusahaan di kartu lowongan', () => {
  const okImage = page => page.route('https://rec-data.kalibrr.com/**', r => r.fulfill({ status: 200, contentType: 'image/png', body: PNG_1X1 }));

  test('job dengan logo: img.job-logo (src benar, lazy, 48x48, alt kosong) tanpa fallback', async ({ page }) => {
    await okImage(page);
    await mockJobs(page);
    await page.goto('/lowongan.html');
    const card = page.locator('.job-card').nth(1);
    const img = card.locator('img.job-logo');
    await expect(img).toHaveCount(1);
    await expect(img).toHaveAttribute('src', LOGO_URL);
    await expect(img).toHaveAttribute('loading', 'lazy');
    await expect(img).toHaveAttribute('alt', '');
    await expect(img).toHaveAttribute('width', '48');
    await expect(img).toHaveAttribute('height', '48');
    await expect(card.locator('.job-logo-fallback')).toHaveCount(0);
    const box = await img.boundingBox();
    expect(Math.round(box.width)).toBe(48);
    expect(Math.round(box.height)).toBe(48);
  });

  test('job tanpa logo (absen / null): fallback inisial huruf pertama, TIDAK ada img', async ({ page }) => {
    await okImage(page);
    await mockJobs(page, route => route.fulfill({ json: { jobs: [JOBS[0], { ...JOBS[2], logo: null }], total: 2 } }));
    await page.goto('/lowongan.html');
    const cards = page.locator('.job-card');
    await expect(cards).toHaveCount(2);
    await expect(cards.nth(0).locator('.job-logo-fallback')).toHaveText('M'); // PT Maju Jaya
    await expect(cards.nth(1).locator('.job-logo-fallback')).toHaveText('S'); // Studio Kreatif
    await expect(page.locator('.job-card img')).toHaveCount(0);
    await expect(cards.nth(0).locator('.job-logo-fallback')).toHaveAttribute('aria-hidden', 'true');
  });

  test('inisial: huruf kecil → kapital; awalan PT/CV dilewati; nama kosong/hanya "PT" tidak merusak kartu', async ({ page }) => {
    const names = ['kreasi nusantara', 'CV Karya Mandiri', 'pt. abadi', 'PT', ''];
    await mockJobs(page, route => route.fulfill({ json: { jobs: names.map((company, i) => ({ ...JOBS[0], id: 800 + i, company })), total: names.length } }));
    await page.goto('/lowongan.html');
    const fb = page.locator('.job-card .job-logo-fallback');
    await expect(fb).toHaveCount(names.length);
    await expect(fb).toHaveText(['K', 'K', 'A', 'P', '?']);
  });

  test('logo GAGAL dimuat (request gambar di-abort) → swap ke fallback inisial', async ({ page }) => {
    await page.route('https://rec-data.kalibrr.com/**', r => r.abort());
    await mockJobs(page);
    await page.goto('/lowongan.html');
    const card = page.locator('.job-card').nth(1);
    await expect(card.locator('.job-logo-fallback')).toHaveText('A'); // Astro Technologies
    await expect(card.locator('img')).toHaveCount(0);
    await expect(card.locator('.job-title')).toHaveText('Data Analyst');
  });

  test('logo dimuat 404 → fallback inisial juga', async ({ page }) => {
    await page.route('https://rec-data.kalibrr.com/**', r => r.fulfill({ status: 404, body: 'nope' }));
    await mockJobs(page);
    await page.goto('/lowongan.html');
    await expect(page.locator('.job-card').nth(1).locator('.job-logo-fallback')).toHaveText('A');
    await expect(page.locator('.job-card img')).toHaveCount(0);
  });

  test('keamanan: logo http / hostname bukan kalibrr / skema berbahaya → fallback, bukan img', async ({ page }) => {
    const requested = [];
    page.on('request', r => { if (/evil|kalibrr\.com\.|notkalibrr/.test(r.url())) requested.push(r.url()); });
    const bad = [
      'http://evil.com/x.png',
      'https://evil.com/x.png',
      'http://rec-data.kalibrr.com/x.png',
      'https://kalibrr.com.evil.com/x.png',
      'https://notkalibrr.com/x.png',
      'https://evil.com/?h=rec-data.kalibrr.com',
      'javascript:alert(1)',
      'data:image/png;base64,AAAA',
      '//rec-data.kalibrr.com/x.png',
      12345,
    ];
    await mockJobs(page, route => route.fulfill({ json: {
      jobs: bad.map((logo, i) => ({ ...JOBS[0], id: 900 + i, logo })), total: bad.length,
    } }));
    await page.goto('/lowongan.html');
    await expect(page.locator('.job-card')).toHaveCount(bad.length);
    await expect(page.locator('.job-card img')).toHaveCount(0);
    await expect(page.locator('.job-logo-fallback')).toHaveCount(bad.length);
    expect(requested).toEqual([]);
  });

  test('nama perusahaan berisi HTML: inisial dirender sebagai teks (tanpa innerHTML)', async ({ page }) => {
    await mockJobs(page, route => route.fulfill({ json: { jobs: [{ ...JOBS[0], company: '<img src=x onerror="window.__pwned=1">PT' }], total: 1 } }));
    await page.goto('/lowongan.html');
    await expect(page.locator('.job-logo-fallback')).toHaveText('<');
    expect(await page.evaluate(() => window.__pwned)).toBeUndefined();
    await expect(page.locator('.job-card img')).toHaveCount(0);
  });

  test('layout: logo di kiri, teks (judul+perusahaan) di kanan, sejajar atas — mobile & desktop', async ({ page }) => {
    await okImage(page);
    await mockJobs(page);
    for (const vp of [{ width: 375, height: 700 }, { width: 1280, height: 800 }]) {
      await page.setViewportSize(vp);
      await page.goto('/lowongan.html');
      await expect(page.locator('.job-card')).toHaveCount(3);
      const withLogo = page.locator('.job-card').nth(1);
      const noLogo = page.locator('.job-card').nth(0);
      for (const [card, logoSel] of [[withLogo, 'img.job-logo'], [noLogo, '.job-logo-fallback']]) {
        const l = await card.locator(logoSel).boundingBox();
        const t = await card.locator('.job-title').boundingBox();
        const c = await card.locator('.job-company').boundingBox();
        expect(l.x + l.width, `${vp.width} ${logoSel}`).toBeLessThanOrEqual(t.x + 1);
        expect(l.x + l.width).toBeLessThanOrEqual(c.x + 1);
        expect(Math.abs(l.y - t.y)).toBeLessThanOrEqual(12);
        expect(Math.round(l.width)).toBe(48);
        expect(Math.round(l.height)).toBe(48);
      }
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    }
  });

  test('styling: .job-logo (radius 10px, contain, putih, border) & fallback (bulat, bobot 800, kontras AA)', async ({ page }) => {
    await okImage(page);
    await mockJobs(page);
    await page.goto('/lowongan.html');
    await expect(page.locator('.job-card')).toHaveCount(3);
    const s = await page.evaluate(() => {
      const g = sel => getComputedStyle(document.querySelector(sel));
      const img = g('img.job-logo'), fb = g('.job-logo-fallback');
      return {
        img: { radius: img.borderRadius, fit: img.objectFit, bg: img.backgroundColor, border: img.borderTopWidth, w: img.width, h: img.height },
        fb: { radius: fb.borderRadius, weight: fb.fontWeight, color: fb.color, bg: fb.backgroundColor, w: fb.width, h: fb.height },
      };
    });
    expect(s.img.radius).toBe('10px');
    expect(s.img.fit).toBe('contain');
    expect(s.img.bg).toBe('rgb(255, 255, 255)');
    expect(s.img.border).toBe('1px');
    expect(s.img.w).toBe('48px');
    expect(s.img.h).toBe('48px');
    expect(s.fb.weight).toBe('800');
    expect(s.fb.w).toBe('48px');
    expect(s.fb.h).toBe('48px');
    expect(s.fb.bg).toBe('rgb(255, 241, 231)'); // --brand-soft
    expect(s.fb.color).toBe('rgb(194, 65, 12)'); // --brand-dark
    expect(['50%', '24px']).toContain(s.fb.radius);
    const lum = ([r, g, b]) => { const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const rgb = x => x.match(/[\d.]+/g).slice(0, 3).map(Number);
    const l1 = lum(rgb(s.fb.color)), l2 = lum(rgb(s.fb.bg));
    expect((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)).toBeGreaterThanOrEqual(4.5);
  });

  test('lowongan.html memuat versi cache baru (css v52, lowongan.js v4)', async ({ request }) => {
    const html = await (await request.get('/lowongan.html')).text();
    expect(html).toContain('css/style.css?v=52');
    expect(html).toContain('js/lowongan.js?v=4');
  });
});

// ── Tombol "Tampilkan lebih banyak" (load more) ──
function makeJobs(from, n) {
  return Array.from({ length: n }, (_, i) => {
    const id = from + i;
    return { id, title: `Lowongan ${id}`, company: `PT Contoh ${id}`, location: 'Jakarta', tenure: 'Full time', isIntern: false, freshGrad: false, url: `https://www.kalibrr.com/c/contoh/jobs/${id}/lowongan-${id}`, description: '' };
  });
}

// Mock berpaginasi: page 1 → 15 job hasMore:true; page 2 → 5 job hasMore:false.
// `opts.onPage2(route)` boleh menimpa respons page 2; `opts.queryJobs[q]` hasil khusus untuk query tertentu.
async function mockPaged(page, opts = {}) {
  const calls = [];
  await page.route('**/api/jobs**', async route => {
    const u = new URL(route.request().url());
    const q = u.searchParams.get('q');
    const p = Number(u.searchParams.get('page') || 1);
    calls.push({ q, page: p });
    if (opts.custom && opts.custom[q]) return route.fulfill({ json: opts.custom[q] });
    if (p === 1) return route.fulfill({ json: { jobs: makeJobs(1, 15), total: 15, count: 20, page: 1, hasMore: true } });
    if (opts.onPage2) return opts.onPage2(route, p);
    return route.fulfill({ json: { jobs: makeJobs(16, 5), total: 5, count: 20, page: 2, hasMore: false } });
  });
  return calls;
}

test.describe('Cari Lowongan — Tampilkan lebih banyak', () => {
  test('tombol #jobs-more tampil setelah pencarian awal (hasMore:true), teks persis, touch target ≥44px, gaya ghost', async ({ page }) => {
    await mockPaged(page);
    await page.goto('/lowongan.html');
    await expect(page.locator('.job-card')).toHaveCount(15);
    const more = page.locator('#jobs-more');
    await expect(more).toBeVisible();
    await expect(more).toHaveText('Tampilkan lebih banyak');
    await expect(more).toBeEnabled();
    await expect(more).toHaveClass(/\bghost\b/);
    const box = await more.boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(44);
    // tepat di bawah list (setelah kartu terakhir)
    const last = await page.locator('.job-card').last().boundingBox();
    expect(box.y).toBeGreaterThan(last.y + last.height - 1);
  });

  test('tanpa hasMore (atau field tidak ada) → tombol tidak ada', async ({ page }) => {
    await mockJobs(page); // respons lama { jobs, total } tanpa hasMore
    await page.goto('/lowongan.html');
    await expect(page.locator('.job-card')).toHaveCount(3);
    await expect(page.locator('#jobs-more')).toBeHidden();
  });

  test('klik → fetch page 2, job di-APPEND (20 total) tanpa duplikasi hasil awal', async ({ page }) => {
    const calls = await mockPaged(page);
    await page.goto('/lowongan.html');
    await expect(page.locator('.job-card')).toHaveCount(15);
    await page.click('#jobs-more');
    await expect(page.locator('.job-card')).toHaveCount(20);
    const titles = await page.locator('.job-title').allTextContents();
    expect(new Set(titles).size).toBe(20);
    expect(titles[0]).toBe('Lowongan 1');
    expect(titles[14]).toBe('Lowongan 15');
    expect(titles[15]).toBe('Lowongan 16');
    expect(titles[19]).toBe('Lowongan 20');
    expect(calls).toEqual([{ q: 'intern', page: 1 }, { q: 'intern', page: 2 }]);
  });

  test('tombol hilang setelah respons terakhir hasMore:false', async ({ page }) => {
    await mockPaged(page);
    await page.goto('/lowongan.html');
    await page.click('#jobs-more');
    await expect(page.locator('.job-card')).toHaveCount(20);
    await expect(page.locator('#jobs-more')).toBeHidden();
  });

  test('halaman berikutnya yang hasMore:true → tombol tetap ada & minta page 3', async ({ page }) => {
    const calls = await mockPaged(page, { onPage2: (route, p) => route.fulfill({ json: p === 2
      ? { jobs: makeJobs(16, 15), total: 15, count: 100, page: 2, hasMore: true }
      : { jobs: makeJobs(31, 15), total: 15, count: 100, page: 3, hasMore: true } }) });
    await page.goto('/lowongan.html');
    await page.click('#jobs-more');
    await expect(page.locator('.job-card')).toHaveCount(30);
    await expect(page.locator('#jobs-more')).toBeVisible();
    await page.click('#jobs-more');
    await expect(page.locator('.job-card')).toHaveCount(45);
    expect(calls.map(c => c.page)).toEqual([1, 2, 3]);
  });

  test('saat loading: tombol disabled "Memuat…", list lama tetap (tanpa skeleton)', async ({ page }) => {
    let release;
    const gate = new Promise(r => { release = r; });
    await mockPaged(page, { onPage2: async route => { await gate; await route.fulfill({ json: { jobs: makeJobs(16, 5), total: 5, count: 20, page: 2, hasMore: false } }); } });
    await page.goto('/lowongan.html');
    await expect(page.locator('.job-card')).toHaveCount(15);
    await page.click('#jobs-more');
    const more = page.locator('#jobs-more');
    await expect(more).toBeDisabled();
    await expect(more).toHaveText('Memuat…');
    await expect(page.locator('.job-skeleton')).toHaveCount(0);
    await expect(page.locator('.job-card')).toHaveCount(15);
    await expect(page.locator('#jobs-list')).not.toHaveAttribute('aria-busy', 'true');
    release();
    await expect(page.locator('.job-card')).toHaveCount(20);
    await expect(page.locator('#jobs-more')).toBeHidden();
  });

  test('klik ganda saat loading tidak mengirim request page 2 dua kali', async ({ page }) => {
    let release;
    const gate = new Promise(r => { release = r; });
    const calls = await mockPaged(page, { onPage2: async route => { await gate; await route.fulfill({ json: { jobs: makeJobs(16, 5), total: 5, count: 20, page: 2, hasMore: false } }); } });
    await page.goto('/lowongan.html');
    await page.click('#jobs-more');
    await page.evaluate(() => { const b = document.getElementById('jobs-more'); if (b) { b.click(); b.click(); } });
    release();
    await expect(page.locator('.job-card')).toHaveCount(20);
    expect(calls.filter(c => c.page === 2)).toHaveLength(1);
  });

  test('search baru (chip) reset: tombol hilang & list diganti hasil baru', async ({ page }) => {
    await mockPaged(page, { custom: { 'data analyst': { jobs: makeJobs(500, 3), total: 3, count: 3, page: 1, hasMore: false } } });
    await page.goto('/lowongan.html');
    await page.click('#jobs-more');
    await expect(page.locator('.job-card')).toHaveCount(20);
    await page.fill('#jobs-q', 'data analyst');
    await page.click('#jobs-go');
    await expect(page.locator('.job-card')).toHaveCount(3);
    await expect(page.locator('.job-title').first()).toHaveText('Lowongan 500');
    await expect(page.locator('#jobs-more')).toBeHidden();
  });

  test('search baru (submit) dari hasil yang masih hasMore → page berikutnya kembali ke 2 untuk query baru', async ({ page }) => {
    const calls = await mockPaged(page);
    await page.goto('/lowongan.html');
    await page.click('#jobs-more');
    await expect(page.locator('.job-card')).toHaveCount(20);
    await page.fill('#jobs-q', 'marketing');
    await page.click('#jobs-go');
    await expect(page.locator('.job-card')).toHaveCount(15);
    await expect(page.locator('#jobs-more')).toBeVisible();
    await page.click('#jobs-more');
    await expect(page.locator('.job-card')).toHaveCount(20);
    expect(calls.slice(-2)).toEqual([{ q: 'marketing', page: 1 }, { q: 'marketing', page: 2 }]);
  });

  test('search baru hapus tombol segera (saat skeleton), tidak menunggu respons', async ({ page }) => {
    let release;
    const gate = new Promise(r => { release = r; });
    await mockPaged(page, { custom: {} });
    await page.goto('/lowongan.html');
    await expect(page.locator('#jobs-more')).toBeVisible();
    await page.unroute('**/api/jobs**');
    await page.route('**/api/jobs**', async route => { await gate; await route.fulfill({ json: { jobs: makeJobs(700, 2), total: 2, count: 2, page: 1, hasMore: false } }); });
    await page.fill('#jobs-q', 'desain');
    await page.click('#jobs-go');
    await expect(page.locator('.job-skeleton').first()).toBeVisible();
    await expect(page.locator('#jobs-more')).toBeHidden();
    release();
    await expect(page.locator('.job-card')).toHaveCount(2);
  });

  test('race guard: load more yang telat dibatalkan oleh pencarian baru', async ({ page }) => {
    let release;
    const gate = new Promise(r => { release = r; });
    await mockPaged(page, {
      custom: { 'data analyst': { jobs: makeJobs(500, 3), total: 3, count: 3, page: 1, hasMore: false } },
      onPage2: async route => { await gate; await route.fulfill({ json: { jobs: makeJobs(16, 5), total: 5, count: 20, page: 2, hasMore: false } }); },
    });
    await page.goto('/lowongan.html');
    await page.click('#jobs-more'); // page 2 tertahan
    await page.fill('#jobs-q', 'data analyst');
    await page.click('#jobs-go');
    await expect(page.locator('.job-card')).toHaveCount(3);
    release();
    await page.waitForTimeout(500);
    await expect(page.locator('.job-card')).toHaveCount(3);
    const titles = await page.locator('.job-title').allTextContents();
    expect(titles).toEqual(['Lowongan 500', 'Lowongan 501', 'Lowongan 502']);
    await expect(page.locator('#jobs-more')).toBeHidden();
  });

  test('gagal fetch page 2 → pesan santai, list awal utuh, tombol kembali normal & bisa dicoba lagi', async ({ page }) => {
    let fail = true;
    const calls = await mockPaged(page, { onPage2: route => fail
      ? route.abort('failed')
      : route.fulfill({ json: { jobs: makeJobs(16, 5), total: 5, count: 20, page: 2, hasMore: false } }) });
    await page.goto('/lowongan.html');
    await expect(page.locator('.job-card')).toHaveCount(15);
    await page.click('#jobs-more');
    await expect(page.locator('#jobs-status')).toContainText(/Koneksi lagi bermasalah|coba lagi/i);
    await expect(page.locator('.job-card')).toHaveCount(15);
    const more = page.locator('#jobs-more');
    await expect(more).toBeVisible();
    await expect(more).toBeEnabled();
    await expect(more).toHaveText('Tampilkan lebih banyak');
    fail = false;
    await more.click();
    await expect(page.locator('.job-card')).toHaveCount(20);
    await expect(page.locator('#jobs-more')).toBeHidden();
    await expect(page.locator('#jobs-status')).toHaveText('');
    expect(calls.filter(c => c.page === 2)).toHaveLength(2);
  });

  test('page 2 balas error (data.error / HTTP 500) → pesan santai, tombol bisa dicoba lagi', async ({ page }) => {
    let mode = 'error';
    await mockPaged(page, { onPage2: route => mode === 'error'
      ? route.fulfill({ json: { jobs: [], total: 0, error: 'sumber_lowongan_gagal' } })
      : route.fulfill({ status: 500, body: 'oops' }) });
    await page.goto('/lowongan.html');
    await page.click('#jobs-more');
    await expect(page.locator('#jobs-status')).toContainText(/gangguan|coba lagi/i);
    await expect(page.locator('#jobs-more')).toBeEnabled();
    mode = 'http500';
    await page.click('#jobs-more');
    await expect(page.locator('#jobs-status')).toContainText(/Koneksi lagi bermasalah|coba lagi/i);
    await expect(page.locator('#jobs-more')).toBeEnabled();
    await expect(page.locator('.job-card')).toHaveCount(15);
  });

  test('analytics: load more juga mengirim jobs_search (struktur event tetap {event, qa})', async ({ page }) => {
    await mockPaged(page);
    const events = [];
    await page.route('**/api/track', async route => {
      events.push(JSON.parse(route.request().postData() || '{}'));
      await route.fulfill({ json: { ok: true } });
    });
    await page.goto('/lowongan.html');
    await expect(page.locator('.job-card')).toHaveCount(15);
    await expect.poll(() => events.filter(e => e.event === 'jobs_search').length).toBe(1);
    await page.click('#jobs-more');
    await expect(page.locator('.job-card')).toHaveCount(20);
    await expect.poll(() => events.filter(e => e.event === 'jobs_search').length).toBe(2);
    for (const e of events.filter(x => x.event === 'jobs_search')) expect(Object.keys(e).sort()).toEqual(['event', 'qa']);
  });

  test('keamanan: job tambahan dari page 2 tetap lewat textContent & filter URL kalibrr', async ({ page }) => {
    await mockPaged(page, { onPage2: route => route.fulfill({ json: { jobs: [
      { ...makeJobs(16, 1)[0], title: '<img src=x onerror="window.__pwned=1">Intern' },
      { ...makeJobs(17, 1)[0], url: 'https://evil.example.com/x' },
    ], total: 2, count: 20, page: 2, hasMore: false } }) });
    await page.goto('/lowongan.html');
    await page.click('#jobs-more');
    await expect(page.locator('.job-card')).toHaveCount(16); // URL jahat dibuang
    expect(await page.evaluate(() => window.__pwned)).toBeUndefined();
    await expect(page.locator('.job-card img[src="x"]')).toHaveCount(0);
  });

  test('mobile 375px: tombol load more muat di layar, tanpa overflow horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 700 });
    await mockPaged(page);
    await page.goto('/lowongan.html');
    const box = await page.locator('#jobs-more').boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(375);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe('Navigasi ke Cari Lowongan', () => {
  test('index.html: link di header (desktop) menuju lowongan.html dengan ikon sprite', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    const link = page.locator('.topbar a[href$="lowongan.html"]');
    await expect(link).toBeVisible();
    await expect(link).toContainText('Cari Lowongan');
    await expect(link.locator('svg use')).toHaveAttribute('href', /^#i-/);
    const box = await link.boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(44);
    await link.click();
    await expect(page).toHaveURL(/lowongan\.html$/);
  });

  test('index.html mobile: link ada di menu ⋯', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 700 });
    await page.goto('/');
    await page.click('#btn-more');
    const link = page.locator('#more-menu a[href$="lowongan.html"]');
    await expect(link).toBeVisible();
    await expect(link).toContainText('Cari Lowongan');
  });

  test('footer index menaut ke Cari Lowongan & sitemap mendaftarkannya', async ({ page, request }) => {
    await page.goto('/');
    await expect(page.locator('.footer-links a[href$="lowongan.html"]')).toHaveCount(1);
    const xml = await (await request.get('/sitemap.xml')).text();
    expect(xml).toContain('https://cvkita.id/lowongan.html');
  });

  test('urutan tombol preview tidak berubah (Cek ATS → Unduh PDF → Analisis Karier → Cover Letter)', async ({ page }) => {
    await page.goto('/');
    const ids = await page.evaluate(() => ['btn-ats-preview', 'btn-download-preview', 'btn-jobsearch', 'btn-cover']
      .map(id => document.getElementById(id)).filter(Boolean)
      .map(el => el.id));
    expect(ids.slice(0, 3)).toEqual(['btn-ats-preview', 'btn-download-preview', 'btn-jobsearch']);
  });
});
