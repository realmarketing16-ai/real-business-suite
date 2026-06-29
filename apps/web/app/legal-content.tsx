import Link from 'next/link';
import { ReactNode } from 'react';

type LegalPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

export function LegalPage({ eyebrow, title, description, children }: LegalPageProps) {
  return (
    <main className="legalPage">
      <nav className="nav shell">
        <Link className="brand" href="/"><span>R</span> Real Business Suite</Link>
        <div className="navActions"><Link href="/support">Support</Link><Link href="/login">Sign in</Link><Link className="button small" href="/register">Start free</Link></div>
      </nav>
      <section className="legalHero shell">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="lead">{description}</p>
      </section>
      <section className="legalCard shell">
        {children}
      </section>
      <footer className="publicFooter shell">
        <span>© {new Date().getFullYear()} Real Business Suite</span>
        <nav><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/support">Support</Link></nav>
      </footer>
    </main>
  );
}
