# 🛡️ Sentinel Security Journal

This document serves as a repository for tracking security vulnerabilities, their root causes, and the applied fixes within the CVKita codebase. It is intended to help developers recognize patterns, avoid recurring issues, and build more secure software.

## 2026-10-20 - Missing output encoding in dynamic form element rendering
**Vulnerability:** Cross-Site Scripting (XSS) in js/app.js (entryHTML). Unsanitized localStorage data was concatenated into HTML template literals to construct textarea body contents and input value attributes, and rendered via innerHTML.
**Learning:** Even if data isn't rendered directly to the CV document, rendering it into the HTML structure of form elements dynamically can lead to XSS. This emphasizes the need to sanitize data explicitly upon *rendering* form components, especially when values are persisted across reloads.
**Prevention:** Apply the application's esc() function to all user data inputs, even inside template literal attributes and inner content, before they are processed by innerHTML.

## 📝 Vulnerability Log

### Incomplete HTML Escaping in JS
- **Date Fixed**: 2024-XX-XX
- **Location**: `js/improve-all.js`
- **Vulnerability**: Cross-Site Scripting (XSS)
- **Description**: The `esc` function used to sanitize strings before inserting them into `innerHTML` failed to escape single quotes (`'`).
- **Risk**: An attacker could inject malicious scripts by crafting inputs that break out of HTML attributes using single quotes.
- **Fix**: Updated the regular expression to include the single quote (`/[&<>"'/]/g`) and added a mapping for the single quote to its HTML entity `&#39;` in the replacement object.
- **Lesson Learned**: Always use comprehensive escaping functions that cover all critical characters (`&`, `<`, `>`, `"`, `'`, `/`) when dynamically generating HTML strings to prevent XSS.

- When writing custom HTML escaping functions, always ensure single quotes are escaped (`&#39;`) to prevent attribute-based XSS when attributes are wrapped in single quotes.
