## 2026-10-23 - Dynamically Generated Input Accessibility
**Learning:** In vanilla JS apps, form fields generated purely via template strings (like in `js/app.js`) often lack explicit `<label>` tags and rely on placeholders. This fails accessibility audits as screen readers cannot identify the fields.
**Action:** When dynamically constructing inputs/textareas without dedicated labels, always ensure `aria-label` attributes are added, typically mirroring the `placeholder` text or explicitly stating the field's purpose.
