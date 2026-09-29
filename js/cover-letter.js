// Fitur premium "Cover Letter (AI)" — Opsi A 2026-09-29.
// 1 klik = 1 kuota. Input: data CV + perusahaan/posisi tujuan (opsional).
// Output: teks cover letter di modal, tombol Salin.
(function () {
  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('btn-cover-letter');
    if (!btn) return;

    function val(n) { return (document.querySelector(`#cv-form [name="${n}"]`)?.value || '').trim(); }

    btn.addEventListener('click', async () => {
      if (typeof isPremium === 'function' && !isPremium()) { showPaywall(); return; }
      const nama = val('nama');
      if (!nama) {
        if (typeof window.__cvkitaQuotaModal === 'function') window.__cvkitaQuotaModal('Isi dulu nama lengkap di CV-mu, lalu coba lagi.');
        else alert('Isi dulu nama lengkap di CV-mu, lalu coba lagi.');
        return;
      }

      // Tanya tujuan lamaran (bisa dilewati)
      const perusahaan = prompt('Perusahaan yang dituju (boleh dikosongkan):') || '';
      const posisi = prompt('Posisi yang dilamar (boleh dikosongkan):') || '';

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
