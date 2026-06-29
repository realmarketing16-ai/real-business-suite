# Production Deployment Guide

This guide captures the minimum production setup for Real Business Suite.

## Required environment variables

API:

- `DATABASE_URL`: production PostgreSQL connection string.
- `JWT_SECRET`: at least 32 random characters; never reuse local/dev values.
- `NODE_ENV`: set to `production` for public launch.
- `WEB_URL`: public web app origin, for example `https://app.yourdomain.com`; used for API CORS.
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

## Startup environment validation

The API validates launch-critical environment variables during startup.

In production mode (`NODE_ENV=production`), startup fails unless:

- `DATABASE_URL` is present.
- `JWT_SECRET` is production-strength.
- `WEB_URL` is a valid `https://` URL.
- Email settings are present when `EMAIL_DRY_RUN` is not `true`.

In local development, missing production-only values are warnings so localhost remains easy to run.

## Security headers

The web and API apps send baseline launch security headers:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Cross-Origin-Opener-Policy: same-origin`
- `Permissions-Policy` disabling camera, microphone, geolocation, and payment APIs by default
- `Strict-Transport-Security` for HTTPS production deployments

The API also sends `Cache-Control: no-store` for authenticated business data responses.

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
- Owner/admin readiness page reports no failed checks.
- Browser/API responses include the expected security headers.
- Email mode is intentional (`dry-run` for test, Resend for launch).
- First owner account credentials are stored securely.
- No `.env` secrets are committed.
