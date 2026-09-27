/**
 * CVKita API — Cloudflare Worker
 * Endpoint: POST /api/license/verify, POST /api/rewrite
 * Secrets: GEMINI_API_KEY (wrangler secret), LICENSE_CODES (KV atau env CSV "kode:kuota")
 * CORS: hanya untuk domain CVKita.
 */

const ALLOWED_ORIGINS = [
  'https://rifakhoirul.github.io',
  'https://cvkita.id',           // sesuaikan setelah domain aktif
  'http://localhost:8090',
];

function cors(env, req) {
  const origin = req.headers.get('Origin') || '';
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function json(env, req, body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors(env, req) },
  });
}

// License codes disimpan sebagai env var CSV: "BOOST-AAAA-BBBB:3,BOOST-CCCC-DDDD:3"
function findLicense(env, code) {
  if (!env.LICENSE_CODES || !code) return null;
  for (const entry of env.LICENSE_CODES.split(',')) {
    const [k, q] = entry.trim().split(':');
    if (k === code) return { code: k, quota: parseInt(q || '3', 10) };
  }
  return null;
}

// Model Gemini paling murah. Pakai header x-goog-api-key (bukan query string)
// supaya key tidak muncul di URL log.
const GEMINI_MODEL = 'gemini-3.5-flash-lite';

// Batas maksimal karakter per field input AI (cegah prompt raksasa / pembengkakan biaya)
const MAX_FIELD_LEN = 2000;

// Rate limit sederhana berbasis IP: maks 10 request per 60 detik per endpoint.
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_SEC = 60;

async function isRateLimited(env, req, bucket) {
  const ip = req.headers.get('CF-Connecting-IP') || 'unknown';
  const key = `rl:${bucket}:${ip}`;
  if (!env.KV) return false;
  const now = Date.now();
  const raw = await env.KV.get(key);
  const hits = raw ? JSON.parse(raw) : [];
  const fresh = hits.filter(t => now - t < RATE_LIMIT_WINDOW_SEC * 1000);
  if (fresh.length >= RATE_LIMIT_MAX) {
    await env.KV.put(key, JSON.stringify(fresh), { expirationTtl: RATE_LIMIT_WINDOW_SEC * 2 });
    return true;
  }
  fresh.push(now);
  await env.KV.put(key, JSON.stringify(fresh), { expirationTtl: RATE_LIMIT_WINDOW_SEC * 2 });
  return false;
}

function validateTextFields(fields) {
  for (const [name, val] of Object.entries(fields)) {
    if (val === undefined || val === null) continue;
    if (typeof val !== 'string') return `${name} harus berupa teks`;
    if (val.length > MAX_FIELD_LEN) return `${name} terlalu panjang (maks ${MAX_FIELD_LEN} karakter)`;
  }
  return null;
}

// Penggunaan terlacak via KV agar kuota tidak bisa di-reset dengan clear localStorage
async function usedCount(env, code) {
  if (!env.KV) return 0;
  return parseInt((await env.KV.get(`used:${code}`)) || '0', 10);
}

// Naikkan kuota dipakai (baca-modifikasi-tulis).
// CATATAN: ini BUKAN benar-benar atomik — KV Cloudflare akhirnya konsisten.
// Untuk jaminan atomik sejati butuh Durable Object. Risiko sisa: dua request
// paralel dalam jendela sangat sempit bisa berdua lolos. Dampak finansial kecil
// (maks 1-2 rewrite ekstra per kode), jadi diterima untuk tahap ini.
async function reserveSlot(env, code, quota) {
  if (!env.KV) return { ok: true, used: 1 };
  for (let attempt = 0; attempt < 5; attempt++) {
    const current = parseInt((await env.KV.get(`used:${code}`)) || '0', 10);
    if (current >= quota) return { ok: false, used: current };
    // Simulasi atomic compare-and-set memakai KV
    await env.KV.put(`used:${code}`, String(current + 1));
    return { ok: true, used: current + 1 };
  }
  return { ok: false, used: quota };
}
async function bumpUsed(env, code) {
  if (!env.KV) return;
  await env.KV.put(`used:${code}`, String(await usedCount(env, code) + 1));
}

const REWRITE_SYSTEM = `Kamu editor CV profesional untuk fresh graduate Indonesia.
Tulis ulang deskripsi pengalaman menjadi bullet point berbahasa Indonesia yang:
1. Dimulai dengan kata kerja aksi (Mengelola, Membangun, Menganalisis, Merancang, Mengoptimalkan)
2. Spesifik dan terukur bila memungkinkan (angka, persentase, hasil)
3. Ringkas: maksimal 3-4 bullet, satu baris per bullet
4. Jangan mengarang fakta yang tidak ada di input
Balas HANYA bullet point, satu per baris, tanpa nomor, tanpa penjelasan lain.`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors(env, request) });
    }

    if (url.pathname === '/api/license/verify' && request.method === 'POST') {
      if (await isRateLimited(env, request, 'verify')) {
        return json(env, request, { error: 'Terlalu banyak percobaan. Tunggu sebentar.' }, 429);
      }
      const { code } = await request.json().catch(() => ({}));
      const lic = findLicense(env, (code || '').trim().toUpperCase());
      if (!lic) return json(env, request, { valid: false, error: 'Kode tidak valid. Cek lagi atau hubungi kami.' });
      const used = await usedCount(env, lic.code);
      const remaining = Math.max(lic.quota - used, 0);
      if (remaining === 0) {
        return json(env, request, { valid: false, error: 'Kuota kode ini sudah habis.' });
      }
      return json(env, request, { valid: true, quota: remaining });
    }

    if (url.pathname === '/api/rewrite' && request.method === 'POST') {
      if (await isRateLimited(env, request, 'rewrite')) {
        return json(env, request, { error: 'Terlalu banyak permintaan. Tunggu sebentar.' }, 429);
      }
      const body = await request.json().catch(() => ({}));
      const invalid = validateTextFields({
        posisi: body.posisi, organisasi: body.organisasi, deskripsi: body.deskripsi,
      });
      if (invalid) return json(env, request, { error: invalid }, 400);

      const lic = findLicense(env, (body.license || '').trim().toUpperCase());
      if (!lic) return json(env, request, { error: 'Lisensi tidak valid.' }, 403);

      const reserved = await reserveSlot(env, lic.code, lic.quota);
      if (!reserved.ok) {
        return json(env, request, { error: 'Kuota AI-mu sudah habis. Beli kode baru untuk lanjut.' }, 429);
      }

      if (!env.GEMINI_API_KEY) {
        return json(env, request, { error: 'Server belum dikonfigurasi. Hubungi admin.' }, 500);
      }

      const prompt = `Posisi: ${body.posisi || '-'}\nOrganisasi: ${body.organisasi || '-'}\nDeskripsi mentah: ${body.deskripsi || '(belum ada)'}`;

      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: REWRITE_SYSTEM }] },
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.4, maxOutputTokens: 400 },
            }),
          }
        );
        if (!res.ok) return json(env, request, { error: 'Layanan AI sedang bermasalah. Coba lagi.' }, 502);
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (!text) {
          // Lepas reservasi karena AI gagal — user tidak boleh kehilangan kuota
          const cur = await usedCount(env, lic.code);
          await env.KV.put(`used:${lic.code}`, String(Math.max(cur - 1, 0)));
          return json(env, request, { error: 'AI tidak menghasilkan hasil. Coba lagi.' }, 502);
        }

        // Kuota sudah di-reserve di reserveSlot(). Jangan naikkan lagi.
        const remaining = Math.max(lic.quota - reserved.used, 0);
        return json(env, request, { result: text, remaining });
      } catch {
        return json(env, request, { error: 'Gagal menghubungi layanan AI. Coba lagi.' }, 502);
      }
    }

    return json(env, request, { error: 'Not found' }, 404);
  },
};
