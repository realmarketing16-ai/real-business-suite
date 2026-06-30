import { Controller, Get, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ensureOwnerOrAdmin } from '../auth/roles';
import { parseWebUrls } from '../config/web-url';
import { PrismaService } from '../prisma/prisma.service';

type ReadinessStatus = 'PASS' | 'WARN' | 'FAIL';

type ReadinessCheck = {
  key: string;
  label: string;
  status: ReadinessStatus;
  detail: string;
};

function check(key: string, label: string, status: ReadinessStatus, detail: string): ReadinessCheck {
  return { key, label, status, detail };
}

function safeUrl(value: string) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

@UseGuards(JwtAuthGuard)
@Controller('readiness')
export class ReadinessController {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}

  @Get()
  async status(@CurrentUser() user: AuthenticatedUser) {
    ensureOwnerOrAdmin(user, 'view readiness status');

    const checks: ReadinessCheck[] = [];
    const databaseOk = await this.databaseCheck();
    checks.push(check('database', 'Database connectivity', databaseOk ? 'PASS' : 'FAIL', databaseOk ? 'Database responded successfully.' : 'Database query failed.'));

    const migrationCount = await this.migrationCount();
    checks.push(check('migrations', 'Database migrations', migrationCount > 0 ? 'PASS' : 'WARN', migrationCount > 0 ? `${migrationCount} migrations are recorded.` : 'No Prisma migrations were found in the database.'));

    const jwtSecret = this.config.get<string>('JWT_SECRET', '');
    const jwtStrong = jwtSecret.length >= 32 && !jwtSecret.toLowerCase().includes('development') && !jwtSecret.toLowerCase().includes('change-me');
    checks.push(check('jwt', 'JWT secret', jwtStrong ? 'PASS' : 'FAIL', jwtStrong ? 'JWT secret looks production-strength.' : 'Set a unique JWT_SECRET with at least 32 random characters.'));

    const port = this.config.get<string>('PORT', '');
    const apiPort = this.config.get<string>('API_PORT', '4000');
    checks.push(check('api_port', 'API port', port || apiPort ? 'PASS' : 'WARN', port ? `PORT is provided by the host as ${port}.` : apiPort ? `API_PORT fallback is set to ${apiPort}.` : 'No PORT or API_PORT is set; default behavior will be used.'));

    const nodeEnv = this.config.get<string>('NODE_ENV', 'development');
    checks.push(check('node_env', 'Runtime mode', nodeEnv === 'production' ? 'PASS' : 'WARN', nodeEnv === 'production' ? 'API is running in production mode.' : `API is running in ${nodeEnv} mode.`));

    const webUrls = parseWebUrls(this.config.get<string>('WEB_URL', 'http://localhost:3000'));
    const parsedWebUrls = webUrls.map((url) => safeUrl(url));
    const allWebUrlsValid = parsedWebUrls.every(Boolean);
    const webUrlProductionReady = allWebUrlsValid && parsedWebUrls.every((url) => url?.protocol === 'https:' && url.hostname !== 'localhost');
    checks.push(check('web_url', 'Web/CORS origins', webUrlProductionReady ? 'PASS' : 'WARN', allWebUrlsValid ? `${webUrls.join(', ')} allowed as browser origin${webUrls.length === 1 ? '' : 's'}${webUrlProductionReady ? '.' : '; use HTTPS production domains before public launch.'}` : 'WEB_URL must be one URL or a comma-separated list of valid URLs.'));

    const databaseUrl = this.config.get<string>('DATABASE_URL', '');
    const parsedDatabaseUrl = safeUrl(databaseUrl);
    const databaseIsPostgres = parsedDatabaseUrl?.protocol.startsWith('postgres');
    const databaseLooksLocal = parsedDatabaseUrl?.hostname === 'localhost' || parsedDatabaseUrl?.hostname === '127.0.0.1';
    checks.push(check('database_url', 'Database URL', databaseIsPostgres && !databaseLooksLocal ? 'PASS' : 'WARN', databaseIsPostgres ? (databaseLooksLocal ? 'DATABASE_URL points to a local database; use managed PostgreSQL for production.' : 'DATABASE_URL uses PostgreSQL and does not point to localhost.') : 'DATABASE_URL should be a PostgreSQL connection string.'));

    const dryRun = this.config.get<string>('EMAIL_DRY_RUN', '').toLowerCase() === 'true';
    const resendApiKey = this.config.get<string>('RESEND_API_KEY', '');
    const emailFrom = this.config.get<string>('EMAIL_FROM', '');
    const emailReady = dryRun || (Boolean(resendApiKey) && Boolean(emailFrom));
    checks.push(check('email', 'Email delivery', emailReady ? (dryRun ? 'WARN' : 'PASS') : 'FAIL', dryRun ? 'Email is in dry-run mode; messages will not leave the system.' : emailReady ? 'Email provider settings are present.' : 'Set RESEND_API_KEY and EMAIL_FROM, or use EMAIL_DRY_RUN=true for testing.'));

    const stripeSecretKey = this.config.get<string>('STRIPE_SECRET_KEY', '');
    const stripeWebhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET', '');
    const stripeReady = Boolean(stripeSecretKey && stripeWebhookSecret);
    checks.push(check('payments', 'Customer payments', stripeReady ? 'PASS' : 'WARN', stripeReady ? 'Stripe checkout settings are present.' : 'Subscription plans are available, but set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET before charging customers online.'));

    const deploymentDoc = existsSync(join(process.cwd(), '..', '..', 'docs', 'PRODUCTION-DEPLOYMENT.md')) || existsSync(join(process.cwd(), 'docs', 'PRODUCTION-DEPLOYMENT.md'));
    const launchDoc = existsSync(join(process.cwd(), '..', '..', 'docs', 'LAUNCH-READINESS.md')) || existsSync(join(process.cwd(), 'docs', 'LAUNCH-READINESS.md'));
    checks.push(check('docs', 'Launch documentation', deploymentDoc && launchDoc ? 'PASS' : 'WARN', deploymentDoc && launchDoc ? 'Production and launch readiness docs are present.' : 'Deployment or launch readiness documentation is missing from the runtime filesystem.'));

    const pendingEmails = await this.prisma.emailMessage.count({ where: { companyId: user.companyId, status: 'QUEUED' } });
    const failedEmails = await this.prisma.emailMessage.count({ where: { companyId: user.companyId, status: 'FAILED' } });
    checks.push(check('email_queue', 'Email queue', failedEmails === 0 ? (pendingEmails === 0 ? 'PASS' : 'WARN') : 'FAIL', `${pendingEmails} queued and ${failedEmails} failed email messages.`));

    const auditCount = await this.prisma.auditLog.count({ where: { companyId: user.companyId } });
    checks.push(check('audit_logs', 'Audit trail', auditCount > 0 ? 'PASS' : 'WARN', auditCount > 0 ? `${auditCount} audit events recorded.` : 'No audit events recorded yet.'));

    const summary = {
      pass: checks.filter((item) => item.status === 'PASS').length,
      warn: checks.filter((item) => item.status === 'WARN').length,
      fail: checks.filter((item) => item.status === 'FAIL').length,
    };
    return {
      status: summary.fail > 0 ? 'NOT_READY' : summary.warn > 0 ? 'NEEDS_REVIEW' : 'READY',
      summary,
      checkedAt: new Date().toISOString(),
      checks,
    };
  }

  private async databaseCheck() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  private async migrationCount() {
    try {
      const rows = await this.prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*)::bigint AS count FROM "_prisma_migrations"`;
      return Number(rows[0]?.count ?? 0);
    } catch {
      return 0;
    }
  }
}
