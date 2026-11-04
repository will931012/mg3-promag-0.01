# Backend (Node + Express)

See the [main README](../README.md) for setup and environment variables.

```bash
cd backend
npm install
npm run db:setup
npm run dev
npm test
```

## Endpoints

All endpoints except health and login require an `Authorization: Token <token>` header.

- `GET /api/health`
- `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`
- `GET /api/auth/users`, `PATCH /api/auth/users/:id/admin` (admin)
- `GET /api/dashboard/summary`
- `/api/projects`, `/api/rfis`, `/api/contacts` (contacts directory and roles), `/api/project-contacts/:projectId`
- Shop drawing register, under `/api/register`:
  - `GET /meta`: reviewers, action codes, disciplines, types
  - `GET /projects/:projectId`: a project's register with calculated columns and log
  - `PATCH /projects/:projectId/settings`: review period
  - `POST /projects/:projectId/items`, `PATCH /items/:id`, `DELETE /items/:id` (project items only)
  - `POST /items/:id/log`, `PATCH /log/:id`, `DELETE /log/:id`
  - `GET /activity`: submitted items and alerts across all projects
  - `GET /master`, `POST /master` (admin), `PATCH /master/:id` (admin)
