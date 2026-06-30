export const brand = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME || 'Real Business Suite',
  shortName: process.env.NEXT_PUBLIC_BRAND_SHORT_NAME || 'RBS',
  initial: process.env.NEXT_PUBLIC_BRAND_INITIAL || 'R',
  tagline: process.env.NEXT_PUBLIC_BRAND_TAGLINE || 'One login. Every part of your business.',
  regionLine: process.env.NEXT_PUBLIC_BRAND_REGION_LINE || 'Built in PNG, for growing businesses',
  authLine: process.env.NEXT_PUBLIC_BRAND_AUTH_LINE || 'Built to help PNG businesses grow with clarity.',
  supportContact: process.env.NEXT_PUBLIC_SUPPORT_CONTACT || 'your company administrator or project owner',
  demoRevenue: process.env.NEXT_PUBLIC_DEMO_REVENUE || 'PGK 42.5k',
  logoPath: process.env.NEXT_PUBLIC_BRAND_LOGO_PATH || '/brand/real-logo.png',
  iconPath: process.env.NEXT_PUBLIC_BRAND_ICON_PATH || '/brand/real-icon.png',
};
