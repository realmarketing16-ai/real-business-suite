'use client';

import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';

type Company = { id: string; name: string; industry?: string | null; email?: string | null; phone?: string | null; address?: string | null };
type CompanyForm = { name: string; industry: string; email: string; phone: string; address: string };

type Summary = {
  company: Company;
  metrics: {
    employees: number;
    activeEmployees: number;
    departments: number;
    customers: number;
    activeCustomers: number;
    products: number;
    invoices: number;
    openInvoices: number;
    revenue: number;
    outstanding: number;
    productsEnabled: number;
  };
  suggestions: string[];
};

type EmployeeStatus = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE';
type Employee = { id: string; employeeNo: string; firstName: string; lastName: string; email?: string | null; phone?: string | null; jobTitle?: string | null; department?: string | null; status: EmployeeStatus };
type EmployeeForm = { employeeNo: string; firstName: string; lastName: string; email: string; phone: string; jobTitle: string; department: string; status: EmployeeStatus };

type CustomerStatus = 'LEAD' | 'ACTIVE' | 'INACTIVE';
type Customer = { id: string; name: string; email?: string | null; phone?: string | null; companyName?: string | null; status: CustomerStatus; notes?: string | null };
type CustomerForm = { name: string; email: string; phone: string; companyName: string; status: CustomerStatus; notes: string };

type ProductType = 'PRODUCT' | 'SERVICE';
type Product = { id: string; name: string; description?: string | null; type: ProductType; unitPrice: number; active: boolean };
type ProductForm = { name: string; description: string; type: ProductType; unitPrice: string };

type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'VOID';
type Invoice = {
  id: string;
  invoiceNo: string;
  status: InvoiceStatus;
  dueDate?: string | null;
  total: number;
  paid: number;
  balance: number;
  customer: Customer;
};
type InvoiceForm = { customerId: string; dueDate: string; productId: string; description: string; quantity: string; unitPrice: string; tax: string; notes: string };
type PaymentForm = { invoiceId: string; amount: string; method: string; reference: string };

const emptyCompanyForm: CompanyForm = { name: '', industry: '', email: '', phone: '', address: '' };
const emptyEmployeeForm: EmployeeForm = { employeeNo: '', firstName: '', lastName: '', email: '', phone: '', jobTitle: '', department: '', status: 'ACTIVE' };
const emptyCustomerForm: CustomerForm = { name: '', email: '', phone: '', companyName: '', status: 'LEAD', notes: '' };
const emptyProductForm: ProductForm = { name: '', description: '', type: 'SERVICE', unitPrice: '' };
const emptyInvoiceForm: InvoiceForm = { customerId: '', dueDate: '', productId: '', description: '', quantity: '1', unitPrice: '', tax: '0', notes: '' };
const emptyPaymentForm: PaymentForm = { invoiceId: '', amount: '', method: 'Bank transfer', reference: '' };

function toCompanyForm(company: Company): CompanyForm {
  return { name: company.name, industry: company.industry ?? '', email: company.email ?? '', phone: company.phone ?? '', address: company.address ?? '' };
}

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

function cleanText(value: string) {
  return value.trim() || undefined;
}

function currency(value?: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value ?? 0);
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
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [employeeForm, setEmployeeForm] = useState<EmployeeForm>(emptyEmployeeForm);
  const [customerForm, setCustomerForm] = useState<CustomerForm>(emptyCustomerForm);
  const [productForm, setProductForm] = useState<ProductForm>(emptyProductForm);
  const [invoiceForm, setInvoiceForm] = useState<InvoiceForm>(emptyInvoiceForm);
  const [paymentForm, setPaymentForm] = useState<PaymentForm>(emptyPaymentForm);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');

  const activeEmployee = useMemo(() => employees.find((employee) => employee.id === editingEmployeeId), [editingEmployeeId, employees]);
  const activeProducts = products.filter((product) => product.active);
  const openInvoices = invoices.filter((invoice) => invoice.status !== 'PAID' && invoice.status !== 'VOID');
  const companyName = company?.name ?? summary?.company.name ?? 'your company';

  async function loadDashboard() {
    setError('');
    const [nextSummary, nextCompany, nextEmployees, nextCustomers, nextProducts, nextInvoices] = await Promise.all([
      api<Summary>('/dashboard/summary'),
      api<Company>('/company'),
      api<Employee[]>('/employees'),
      api<Customer[]>('/customers'),
      api<Product[]>('/products'),
      api<Invoice[]>('/invoices'),
    ]);
    setSummary(nextSummary);
    setCompany(nextCompany);
    setCompanyForm(toCompanyForm(nextCompany));
    setEmployees(nextEmployees);
    setCustomers(nextCustomers);
    setProducts(nextProducts);
    setInvoices(nextInvoices);
    setInvoiceForm((current) => ({
      ...current,
      customerId: current.customerId || nextCustomers[0]?.id || '',
      productId: current.productId || nextProducts.find((product) => product.active)?.id || '',
    }));
    setPaymentForm((current) => ({ ...current, invoiceId: current.invoiceId || nextInvoices.find((invoice) => invoice.balance > 0)?.id || '' }));
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

  function setEmployeeField(field: keyof EmployeeForm, value: string) {
    setEmployeeForm((current) => ({ ...current, [field]: value }));
  }

  function startEditEmployee(employee: Employee) {
    setEditingEmployeeId(employee.id);
    setEmployeeForm(toEmployeeForm(employee));
    setNotice('');
    setError('');
  }

  async function saveCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving('company');
    setError('');
    setNotice('');
    try {
      const updated = await api<Company>('/company', {
        method: 'PATCH',
        body: JSON.stringify({
          name: companyForm.name.trim(),
          industry: cleanText(companyForm.industry),
          email: cleanText(companyForm.email),
          phone: cleanText(companyForm.phone),
          address: cleanText(companyForm.address),
        }),
      });
      setCompany(updated);
      setCompanyForm(toCompanyForm(updated));
      setNotice('Company settings were updated.');
      await loadDashboard();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save company settings');
    } finally {
      setSaving('');
    }
  }

  async function saveEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving('employee');
    setError('');
    setNotice('');
    const payload = {
      employeeNo: employeeForm.employeeNo.trim(),
      firstName: employeeForm.firstName.trim(),
      lastName: employeeForm.lastName.trim(),
      email: cleanText(employeeForm.email),
      phone: cleanText(employeeForm.phone),
      jobTitle: cleanText(employeeForm.jobTitle),
      department: cleanText(employeeForm.department),
      status: employeeForm.status,
    };
    try {
      if (editingEmployeeId) {
        await api<Employee>(`/employees/${editingEmployeeId}`, { method: 'PATCH', body: JSON.stringify(payload) });
        setNotice(`${payload.firstName} ${payload.lastName} was updated.`);
      } else {
        await api<Employee>('/employees', { method: 'POST', body: JSON.stringify(payload) });
        setNotice(`${payload.firstName} ${payload.lastName} was added.`);
      }
      setEditingEmployeeId(null);
      setEmployeeForm(emptyEmployeeForm);
      await loadDashboard();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save employee');
    } finally {
      setSaving('');
    }
  }

  async function saveCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving('customer');
    setError('');
    setNotice('');
    try {
      await api<Customer>('/customers', {
        method: 'POST',
        body: JSON.stringify({
          name: customerForm.name.trim(),
          email: cleanText(customerForm.email),
          phone: cleanText(customerForm.phone),
          companyName: cleanText(customerForm.companyName),
          status: customerForm.status,
          notes: cleanText(customerForm.notes),
        }),
      });
      setNotice(`${customerForm.name.trim()} was added to CRM.`);
      setCustomerForm(emptyCustomerForm);
      await loadDashboard();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save customer');
    } finally {
      setSaving('');
    }
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving('product');
    setError('');
    setNotice('');
    try {
      await api<Product>('/products', {
        method: 'POST',
        body: JSON.stringify({
          name: productForm.name.trim(),
          description: cleanText(productForm.description),
          type: productForm.type,
          unitPrice: Number(productForm.unitPrice),
        }),
      });
      setNotice(`${productForm.name.trim()} was added to products and services.`);
      setProductForm(emptyProductForm);
      await loadDashboard();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save product or service');
    } finally {
      setSaving('');
    }
  }

  function chooseProduct(productId: string) {
    const product = products.find((item) => item.id === productId);
    setInvoiceForm((current) => ({
      ...current,
      productId,
      description: product?.name ?? current.description,
      unitPrice: product ? String(product.unitPrice) : current.unitPrice,
    }));
  }

  async function createInvoice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving('invoice');
    setError('');
    setNotice('');
    try {
      const invoice = await api<Invoice>('/invoices', {
        method: 'POST',
        body: JSON.stringify({
          customerId: invoiceForm.customerId,
          dueDate: cleanText(invoiceForm.dueDate),
          tax: Number(invoiceForm.tax || 0),
          notes: cleanText(invoiceForm.notes),
          items: [{
            productId: cleanText(invoiceForm.productId),
            description: invoiceForm.description.trim(),
            quantity: Number(invoiceForm.quantity),
            unitPrice: Number(invoiceForm.unitPrice),
          }],
        }),
      });
      setNotice(`${invoice.invoiceNo} was created for ${currency(invoice.total)}.`);
      setInvoiceForm({ ...emptyInvoiceForm, customerId: customers[0]?.id ?? '', productId: activeProducts[0]?.id ?? '' });
      await loadDashboard();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to create invoice');
    } finally {
      setSaving('');
    }
  }

  async function updateInvoiceStatus(invoiceId: string, status: InvoiceStatus) {
    setSaving(invoiceId);
    setError('');
    setNotice('');
    try {
      await api<Invoice>(`/invoices/${invoiceId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      setNotice(`Invoice was marked ${status.toLowerCase()}.`);
      await loadDashboard();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update invoice');
    } finally {
      setSaving('');
    }
  }

  async function recordPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving('payment');
    setError('');
    setNotice('');
    try {
      await api<Invoice>(`/invoices/${paymentForm.invoiceId}/payments`, {
        method: 'POST',
        body: JSON.stringify({ amount: Number(paymentForm.amount), method: cleanText(paymentForm.method), reference: cleanText(paymentForm.reference) }),
      });
      setNotice(`Payment of ${currency(Number(paymentForm.amount))} was recorded.`);
      setPaymentForm(emptyPaymentForm);
      await loadDashboard();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to record payment');
    } finally {
      setSaving('');
    }
  }

  return (
    <main className="appShell">
      <aside className="sidebar">
        <div className="brand light"><span>R</span> RBS</div>
        <nav>
          {['Overview', 'Company', 'Employees', 'Customers', 'Products', 'Invoices', 'Payments'].map((item) => <a className="active" key={item}>{item}</a>)}
        </nav>
        <button className="signOut" onClick={signOut}>Sign out</button>
      </aside>

      <section className="dashboard">
        <header>
          <div>
            <p className="eyebrow">Founder dashboard</p>
            <h1>{summary ? `Welcome to ${companyName}` : 'Welcome back'}</h1>
          </div>
          <div className="avatar">RB</div>
        </header>

        {error && <p className="error">{error}</p>}
        {notice && <p className="success">{notice}</p>}

        <div className="stats">
          <article><span>Revenue collected</span><b>{loading ? '-' : currency(summary?.metrics.revenue)}</b><small>Recorded payments</small></article>
          <article><span>Outstanding</span><b>{loading ? '-' : currency(summary?.metrics.outstanding)}</b><small>Invoice balances</small></article>
          <article><span>Customers</span><b>{summary?.metrics.customers ?? (loading ? '-' : 0)}</b><small>{summary?.metrics.activeCustomers ?? 0} active</small></article>
          <article><span>Open invoices</span><b>{summary?.metrics.openInvoices ?? (loading ? '-' : 0)}</b><small>{summary?.metrics.invoices ?? 0} total</small></article>
          <article><span>Total employees</span><b>{summary?.metrics.employees ?? (loading ? '-' : 0)}</b><small>{summary?.metrics.activeEmployees ?? 0} active</small></article>
          <article><span>Departments</span><b>{summary?.metrics.departments ?? (loading ? '-' : 0)}</b><small>Business teams</small></article>
          <article><span>Products/services</span><b>{summary?.metrics.products ?? (loading ? '-' : 0)}</b><small>Active catalog</small></article>
          <article><span>Suite modules</span><b>{summary?.metrics.productsEnabled ?? '-'}</b><small>Core company system</small></article>
        </div>

        <div className="dashboardGrid">
          <article className="panel">
            <div className="panelHeading">
              <div><p className="eyebrow">Today</p><h2>Recommended actions</h2></div>
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

        <section className="operationsGrid">
          <article className="panel companyFormPanel">
            <div className="panelHeading"><div><p className="eyebrow">Company settings</p><h2>Business profile</h2></div><span className="badge">Profile</span></div>
            <form className="companyForm" onSubmit={saveCompany}>
              <label>Company name<input required minLength={2} value={companyForm.name} onChange={(event) => setCompanyForm((current) => ({ ...current, name: event.target.value }))} disabled={saving === 'company'} /></label>
              <label>Industry<input value={companyForm.industry} onChange={(event) => setCompanyForm((current) => ({ ...current, industry: event.target.value }))} disabled={saving === 'company'} /></label>
              <label>Email<input type="email" value={companyForm.email} onChange={(event) => setCompanyForm((current) => ({ ...current, email: event.target.value }))} disabled={saving === 'company'} /></label>
              <label>Phone<input value={companyForm.phone} onChange={(event) => setCompanyForm((current) => ({ ...current, phone: event.target.value }))} disabled={saving === 'company'} /></label>
              <label className="wideField">Address<textarea value={companyForm.address} onChange={(event) => setCompanyForm((current) => ({ ...current, address: event.target.value }))} disabled={saving === 'company'} /></label>
              <button className="button" disabled={saving === 'company'}>{saving === 'company' ? 'Saving...' : 'Save company settings'}</button>
            </form>
          </article>

          <article className="panel">
            <div className="panelHeading"><div><p className="eyebrow">CRM</p><h2>Add customer or lead</h2></div><span className="badge">{customers.length} records</span></div>
            <form className="companyForm" onSubmit={saveCustomer}>
              <label>Name<input required minLength={2} value={customerForm.name} onChange={(event) => setCustomerForm((current) => ({ ...current, name: event.target.value }))} /></label>
              <label>Company<input value={customerForm.companyName} onChange={(event) => setCustomerForm((current) => ({ ...current, companyName: event.target.value }))} /></label>
              <label>Email<input type="email" value={customerForm.email} onChange={(event) => setCustomerForm((current) => ({ ...current, email: event.target.value }))} /></label>
              <label>Phone<input value={customerForm.phone} onChange={(event) => setCustomerForm((current) => ({ ...current, phone: event.target.value }))} /></label>
              <label>Status<select value={customerForm.status} onChange={(event) => setCustomerForm((current) => ({ ...current, status: event.target.value as CustomerStatus }))}><option value="LEAD">Lead</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></label>
              <label className="wideField">Notes<textarea value={customerForm.notes} onChange={(event) => setCustomerForm((current) => ({ ...current, notes: event.target.value }))} /></label>
              <button className="button" disabled={saving === 'customer'}>{saving === 'customer' ? 'Saving...' : 'Add customer'}</button>
            </form>
          </article>

          <article className="panel">
            <div className="panelHeading"><div><p className="eyebrow">Catalog</p><h2>Products and services</h2></div><span className="badge">{activeProducts.length} active</span></div>
            <form className="companyForm" onSubmit={saveProduct}>
              <label>Name<input required minLength={2} value={productForm.name} onChange={(event) => setProductForm((current) => ({ ...current, name: event.target.value }))} /></label>
              <label>Type<select value={productForm.type} onChange={(event) => setProductForm((current) => ({ ...current, type: event.target.value as ProductType }))}><option value="SERVICE">Service</option><option value="PRODUCT">Product</option></select></label>
              <label>Unit price<input required type="number" min="0" step="0.01" value={productForm.unitPrice} onChange={(event) => setProductForm((current) => ({ ...current, unitPrice: event.target.value }))} /></label>
              <label className="wideField">Description<textarea value={productForm.description} onChange={(event) => setProductForm((current) => ({ ...current, description: event.target.value }))} /></label>
              <button className="button" disabled={saving === 'product'}>{saving === 'product' ? 'Saving...' : 'Add product/service'}</button>
            </form>
          </article>

          <article className="panel">
            <div className="panelHeading"><div><p className="eyebrow">Billing</p><h2>Create invoice</h2></div><span className="badge">{invoices.length} invoices</span></div>
            <form className="companyForm" onSubmit={createInvoice}>
              <label>Customer<select required value={invoiceForm.customerId} onChange={(event) => setInvoiceForm((current) => ({ ...current, customerId: event.target.value }))}><option value="">Choose customer</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
              <label>Due date<input type="date" value={invoiceForm.dueDate} onChange={(event) => setInvoiceForm((current) => ({ ...current, dueDate: event.target.value }))} /></label>
              <label>Product/service<select value={invoiceForm.productId} onChange={(event) => chooseProduct(event.target.value)}><option value="">Custom line item</option>{activeProducts.map((product) => <option key={product.id} value={product.id}>{product.name} - {currency(product.unitPrice)}</option>)}</select></label>
              <label>Description<input required minLength={2} value={invoiceForm.description} onChange={(event) => setInvoiceForm((current) => ({ ...current, description: event.target.value }))} /></label>
              <label>Quantity<input required type="number" min="0.01" step="0.01" value={invoiceForm.quantity} onChange={(event) => setInvoiceForm((current) => ({ ...current, quantity: event.target.value }))} /></label>
              <label>Unit price<input required type="number" min="0" step="0.01" value={invoiceForm.unitPrice} onChange={(event) => setInvoiceForm((current) => ({ ...current, unitPrice: event.target.value }))} /></label>
              <label>Tax<input type="number" min="0" step="0.01" value={invoiceForm.tax} onChange={(event) => setInvoiceForm((current) => ({ ...current, tax: event.target.value }))} /></label>
              <label className="wideField">Notes<textarea value={invoiceForm.notes} onChange={(event) => setInvoiceForm((current) => ({ ...current, notes: event.target.value }))} /></label>
              <button className="button" disabled={saving === 'invoice' || customers.length === 0}>{saving === 'invoice' ? 'Creating...' : 'Create invoice'}</button>
            </form>
          </article>
        </section>

        <section className="employeeSection">
          <article className="panel employeeFormPanel">
            <div className="panelHeading">
              <div><p className="eyebrow">Employee management</p><h2>{editingEmployeeId ? `Edit ${activeEmployee?.firstName ?? 'employee'}` : 'Add an employee'}</h2></div>
              {editingEmployeeId && <button className="ghostButton" onClick={() => { setEditingEmployeeId(null); setEmployeeForm(emptyEmployeeForm); }}>Cancel edit</button>}
            </div>
            <form className="employeeForm" onSubmit={saveEmployee}>
              <label>Employee number<input required value={employeeForm.employeeNo} onChange={(event) => setEmployeeField('employeeNo', event.target.value)} disabled={saving === 'employee' || Boolean(editingEmployeeId)} /></label>
              <label>First name<input required minLength={2} value={employeeForm.firstName} onChange={(event) => setEmployeeField('firstName', event.target.value)} /></label>
              <label>Last name<input required minLength={2} value={employeeForm.lastName} onChange={(event) => setEmployeeField('lastName', event.target.value)} /></label>
              <label>Email<input type="email" value={employeeForm.email} onChange={(event) => setEmployeeField('email', event.target.value)} /></label>
              <label>Phone<input value={employeeForm.phone} onChange={(event) => setEmployeeField('phone', event.target.value)} /></label>
              <label>Job title<input value={employeeForm.jobTitle} onChange={(event) => setEmployeeField('jobTitle', event.target.value)} /></label>
              <label>Department<input value={employeeForm.department} onChange={(event) => setEmployeeField('department', event.target.value)} /></label>
              <label>Status<select value={employeeForm.status} onChange={(event) => setEmployeeField('status', event.target.value as EmployeeStatus)}><option value="ACTIVE">Active</option><option value="ON_LEAVE">On leave</option><option value="INACTIVE">Inactive</option></select></label>
              <button className="button" disabled={saving === 'employee'}>{saving === 'employee' ? 'Saving...' : editingEmployeeId ? 'Update employee' : 'Add employee'}</button>
            </form>
          </article>

          <article className="panel employeeListPanel">
            <div className="panelHeading"><div><p className="eyebrow">People records</p><h2>Employees</h2></div><span className="badge">{employees.length} total</span></div>
            <div className="tableWrap">
              <table className="dataTable">
                <thead><tr><th>Name</th><th>Role</th><th>Department</th><th>Status</th><th /></tr></thead>
                <tbody>
                  {employees.map((employee) => (
                    <tr key={employee.id}>
                      <td><div className="employeeIdentity"><span>{initials(employee.firstName, employee.lastName)}</span><div><b>{employee.firstName} {employee.lastName}</b><small>{employee.employeeNo}{employee.email ? ` · ${employee.email}` : ''}</small></div></div></td>
                      <td>{employee.jobTitle || '-'}</td><td>{employee.department || '-'}</td>
                      <td><span className={`statusPill ${employee.status.toLowerCase()}`}>{employee.status.replace('_', ' ')}</span></td>
                      <td><button className="ghostButton" onClick={() => startEditEmployee(employee)}>Edit</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {employees.length === 0 && <div className="emptyState"><h3>No employees yet</h3><p className="muted">Add your first employee to unlock HR metrics.</p></div>}
            </div>
          </article>
        </section>

        <section className="recordsGrid">
          <article className="panel"><div className="panelHeading"><div><p className="eyebrow">CRM records</p><h2>Customers</h2></div><span className="badge">{customers.length} total</span></div><div className="tableWrap"><table className="dataTable"><thead><tr><th>Name</th><th>Company</th><th>Contact</th><th>Status</th></tr></thead><tbody>{customers.map((customer) => <tr key={customer.id}><td><b>{customer.name}</b></td><td>{customer.companyName || '-'}</td><td>{customer.email || customer.phone || '-'}</td><td><span className={`statusPill ${customer.status.toLowerCase()}`}>{customer.status.toLowerCase()}</span></td></tr>)}</tbody></table></div></article>
          <article className="panel"><div className="panelHeading"><div><p className="eyebrow">Catalog records</p><h2>Products/services</h2></div><span className="badge">{products.length} total</span></div><div className="tableWrap"><table className="dataTable"><thead><tr><th>Name</th><th>Type</th><th>Price</th><th>Status</th></tr></thead><tbody>{products.map((product) => <tr key={product.id}><td><b>{product.name}</b><small>{product.description || ''}</small></td><td>{product.type.toLowerCase()}</td><td>{currency(product.unitPrice)}</td><td><span className={`statusPill ${product.active ? 'active' : 'inactive'}`}>{product.active ? 'active' : 'inactive'}</span></td></tr>)}</tbody></table></div></article>
        </section>

        <section className="recordsGrid">
          <article className="panel widePanel">
            <div className="panelHeading"><div><p className="eyebrow">Invoices</p><h2>Billing pipeline</h2></div><span className="badge">{currency(summary?.metrics.outstanding)} open</span></div>
            <div className="tableWrap"><table className="dataTable"><thead><tr><th>Invoice</th><th>Customer</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th><th>Actions</th></tr></thead><tbody>{invoices.map((invoice) => <tr key={invoice.id}><td><b>{invoice.invoiceNo}</b><small>{invoice.dueDate ? `Due ${new Date(invoice.dueDate).toLocaleDateString()}` : 'No due date'}</small></td><td>{invoice.customer.name}</td><td>{currency(invoice.total)}</td><td>{currency(invoice.paid)}</td><td>{currency(invoice.balance)}</td><td><span className={`statusPill ${invoice.status.toLowerCase()}`}>{invoice.status.toLowerCase()}</span></td><td className="rowActions">{invoice.status === 'DRAFT' && <button className="ghostButton" onClick={() => updateInvoiceStatus(invoice.id, 'SENT')}>Send</button>}{invoice.status !== 'VOID' && invoice.status !== 'PAID' && <button className="ghostButton" onClick={() => updateInvoiceStatus(invoice.id, 'VOID')}>Void</button>}</td></tr>)}</tbody></table></div>
          </article>
          <article className="panel">
            <div className="panelHeading"><div><p className="eyebrow">Payments</p><h2>Record payment</h2></div><span className="badge">{openInvoices.length} open</span></div>
            <form className="companyForm" onSubmit={recordPayment}>
              <label>Invoice<select required value={paymentForm.invoiceId} onChange={(event) => setPaymentForm((current) => ({ ...current, invoiceId: event.target.value }))}><option value="">Choose invoice</option>{openInvoices.map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.invoiceNo} - {currency(invoice.balance)}</option>)}</select></label>
              <label>Amount<input required type="number" min="0.01" step="0.01" value={paymentForm.amount} onChange={(event) => setPaymentForm((current) => ({ ...current, amount: event.target.value }))} /></label>
              <label>Method<input value={paymentForm.method} onChange={(event) => setPaymentForm((current) => ({ ...current, method: event.target.value }))} /></label>
              <label>Reference<input value={paymentForm.reference} onChange={(event) => setPaymentForm((current) => ({ ...current, reference: event.target.value }))} /></label>
              <button className="button" disabled={saving === 'payment' || openInvoices.length === 0}>{saving === 'payment' ? 'Recording...' : 'Record payment'}</button>
            </form>
          </article>
        </section>
      </section>
    </main>
  );
}
