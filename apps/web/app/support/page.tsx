import { LegalPage } from '../legal-content';

export default function SupportPage() {
  return (
    <LegalPage
      eyebrow="Support"
      title="Support and launch help"
      description="Where users should go when they need help running or launching Real Business Suite."
    >
      <h2>Before launch</h2>
      <ul>
        <li>Complete the dashboard launch setup checklist.</li>
        <li>Run production migrations and confirm API health.</li>
        <li>Test owner, admin, manager, and employee roles.</li>
        <li>Confirm email delivery mode is intentional.</li>
        <li>Back up the database and test restore.</li>
      </ul>

      <h2>Common support checks</h2>
      <ul>
        <li>If login fails, verify the API is running and `NEXT_PUBLIC_API_URL` points to the correct `/api` URL.</li>
        <li>If dashboard data does not load, verify the database connection and JWT secret.</li>
        <li>If emails fail, check the Email Outbox and confirm `EMAIL_DRY_RUN`, `RESEND_API_KEY`, and `EMAIL_FROM`.</li>
        <li>If role controls are missing, confirm the signed-in user has the correct owner/admin/manager permissions.</li>
      </ul>

      <h2>Recommended support contact</h2>
      <p>Before public launch, replace this section with your real support email, phone number, or helpdesk link. For now, use your internal administrator or project owner as the first support contact.</p>

      <h2>Emergency rollback</h2>
      <p>If a production release causes a major issue, pause new user activity, restore the last known-good deployment, verify database state, and review audit logs before reopening access.</p>
    </LegalPage>
  );
}
