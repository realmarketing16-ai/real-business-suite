# Real Business Suite Alpha

Real Business Suite is a multi-tenant business platform built for Papua New Guinea. Alpha 0.1 delivers the first working foundation: registration, login, company setup, employee management, role-based access, and a founder dashboard.

## Architecture

- `apps/web` — Next.js web application
- `apps/api` — NestJS REST API
- `apps/api/prisma` — PostgreSQL data model and migrations
- `docker-compose.yml` — local PostgreSQL service
- `.github/workflows/ci.yml` — build validation

## Local setup

1. Install Node.js 20+ and Docker Desktop.
2. Copy `.env.example` to `.env`.
3. Run `docker compose up -d`.
4. Run `npm install`.
5. Run `npm run db:generate` and `npm run db:migrate`.
6. In separate terminals run `npm run dev:api` and `npm run dev:web`.
7. Open `http://localhost:3000`.

The API is served at `http://localhost:4000/api`; health status is available at `/api/health`.

## Alpha roadmap

- **0.1:** authentication, company setup, employees, dashboard
- **0.2:** attendance, leave, departments, permissions
- **0.3:** recruitment and PNGworkforce
- **0.4:** marketing assets and campaigns
- **0.5:** CRM, quotes, invoices, and sales
- **0.6:** payroll
- **Beta:** Asher AI
