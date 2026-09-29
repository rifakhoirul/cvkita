// Audit UI/UX terukur — hitung metrik dari DOM nyata (tanpa mata manusia).
// Output: JSON lengkap ke /tmp/ui-audit/report.json
import { test, expect } from '@playwright/test';
import fs from 'fs';

const OUT = process.env.UI_AUDIT_OUT || '/tmp/ui-audit';
fs.mkdirSync(OUT, { recursive: true }); // CI tidak punya folder ini — jangan ENOENT

// Alat audit manual (bukan test produk) — skip di CI
if (process.env.CI) test.skip(true, 'audit tool hanya untuk lokal');

const AUDIT_JS = `(() => {
  const parseColor = (c) => {
    const m = c.match(/rgba?\\(([^)]+)\\)/);
    if (!m) return null;
    const p = m[1].split(',').map(s => parseFloat(s.trim()));
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const lum = ({ r, g, b }) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const contrast = (fg, bg) => {
    const L1 = lum(fg), L2 = lum(bg);
    return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
  };
  const bgOf = (el) => {
    let n = el;
    while (n && n !== document.documentElement) {
      const c = parseColor(getComputedStyle(n).backgroundColor);
      if (c && c.a > 0.85) return c;
      n = n.parentElement;
    }
    return { r: 255, g: 255, b: 255, a: 1 };
  };

  const result = { url: location.pathname, contrast: [], touch: [], headings: [], overflow: null, inputs: [], focus: [], misc: [] };

  // 1. Kontras teks (elemen dengan teks langsung)
  const textEls = [...document.querySelectorAll('p,span,a,li,h1,h2,h3,h4,label,button,strong,em,small,div')]
    .filter(el => el.children.length === 0 && (el.textContent || '').trim().length > 1 && el.offsetParent !== null);
  const seen = new Set();
  textEls.forEach(el => {
    const cs = getComputedStyle(el);
    const fg = parseColor(cs.color);
    if (!fg) return;
    const size = parseFloat(cs.fontSize);
    const weight = parseInt(cs.fontWeight) || 400;
    const bg = bgOf(el);
    const ratio = contrast(fg, bg);
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const req = large ? 3 : 4.5;
    const key = cs.color + '|' + Math.round(size) + '|' + (el.className || '').slice(0, 30);
    if (seen.has(key)) return;
    seen.add(key);
    if (ratio < req) {
      result.contrast.push({
        text: (el.textContent || '').trim().slice(0, 45),
        cls: (el.className || '').toString().slice(0, 40),
        size, weight, color: cs.color, bg: \`rgb(\${bg.r},\${bg.g},\${bg.b})\`,
        ratio: Math.round(ratio * 100) / 100, required: req,
        level: ratio < req - 1.5 ? 'FAIL' : 'WARN',
      });
    }
  });

  // 2. Touch target (<44px)
  const clickable = [...document.querySelectorAll('button,a,input[type=checkbox],select,[role=button]')]
    .filter(el => el.offsetParent !== null);
  const seenT = new Set();
  clickable.forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    const id = el.id || (el.className || '').toString().slice(0, 30) || el.tagName;
    if (seenT.has(id)) return;
    seenT.add(id);
    if (r.height < 44 || r.width < 44) {
      result.touch.push({
        id, tag: el.tagName, text: (el.textContent || '').trim().slice(0, 30),
        w: Math.round(r.width), h: Math.round(r.height),
      });
    }
  });

  // 3. Hierarki heading
  const hs = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(h => h.offsetParent !== null);
  let prev = 0;
  hs.forEach(h => {
    const lvl = parseInt(h.tagName[1]);
    result.headings.push({ lvl, jump: prev && lvl > prev + 1, text: (h.textContent || '').trim().slice(0, 40) });
    prev = lvl;
  });

  // 4. Overflow horizontal
  result.overflow = {
    docWidth: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
    scrolls: document.documentElement.scrollWidth > window.innerWidth + 2,
    offenders: [...document.querySelectorAll('body *')]
      .filter(el => el.offsetParent !== null && el.getBoundingClientRect().right > window.innerWidth + 2)
      .slice(0, 8)
      .map(el => ({ tag: el.tagName, cls: (el.className || '').toString().slice(0, 35), right: Math.round(el.getBoundingClientRect().right) })),
  };

  // 5. Input tanpa label/aria
  [...document.querySelectorAll('input,textarea,select')].filter(el => el.offsetParent !== null).forEach(el => {
    const id = el.id;
    const hasLabel = (id && document.querySelector(\`label[for="\${id}"]\`)) || el.closest('label') || el.getAttribute('aria-label');
    if (!hasLabel) result.inputs.push({ name: el.name || el.id || el.type, placeholder: (el.placeholder || '').slice(0, 30) });
  });

  // 6. Gambar tanpa alt / tombol ikon tanpa aria-label
  [...document.querySelectorAll('img')].filter(i => !i.hasAttribute('alt')).forEach(i => result.misc.push('img tanpa alt: ' + (i.src || '').slice(-30)));
  [...document.querySelectorAll('button')].filter(b => b.offsetParent !== null && !(b.textContent || '').trim() && !b.getAttribute('aria-label')).forEach(b => result.misc.push('tombol ikon tanpa aria-label: ' + (b.id || b.className).slice(0, 30)));

  // 7. Focus outline
  const sample = [...document.querySelectorAll('button,a,input')].filter(el => el.offsetParent !== null).slice(0, 20);
  result.focus = {
    checked: sample.length,
    noneCount: sample.filter(el => getComputedStyle(el).outlineStyle === 'none' && !el.matches(':focus-visible')).length,
  };

  return result;
})()`;

for (const target of [
  { path: '/', name: 'home' },
  { path: '/pay.html', name: 'pay' },
  { path: '/blog/', name: 'blog' },
  { path: '/terms.html', name: 'terms' },
]) {
  test(`audit ${target.name} (desktop)`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(target.path);
    await page.waitForLoadState('networkidle');
    const data = await page.evaluate(AUDIT_JS);
    fs.writeFileSync(`${OUT}/report-${target.name}-desktop.json`, JSON.stringify(data, null, 2));
    expect(true).toBe(true);
  });

  test(`audit ${target.name} (mobile)`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(target.path);
    await page.waitForLoadState('networkidle');
    const data = await page.evaluate(AUDIT_JS);
    fs.writeFileSync(`${OUT}/report-${target.name}-mobile.json`, JSON.stringify(data, null, 2));
    expect(true).toBe(true);
  });
}
