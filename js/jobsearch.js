// Fitur premium "Cari Lowongan" — batch-2.
// Tombol di bawah preview. Premium: 1 klik = 1 kuota AI. Non-premium: paywall.
(function () {
  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('btn-jobsearch');
    const panel = document.getElementById('jobsearch-panel');
    if (!btn || !panel) return;

    const PORTALS = [
      { name: 'JobStreet', url: q => `https://www.jobstreet.co.id/id/job-search?q=${encodeURIComponent(q)}` },
      { name: 'Glints', url: q => `https://glints.com/id/opportunities/jobs?query=${encodeURIComponent(q)}` },
      { name: 'LinkedIn', url: q => `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(q)}` },
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
      btn.innerHTML = '⏳ Mencari rekomendasi...';
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
        const links = [];
        (data.queries || []).forEach(q => {
          PORTALS.forEach(p => {
            links.push(`<li><a href="${p.url(q)}" target="_blank" rel="noopener">${p.name}: ${escHtml(q)}</a></li>`);
          });
        });
        panel.innerHTML =
          `<p class="js-cat">Rekomendasi posisi: <strong>${escHtml(data.category || '')}</strong></p>` +
          `<ul class="js-links">${links.join('')}</ul>` +
          (typeof data.remaining === 'number' ? `<p class="js-remaining">Sisa kuota AI: ${data.remaining}</p>` : '');
      } catch (err) {
        panel.innerHTML = `<p class="js-error">${escHtml(err.message)}</p>`;
      } finally {
        btn.innerHTML = label;
        btn.disabled = false;
      }
    });

    function escHtml(s) {
      return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }
  });
})();
