## 2026-10-12 - Missing Aria Labels on Dynamic Inputs
**Learning:** Dynamic input fields generated using vanilla JS (such as `entryHTML` for repeatable sections in `js/app.js`) missed implicit labeling as they lacked explicit `<label>` tags and did not have `aria-label` attributes.
**Action:** Always ensure dynamic inputs that rely solely on `placeholder` attributes include `aria-label` populated with the same text to maintain screen reader accessibility. Check audit tools (e.g. `tests/ui-audit-metrics.spec.js`) for validation.
