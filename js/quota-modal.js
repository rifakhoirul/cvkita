// QA 2026-09-29: alert() "Kuota AI-mu sudah habis" terlalu polos dan Dead-End.
// Fix: modal khusus dengan 2 aksi — beli paket baru ATAU masukkan kode lain.
// Dipakai semua fitur AI (rewrite, ringkasan, job-search) saat error kuota.
(function () {
  document.addEventListener('DOMContentLoaded', () => {
    // Buat modal sekali, sembunyikan
    if (document.getElementById('quota-modal')) return;
    const modal = document.createElement('div');
    modal.id = 'quota-modal';
    modal.className = 'paywall hidden';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Kuota AI habis');
    modal.innerHTML = `
      <div class="paywall-card">
        <button id="btn-close-quota" class="paywall-close" type="button" aria-label="Tutup"><svg class="ic" aria-hidden="true"><use href="#i-close"></use></svg></button>
        <h3><svg class="ic" aria-hidden="true"><use href="#i-sparkle"></use></svg> Kuota AI-mu sudah habis</h3>
        <p>Kode yang kamu pakai sudah mencapai batas pemakaian. Pilih salah satu:</p>
        <div class="quota-actions">
          <a id="btn-quota-beli" class="btn primary" href="/pay.html" style="display:inline-flex;align-items:center;text-decoration:none">Beli kuota baru (mulai Rp 9.900)</a>
        </div>
        <p class="paywall-cta">Punya kode lain? Masukkan di sini:</p>
        <div class="aktivasi-row">
          <input id="quota-kode" placeholder="CVK-XXXX-XXXX" autocomplete="off">
          <button id="btn-quota-aktivasi" class="btn primary" type="button">Aktivasi</button>
        </div>
        <p id="quota-error" class="aktivasi-error hidden">Kode tidak valid. Cek lagi atau hubungi kami.</p>
      </div>`;
    document.body.appendChild(modal);

    function close() { modal.classList.add('hidden'); }
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    document.getElementById('btn-close-quota').addEventListener('click', close);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.classList.contains('hidden')) close();
    });

    document.getElementById('btn-quota-aktivasi').addEventListener('click', () => {
      const code = document.getElementById('quota-kode').value;
      const err = document.getElementById('quota-error');
      err.classList.add('hidden');
      if (typeof verifyLicense !== 'function') return;
      verifyLicense(code)
        .then(r => {
          if (r.valid) {
            localStorage.setItem(LICENSE_KEY, code.trim());
            document.querySelectorAll('.tpl-btn.locked').forEach(b => b.classList.remove('locked'));
            close();
            if (typeof updatePremiumBadge === 'function') updatePremiumBadge();
            location.reload();
          } else {
            err.textContent = r.error || 'Kode tidak valid. Cek lagi atau hubungi kami.';
            err.classList.remove('hidden');
          }
        })
        .catch(() => {
          err.textContent = 'Gagal memverifikasi. Cek koneksi internetmu.';
          err.classList.remove('hidden');
        });
    });
  });

  // Modal pilihan bahasa untuk Improve seluruh CV (30 Sep): Indonesia / Inggris.
  if (!document.getElementById('improve-lang-modal')) {
    const il = document.createElement('div');
    il.id = 'improve-lang-modal';
    il.className = 'paywall hidden';
    il.setAttribute('role', 'dialog');
    il.setAttribute('aria-modal', 'true');
    il.setAttribute('aria-label', 'Pilih bahasa CV');
    il.innerHTML = `
      <div class="paywall-card">
        <button id="btn-close-improve-lang" class="paywall-close" type="button" aria-label="Tutup"><svg class="ic" aria-hidden="true"><use href="#i-close"></use></svg></button>
        <h3><svg class="ic" aria-hidden="true"><use href="#i-sparkle"></use></svg> Improve seluruh CV — bahasa apa?</h3>
        <p class="ai-choice-sub">Hasil menimpa seluruh isi CV. Kamu bisa lihat perbandingan sebelum menerima. Sisa kuotamu: <b id="improve-lang-quota">…</b></p>
        <div class="quota-actions ai-choice-actions">
          <button id="btn-improve-lang-id" class="btn primary" type="button"><svg class="ic" aria-hidden="true"><use href="#i-sparkle"></use></svg> Bahasa Indonesia</button>
          <button id="btn-improve-lang-en" class="btn primary" type="button"><svg class="ic" aria-hidden="true"><use href="#i-sparkle"></use></svg> Bahasa Inggris</button>
        </div>
      </div>`;
    document.body.appendChild(il);
    const closeIl = () => il.classList.add('hidden');
    il.addEventListener('click', (e) => { if (e.target === il) closeIl(); });
    document.getElementById('btn-close-improve-lang').addEventListener('click', closeIl);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !il.classList.contains('hidden')) closeIl();
    });
  }

  // Buka modal pilihan bahasa. onSelect('id'|'en') dipanggil saat user memilih.
  window.__cvkitaImproveAllChoice = function (remaining, onSelect) {
    const m = document.getElementById('improve-lang-modal');
    if (!m) { onSelect('id'); return; }
    const q = document.getElementById('improve-lang-quota');
    if (q && typeof remaining === 'number') q.textContent = remaining + '×';
    document.getElementById('btn-improve-lang-id').onclick = () => { m.classList.add('hidden'); onSelect('id'); };
    document.getElementById('btn-improve-lang-en').onclick = () => { m.classList.add('hidden'); onSelect('en'); };
    m.classList.remove('hidden');
    m.scrollIntoView({ behavior: 'smooth' });
  };

  // API global: panggil ini sebagai pengganti alert untuk error kuota
  window.__cvkitaQuotaExhausted = function () {
    const m = document.getElementById('quota-modal');
    if (!m) { alert('Kuota AI-mu sudah habis. Beli kode baru untuk lanjut.'); return; }
    m.classList.remove('hidden');
    m.scrollIntoView({ behavior: 'smooth' });
  };

  // Toast ringan untuk pesan sukses/info (TIDAK menghalangi klik, beda dengan modal kuota habis)
  window.__cvkitaQuotaModal = function (message) {
    let t = document.getElementById('cvkita-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'cvkita-toast';
      t.setAttribute('role', 'status');
      document.body.appendChild(t);
    }
    t.textContent = message;
    t.classList.add('show');
    clearTimeout(t.__timer);
    t.__timer = setTimeout(() => t.classList.remove('show'), 4000);
  };

  // Modal pilihan AI: Improve / Translate (30 Sep). Tombol Improve & Translate
  // digabung jadi satu tombol per lokasi; pre-check kuota dilakukan pemanggil
  // sebelum modal ini dibuka, jadi isi modal selalu bisa dieksekusi.
  if (!document.getElementById('ai-choice-modal')) {
    const ai = document.createElement('div');
    ai.id = 'ai-choice-modal';
    ai.className = 'paywall hidden';
    ai.setAttribute('role', 'dialog');
    ai.setAttribute('aria-modal', 'true');
    ai.setAttribute('aria-label', 'Pilih aksi AI');
    ai.innerHTML = `
      <div class="paywall-card">
        <button id="btn-close-ai-choice" class="paywall-close" type="button" aria-label="Tutup"><svg class="ic" aria-hidden="true"><use href="#i-close"></use></svg></button>
        <h3><svg class="ic" aria-hidden="true"><use href="#i-sparkle"></use></svg> Mau apa nih?</h3>
        <p class="ai-choice-sub">Satu aksi = 1 kuota AI. Sisa kuotamu: <b id="ai-choice-quota">…</b></p>
        <div class="quota-actions ai-choice-actions">
          <button id="btn-ai-improve" class="btn primary" type="button"><svg class="ic" aria-hidden="true"><use href="#i-sparkle"></use></svg> Improve (bahasa Indonesia)</button>
          <button id="btn-ai-translate" class="btn primary" type="button"><svg class="ic" aria-hidden="true"><use href="#i-sparkle"></use></svg> Translate ke bahasa Inggris</button>
          <button id="btn-ai-translate-improve" class="btn primary" type="button"><svg class="ic" aria-hidden="true"><use href="#i-sparkle"></use></svg> Translate ke bahasa Inggris + improve</button>
        </div>
      </div>`;
    document.body.appendChild(ai);

    const closeAi = () => ai.classList.add('hidden');
    ai.addEventListener('click', (e) => { if (e.target === ai) closeAi(); });
    document.getElementById('btn-close-ai-choice').addEventListener('click', closeAi);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !ai.classList.contains('hidden')) closeAi();
    });
  }

  // Buka modal pilihan. onSelect('improve'|'translate') dipanggil sekali saat user memilih.
  window.__cvkitaAiChoice = function (remaining, onSelect) {
    const m = document.getElementById('ai-choice-modal');
    if (!m) return;
    const q = document.getElementById('ai-choice-quota');
    if (q && typeof remaining === 'number') q.textContent = remaining + '×';
    const onImprove = document.getElementById('btn-ai-improve');
    const onTranslate = document.getElementById('btn-ai-translate');
    const onTranslateImprove = document.getElementById('btn-ai-translate-improve');
    // Modal dipakai ulang untuk lokasi berbeda: ganti handler tiap kali dibuka.
    onImprove.onclick = () => { m.classList.add('hidden'); onSelect('improve'); };
    onTranslate.onclick = () => { m.classList.add('hidden'); onSelect('translate'); };
    onTranslateImprove.onclick = () => { m.classList.add('hidden'); onSelect('translate-improve'); };
    m.classList.remove('hidden');
    m.scrollIntoView({ behavior: 'smooth' });
  };
})();
