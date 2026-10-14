## Security Learnings

- When writing custom HTML escaping functions, always ensure single quotes are escaped (`&#39;`) to prevent attribute-based XSS when attributes are wrapped in single quotes.

## 2026-10-14 - Fix unescaped HTML attribute injection in entryHTML

**Vulnerability:** XSS vulnerability in `js/app.js` where user input was interpolated directly into HTML strings for `<textarea>` and `<input>` elements without escaping.

**Learning:** When generating HTML strings programmatically, all user-supplied data must be safely escaped before being inserted into the DOM. This includes values inside HTML attributes, such as `value` or `placeholder`.

**Prevention:** Use an HTML escaping function (like `esc()`) to sanitize all dynamic user inputs in template literals.
