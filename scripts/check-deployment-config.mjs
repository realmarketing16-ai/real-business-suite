import { readFileSync } from 'node:fs';

const checks = [];

function addCheck(name, pass, detail) {
  checks.push({ name, pass, detail });
}

function read(path) {
  return readFileSync(path, 'utf8');
}

function includesAll(text, values) {
  return values.every((value) => text.includes(value));
}

const packageJson = JSON.parse(read('package.json'));
const vercelJson = JSON.parse(read('vercel.json'));
const renderYaml = read('render.yaml');
const envExample = read('.env.example');
const secretGenerator = read('scripts/generate-launch-secret.mjs');
const lowCostLaunch = read('docs/LOW-COST-LAUNCH.md');
const hostingEnvChecklist = read('docs/HOSTING-ENV-CHECKLIST.md');
const productionDeployment = read('docs/PRODUCTION-DEPLOYMENT.md');
const brandingGuide = read('docs/BRANDING.md');
const smokeLocal = read('scripts/smoke-local.ps1');
const ciWorkflow = read('.github/workflows/ci.yml');

addCheck('package scripts', includesAll(JSON.stringify(packageJson.scripts ?? {}), ['smoke:local', 'smoke:hosted', 'readiness:prod', 'secret:jwt', 'secret:check', 'db:deploy']), 'Expected launch scripts are present.');
addCheck('JWT secret generator', includesAll(secretGenerator, ['randomBytes', 'JWT_SECRET=', 'Do not commit']), 'JWT secret helper generates a strong local secret without storing it.');
addCheck('Vercel build command', vercelJson.buildCommand === 'pnpm build', 'Vercel builds from the apps/web project root.');
addCheck('Vercel output directory', vercelJson.outputDirectory === '.next', 'Vercel output directory points to the Next.js build output inside apps/web.');
addCheck('Render health check', renderYaml.includes('healthCheckPath: /api/health'), 'Render health check points to the API health route.');
addCheck('Render migrations on start', renderYaml.includes('pnpm prisma:deploy'), 'Render start command applies Prisma migrations before boot.');
addCheck('Render production env', includesAll(renderYaml, ['NODE_ENV', 'production', 'DATABASE_URL', 'JWT_SECRET', 'WEB_URL']), 'Render config declares required production env values.');
addCheck('Env example launch vars', includesAll(envExample, ['DATABASE_URL', 'JWT_SECRET', 'WEB_URL', 'NEXT_PUBLIC_API_URL', 'NEXT_PUBLIC_BRAND_NAME', 'NEXT_PUBLIC_BRAND_LOGO_PATH', 'NEXT_PUBLIC_SUPPORT_CONTACT', 'BRAND_NAME', 'SUPPORT_CONTACT', 'EMAIL_DRY_RUN', 'NEXT_PUBLIC_STARTER_PRICE_MONTHLY', 'NEXT_PUBLIC_BUSINESS_PRICE_MONTHLY', 'NEXT_PUBLIC_PRO_PRICE_MONTHLY', 'BILLING_CURRENCY', 'BILLING_STARTER_PRICE_MONTHLY', 'BILLING_BUSINESS_PRICE_MONTHLY', 'BILLING_PRO_PRICE_MONTHLY', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET']), '.env.example documents launch-critical variables.');
addCheck('Low-cost guide commands', includesAll(lowCostLaunch, ['pnpm readiness:prod', 'pnpm smoke:hosted', 'Neon', 'Render', 'Vercel']), 'Low-cost guide includes hosted launch checks.');
addCheck('Hosting env checklist', includesAll(hostingEnvChecklist, ['DATABASE_URL', 'NEXT_PUBLIC_API_URL', 'BILLING_CURRENCY=PGK', 'NEXT_PUBLIC_BRAND_LOGO_PATH', 'pnpm secret:jwt', 'pnpm smoke:hosted', 'EMAIL_DRY_RUN=true']), 'Hosting checklist includes database, API, web, PGK, branding, email, and hosted smoke settings.');
addCheck('Production guide commands', includesAll(productionDeployment, ['pnpm smoke:local', 'pnpm smoke:hosted', 'pnpm readiness:prod', 'pnpm db:deploy']), 'Production guide includes release verification commands.');
addCheck('Branding guide', includesAll(brandingGuide, ['NEXT_PUBLIC_BRAND_NAME', '--brand-primary', 'NEXT_PUBLIC_SUPPORT_CONTACT']), 'Branding guide documents public brand settings and theme variables.');
addCheck('Smoke test public routes', includesAll(smokeLocal, ['/pricing', '/login', '/register', '/privacy', '/terms', '/support']), 'Smoke test covers public launch routes.');
addCheck('CI core checks', includesAll(ciWorkflow, ['pnpm install --frozen-lockfile', 'pnpm db:generate', 'pnpm lint', 'pnpm build']), 'CI includes install, Prisma generate, lint, and build.');

for (const check of checks) {
  console.log(`${check.pass ? '[PASS]' : '[FAIL]'} ${check.name}: ${check.detail}`);
}

const failed = checks.filter((check) => !check.pass);
if (failed.length > 0) {
  console.error(`\nDeployment config check failed: ${failed.length} issue(s) found.`);
  process.exit(1);
}

console.log('\nDeployment config check passed.');
