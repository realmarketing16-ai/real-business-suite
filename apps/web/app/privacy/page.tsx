import { LegalPage } from '../legal-content';
import { brand } from '@/lib/brand';

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Privacy"
      title="Privacy Policy"
      description={`How ${brand.name} handles company, user, and business records.`}
    >
      <h2>What we collect</h2>
      <p>{brand.name} stores the information your company enters into the platform, including account details, company profile data, customers, employees, invoices, quotes, projects, tasks, inventory, expenses, audit logs, and queued emails.</p>

      <h2>How we use data</h2>
      <p>We use your data to provide business management features, authenticate users, enforce team permissions, generate reports, prepare documents, and support operational workflows inside your company account.</p>

      <h2>Access and permissions</h2>
      <p>Access is controlled by company roles. Owners and admins manage sensitive settings and team access. Managers can operate business records. Employees have limited access focused on viewing records and updating assigned task status.</p>

      <h2>Security</h2>
      <p>Production deployments should use HTTPS, strong secrets, private database credentials, backups, and least-privilege team roles. Do not share passwords or commit environment secrets to source control.</p>

      <h2>Data retention</h2>
      <p>Your company is responsible for reviewing data retention, backups, exports, and deletion processes for its legal and operational needs. Before public launch, confirm your backup and restore process is tested.</p>

      <h2>Contact</h2>
      <p>For privacy questions or data requests, contact your company owner/admin or the {brand.name} support contact listed on the support page.</p>
    </LegalPage>
  );
}
