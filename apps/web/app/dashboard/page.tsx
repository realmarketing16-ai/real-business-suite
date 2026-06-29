'use client';

import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';

type Summary = {
  company: { name: string; industry?: string };
  metrics: { employees: number; activeEmployees: number; departments: number; productsEnabled: number };
  suggestions: string[];
};

type EmployeeStatus = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE';

type Employee = {
  id: string;
  employeeNo: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  jobTitle?: string | null;
  department?: string | null;
  status: EmployeeStatus;
};

type EmployeeForm = {
  employeeNo: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  jobTitle: string;
  department: string;
  status: EmployeeStatus;
};

const emptyEmployeeForm: EmployeeForm = {
  employeeNo: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  jobTitle: '',
  department: '',
  status: 'ACTIVE',
};

function toEmployeeForm(employee: Employee): EmployeeForm {
  return {
    employeeNo: employee.employeeNo,
    firstName: employee.firstName,
    lastName: employee.lastName,
    email: employee.email ?? '',
    phone: employee.phone ?? '',
    jobTitle: employee.jobTitle ?? '',
    department: employee.department ?? '',
    status: employee.status,
  };
}

function cleanPayload(form: EmployeeForm) {
  return {
    employeeNo: form.employeeNo.trim(),
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    email: form.email.trim() || undefined,
    phone: form.phone.trim() || undefined,
    jobTitle: form.jobTitle.trim() || undefined,
    department: form.department.trim() || undefined,
    status: form.status,
  };
}

function initials(firstName?: string, lastName?: string) {
  return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() || 'RB';
}

export default function DashboardPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [form, setForm] = useState<EmployeeForm>(emptyEmployeeForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const activeEmployee = useMemo(() => employees.find((employee) => employee.id === editingId), [editingId, employees]);

  async function loadDashboard() {
    setError('');
    const [nextSummary, nextEmployees] = await Promise.all([
      api<Summary>('/dashboard/summary'),
      api<Employee[]>('/employees'),
    ]);
    setSummary(nextSummary);
    setEmployees(nextEmployees);
  }

  useEffect(() => {
    loadDashboard()
      .catch((cause) => {
        const message = cause instanceof Error ? cause.message : 'Unable to load dashboard';
        setError(message);
        if (message.toLowerCase().includes('token')) router.push('/login');
      })
      .finally(() => setLoading(false));
  }, [router]);

  function signOut() {
    window.localStorage.removeItem('rbs_token');
    window.localStorage.removeItem('rbs_user');
    router.push('/login');
  }

  function updateField(field: keyof EmployeeForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function startEdit(employee: Employee) {
    setEditingId(employee.id);
    setForm(toEmployeeForm(employee));
    setNotice('');
    setError('');
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyEmployeeForm);
  }

  async function saveEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');

    try {
      const payload = cleanPayload(form);
      if (editingId) {
        await api<Employee>(`/employees/${editingId}`, { method: 'PATCH', body: JSON.stringify(payload) });
        setNotice(`${payload.firstName} ${payload.lastName} was updated.`);
      } else {
        await api<Employee>('/employees', { method: 'POST', body: JSON.stringify(payload) });
        setNotice(`${payload.firstName} ${payload.lastName} was added.`);
      }

      resetForm();
      await loadDashboard();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save employee');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="appShell">
      <aside className="sidebar">
        <div className="brand light"><span>R</span> RBS</div>
        <nav>
          <a className="active">Overview</a>
          <a className="active">Employees</a>
          <a>Company</a>
          <a className="disabled">Leave <small>0.3</small></a>
          <a className="disabled">Recruitment <small>0.4</small></a>
          <a className="disabled">Marketing <small>0.5</small></a>
        </nav>
        <button className="signOut" onClick={signOut}>Sign out</button>
      </aside>

      <section className="dashboard">
        <header>
          <div>
            <p className="eyebrow">Founder dashboard</p>
            <h1>{summary ? `Welcome to ${summary.company.name}` : 'Welcome back'}</h1>
          </div>
          <div className="avatar">IB</div>
        </header>

        {error && <p className="error">{error}</p>}
        {notice && <p className="success">{notice}</p>}

        <div className="stats">
          <article><span>Total employees</span><b>{summary?.metrics.employees ?? (loading ? '—' : 0)}</b><small>People records</small></article>
          <article><span>Active employees</span><b>{summary?.metrics.activeEmployees ?? (loading ? '—' : 0)}</b><small>Currently active</small></article>
          <article><span>Departments</span><b>{summary?.metrics.departments ?? (loading ? '—' : 0)}</b><small>Business teams</small></article>
          <article><span>Products enabled</span><b>{summary?.metrics.productsEnabled ?? '—'}</b><small>HR foundation</small></article>
        </div>

        <div className="dashboardGrid">
          <article className="panel">
            <div className="panelHeading">
              <div>
                <p className="eyebrow">Today</p>
                <h2>Recommended actions</h2>
              </div>
              <span className="badge">Asher</span>
            </div>
            <ul className="suggestions">
              {(summary?.suggestions ?? ['Loading your business priorities…']).map((item) => <li key={item}><i>✓</i>{item}</li>)}
            </ul>
          </article>
          <article className="panel">
            <p className="eyebrow">Alpha progress</p>
            <h2>Your foundation</h2>
            <div className="progress"><span style={{ width: employees.length ? '80%' : '45%' }} /></div>
            <p className="muted">Add employees and keep records clean to finish initial setup.</p>
          </article>
        </div>

        <section className="employeeSection">
          <article className="panel employeeFormPanel">
            <div className="panelHeading">
              <div>
                <p className="eyebrow">Employee management</p>
                <h2>{editingId ? `Edit ${activeEmployee?.firstName ?? 'employee'}` : 'Add an employee'}</h2>
              </div>
              {editingId && <button className="ghostButton" onClick={resetForm}>Cancel edit</button>}
            </div>

            <form className="employeeForm" onSubmit={saveEmployee}>
              <label>Employee number<input required value={form.employeeNo} onChange={(event) => updateField('employeeNo', event.target.value)} placeholder="EMP-001" disabled={saving || Boolean(editingId)} /></label>
              <label>First name<input required minLength={2} value={form.firstName} onChange={(event) => updateField('firstName', event.target.value)} placeholder="Jordan" disabled={saving} /></label>
              <label>Last name<input required minLength={2} value={form.lastName} onChange={(event) => updateField('lastName', event.target.value)} placeholder="Taylor" disabled={saving} /></label>
              <label>Email<input type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} placeholder="jordan@company.com" disabled={saving} /></label>
              <label>Phone<input value={form.phone} onChange={(event) => updateField('phone', event.target.value)} placeholder="+1 555 0100" disabled={saving} /></label>
              <label>Job title<input value={form.jobTitle} onChange={(event) => updateField('jobTitle', event.target.value)} placeholder="Operations Manager" disabled={saving} /></label>
              <label>Department<input value={form.department} onChange={(event) => updateField('department', event.target.value)} placeholder="Operations" disabled={saving} /></label>
              <label>Status<select value={form.status} onChange={(event) => updateField('status', event.target.value as EmployeeStatus)} disabled={saving}>
                <option value="ACTIVE">Active</option>
                <option value="ON_LEAVE">On leave</option>
                <option value="INACTIVE">Inactive</option>
              </select></label>
              <button className="button" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Update employee' : 'Add employee'}</button>
            </form>
          </article>

          <article className="panel employeeListPanel">
            <div className="panelHeading">
              <div>
                <p className="eyebrow">People records</p>
                <h2>Employees</h2>
              </div>
              <span className="badge">{employees.length} total</span>
            </div>

            {employees.length === 0 ? (
              <div className="emptyState">
                <h3>No employees yet</h3>
                <p className="muted">Add your first employee to unlock live dashboard metrics.</p>
              </div>
            ) : (
              <div className="employeeTableWrap">
                <table className="employeeTable">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Role</th>
                      <th>Department</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((employee) => (
                      <tr key={employee.id}>
                        <td>
                          <div className="employeeIdentity">
                            <span>{initials(employee.firstName, employee.lastName)}</span>
                            <div>
                              <b>{employee.firstName} {employee.lastName}</b>
                              <small>{employee.employeeNo}{employee.email ? ` · ${employee.email}` : ''}</small>
                            </div>
                          </div>
                        </td>
                        <td>{employee.jobTitle || '—'}</td>
                        <td>{employee.department || '—'}</td>
                        <td><span className={`statusPill ${employee.status.toLowerCase()}`}>{employee.status.replace('_', ' ')}</span></td>
                        <td><button className="ghostButton" onClick={() => startEdit(employee)}>Edit</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>
        </section>
      </section>
    </main>
  );
}
