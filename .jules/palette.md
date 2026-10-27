## 2026-10-27 - Missing aria-labels in dynamically generated form elements
**Learning:** In dynamically generated fields (e.g., using `innerHTML` to create lists of inputs), relying solely on `placeholder` attributes is insufficient for screen readers. They need explicit `<label>` or `aria-label` attributes to be properly announced.
**Action:** When writing dynamic UI construction logic, ensure an `aria-label` attribute is explicitly added to `<input>` and `<textarea>` elements if they are not explicitly wrapped in `<label>` tags.
