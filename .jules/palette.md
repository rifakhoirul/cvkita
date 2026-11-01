## 2026-11-01 - [Add Aria Label to dynamic form element]
**Learning:** Dynamic elements created by js/app.js doesn't have an aria-label, which makes the app non-compliant to accessibility standards.
**Action:** Adding an aria-label using the existing `p` property inside `SECTIONS` provides the placeholder text as an aria-label.
