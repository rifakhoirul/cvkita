// Impor CV PDF → auto-isi form (gratis). 2026-09-29
(function () {
  const API = 'https://cvkita-api.cvkita-rifakhoirul.workers.dev';
  const el = {
    file: document.getElementById('import-file'),
    status: document.getElementById('import-status'),
    progress: document.getElementById('import-progress'),
  };
  if (!el.file) return;

  function setStatus(msg, busy) {
    if (el.progress) el.progress.classList.toggle('hidden', !busy);
    if (!el.status) return;
    el.status.textContent = msg || '';
    el.status.classList.toggle('hidden', !msg);
  }

  function apply(data) {
    if (!data || !data.fields) throw new Error('format');
    const set = (name, v) => {
      const input = document.querySelector(`[name="${name}"]`);
      if (input && v) input.value = v;
    };
    const f = data.fields || {};
    set('nama', f.nama); set('headline', f.headline); set('email', f.email);
    set('phone', f.phone); set('city', f.city); set('ringkasan', f.ringkasan);
    // Keahlian: array skills dari AI → textarea dipisah koma
    if (Array.isArray(data.skills) && data.skills.length) {
      const keahlian = document.querySelector('[name="keahlian"]');
      if (keahlian) {
        keahlian.value = data.skills.map(s => String(s).trim()).filter(Boolean).join(', ');
        keahlian.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
    // Trigger render + persist
    document.dispatchEvent(new Event('input', { bubbles: true }));
    ['nama', 'headline', 'email', 'phone', 'city', 'ringkasan'].forEach(n => {
      const input = document.querySelector(`[name="${n}"]`);
      if (input) input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    // Pendidikan / pengalaman / project: render baris dinamis via app.js
    if (window.__cvkitaRenderLists) {
      window.__cvkitaRenderLists({
        pendidikan: (data.pendidikan || []).map(p => ({ sekolah: p.sekolah, gelar: p.gelar || p.jurusan, periode: p.periode, detail: p.detail })),
        pengalaman: (data.pengalaman || []).map(p => ({ posisi: p.posisi, organisasi: p.perusahaan || p.organisasi, periode: p.periode, deskripsi: (p.bullets || p.deskripsi || []).join('\\n') })),
        project: (data.projects || data.project || []).map(p => ({ nama: p.nama, peran: p.peran || p.periode, deskripsi: (p.bullets || p.deskripsi || []).join ? [].concat(p.bullets || p.deskripsi).join('\\n') : (p.deskripsi || ''), link: p.link })),
      });
    }
    setStatus('✓ CV terimpor! Periksa & lengkapi datanya di bawah.');
    document.getElementById('cv-preview')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  el.file.addEventListener('change', async () => {
    const file = el.file.files && el.file.files[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) { setStatus('File terlalu besar (maks 4 MB).', false); return; }
    // Progress bar di index.html sudah berisi teks "Membaca CV…" — status text KOSONG saat busy agar tidak dobel
    setStatus('', true);
    try {
      const buf = await file.arrayBuffer();
      let bin = '';
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.length; i += 8192) bin += String.fromCharCode(...bytes.subarray(i, i + 8192));
      const b64 = btoa(bin);
      const res = await fetch(API + '/api/import-cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdf_base64: 'data:application/pdf;base64,' + b64 }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setStatus(j.error || 'Gagal membaca CV. Coba lagi.', false); return; }
      try { if (window.__cvkitaTrack) window.__cvkitaTrack('import_pdf'); } catch {}
      apply(j);
    } catch {
      setStatus('Gagal membaca CV. Coba lagi.', false);
    } finally {
      el.file.value = '';
    }
  });
})();
