// Light analytics beacon — tanpa cookie, tanpa identitas.
// Hemat kuota KV (free tier 1.000 write/hari): beacon hanya SEKALI per browser per hari.
// localStorage flag + session cache; kalau flag sudah ada, fetch tidak dikirim sama sekali.
(function () {
  try {
    const KEY = 'cvkita_beacon_' + new Date().toISOString().slice(0, 10);
    if (localStorage.getItem(KEY)) return; // sudah kirim hari ini → 0 write di server
    try { localStorage.setItem(KEY, '1'); } catch {}
    const API = 'https://cvkita-api.cvkita-rifakhoirul.workers.dev';
    const ev = location.pathname.includes('pay.html') ? 'pay_view' : 'visit';
    fetch(API + '/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: ev }),
      keepalive: true,
    }).catch(() => {});
  } catch {}
})();
