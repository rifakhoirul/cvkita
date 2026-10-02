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

### Unescaped Dynamic HTML Generation
- **Date Fixed**: 2026-10-02
- **Location**: `js/app.js` (`entryHTML` function)
- **Vulnerability**: Cross-Site Scripting (XSS)
- **Description**: Form field values (`data[f.n]`) retrieved from `localStorage` were interpolated directly into the HTML string returned by `entryHTML` (for both `<input>` values and `<textarea>` content) without being passed through the `esc()` sanitization function.
- **Risk**: An attacker could craft a malicious CV payload that injects script tags or escapes double quotes to execute arbitrary JavaScript when the app renders the UI. This is particularly dangerous for features like "Import CV," where AI-extracted PDF data is directly saved to state and rendered.
- **Fix**: Wrapped all dynamic data interpolations inside `entryHTML` with the existing `esc()` function (e.g., `esc(data[f.n] || '')`).
- **Lesson Learned**: Every single dynamic value interpolated into an HTML string that is eventually set via `innerHTML` must be escaped, regardless of whether the source is considered "local" or "trusted".
