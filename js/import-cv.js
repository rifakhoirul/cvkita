// Impor CV PDF → auto-isi form (gratis). 2026-09-29
(function () {
  const API = 'https://cvkita-api.cvkita-rifakhoirul.workers.dev';
  const el = {
    file: document.getElementById('import-file'),
    status: document.getElementById('import-status'),
  };
  if (!el.file) return;

  function setStatus(msg, busy) {
    if (!el.status) return;
    el.status.textContent = msg || '';
    el.status.classList.toggle('hidden', !msg);
    el.status.classList.toggle('import-busy', !!busy);
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
    // Trigger render + persist
    document.dispatchEvent(new Event('input', { bubbles: true }));
    ['nama', 'headline', 'email', 'phone', 'city', 'ringkasan'].forEach(n => {
      const input = document.querySelector(`[name="${n}"]`);
      if (input) input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    // Pendidikan / pengalaman / skills / projects: isi ringkas via localStorage bila loader tersedia
    if (window.__cvkitaApplyImport) window.__cvkitaApplyImport(data);
    setStatus('✓ CV terimpor! Periksa & lengkapi datanya di bawah.');
    document.getElementById('cv-preview')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  el.file.addEventListener('change', async () => {
    const file = el.file.files && el.file.files[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) { setStatus('File terlalu besar (maks 4 MB).', false); return; }
    setStatus('Membaca CV…', true);
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
      apply(j);
    } catch {
      setStatus('Gagal membaca CV. Coba lagi.', false);
    } finally {
      el.file.value = '';
    }
  });
})();
