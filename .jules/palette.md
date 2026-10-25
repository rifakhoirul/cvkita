## 2026-10-25 - Dynamically constructed inputs need explicit labels
**Learning:** Dynamically constructed form elements (e.g., in `js/app.js`) were failing accessibility audits because they lacked an explicit `<label>` tag or an `aria-label` attribute, relying only on `placeholder` attributes.
**Action:** When dynamically generating inputs, always ensure they include an `aria-label` attribute corresponding to their placeholder or description to maintain accessibility and pass UI metrics tests.
