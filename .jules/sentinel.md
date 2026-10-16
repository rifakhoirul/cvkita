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

## 2026-10-16 - [Fix Stored XSS in dynamic form generation]
**Vulnerability:** A Stored XSS vulnerability in `js/app.js`'s `entryHTML` function directly embedded user inputs from localStorage (`data[f.n]`) into innerHTML/template strings for inputs and textareas. This allowed injection of quotes and angle brackets to break out of attributes and insert executable XSS payloads (e.g. `"><script>alert(1)</script>`).
**Learning:** Dynamic generation of HTML elements through template literals without sanitization creates critical Stored XSS attack surfaces, particularly for CV builders where users commonly insert quotes or brackets in text.
**Prevention:** Always wrap dynamically inserted variables in an escaping function (e.g., `esc(data[f.n] || '')`) before concatenating them into HTML strings.
