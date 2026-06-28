'use client';

import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type Summary = {
  company: { name: string; industry?: string };
  metrics: { employees: number; activeEmployees: number; departments: number; productsEnabled: number };
  suggestions: string[];
};

export default function DashboardPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<Summary>('/dashboard/summary').then(setSummary).catch((cause) => {
      setError(cause instanceof Error ? cause.message : 'Unable to load dashboard');
      if (String(cause).toLowerCase().includes('token')) router.push('/login');
    });
  }, [router]);

  function signOut() {
    window.localStorage.removeItem('rbs_token');
    window.localStorage.removeItem('rbs_user');
    router.push('/login');
  }

  return <main className="appShell"><aside className="sidebar"><div className="brand light"><span>R</span> RBS</div><nav><a className="active">Overview</a><a>Employees</a><a>Company</a><a className="disabled">Leave <small>0.2</small></a><a className="disabled">Recruitment <small>0.3</small></a><a className="disabled">Marketing <small>0.4</small></a></nav><button className="signOut" onClick={signOut}>Sign out</button></aside><section className="dashboard"><header><div><p className="eyebrow">Founder dashboard</p><h1>{summary ? `Welcome to ${summary.company.name}` : 'Welcome back'}</h1></div><div className="avatar">IB</div></header>{error && <p className="error">{error}</p>}<div className="stats"><article><span>Total employees</span><b>{summary?.metrics.employees ?? '—'}</b><small>People records</small></article><article><span>Active employees</span><b>{summary?.metrics.activeEmployees ?? '—'}</b><small>Currently active</small></article><article><span>Departments</span><b>{summary?.metrics.departments ?? '—'}</b><small>Business teams</small></article><article><span>Products enabled</span><b>{summary?.metrics.productsEnabled ?? '—'}</b><small>HR foundation</small></article></div><div className="dashboardGrid"><article className="panel"><div className="panelHeading"><div><p className="eyebrow">Today</p><h2>Recommended actions</h2></div><span className="badge">Asher</span></div><ul className="suggestions">{(summary?.suggestions ?? ['Loading your business priorities…']).map((item) => <li key={item}><i>✓</i>{item}</li>)}</ul></article><article className="panel"><p className="eyebrow">Alpha progress</p><h2>Your foundation</h2><div className="progress"><span style={{width: summary?.metrics.employees ? '75%' : '45%'}}/></div><p className="muted">Complete company details and add employees to finish initial setup.</p></article></div></section></main>;
}
