# ProMag (MG3)

Construction project management for MG3 Developer Group: projects, the shop drawing register (submittals), RFIs and contacts.

- Frontend: React + TypeScript (Vite, Tailwind) in `frontend/`, deployed on Vercel
- Backend: Node.js + Express in `backend/`, deployed on Railway
- Database: PostgreSQL

## Local setup

### 1. Database

Install PostgreSQL and create an empty database (the default name is `promag-db`):

```sql
CREATE DATABASE "promag-db";
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env      # PowerShell: Copy-Item .env.example .env
```

Edit `backend/.env` with your database connection (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`) and the admin login to create (`SEED_ADMIN_USERNAME`, `SEED_ADMIN_PASSWORD`). Then:

```bash
npm run db:setup   # creates every table and the admin user
npm run dev        # API on http://127.0.0.1:4000/api
```

On startup the server also creates the shop drawing register tables, loads the master submittal list and copies it into any project that doesn't have a register yet. Check it is up at `http://127.0.0.1:4000/api/health`.

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env      # points the app at http://127.0.0.1:4000/api
npm run dev               # http://localhost:5173
```

Log in with the admin username and password from `backend/.env`.

## Environment variables

Backend (`backend/.env`):

| Variable | Purpose |
| --- | --- |
| `PORT` | API port (default `4000`) |
| `CORS_ORIGIN` | Allowed frontend origins, comma-separated; `*` wildcards allowed |
| `DATABASE_URL` | Full connection string; used instead of the `DB_*` values when set (Railway) |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Database connection |
| `DB_SSL` | `true` to connect over SSL (default on when `DATABASE_URL` is set) |
| `SEED_ADMIN_*` | Login created by `npm run db:seed:user` |
| `APP_TIMEZONE` | Calendar used for "today" in due dates and alerts (default `America/New_York`) |

Frontend (`frontend/.env`): `VITE_API_BASE`, the API base URL.

## Shop drawing register

Submittals are tracked with the register from `Shop Drawing Log.xlsx`:

- **Master list**: 277 standard submittals by CSI section (`backend/src/data/submittal-master-items.json`, loaded once into the database). Admins edit it from the Master List page. Changes apply to projects created afterwards; new items are added to existing projects switched off.
- **Project register**: every project gets a copy of the master list with all items in use. Items that don't apply are unticked rather than deleted. A project can add its own items.
- **Submission log**: each submission (Rev 0, Rev 1, ...) records when it was received from the subcontractor, sent to the reviewer, returned with an action code and returned to the subcontractor.
- **Calculated columns**: status, ball in court, days with the ball, review due date (review period per project, 14 days by default), "submit by" for long-lead items and alerts. The rules follow the spreadsheet's formulas and live in `backend/src/services/register-status.js`.

The first user account is made an admin automatically; admins can make other users admin from the Users page.

Submittals from the earlier flat tracker (`submittal_tracker` table) are copied into the register as log entries on startup. The old table is left in place.

## Tests

```bash
cd backend
npm test
```

## Database scripts

| Command | What it does |
| --- | --- |
| `npm run db:setup` | Create all tables and the admin user (safe to re-run) |
| `npm run db:create:<table>` | Create one table |
| `npm run db:seed:user` | Create or update the admin user from `SEED_ADMIN_*` |
| `npm run db:drop` | Drop all tables |
