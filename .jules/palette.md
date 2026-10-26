## 2026-10-26 - Accessibility improvements for dynamic form fields
**Learning:** Dynamically injected form elements constructed via template literals lacking an explicit `<label>` element must ensure accessibility via an `aria-label` attribute, as placeholders alone are insufficient for screen readers.
**Action:** When creating form inputs via JavaScript template strings, verify if a `<label>` exists and append an `aria-label` appropriately if it does not.
