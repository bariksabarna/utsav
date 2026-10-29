# Security (Detailed)

## Security Controls

### Implemented
- No secrets in repository
- Environment variables excluded via `.gitignore`
- Input validation on forms
- Secure external links with `rel="noopener noreferrer"`
- No use of `dangerouslySetInnerHTML`

### Planned (Later Phases)
- Helmet.js for HTTP headers
- Content Security Policy (CSP)
- Rate limiting
- CORS restrictions
- Gemini API key in Secret Manager
- Firestore security rules
- Prompt injection protection
- OWASP LLM Top 10 mitigations

## Reporting
Report security issues responsibly per `SECURITY.md`.
