## 2026-10-18 - Missing ARIA Labels in Dynamic Form Elements
**Learning:** Dynamically generated form elements (inputs and textareas) in this application (specifically in `js/app.js`) lack proper `<label>` associations and `aria-label` attributes. Relying solely on placeholders is insufficient for accessibility audits.
**Action:** When working with dynamic element creation in the DOM, always ensure `aria-label` attributes are injected (e.g., using the `f.p` placeholder string) if a true `<label>` is not possible.
