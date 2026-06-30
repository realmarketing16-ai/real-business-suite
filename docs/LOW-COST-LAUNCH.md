# Low-cost launch plan

This is the cheapest practical path to get Real Business Suite online for a private pilot before paying for a full production stack.

## Recommended free/low-cost stack

Use this order:

1. Database: Neon free Postgres.
2. API: Render web service, starting on the free plan for testing.
3. Web app: Vercel Hobby, using the free Vercel URL first.
4. Email: keep `EMAIL_DRY_RUN=true` until the app is otherwise working. Add Resend free email later.
5. Domain: do not buy one yet. Use the free Vercel and Render URLs during the pilot.
6. Payments: Stripe has no monthly subscription fee, but only connect live billing after the free pilot works.

## Step 1: Create the database

Create a free Neon Postgres project and copy the pooled connection string.

Set this in Render as:

```text
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DB?sslmode=require
```

Do not paste the database password into GitHub, chat, screenshots, or documentation.

## Step 2: Deploy the API on Render

Render can use the root `render.yaml` file in this repository.

Use these important settings:

- Service type: Web Service
- Root directory: repository root
- Build command: already defined in `render.yaml`
- Start command: already defined in `render.yaml`
- Health check path: `/api/health`

Set these Render environment variables:

```text
NODE_ENV=production
API_PORT=4000
DATABASE_URL=<Neon connection string>
JWT_SECRET=<Render can generate this>
WEB_URL=<your Vercel web URL, after Step 3>
EMAIL_DRY_RUN=true
```

Leave these blank until you are ready:

```text
RESEND_API_KEY=
EMAIL_FROM=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

After the first Render deploy finishes, open:

```text
https://your-render-api-url.onrender.com/api/health
```

It should return a healthy response.

## Step 3: Deploy the web app on Vercel

Create a Vercel project from this GitHub repository.

Use these settings:

- Framework: Next.js
- Root directory: `apps/web`
- Build command: `pnpm build`
- Install command: `pnpm install --frozen-lockfile`

Set this Vercel environment variable:

```text
NEXT_PUBLIC_API_URL=https://your-render-api-url.onrender.com/api
```

Deploy the site. Vercel will give you a free URL like:

```text
https://real-business-suite.vercel.app
```

Copy that URL back into Render as:

```text
WEB_URL=https://real-business-suite.vercel.app
```

Then redeploy the Render API so CORS allows the web app.

## Step 4: Private pilot checklist

Before spending more money, test this on the free URLs:

- Register the first owner account.
- Log in and open the dashboard.
- Add company settings.
- Add an employee.
- Add a customer.
- Add a product.
- Create a quote.
- Create an invoice.
- Download the invoice PDF.
- Confirm reports load.
- Confirm Billing shows the Free plan.

## When to start paying

Only upgrade after the private pilot works.

Recommended upgrade order:

1. Upgrade API hosting first if Render free sleep is annoying.
2. Add Resend email when password reset and invoice emails must really send.
3. Add a custom domain after the web/API deployment is stable.
4. Turn on Stripe live keys only when you are ready to charge real customers.

This keeps the launch controlled and avoids buying services before the software proves itself online.
