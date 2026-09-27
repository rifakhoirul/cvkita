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
  if (e.target.id === 'btn-reset') {
    if (confirm('Hapus semua data CV? Tindakan ini tidak bisa dibatalkan.')) {
      localStorage.removeItem(KEY);
      location.reload();
    }
  }
  if (e.target.id === 'btn-export') {
    const blob = new Blob([localStorage.getItem(KEY) || '{}'], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'cvkita-backup.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }
  if (e.target.id === 'btn-ats') {
    const { score, tips } = atsScore();
    $('#ats-score').textContent = score;
    $('#ats-tips').innerHTML = tips.length
      ? tips.map(t => `<li>${esc(t)}</li>`).join('')
      : '<li>🎉 Mantap! CV-mu sudah ATS-friendly.</li>';
    $('#ats-panel').classList.remove('hidden');
    $('#ats-panel').scrollIntoView({ behavior: 'smooth' });
  }
});

document.addEventListener('change', e => {
  if (e.target.id === 'file-import') {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data || typeof data !== 'object') throw new Error('format');
        localStorage.setItem(KEY, JSON.stringify(data));
        location.reload();
      } catch {
        alert('File tidak valid. Gunakan file backup (.json) dari CVKita.');
      }
    };
    reader.readAsText(file);
  }
});

function atsScore() {
  const data = loadData();
  const f = data.fields || {};
  const lists = data.lists || {};
  let score = 0;
  const tips = [];
  const add = (cond, pts, tip) => { if (cond) score += pts; else if (tip) tips.push(tip); };

  add((f.nama || '').trim().length > 2, 10, 'Lengkapi nama lengkap');
  add(/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email || ''), 10, 'Tambahkan email yang valid (rekruter butuh ini)');
  add((f.telepon || '').replace(/\D/g, '').length >= 9, 10, 'Tambahkan nomor telepon/WhatsApp yang valid');
  add((f.ringkasan || '').split(/\s+/).filter(Boolean).length >= 15, 15, 'Tulis ringkasan minimal 15 kata: siapa kamu & apa yang dicari');
  add((lists.pendidikan || []).some(p => (p.sekolah || '').trim()), 15, 'Tambahkan minimal 1 pendidikan');
  add((lists.pengalaman || []).some(p => (p.posisi || '').trim() || (p.organisasi || '').trim()), 15, 'Tambahkan minimal 1 pengalaman: magang, organisasi, atau kerja');
  add((f.keahlian || '').split(',').filter(s => s.trim()).length >= 3, 10, 'Sebutkan minimal 3 keahlian');
  add((f.linkedin || '').trim().length > 5, 5, 'Tambahkan link LinkedIn/GitHub/portofolio');
  add((f.prestasi || '').trim().length > 10, 5, 'Tambahkan prestasi atau sertifikasi (kalau ada)');
  add((lists.pengalaman || []).some(p => (p.deskripsi || '').split('\n').filter(l => l.trim()).length >= 2), 5, 'Di pengalaman, tulis minimal 2 poin capaian (mulai dengan kata kerja)');

  return { score: Math.min(score, 100), tips };
}

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
