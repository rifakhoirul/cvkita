// Improve seluruh CV dengan AI — premium, 1 kuota/klik, preview sebelum→sesudah dengan konfirmasi.
(function () {
  const API = 'https://cvkita-api.cvkita-rifakhoirul.workers.dev';
  const btn = document.getElementById('btn-improve-all');
  if (!btn) return;

  function collectCV() {
    const f = {};
    ['nama', 'headline', 'email', 'phone', 'city', 'keahlian', 'ringkasan', 'link'].forEach(n => {
      const el = document.querySelector(`[name="${n}"]`);
      if (el) f[n] = el.value;
    });
    const grab = key => [...document.querySelectorAll(`#${key}-list .entry`)].map(e => {
      const o = {};
      e.querySelectorAll('[name]').forEach(inp => { o[inp.name.split('.')[1]] = inp.value; });
      return o;
    }).filter(o => Object.values(o).some(v => (v || '').trim()));
    return { fields: f, pendidikan: grab('pendidikan'), pengalaman: grab('pengalaman'), project: grab('project') };
  }

  function applyResult(cv) {
    const set = (n, v) => { const el = document.querySelector(`[name="${n}"]`); if (el && v) el.value = v; };
    const f = cv.fields || {};
    ['nama', 'headline', 'ringkasan', 'keahlian'].forEach(n => set(n, f[n]));
    const fill = (key, items) => {
      const list = document.getElementById(`${key}-list`);
      if (!list) return;
      const entries = list.querySelectorAll('.entry');
      (items || []).forEach((item, i) => {
        const e = entries[i];
        if (!e) return;
        Object.entries(item).forEach(([k, v]) => {
          if (typeof v !== 'string') return;
          const inp = e.querySelector(`[name="${key}.${k}"]`);
          if (inp && v) inp.value = v;
        });
      });
    };
    fill('pendidikan', cv.pendidikan);
    fill('pengalaman', cv.pengalaman);
    fill('project', cv.project);
    // Trigger persist + render
    document.querySelectorAll('#cv-form [name]').forEach(el => el.dispatchEvent(new Event('input', { bubbles: true })));
  }

  function showConfirm(before, after, onAccept) {
    const esc = s => String(s).replace(/[&<>"/]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '/': '&#x2F;' }[c]));
    const modal = document.createElement('div');
    modal.className = 'improve-confirm';
    modal.innerHTML = `
      <div class="improve-confirm-card">
        <h3>✨ Bandingkan hasil AI</h3>
        <p class="improve-confirm-sub">Teks asli → usulan AI. Terima perubahan atau pertahankan CV-mu.</p>
        <div class="improve-diff">
          <div><h4>Sebelum</h4><pre>${esc(preview(before))}</pre></div>
          <div><h4>Sesudah</h4><pre>${esc(preview(after))}</pre></div>
        </div>
        <div class="improve-confirm-actions">
          <button type="button" class="btn ghost" data-no>Pertahankan punyaku</button>
          <button type="button" class="btn primary" data-yes>Terima hasil AI</button>
        </div>
      </div>`;
    function preview(cv) {
      const lines = [];
      if (cv.fields && cv.fields.ringkasan) lines.push('Ringkasan: ' + cv.fields.ringkasan);
      (cv.pengalaman || []).forEach(p => { if (p.deskripsi) lines.push(`${p.posisi || ''}: ${p.deskripsi.split('\n')[0]}`); });
      return lines.slice(0, 6).join('\n\n') || '(kosong)';
    }
    modal.querySelector('[data-no]').onclick = () => modal.remove();
    modal.querySelector('[data-yes]').onclick = () => { applyResult(after); modal.remove(); };
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    document.body.appendChild(modal);
  }

  btn.addEventListener('click', async () => {
    const code = localStorage.getItem('cvkita_license_v1') || '';
    if (!code) { if (typeof showPaywall === 'function') showPaywall(); return; }
    const before = collectCV();
    btn.disabled = true;
    const old = btn.innerHTML;
    btn.innerHTML = '✨ AI sedang menulis ulang…';
    try {
      const res = await fetch(API + '/api/improve-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, cv: before }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (/habis/i.test(j.error || '') && window.__cvkitaQuotaExhausted) window.__cvkitaQuotaExhausted();
        else alert(j.error || 'Gagal memproses. Coba lagi.');
        return;
      }
      showConfirm(before, j, null);
    } catch {
      alert('Gagal menghubungi layanan AI. Cek koneksi internetmu.');
    } finally {
      btn.disabled = false;
      btn.innerHTML = old;
    }
  });
})();
