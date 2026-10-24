## 2026-10-24 - Dynamic Form Fields Missing Aria-Labels
**Learning:** In dynamically constructed form elements (e.g., in `js/app.js`), if an explicit `<label>` tag is missing, UI accessibility audits will fail unless an `aria-label` attribute is added.
**Action:** Always include an `aria-label` attribute on inputs and textareas that lack an explicit `<label>` tag, especially those generated dynamically in JS.
