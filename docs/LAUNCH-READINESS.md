# Launch Readiness Checklist

Use this checklist before letting real customers rely on Real Business Suite.

## Product readiness

- [ ] Local smoke test passes with `pnpm smoke:local`.
- [ ] Company registration/login tested.
- [ ] Password reset request and reset-token flow tested.
- [ ] Company profile can be edited.
- [ ] Team roles tested for owner/admin/manager/employee.
- [ ] Employee management tested.
- [ ] CRM customers and sales pipeline tested.
- [ ] Quotes can be created, emailed, and status-updated.
- [ ] Invoices can be created, emailed, PDF-downloaded, and paid.
- [ ] Expenses and profit reports tested.
- [ ] Projects/tasks tested.
- [ ] Inventory and purchase orders tested.
- [ ] Audit logs show important admin/business actions.
- [ ] Email outbox and delivery controls tested.

## Security readiness

- [ ] Production `JWT_SECRET` is unique and strong.
- [ ] Production database password is unique and strong.
- [ ] Real `.env` files are not committed.
- [ ] Owner/admin-only screens are checked.
- [ ] Team invite emails do not contain passwords.
- [ ] Email sender domain is verified with provider.
- [ ] Browser and API use HTTPS in production.
- [ ] Auth rate limits tested for login and password reset endpoints.
- [ ] Auth audit events reviewed for registration, login, and password reset activity.
- [ ] Billing plan/status reviewed and Stripe keys configured before taking customer payments.
- [ ] Free plan behavior tested before paid launch.
- [ ] Stripe checkout and webhook tested in test mode.
- [ ] Past-due/canceled subscription access limits tested.

## Data readiness

- [ ] Production migrations run with `pnpm db:deploy`.
- [ ] Database backup completed before launch.
- [ ] Backup checksum captured and stored securely.
- [ ] Restore has been tested from a backup.
- [ ] Daily automated backups are enabled.
- [ ] Backup retention policy is defined.

## Operations readiness

- [ ] API health check is monitored.
- [ ] Web app uptime is monitored.
- [ ] Error logs are accessible.
- [ ] Email failures are reviewed from the outbox.
- [ ] Support contact/process is defined.
- [ ] Rollback process is documented.

## Go/no-go

Launch only when every critical item above is complete. If any item is not complete, launch as a private pilot with limited users and daily manual review.
