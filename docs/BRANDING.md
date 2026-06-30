# Branding guide

Real Business Suite now has a small branding foundation so name, tagline, support contact, demo copy, and core colors are easier to update before launch.

## Public brand text

Set these web environment variables in Vercel when the final public brand is ready:

```text
NEXT_PUBLIC_BRAND_NAME="Real Business Suite"
NEXT_PUBLIC_BRAND_SHORT_NAME=RBS
NEXT_PUBLIC_BRAND_INITIAL=R
NEXT_PUBLIC_BRAND_TAGLINE="One login. Every part of your business."
NEXT_PUBLIC_BRAND_REGION_LINE="Built in PNG, for growing businesses"
NEXT_PUBLIC_BRAND_AUTH_LINE="Built to help PNG businesses grow with clarity."
NEXT_PUBLIC_SUPPORT_CONTACT="support@example.com"
NEXT_PUBLIC_DEMO_REVENUE="PGK 42.5k"
NEXT_PUBLIC_BRAND_LOGO_PATH=/brand/real-logo.png
NEXT_PUBLIC_BRAND_ICON_PATH=/brand/real-icon.png
```

The app reads these values from `apps/web/lib/brand.ts`.

Logo assets are stored in `apps/web/public/brand/`.

## Theme colors

Core theme colors live at the top of `apps/web/app/globals.css`:

```css
--brand-primary
--brand-primary-dark
--brand-primary-deep
--brand-accent
--brand-surface
--brand-surface-soft
--brand-text
--brand-muted
--brand-line
--brand-danger
--brand-warning
--brand-success
```

Current style direction:

- Primary: deep green, stable and businesslike.
- Accent: lime highlight, modern and energetic.
- Surface: warm cream/off-white, softer than plain white.
- Tone: practical, clear, Papua New Guinea business focused.

## Before final public launch

- Replace placeholder support contact with a real email, phone number, or helpdesk link.
- Confirm the business name and app initials.
- Decide whether to keep the current green/lime palette or move to a new palette.
- Add final logo assets if available.
- Check landing, login, register, support, privacy, and terms pages after changing brand settings.
