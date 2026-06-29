# Production Deployment Guide

This guide captures the minimum production setup for Real Business Suite.

## Required environment variables

API:

- `DATABASE_URL`: production PostgreSQL connection string.
- `JWT_SECRET`: at least 32 random characters; never reuse local/dev values.
- `API_PORT`: usually `4000`, unless your host injects a port.
- `EMAIL_DRY_RUN`: set `false` when real email delivery is ready.
- `RESEND_API_KEY`: required when using Resend delivery.
- `EMAIL_FROM`: verified sender, for example `Real Business Suite <no-reply@yourdomain.com>`.

Web:

- `NEXT_PUBLIC_API_URL`: public API URL, ending in `/api`.

Database container/local compose:

- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`

## Deployment sequence

1. Build the app:

   ```powershell
   pnpm install --frozen-lockfile
   pnpm db:generate
   pnpm lint
   pnpm build
   ```

2. Apply database migrations:

   ```powershell
   pnpm db:deploy
   ```

3. Start the API and web apps with production environment variables.

4. Verify:

   - API health: `GET /api/health`
   - Login/register flow
   - Dashboard load
   - Create customer/product/invoice
   - Download invoice PDF
   - Queue and send email in dry-run first
   - Confirm audit log event appears

## Email delivery

Local/test:

```powershell
$env:EMAIL_DRY_RUN = "true"
```

Production with Resend:

```powershell
$env:EMAIL_DRY_RUN = "false"
$env:RESEND_API_KEY = "re_..."
$env:EMAIL_FROM = "Real Business Suite <no-reply@yourdomain.com>"
```

If `EMAIL_DRY_RUN=false` and Resend settings are missing, attempted delivery is marked `FAILED` with a clear configuration error.

## Backups

Run database backups at least daily and before every production migration.

Local/container backup:

```powershell
.\scripts\backup-db.ps1
```

Restore into local/container database:

```powershell
.\scripts\restore-db.ps1 -BackupFile .\backups\real_business_suite-YYYYMMDD-HHMMSS.sql
```

Production hosts should use managed PostgreSQL automated backups plus manual backup before releases.

## Release checklist

- CI is green on `main`.
- `pnpm db:deploy` completed.
- Backup completed and restore process has been tested.
- API health endpoint responds.
- Email mode is intentional (`dry-run` for test, Resend for launch).
- First owner account credentials are stored securely.
- No `.env` secrets are committed.
