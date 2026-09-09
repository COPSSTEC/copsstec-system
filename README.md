# COPSSTEC System

## Backend

```bash
source .venv/bin/activate
export DATABASE_URL="postgresql://gabrieltates@localhost:5432/copsstec"
export SECRET_KEY="change-me-in-local"
cd backend
uvicorn app.main:app --reload
```

API local:

- `GET /api/health`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/auth/access`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`

## Frontend

```bash
cd frontend
cp .env.example .env.local
npm run dev
```

Aplicación local:

- `http://localhost:3000/login`
- `http://localhost:3000/dashboard`
- `http://localhost:3000/profile`
- `http://localhost:3000/admin`
- `http://localhost:3000/mi-espacio`
- `http://localhost:3000/operaciones`
