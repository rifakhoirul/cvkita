// CV Tailoring per lowongan — premium, 1 kuota/klik. Modal tempel lowongan →
// /api/tailor → skor kecocokan + gap + preview sebelum/sesudah (konfirmasi).
(function () {
  const API = 'https://cvkita-api.cvkita-rifakhoirul.workers.dev';
  const btn = document.getElementById('btn-tailor');
  if (!btn) return;

  function collectCV() {
    const f = {};
    ['nama', 'headline', 'email', 'telepon', 'kota', 'linkedin', 'keahlian', 'bahasa', 'ringkasan', 'prestasi']
      .forEach(n => {
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
    ['nama', 'headline', 'ringkasan', 'keahlian', 'bahasa', 'prestasi'].forEach(n => set(n, f[n]));
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
    document.querySelectorAll('#cv-form [name]').forEach(el => el.dispatchEvent(new Event('input', { bubbles: true })));
  }

  // Modal input lowongan — closable 3 cara (X, backdrop, Escape) sesuai aturan UX.
  function showJobModal(onSubmit) {
    const esc = s => String(s).replace(/[&<>"'\/]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '/': '&#x2F;' }[c]));
    const modal = document.createElement('div');
    modal.className = 'improve-confirm';
    modal.id = 'tailor-modal';
    modal.innerHTML = `
      <div class="improve-confirm-card">
        <button type="button" class="improve-close" id="tailor-close" aria-label="Tutup">&times;</button>
        <h3>🎯 Sesuaikan CV dengan Lowongan</h3>
        <p class="improve-confirm-sub">Tempel deskripsi lowongan (dari JobStreet, LinkedIn, Glints, dll). AI akan menulis ulang CV-mu mengikuti lowongan — <strong>tanpa mengarang</strong> — dan memberi skor kecocokan. 1 kuota AI per proses.</p>
        <label for="tailor-jobtext">Deskripsi lowongan</label>
        <textarea id="tailor-jobtext" rows="8" placeholder="mis: Kami mencari kandidat untuk posisi Data Analyst. Kualifikasi: menguasai SQL, Excel, dan komunikasi data..."></textarea>
        <p class="tailor-err" id="tailor-err" role="alert"></p>
        <div class="improve-confirm-actions">
          <button type="button" class="btn ghost" id="tailor-cancel">Batal</button>
          <button type="button" class="btn primary" id="tailor-submit">Sesuaikan CV (1 kuota AI)</button>
        </div>
      </div>`;
    const close = () => { document.removeEventListener('keydown', onKey); modal.remove(); };
    const onKey = e => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    modal.querySelector('#tailor-close').onclick = close;
    modal.querySelector('#tailor-cancel').onclick = close;
    modal.addEventListener('click', e => { if (e.target === modal) close(); });
    modal.querySelector('#tailor-submit').onclick = () => {
      const text = modal.querySelector('#tailor-jobtext').value.trim();
      const err = modal.querySelector('#tailor-err');
      if (text.length < 200) {
        err.textContent = 'Deskripsi terlalu pendek — tempel lowongan lengkapnya (minimal 200 karakter).';
        return;
      }
      err.textContent = '';
      modal.remove();
      document.removeEventListener('keydown', onKey);
      onSubmit(text);
    };
    document.body.appendChild(modal);
  }

  function escHtml(s) { return String(s).replace(/[&<>"'\/]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '/': '&#x2F;' }[c])); }

  function showResult(before, result, onAccept) {
    const s = result.score || {};
    const gaps = Array.isArray(result.gaps) ? result.gaps : [];
    const modal = document.createElement('div');
    modal.className = 'improve-confirm';
    modal.id = 'tailor-result';
    modal.innerHTML = `
      <div class="improve-confirm-card">
        <h3>🎯 CV disesuaikan dengan lowongan</h3>
        <div class="tailor-score">
          <div class="tailor-score-total"><span>${Number.isFinite(s.total) ? s.total : '–'}</span>/100</div>
          <div class="tailor-score-bars">
            <div><span>Kata kunci</span><div class="tailor-bar"><i style="width:${s.keyword || 0}%"></i></div></div>
            <div><span>Pengalaman</span><div class="tailor-bar"><i style="width:${s.experience || 0}%"></i></div></div>
            <div><span>Pendidikan</span><div class="tailor-bar"><i style="width:${s.education || 0}%"></i></div></div>
          </div>
        </div>
        ${gaps.length ? `<div class="tailor-gaps"><strong>Gap yang bisa kamu kejar:</strong><ul>${gaps.map(g => `<li>${escHtml(g)}</li>`).join('')}</ul></div>` : ''}
        ${(Array.isArray(result.hardreqs) && result.hardreqs.length) ? `<div class="tailor-hardreqs" role="alert"><strong>Syarat wajib lowongan yang belum kamu penuhi:</strong><ul>${result.hardreqs.map(h => `<li>${escHtml(h)}</li>`).join('')}</ul></div>` : ''}
        <p class="improve-confirm-sub">Skor estimasi AI, bukan jaminan lolos. AI hanya menata ulang fakta CV-mu — tidak mengarang.</p>
        <div class="improve-diff">
          <div><h4>Sebelum</h4><pre>${escHtml(tailorPreview(before))}</pre></div>
          <div><h4>Sesudah</h4><pre>${escHtml(tailorPreview(result))}</pre></div>
        </div>
        <div class="improve-confirm-actions">
          <button type="button" class="btn ghost" id="tailor-keep">Pertahankan punyaku</button>
          <button type="button" class="btn primary" id="tailor-accept">Terima hasil AI</button>
        </div>
      </div>`;
    modal.querySelector('#tailor-keep').onclick = () => modal.remove();
    modal.querySelector('#tailor-accept').onclick = () => { applyResult(result); modal.remove(); if (onAccept) onAccept(); };
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    document.body.appendChild(modal);
  }

  function tailorPreview(cv) {
    const lines = [];
    if (cv.fields && cv.fields.headline) lines.push('Headline: ' + cv.fields.headline);
    if (cv.fields && cv.fields.ringkasan) lines.push('Ringkasan: ' + cv.fields.ringkasan);
    (cv.pengalaman || []).forEach(p => { if (p.deskripsi) lines.push(`${p.posisi || ''}: ${p.deskripsi.split('\n')[0]}`); });
    return lines.slice(0, 6).join('\n\n') || '(kosong)';
  }

  btn.addEventListener('click', async () => {
    const code = localStorage.getItem('cvkita_license_v1') || '';
    if (!code) { if (typeof showPaywall === 'function') showPaywall(); return; }
    let remaining = null;
    try {
      if (typeof verifyLicense === 'function') {
        const r = await verifyLicense(code);
        if (!r || !r.valid) { if (window.__cvkitaQuotaExhausted) window.__cvkitaQuotaExhausted(); return; }
        remaining = r.quota;
      }
    } catch { /* lanjut, server yang menolak */ }
    showJobModal(jobText => runTailor(code, jobText));
  });

  // Hook untuk js/rank.js: buka modal Tailoring dengan jobText terisi (CTA "Tailor lowongan ini").
  window.__cvkitaOpenTailor = function (jobText) {
    const code = localStorage.getItem('cvkita_license_v1') || '';
    if (!code) { if (typeof showPaywall === 'function') showPaywall(); return; }
    showJobModal(t => runTailor(code, t));
    const ta = document.getElementById('tailor-jobtext');
    if (ta) ta.value = jobText;
  };

  async function runTailor(code, jobText) {
    const before = collectCV();
    btn.disabled = true;
    const old = btn.innerHTML;
    btn.innerHTML = '🎯 AI menyesuaikan CV dengan lowongan…';
    try {
      const res = await fetch(API + '/api/tailor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, cv: before, jobText }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (/habis/i.test(j.error || '') && window.__cvkitaQuotaExhausted) window.__cvkitaQuotaExhausted();
        else alert(j.error || 'Gagal memproses. Coba lagi.');
        return;
      }
      if (typeof j.remaining === 'number' && typeof window.__cvkitaSyncBadge === 'function') {
        window.__cvkitaSyncBadge(j.remaining);
      }
      showResult(before, j);
    } catch {
      alert('Gagal menghubungi layanan AI. Cek koneksi internetmu.');
    } finally {
      btn.disabled = false;
      btn.innerHTML = old;
    }
  }
})();
