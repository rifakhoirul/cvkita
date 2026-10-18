// Banding Lowongan (GRATIS) — tempel beberapa lowongan (pisah "---") → /api/rank →
// tabel ranking (skor + verdict + gaps + hardreqs) + CTA "Tailor lowongan ini"
// yang membuka modal Tailoring dengan jobText terisi (funnel ke fitur premium).
// PRD: ~/cvkita-prd-banding-lowongan.md
(function () {
  const API = 'https://cvkita-api.cvkita-rifakhoirul.workers.dev';
  const btn = document.getElementById('btn-rank');
  if (!btn) return;

  function escHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  function collectCV() {
    const g = n => { const el = document.querySelector(`[name="${n}"]`); return el ? el.value.trim() : ''; };
    const rows = sec => Array.from(document.querySelectorAll(`[data-section="${sec}"] .cv-row`)).map(r => {
      const o = {};
      r.querySelectorAll('[name]').forEach(f => { o[f.name] = f.value.trim(); });
      return o;
    }).filter(o => Object.values(o).some(v => v));
    return {
      fields: {
        nama: g('nama'), headline: g('headline'), ringkasan: g('ringkasan'),
        keahlian: g('keahlian'), kontak: g('kontak'), kota: g('kota'), link: g('link')
      },
      pendidikan: rows('pendidikan'),
      pengalaman: rows('pengalaman'),
      project: rows('project'),
    };
  }

  function showJobModal(onSubmit) {
    const modal = document.createElement('div');
    modal.className = 'improve-confirm';
    modal.id = 'rank-modal';
    modal.innerHTML = `
      <div class="improve-confirm-card">
        <h3><svg class="ic" aria-hidden="true"><use href="#i-list"></use></svg> Banding Lowongan</h3>
        <p class="improve-confirm-sub">Tempel beberapa deskripsi lowongan, pisahkan dengan baris <code>---</code> (maks. 10). Gratis, tanpa kuota AI.</p>
        <label for="rank-jobtext">Lowongan (pisah dengan ---)</label>
        <textarea id="rank-jobtext" rows="10" placeholder="Lowongan pertama...&#10;---&#10;Lowongan kedua..."></textarea>
        <p class="improve-confirm-sub" id="rank-err" style="color:#b91c1c" hidden></p>
        <div class="improve-confirm-actions">
          <button type="button" class="btn ghost" id="rank-close">Batal</button>
          <button type="button" class="btn primary" id="rank-submit">Bandingkan (Gratis)</button>
        </div>
      </div>`;
    modal.querySelector('#rank-close').onclick = () => modal.remove();
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    const onKey = e => { if (e.key === 'Escape') { modal.remove(); document.removeEventListener('keydown', onKey); } };
    document.addEventListener('keydown', onKey);
    modal.querySelector('#rank-submit').onclick = () => {
      const raw = modal.querySelector('#rank-jobtext').value.trim();
      const jobs = raw.split(/\n\s*---\s*\n/).map(s => s.trim()).filter(Boolean);
      const err = modal.querySelector('#rank-err');
      if (jobs.length < 1) { err.textContent = 'Tempel minimal satu lowongan.'; err.hidden = false; return; }
      if (jobs.length > 10) { err.textContent = 'Maksimal 10 lowongan per pembandingan.'; err.hidden = false; return; }
      const short = jobs.findIndex(j => j.length < 150);
      if (short !== -1) { err.textContent = `Lowongan #${short + 1} terlalu pendek — tempel lowongan lengkapnya (minimal 150 karakter).`; err.hidden = false; return; }
      err.hidden = true;
      onSubmit(jobs);
    };
    document.body.appendChild(modal);
  }

  function showResult(jobs, ranked) {
    const modal = document.createElement('div');
    modal.className = 'improve-confirm';
    modal.id = 'rank-result';
    modal.innerHTML = `
      <div class="improve-confirm-card">
        <h3>📊 Hasil Banding Lowongan</h3>
        <p class="improve-confirm-sub">Skor estimasi AI untuk membantu memprioritaskan, bukan jaminan lolos. Lamar yang paling cocok — lalu tailor CV-mu untuk lowongan itu.</p>
        <div class="rank-list">
          ${ranked.map(r => {
            const num = r.index + 1;
            const hards = (r.hardreqs || []).length
              ? `<div class="rank-hardreqs">⚠ Syarat wajib belum terpenuhi: ${r.hardreqs.map(h => escHtml(h)).join('; ')}</div>` : '';
            const gaps = (r.gaps || []).length
              ? `<div class="rank-gaps">Gap: ${r.gaps.map(g => escHtml(g)).join(', ')}</div>` : '';
            return `<div class="rank-row">
              <div class="rank-head"><span class="rank-score">${Number.isFinite(r.score && r.score.total) ? r.score.total : '–'}/100</span>
              <span class="rank-verdict">${escHtml(r.verdict || '')}</span>
              <span class="rank-jobnum">Lowongan #${num}</span></div>
              ${hards}${gaps}
              <button type="button" class="btn ghost rank-tailor" data-jobindex="${r.index}">Tailor lowongan ini</button>
            </div>`;
          }).join('')}
        </div>
        <div class="improve-confirm-actions">
          <button type="button" class="btn primary" id="rank-done">Selesai</button>
        </div>
      </div>`;
    modal.querySelector('#rank-done').onclick = () => modal.remove();
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    modal.querySelectorAll('.rank-tailor').forEach(b => {
      b.addEventListener('click', () => {
        const jobText = jobs[Number(b.dataset.jobindex)];
        modal.remove();
        if (typeof window.__cvkitaOpenTailor === 'function') window.__cvkitaOpenTailor(jobText);
      });
    });
    document.body.appendChild(modal);
  }

  btn.addEventListener('click', async () => {
    showJobModal(async jobs => {
      const cv = collectCV();
      const submitBtn = document.querySelector('#rank-submit');
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Membandingkan...'; }
      try {
        const res = await fetch(API + '/api/rank', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cv, jobs }),
        });
        const modal = document.getElementById('rank-modal');
        const j = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (modal) {
            const err = modal.querySelector('#rank-err');
            err.textContent = j.error || 'Gagal membandingkan. Coba lagi.';
            err.hidden = false;
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Bandingkan (Gratis)'; }
          }
          return;
        }
        if (modal) modal.remove();
        showResult(jobs, j.ranked || []);
      } catch {
        const modal = document.getElementById('rank-modal');
        if (modal) {
          const err = modal.querySelector('#rank-err');
          err.textContent = 'Gagal menghubungi layanan. Periksa koneksi lalu coba lagi.';
          err.hidden = false;
          if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Bandingkan (Gratis)'; }
        }
      }
    });
  });
})();
