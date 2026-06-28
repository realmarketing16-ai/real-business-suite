# Alpha 0.1 acceptance criteria

- A founder can register a company and owner account.
- A registered owner can sign in and receive an expiring JWT.
- Protected API requests are tenant-scoped by `companyId` from the signed token.
- A company can view and update its profile.
- A company can add, list, and update employees.
- The dashboard displays company-specific employee and department totals.
- Passwords are hashed with bcrypt and never returned by the API.

## Next implementation slice

1. Add refresh-token rotation and password reset.
2. Add employee screens to the web application.
3. Add role guards for owner, admin, manager, and employee access.
4. Add API and browser tests before the first deployment.
