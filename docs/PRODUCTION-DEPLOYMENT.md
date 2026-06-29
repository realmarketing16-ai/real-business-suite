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
- `STRIPE_SECRET_KEY`: required before charging customers online.
- `STRIPE_WEBHOOK_SECRET`: required before trusting subscription payment events.

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
   - Local smoke test before paid hosting: `pnpm smoke:local`
   - Login/register flow
   - Password reset request and reset-token flow
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

## Authentication rate limits

Public authentication endpoints have lightweight in-memory rate limiting:

- Register, login, and reset-password attempts: 10 attempts per 15 minutes per route/client key.
- Forgot-password requests: 5 attempts per 15 minutes per route/client key.

For a single API instance this protects launch traffic from simple brute-force and email-spam bursts. For multi-instance production deployments, also enable an edge/API-gateway rate limit so limits are shared across all running instances.

Registration, successful login, password-reset request, and completed password-reset events are recorded in the audit log for owner/admin review. Audit entries never store passwords or reset tokens.

## Billing and subscriptions

New companies start on the `FREE` plan so owners can test locally or run a private pilot without paying for Stripe or production services first. Owners/admins can view and change the tracked plan from the dashboard Billing section.

The app creates Stripe Checkout sessions from the dashboard Billing section and listens for Stripe subscription events at:

- `POST /api/billing/webhook`

Configure that webhook endpoint in Stripe and set:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

Before public paid launch, confirm your pricing, tax handling, refund policy, and subscription cancellation flow. Use Stripe test mode first, then switch to live keys only after a successful test checkout and webhook sync.

Accounts with `FREE`, `TRIALING`, or `ACTIVE` access can use the business suite. Accounts marked `PAST_DUE` or `CANCELED` see a billing warning and business creation/export actions are limited while Billing remains available for owner/admin recovery.

## Backups

Run database backups at least daily and before every production migration.

Local/container backup:

```powershell
.\scripts\backup-db.ps1
```

The backup helper writes both a `.sql` file and a `.sha256` checksum file into `.\backups`.

Restore into local/container database:

```powershell
.\scripts\restore-db.ps1 -BackupFile .\backups\real_business_suite-YYYYMMDD-HHMMSS.sql -ExpectedSha256 "checksum-from-.sha256-file"
```

The restore helper requires typing `RESTORE` before it writes to the database. Use `-Force` only for non-interactive restore drills or automation.

Production hosts should use managed PostgreSQL automated backups plus manual backup before releases.

## Release checklist

- CI is green on `main`.
- Local smoke test passes before paying for production services.
- `pnpm db:deploy` completed.
- Backup completed and restore process has been tested.
- Backup checksum has been captured and stored securely.
- API health endpoint responds.
- Owner/admin readiness page reports no failed checks.
- Browser/API responses include the expected security headers.
- Auth rate limits are tested on login and password reset endpoints.
- Owner/admin audit log shows recent account security events.
- Billing section shows the intended plan, status, and payment provider readiness.
- Stripe test checkout completes and webhook updates subscription status.
- Past-due/canceled subscription access limits are tested.
- Email mode is intentional (`dry-run` for test, Resend for launch).
- Password reset emails are delivered successfully or intentionally dry-run during test.
- First owner account credentials are stored securely.
- No `.env` secrets are committed.
