# Hosting environment checklist

Use this checklist when moving Real Business Suite from local development to the free private pilot stack:

- Neon for PostgreSQL
- Render for the API
- Vercel for the web app

Do not commit real passwords, database URLs, API keys, Stripe keys, or email keys to GitHub. Put secrets only in the Neon, Render, Vercel, Resend, and Stripe dashboards.

## 1. Neon database

Create a Neon Postgres project named `real-business-suite`.

Copy the pooled connection string and make sure it ends with SSL enabled:

```text
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DB?sslmode=require
```

Keep this value private. You will paste it into Render, not into the repository.

## 2. Render API environment variables

Create the Render web service from this GitHub repository. The root `render.yaml` already defines the API build command, start command, and health check.

Generate a strong JWT secret locally:

```text
pnpm secret:jwt
```

Copy only the generated `JWT_SECRET=...` value into Render. Do not save it in the repository.

Paste these into the Render service environment variables:

```text
NODE_ENV=production
DATABASE_URL=<Neon pooled connection string with ?sslmode=require>
JWT_SECRET=<paste the value from pnpm secret:jwt>
WEB_URL=<your Vercel web URL after Vercel deploys>
EMAIL_DRY_RUN=true
BILLING_CURRENCY=PGK
BILLING_CURRENCY_LOCALE=en-PG
BILLING_STARTER_PRICE_MONTHLY=99
BILLING_BUSINESS_PRICE_MONTHLY=249
BILLING_PRO_PRICE_MONTHLY=499
BRAND_NAME=Real Business Suite
SUPPORT_CONTACT=<your support email or phone>
```

Add these only when you are ready to send real email or take live payments:

```text
RESEND_API_KEY=
EMAIL_FROM=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

Render provides the app port automatically with `PORT`, so do not set `API_PORT` on Render.

After Render deploys, test:

```text
https://your-render-api-url.onrender.com/api/health
```

## 3. Vercel web environment variables

Create the Vercel project from the same GitHub repository. The root `vercel.json` already points Vercel at the Next.js web app.

Use these Vercel project settings:

```text
Framework Preset=Next.js
Root Directory=apps/web
Build Command=pnpm build
Install Command=pnpm install --frozen-lockfile
Output Directory=.next
Include files outside the root directory in the Build Step=Enabled
```

Paste these into the Vercel project environment variables:

```text
NEXT_PUBLIC_API_URL=https://your-render-api-url.onrender.com/api
NEXT_PUBLIC_CURRENCY=PGK
NEXT_PUBLIC_CURRENCY_LOCALE=en-PG
NEXT_PUBLIC_STARTER_PRICE_MONTHLY=99
NEXT_PUBLIC_BUSINESS_PRICE_MONTHLY=249
NEXT_PUBLIC_PRO_PRICE_MONTHLY=499
NEXT_PUBLIC_BRAND_NAME=Real Business Suite
NEXT_PUBLIC_BRAND_SHORT_NAME=RBS
NEXT_PUBLIC_BRAND_INITIAL=R
NEXT_PUBLIC_BRAND_TAGLINE=Run your PNG business from one calm, connected workspace.
NEXT_PUBLIC_BRAND_REGION_LINE=Built for Papua New Guinea businesses.
NEXT_PUBLIC_BRAND_AUTH_LINE=Sign in to manage customers, staff, sales, inventory, projects, and reports.
NEXT_PUBLIC_SUPPORT_CONTACT=<your support email or phone>
NEXT_PUBLIC_DEMO_REVENUE=PGK 42.5k
NEXT_PUBLIC_BRAND_LOGO_PATH=/brand/real-logo.png
NEXT_PUBLIC_BRAND_ICON_PATH=/brand/real-icon.png
```

Deploy the web app. Vercel will give you a URL like:

```text
https://real-business-suite.vercel.app
```

Copy that Vercel URL back into Render as:

```text
WEB_URL=https://real-business-suite.vercel.app
```

Then redeploy the Render API so browser security allows the Vercel website.

If you later add a custom domain, use comma-separated allowed web origins in Render:

```text
WEB_URL=https://real-business-suite.vercel.app,https://app.yourdomain.com
```

The first URL is used for password reset links and Stripe return links.

## 4. Final hosted checks

Run these from your local project after the hosted URLs are set in `.env`:

```text
pnpm readiness:prod
pnpm smoke:hosted -- -ApiUrl https://your-render-api-url.onrender.com/api -WebUrl https://your-vercel-url.vercel.app
```

Then test the app in the browser:

- Register the first owner account.
- Log in.
- Complete company settings.
- Add an employee.
- Add a customer.
- Add a product.
- Create a quote.
- Create an invoice.
- Download the invoice PDF.
- Confirm reports load.
- Confirm Billing shows PGK prices.

Keep `EMAIL_DRY_RUN=true` and Stripe keys empty until the private pilot works on the free URLs.
