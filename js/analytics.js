// Light analytics beacon — tanpa cookie, tanpa identitas.
(function () {
  try {
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
