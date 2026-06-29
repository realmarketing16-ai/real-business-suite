import { INestApplication } from '@nestjs/common';

type SecurityHeaderResponse = {
  setHeader(header: string, value: string): void;
};

type Next = () => void;

const commonSecurityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
};

export function applySecurityHeaders(app: INestApplication) {
  app.use((_request: unknown, response: SecurityHeaderResponse, next: Next) => {
    for (const [header, value] of Object.entries(commonSecurityHeaders)) {
      response.setHeader(header, value);
    }

    if (process.env.NODE_ENV === 'production') {
      response.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    response.setHeader('Cache-Control', 'no-store');
    next();
  });
}
