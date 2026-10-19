## 2026-10-19 - Added aria-labels to dynamically constructed inputs
**Learning:** Dynamically constructed form elements that miss an explicit `<label>` tag fail accessibility audits even with `placeholder` attributes. They require `aria-label` attributes to pass.
**Action:** When creating text inputs and textareas dynamically without corresponding labels, always add `aria-label` attribute copying the `placeholder` content.
