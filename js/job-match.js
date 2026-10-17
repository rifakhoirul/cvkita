// Cek Kecocokan CV vs Lowongan (premium, 1 kuota/klik). Dibuka dari halaman detail lowongan
// lewat index.html?cocok=<URL Kalibrr>. Teks dari server selalu dirender via textContent.
(function () {
  const API = 'https://cvkita-api.cvkita-rifakhoirul.workers.dev';
  const CV_KEY = 'cvkita_data_v1';
  const LICENSE_KEY = 'cvkita_license_v1';
  const JOB_PREFIX = 'https://www.kalibrr.com/c/';

  const jobUrl = new URLSearchParams(location.search).get('cocok') || '';
  if (!jobUrl.startsWith(JOB_PREFIX)) return;

  try { if (window.__cvkitaTrack) window.__cvkitaTrack('job_match_click'); } catch (e) { /* analytics opsional */ }

  if (!isPremium()) { location.href = 'pay.html'; return; }

  function readCV() {
    let data = {};
    try { data = JSON.parse(localStorage.getItem(CV_KEY)) || {}; } catch (e) { data = {}; }
    const lists = data.lists || {};
    return {
      fields: data.fields || {},
      pendidikan: lists.pendidikan || [],
      pengalaman: lists.pengalaman || [],
      project: lists.project || [],
    };
  }

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function buildModal() {
    const modal = el('div', 'improve-confirm');
    modal.id = 'jm-modal';
    modal.innerHTML = `
      <div class="improve-confirm-card jm-card" role="dialog" aria-modal="true" aria-labelledby="jm-title">
        <button type="button" class="improve-close" id="jm-close" aria-label="Tutup">&times;</button>
        <h3 id="jm-title">Cek Kecocokan CV</h3>
        <div id="jm-intro">
          <p class="improve-confirm-sub">Lihat seberapa cocok CV-mu dengan lowongan ini, plus bagian yang bisa kamu kejar. Pakai 1 kuota AI per cek.</p>
          <div class="improve-confirm-actions">
            <button type="button" class="btn primary" id="jm-submit">Cek kecocokan (1 kuota AI)</button>
          </div>
        </div>
        <div id="jm-loading" class="jm-loading" aria-live="polite" hidden>
          <span class="sk-line jm-sk-ring"></span>
          <span class="sk-line" style="width:60%"></span>
          <span class="sk-line" style="width:85%"></span>
          <span class="sk-line" style="width:40%"></span>
        </div>
        <p class="tailor-err" id="jm-err" role="alert"></p>
        <div id="jm-result" hidden>
          <div class="jm-score-wrap">
            <div class="jm-ring" id="jm-ring"><span id="jm-score"></span><small>/100</small></div>
            <p id="jm-summary" class="jm-summary"></p>
          </div>
          <h4 class="jm-h4">Yang sudah kuat</h4>
          <ul id="jm-strengths" class="jm-strengths"></ul>
          <h4 class="jm-h4">Gap yang bisa kamu kejar</h4>
          <div id="jm-gaps" class="jm-gaps"></div>
          <p class="improve-confirm-sub">Skor estimasi AI, bukan jaminan lolos. AI hanya membaca data CV-mu, tidak menambah pengalaman.</p>
        </div>
      </div>`;
    return modal;
  }

  function open() {
    const modal = buildModal();
    const close = () => { document.removeEventListener('keydown', onKey); modal.remove(); };
    const onKey = e => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    modal.querySelector('#jm-close').onclick = close;
    modal.addEventListener('click', e => { if (e.target === modal) close(); });
    modal.querySelector('#jm-submit').onclick = () => run(modal, close);
    document.body.appendChild(modal);
    return { modal, close };
  }

  function showError(modal, msg) {
    modal.querySelector('#jm-intro').hidden = false;
    modal.querySelector('#jm-loading').hidden = true;
    modal.querySelector('#jm-err').textContent = msg;
  }

  function renderResult(modal, j) {
    const score = Number.isFinite(j.score) ? Math.min(Math.max(Math.round(j.score), 0), 100) : 0;
    const ring = modal.querySelector('#jm-ring');
    ring.style.setProperty('--p', String(score));
    modal.querySelector('#jm-score').textContent = String(score);
    modal.querySelector('#jm-summary').textContent = typeof j.summary === 'string' ? j.summary : '';

    const strengths = modal.querySelector('#jm-strengths');
    strengths.replaceChildren(...(Array.isArray(j.strengths) ? j.strengths : []).map(s => el('li', '', String(s))));

    const gaps = modal.querySelector('#jm-gaps');
    gaps.replaceChildren(...(Array.isArray(j.gaps) ? j.gaps : []).map(g => {
      const card = el('div', 'jm-gap');
      card.append(el('strong', 'jm-gap-label', String(g.label || '')), el('p', 'jm-gap-tip', String(g.tip || '')));
      return card;
    }));

    modal.querySelector('#jm-loading').hidden = true;
    modal.querySelector('#jm-intro').hidden = true;
    modal.querySelector('#jm-result').hidden = false;
  }

  async function run(modal, close) {
    const code = localStorage.getItem(LICENSE_KEY) || '';
    modal.querySelector('#jm-err').textContent = '';
    modal.querySelector('#jm-intro').hidden = true;
    modal.querySelector('#jm-result').hidden = true;
    modal.querySelector('#jm-loading').hidden = false;
    try {
      const res = await fetch(API + '/api/job-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, jobUrl, cv: readCV() }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 403 && /habis/i.test(j.error || '') && window.__cvkitaQuotaExhausted) {
          close();
          window.__cvkitaQuotaExhausted();
          return;
        }
        showError(modal, j.error || 'Gagal memproses. Coba lagi.');
        return;
      }
      renderResult(modal, j);
      try { if (window.__cvkitaTrack) window.__cvkitaTrack('job_match_result'); } catch (e) { /* analytics opsional */ }
      if (typeof j.remaining === 'number' && typeof window.__cvkitaSyncBadge === 'function') {
        window.__cvkitaSyncBadge(j.remaining);
      }
    } catch (e) {
      showError(modal, 'Gagal menghubungi layanan AI. Cek koneksi internetmu.');
    }
  }

  open();
})();
