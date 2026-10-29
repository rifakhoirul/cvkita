## 2026-10-29 - Missing aria-labels in dynamically generated forms
**Learning:** Dynamically generated input and textarea fields in `js/app.js` lack explicit `<label>` associations or `aria-label` attributes, relying solely on placeholders. This fails accessibility audits as screen readers struggle to announce the field purpose correctly.
**Action:** Always ensure that dynamically constructed form elements include an `aria-label` attribute if an explicit `<label>` tag cannot be easily associated.
