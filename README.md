# Real Business Suite Alpha

Real Business Suite is a multi-tenant business platform built for Papua New Guinea businesses. The current alpha includes company setup, authentication, employees, CRM, sales pipeline, quotes, invoices, invoice PDFs, payments, expenses, reports, projects/tasks, team roles, inventory, purchasing, audit logs, and email outbox/delivery controls.

## Architecture

- `apps/web` — Next.js web application
- `apps/api` — NestJS REST API
- `apps/api/prisma` — PostgreSQL data model and migrations
- `docker-compose.yml` — local PostgreSQL service
- `.github/workflows/ci.yml` — build validation
- `render.yaml` — Render API deployment starter config
- `docs/LOW-COST-LAUNCH.md` — free/low-cost pilot launch plan
- `docs/PRODUCTION-DEPLOYMENT.md` — production deployment checklist
- `docs/LAUNCH-READINESS.md` — launch readiness checklist
- `scripts/backup-db.ps1` and `scripts/restore-db.ps1` — PostgreSQL backup/restore helpers

## Local setup

1. Install Node.js 20+ and Docker Desktop.
2. Copy `.env.example` to `.env`.
3. Run `docker compose up -d`.
4. Run `pnpm install`.
5. Run `pnpm db:generate` and `pnpm db:migrate`.
6. In separate terminals run `pnpm dev:api` and `pnpm dev:web`.
7. Open `http://localhost:3000`.

The API is served at `http://localhost:4000/api`; health status is available at `/api/health`.

## Production basics

Before launch:

1. For the lowest-cost private pilot, follow `docs/LOW-COST-LAUNCH.md` first.
2. Set strong production environment variables from `.env.example`.
3. Run `pnpm db:deploy` against the production database.
4. Configure email delivery with `EMAIL_DRY_RUN=false`, `RESEND_API_KEY`, and `EMAIL_FROM`.
5. Configure daily database backups and test restore.
6. Complete `docs/LAUNCH-READINESS.md`.

## Current alpha milestones

- **0.1:** authentication, company setup, employees, dashboard
- **0.2:** employee management
- **0.3:** company settings
- **0.4:** business operations dashboard
- **0.5:** CRM and sales pipeline
- **0.6:** expenses and profit dashboard
- **0.7:** reports and CSV exports
- **0.8:** projects and tasks
- **0.9:** team users and roles
- **1.0:** invoice PDF downloads
- **1.1:** quotes and estimates
- **1.2:** inventory and purchasing
- **1.3:** audit logs
- **1.4:** email outbox
- **1.5:** email delivery controls
