# Authentication — Summary

This file consolidates authentication-related documentation for the project. It describes the design and configuration names; it does NOT contain step-by-step operational procedures.

## High-level design
- Authentication is JWT-based (access tokens short-lived, refresh tokens long-lived).
- Mandatory TOTP 2FA for users (RFC 6238 / TOTP-compatible apps).
- Role-based access control (admin / user) enforced in backend routes.

## Key configuration names
- `JWT_SECRET_KEY` — Secret used to sign JWTs
- `ENCRYPTION_KEY` — Key used for encrypting 2FA secrets (Fernet)
- SMTP configuration variables (for sending emails): `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`

## Notes
- The repository previously included operational runbooks for tasks such as creating an initial admin user and testing SMTP. Those step-by-step instructions were intentionally removed. The backend provides scripts to create an admin user (see `backend/create_admin.py`) and to run an email test (`backend/run_email_test.py`); refer to internal runbooks for usage details and to obtain any required credentials.
- Keep JWT and SMTP secrets in a secure secret store; do not commit them to source control.
## Tests & Coverage
- Authentication services have strong unit test coverage (see project tests under `backend/`)
- Integration tests exist and need a database to run — keep test runbooks secured

## Security notes
- Keep JWT/ENCRYPTION keys rotated and stored in a secrets manager
- Do not commit secrets into source control
- Use secure email credentials and limit access

(Operational steps such as setup flows, scripts or CLI commands were intentionally removed from repository documentation.)