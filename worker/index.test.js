import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock worker untuk unit test — tanpa jaringan sungguhan
function makeEnv(overrides = {}) {
  return {
    LICENSE_CODES: 'BOOST-GOOD-0001:3,BOOST-USED-0001:1',
    GEMINI_API_KEY: 'fake-key',
    KV: {
      store: {},
      get(k) { return this.store[k] ?? null; },
      put(k, v) { this.store[k] = v; },
    },
    ...overrides,
  };
}

function makeRequest(path, body, origin = 'https://rifakhoirul.github.io') {
  return new Request(`https://api.test${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify(body),
  });
}

const worker = (await import('./index.js')).default;

describe('CORS', () => {
  it('menolak origin asing (fallback ke origin pertama)', async () => {
    const res = await worker.fetch(
      makeRequest('/api/license/verify', { code: 'BOOST-GOOD-0001' }, 'https://evil.example'),
      makeEnv()
    );
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://rifakhoirul.github.io');
  });
});

describe('POST /api/license/verify', () => {
  it('kode valid mengembalikan valid:true dan kuota', async () => {
    const res = await worker.fetch(makeRequest('/api/license/verify', { code: 'BOOST-GOOD-0001' }), makeEnv());
    const data = await res.json();
    expect(data.valid).toBe(true);
    expect(data.quota).toBe(3);
  });

  it('kode salah mengembalikan valid:false dengan pesan', async () => {
    const res = await worker.fetch(makeRequest('/api/license/verify', { code: 'PALSU' }), makeEnv());
    const data = await res.json();
    expect(data.valid).toBe(false);
    expect(data.error).toMatch(/tidak valid/i);
  });

  it('kode dengan kuota habis ditolak', async () => {
    const env = makeEnv();
    await env.KV.put('used:BOOST-USED-0001', '1'); // kuota 1, sudah terpakai
    const res = await worker.fetch(makeRequest('/api/license/verify', { code: 'BOOST-USED-0001' }), env);
    const data = await res.json();
    expect(data.valid).toBe(false);
  });
});

describe('POST /api/rewrite', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: '• Bullet hasil AI' }] } }],
    }), { status: 200 }));
  });

  it('lisensi valid: hasil AI dikembalikan dan kuota berkurang', async () => {
    const env = makeEnv();
    const res = await worker.fetch(
      makeRequest('/api/rewrite', { license: 'BOOST-GOOD-0001', posisi: 'Magang', deskripsi: 'input' }),
      env
    );
    const data = await res.json();
    expect(data.result).toContain('Bullet hasil AI');
    expect(data.remaining).toBe(2);
    expect(env.KV.store['used:BOOST-GOOD-0001']).toBe('1');
  });

  it('lisensi invalid ditolak 403 tanpa memanggil AI', async () => {
    const env = makeEnv();
    await worker.fetch(makeRequest('/api/rewrite', { license: 'NGACO' }), env);
    expect(global.fetch).not.toHaveBeenCalled();
    const res = await worker.fetch(makeRequest('/api/rewrite', { license: 'NGACO' }), env);
    expect(res.status).toBe(403);
  });

  it('kuota habis ditolak 429', async () => {
    const env = makeEnv();
    await env.KV.put('used:BOOST-USED-0001', '1');
    const res = await worker.fetch(makeRequest('/api/rewrite', { license: 'BOOST-USED-0001' }), env);
    expect(res.status).toBe(429);
  });

  it('kegagalan Gemini menghasilkan 502 dengan pesan ramah', async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response('err', { status: 500 }));
    const res = await worker.fetch(
      makeRequest('/api/rewrite', { license: 'BOOST-GOOD-0001' }), makeEnv());
    expect(res.status).toBe(502);
  });
});
