/* CVKita Premium — paywall & AI rewrite.
   Semua panggilan API lewat /api/* (Cloudflare Worker), API key TIDAK ADA di sini. */
const LICENSE_KEY = 'cvkita_license_v1';
const PREMIUM_TEMPLATES = ['executive'];

const isPremium = () => !!localStorage.getItem(LICENSE_KEY);

const API_BASE = 'https://cvkita-api.cvkita-rifakhoirul.workers.dev';

async function verifyLicense(code) {
  const res = await fetch(`${API_BASE}/api/license/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: (code || '').trim() }),
  });
  if (!res.ok) throw new Error('network');
  return res.json();
}

async function aiRewrite(payload) {
  const res = await fetch(`${API_BASE}/api/rewrite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, license: localStorage.getItem(LICENSE_KEY) || '' }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Gagal menghubungi AI. Coba lagi.');
  }
  return res.json();
}

function showPaywall() {
  $('#paywall').classList.remove('hidden');
  $('#paywall').scrollIntoView({ behavior: 'smooth' });
}
