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

  // Render CV dari data form langsung ke PDF (layout 1 kolom ATS-safe, A4)
  async function buildPdf() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const W = 595, M = 48;
    let y = M;
    const line = (txt, size, bold, color) => {
      if (!txt) return;
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setFontSize(size);
      if (color) doc.setTextColor(color); else doc.setTextColor(30, 30, 30);
      const lines = doc.splitTextToSize(txt, W - M * 2);
      lines.forEach(l => {
        if (y > 790) { doc.addPage(); y = M; }
        doc.text(l, M, y);
        y += size * 1.45;
      });
    };
    const val = n => (document.querySelector(`[name="${n}"]`)?.value || '').trim();

    line(val('nama'), 20, true);
    line(val('headline'), 11, false, 90);
    const kontak = [val('email'), val('phone'), val('city')].filter(Boolean).join('  ·  ');
    line(kontak, 9, false, 110);
    if (val('link')) line(val('link'), 9, false, 110);
    y += 10;
    doc.setDrawColor(220); doc.line(M, y, W - M, y); y += 18;

    const section = t => { y += 6; line(t.toUpperCase(), 11, true, 20); y += 2; doc.setDrawColor(230); doc.line(M, y, W - M, y); y += 12; };
    section('Ringkasan'); line(val('ringkasan'), 10);
    section('Keahlian'); line(val('keahlian'), 10);
    if (val('bahasa')) section('Bahasa'), line(val('bahasa'), 10);

    const lists = ['pendidikan', 'pengalaman', 'project'];
    const titles = { pendidikan: 'Pendidikan', pengalaman: 'Pengalaman', project: 'Project & Portofolio' };
    lists.forEach(key => {
      const entries = [...document.querySelectorAll(`#${key}-list .entry`)].map(e => {
        const o = {};
        e.querySelectorAll('[name]').forEach(i => { o[i.name.split('.')[1]] = i.value.trim(); });
        return o;
      }).filter(o => Object.values(o).some(v => v));
      if (!entries.length) return;
      section(titles[key]);
      entries.forEach(en => {
        const head = [en.posisi || en.sekolah || en.nama, en.organisasi || en.gelar || en.peran, en.periode].filter(Boolean).join(' — ');
        line(head, 10.5, true);
        if (en.detail) line(en.detail, 10);
        (en.deskripsi || '').split('\n').filter(Boolean).forEach(b => line('• ' + b, 10));
        if (en.link) line(en.link, 9, false, 110);
        y += 6;
      });
    });
    if (val('prestasi')) { section('Prestasi & Sertifikasi'); val('prestasi').split('\n').filter(Boolean).forEach(p => line('• ' + p, 10)); }
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
