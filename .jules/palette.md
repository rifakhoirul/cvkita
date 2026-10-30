## 2026-10-30 - Fix Missing Labels in Dynamic Form Elements
**Learning:** Dynamically added form elements (`input`, `textarea`) in repeated lists (like education, experience) lacked accessible names (`aria-label`), which caused accessibility audit failures for screen readers. Using `placeholder` alone is insufficient for proper accessibility.
**Action:** Always ensure that dynamically generated inputs and textareas include an `aria-label` attribute if an explicit `<label>` tag is missing to maintain accessibility standards.
