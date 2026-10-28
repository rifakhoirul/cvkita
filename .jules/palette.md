## 2026-10-28 - Missing ARIA Labels on Dynamic Inputs
**Learning:** Dynamically created inputs in `js/app.js` were missing `aria-label`s, causing them to fail accessibility UI audits because screen readers cannot rely solely on the `placeholder` attribute.
**Action:** Ensure all dynamically generated form fields include an explicit `aria-label` attribute if they do not have a `<label>`.
