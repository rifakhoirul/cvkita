## 2026-10-01 - [Added Focus Visible States for Secondary Buttons]
**Learning:** Only `.btn.primary` had explicit `:focus-visible` styles, while secondary buttons like `.btn.ghost`, `.btn.add`, `.btn.del`, and `.btn.danger` were relying on browser defaults. Explicit `:focus-visible` styling is a great micro-UX win that significantly improves keyboard navigation accessibility while not affecting mouse users.
**Action:** Always check secondary and ghost variations of buttons to ensure they inherit or explicitly define their own accessible focus states alongside primary buttons.
