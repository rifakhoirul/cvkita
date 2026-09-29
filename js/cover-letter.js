// Fitur premium "Cover Letter (AI)" — Opsi A 2026-09-29.
// 1 klik = 1 kuota. Input: data CV + perusahaan/posisi tujuan (opsional).
// Output: teks cover letter di modal, tombol Salin.
(function () {
  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('btn-cover-letter');
    if (!btn) return;

    function val(n) { return (document.querySelector(`#cv-form [name="${n}"]`)?.value || '').trim(); }

    // Modal kecil: tanya perusahaan & posisi tujuan (keduanya boleh dikosongkan)
    function tanyaTujuan() {
      return new Promise(resolve => {
        const m = document.createElement('div');
        m.className = 'cl-modal cl-ask';
        m.innerHTML = `
          <div class="cl-card" role="dialog" aria-modal="true" aria-label="Tujuan lamaran">
            <button class="cl-close" type="button" aria-label="Tutup">✕</button>
            <h3>✉️ Mau melamar ke mana?</h3>
            <p class="cl-ask-note">Opsional — kalau diisi, cover letter lebih spesifik & personal.</p>
            <label class="cl-field">Perusahaan
              <input id="cl-perusahaan" placeholder="mis: PT Maju Jaya" autocomplete="off">
            </label>
            <label class="cl-field">Posisi
              <input id="cl-posisi" placeholder="mis: Data Analyst" autocomplete="off">
            </label>
            <div class="cl-actions">
              <button class="btn primary cl-go" type="button">Buat Cover Letter</button>
              <button class="btn ghost cl-cancel" type="button">Batal</button>
            </div>
          </div>`;
        document.body.appendChild(m);
        const close = (val) => { m.remove(); resolve(val); };
        m.querySelector('.cl-close').addEventListener('click', () => close(null));
        m.querySelector('.cl-cancel').addEventListener('click', () => close(null));
        m.addEventListener('click', e => { if (e.target === m) close(null); });
        m.querySelector('.cl-go').addEventListener('click', () => close({
          perusahaan: m.querySelector('#cl-perusahaan').value.trim(),
          posisi: m.querySelector('#cl-posisi').value.trim(),
        }));
        m.querySelector('#cl-perusahaan').focus();
      });
    }

    btn.addEventListener('click', async () => {
      // Cek kode lisensi PALING AWAL: harus ada & valid di server
      // sebelum menanyakan perusahaan/posisi (verifikasi tidak memotong kuota).
      const kode = (localStorage.getItem(LICENSE_KEY) || '').trim();
      if (!kode) { showPaywall(); return; }
      if (typeof verifyLicense === 'function') {
        const label0 = btn.innerHTML;
        btn.innerHTML = '⏳ Memeriksa kode...';
        btn.disabled = true;
        try {
          const v = await verifyLicense(kode);
          if (!v || !v.valid) {
            btn.innerHTML = label0; btn.disabled = false;
            localStorage.removeItem(LICENSE_KEY);
            if (typeof updatePremiumBadge === 'function') updatePremiumBadge();
            showPaywall();
            return;
          }
        } catch {
          // jaringan gagal — jangan blokir, biarkan endpoint utk yang memvalidasi final
        }
        btn.innerHTML = label0; btn.disabled = false;
      }
      const nama = val('nama');
      if (!nama) {
        if (typeof window.__cvkitaQuotaModal === 'function') window.__cvkitaQuotaModal('Isi dulu nama lengkap di CV-mu, lalu coba lagi.');
        else alert('Isi dulu nama lengkap di CV-mu, lalu coba lagi.');
        return;
      }

      // Modal tujuan lamaran (pengganti prompt bawaan browser — tampilan konsisten)
      const tujuan = await tanyaTujuan();
      if (!tujuan) return; // batal
      const { perusahaan, posisi } = tujuan;

      const label = btn.innerHTML;
      btn.innerHTML = '⏳ Menulis cover letter...';
      btn.disabled = true;
      try {
        const res = await fetch(`${API_BASE}/api/cover-letter`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            license: localStorage.getItem(LICENSE_KEY) || '',
            nama,
            headline: val('headline'),
            skills: val('keahlian'),
            ringkasan: val('ringkasan'),
            pengalaman: [...document.querySelectorAll('#pengalaman-list .entry')].map(e => {
              const g = n => (e.querySelector(`[name$="${n}"]`)?.value || '').trim();
              return [g('posisi'), g('organisasi'), g('deskripsi')].filter(Boolean).join(' — ');
            }).filter(Boolean).join('; '),
            perusahaan, posisi,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Gagal menghubungi AI. Coba lagi.');

        // Modal hasil — pakai pola modal kuota yang sudah ada kalau tersedia
        const modal = document.createElement('div');
        modal.className = 'cl-modal';
        modal.innerHTML = `
          <div class="cl-card" role="dialog" aria-modal="true" aria-label="Cover Letter">
            <button class="cl-close" type="button" aria-label="Tutup">✕</button>
            <h3>✉️ Cover Letter kamu</h3>
            <pre class="cl-text"></pre>
            <div class="cl-actions">
              <button class="btn primary cl-copy" type="button">Salin Teks</button>
              <span class="cl-remaining"></span>
            </div>
          </div>`;
        modal.querySelector('.cl-text').textContent = data.text;
        modal.querySelector('.cl-remaining').textContent =
          typeof data.remaining === 'number' ? `Sisa kuota AI: ${data.remaining}` : '';
        document.body.appendChild(modal);
        modal.querySelector('.cl-close').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
        modal.querySelector('.cl-copy').addEventListener('click', async () => {
          try { await navigator.clipboard.writeText(data.text); modal.querySelector('.cl-copy').textContent = 'Tersalin ✓'; }
          catch { /* clipboard ditolak */ }
        });
      } catch (err) {
        if (typeof window.__cvkitaQuotaModal === 'function') window.__cvkitaQuotaModal(err.message);
        else alert(err.message);
      } finally {
        btn.innerHTML = label;
        btn.disabled = false;
      }
    });
  });
})();
