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
  hidden?: boolean;
};

function check(key: string, label: string, status: ReadinessStatus, detail: string, hidden = false): ReadinessCheck {
  return { key, label, status, detail, hidden };
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
    checks.push(check('database', 'Database connection', databaseOk ? 'PASS' : 'FAIL', databaseOk ? 'Your business data connection is healthy.' : 'The app could not reach the database.'));

    const migrationCount = await this.migrationCount();
    checks.push(check('migrations', 'Database setup', migrationCount > 0 ? 'PASS' : 'WARN', migrationCount > 0 ? 'Database tables are set up.' : 'Database setup history was not found.'));

    const jwtSecret = this.config.get<string>('JWT_SECRET', '');
    const jwtStrong = jwtSecret.length >= 32 && !jwtSecret.toLowerCase().includes('development') && !jwtSecret.toLowerCase().includes('change-me');
    checks.push(check('jwt', 'Login security', jwtStrong ? 'PASS' : 'FAIL', jwtStrong ? 'Login security is configured.' : 'Login security needs a stronger production secret.'));

    const port = this.config.get<string>('PORT', '');
    const apiPort = this.config.get<string>('API_PORT', '4000');
    checks.push(check('api_port', 'Hosting port', port || apiPort ? 'PASS' : 'WARN', 'Hosting port is configured.', true));

    const nodeEnv = this.config.get<string>('NODE_ENV', 'development');
    checks.push(check('node_env', 'Production mode', nodeEnv === 'production' ? 'PASS' : 'WARN', nodeEnv === 'production' ? 'The app is running in production mode.' : 'The app is not running in production mode.'));

    const webUrls = parseWebUrls(this.config.get<string>('WEB_URL', 'http://localhost:3000'));
    const parsedWebUrls = webUrls.map((url) => safeUrl(url));
    const allWebUrlsValid = parsedWebUrls.every(Boolean);
    const webUrlProductionReady = allWebUrlsValid && parsedWebUrls.every((url) => url?.protocol === 'https:' && url.hostname !== 'localhost');
    checks.push(check('web_url', 'Website connection', webUrlProductionReady ? 'PASS' : 'WARN', allWebUrlsValid ? (webUrlProductionReady ? 'The website is connected securely.' : 'Use secure HTTPS website URLs before public launch.') : 'Website URL settings need review.'));

    const databaseUrl = this.config.get<string>('DATABASE_URL', '');
    const parsedDatabaseUrl = safeUrl(databaseUrl);
    const databaseIsPostgres = parsedDatabaseUrl?.protocol.startsWith('postgres');
    const databaseLooksLocal = parsedDatabaseUrl?.hostname === 'localhost' || parsedDatabaseUrl?.hostname === '127.0.0.1';
    checks.push(check('database_url', 'Managed database', databaseIsPostgres && !databaseLooksLocal ? 'PASS' : 'WARN', databaseIsPostgres ? (databaseLooksLocal ? 'Database is still local; use managed cloud database before public launch.' : 'Managed database setting looks ready.') : 'Database setting needs review.'));

    const dryRun = this.config.get<string>('EMAIL_DRY_RUN', '').toLowerCase() === 'true';
    const resendApiKey = this.config.get<string>('RESEND_API_KEY', '');
    const emailFrom = this.config.get<string>('EMAIL_FROM', '');
    const emailReady = dryRun || (Boolean(resendApiKey) && Boolean(emailFrom));
    checks.push(check('email', 'Email delivery', emailReady ? (dryRun ? 'WARN' : 'PASS') : 'FAIL', dryRun ? 'Email is still in test mode; messages will not be sent to customers yet.' : emailReady ? 'Email sending is configured.' : 'Set up email sending before public launch.'));

    const stripeSecretKey = this.config.get<string>('STRIPE_SECRET_KEY', '');
    const stripeWebhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET', '');
    const stripeReady = Boolean(stripeSecretKey && stripeWebhookSecret);
    checks.push(check('payments', 'Customer payments', stripeReady ? 'PASS' : 'WARN', stripeReady ? 'Online payment settings are configured.' : 'Online payments are not connected yet; use manual payments for pilot clients.'));

    const deploymentDoc = existsSync(join(process.cwd(), '..', '..', 'docs', 'PRODUCTION-DEPLOYMENT.md')) || existsSync(join(process.cwd(), 'docs', 'PRODUCTION-DEPLOYMENT.md'));
    const launchDoc = existsSync(join(process.cwd(), '..', '..', 'docs', 'LAUNCH-READINESS.md')) || existsSync(join(process.cwd(), 'docs', 'LAUNCH-READINESS.md'));
    checks.push(check('docs', 'Launch guide', deploymentDoc && launchDoc ? 'PASS' : 'WARN', deploymentDoc && launchDoc ? 'Launch guide is available.' : 'Launch guide is missing from the runtime filesystem.'));

    const pendingEmails = await this.prisma.emailMessage.count({ where: { companyId: user.companyId, status: 'QUEUED' } });
    const failedEmails = await this.prisma.emailMessage.count({ where: { companyId: user.companyId, status: 'FAILED' } });
    checks.push(check('email_queue', 'Email queue', failedEmails === 0 ? (pendingEmails === 0 ? 'PASS' : 'WARN') : 'FAIL', failedEmails === 0 ? (pendingEmails === 0 ? 'No email delivery issues found.' : `${pendingEmails} email message${pendingEmails === 1 ? '' : 's'} waiting to send.`) : `${failedEmails} email message${failedEmails === 1 ? '' : 's'} failed to send.`));

    const auditCount = await this.prisma.auditLog.count({ where: { companyId: user.companyId } });
    checks.push(check('audit_logs', 'Audit trail', auditCount > 0 ? 'PASS' : 'WARN', auditCount > 0 ? 'Admin activity tracking is working.' : 'No admin activity has been recorded yet.'));

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
