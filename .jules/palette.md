## 2026-10-31 - Missing Aria Labels on Dynamically Generated Inputs
**Learning:** Dynamically constructed form elements that do not use `<label>` tags (such as those generated inside `js/app.js` using placeholders) fail accessibility audits because they lack accessible names. Relying solely on `placeholder` attributes is insufficient for screen readers.
**Action:** Always include an explicit `aria-label` attribute (e.g., using the same text as the placeholder) when dynamically creating `<input>` and `<textarea>` elements if an explicit `<label>` element is missing.
