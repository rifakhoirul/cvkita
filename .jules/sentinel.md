## Security Learnings\n\n- When writing custom HTML escaping functions, always ensure single quotes are escaped (`&#39;`) to prevent attribute-based XSS when attributes are wrapped in single quotes.
