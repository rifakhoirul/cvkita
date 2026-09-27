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
  return `<div class="entry" data-key="${key}">${fields}<button type="button" class="btn del" data-del>Hapus</button></div>`;
}

function renderList(key, items = [{}]) {
  $(`#${key}-list`).innerHTML = items.map(d => entryHTML(key, d)).join('');
}
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
  if (e.target.id === 'btn-template') $('#template-panel').classList.toggle('hidden');
  if (e.target.classList.contains('tpl-btn')) {
    document.querySelectorAll('.tpl-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    localStorage.setItem(TPL_KEY, e.target.dataset.tpl);
    render();
  }
  if (e.target.id === 'btn-download') window.print();
});

// Init
(function init() {
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
