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
    deals: number;
    openDeals: number;
    wonDeals: number;
    pipelineValue: number;
    wonDealValue: number;
    conversionRate: number;
    products: number;
    invoices: number;
    openInvoices: number;
    revenue: number;
    expenses: number;
    monthlyExpenses: number;
    netProfit: number;
    expenseCount: number;
    projects: number;
    activeProjects: number;
    tasks: number;
    openTasks: number;
    overdueTasks: number;
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

type DealStage = 'NEW_LEAD' | 'CONTACTED' | 'PROPOSAL_SENT' | 'WON' | 'LOST';
type Deal = { id: string; title: string; stage: DealStage; value: number; expectedCloseDate?: string | null; notes?: string | null; customer: Customer };
type DealForm = { title: string; customerId: string; stage: DealStage; value: string; expectedCloseDate: string; notes: string };

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

type ExpenseCategory = 'OPERATIONS' | 'MARKETING' | 'PAYROLL' | 'SOFTWARE' | 'RENT' | 'TRAVEL' | 'TAX' | 'OTHER';
type Expense = { id: string; vendor: string; category: ExpenseCategory; amount: number; spentAt: string; description?: string | null; receiptUrl?: string | null };
type ExpenseForm = { vendor: string; category: ExpenseCategory; amount: string; spentAt: string; description: string; receiptUrl: string };

type ReportSummary = {
  profitLoss: { revenue: number; expenses: number; netProfit: number };
  invoices: { status: string; count: number; total: number }[];
  customers: { status: string; count: number }[];
  deals: { stage: string; count: number; value: number }[];
  exports: string[];
};

type ProjectStatus = 'PLANNED' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED';
type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED';
type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
type Task = { id: string; title: string; status: TaskStatus; priority: TaskPriority; dueDate?: string | null; assignee?: string | null; description?: string | null };
type Project = { id: string; name: string; status: ProjectStatus; budget?: number | null; startDate?: string | null; dueDate?: string | null; description?: string | null; customer?: Customer | null; tasks: Task[] };
type ProjectForm = { name: string; customerId: string; status: ProjectStatus; budget: string; startDate: string; dueDate: string; description: string };
type TaskForm = { projectId: string; title: string; status: TaskStatus; priority: TaskPriority; dueDate: string; assignee: string; description: string };

const emptyCompanyForm: CompanyForm = { name: '', industry: '', email: '', phone: '', address: '' };
const emptyEmployeeForm: EmployeeForm = { employeeNo: '', firstName: '', lastName: '', email: '', phone: '', jobTitle: '', department: '', status: 'ACTIVE' };
const emptyCustomerForm: CustomerForm = { name: '', email: '', phone: '', companyName: '', status: 'LEAD', notes: '' };
const emptyDealForm: DealForm = { title: '', customerId: '', stage: 'NEW_LEAD', value: '', expectedCloseDate: '', notes: '' };
const emptyProductForm: ProductForm = { name: '', description: '', type: 'SERVICE', unitPrice: '' };
const emptyInvoiceForm: InvoiceForm = { customerId: '', dueDate: '', productId: '', description: '', quantity: '1', unitPrice: '', tax: '0', notes: '' };
const emptyPaymentForm: PaymentForm = { invoiceId: '', amount: '', method: 'Bank transfer', reference: '' };
const emptyExpenseForm: ExpenseForm = { vendor: '', category: 'OPERATIONS', amount: '', spentAt: '', description: '', receiptUrl: '' };
const emptyProjectForm: ProjectForm = { name: '', customerId: '', status: 'PLANNED', budget: '', startDate: '', dueDate: '', description: '' };
const emptyTaskForm: TaskForm = { projectId: '', title: '', status: 'TODO', priority: 'MEDIUM', dueDate: '', assignee: '', description: '' };

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

function dealStageLabel(stage: DealStage) {
  return stage.replace('_', ' ').replace('_', ' ').toLowerCase();
}

function categoryLabel(category: ExpenseCategory) {
  return category.toLowerCase().replace('_', ' ');
}

function labelFromEnum(value: string) {
  return value.toLowerCase().replace('_', ' ').replace('_', ' ');
}

export default function DashboardPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [companyForm, setCompanyForm] = useState<CompanyForm>(emptyCompanyForm);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [reports, setReports] = useState<ReportSummary | null>(null);
  const [employeeForm, setEmployeeForm] = useState<EmployeeForm>(emptyEmployeeForm);
  const [customerForm, setCustomerForm] = useState<CustomerForm>(emptyCustomerForm);
  const [dealForm, setDealForm] = useState<DealForm>(emptyDealForm);
  const [productForm, setProductForm] = useState<ProductForm>(emptyProductForm);
  const [invoiceForm, setInvoiceForm] = useState<InvoiceForm>(emptyInvoiceForm);
  const [paymentForm, setPaymentForm] = useState<PaymentForm>(emptyPaymentForm);
  const [expenseForm, setExpenseForm] = useState<ExpenseForm>(emptyExpenseForm);
  const [projectForm, setProjectForm] = useState<ProjectForm>(emptyProjectForm);
  const [taskForm, setTaskForm] = useState<TaskForm>(emptyTaskForm);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');

  const activeEmployee = useMemo(() => employees.find((employee) => employee.id === editingEmployeeId), [editingEmployeeId, employees]);
  const activeProducts = products.filter((product) => product.active);
  const openInvoices = invoices.filter((invoice) => invoice.status !== 'PAID' && invoice.status !== 'VOID');
  const pipelineStages: DealStage[] = ['NEW_LEAD', 'CONTACTED', 'PROPOSAL_SENT', 'WON', 'LOST'];
  const expenseCategories: ExpenseCategory[] = ['OPERATIONS', 'MARKETING', 'PAYROLL', 'SOFTWARE', 'RENT', 'TRAVEL', 'TAX', 'OTHER'];
  const projectStatuses: ProjectStatus[] = ['PLANNED', 'ACTIVE', 'ON_HOLD', 'COMPLETED'];
  const taskStatuses: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE', 'BLOCKED'];
  const taskPriorities: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
  const companyName = company?.name ?? summary?.company.name ?? 'your company';

  async function loadDashboard() {
    setError('');
    const [nextSummary, nextCompany, nextEmployees, nextCustomers, nextDeals, nextProducts, nextInvoices, nextExpenses, nextProjects, nextReports] = await Promise.all([
      api<Summary>('/dashboard/summary'),
      api<Company>('/company'),
      api<Employee[]>('/employees'),
      api<Customer[]>('/customers'),
      api<Deal[]>('/deals'),
      api<Product[]>('/products'),
      api<Invoice[]>('/invoices'),
      api<Expense[]>('/expenses'),
      api<Project[]>('/projects'),
      api<ReportSummary>('/reports/summary'),
    ]);
    setSummary(nextSummary);
    setCompany(nextCompany);
    setCompanyForm(toCompanyForm(nextCompany));
    setEmployees(nextEmployees);
    setCustomers(nextCustomers);
    setDeals(nextDeals);
    setProducts(nextProducts);
    setInvoices(nextInvoices);
    setExpenses(nextExpenses);
    setProjects(nextProjects);
    setReports(nextReports);
    setInvoiceForm((current) => ({
      ...current,
      customerId: current.customerId || nextCustomers[0]?.id || '',
      productId: current.productId || nextProducts.find((product) => product.active)?.id || '',
    }));
    setDealForm((current) => ({ ...current, customerId: current.customerId || nextCustomers[0]?.id || '' }));
    setPaymentForm((current) => ({ ...current, invoiceId: current.invoiceId || nextInvoices.find((invoice) => invoice.balance > 0)?.id || '' }));
    setProjectForm((current) => ({ ...current, customerId: current.customerId || nextCustomers[0]?.id || '' }));
    setTaskForm((current) => ({ ...current, projectId: current.projectId || nextProjects[0]?.id || '' }));
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

  async function saveDeal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving('deal');
    setError('');
    setNotice('');
    try {
      await api<Deal>('/deals', {
        method: 'POST',
        body: JSON.stringify({
          title: dealForm.title.trim(),
          customerId: dealForm.customerId,
          stage: dealForm.stage,
          value: Number(dealForm.value),
          expectedCloseDate: cleanText(dealForm.expectedCloseDate),
          notes: cleanText(dealForm.notes),
        }),
      });
      setNotice(`${dealForm.title.trim()} was added to the sales pipeline.`);
      setDealForm({ ...emptyDealForm, customerId: customers[0]?.id ?? '' });
      await loadDashboard();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save deal');
    } finally {
      setSaving('');
    }
  }

  async function updateDealStage(dealId: string, stage: DealStage) {
    setSaving(dealId);
    setError('');
    setNotice('');
    try {
      await api<Deal>(`/deals/${dealId}`, { method: 'PATCH', body: JSON.stringify({ stage }) });
      setNotice(`Deal moved to ${dealStageLabel(stage)}.`);
      await loadDashboard();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update deal');
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

  async function saveExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving('expense');
    setError('');
    setNotice('');
    try {
      await api<Expense>('/expenses', {
        method: 'POST',
        body: JSON.stringify({
          vendor: expenseForm.vendor.trim(),
          category: expenseForm.category,
          amount: Number(expenseForm.amount),
          spentAt: cleanText(expenseForm.spentAt),
          description: cleanText(expenseForm.description),
          receiptUrl: cleanText(expenseForm.receiptUrl),
        }),
      });
      setNotice(`${expenseForm.vendor.trim()} expense was recorded.`);
      setExpenseForm(emptyExpenseForm);
      await loadDashboard();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save expense');
    } finally {
      setSaving('');
    }
  }

  async function saveProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving('project');
    setError('');
    setNotice('');
    try {
      await api<Project>('/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: projectForm.name.trim(),
          customerId: cleanText(projectForm.customerId),
          status: projectForm.status,
          budget: projectForm.budget ? Number(projectForm.budget) : undefined,
          startDate: cleanText(projectForm.startDate),
          dueDate: cleanText(projectForm.dueDate),
          description: cleanText(projectForm.description),
        }),
      });
      setNotice(`${projectForm.name.trim()} project was created.`);
      setProjectForm({ ...emptyProjectForm, customerId: customers[0]?.id ?? '' });
      await loadDashboard();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save project');
    } finally {
      setSaving('');
    }
  }

  async function saveTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving('task');
    setError('');
    setNotice('');
    try {
      await api<Task>(`/projects/${taskForm.projectId}/tasks`, {
        method: 'POST',
        body: JSON.stringify({
          title: taskForm.title.trim(),
          status: taskForm.status,
          priority: taskForm.priority,
          dueDate: cleanText(taskForm.dueDate),
          assignee: cleanText(taskForm.assignee),
          description: cleanText(taskForm.description),
        }),
      });
      setNotice(`${taskForm.title.trim()} task was added.`);
      setTaskForm({ ...emptyTaskForm, projectId: projects[0]?.id ?? '' });
      await loadDashboard();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save task');
    } finally {
      setSaving('');
    }
  }

  async function updateTaskStatus(taskId: string, status: TaskStatus) {
    setSaving(taskId);
    setError('');
    setNotice('');
    try {
      await api<Task>(`/projects/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      setNotice(`Task moved to ${labelFromEnum(status)}.`);
      await loadDashboard();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update task');
    } finally {
      setSaving('');
    }
  }

  async function downloadReport(type: string) {
    setSaving(`report-${type}`);
    setError('');
    setNotice('');
    try {
      const token = window.localStorage.getItem('rbs_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api'}/reports/export/${type}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error('Unable to export report');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${type}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      setNotice(`${type.replace('-', ' ')} report downloaded.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to download report');
    } finally {
      setSaving('');
    }
  }

  return (
    <main className="appShell">
      <aside className="sidebar">
        <div className="brand light"><span>R</span> RBS</div>
        <nav>
          {['Overview', 'Company', 'Employees', 'Customers', 'Sales', 'Projects', 'Products', 'Invoices', 'Payments', 'Expenses', 'Reports'].map((item) => <a className="active" key={item}>{item}</a>)}
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
          <article><span>Net profit</span><b>{loading ? '-' : currency(summary?.metrics.netProfit)}</b><small>Revenue minus expenses</small></article>
          <article><span>Total expenses</span><b>{loading ? '-' : currency(summary?.metrics.expenses)}</b><small>{summary?.metrics.expenseCount ?? 0} records</small></article>
          <article><span>Monthly spend</span><b>{loading ? '-' : currency(summary?.metrics.monthlyExpenses)}</b><small>This month</small></article>
          <article><span>Outstanding</span><b>{loading ? '-' : currency(summary?.metrics.outstanding)}</b><small>Invoice balances</small></article>
          <article><span>Active projects</span><b>{summary?.metrics.activeProjects ?? (loading ? '-' : 0)}</b><small>{summary?.metrics.projects ?? 0} total</small></article>
          <article><span>Open tasks</span><b>{summary?.metrics.openTasks ?? (loading ? '-' : 0)}</b><small>{summary?.metrics.overdueTasks ?? 0} overdue</small></article>
          <article><span>Open pipeline</span><b>{loading ? '-' : currency(summary?.metrics.pipelineValue)}</b><small>{summary?.metrics.openDeals ?? 0} open deals</small></article>
          <article><span>Won deals</span><b>{loading ? '-' : currency(summary?.metrics.wonDealValue)}</b><small>{summary?.metrics.conversionRate ?? 0}% conversion</small></article>
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
            <div className="panelHeading"><div><p className="eyebrow">Sales pipeline</p><h2>Add deal</h2></div><span className="badge">{deals.length} deals</span></div>
            <form className="companyForm" onSubmit={saveDeal}>
              <label>Deal title<input required minLength={2} value={dealForm.title} onChange={(event) => setDealForm((current) => ({ ...current, title: event.target.value }))} /></label>
              <label>Customer<select required value={dealForm.customerId} onChange={(event) => setDealForm((current) => ({ ...current, customerId: event.target.value }))}><option value="">Choose customer</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
              <label>Stage<select value={dealForm.stage} onChange={(event) => setDealForm((current) => ({ ...current, stage: event.target.value as DealStage }))}>{pipelineStages.map((stage) => <option key={stage} value={stage}>{dealStageLabel(stage)}</option>)}</select></label>
              <label>Value<input required type="number" min="0" step="0.01" value={dealForm.value} onChange={(event) => setDealForm((current) => ({ ...current, value: event.target.value }))} /></label>
              <label>Expected close<input type="date" value={dealForm.expectedCloseDate} onChange={(event) => setDealForm((current) => ({ ...current, expectedCloseDate: event.target.value }))} /></label>
              <label className="wideField">Notes<textarea value={dealForm.notes} onChange={(event) => setDealForm((current) => ({ ...current, notes: event.target.value }))} /></label>
              <button className="button" disabled={saving === 'deal' || customers.length === 0}>{saving === 'deal' ? 'Saving...' : 'Add deal'}</button>
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

        <section className="panel">
          <div className="panelHeading">
            <div><p className="eyebrow">Sales board</p><h2>Deal pipeline</h2></div>
            <span className="badge">{currency(summary?.metrics.pipelineValue)} open pipeline</span>
          </div>
          <div className="pipelineBoard">
            {pipelineStages.map((stage) => {
              const stageDeals = deals.filter((deal) => deal.stage === stage);
              return (
                <div className="pipelineColumn" key={stage}>
                  <div className="pipelineColumnHeader">
                    <b>{dealStageLabel(stage)}</b>
                    <span>{stageDeals.length}</span>
                  </div>
                  {stageDeals.length === 0 ? (
                    <p className="muted">No deals</p>
                  ) : stageDeals.map((deal) => (
                    <article className="dealCard" key={deal.id}>
                      <div>
                        <b>{deal.title}</b>
                        <small>{deal.customer.name}{deal.expectedCloseDate ? ` · closes ${new Date(deal.expectedCloseDate).toLocaleDateString()}` : ''}</small>
                      </div>
                      <strong>{currency(deal.value)}</strong>
                      <select value={deal.stage} onChange={(event) => updateDealStage(deal.id, event.target.value as DealStage)} disabled={saving === deal.id}>
                        {pipelineStages.map((nextStage) => <option key={nextStage} value={nextStage}>{dealStageLabel(nextStage)}</option>)}
                      </select>
                    </article>
                  ))}
                </div>
              );
            })}
          </div>
        </section>

        <section className="recordsGrid">
          <article className="panel">
            <div className="panelHeading"><div><p className="eyebrow">Projects</p><h2>Create project</h2></div><span className="badge">{projects.length} projects</span></div>
            <form className="companyForm" onSubmit={saveProject}>
              <label>Project name<input required minLength={2} value={projectForm.name} onChange={(event) => setProjectForm((current) => ({ ...current, name: event.target.value }))} /></label>
              <label>Customer<select value={projectForm.customerId} onChange={(event) => setProjectForm((current) => ({ ...current, customerId: event.target.value }))}><option value="">Internal project</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
              <label>Status<select value={projectForm.status} onChange={(event) => setProjectForm((current) => ({ ...current, status: event.target.value as ProjectStatus }))}>{projectStatuses.map((status) => <option key={status} value={status}>{labelFromEnum(status)}</option>)}</select></label>
              <label>Budget<input type="number" min="0" step="0.01" value={projectForm.budget} onChange={(event) => setProjectForm((current) => ({ ...current, budget: event.target.value }))} /></label>
              <label>Start date<input type="date" value={projectForm.startDate} onChange={(event) => setProjectForm((current) => ({ ...current, startDate: event.target.value }))} /></label>
              <label>Due date<input type="date" value={projectForm.dueDate} onChange={(event) => setProjectForm((current) => ({ ...current, dueDate: event.target.value }))} /></label>
              <label className="wideField">Description<textarea value={projectForm.description} onChange={(event) => setProjectForm((current) => ({ ...current, description: event.target.value }))} /></label>
              <button className="button" disabled={saving === 'project'}>{saving === 'project' ? 'Creating...' : 'Create project'}</button>
            </form>
          </article>

          <article className="panel">
            <div className="panelHeading"><div><p className="eyebrow">Tasks</p><h2>Add task</h2></div><span className="badge">{summary?.metrics.openTasks ?? 0} open</span></div>
            <form className="companyForm" onSubmit={saveTask}>
              <label>Project<select required value={taskForm.projectId} onChange={(event) => setTaskForm((current) => ({ ...current, projectId: event.target.value }))}><option value="">Choose project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
              <label>Task title<input required minLength={2} value={taskForm.title} onChange={(event) => setTaskForm((current) => ({ ...current, title: event.target.value }))} /></label>
              <label>Status<select value={taskForm.status} onChange={(event) => setTaskForm((current) => ({ ...current, status: event.target.value as TaskStatus }))}>{taskStatuses.map((status) => <option key={status} value={status}>{labelFromEnum(status)}</option>)}</select></label>
              <label>Priority<select value={taskForm.priority} onChange={(event) => setTaskForm((current) => ({ ...current, priority: event.target.value as TaskPriority }))}>{taskPriorities.map((priority) => <option key={priority} value={priority}>{labelFromEnum(priority)}</option>)}</select></label>
              <label>Due date<input type="date" value={taskForm.dueDate} onChange={(event) => setTaskForm((current) => ({ ...current, dueDate: event.target.value }))} /></label>
              <label>Assignee<input value={taskForm.assignee} onChange={(event) => setTaskForm((current) => ({ ...current, assignee: event.target.value }))} placeholder="Team member or owner" /></label>
              <label className="wideField">Description<textarea value={taskForm.description} onChange={(event) => setTaskForm((current) => ({ ...current, description: event.target.value }))} /></label>
              <button className="button" disabled={saving === 'task' || projects.length === 0}>{saving === 'task' ? 'Adding...' : 'Add task'}</button>
            </form>
          </article>
        </section>

        <section className="panel">
          <div className="panelHeading">
            <div><p className="eyebrow">Work board</p><h2>Projects and tasks</h2></div>
            <span className="badge">{summary?.metrics.overdueTasks ?? 0} overdue</span>
          </div>
          <div className="projectBoard">
            {projects.length === 0 ? (
              <div className="emptyState"><h3>No projects yet</h3><p className="muted">Create a project to track client work, internal jobs, and delivery tasks.</p></div>
            ) : projects.map((project) => (
              <article className="projectCard" key={project.id}>
                <div className="projectCardHeader">
                  <div>
                    <b>{project.name}</b>
                    <small>{project.customer?.name || 'Internal'}{project.dueDate ? ` · due ${new Date(project.dueDate).toLocaleDateString()}` : ''}</small>
                  </div>
                  <span className={`statusPill ${project.status.toLowerCase()}`}>{labelFromEnum(project.status)}</span>
                </div>
                <div className="taskList">
                  {project.tasks.length === 0 ? <p className="muted">No tasks yet</p> : project.tasks.map((task) => (
                    <div className="taskItem" key={task.id}>
                      <div>
                        <b>{task.title}</b>
                        <small>{labelFromEnum(task.priority)} priority{task.assignee ? ` · ${task.assignee}` : ''}{task.dueDate ? ` · ${new Date(task.dueDate).toLocaleDateString()}` : ''}</small>
                      </div>
                      <select value={task.status} onChange={(event) => updateTaskStatus(task.id, event.target.value as TaskStatus)} disabled={saving === task.id}>
                        {taskStatuses.map((status) => <option key={status} value={status}>{labelFromEnum(status)}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
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

        <section className="recordsGrid">
          <article className="panel">
            <div className="panelHeading"><div><p className="eyebrow">Expenses</p><h2>Record expense</h2></div><span className="badge">{currency(summary?.metrics.expenses)} spent</span></div>
            <form className="companyForm" onSubmit={saveExpense}>
              <label>Vendor<input required minLength={2} value={expenseForm.vendor} onChange={(event) => setExpenseForm((current) => ({ ...current, vendor: event.target.value }))} placeholder="Adobe, rent, contractor..." /></label>
              <label>Category<select value={expenseForm.category} onChange={(event) => setExpenseForm((current) => ({ ...current, category: event.target.value as ExpenseCategory }))}>{expenseCategories.map((category) => <option key={category} value={category}>{categoryLabel(category)}</option>)}</select></label>
              <label>Amount<input required type="number" min="0.01" step="0.01" value={expenseForm.amount} onChange={(event) => setExpenseForm((current) => ({ ...current, amount: event.target.value }))} /></label>
              <label>Spent date<input type="date" value={expenseForm.spentAt} onChange={(event) => setExpenseForm((current) => ({ ...current, spentAt: event.target.value }))} /></label>
              <label className="wideField">Description<textarea value={expenseForm.description} onChange={(event) => setExpenseForm((current) => ({ ...current, description: event.target.value }))} /></label>
              <label className="wideField">Receipt link<input value={expenseForm.receiptUrl} onChange={(event) => setExpenseForm((current) => ({ ...current, receiptUrl: event.target.value }))} placeholder="Optional URL" /></label>
              <button className="button" disabled={saving === 'expense'}>{saving === 'expense' ? 'Recording...' : 'Record expense'}</button>
            </form>
          </article>

          <article className="panel">
            <div className="panelHeading"><div><p className="eyebrow">Expense records</p><h2>Spending log</h2></div><span className="badge">{expenses.length} records</span></div>
            <div className="tableWrap"><table className="dataTable"><thead><tr><th>Vendor</th><th>Category</th><th>Amount</th><th>Date</th></tr></thead><tbody>{expenses.map((expense) => <tr key={expense.id}><td><b>{expense.vendor}</b><small>{expense.description || expense.receiptUrl || ''}</small></td><td><span className={`statusPill ${expense.category.toLowerCase()}`}>{categoryLabel(expense.category)}</span></td><td>{currency(expense.amount)}</td><td>{new Date(expense.spentAt).toLocaleDateString()}</td></tr>)}</tbody></table></div>
            {expenses.length === 0 && <div className="emptyState"><h3>No expenses yet</h3><p className="muted">Record expenses to unlock your net profit view.</p></div>}
          </article>
        </section>

        <section className="panel">
          <div className="panelHeading">
            <div><p className="eyebrow">Reports</p><h2>Business reports and exports</h2></div>
            <span className="badge">Alpha 0.7</span>
          </div>
          <div className="reportGrid">
            <article className="reportCard">
              <span>Profit / loss</span>
              <b>{currency(reports?.profitLoss.netProfit)}</b>
              <small>Revenue {currency(reports?.profitLoss.revenue)} · Expenses {currency(reports?.profitLoss.expenses)}</small>
            </article>
            <article className="reportCard">
              <span>Invoice report</span>
              <b>{reports?.invoices.reduce((sum, item) => sum + item.count, 0) ?? 0}</b>
              <small>{reports?.invoices.map((item) => `${item.status.toLowerCase()}: ${item.count}`).join(' · ') || 'No invoices yet'}</small>
            </article>
            <article className="reportCard">
              <span>Customer report</span>
              <b>{reports?.customers.reduce((sum, item) => sum + item.count, 0) ?? 0}</b>
              <small>{reports?.customers.map((item) => `${item.status.toLowerCase()}: ${item.count}`).join(' · ') || 'No customers yet'}</small>
            </article>
            <article className="reportCard">
              <span>Sales report</span>
              <b>{currency(reports?.deals.reduce((sum, item) => sum + item.value, 0))}</b>
              <small>{reports?.deals.map((item) => `${item.stage.toLowerCase().replace('_', ' ')}: ${item.count}`).join(' · ') || 'No deals yet'}</small>
            </article>
          </div>
          <div className="exportActions">
            {['profit-loss', 'customers', 'invoices', 'expenses'].map((type) => (
              <button className="ghostButton" key={type} onClick={() => downloadReport(type)} disabled={saving === `report-${type}`}>
                {saving === `report-${type}` ? 'Downloading...' : `Download ${type.replace('-', ' ')} CSV`}
              </button>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
