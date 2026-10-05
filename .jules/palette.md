## 2023-10-24 - Missing focus-visible states on secondary buttons
**Learning:** Keyboard navigation was missing clear visual focus indicators on secondary (.btn.ghost) and paywall close buttons (.paywall-close), making it difficult for keyboard users to track their position.
**Action:** Always ensure that every interactive element has a visible focus state, particularly for keyboard navigation using `:focus-visible`.
