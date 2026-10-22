## 2026-10-22 - Missing ARIA labels on dynamic input fields
**Learning:** Dynamically constructed form elements in `js/app.js` using placeholder-only labeling violate accessibility guidelines because screen readers do not treat placeholders as reliable labels.
**Action:** Always include an explicit `aria-label` attribute on `<input>` and `<textarea>` elements constructed dynamically via template strings if a traditional `<label>` tag is omitted.
