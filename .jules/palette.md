## 2026-10-11 - Improve contrast on #pay-status text
**Learning:** The `#059669` emerald green color used for success status messages had a contrast ratio of ~3.76 against white backgrounds, failing WCAG AA 4.5:1 requirements.
**Action:** Changed to a darker shade `#047857` (emerald-700) to ensure readability for visually impaired users. When changing CSS, make sure to also update inline color manipulation in JS logic and increment cache busting.
