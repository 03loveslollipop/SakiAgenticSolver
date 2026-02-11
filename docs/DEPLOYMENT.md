# Deployment — Overview (High-level, no operational instructions)

This document contains a high-level summary of how the project is deployed and the names/purposes of environment variables and secrets in use. Procedural instructions (how-to steps, scripts, or commands) have been removed from the repository. If you need operational runbooks, keep them externally secured (e.g., internal wiki, password manager, or runbook vault).

## Hosting & Roles
- Backend: Northflank (containerized service)
- Frontend: Vercel (global CDN)
- Database: MongoDB (Northflank addon or external provider)
- Compute for challenge solving: Azure VMs

## Deployment Flow (conceptual)
- CI builds images and produces artifacts (container images, frontend bundle)
- Container images are stored in GHCR (GitHub Container Registry)
- Northflank runs backend container(s) and provides service URL
- Vercel hosts the frontend and references the backend URL
- Secrets and environment variables are injected into services at runtime

## Secrets & Environment Variables (definition only — no instructions)
Use these names as canonical keys. The repository previously included operational instructions for how to obtain or upload these values; those instructions were removed.

### Northflank / Backend
- `NORTHFLANK_API_KEY` — API token scoped for deployments (used by deployment automation)
- `NORTHFLANK_PROJECT_ID` — Northflank project identifier
- `NORTHFLANK_SERVICE_ID` — Northflank service identifier for the backend
- `NORTHFLANK_CREDENTIALS_ID` — ID of container registry credentials configured in Northflank

### Azure (for VM management)
- `AZURE_SUBSCRIPTION_ID` — Azure subscription GUID
- `AZURE_CLIENT_ID` — Service principal client ID used by the backend
- `AZURE_CLIENT_SECRET` — Service principal secret
- `AZURE_TENANT_ID` — Azure AD tenant ID
- `AZURE_RESOURCE_GROUP` — Default resource group name

### Frontend / Vercel
- `VITE_API_URL` (or `VITE_API_BASE_URL`) — Public backend URL used by frontend builds
- (Vercel tokens/IDs may be used by CI pipelines; reference by name only)

### Container Registry / GitHub
- GHCR tokens or PATs are used for pushing/pulling images (named at your discretion)

### MongoDB
- `MONGODB_URL` or the provider-specific environment variables (see `docs/MONGODB.md`) — connection string / credentials

## Security Notes
- Do not commit secrets or operational scripts that contain secrets to the repository.
- Keep procedural runbooks and scripts that expose secrets in a secure vault or private wiki.
- Rotate tokens and secrets on policy intervals appropriate for your organization.

## Where to look for details
- This file: high-level architecture and canonical secret names (no steps).
- See `/docs` for focused, non-operational documentation (authentication, database configuration, architecture descriptions).

---

(If you need a private runbook or an operational secret store entry created, keep it out of source control.)