# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

JAIS AI — a government enforcement management system (Jabatan Agama Islam Selangor) with complaint management (aduan), warrant tracking (i-waran), arahan beredar, staff/role management, audit trails, and integrations with Telegram, WhatsApp, and OpenAI.

## Architecture

- **api/** — Laravel 10 backend (PHP 8.1+, Sanctum auth, Spatie permissions, MySQL)
- **frontend/** — React 18 SPA (React Router v6, Zustand state, Bootstrap 5, Axios)
- **whatsapp-web/** — WhatsApp Web JS integration (Node.js, Puppeteer)
- **nginx/** — Nginx proxy configs
- **python/** — WhatsApp sending scripts
- **tools/** — Code generation utilities (e.g., report template generators)

## Common Commands

### API (Laravel backend — run from `api/`)
```bash
composer install
cp .env.example .env        # Windows: cp ".env.example" ".env"
php artisan key:generate
php artisan migrate
php artisan db:seed
php artisan serve            # Runs on port 8000
php artisan queue:work       # For background jobs
php artisan config:clear && php artisan cache:clear && php artisan config:cache
```

Run a single seeder:
```bash
php artisan db:seed --class=UserSeeder
```

Run tests:
```bash
php artisan test             # or: ./vendor/bin/pest
```

### Frontend (React — run from `frontend/`)
```bash
npm install
cp .env.example .env
npm start                    # Runs on port 3000
npm run build
npm test
```

### WhatsApp Web (run from `whatsapp-web/`)
```bash
npm install
node server.js
```

## Key Conventions

### Backend
- Auth: Laravel Sanctum (token in `localStorage`, sent as `Bearer` header)
- Roles (Spatie): `system`, `admin`, `pegawai`, `pegawai_hq`, `pegawai_daerah`, `user`, `awam`
- API token auth uses custom `auth.token` middleware (separate from Sanctum)
- Models use `$guarded = ['id']` pattern (not `$fillable`)
- Seeders use `updateOrCreate` for idempotency
- Default seed users: `system@local`, `admin@local`, `pegawai@local`, `user@local` (password: `password`)

### Frontend
- API base URL from `REACT_APP_BACKEND_URL` env var (note: `.env.example` uses `REACT_APP_API_URL`)
- Global state: Zustand stores in `src/store.js` and `src/stores/AuthStore.js`
- App modules live in `src/app/modules/` (aduan, waran, beredar, dashboard, etc.)
- Shared components in `src/app/components/` (prefixed with `Shared*`)
- Legacy views in `src/views/` — new features go in `src/app/`
- Reusable form inputs in `src/libs/` (FormInput, SearchSelect, SubmitButton, etc.)
- Layouts: `AppLayout` (main), `GuestLayout`, `PublicLayout`, `HomeLayout`

### Routing (Frontend)
- Protected routes use `ProtectedRoute` component with role checks
- Two layout systems coexist: newer `AppLayout` and legacy layout components in `src/views/layouts/`

## Environment Setup
- Development platform: Laragon on Windows (WSL2 compatible)
- MySQL database required
- NGROK for external webhook access (Telegram, WhatsApp)
