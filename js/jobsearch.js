// Fitur premium "Cari Lowongan" — QA redesign 2026-09-29:
// hasil dikelompokkan per query sebagai KARTU dengan tombol portal per baris.
// URL JobStreet pakai format /id/{slug}-jobs (format lama 404).
(function () {
  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('btn-jobsearch');
    const panel = document.getElementById('jobsearch-panel');
    if (!btn || !panel) return;

    function escHtml(s) {
      return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    function cariUrl(portal, q) {
      const slug = q.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const enc = encodeURIComponent(q);
      switch (portal) {
        case 'jobstreet': return `https://www.jobstreet.co.id/id/${slug}-jobs`;
        case 'linkedin': return `https://www.linkedin.com/jobs/search/?keywords=${enc}`;
        case 'kalibrr': return `https://www.kalibrr.com/id-ID/job-board/te/${slug}`;
        case 'google': return `https://www.google.com/search?q=${enc}+jobs&ibp=htl;jobs`;
        default: return '#';
      }
    }

    const PORTALS = [
      { id: 'jobstreet', label: 'JobStreet', primary: true },
      { id: 'linkedin', label: 'LinkedIn' },
      { id: 'kalibrr', label: 'Kalibrr' },
      { id: 'google', label: 'Google Jobs' },
    ];

    btn.addEventListener('click', async () => {
      if (typeof isPremium === 'function' && !isPremium()) { showPaywall(); return; }
      const form = document.getElementById('cv-form');
      const headline = (form.querySelector('[name="headline"]')?.value || '').trim();
      const skills = (form.querySelector('[name="keahlian"]')?.value || '').trim();
      if (!headline && !skills) {
        alert('Isi dulu Headline dan Keahlian di CV-mu, lalu coba lagi.');
        return;
      }
      const label = btn.innerHTML;
      btn.innerHTML = '⏳ Menganalisis kariermu...';
      btn.disabled = true;
      panel.classList.remove('hidden');
      panel.innerHTML = '<p class="js-loading">Menyiapkan rekomendasi lowongan…</p>';
      try {
        const res = await fetch(`${API_BASE}/api/job-search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ headline, skills, license: localStorage.getItem(LICENSE_KEY) || '' }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Gagal menghubungi AI. Coba lagi.');

        const category = escHtml(data.category || 'Rekomendasi Posisi');
        const cards = (data.queries || []).map(q => {
          const qe = escHtml(q);
          const btns = PORTALS.map(p =>
            `<a class="js-portal${p.primary ? ' primary' : ''}" href="${cariUrl(p.id, q)}" target="_blank" rel="noopener">${p.label} ↗</a>`
          ).join('');
          return `<div class="js-card"><div class="js-q">${qe}</div><div class="js-portal-row">${btns}</div></div>`;
        }).join('');

        const reason = escHtml(data.reason || '');
        const swot = data.swot || null;
        let swotHtml = '';
        if (swot && (swot.s.length || swot.w.length || swot.o.length || swot.t.length)) {
          const quad = (cls, label, items) =>
            `<div class="swot-quad ${cls}"><h4>${label}</h4><ul>${items.map(i => `<li>${escHtml(i)}</li>`).join('')}</ul></div>`;
          swotHtml =
            `<div class="swot-grid">` +
            quad('swot-s', '💪 Kekuatan', swot.s) +
            quad('swot-w', '🎯 Perlu Ditambal', swot.w) +
            quad('swot-o', '🚀 Peluang', swot.o) +
            quad('swot-t', '⚠️ Ancaman', swot.t) +
            `</div><p class="swot-cap">Analisis SWOT berdasarkan CV-mu — untuk posisi ${category}.</p>`;
        }
        panel.innerHTML =
          `<div class="js-head"><svg class="ic" aria-hidden="true"><use href="#i-sparkle"></use></svg>` +
          `<span class="js-title">Posisi yang cocok: ${category}</span></div>` +
          (reason ? `<p class="js-reason">${reason}</p>` : '') +
          cards +
          (swotHtml ? `<div class="swot-wrap"><h3 class="swot-title">📊 Analisis SWOT</h3>${swotHtml}</div>` : '') +
          `<p class="js-note"><svg class="ic" aria-hidden="true"><use href="#i-lock"></use></svg> Pencarian terbuka di portal masing-masing. Sisa kuota AI: ${data.remaining ?? '-'}</p>`;
      } catch (err) {
        if (/habis/i.test(err.message) && window.__cvkitaQuotaExhausted) {
          panel.innerHTML = '';
          window.__cvkitaQuotaExhausted();
        } else {
          panel.innerHTML = `<p class="js-error">${escHtml(err.message)}</p>`;
        }
      } finally {
        btn.innerHTML = label;
        btn.disabled = false;
      }
    });
  });
})();
