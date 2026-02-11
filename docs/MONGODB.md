# MongoDB — Configuration Summary

This page describes configuration modes and canonical environment variable names used by the backend. Procedural steps and runbook-style instructions have been removed.

## Supported modes
- Local development: set `MONGODB_URL` to a local connection string (e.g., `mongodb://localhost:27017/ctf_platform`).
- Managed provider (Northflank addon or other): provider injects connection variables (example names below).

## Canonical variables (definition only)
- `MONGODB_URL` — Full connection string used for local development
- `NF_SAKI_DB_MONGO_SRV` (provider-specific) — Full connection string provided by Northflank (preferred in production)
- `NF_SAKI_DB_USERNAME`, `NF_SAKI_DB_PASSWORD`, `NF_SAKI_DB_DATABASE` — Individual variables used when a full connection string is not provided

## Backend behavior (conceptual)
Priority used by the backend to discover connection information:
1. `MONGODB_URL` (if set: local dev)
2. Provider full connection string (if present)
3. Individual provider variables (username/password/host)
4. Fallback to localhost when nothing is configured

## Security notes
- Never commit credentials; use a secrets manager or the platform's secret store
- Use TLS/SSL connections and restrict network access to production DB

(For operational procedures such as linking add-ons, running migrations, or provisioning a managed DB, use a private runbook held outside of source control.)