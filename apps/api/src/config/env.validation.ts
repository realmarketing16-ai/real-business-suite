type Env = Record<string, string | undefined>;

function requireValue(env: Env, key: string, errors: string[]) {
  if (!env[key]?.trim()) errors.push(`${key} is required.`);
}

function requireUrl(env: Env, key: string, errors: string[], options: { requireHttps?: boolean } = {}) {
  const value = env[key]?.trim();
  if (!value) {
    errors.push(`${key} is required.`);
    return;
  }

  try {
    const url = new URL(value);
    if (options.requireHttps && url.protocol !== 'https:') {
      errors.push(`${key} must use https:// in production.`);
    }
  } catch {
    errors.push(`${key} must be a valid URL.`);
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
    requireUrl(env, 'WEB_URL', errors, { requireHttps: true });

    if (!emailDryRun) {
      requireValue(env, 'RESEND_API_KEY', errors);
      requireValue(env, 'EMAIL_FROM', errors);
    }
  } else {
    if (!jwtSecret) warnings.push('JWT_SECRET is not set; development fallback will be used.');
    if (!env.WEB_URL) warnings.push('WEB_URL is not set; local CORS default will be used.');
  }

  const apiPort = env.API_PORT;
  if (apiPort && Number.isNaN(Number(apiPort))) errors.push('API_PORT must be a number.');

  if (errors.length > 0) {
    throw new Error(`Invalid API environment:\n- ${errors.join('\n- ')}`);
  }

  for (const warning of warnings) {
    console.warn(`[env] ${warning}`);
  }

  return env;
}
