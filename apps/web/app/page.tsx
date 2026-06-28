import Link from 'next/link';

export default function Home() {
  return (
    <main className="landing">
      <nav className="nav shell">
        <div className="brand"><span>R</span> Real Business Suite</div>
        <div className="navActions"><Link href="/login">Sign in</Link><Link className="button small" href="/register">Start free</Link></div>
      </nav>
      <section className="hero shell">
        <div>
          <p className="eyebrow">Built in PNG, for growing businesses</p>
          <h1>Your whole business.<br/><em>One clear view.</em></h1>
          <p className="lead">Manage your people, recruitment, marketing, sales and operations from one secure platform.</p>
          <div className="heroActions"><Link className="button" href="/register">Create your company</Link><Link className="textLink" href="/login">I already have an account →</Link></div>
        </div>
        <div className="preview">
          <div className="previewTop"><span/><span/><span/></div>
          <p className="muted">Good morning, Imran</p>
          <h2>Business overview</h2>
          <div className="metricGrid">
            <div><b>4,230</b><span>Employees</span></div><div><b>K42.5k</b><span>Revenue</span></div><div><b>96</b><span>Open jobs</span></div><div><b>18</b><span>Campaigns</span></div>
          </div>
          <div className="activity"><i/><div><b>Everything important, in one place</b><span>Clear actions for your team every morning.</span></div></div>
        </div>
      </section>
    </main>
  );
}
