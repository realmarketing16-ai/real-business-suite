type Env = Record<string, string | undefined>;

function parseList(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function requireValue(env: Env, key: string, errors: string[]) {
  if (!env[key]?.trim()) errors.push(`${key} is required.`);
}

function requireUrlList(env: Env, key: string, errors: string[], options: { requireHttps?: boolean } = {}) {
  const value = env[key]?.trim();
  if (!value) {
    errors.push(`${key} is required.`);
    return;
  }

  const urls = parseList(value);
  if (urls.length === 0) {
    errors.push(`${key} must include at least one URL.`);
    return;
  }

  for (const urlValue of urls) {
    try {
      const url = new URL(urlValue);
      if (options.requireHttps && url.protocol !== 'https:') {
        errors.push(`${key} value ${urlValue} must use https:// in production.`);
      }
    } catch {
      errors.push(`${key} value ${urlValue} must be a valid URL.`);
    }
  }
}

function isWeakSecret(secret: string) {
  const normalized = secret.toLowerCase();
  return secret.length < 32 || normalized.includes('development') || normalized.includes('change-me') || normalized.includes('secret');
}

export function validateEnv(env: Env) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const isProduction = env.NODE_ENV === 'production';
  const emailDryRun = (env.EMAIL_DRY_RUN ?? '').toLowerCase() === 'true';

  requireValue(env, 'DATABASE_URL', errors);

  const jwtSecret = env.JWT_SECRET ?? '';
  if (isProduction) {
    if (isWeakSecret(jwtSecret)) errors.push('JWT_SECRET must be at least 32 random characters and cannot use development placeholders.');
    requireUrlList(env, 'WEB_URL', errors, { requireHttps: true });

    if (!emailDryRun) {
      requireValue(env, 'RESEND_API_KEY', errors);
      requireValue(env, 'EMAIL_FROM', errors);
    }
  } else {
    if (!jwtSecret) warnings.push('JWT_SECRET is not set; development fallback will be used.');
    if (!env.WEB_URL) warnings.push('WEB_URL is not set; local CORS default will be used.');
  }

  const apiPort = env.API_PORT;
  const hostPort = env.PORT;
  if (apiPort && Number.isNaN(Number(apiPort))) errors.push('API_PORT must be a number.');
  if (hostPort && Number.isNaN(Number(hostPort))) errors.push('PORT must be a number.');

  const billingCurrency = env.BILLING_CURRENCY;
  if (billingCurrency && !/^[A-Za-z]{3}$/.test(billingCurrency.trim())) errors.push('BILLING_CURRENCY must be a 3-letter ISO currency code such as PGK.');

  for (const key of ['BILLING_STARTER_PRICE_MONTHLY', 'BILLING_BUSINESS_PRICE_MONTHLY', 'BILLING_PRO_PRICE_MONTHLY']) {
    const value = env[key];
    if (value && (Number.isNaN(Number(value)) || Number(value) < 0)) errors.push(`${key} must be a non-negative number.`);
  }

  if (errors.length > 0) {
    throw new Error(`Invalid API environment:\n- ${errors.join('\n- ')}`);
  }

  for (const warning of warnings) {
    console.warn(`[env] ${warning}`);
  }

  return env;
}
