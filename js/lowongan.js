// Halaman Cari Lowongan — data dari Worker GET /api/jobs (sumber: Kalibrr).
// Semua teks dari API dirender via textContent (bukan innerHTML); link hanya ke kalibrr.com.
(function () {
  const API = 'https://cvkita-api.cvkita-rifakhoirul.workers.dev';
  const DEFAULT_Q = 'intern';
  const form = document.getElementById('jobs-form');
  const input = document.getElementById('jobs-q');
  const statusEl = document.getElementById('jobs-status');
  const list = document.getElementById('jobs-list');
  const chips = document.getElementById('jobs-chips');
  if (!form || !input || !statusEl || !list) return;

  const TENURE_LABEL = { 'full time': 'Full-time', 'part time': 'Part-time', 'contractual': 'Kontrak', 'freelance': 'Freelance' };
  let seq = 0; // hanya respons permintaan TERBARU yang boleh merender

  function icon(id) {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'ic');
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS(NS, 'use');
    use.setAttribute('href', '#' + id);
    svg.appendChild(use);
    return svg;
  }

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function safeKalibrrUrl(u) {
    try {
      const url = new URL(u);
      const host = url.hostname.toLowerCase();
      if (url.protocol === 'https:' && (host === 'kalibrr.com' || host.endsWith('.kalibrr.com'))) return url.href;
    } catch (e) { /* URL tidak valid */ }
    return null;
  }

  function tenureLabel(job) {
    if (job.isIntern) return 'Magang';
    const raw = String(job.tenure || '').trim();
    return TENURE_LABEL[raw.toLowerCase()] || raw;
  }

  // Logo Kalibrr di-host di rec-data.kalibrr.com (berakhir .kalibrr.com → lolos). Domain lain TIDAK diizinkan.
  function safeLogoUrl(u) {
    if (typeof u !== 'string') return null;
    return safeKalibrrUrl(u);
  }

  // Awalan badan usaha (PT/CV/UD/PD) dilewati supaya inisial bermakna: "PT Maju Jaya" → "M".
  function initialOf(name) {
    let s = String(name || '').trim();
    const rest = s.replace(/^(?:pt|cv|ud|pd)\.?\s+/i, '');
    if (rest) s = rest;
    const ch = Array.from(s)[0];
    return ch ? ch.toUpperCase() : '?';
  }

  // Placeholder dekoratif (nama perusahaan sudah ada sebagai teks di sebelahnya) → aria-hidden.
  function logoFallback(company) {
    const f = el('div', 'job-logo-fallback', initialOf(company));
    f.setAttribute('aria-hidden', 'true');
    return f;
  }

  function logoNode(job) {
    const src = safeLogoUrl(job.logo);
    if (!src) return logoFallback(job.company);
    const img = document.createElement('img');
    img.className = 'job-logo';
    img.alt = '';
    img.loading = 'lazy';
    img.width = 48;
    img.height = 48;
    // Gambar gagal dimuat (404/diblok/offline) → ganti ke placeholder inisial.
    img.addEventListener('error', () => {
      if (img.parentNode) img.parentNode.replaceChild(logoFallback(job.company), img);
    }, { once: true });
    img.src = src;
    return img;
  }

  function card(job, href) {
    const li = el('li', 'job-card');
    const head = el('div', 'job-head');
    head.appendChild(logoNode(job));
    const info = el('div', 'job-info');
    info.appendChild(el('h2', 'job-title', job.title || ''));
    info.appendChild(el('p', 'job-company', job.company || ''));
    head.appendChild(info);
    li.appendChild(head);

    const meta = el('div', 'job-meta');
    if (job.location) {
      const loc = el('span', 'job-loc');
      loc.appendChild(icon('i-pin'));
      loc.appendChild(document.createTextNode(' ' + job.location));
      meta.appendChild(loc);
    }
    const t = tenureLabel(job);
    if (t) meta.appendChild(el('span', 'job-tenure', t));
    if (job.freshGrad === true) {
      const b = el('span', 'job-badge');
      b.appendChild(icon('i-sparkle'));
      b.appendChild(document.createTextNode(' Open to Fresh Grad'));
      meta.appendChild(b);
    }
    li.appendChild(meta);

    const a = el('a', 'btn primary job-apply');
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.appendChild(document.createTextNode('Lihat & Lamar '));
    a.appendChild(icon('i-external'));
    li.appendChild(a);
    return li;
  }

  function setStatus(msg) { statusEl.textContent = msg || ''; }

  function render(jobs) {
    list.textContent = '';
    const frag = document.createDocumentFragment();
    let n = 0;
    (Array.isArray(jobs) ? jobs : []).forEach(job => {
      const href = job && safeKalibrrUrl(job.url);
      if (!href) return;
      frag.appendChild(card(job, href));
      n++;
    });
    list.appendChild(frag);
    return n;
  }

  function markChip(q) {
    if (!chips) return;
    chips.querySelectorAll('.chip').forEach(c => {
      c.setAttribute('aria-pressed', String(c.getAttribute('data-q') === q.toLowerCase()));
    });
  }

  function skeleton() {
    list.textContent = '';
    for (let i = 0; i < 6; i++) {
      const li = el('li', 'job-card job-skeleton');
      li.setAttribute('aria-hidden', 'true');
      const box = (cls, w) => { const s = el('span', cls); s.style.width = w; return s; };
      li.appendChild(box('sk-line sk-title', '60%'));
      li.appendChild(box('sk-line sk-company', '40%'));
      li.appendChild(box('sk-line sk-meta', '75%'));
      li.appendChild(box('sk-line sk-btn', '130px'));
      list.appendChild(li);
    }
    setStatus('Mencari lowongan…');
    list.setAttribute('aria-busy', 'true');
  }

  async function search(raw) {
    const q = String(raw || '').trim().replace(/\s+/g, ' ') || DEFAULT_Q;
    const mine = ++seq;
    input.value = q;
    markChip(q);
    skeleton();
    nextPage = 0; updateMoreBtn('reset'); // search baru: tombol hilang segera, page kembali 1
    // Hanya event jobs_search; kontrak analytics.js tidak diubah (query tidak ikut dikirim).
    try { if (window.__cvkitaTrack) window.__cvkitaTrack('jobs_search'); } catch (e) { /* analytics opsional */ }

    let data = null;
    let failed = false;
    try {
      const res = await fetch(API + '/api/jobs?q=' + encodeURIComponent(q));
      data = await res.json().catch(() => null);
      if (res.status === 429) {
        if (mine !== seq) return;
        list.removeAttribute('aria-busy');
        setStatus('Terlalu banyak pencarian. Coba lagi dalam satu jam ya.');
        return;
      }
      if (!res.ok) failed = true;
    } catch (e) {
      failed = true;
    }
    if (mine !== seq) return; // sudah ada pencarian yang lebih baru
    list.removeAttribute('aria-busy');
    list.textContent = ''; // bersihkan skeleton sebelum render hasil/pesan error

    if (failed || !data) {
      setStatus('Koneksi lagi bermasalah. Coba lagi sebentar lagi ya.');
      return;
    }
    if (data.error) {
      setStatus('Sumber lowongan lagi gangguan. Coba lagi sebentar lagi ya.');
      return;
    }
    const n = render(data.jobs);
    setStatus(n ? '' : 'Belum ada lowongan yang cocok, coba kata kunci lain ya');
    nextPage = data.hasMore === true ? (data.page || 1) + 1 : 0;
    updateMoreBtn();
  }

  // ── Load more (Tampilkan lebih banyak) ──
  let nextPage = 0;

  function updateMoreBtn(loading) {
    const btn = document.getElementById('jobs-more');
    if (!btn) return;
    if (!nextPage || loading === 'reset') { btn.hidden = true; btn.disabled = false; btn.textContent = 'Tampilkan lebih banyak'; return; }
    if (loading) {
      btn.hidden = false;
      btn.disabled = true;
      btn.textContent = 'Memuat…';
      return;
    }
    btn.hidden = false;
    btn.disabled = false;
    btn.textContent = 'Tampilkan lebih banyak';
  }

  async function loadMore() {
    if (!nextPage) return;
    const q = input.value.trim() || DEFAULT_Q;
    const mine = seq;
    updateMoreBtn(true);
    try { if (window.__cvkitaTrack) window.__cvkitaTrack('jobs_search'); } catch (e) { /* analytics opsional */ }
    let data = null;
    let failed = false;
    try {
      const res = await fetch(API + '/api/jobs?q=' + encodeURIComponent(q) + '&page=' + nextPage);
      data = await res.json().catch(() => null);
      if (res.status === 429) {
        if (mine !== seq) return;
        updateMoreBtn();
        setStatus('Terlalu banyak pencarian. Coba lagi dalam satu jam ya.');
        return;
      }
      if (!res.ok) failed = true;
    } catch (e) {
      failed = true;
    }
    if (mine !== seq) return; // pencarian baru membatalkan load more telat
    if (failed || !data) {
      updateMoreBtn();
      setStatus('Koneksi lagi bermasalah. Coba lagi sebentar lagi ya.');
      return;
    }
    if (data.error) {
      updateMoreBtn();
      setStatus('Sumber lowongan lagi gangguan. Coba lagi sebentar lagi ya.');
      return;
    }
    setStatus('');
    renderAppend(data.jobs);
    nextPage = data.hasMore === true ? (data.page || nextPage) + 1 : 0;
    updateMoreBtn();
  }

  function renderAppend(jobs) {
    const frag = document.createDocumentFragment();
    (Array.isArray(jobs) ? jobs : []).forEach(job => {
      const href = job && safeKalibrrUrl(job.url);
      if (!href) return;
      frag.appendChild(card(job, href));
    });
    list.appendChild(frag);
  }

  form.addEventListener('submit', e => { e.preventDefault(); search(input.value); });

  // Event delegation: ikon/anak elemen chip tetap terdeteksi lewat closest()
  document.addEventListener('click', e => {
    const chip = e.target.closest('#jobs-chips .chip');
    if (chip) { search(chip.getAttribute('data-q')); return; }
    if (e.target.closest('#jobs-more')) loadMore();
  });

  search(input.value);
})();
