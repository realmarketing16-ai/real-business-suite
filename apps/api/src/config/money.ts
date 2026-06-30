export const DEFAULT_CURRENCY = 'PGK';
export const DEFAULT_CURRENCY_LOCALE = 'en-PG';

export function billingCurrency() {
  return (process.env.BILLING_CURRENCY || DEFAULT_CURRENCY).trim().toUpperCase();
}

export function billingCurrencyLocale() {
  return (process.env.BILLING_CURRENCY_LOCALE || DEFAULT_CURRENCY_LOCALE).trim();
}

export function formatMoney(value: number | string | null | undefined) {
  return new Intl.NumberFormat(billingCurrencyLocale(), {
    style: 'currency',
    currency: billingCurrency(),
  }).format(Number(value ?? 0));
}

export function billingPrice(plan: 'FREE' | 'STARTER' | 'BUSINESS' | 'PRO') {
  if (plan === 'FREE') return 0;
  const defaults = {
    STARTER: 99,
    BUSINESS: 249,
    PRO: 499,
  };
  const value = process.env[`BILLING_${plan}_PRICE_MONTHLY`];
  const parsed = Number(value ?? defaults[plan]);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : defaults[plan];
}
