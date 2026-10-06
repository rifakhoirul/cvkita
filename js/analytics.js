// Light analytics beacon — tanpa cookie, tanpa identitas.
// Hemat kuota KV (free tier 1.000 write/hari): beacon hanya SEKALI per browser per hari.
// localStorage flag + session cache; kalau flag sudah ada, fetch tidak dikirim sama sekali.
(function () {
  try {
    // 6 Okt: pemisahan QA vs user asli — buka cvkita.id/?qa=1 SEKALI di browser QA,
    // semua beacon dari browser itu selamanya membawa qa:true (counter terpisah di server).
    if (new URLSearchParams(location.search).get('qa') === '1') {
      try { localStorage.setItem('cvkita_qa', '1'); } catch {}
    }
    const isQa = localStorage.getItem('cvkita_qa') === '1';
    const KEY = 'cvkita_beacon_' + new Date().toISOString().slice(0, 10);
    if (localStorage.getItem(KEY)) return; // sudah kirim hari ini → 0 write di server
    try { localStorage.setItem(KEY, '1'); } catch {}
    const API = 'https://cvkita-api.cvkita-rifakhoirul.workers.dev';
    const ev = location.pathname.includes('pay.html') ? 'pay_view' : 'visit';
    fetch(API + '/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: ev, qa: isQa }),
      keepalive: true,
    }).catch(() => {});
  } catch {}
})();

// checkout_click: dilacak per-klik (bukan per-hari) — event jarang, aman untuk KV.
// Dipanggil dari pay.html saat user klik Beli.
window.__cvkitaTrackCheckout = function () {
  window.__cvkitaTrack('checkout_click');
};

// Tracker umum utk event jarang lainnya (import_pdf, download_pdf) — dipanggil dari app.js & import-cv.js.
window.__cvkitaTrack = function (event) {
  try {
    const isQa = localStorage.getItem('cvkita_qa') === '1';
    fetch('https://cvkita-api.cvkita-rifakhoirul.workers.dev/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: event, qa: isQa }),
      keepalive: true,
    }).catch(() => {});
  } catch {}
};
