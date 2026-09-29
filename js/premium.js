/* CVKita Premium — paywall & AI rewrite.
   Semua panggilan API lewat /api/* (Cloudflare Worker), API key TIDAK ADA di sini. */
const LICENSE_KEY = 'cvkita_license_v1';
// Semua template premium harus terdaftar di sini, apa pun yang ada di tombol
// template panel (index.html). Kalau tidak, tombolnya bisa dipakai gratis.
const PREMIUM_TEMPLATES = ['executive', 'tech'];

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

// Bug 2026-09-28: paywall tidak bisa ditutup — user terjebak di modal.
function closePaywall() {
  $('#paywall').classList.add('hidden');
}

// QA 2026-09-29: badge "Premium" di header — indikator lisensi aktif.
function updatePremiumBadge() {
  const badge = document.getElementById('premium-badge');
  if (badge) badge.classList.toggle('hidden', !isPremium());
  // Header emas saat premium aktif
  document.body.classList.toggle('premium-active', isPremium());
}

(function wirePaywallClose() {
  document.addEventListener('DOMContentLoaded', () => {
    updatePremiumBadge();
    const pw = document.getElementById('paywall');
    if (!pw) return;
    const btn = document.getElementById('btn-close-paywall');
    if (btn) btn.addEventListener('click', closePaywall);
    // Klik area gelap di luar kartu juga menutup
    pw.addEventListener('click', (e) => { if (e.target === pw) closePaywall(); });
    // Escape keyboard
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !pw.classList.contains('hidden')) closePaywall();
    });
  });
})();
