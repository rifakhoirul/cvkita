// Kirim PDF CV asli ke WhatsApp (Web Share API level 2).
// Prioritas: navigator.share({files:[pdf]}) → WA menerima file CV asli.
// Fallback: unduh PDF + buka wa.me dengan teks (browser lama/desktop).
// PDF dibuat 100% di browser (jsPDF) — data CV TIDAK dikirim ke server.
(function () {
  const btn = document.getElementById('btn-share-pdf');
  const status = document.getElementById('share-pdf-status');
  if (!btn) return;

  function setStatus(msg) {
    if (!status) return;
    status.textContent = msg || '';
    status.classList.toggle('hidden', !msg);
  }

  function slug(nama) {
    return (nama || 'CV').trim().replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'CV';
  }

  // Render CV ke PDF (A4, 1 kolom, ATS-safe). Layout diset mendekati template cetak browser:
  // nama besar, garis pemisah section, meta abu-abu, bullet berindentasi, page break otomatis.
  async function buildPdf() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const W = 595.28, H = 841.89, M = 50, CW = W - M * 2;
    let y = M;
    const GRAY = 110, INK = 26, ACCENT = [230, 88, 25];
    const ensure = h => { if (y + h > H - M) { doc.addPage(); y = M; } };
    const para = (txt, size, { bold = false, color = null, indent = 0, lh = 1.42, gap = 0 } = {}) => {
      if (!txt) return;
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setFontSize(size);
      doc.setTextColor(color ? color[0] : INK, color ? color[1] : INK, color ? color[2] : INK);
      const lines = doc.splitTextToSize(String(txt), CW - indent);
      lines.forEach(l => {
        ensure(size * lh);
        doc.text(l, M + indent, y);
        y += size * lh;
      });
      y += gap;
    };
    const rule = (color = [225, 225, 225], w = 0.8, gap = 10) => {
      ensure(4);
      doc.setDrawColor(color[0], color[1], color[2]);
      doc.setLineWidth(w);
      doc.line(M, y, W - M, y);
      y += gap;
    };
    const val = n => (document.querySelector(`[name="${n}"]`)?.value || '').trim();

    // ——— Header ———
    doc.setFont('helvetica', 'bold'); doc.setFontSize(22); doc.setTextColor(INK, INK, INK);
    const namaLines = doc.splitTextToSize(val('nama') || 'Nama Kamu', CW);
    namaLines.forEach(l => { ensure(26); doc.text(l, M, y); y += 25; });
    if (val('headline')) para(val('headline'), 11.5, { color: ACCENT, gap: 4 });
    const kontak = [val('email'), val('phone'), val('city')].filter(Boolean).join('   ·   ');
    if (kontak) para(kontak, 9.5, { color: [GRAY, GRAY, GRAY], gap: 2 });
    if (val('link')) para(val('link'), 9.5, { color: [GRAY, GRAY, GRAY], gap: 2 });
    y += 6; rule([210, 210, 210], 1, 16);

    // ——— Section ———
    const section = t => {
      ensure(34);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(INK, INK, INK);
      doc.text(String(t).toUpperCase(), M, y);
      y += 6; rule([230, 230, 230], 0.8, 12);
    };
    const bullets = txt => (txt || '').split('\n').map(s => s.trim()).filter(Boolean)
      .forEach(b => para('•  ' + b, 10, { indent: 6, lh: 1.45, gap: 1 }));

    if (val('ringkasan')) { section('Profile'); para(val('ringkasan'), 10.5, { lh: 1.5, gap: 8 }); }
    if (val('keahlian')) { section('Skills'); para(val('keahlian'), 10.5, { lh: 1.5, gap: 8 }); }
    if (val('bahasa')) { section('Languages'); para(val('bahasa'), 10.5, { lh: 1.5, gap: 8 }); }

    const groups = [
      ['pendidikan', 'Education', e => [e.sekolah, e.gelar], e => e.periode],
      ['pengalaman', 'Experience', e => [e.posisi, e.organisasi], e => e.periode],
      ['project', 'Projects', e => [e.nama, e.peran], e => e.link],
    ];
    groups.forEach(([key, title, headFn, metaFn]) => {
      const entries = [...document.querySelectorAll(`#${key}-list .entry`)].map(e => {
        const o = {};
        e.querySelectorAll('[name]').forEach(i => { o[i.name.split('.')[1]] = i.value.trim(); });
        return o;
      }).filter(o => Object.values(o).some(v => v));
      if (!entries.length) return;
      section(title);
      entries.forEach(en => {
        const head = headFn(en).filter(Boolean).join(' — ');
        const meta = (metaFn(en) || '').trim();
        if (head) para(head, 11, { bold: true, gap: 1 });
        if (meta) para(meta, 9.5, { color: [GRAY, GRAY, GRAY], gap: 1 });
        if (en.detail) para(en.detail, 10.5, { lh: 1.45, gap: 1 });
        bullets(en.deskripsi);
        y += 7;
      });
    });
    if (val('prestasi')) { section('Achievements & Certifications'); bullets(val('prestasi')); }

    // Nomor halaman
    const pages = doc.getNumberOfPages();
    for (let p = 1; p <= pages; p++) {
      doc.setPage(p);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(150, 150, 150);
      doc.text(`Halaman ${p} dari ${pages}`, W - M, H - 24, { align: 'right' });
    }
    return doc.output('blob');
  }

  btn.addEventListener('click', async () => {
    setStatus('Mempersiapkan PDF…');
    btn.disabled = true;
    try {
      const blob = await buildPdf();
      const nama = (document.querySelector('[name="nama"]')?.value || '').trim();
      const file = new File([blob], `CV-${slug(nama)}.pdf`, { type: 'application/pdf' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `CV ${nama}`,
          text: 'CV saya — dibuat gratis di CVKita',
        });
        setStatus('');
      } else {
        // Fallback: unduh PDF, lalu user lampirkan manual
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = file.name; a.click();
        URL.revokeObjectURL(url);
        setStatus('PDF diunduh — lampirkan manual kalau mau kirim via WhatsApp 📎');
      }
    } catch (e) {
      if (e && e.name === 'AbortError') { setStatus(''); } // user batal share
      else setStatus('Gagal membuat PDF. Coba tombol Unduh PDF.');
    } finally {
      btn.disabled = false;
    }
  });
})();
