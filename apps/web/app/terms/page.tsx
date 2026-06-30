import { LegalPage } from '../legal-content';
import { brand } from '@/lib/brand';

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Terms"
      title="Terms of Service"
      description={`The basic rules for using ${brand.name} responsibly.`}
    >
      <h2>Use of the platform</h2>
      <p>{brand.name} is provided to help businesses manage operations, customers, employees, invoices, projects, inventory, and reports. You are responsible for the accuracy of the information entered into your company account.</p>

      <h2>Accounts and roles</h2>
      <p>The first registered user becomes the company owner. Owners and admins are responsible for inviting users, assigning roles, removing access when needed, and keeping login credentials secure.</p>

      <h2>Business records</h2>
      <p>Invoices, quotes, payments, expenses, reports, and exported files should be reviewed by your company before being used for accounting, tax, legal, or customer-facing decisions.</p>

      <h2>Email and integrations</h2>
      <p>Email delivery and third-party integrations depend on configured providers. Test delivery in dry-run mode first, then verify sender domains and provider settings before sending real customer emails.</p>

      <h2>Availability and backups</h2>
      <p>For production launch, use managed hosting, monitoring, database backups, and a documented rollback plan. Your company should verify backups before relying on the system for live operations.</p>

      <h2>No professional advice</h2>
      <p>The software helps organize business information, but it does not replace legal, accounting, tax, HR, or compliance advice from qualified professionals.</p>
    </LegalPage>
  );
}
