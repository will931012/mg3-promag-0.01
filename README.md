# ProMag (MG3)

Construction project management platform using:
- Frontend: React + TypeScript (Vite)
- Backend: Django + Django REST Framework
- Database: PostgreSQL (local install)

## Project structure
- `frontend/` React app
- `backend/` Django API

## 1) Install and start PostgreSQL locally
Create a database and user (example values used by this project):

```sql
CREATE DATABASE promag;
CREATE USER promag_user WITH PASSWORD 'promag_pass';
GRANT ALL PRIVILEGES ON DATABASE promag TO promag_user;
```

Make sure PostgreSQL is running on:
- Host: `127.0.0.1`
- Port: `5432`

## 2) Backend setup
```bash
cd backend
python -m venv .venv

# activate virtual environment
# PowerShell:
.\.venv\Scripts\Activate.ps1
# Bash/Git Bash:
source .venv/Scripts/activate

python -m pip install --upgrade pip
pip install -r requirements.txt

# copy env file
# PowerShell:
Copy-Item .env.example .env
# Bash/Git Bash:
cp .env.example .env

python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

API health: `http://127.0.0.1:8000/api/health/`

## 3) Frontend setup
```bash
cd frontend
npm install
npm run dev
```
App: `http://127.0.0.1:5173`

## Authentication
- Login endpoint: `POST /api/auth/login/`
- Current user endpoint: `GET /api/auth/me/`
- Logout endpoint: `POST /api/auth/logout/`
- Projects endpoint requires authentication token.

Use your Django superuser credentials in the ProMag login screen.

## Env vars
`backend/.env` defaults are already set for local PostgreSQL. Change them if your local DB credentials differ.
