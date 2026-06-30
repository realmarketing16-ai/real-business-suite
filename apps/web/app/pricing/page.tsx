import Link from 'next/link';
import { BrandMark } from '../brand-mark';
import { brand } from '@/lib/brand';
import { formatPublicPrice, publicPricing } from '@/lib/pricing';

export default function PricingPage() {
  return (
    <main className="pricingPage">
      <nav className="nav shell">
        <BrandMark />
        <div className="navActions"><Link href="/">Home</Link><Link href="/support">Support</Link><Link href="/login">Sign in</Link><Link className="button small" href="/register">Start free</Link></div>
      </nav>

      <section className="pricingHero shell">
        <p className="eyebrow">PGK packages</p>
        <h1>Simple pricing for PNG businesses.</h1>
        <p className="lead">Start on the free private pilot, then upgrade only when the hosted system is working for your company.</p>
      </section>

      <section className="pricingGrid shell">
        {publicPricing.plans.map((plan) => (
          <article className={`pricingCard ${plan.featured ? 'featured' : ''}`} key={plan.name}>
            <div className="panelHeading">
              <div>
                <p className="eyebrow">{plan.badge}</p>
                <h2>{plan.name}</h2>
              </div>
              {plan.featured && <span className="badge">Best value</span>}
            </div>
            <p className="pricingPrice">{formatPublicPrice(plan.priceMonthly)}{plan.priceMonthly > 0 && <small> / month</small>}</p>
            <p className="muted">{plan.description}</p>
            <ul className="suggestions">
              {plan.features.map((feature) => <li key={feature}><i>✓</i>{feature}</li>)}
            </ul>
            <Link className="button" href="/register">{plan.priceMonthly === 0 ? 'Start free pilot' : `Choose ${plan.name}`}</Link>
          </article>
        ))}
      </section>

      <section className="pricingNote shell">
        <h2>Keep costs controlled while launching.</h2>
        <p>Use Neon, Render, and Vercel free URLs first. Keep email in dry-run mode and leave live payments off until the private pilot is proven.</p>
        <Link className="textLink" href="/support">Need setup help? Contact {brand.supportContact} →</Link>
      </section>

      <footer className="publicFooter shell">
        <span>© {new Date().getFullYear()} {brand.name}</span>
        <nav><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/support">Support</Link></nav>
      </footer>
    </main>
  );
}
