import { describe, it, expect } from 'vitest';

function makeEnv(overrides = {}) {
  return {
    LICENSE_CODES: 'BOOST-GOOD-0001:3',
    GEMINI_API_KEY: 'fake-key',
    KV: {
      store: {},
      get(k) { return this.store[k] ?? null; },
      put(k, v) { this.store[k] = v; },
    },
    ...overrides,
  };
}

function makeRequest(path, body, opts = {}) {
  return new Request(`https://api.test${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'https://rifakhoirul.github.io',
      ...(opts.ip ? { 'CF-Connecting-IP': opts.ip } : {}),
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

const worker = (await import('./index.js')).default;
const LONG = 'x'.repeat(5000);

describe('Validasi input /api/rewrite', () => {
  it('menolak deskripsi lebih dari 2000 karakter dengan 400', async () => {
    const res = await worker.fetch(
      makeRequest('/api/rewrite', { license: 'BOOST-GOOD-0001', deskripsi: LONG }), makeEnv());
    expect(res.status).toBe(400);
  });

  it('menolak field non-string (injection tipe) dengan 400', async () => {
    const res = await worker.fetch(
      makeRequest('/api/rewrite', { license: 'BOOST-GOOD-0001', posisi: { a: 1 } }), makeEnv());
    expect(res.status).toBe(400);
  });

  it('menerima input wajar di bawah batas', async () => {
    global.fetch = async () => new Response(
      JSON.stringify({ candidates: [{ content: { parts: [{ text: '• ok' }] } }] }),
      { status: 200 }
    );
    const res = await worker.fetch(
      makeRequest('/api/rewrite', { license: 'BOOST-GOOD-0001', deskripsi: 'pendek' }), makeEnv());
    expect(res.status).toBe(200);
  });
});

describe('Rate limiting', () => {
  it('memblokir request ke-11 dalam 1 menit dari IP yang sama (429)', async () => {
    const env = makeEnv();
    const ip = '1.2.3.4';
    let last;
    for (let i = 0; i < 11; i++) {
      last = await worker.fetch(
        makeRequest('/api/license/verify', { code: 'BOOST-GOOD-0001' }, { ip }), env);
    }
    expect(last.status).toBe(429);
  });

  it('IP berbeda tidak saling memblokir', async () => {
    const env = makeEnv();
    let blockedA;
    for (let i = 0; i < 11; i++) {
      blockedA = await worker.fetch(
        makeRequest('/api/license/verify', { code: 'BOOST-GOOD-0001' }, { ip: '9.9.9.9' }), env);
    }
    expect(blockedA.status).toBe(429);
    const other = await worker.fetch(
      makeRequest('/api/license/verify', { code: 'BOOST-GOOD-0001' }, { ip: '8.8.8.8' }), env);
    expect(other.status).toBe(200);
  });
});

describe('Kode demo tidak boleh berlaku', () => {
  it('BOOST-DEMO-0001 ditolak (kode demo wajib dirotasi)', async () => {
    const res = await worker.fetch(
      makeRequest('/api/license/verify', { code: 'BOOST-DEMO-0001' }), makeEnv());
    const data = await res.json();
    expect(data.valid).toBe(false);
  });
});
