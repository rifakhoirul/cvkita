/* CVKita Premium — paywall & AI rewrite.
   Semua panggilan API lewat /api/* (Cloudflare Worker), API key TIDAK ADA di sini. */
const LICENSE_KEY = 'cvkita_license_v1';
// Semua template premium harus terdaftar di sini, apa pun yang ada di tombol
// template panel (index.html). Kalau tidak, tombolnya bisa dipakai gratis.
const PREMIUM_TEMPLATES = ['executive', 'tech', 'creative', 'elegant'];

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
// 29 Sep: tampilkan juga sisa kuota AI di badge ( Premium · 3× ) — refresh tiap buka halaman.
function updatePremiumBadge(quotaInfo) {
  const badge = document.getElementById('premium-badge');
  if (badge) {
    badge.classList.toggle('hidden', !isPremium());
    if (isPremium()) {
      if (typeof quotaInfo === 'number') {
        badge.textContent = '';
        badge.append('Premium · ' + quotaInfo + '×');
      }
      // Ambil sisa kuota terbaru dari server (tanpa memotong kuota).
      // 30 Sep: cache 5 menit di localStorage — tiap reload halaman tidak boleh
      // memanggil /api/verify (makan kuota KV rate-limit di server).
      const kode = localStorage.getItem(LICENSE_KEY);
      const CACHE_KEY = 'cvkita_quota_cache';
      let cached = null;
      try { cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); } catch {}
      const fresh = cached && (Date.now() - cached.t < 5 * 60 * 1000);
      if (typeof quotaInfo !== 'number' && fresh && typeof cached.q === 'number') {
        badge.textContent = '';
        badge.append('Premium · ' + cached.q + '×');
      }
      if (kode && typeof verifyLicense === 'function' && !fresh) {
        verifyLicense(kode).then(r => {
          if (r && r.valid && typeof r.quota === 'number') {
            badge.textContent = '';
            badge.append('Premium · ' + r.quota + '×');
            try { localStorage.setItem(CACHE_KEY, JSON.stringify({ q: r.quota, t: Date.now() })); } catch {}
          } else if (r && r.valid === false) {
            badge.textContent = '';
            badge.append('Premium');
          }
        }).catch(() => {});
      }
    } else {
      badge.textContent = '';
    }
  }
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
