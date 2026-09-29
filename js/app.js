/* CVKita — MVP. Semua data di localStorage, tidak ada server. */
const KEY = 'cvkita_data_v1', TPL_KEY = 'cvkita_tpl_v1';

const SECTIONS = {
  pendidikan: {
    label: 'Pendidikan',
    fields: [
      { n: 'sekolah', p: 'Nama kampus, mis: Universitas Indonesia' },
      { n: 'gelar', p: 'Jurusan & gelar, mis: S1 Teknik Informatika, IPK 3.65' },
      { n: 'periode', p: 'Periode, mis: 2021 – 2025' }
    ]
  },
  pengalaman: {
    label: 'Pengalaman',
    fields: [
      { n: 'posisi', p: 'Posisi, mis: Magang Marketing' },
      { n: 'organisasi', p: 'Perusahaan / organisasi & lokasi' },
      { n: 'periode', p: 'Periode, mis: Jun – Agu 2024' },
      { n: 'deskripsi', p: 'Capaian & tanggung jawab (1 per baris, mulai dengan kata kerja: Mengelola, Membuat...)', textarea: true }
    ]
  },
  project: {
    label: 'Project',
    fields: [
      { n: 'nama', p: 'Nama project / skripsi' },
      { n: 'peran', p: 'Peran & periode, mis: Ketua Tim, 2024' },
      { n: 'deskripsi', p: 'Apa yang dikerjakan & hasilnya (1 per baris)', textarea: true },
      { n: 'link', p: 'Link (GitHub / Behance / Drive)' }
    ]
  }
};

const $ = s => document.querySelector(s);

function loadData() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}
function saveData() {
  const data = { fields: {}, lists: {} };
  $('#cv-form').querySelectorAll('input[name], textarea[name]').forEach(el => {
    if (el.name) data.fields[el.name] = el.value;
  });
  Object.keys(SECTIONS).forEach(k => {
    data.lists[k] = collectList(k);
  });
  localStorage.setItem(KEY, JSON.stringify(data));
}

function entryHTML(key, data = {}) {
  const sec = SECTIONS[key];
  const fields = sec.fields.map(f =>
    f.textarea
      ? `<textarea name="${key}.${f.n}" rows="3" placeholder="${f.p}">${data[f.n] || ''}</textarea>`
      : `<input name="${key}.${f.n}" placeholder="${f.p}" value="${data[f.n] || ''}">`
  ).join('');
  const aiBtn = key === 'pengalaman'
    ? '<button type="button" class="btn ai btn-ai"><svg class="ic" aria-hidden="true"><use href="#i-sparkle"/></svg> Improve dengan AI</button>'
    : '';
  return `<div class="entry" data-key="${key}">${fields}${aiBtn}<button type="button" class="btn del" data-del><svg class="ic" aria-hidden="true"><use href="#i-trash"></use></svg> Hapus</button></div>`;
}

function renderList(key, items = [{}]) {
  $(`#${key}-list`).innerHTML = items.map(d => entryHTML(key, d)).join('');
}
// QA 2026-09-29: diekspos untuk fitur Impor CV (import-cv.js) — render hasil ekstraksi AI
window.__cvkitaRenderLists = function (lists) {
  Object.keys(SECTIONS).forEach(k => {
    const items = (lists && lists[k]) || [];
    const norm = items.map(d => {
      const o = {};
      SECTIONS[k].fields.forEach(f => { o[f.n] = d[f.n] !== undefined ? String(d[f.n]) : (d[f.alt] || ''); });
      return o;
    }).filter(o => Object.values(o).some(v => (v || '').trim()));
    renderList(k, norm.length ? norm : [{}]);
  });
  saveData(); render();
};
function collectList(key) {
  return [...$(`#${key}-list`).querySelectorAll('.entry')].map(e => {
    const d = {};
    SECTIONS[key].fields.forEach(f => {
      d[f.n] = e.querySelector(`[name="${key}.${f.n}"]`)?.value || '';
    });
    return d;
  });
}

function esc(s) {
  return (s || '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
}
function nl2li(s) {
  const lines = (s || '').split('\n').map(x => x.trim()).filter(Boolean);
  return lines.length ? `<ul>${lines.map(l => `<li>${esc(l)}</li>`).join('')}</ul>` : '';
}
function tags(s) {
  const items = (s || '').split(',').map(x => x.trim()).filter(Boolean);
  return items.length ? `<div class="skill-tags">${items.map(i => `<span>${esc(i)}</span>`).join('')}</div>` : '';
}

function cvHTML() {
  const data = loadData();
  const f = data.fields || {};
  const lists = data.lists || {};
  const contact = [f.email, f.telepon, f.kota, f.linkedin].filter(Boolean).map(esc).join(' • ');

  const pend = (lists.pendidikan || []).filter(p => p.sekolah).map(p => `
    <div class="item"><div class="item-head"><span>${esc(p.sekolah)}</span><span>${esc(p.periode)}</span></div>
    <div class="item-sub">${esc(p.gelar)}</div></div>`).join('');

  const peng = (lists.pengalaman || []).filter(p => p.posisi || p.organisasi).map(p => `
    <div class="item"><div class="item-head"><span>${esc(p.posisi)} — ${esc(p.organisasi)}</span><span>${esc(p.periode)}</span></div>
    ${nl2li(p.deskripsi)}</div>`).join('');

  const proj = (lists.project || []).filter(p => p.nama).map(p => `
    <div class="item"><div class="item-head"><span>${esc(p.nama)}</span><span>${esc(p.periode || p.link ? '' : '')}</span></div>
    <div class="item-sub">${esc(p.peran)}</div>${nl2li(p.deskripsi)}
    ${p.link ? `<div class="item-sub">${esc(p.link)}</div>` : ''}</div>`).join('');

  return `
    <h1>${esc(f.nama) || 'Nama Kamu'}</h1>
    ${f.headline ? `<div class="item-sub">${esc(f.headline)}</div>` : ''}
    ${contact ? `<div class="meta">${contact}</div>` : ''}
    ${f.ringkasan ? `<h2>Profile</h2><p>${esc(f.ringkasan)}</p>` : ''}
    ${pend ? `<h2>Education</h2>${pend}` : ''}
    ${peng ? `<h2>Experience</h2>${peng}` : ''}
    ${proj ? `<h2>Projects</h2>${proj}` : ''}
    ${f.keahlian ? `<h2>Skills</h2>${tags(f.keahlian)}` : ''}
    ${f.bahasa ? `<h2>Languages</h2><p>${esc(f.bahasa)}</p>` : ''}
    ${nl2li(f.prestasi) ? `<h2>Achievements & Certifications</h2>${nl2li(f.prestasi)}` : ''}
  `;
}

function render() {
  $('#cv-paper').className = `tpl-${localStorage.getItem(TPL_KEY) || 'classic'}`;
  $('#cv-paper').innerHTML = cvHTML();
}

document.addEventListener('input', e => {
  if (e.target.closest('#cv-form')) { saveData(); render(); }
  // Sticky bar & tips: muncul begitu ada field terisi (hanya mobile via CSS)
  const sticky = document.getElementById('sticky-download');
  const hint = document.getElementById('hint-card');
  if (hint && hint.style.display === 'none') hint.style.display = '';
  if (sticky && (e.target.name === 'nama' || e.target.name === 'headline')) {
    const ada = (e.target.value || '').trim().length > 0;
    sticky.classList.toggle('show', ada);
    document.body.classList.toggle('has-sticky', ada);
  }
});
document.addEventListener('click', e => {
  if (e.target.dataset.add) {
    const key = e.target.dataset.add;
    e.target.previousElementSibling.insertAdjacentHTML('beforeend', entryHTML(key));
    saveData(); render();
  }
  if (e.target.hasAttribute('data-del')) {
    e.target.closest('.entry').remove();
    saveData(); render();
  }
  if (e.target.classList.contains('tpl-btn')) {
    const tpl = e.target.dataset.tpl;
    if (typeof PREMIUM_TEMPLATES !== 'undefined' && PREMIUM_TEMPLATES.includes(tpl) && !isPremium()) {
      showPaywall();
      return;
    }
    document.querySelectorAll('.tpl-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    localStorage.setItem(TPL_KEY, tpl);
    render();
  }
  if (e.target.classList.contains('btn-ai') || e.target.closest('.btn-ai-ringkasan')) {
    handleAiRewrite(e.target.closest('.btn-ai-ringkasan') || e.target);
  }
  if (e.target.id === 'btn-aktivasi') {
    const code = $('#aktivasi-kode').value;
    $('#aktivasi-error').classList.add('hidden');
    verifyLicense(code)
      .then(r => {
        if (r.valid) {
          localStorage.setItem(LICENSE_KEY, code.trim());
          document.querySelectorAll('.tpl-btn.locked').forEach(b => b.classList.remove('locked'));
          $('#paywall').classList.add('hidden');
          if (typeof updatePremiumBadge === 'function') updatePremiumBadge();
        } else {
          $('#aktivasi-error').textContent = r.error || 'Kode tidak valid. Cek lagi atau hubungi kami.';
          $('#aktivasi-error').classList.remove('hidden');
        }
      })
      .catch(() => {
        $('#aktivasi-error').textContent = 'Gagal memverifikasi. Cek koneksi internetmu.';
        $('#aktivasi-error').classList.remove('hidden');
      });
  }
  if (e.target.closest && e.target.closest('#btn-download, #btn-download-sticky, #btn-download-preview')) window.print();
  if (e.target.id === 'btn-scroll-preview') {
    const pv = document.getElementById('cv-preview') || document.getElementById('cv-paper');
    pv?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  if (e.target.id === 'btn-reset') {
    if (confirm('Hapus semua data CV? Tindakan ini tidak bisa dibatalkan.')) {
      localStorage.removeItem(KEY);
      location.reload();
    }
  }
  if (e.target.id === 'btn-sample' || e.target.id === 'btn-sample-top') {
    if (!confirm('Isi CV dengan contoh? Data yang sudah kamu tulis akan diganti.')) return;
    const SAMPLE = {
      fields: {
        nama: 'Rania Putri Andini',
        headline: 'Fresh Graduate — Sistem Informasi',
        email: 'rania.putri@email.com',
        telepon: '0812-3456-7890',
        linkedin: 'linkedin.com/in/raniaputri',
        kota: 'Jakarta',
        ringkasan: 'Lulusan baru Sistem Informasi dengan pengalaman magang 6 bulan di bidang data analysis. Terbiasa dengan SQL, Excel, dan visualisasi data. Siap berkontribusi di tim yang berfokus pada pengambilan keputusan berbasis data.',
        keahlian: 'SQL, Excel, Looker Studio, Python (pandas), Figma',
        bahasa: 'Indonesia (Native), Inggris (Profesional)',
        prestasi: 'Finalis Lomba Data Analysis Nasional 2023 — Top 10 dari 250 tim'
      },
      lists: {
        pendidikan: [{
          sekolah: 'Universitas Indonesia',
          gelar: 'S1 Sistem Informasi — IPK 3.65 (Cum Laude)',
          periode: '2021 – 2025'
        }],
        pengalaman: [{
          posisi: 'Magang — Data Analyst',
          organisasi: 'PT Teknologi Nusantara, Jakarta',
          periode: 'Jul – Des 2024',
          deskripsi: 'Menganalisis data penjualan 12 bulan terakhir menggunakan SQL dan Excel, menghasilkan insight yang dipakai tim marketing untuk 3 kampanye.\nMembangun dashboard visualisasi di Looker Studio yang dipakai harian oleh 15 anggota tim.\nMenyusun laporan mingguan otomatis yang menghemat 4 jam kerja manual per minggu.'
        }],
        project: [{
          nama: 'Sistem Informasi Inventaris Kampus (Skripsi)',
          peran: 'Ketua Tim — 3 orang, 2024',
          deskripsi: 'Merancang dan membangun aplikasi inventaris berbasis web untuk laboratorium fakultas.\nMengurangi waktu pencatatan stok dari 3 jam menjadi 20 menit per minggu.',
          link: 'github.com/rania/inventaris'
        }]
      }
    };
    localStorage.setItem(KEY, JSON.stringify(SAMPLE));
    location.reload();
  }
  if (e.target.id === 'btn-ats' || e.target.id === 'btn-ats-preview') {
    const { score, tips, breakdown } = atsScore();
    $('#ats-score').textContent = score;
    // Breakdown kategori: Identitas / Isi CV / Kekuatan
    const catEl = document.getElementById('ats-breakdown');
    if (catEl && breakdown) {
      catEl.innerHTML = breakdown.map(b =>
        `<div class="ats-cat"><span>${esc(b.nama)}</span><strong>${b.dapat}/${b.maks}</strong></div>`
      ).join('');
    }
    $('#ats-tips').innerHTML = tips.length
      ? tips.map(t => `<li>${esc(t)}</li>`).join('')
      : '<li>🎉 Mantap! CV-mu sudah ATS-friendly.</li>';
    $('#ats-panel').classList.remove('hidden');
    $('#ats-panel').scrollIntoView({ behavior: 'smooth' });
  }
});

document.addEventListener('change', e => {
  // handler import dihapus — tombol Backup/Import dihapus sesuai feedback pemilik.
});

function atsScore() {
  const data = loadData();
  const f = data.fields || {};
  const lists = data.lists || {};
  let score = 0;
  // QA 2026-09-29: tiap cek punya kategori & bobot utk prioritas saran
  const checks = [];
  const add = (cond, pts, tip, cat) => {
    checks.push({ cond, pts, tip, cat });
    if (cond) score += pts;
  };

  add((f.nama || '').trim().length > 2, 10, 'Lengkapi nama lengkap', 'Identitas');
  add(/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email || ''), 10, 'Tambahkan email yang valid (rekruter butuh ini)', 'Identitas');
  add((f.telepon || '').replace(/\D/g, '').length >= 9, 10, 'Tambahkan nomor telepon/WhatsApp yang valid', 'Identitas');
  add((f.linkedin || '').trim().length > 5, 5, 'Tambahkan link LinkedIn/GitHub/portofolio', 'Identitas');
  add((f.ringkasan || '').split(/\s+/).filter(Boolean).length >= 15, 15, 'Tulis ringkasan minimal 15 kata: siapa kamu & apa yang dicari', 'Isi CV');
  add((lists.pendidikan || []).some(p => (p.sekolah || '').trim()), 15, 'Tambahkan minimal 1 pendidikan', 'Isi CV');
  add((lists.pengalaman || []).some(p => (p.posisi || '').trim() || (p.organisasi || '').trim()), 15, 'Tambahkan minimal 1 pengalaman: magang, organisasi, atau kerja', 'Isi CV');
  add((f.keahlian || '').split(',').filter(s => s.trim()).length >= 3, 10, 'Sebutkan minimal 3 keahlian', 'Kekuatan');
  add((f.prestasi || '').trim().length > 10, 5, 'Tambahkan prestasi atau sertifikasi (kalau ada)', 'Kekuatan');
  add((lists.pengalaman || []).some(p => (p.deskripsi || '').split('\n').filter(l => l.trim()).length >= 2), 5, 'Di pengalaman, tulis minimal 2 poin capaian (mulai dengan kata kerja)', 'Kekuatan');

  // Breakdown per kategori: dapat / maksimum
  const CATS = ['Identitas', 'Isi CV', 'Kekuatan'];
  const breakdown = CATS.map(cat => {
    const rows = checks.filter(c => c.cat === cat);
    return {
      nama: cat,
      dapat: rows.filter(r => r.cond).reduce((s, r) => s + r.pts, 0),
      maks: rows.reduce((s, r) => s + r.pts, 0),
    };
  });

  // Saran prioritas: poin yang hilang, terbesar dulu
  const tips = checks
    .filter(c => !c.cond && c.tip)
    .sort((a, b) => b.pts - a.pts)
    .map(c => `${c.tip} (+${c.pts} poin)`);

  return { score: Math.min(score, 100), tips, breakdown };
}

// QA 2026-09-29: error kuota -> modal aksi (beli/aktivasi), bukan alert polos.
// Ganti semua `alert(err.message)` di handler AI dengan helper ini.
function showAiError(message) {
  if (/habis/i.test(message) && typeof window.__cvkitaQuotaExhausted === 'function') {
    window.__cvkitaQuotaExhausted();
    return;
  }
  alert(message);
}

async function handleAiRewrite(btn) {
  // Tombol AI ringkasan: rewrite field ringkasan dari data yang sudah diisi
  if (btn.id === 'btn-ai-ringkasan') {
    if (!isPremium()) { showPaywall(); return; }
    const ta = document.querySelector('[name="ringkasan"]');
    const nama = (document.querySelector('[name="nama"]')?.value || '').trim();
    const headline = (document.querySelector('[name="headline"]')?.value || '').trim();
    const btnLabel = btn.innerHTML;
    btn.innerHTML = '⏳ Menulis ulang...';
    btn.disabled = true;
    try {
      const { result } = await aiRewrite({
        mode: 'ringkasan',
        posisi: headline,
        organisasi: nama,
        deskripsi: ta.value,
      });
      ta.value = result;
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      btn.innerHTML = '✓ Ditingkatkan';
    } catch (err) {
      showAiError(err.message);
      btn.innerHTML = btnLabel;
    } finally {
      btn.disabled = false;
    }
    return;
  }
  if (!isPremium()) { showPaywall(); return; }
  const entry = btn.closest('.entry');
  const posisi = entry.querySelector('[name="pengalaman.posisi"]')?.value || '';
  const organisasi = entry.querySelector('[name="pengalaman.organisasi"]')?.value || '';
  const deskripsi = entry.querySelector('[name="pengalaman.deskripsi"]')?.value || '';

  const btnLabel = btn.textContent;
  btn.textContent = '⏳ Menulis ulang...';
  btn.disabled = true;
  try {
    const { result } = await aiRewrite({ posisi, organisasi, deskripsi });
    const ta = entry.querySelector('[name="pengalaman.deskripsi"]');
    ta.value = result;
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    btn.textContent = '✓ Ditingkatkan';
  } catch (err) {
    showAiError(err.message);
    btn.textContent = btnLabel;
  } finally {
    btn.disabled = false;
  }
}

// Init
(function init() {
  // QA 2026-09-29: auto-aktivasi dari pay.html (?kode=CVK-...) — user tidak perlu
  // menyalin kode manual setelah bayar.
  try {
    const urlKode = new URLSearchParams(location.search).get('kode');
    if (urlKode && /^[A-Z0-9-]{8,40}$/i.test(urlKode)) {
      localStorage.setItem(LICENSE_KEY, urlKode.trim().toUpperCase());
      history.replaceState(null, '', location.pathname);
    }
  } catch { /* URLSearchParams tidak tersedia */ }
  const data = loadData();
  Object.keys(SECTIONS).forEach(k => renderList(k, (data.lists && data.lists[k]) || [{}]));
  Object.entries(data.fields || {}).forEach(([n, v]) => {
    const el = $('#cv-form').querySelector(`[name="${n}"]`);
    if (el) el.value = v;
  });
  const tpl = localStorage.getItem(TPL_KEY) || 'classic';
  document.querySelector(`.tpl-btn[data-tpl="${tpl}"]`)?.classList.add('active');
  render();
})();

/* ===== Menu overflow mobile (⋯) =====
   Tombol menu menjalankan aksi tombol aslinya; klik luar menutup. */
(function () {
  const more = document.getElementById('btn-more');
  const menu = document.getElementById('more-menu');
  if (!more || !menu) return;

  function close() { menu.classList.add('hidden'); more.setAttribute('aria-expanded', 'false'); }

  more.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = menu.classList.toggle('hidden');
    more.setAttribute('aria-expanded', String(!open));
  });
  document.addEventListener('click', (e) => {
    if (!menu.classList.contains('hidden') && !menu.contains(e.target) && e.target !== more) close();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  // Pemetaan tombol menu -> aksi tombol header asli (klik tombolnya)
  const map = { 'mm-sample': 'btn-sample', 'mm-ats': 'btn-ats', 'mm-reset': 'btn-reset' };
  for (const [mmId, targetId] of Object.entries(map)) {
    const src = document.getElementById(mmId);
    const target = () => document.getElementById(targetId);
    if (!src) continue;
    src.addEventListener('click', () => { close(); target()?.click(); });
  }
})();
