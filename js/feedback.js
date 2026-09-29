// Form feedback CVKita.
// Pakai Google Form (gratis, tanpa backend). Isi FORM_URL dengan link form-mu.
// Sebelum diisi, tombol fallback menyimpan masukan ke localStorage agar tidak hilang.
(function () {
  var FORM_URL = ''; // contoh: 'https://docs.google.com/forms/d/e/XXXX/viewform'

  function render() {
    var el = document.createElement('div');
    el.id = 'feedback-modal';
    el.innerHTML =
      '<div class="fb-backdrop">' +
      '<div class="fb-box" role="dialog" aria-modal="true" aria-labelledby="fb-title">' +
      '<h3 id="fb-title">Bantu CVKita jadi lebih baik</h3>' +
      '<p class="fb-sub">Ceritakan: apa yang bikin kamu bingung, atau fitur apa yang kamu harapkan?</p>' +
      '<textarea id="fb-text" rows="4" maxlength="500" placeholder="Tulis masukanmu di sini (maks 500 karakter)..."></textarea>' +
      '<div class="fb-count"><span id="fb-n">0</span>/500</div>' +
      '<div class="fb-actions">' +
      '<button type="button" id="fb-cancel" class="fb-btn fb-ghost">Batal</button>' +
      '<button type="button" id="fb-send" class="fb-btn fb-primary">Kirim</button>' +
      '</div>' +
      '<p id="fb-status" class="fb-status" role="status"></p>' +
      '</div></div>';
    document.body.appendChild(el);

    var ta = document.getElementById('fb-text');
    var cnt = document.getElementById('fb-n');
    ta.addEventListener('input', function () { cnt.textContent = ta.value.length; });
    document.getElementById('fb-cancel').onclick = close;
    document.getElementById('feedback-modal').onclick = function (e) {
      if (e.target === this) close(); // klik di luar kotak = tutup
    };
    document.getElementById('fb-send').onclick = send;
  }

  function close() {
    var el = document.getElementById('feedback-modal');
    if (el) el.remove();
  }

  function send() {
    var ta = document.getElementById('fb-text');
    var status = document.getElementById('fb-status');
    var text = (ta.value || '').trim();
    if (!text) { status.textContent = 'Tulis dulu masukannya ya.'; return; }

    // Fallback: simpan lokal agar masukan tidak hilang walau form belum diset
    try {
      var key = 'cvkita_feedback_v1';
      var all = JSON.parse(localStorage.getItem(key) || '[]');
      all.push({ text: text, at: new Date().toISOString() });
      localStorage.setItem(key, JSON.stringify(all));
    } catch (e) { /* localStorage penuh/blokir — abaikan */ }

    // Kirim ke server (disimpan KV + alert Telegram ke owner)
    var btn = document.getElementById('fb-send');
    btn.disabled = true;
    fetch('https://cvkita-api.cvkita-rifakhoirul.workers.dev/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text, page: location.pathname })
    })
    .then(function (r) { return r.json().then(function (b) { return { ok: r.ok, b: b }; }); })
    .then(function (res) {
      if (res.ok) {
        status.textContent = 'Terima kasih! Masukanmu sudah terkirim.';
        setTimeout(close, 1400);
      } else {
        btn.disabled = false;
        status.textContent = res.b.error || 'Gagal mengirim. Coba lagi.';
      }
    })
    .catch(function () {
      btn.disabled = false;
      status.textContent = 'Tidak bisa menghubungi server. Periksa koneksi internetmu.';
    });
  }

  window.__cvkitaFeedback = function () {
    if (!document.getElementById('feedback-modal')) render();
  };
})();
