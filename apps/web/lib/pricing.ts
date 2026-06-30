const currency = process.env.NEXT_PUBLIC_CURRENCY || 'PGK';
const currencyLocale = process.env.NEXT_PUBLIC_CURRENCY_LOCALE || 'en-PG';

function priceFromEnv(key: string, fallback: number) {
  const value = Number.parseFloat(process.env[key] ?? '');
  return Number.isFinite(value) ? value : fallback;
}

export const publicPricing = {
  currency,
  currencyLocale,
  plans: [
    {
      name: 'Free',
      priceMonthly: 0,
      badge: 'Private pilot',
      description: 'Best while you are testing the system with your own company data.',
      features: ['Company dashboard', 'Employees and team users', 'Customers, products, invoices, and reports', 'Email dry-run mode for safe testing'],
    },
    {
      name: 'Starter',
      priceMonthly: priceFromEnv('NEXT_PUBLIC_STARTER_PRICE_MONTHLY', 99),
      badge: 'Small teams',
      description: 'For a small business that needs daily customer, staff, and billing tools.',
      features: ['Everything in Free', 'Live invoice and quote workflows', 'Projects and tasks', 'Basic audit history'],
    },
    {
      name: 'Business',
      priceMonthly: priceFromEnv('NEXT_PUBLIC_BUSINESS_PRICE_MONTHLY', 249),
      badge: 'Recommended',
      description: 'For growing teams that need operations, stock, purchasing, and reporting in one place.',
      featured: true,
      features: ['Everything in Starter', 'Inventory and purchasing', 'Advanced reports and exports', 'Team roles and launch controls'],
    },
    {
      name: 'Pro',
      priceMonthly: priceFromEnv('NEXT_PUBLIC_PRO_PRICE_MONTHLY', 499),
      badge: 'Full suite',
      description: 'For larger teams that want the full operating system with priority setup support.',
      features: ['Everything in Business', 'Priority onboarding', 'Payment setup readiness', 'Deeper audit and governance workflows'],
    },
  ],
};

export function formatPublicPrice(amount: number) {
  if (amount === 0) return 'Free';
  return new Intl.NumberFormat(publicPricing.currencyLocale, {
    style: 'currency',
    currency: publicPricing.currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
