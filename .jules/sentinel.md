<<<<<<< HEAD
## Security Learnings\n\n- When writing custom HTML escaping functions, always ensure single quotes are escaped (`&#39;`) to prevent attribute-based XSS when attributes are wrapped in single quotes.
=======
# 🛡️ Sentinel Security Journal

This document serves as a repository for tracking security vulnerabilities, their root causes, and the applied fixes within the CVKita codebase. It is intended to help developers recognize patterns, avoid recurring issues, and build more secure software.

## 📝 Vulnerability Log

### Incomplete HTML Escaping in JS
- **Date Fixed**: 2024-XX-XX
- **Location**: `js/improve-all.js`
- **Vulnerability**: Cross-Site Scripting (XSS)
- **Description**: The `esc` function used to sanitize strings before inserting them into `innerHTML` failed to escape single quotes (`'`).
- **Risk**: An attacker could inject malicious scripts by crafting inputs that break out of HTML attributes using single quotes.
- **Fix**: Updated the regular expression to include the single quote (`/[&<>"'/]/g`) and added a mapping for the single quote to its HTML entity `&#39;` in the replacement object.
- **Lesson Learned**: Always use comprehensive escaping functions that cover all critical characters (`&`, `<`, `>`, `"`, `'`, `/`) when dynamically generating HTML strings to prevent XSS.
>>>>>>> e3a2c75 (🔒 Fix incomplete HTML escaping in improve-all.js)
## 2026-10-09 - Stored XSS in dynamic form generation
**Vulnerability:** User data from `localStorage` (`data[f.n]`) was injected directly into template strings for form fields in `js/app.js` (`entryHTML` function) without sanitization. This allowed attackers to craft malicious payloads (e.g., via imported JSON/PDF or shared localStorage) that execute arbitrary scripts when the CV forms render.
**Learning:** Even though the core output of the CV (`cvHTML`) used an escape function (`esc`), the interactive form fields (`entryHTML`) used `innerHTML` string interpolation without any escaping. The assumption that form inputs are inherently safe because they only populate `value` attributes is false. Data from `localStorage` must always be treated as untrusted, especially since it can be manipulated by third parties via the CV import feature.
**Prevention:** Always use the local `esc()` function when interpolating any user-provided data into HTML strings, even for form inputs (`value="${esc(data[f.n])}"`) or textareas (`<textarea>${esc(data[f.n])}</textarea>`).
