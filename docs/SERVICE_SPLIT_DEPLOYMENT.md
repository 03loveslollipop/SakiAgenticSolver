# Core API + Control-Plane Split

## Services
- `backend/core_service/main.py`: auth/users/writeups + diagnostics + stream projections
- `backend/control_service/main.py`: sessions/tasks/SSH/terminal + VM orchestration worker
- Shared auth/db/service helpers: `backend/shared/`

## Docker Images
- Core: `backend/Dockerfile.core`
- Control: `backend/Dockerfile.control`

## Required Env
- Both services must use the same JWT settings:
  - `JWT_SECRET_KEY`
  - `JWT_ALGORITHM` (if customized from default)
- MongoDB must support Change Streams (replica set or sharded cluster).

## Northflank Path Routing
- `/api/auth/*` -> core
- `/api/users/*` -> core
- `/api/writeups*` -> core
- `/api/sessions*` -> control
- `/api/tasks*` -> control
- `/api/sessions/*/terminal` (WebSocket) -> control
- `/health` -> core
- `/health/core` -> core
- `/health/control` -> control

## Data Ownership
- Core-owned collections:
  - `users`
  - `writeups`
  - `session_event_audit`
  - `dashboard_metrics_projection`
  - `service_stream_offsets`
- Control-owned collections:
  - `sessions`
  - `ssh_keys`
  - `background_tasks`
  - `deployment_status`

## AuthZ Rules in Control Plane
- JWT required on all `/api/sessions*` and `/api/tasks*` endpoints.
- WebSocket terminal requires JWT via:
  - `Authorization: Bearer <token>` header, or
  - `?token=<jwt>` query parameter.
- `admin`: full visibility/control.
- `user`: only sessions where `owner_user_id == current_user.user_id`.

