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

// Penggunaan terlacak via KV agar kuota tidak bisa di-reset dengan clear localStorage
async function usedCount(env, code) {
  if (!env.KV) return 0;
  return parseInt((await env.KV.get(`used:${code}`)) || '0', 10);
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
      const body = await request.json().catch(() => ({}));
      const lic = findLicense(env, (body.license || '').trim().toUpperCase());
      if (!lic) return json(env, request, { error: 'Lisensi tidak valid.' }, 403);

      const used = await usedCount(env, lic.code);
      if (used >= lic.quota) {
        return json(env, request, { error: 'Kuota AI-mu sudah habis. Beli kode baru untuk lanjut.' }, 429);
      }

      if (!env.GEMINI_API_KEY) {
        return json(env, request, { error: 'Server belum dikonfigurasi. Hubungi admin.' }, 500);
      }

      const prompt = `Posisi: ${body.posisi || '-'}\nOrganisasi: ${body.organisasi || '-'}\nDeskripsi mentah: ${body.deskripsi || '(belum ada)'}`;

      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${env.GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
        if (!text) return json(env, request, { error: 'AI tidak menghasilkan hasil. Coba lagi.' }, 502);

        await bumpUsed(env, lic.code);
        const remaining = Math.max(lic.quota - used - 1, 0);
        return json(env, request, { result: text, remaining });
      } catch {
        return json(env, request, { error: 'Gagal menghubungi layanan AI. Coba lagi.' }, 502);
      }
    }

    return json(env, request, { error: 'Not found' }, 404);
  },
};
