'use client';

import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';

type Company = {
  id: string;
  name: string;
  industry?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
};

type CompanyForm = {
  name: string;
  industry: string;
  email: string;
  phone: string;
  address: string;
};

type Summary = {
  company: Company;
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

const emptyCompanyForm: CompanyForm = {
  name: '',
  industry: '',
  email: '',
  phone: '',
  address: '',
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

function toCompanyForm(company: Company): CompanyForm {
  return {
    name: company.name,
    industry: company.industry ?? '',
    email: company.email ?? '',
    phone: company.phone ?? '',
    address: company.address ?? '',
  };
}

function cleanEmployeePayload(form: EmployeeForm) {
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

function cleanCompanyPayload(form: CompanyForm) {
  return {
    name: form.name.trim(),
    industry: form.industry.trim() || undefined,
    email: form.email.trim() || undefined,
    phone: form.phone.trim() || undefined,
    address: form.address.trim() || undefined,
  };
}

function initials(firstName?: string, lastName?: string) {
  return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() || 'RB';
}

export default function DashboardPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [companyForm, setCompanyForm] = useState<CompanyForm>(emptyCompanyForm);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeForm, setEmployeeForm] = useState<EmployeeForm>(emptyEmployeeForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingEmployee, setSavingEmployee] = useState(false);
  const [savingCompany, setSavingCompany] = useState(false);

  const activeEmployee = useMemo(() => employees.find((employee) => employee.id === editingId), [editingId, employees]);

  async function loadDashboard() {
    setError('');
    const [nextSummary, nextCompany, nextEmployees] = await Promise.all([
      api<Summary>('/dashboard/summary'),
      api<Company>('/company'),
      api<Employee[]>('/employees'),
    ]);
    setSummary(nextSummary);
    setCompany(nextCompany);
    setCompanyForm(toCompanyForm(nextCompany));
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

  function updateEmployeeField(field: keyof EmployeeForm, value: string) {
    setEmployeeForm((current) => ({ ...current, [field]: value }));
  }

  function updateCompanyField(field: keyof CompanyForm, value: string) {
    setCompanyForm((current) => ({ ...current, [field]: value }));
  }

  function startEdit(employee: Employee) {
    setEditingId(employee.id);
    setEmployeeForm(toEmployeeForm(employee));
    setNotice('');
    setError('');
  }

  function resetEmployeeForm() {
    setEditingId(null);
    setEmployeeForm(emptyEmployeeForm);
  }

  async function saveEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingEmployee(true);
    setError('');
    setNotice('');

    try {
      const payload = cleanEmployeePayload(employeeForm);
      if (editingId) {
        await api<Employee>(`/employees/${editingId}`, { method: 'PATCH', body: JSON.stringify(payload) });
        setNotice(`${payload.firstName} ${payload.lastName} was updated.`);
      } else {
        await api<Employee>('/employees', { method: 'POST', body: JSON.stringify(payload) });
        setNotice(`${payload.firstName} ${payload.lastName} was added.`);
      }

      resetEmployeeForm();
      await loadDashboard();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save employee');
    } finally {
      setSavingEmployee(false);
    }
  }

  async function saveCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingCompany(true);
    setError('');
    setNotice('');

    try {
      const payload = cleanCompanyPayload(companyForm);
      const updatedCompany = await api<Company>('/company', { method: 'PATCH', body: JSON.stringify(payload) });
      setCompany(updatedCompany);
      setCompanyForm(toCompanyForm(updatedCompany));
      setNotice('Company settings were updated.');
      await loadDashboard();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save company settings');
    } finally {
      setSavingCompany(false);
    }
  }

  const companyName = company?.name ?? summary?.company.name ?? 'your company';

  return (
    <main className="appShell">
      <aside className="sidebar">
        <div className="brand light"><span>R</span> RBS</div>
        <nav>
          <a className="active">Overview</a>
          <a className="active">Employees</a>
          <a className="active">Company</a>
          <a className="disabled">Leave <small>0.4</small></a>
          <a className="disabled">Recruitment <small>0.5</small></a>
          <a className="disabled">Marketing <small>0.6</small></a>
        </nav>
        <button className="signOut" onClick={signOut}>Sign out</button>
      </aside>

      <section className="dashboard">
        <header>
          <div>
            <p className="eyebrow">Founder dashboard</p>
            <h1>{summary ? `Welcome to ${companyName}` : 'Welcome back'}</h1>
          </div>
          <div className="avatar">IB</div>
        </header>

        {error && <p className="error">{error}</p>}
        {notice && <p className="success">{notice}</p>}

        <div className="stats">
          <article><span>Total employees</span><b>{summary?.metrics.employees ?? (loading ? '-' : 0)}</b><small>People records</small></article>
          <article><span>Active employees</span><b>{summary?.metrics.activeEmployees ?? (loading ? '-' : 0)}</b><small>Currently active</small></article>
          <article><span>Departments</span><b>{summary?.metrics.departments ?? (loading ? '-' : 0)}</b><small>Business teams</small></article>
          <article><span>Products enabled</span><b>{summary?.metrics.productsEnabled ?? '-'}</b><small>HR foundation</small></article>
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
              {(summary?.suggestions ?? ['Loading your business priorities...']).map((item) => <li key={item}><i>✓</i>{item}</li>)}
            </ul>
          </article>
          <article className="panel companySnapshot">
            <p className="eyebrow">Company profile</p>
            <h2>{companyName}</h2>
            <dl>
              <div><dt>Industry</dt><dd>{company?.industry || 'Not set'}</dd></div>
              <div><dt>Email</dt><dd>{company?.email || 'Not set'}</dd></div>
              <div><dt>Phone</dt><dd>{company?.phone || 'Not set'}</dd></div>
            </dl>
          </article>
        </div>

        <section className="companySection">
          <article className="panel companyFormPanel">
            <div className="panelHeading">
              <div>
                <p className="eyebrow">Company settings</p>
                <h2>Business profile</h2>
              </div>
              <span className="badge">Alpha 0.3</span>
            </div>

            <form className="companyForm" onSubmit={saveCompany}>
              <label>Company name<input required minLength={2} value={companyForm.name} onChange={(event) => updateCompanyField('name', event.target.value)} placeholder="Real Business Suite" disabled={savingCompany} /></label>
              <label>Industry<input value={companyForm.industry} onChange={(event) => updateCompanyField('industry', event.target.value)} placeholder="Professional services" disabled={savingCompany} /></label>
              <label>Email<input type="email" value={companyForm.email} onChange={(event) => updateCompanyField('email', event.target.value)} placeholder="hello@company.com" disabled={savingCompany} /></label>
              <label>Phone<input value={companyForm.phone} onChange={(event) => updateCompanyField('phone', event.target.value)} placeholder="+1 555 0100" disabled={savingCompany} /></label>
              <label className="wideField">Address<textarea value={companyForm.address} onChange={(event) => updateCompanyField('address', event.target.value)} placeholder="Street, city, state" disabled={savingCompany} /></label>
              <button className="button" disabled={savingCompany}>{savingCompany ? 'Saving...' : 'Save company settings'}</button>
            </form>
          </article>
        </section>

        <section className="employeeSection">
          <article className="panel employeeFormPanel">
            <div className="panelHeading">
              <div>
                <p className="eyebrow">Employee management</p>
                <h2>{editingId ? `Edit ${activeEmployee?.firstName ?? 'employee'}` : 'Add an employee'}</h2>
              </div>
              {editingId && <button className="ghostButton" onClick={resetEmployeeForm}>Cancel edit</button>}
            </div>

            <form className="employeeForm" onSubmit={saveEmployee}>
              <label>Employee number<input required value={employeeForm.employeeNo} onChange={(event) => updateEmployeeField('employeeNo', event.target.value)} placeholder="EMP-001" disabled={savingEmployee || Boolean(editingId)} /></label>
              <label>First name<input required minLength={2} value={employeeForm.firstName} onChange={(event) => updateEmployeeField('firstName', event.target.value)} placeholder="Jordan" disabled={savingEmployee} /></label>
              <label>Last name<input required minLength={2} value={employeeForm.lastName} onChange={(event) => updateEmployeeField('lastName', event.target.value)} placeholder="Taylor" disabled={savingEmployee} /></label>
              <label>Email<input type="email" value={employeeForm.email} onChange={(event) => updateEmployeeField('email', event.target.value)} placeholder="jordan@company.com" disabled={savingEmployee} /></label>
              <label>Phone<input value={employeeForm.phone} onChange={(event) => updateEmployeeField('phone', event.target.value)} placeholder="+1 555 0100" disabled={savingEmployee} /></label>
              <label>Job title<input value={employeeForm.jobTitle} onChange={(event) => updateEmployeeField('jobTitle', event.target.value)} placeholder="Operations Manager" disabled={savingEmployee} /></label>
              <label>Department<input value={employeeForm.department} onChange={(event) => updateEmployeeField('department', event.target.value)} placeholder="Operations" disabled={savingEmployee} /></label>
              <label>Status<select value={employeeForm.status} onChange={(event) => updateEmployeeField('status', event.target.value as EmployeeStatus)} disabled={savingEmployee}>
                <option value="ACTIVE">Active</option>
                <option value="ON_LEAVE">On leave</option>
                <option value="INACTIVE">Inactive</option>
              </select></label>
              <button className="button" disabled={savingEmployee}>{savingEmployee ? 'Saving...' : editingId ? 'Update employee' : 'Add employee'}</button>
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
                        <td>{employee.jobTitle || '-'}</td>
                        <td>{employee.department || '-'}</td>
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
