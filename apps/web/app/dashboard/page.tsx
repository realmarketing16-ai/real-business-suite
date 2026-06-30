'use client';

import { API_URL, ApiError, api, authHeaders, clearSession, getStoredUser } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { BrandMark } from '../brand-mark';

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
    teamMembers: number;
    admins: number;
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

type Supplier = { id: string; name: string; email?: string | null; phone?: string | null; contactName?: string | null; address?: string | null; notes?: string | null };
type InventoryItem = { id: string; sku: string; name: string; description?: string | null; quantity: number; reorderLevel: number; unitCost: number; supplier?: Supplier | null };
type PurchaseOrderStatus = 'DRAFT' | 'ORDERED' | 'RECEIVED' | 'CANCELLED';
type PurchaseOrder = { id: string; orderNo: string; status: PurchaseOrderStatus; expectedAt?: string | null; total: number; supplier: Supplier };
type PurchasingOverview = { suppliers: Supplier[]; inventoryItems: InventoryItem[]; purchaseOrders: PurchaseOrder[] };
type SupplierForm = { name: string; email: string; phone: string; contactName: string; address: string; notes: string };
type InventoryForm = { sku: string; name: string; description: string; quantity: string; reorderLevel: string; unitCost: string; supplierId: string };
type PurchaseOrderForm = { supplierId: string; inventoryItemId: string; description: string; quantity: string; unitCost: string; tax: string; expectedAt: string; notes: string };

type QuoteStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
type Quote = {
  id: string;
  quoteNo: string;
  status: QuoteStatus;
  validUntil?: string | null;
  total: number;
  customer: Customer;
};
type QuoteForm = { customerId: string; validUntil: string; productId: string; description: string; quantity: string; unitPrice: string; tax: string; notes: string };

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

type Role = 'OWNER' | 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
type CurrentUser = { email: string; firstName?: string; lastName?: string; role: Role };
type TeamMember = { id: string; email: string; firstName: string; lastName: string; role: Role; createdAt: string };
type TeamMemberForm = { firstName: string; lastName: string; email: string; password: string; role: Role };
type AuditLog = { id: string; action: string; entityType: string; entityId?: string | null; description: string; actorName: string; createdAt: string };
type EmailStatus = 'QUEUED' | 'SENT' | 'FAILED';
type EmailMessage = { id: string; to: string; subject: string; bodyPreview: string; status: EmailStatus; relatedType?: string | null; createdAt: string };
type SubscriptionPlan = 'FREE' | 'STARTER' | 'BUSINESS' | 'PRO';
type SubscriptionStatus = 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED';
type BillingStatus = {
  subscription: {
    id: string;
    plan: SubscriptionPlan;
    status: SubscriptionStatus;
    trialEndsAt?: string | null;
    currentPeriodEndsAt?: string | null;
  };
  access: { canUseSuite: boolean; level: 'ok' | 'warn' | 'block'; message: string };
  currency: string;
  currencyLocale: string;
  plans: { plan: SubscriptionPlan; priceMonthly: number; features: string[] }[];
  checkoutReady: boolean;
};

const emptyCompanyForm: CompanyForm = { name: '', industry: '', email: '', phone: '', address: '' };
const emptyEmployeeForm: EmployeeForm = { employeeNo: '', firstName: '', lastName: '', email: '', phone: '', jobTitle: '', department: '', status: 'ACTIVE' };
const emptyCustomerForm: CustomerForm = { name: '', email: '', phone: '', companyName: '', status: 'LEAD', notes: '' };
const emptyDealForm: DealForm = { title: '', customerId: '', stage: 'NEW_LEAD', value: '', expectedCloseDate: '', notes: '' };
const emptyProductForm: ProductForm = { name: '', description: '', type: 'SERVICE', unitPrice: '' };
const emptySupplierForm: SupplierForm = { name: '', email: '', phone: '', contactName: '', address: '', notes: '' };
const emptyInventoryForm: InventoryForm = { sku: '', name: '', description: '', quantity: '0', reorderLevel: '0', unitCost: '0', supplierId: '' };
const emptyPurchaseOrderForm: PurchaseOrderForm = { supplierId: '', inventoryItemId: '', description: '', quantity: '1', unitCost: '0', tax: '0', expectedAt: '', notes: '' };
const emptyQuoteForm: QuoteForm = { customerId: '', validUntil: '', productId: '', description: '', quantity: '1', unitPrice: '', tax: '0', notes: '' };
const emptyInvoiceForm: InvoiceForm = { customerId: '', dueDate: '', productId: '', description: '', quantity: '1', unitPrice: '', tax: '0', notes: '' };
const emptyPaymentForm: PaymentForm = { invoiceId: '', amount: '', method: 'Bank transfer', reference: '' };
const emptyExpenseForm: ExpenseForm = { vendor: '', category: 'OPERATIONS', amount: '', spentAt: '', description: '', receiptUrl: '' };
const emptyProjectForm: ProjectForm = { name: '', customerId: '', status: 'PLANNED', budget: '', startDate: '', dueDate: '', description: '' };
const emptyTaskForm: TaskForm = { projectId: '', title: '', status: 'TODO', priority: 'MEDIUM', dueDate: '', assignee: '', description: '' };
const emptyTeamMemberForm: TeamMemberForm = { firstName: '', lastName: '', email: '', password: 'Password123!', role: 'EMPLOYEE' };

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

const DEFAULT_CURRENCY = process.env.NEXT_PUBLIC_CURRENCY || 'PGK';
const DEFAULT_CURRENCY_LOCALE = process.env.NEXT_PUBLIC_CURRENCY_LOCALE || 'en-PG';

function currency(value?: number, code = DEFAULT_CURRENCY, locale = DEFAULT_CURRENCY_LOCALE) {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: code }).format(value ?? 0);
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
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [emailMessages, setEmailMessages] = useState<EmailMessage[]>([]);
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [reports, setReports] = useState<ReportSummary | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [employeeForm, setEmployeeForm] = useState<EmployeeForm>(emptyEmployeeForm);
  const [customerForm, setCustomerForm] = useState<CustomerForm>(emptyCustomerForm);
  const [dealForm, setDealForm] = useState<DealForm>(emptyDealForm);
  const [productForm, setProductForm] = useState<ProductForm>(emptyProductForm);
  const [supplierForm, setSupplierForm] = useState<SupplierForm>(emptySupplierForm);
  const [inventoryForm, setInventoryForm] = useState<InventoryForm>(emptyInventoryForm);
  const [purchaseOrderForm, setPurchaseOrderForm] = useState<PurchaseOrderForm>(emptyPurchaseOrderForm);
  const [quoteForm, setQuoteForm] = useState<QuoteForm>(emptyQuoteForm);
  const [invoiceForm, setInvoiceForm] = useState<InvoiceForm>(emptyInvoiceForm);
  const [paymentForm, setPaymentForm] = useState<PaymentForm>(emptyPaymentForm);
  const [expenseForm, setExpenseForm] = useState<ExpenseForm>(emptyExpenseForm);
  const [projectForm, setProjectForm] = useState<ProjectForm>(emptyProjectForm);
  const [taskForm, setTaskForm] = useState<TaskForm>(emptyTaskForm);
  const [teamMemberForm, setTeamMemberForm] = useState<TeamMemberForm>(emptyTeamMemberForm);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [activeSection, setActiveSection] = useState('overview');

  const activeEmployee = useMemo(() => employees.find((employee) => employee.id === editingEmployeeId), [editingEmployeeId, employees]);
  const activeProducts = products.filter((product) => product.active);
  const openInvoices = invoices.filter((invoice) => invoice.status !== 'PAID' && invoice.status !== 'VOID');
  const openQuotes = quotes.filter((quote) => quote.status === 'DRAFT' || quote.status === 'SENT');
  const lowStockItems = inventoryItems.filter((item) => item.quantity <= item.reorderLevel);
  const openPurchaseOrders = purchaseOrders.filter((order) => order.status === 'DRAFT' || order.status === 'ORDERED');
  const pipelineStages: DealStage[] = ['NEW_LEAD', 'CONTACTED', 'PROPOSAL_SENT', 'WON', 'LOST'];
  const purchaseOrderStatuses: PurchaseOrderStatus[] = ['DRAFT', 'ORDERED', 'RECEIVED', 'CANCELLED'];
  const quoteStatuses: QuoteStatus[] = ['DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED'];
  const expenseCategories: ExpenseCategory[] = ['OPERATIONS', 'MARKETING', 'PAYROLL', 'SOFTWARE', 'RENT', 'TRAVEL', 'TAX', 'OTHER'];
  const projectStatuses: ProjectStatus[] = ['PLANNED', 'ACTIVE', 'ON_HOLD', 'COMPLETED'];
  const taskStatuses: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE', 'BLOCKED'];
  const taskPriorities: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
  const roles: Role[] = ['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE'];
  const companyName = company?.name ?? summary?.company.name ?? 'your company';
  const currentRole = currentUser?.role ?? 'EMPLOYEE';
  const isOwnerOrAdmin = currentRole === 'OWNER' || currentRole === 'ADMIN';
  const canUseSuite = billing?.access.canUseSuite ?? true;
  const canManageBusiness = (isOwnerOrAdmin || currentRole === 'MANAGER') && canUseSuite;
  const billingBlocked = billing?.access.level === 'block';
  const navItems = useMemo(() => [
    { label: 'Overview', id: 'overview' },
    { label: 'Company', id: 'company' },
    { label: 'Team', id: 'team' },
    { label: 'Employees', id: 'employees' },
    { label: 'Customers', id: 'customers' },
    { label: 'Sales', id: 'sales' },
    { label: 'Quotes', id: 'quotes' },
    { label: 'Inventory', id: 'inventory' },
    { label: 'Purchasing', id: 'purchasing' },
    { label: 'Projects', id: 'projects' },
    { label: 'Products', id: 'products' },
    { label: 'Invoices', id: 'invoices' },
    { label: 'Payments', id: 'payments' },
    { label: 'Expenses', id: 'expenses' },
    { label: 'Reports', id: 'reports' },
    ...(canManageBusiness ? [{ label: 'Settings', id: 'settings' }] : []),
    ...(isOwnerOrAdmin ? [{ label: 'Billing', id: 'billing' }, { label: 'Audit', id: 'audit' }] : []),
  ], [canManageBusiness, isOwnerOrAdmin]);
  const totalTasks = summary?.metrics.tasks ?? 0;
  const workspaceItems = [
    { label: 'Complete company profile', done: Boolean(company?.email && company?.phone && company?.industry), detail: company?.email && company?.phone ? 'Company contact details are ready.' : 'Add company email, phone, and industry.' },
    { label: 'Add team or employee records', done: teamMembers.length > 1 || employees.length > 0, detail: teamMembers.length > 1 ? `${teamMembers.length} users can access the suite.` : 'Add team users or employee records.' },
    { label: 'Add customers or leads', done: customers.length > 0, detail: customers.length > 0 ? `${customers.length} customer records are active.` : 'Create your first customer or lead.' },
    { label: 'Set up products/services', done: activeProducts.length > 0, detail: activeProducts.length > 0 ? `${activeProducts.length} active catalog items are ready.` : 'Add services, products, or packages.' },
    { label: 'Create a project/task workflow', done: projects.length > 0 && totalTasks > 0, detail: projects.length > 0 ? `${projects.length} projects and ${totalTasks} tasks are tracked.` : 'Create a project and assign tasks.' },
    { label: 'Start finance tracking', done: invoices.length > 0 || expenses.length > 0, detail: invoices.length > 0 || expenses.length > 0 ? `${invoices.length} invoices and ${expenses.length} expenses are recorded.` : 'Create an invoice or record an expense.' },
  ];
  const completedWorkspaceItems = workspaceItems.filter((item) => item.done).length;
  const workspaceProgress = Math.round((completedWorkspaceItems / workspaceItems.length) * 100);

  async function loadDashboard() {
    setError('');
    const [nextSummary, nextCompany, nextEmployees, nextCustomers, nextDeals, nextProducts, nextPurchasing, nextQuotes, nextInvoices, nextExpenses, nextProjects, nextTeamMembers, nextAuditLogs, nextEmailMessages, nextBilling, nextReports] = await Promise.all([
      api<Summary>('/dashboard/summary'),
      api<Company>('/company'),
      api<Employee[]>('/employees'),
      api<Customer[]>('/customers'),
      api<Deal[]>('/deals'),
      api<Product[]>('/products'),
      api<PurchasingOverview>('/purchasing'),
      api<Quote[]>('/quotes'),
      api<Invoice[]>('/invoices'),
      api<Expense[]>('/expenses'),
      api<Project[]>('/projects'),
      api<TeamMember[]>('/team'),
      api<AuditLog[]>('/audit-logs').catch(() => []),
      api<EmailMessage[]>('/email/outbox').catch(() => []),
      api<BillingStatus>('/billing').catch(() => null),
      api<ReportSummary>('/reports/summary'),
    ]);
    setSummary(nextSummary);
    setCompany(nextCompany);
    setCompanyForm(toCompanyForm(nextCompany));
    setEmployees(nextEmployees);
    setCustomers(nextCustomers);
    setDeals(nextDeals);
    setProducts(nextProducts);
    setSuppliers(nextPurchasing.suppliers);
    setInventoryItems(nextPurchasing.inventoryItems);
    setPurchaseOrders(nextPurchasing.purchaseOrders);
    setQuotes(nextQuotes);
    setInvoices(nextInvoices);
    setExpenses(nextExpenses);
    setProjects(nextProjects);
    setTeamMembers(nextTeamMembers);
    setAuditLogs(nextAuditLogs);
    setEmailMessages(nextEmailMessages);
    setBilling(nextBilling);
    setReports(nextReports);
    setInvoiceForm((current) => ({
      ...current,
      customerId: current.customerId || nextCustomers[0]?.id || '',
      productId: current.productId || nextProducts.find((product) => product.active)?.id || '',
    }));
    setDealForm((current) => ({ ...current, customerId: current.customerId || nextCustomers[0]?.id || '' }));
    setInventoryForm((current) => ({ ...current, supplierId: current.supplierId || nextPurchasing.suppliers[0]?.id || '' }));
    setPurchaseOrderForm((current) => ({
      ...current,
      supplierId: current.supplierId || nextPurchasing.suppliers[0]?.id || '',
      inventoryItemId: current.inventoryItemId || nextPurchasing.inventoryItems[0]?.id || '',
    }));
    setQuoteForm((current) => ({
      ...current,
      customerId: current.customerId || nextCustomers[0]?.id || '',
      productId: current.productId || nextProducts.find((product) => product.active)?.id || '',
    }));
    setPaymentForm((current) => ({ ...current, invoiceId: current.invoiceId || nextInvoices.find((invoice) => invoice.balance > 0)?.id || '' }));
    setProjectForm((current) => ({ ...current, customerId: current.customerId || nextCustomers[0]?.id || '' }));
    setTaskForm((current) => ({ ...current, projectId: current.projectId || nextProjects[0]?.id || '' }));
  }

  useEffect(() => {
    const storedUser = getStoredUser<CurrentUser>();
    if (!storedUser) {
      router.push('/login');
      return;
    }

    setCurrentUser(storedUser);
    loadDashboard()
      .catch((cause) => {
        const message = cause instanceof Error ? cause.message : 'Unable to load dashboard';
        if (cause instanceof ApiError && cause.status === 401) {
          router.push('/login');
          return;
        }
        setError(message);
        if (message.toLowerCase().includes('token')) router.push('/login');
      })
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    function syncActiveSectionFromHash() {
      const sectionId = window.location.hash.replace('#', '') || 'overview';
      const nextSection = navItems.some((item) => item.id === sectionId) ? sectionId : 'overview';
      setActiveSection(nextSection);
    }

    syncActiveSectionFromHash();
    window.addEventListener('hashchange', syncActiveSectionFromHash);
    return () => window.removeEventListener('hashchange', syncActiveSectionFromHash);
  }, [navItems]);

  function activateSection(sectionId: string) {
    setActiveSection(sectionId);
  }

  function isSectionVisible(sectionId: string) {
    const relatedSections: Record<string, string[]> = {
      overview: ['overview', 'company-summary', 'business-progress'],
      company: ['company-summary', 'settings'],
      products: ['customers'],
      inventory: ['inventory', 'purchasing', 'purchase-orders'],
      purchasing: ['purchasing', 'purchase-orders'],
      projects: ['projects', 'projects-board'],
      payments: ['invoices'],
      audit: ['audit', 'email'],
    };

    return (relatedSections[activeSection] ?? [activeSection]).includes(sectionId);
  }

  function sectionClass(baseClass: string, sectionId: string) {
    return `${baseClass} dashboardSection ${isSectionVisible(sectionId) ? 'visibleSection' : ''}`.trim();
  }

  function signOut() {
    clearSession();
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

  async function updateCustomerStatus(customerId: string, status: CustomerStatus) {
    setSaving(customerId);
    setError('');
    setNotice('');
    try {
      await api<Customer>(`/customers/${customerId}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      setNotice(`Customer status updated to ${labelFromEnum(status)}.`);
      await loadDashboard();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update customer');
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

  async function updateProductActive(productId: string, active: boolean) {
    setSaving(productId);
    setError('');
    setNotice('');
    try {
      await api<Product>(`/products/${productId}`, { method: 'PATCH', body: JSON.stringify({ active }) });
      setNotice(`Product/service was marked ${active ? 'active' : 'inactive'}.`);
      await loadDashboard();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update product or service');
    } finally {
      setSaving('');
    }
  }

  async function saveSupplier(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving('supplier');
    setError('');
    setNotice('');
    try {
      await api<Supplier>('/purchasing/suppliers', {
        method: 'POST',
        body: JSON.stringify({
          name: supplierForm.name.trim(),
          email: cleanText(supplierForm.email),
          phone: cleanText(supplierForm.phone),
          contactName: cleanText(supplierForm.contactName),
          address: cleanText(supplierForm.address),
          notes: cleanText(supplierForm.notes),
        }),
      });
      setNotice(`${supplierForm.name.trim()} was added as a supplier.`);
      setSupplierForm(emptySupplierForm);
      await loadDashboard();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save supplier');
    } finally {
      setSaving('');
    }
  }

  async function saveInventoryItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving('inventory');
    setError('');
    setNotice('');
    try {
      await api<InventoryItem>('/purchasing/inventory', {
        method: 'POST',
        body: JSON.stringify({
          sku: inventoryForm.sku.trim(),
          name: inventoryForm.name.trim(),
          description: cleanText(inventoryForm.description),
          quantity: Number(inventoryForm.quantity || 0),
          reorderLevel: Number(inventoryForm.reorderLevel || 0),
          unitCost: Number(inventoryForm.unitCost || 0),
          supplierId: cleanText(inventoryForm.supplierId),
        }),
      });
      setNotice(`${inventoryForm.name.trim()} was added to inventory.`);
      setInventoryForm({ ...emptyInventoryForm, supplierId: suppliers[0]?.id ?? '' });
      await loadDashboard();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save inventory item');
    } finally {
      setSaving('');
    }
  }

  function choosePurchaseInventory(itemId: string) {
    const item = inventoryItems.find((record) => record.id === itemId);
    setPurchaseOrderForm((current) => ({
      ...current,
      inventoryItemId: itemId,
      description: item?.name ?? current.description,
      unitCost: item ? String(item.unitCost) : current.unitCost,
      supplierId: item?.supplier?.id ?? current.supplierId,
    }));
  }

  async function createPurchaseOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving('purchase-order');
    setError('');
    setNotice('');
    try {
      const order = await api<PurchaseOrder>('/purchasing/purchase-orders', {
        method: 'POST',
        body: JSON.stringify({
          supplierId: purchaseOrderForm.supplierId,
          expectedAt: cleanText(purchaseOrderForm.expectedAt),
          tax: Number(purchaseOrderForm.tax || 0),
          notes: cleanText(purchaseOrderForm.notes),
          items: [{
            inventoryItemId: cleanText(purchaseOrderForm.inventoryItemId),
            description: purchaseOrderForm.description.trim(),
            quantity: Number(purchaseOrderForm.quantity),
            unitCost: Number(purchaseOrderForm.unitCost),
          }],
        }),
      });
      setNotice(`${order.orderNo} was created for ${currency(order.total)}.`);
      setPurchaseOrderForm({ ...emptyPurchaseOrderForm, supplierId: suppliers[0]?.id ?? '', inventoryItemId: inventoryItems[0]?.id ?? '' });
      await loadDashboard();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to create purchase order');
    } finally {
      setSaving('');
    }
  }

  async function updatePurchaseOrderStatus(orderId: string, status: PurchaseOrderStatus) {
    setSaving(orderId);
    setError('');
    setNotice('');
    try {
      await api<PurchaseOrder>(`/purchasing/purchase-orders/${orderId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      setNotice(`Purchase order was marked ${labelFromEnum(status)}.`);
      await loadDashboard();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update purchase order');
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

  function chooseQuoteProduct(productId: string) {
    const product = products.find((item) => item.id === productId);
    setQuoteForm((current) => ({
      ...current,
      productId,
      description: product?.name ?? current.description,
      unitPrice: product ? String(product.unitPrice) : current.unitPrice,
    }));
  }

  async function createQuote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving('quote');
    setError('');
    setNotice('');
    try {
      const quote = await api<Quote>('/quotes', {
        method: 'POST',
        body: JSON.stringify({
          customerId: quoteForm.customerId,
          validUntil: cleanText(quoteForm.validUntil),
          tax: Number(quoteForm.tax || 0),
          notes: cleanText(quoteForm.notes),
          items: [{
            productId: cleanText(quoteForm.productId),
            description: quoteForm.description.trim(),
            quantity: Number(quoteForm.quantity),
            unitPrice: Number(quoteForm.unitPrice),
          }],
        }),
      });
      setNotice(`${quote.quoteNo} was created for ${currency(quote.total)}.`);
      setQuoteForm({ ...emptyQuoteForm, customerId: customers[0]?.id ?? '', productId: activeProducts[0]?.id ?? '' });
      await loadDashboard();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to create quote');
    } finally {
      setSaving('');
    }
  }

  async function updateQuoteStatus(quoteId: string, status: QuoteStatus) {
    setSaving(quoteId);
    setError('');
    setNotice('');
    try {
      await api<Quote>(`/quotes/${quoteId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      setNotice(`Quote was marked ${labelFromEnum(status)}.`);
      await loadDashboard();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update quote');
    } finally {
      setSaving('');
    }
  }

  async function queueQuoteEmail(quote: Quote) {
    setSaving(`quote-email-${quote.id}`);
    setError('');
    setNotice('');
    try {
      await api<EmailMessage>(`/quotes/${quote.id}/email`, { method: 'POST' });
      setNotice(`${quote.quoteNo} email was queued for ${quote.customer.name}.`);
      await loadDashboard();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to queue quote email');
    } finally {
      setSaving('');
    }
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

  async function downloadInvoicePdf(invoice: Invoice) {
    setSaving(`pdf-${invoice.id}`);
    setError('');
    setNotice('');
    try {
      const response = await fetch(`${API_URL}/invoices/${invoice.id}/pdf`, {
        headers: authHeaders(),
      });
      if (response.status === 401) {
        clearSession();
        router.push('/login');
        throw new Error('Your session expired. Please sign in again.');
      }
      if (!response.ok) throw new Error('Unable to download invoice PDF');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${invoice.invoiceNo}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      setNotice(`${invoice.invoiceNo} PDF downloaded.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to download invoice PDF');
    } finally {
      setSaving('');
    }
  }

  async function queueInvoiceEmail(invoice: Invoice) {
    setSaving(`invoice-email-${invoice.id}`);
    setError('');
    setNotice('');
    try {
      await api<EmailMessage>(`/invoices/${invoice.id}/email`, { method: 'POST' });
      setNotice(`${invoice.invoiceNo} email was queued for ${invoice.customer.name}.`);
      await loadDashboard();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to queue invoice email');
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

  async function updateExpenseCategory(expenseId: string, category: ExpenseCategory) {
    setSaving(expenseId);
    setError('');
    setNotice('');
    try {
      await api<Expense>(`/expenses/${expenseId}`, { method: 'PATCH', body: JSON.stringify({ category }) });
      setNotice(`Expense moved to ${categoryLabel(category)}.`);
      await loadDashboard();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update expense');
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

  async function updateProjectStatus(projectId: string, status: ProjectStatus) {
    setSaving(projectId);
    setError('');
    setNotice('');
    try {
      await api<Project>(`/projects/${projectId}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      setNotice(`Project moved to ${labelFromEnum(status)}.`);
      await loadDashboard();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update project');
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

  async function saveTeamMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving('team');
    setError('');
    setNotice('');
    try {
      await api<TeamMember>('/team', {
        method: 'POST',
        body: JSON.stringify({
          firstName: teamMemberForm.firstName.trim(),
          lastName: teamMemberForm.lastName.trim(),
          email: teamMemberForm.email.trim(),
          password: teamMemberForm.password,
          role: teamMemberForm.role,
        }),
      });
      setNotice(`${teamMemberForm.firstName.trim()} ${teamMemberForm.lastName.trim()} was added to the team.`);
      setTeamMemberForm(emptyTeamMemberForm);
      await loadDashboard();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to add team member');
    } finally {
      setSaving('');
    }
  }

  async function updateTeamRole(memberId: string, role: Role) {
    setSaving(memberId);
    setError('');
    setNotice('');
    try {
      await api<TeamMember>(`/team/${memberId}`, { method: 'PATCH', body: JSON.stringify({ role }) });
      setNotice(`Team role updated to ${labelFromEnum(role)}.`);
      await loadDashboard();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update team role');
    } finally {
      setSaving('');
    }
  }

  async function updateBillingPlan(plan: SubscriptionPlan) {
    setSaving(`billing-${plan}`);
    setError('');
    setNotice('');
    try {
      const subscription = await api<BillingStatus['subscription']>('/billing/plan', { method: 'PATCH', body: JSON.stringify({ plan }) });
      setBilling((current) => current ? { ...current, subscription } : current);
      setNotice(`Billing plan changed to ${labelFromEnum(plan)}.`);
      await loadDashboard();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update billing plan');
    } finally {
      setSaving('');
    }
  }

  async function startStripeCheckout(plan: SubscriptionPlan) {
    setSaving(`checkout-${plan}`);
    setError('');
    setNotice('');
    try {
      const result = await api<{ url?: string | null }>('/billing/checkout', { method: 'POST', body: JSON.stringify({ plan }) });
      if (!result.url) throw new Error('Stripe did not return a checkout URL');
      window.location.href = result.url;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to start Stripe checkout');
    } finally {
      setSaving('');
    }
  }

  async function downloadReport(type: string) {
    setSaving(`report-${type}`);
    setError('');
    setNotice('');
    try {
      const response = await fetch(`${API_URL}/reports/export/${type}`, {
        headers: authHeaders(),
      });
      if (response.status === 401) {
        clearSession();
        router.push('/login');
        throw new Error('Your session expired. Please sign in again.');
      }
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

  async function sendQueuedEmails() {
    setSaving('email-send-queued');
    setError('');
    setNotice('');
    try {
      const result = await api<{ attempted: number; sent: number; failed: number }>('/email/outbox/send-queued', { method: 'POST' });
      setNotice(`Email delivery processed: ${result.sent} sent, ${result.failed} failed, ${result.attempted} attempted.`);
      await loadDashboard();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to send queued emails');
    } finally {
      setSaving('');
    }
  }

  async function sendEmailMessage(message: EmailMessage) {
    setSaving(`email-send-${message.id}`);
    setError('');
    setNotice('');
    try {
      const sent = await api<EmailMessage>(`/email/outbox/${message.id}/send`, { method: 'POST' });
      setNotice(`${sent.subject} is now ${labelFromEnum(sent.status)}.`);
      await loadDashboard();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to send email message');
    } finally {
      setSaving('');
    }
  }

  return (
    <main className="appShell">
      <aside className="sidebar">
        <BrandMark tone="light" compact className="sidebarLogo" />
        <nav>
          {navItems.map((item) => (
            <a
              className={activeSection === item.id ? 'active' : ''}
              href={`#${item.id}`}
              key={item.id}
              onClick={() => activateSection(item.id)}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <button className="signOut" onClick={signOut}>Sign out</button>
      </aside>

      <section className="dashboard">
        <header id="overview" className={sectionClass('', 'overview')}>
          <div>
            <p className="eyebrow">Founder dashboard</p>
            <h1>{summary ? `Welcome to ${companyName}` : 'Welcome back'}</h1>
          </div>
          <div className="rowActions">
            <span className="badge">{labelFromEnum(currentRole)}</span>
            <div className="avatar">RB</div>
          </div>
        </header>

        {error && <p className="error">{error}</p>}
        {notice && <p className="success">{notice}</p>}
        {billing && <p className={billing.access.level === 'block' ? 'error' : billing.access.level === 'warn' ? 'success' : 'muted'}>
          Billing: {billing.access.message}
        </p>}
        {billingBlocked && isOwnerOrAdmin && <p className="muted">Billing remains available so an owner/admin can restore access.</p>}
        {!canManageBusiness && !billingBlocked && <p className="muted">You are signed in with employee access. Create, billing, admin, and export controls are hidden; task status updates remain available.</p>}
        {billingBlocked && !isOwnerOrAdmin && <p className="muted">Business actions are limited until an owner/admin restores subscription access.</p>}

        <div className="stats">
          <article><span>Revenue collected</span><b>{loading ? '-' : currency(summary?.metrics.revenue)}</b><small>Recorded payments</small></article>
          <article><span>Net profit</span><b>{loading ? '-' : currency(summary?.metrics.netProfit)}</b><small>Revenue minus expenses</small></article>
          <article><span>Total expenses</span><b>{loading ? '-' : currency(summary?.metrics.expenses)}</b><small>{summary?.metrics.expenseCount ?? 0} records</small></article>
          <article><span>Monthly spend</span><b>{loading ? '-' : currency(summary?.metrics.monthlyExpenses)}</b><small>This month</small></article>
          <article><span>Outstanding</span><b>{loading ? '-' : currency(summary?.metrics.outstanding)}</b><small>Invoice balances</small></article>
          <article><span>Active projects</span><b>{summary?.metrics.activeProjects ?? (loading ? '-' : 0)}</b><small>{summary?.metrics.projects ?? 0} total</small></article>
          <article><span>Open tasks</span><b>{summary?.metrics.openTasks ?? (loading ? '-' : 0)}</b><small>{summary?.metrics.overdueTasks ?? 0} overdue</small></article>
          <article><span>Team members</span><b>{summary?.metrics.teamMembers ?? (loading ? '-' : 0)}</b><small>{summary?.metrics.admins ?? 0} admins/owners</small></article>
          <article><span>Open pipeline</span><b>{loading ? '-' : currency(summary?.metrics.pipelineValue)}</b><small>{summary?.metrics.openDeals ?? 0} open deals</small></article>
          <article><span>Won deals</span><b>{loading ? '-' : currency(summary?.metrics.wonDealValue)}</b><small>{summary?.metrics.conversionRate ?? 0}% conversion</small></article>
          <article><span>Open quotes</span><b>{openQuotes.length}</b><small>{quotes.length} total estimates</small></article>
          <article><span>Low stock</span><b>{lowStockItems.length}</b><small>{inventoryItems.length} inventory items</small></article>
          <article><span>Open purchase orders</span><b>{openPurchaseOrders.length}</b><small>{purchaseOrders.length} total orders</small></article>
          <article><span>Customers</span><b>{summary?.metrics.customers ?? (loading ? '-' : 0)}</b><small>{summary?.metrics.activeCustomers ?? 0} active</small></article>
          <article><span>Open invoices</span><b>{summary?.metrics.openInvoices ?? (loading ? '-' : 0)}</b><small>{summary?.metrics.invoices ?? 0} total</small></article>
          <article><span>Total employees</span><b>{summary?.metrics.employees ?? (loading ? '-' : 0)}</b><small>{summary?.metrics.activeEmployees ?? 0} active</small></article>
          <article><span>Departments</span><b>{summary?.metrics.departments ?? (loading ? '-' : 0)}</b><small>Business teams</small></article>
          <article><span>Products/services</span><b>{summary?.metrics.products ?? (loading ? '-' : 0)}</b><small>Active catalog</small></article>
          <article><span>Suite modules</span><b>{summary?.metrics.productsEnabled ?? '-'}</b><small>Core company system</small></article>
        </div>

        <div className={sectionClass('dashboardGrid', 'company-summary')} id="company">
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

        <section className={sectionClass('panel', 'business-progress')}>
          <div className="panelHeading">
            <div>
              <p className="eyebrow">Business setup</p>
              <h2>{completedWorkspaceItems} of {workspaceItems.length} workspace items complete</h2>
            </div>
            <span className="badge">{workspaceProgress}% complete</span>
          </div>
          <div className="progress"><span style={{ width: `${workspaceProgress}%` }} /></div>
          <div className="onboardingGrid">
            {workspaceItems.map((item) => (
              <article className={`onboardingItem ${item.done ? 'done' : ''}`} key={item.label}>
                <span>{item.done ? '✓' : '!'}</span>
                <div>
                  <b>{item.label}</b>
                  <small>{item.detail}</small>
                </div>
              </article>
            ))}
          </div>
          {!canManageBusiness && <p className="muted">Your role is focused on viewing records and updating task status. Managers, admins, and owners can complete setup items.</p>}
        </section>

        {isOwnerOrAdmin && <section className={sectionClass('panel', 'billing')} id="billing">
          <div className="panelHeading">
            <div><p className="eyebrow">Billing</p><h2>Subscription and launch monetization</h2></div>
            <span className={`badge ${billing?.subscription.status.toLowerCase() ?? ''}`}>{billing ? labelFromEnum(billing.subscription.status) : 'Not configured'}</span>
          </div>
          <div className="stats">
            <article><span>Current plan</span><b>{billing ? labelFromEnum(billing.subscription.plan) : '-'}</b><small>Account subscription tier</small></article>
            <article><span>Trial ends</span><b>{billing?.subscription.trialEndsAt ? new Date(billing.subscription.trialEndsAt).toLocaleDateString() : '-'}</b><small>Default launch trial window</small></article>
            <article><span>Access</span><b>{billing?.access.canUseSuite ? 'Open' : 'Limited'}</b><small>{billing?.access.message ?? 'Subscription access status'}</small></article>
            <article><span>Checkout</span><b>{billing?.checkoutReady ? 'Ready' : 'Setup'}</b><small>{billing?.checkoutReady ? 'Stripe keys detected' : 'Add Stripe keys before live payments'}</small></article>
          </div>
          <div className="recordsGrid">
            {(billing?.plans ?? []).map((plan) => (
              <article className="panel" key={plan.plan}>
                <div className="panelHeading">
                  <div>
                    <p className="eyebrow">{labelFromEnum(plan.plan)}</p>
                    <h2>{currency(plan.priceMonthly, billing?.currency, billing?.currencyLocale)} / month</h2>
                  </div>
                  {billing?.subscription.plan === plan.plan && <span className="badge">Current</span>}
                </div>
                <ul className="suggestions">{plan.features.map((feature) => <li key={feature}><i>✓</i>{feature}</li>)}</ul>
                <button className="button" onClick={() => updateBillingPlan(plan.plan)} disabled={billing?.subscription.plan === plan.plan || saving === `billing-${plan.plan}`}>
                  {saving === `billing-${plan.plan}` ? 'Saving...' : billing?.subscription.plan === plan.plan ? 'Selected' : `Choose ${labelFromEnum(plan.plan)}`}
                </button>
                {plan.plan !== 'FREE' && <button className="ghostButton" onClick={() => startStripeCheckout(plan.plan)} disabled={!billing?.checkoutReady || saving === `checkout-${plan.plan}`}>
                  {saving === `checkout-${plan.plan}` ? 'Opening Stripe...' : billing?.checkoutReady ? `Pay for ${labelFromEnum(plan.plan)}` : 'Stripe setup required'}
                </button>}
              </article>
            ))}
          </div>
          {!billing?.checkoutReady && <p className="muted">Next launch step: add Stripe checkout keys and webhook handling so customers can pay online. This billing foundation keeps plan/status tracking ready now.</p>}
        </section>}

        <section className={sectionClass('recordsGrid', 'team')} id="team">
          {isOwnerOrAdmin && <article className="panel">
            <div className="panelHeading"><div><p className="eyebrow">Team access</p><h2>Add team member</h2></div><span className="badge">{teamMembers.length} users</span></div>
            <form className="companyForm" onSubmit={saveTeamMember}>
              <label>First name<input required minLength={2} value={teamMemberForm.firstName} onChange={(event) => setTeamMemberForm((current) => ({ ...current, firstName: event.target.value }))} /></label>
              <label>Last name<input required minLength={2} value={teamMemberForm.lastName} onChange={(event) => setTeamMemberForm((current) => ({ ...current, lastName: event.target.value }))} /></label>
              <label>Email<input required type="email" value={teamMemberForm.email} onChange={(event) => setTeamMemberForm((current) => ({ ...current, email: event.target.value }))} /></label>
              <label>Temporary password<input required minLength={8} value={teamMemberForm.password} onChange={(event) => setTeamMemberForm((current) => ({ ...current, password: event.target.value }))} /></label>
              <label>Role<select value={teamMemberForm.role} onChange={(event) => setTeamMemberForm((current) => ({ ...current, role: event.target.value as Role }))}>{roles.map((role) => <option key={role} value={role}>{labelFromEnum(role)}</option>)}</select></label>
              <button className="button" disabled={saving === 'team'}>{saving === 'team' ? 'Adding...' : 'Add team member'}</button>
            </form>
          </article>}

          <article className="panel">
            <div className="panelHeading"><div><p className="eyebrow">Access control</p><h2>Team members</h2></div><span className="badge">{summary?.metrics.admins ?? 0} admins</span></div>
            <div className="tableWrap"><table className="dataTable"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th></tr></thead><tbody>{teamMembers.map((member) => <tr key={member.id}><td><b>{member.firstName} {member.lastName}</b></td><td>{member.email}</td><td>{isOwnerOrAdmin ? <select value={member.role} onChange={(event) => updateTeamRole(member.id, event.target.value as Role)} disabled={saving === member.id}>{roles.map((role) => <option key={role} value={role}>{labelFromEnum(role)}</option>)}</select> : labelFromEnum(member.role)}</td><td>{new Date(member.createdAt).toLocaleDateString()}</td></tr>)}</tbody></table></div>
          </article>
        </section>

        {isOwnerOrAdmin && <section className={sectionClass('panel', 'audit')} id="audit">
          <div className="panelHeading"><div><p className="eyebrow">Audit trail</p><h2>Recent company activity</h2></div><span className="badge">{auditLogs.length} events</span></div>
          <div className="tableWrap"><table className="dataTable"><thead><tr><th>Action</th><th>Record</th><th>Actor</th><th>When</th></tr></thead><tbody>{auditLogs.map((log) => <tr key={log.id}><td><b>{log.description}</b><small>{labelFromEnum(log.action)}</small></td><td>{labelFromEnum(log.entityType)}</td><td>{log.actorName}</td><td>{new Date(log.createdAt).toLocaleString()}</td></tr>)}</tbody></table></div>
          {auditLogs.length === 0 && <div className="emptyState"><h3>No audit events yet</h3><p className="muted">Owners and admins will see company changes here as the team works.</p></div>}
        </section>}

        {isOwnerOrAdmin && <section className={sectionClass('panel', 'email')} id="email">
          <div className="panelHeading"><div><p className="eyebrow">Email outbox</p><h2>Queued business emails</h2></div><span className="badge">{emailMessages.length} messages</span></div>
          <div className="exportActions"><button className="ghostButton" onClick={sendQueuedEmails} disabled={saving === 'email-send-queued' || emailMessages.filter((message) => message.status === 'QUEUED').length === 0}>{saving === 'email-send-queued' ? 'Sending...' : 'Send queued emails'}</button></div>
          <div className="tableWrap"><table className="dataTable"><thead><tr><th>Email</th><th>Related</th><th>Status</th><th>Queued</th><th>Action</th></tr></thead><tbody>{emailMessages.map((message) => <tr key={message.id}><td><b>{message.subject}</b><small>To {message.to} Â· {message.bodyPreview}</small></td><td>{message.relatedType ? labelFromEnum(message.relatedType) : '-'}</td><td><span className={`statusPill ${message.status.toLowerCase()}`}>{labelFromEnum(message.status)}</span></td><td>{new Date(message.createdAt).toLocaleString()}</td><td>{message.status !== 'SENT' && <button className="ghostButton" onClick={() => sendEmailMessage(message)} disabled={saving === `email-send-${message.id}`}>{saving === `email-send-${message.id}` ? 'Sending...' : 'Send'}</button>}</td></tr>)}</tbody></table></div>
          {emailMessages.length === 0 && <div className="emptyState"><h3>No emails queued yet</h3><p className="muted">Invoice, quote, and team invite messages will appear here before SMTP delivery is connected.</p></div>}
        </section>}

        {canManageBusiness && <section className={sectionClass('operationsGrid', 'settings')} id="settings">
          {isOwnerOrAdmin && <article className="panel companyFormPanel">
            <div className="panelHeading"><div><p className="eyebrow">Company settings</p><h2>Business profile</h2></div><span className="badge">Profile</span></div>
            <form className="companyForm" onSubmit={saveCompany}>
              <label>Company name<input required minLength={2} value={companyForm.name} onChange={(event) => setCompanyForm((current) => ({ ...current, name: event.target.value }))} disabled={saving === 'company'} /></label>
              <label>Industry<input value={companyForm.industry} onChange={(event) => setCompanyForm((current) => ({ ...current, industry: event.target.value }))} disabled={saving === 'company'} /></label>
              <label>Email<input type="email" value={companyForm.email} onChange={(event) => setCompanyForm((current) => ({ ...current, email: event.target.value }))} disabled={saving === 'company'} /></label>
              <label>Phone<input value={companyForm.phone} onChange={(event) => setCompanyForm((current) => ({ ...current, phone: event.target.value }))} disabled={saving === 'company'} /></label>
              <label className="wideField">Address<textarea value={companyForm.address} onChange={(event) => setCompanyForm((current) => ({ ...current, address: event.target.value }))} disabled={saving === 'company'} /></label>
              <button className="button" disabled={saving === 'company'}>{saving === 'company' ? 'Saving...' : 'Save company settings'}</button>
            </form>
          </article>}

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
        </section>}

        <section className={sectionClass('employeeSection', 'employees')} id="employees">
          {canManageBusiness && <article className="panel employeeFormPanel">
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
          </article>}

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
                      <td>{canManageBusiness && <button className="ghostButton" onClick={() => startEditEmployee(employee)}>Edit</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {employees.length === 0 && <div className="emptyState"><h3>No employees yet</h3><p className="muted">Add your first employee to unlock HR metrics.</p></div>}
            </div>
          </article>
        </section>

        <section className={sectionClass('panel', 'sales')} id="sales">
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
                      {canManageBusiness && <select value={deal.stage} onChange={(event) => updateDealStage(deal.id, event.target.value as DealStage)} disabled={saving === deal.id}>
                        {pipelineStages.map((nextStage) => <option key={nextStage} value={nextStage}>{dealStageLabel(nextStage)}</option>)}
                      </select>}
                    </article>
                  ))}
                </div>
              );
            })}
          </div>
        </section>

        {canManageBusiness && <section className={sectionClass('recordsGrid', 'projects')} id="projects">
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
        </section>}

        <section className={sectionClass('panel', 'projects-board')} id="projects-board">
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
                  {canManageBusiness ? <select value={project.status} onChange={(event) => updateProjectStatus(project.id, event.target.value as ProjectStatus)} disabled={saving === project.id}>{projectStatuses.map((status) => <option key={status} value={status}>{labelFromEnum(status)}</option>)}</select> : <span className={`statusPill ${project.status.toLowerCase()}`}>{labelFromEnum(project.status)}</span>}
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

        <section className={sectionClass('recordsGrid', 'customers')} id="customers">
          <span className="dashboardAnchor" id="products" />
          <article className="panel"><div className="panelHeading"><div><p className="eyebrow">CRM records</p><h2>Customers</h2></div><span className="badge">{customers.length} total</span></div><div className="tableWrap"><table className="dataTable"><thead><tr><th>Name</th><th>Company</th><th>Contact</th><th>Status</th></tr></thead><tbody>{customers.map((customer) => <tr key={customer.id}><td><b>{customer.name}</b></td><td>{customer.companyName || '-'}</td><td>{customer.email || customer.phone || '-'}</td><td>{canManageBusiness ? <select value={customer.status} onChange={(event) => updateCustomerStatus(customer.id, event.target.value as CustomerStatus)} disabled={saving === customer.id}><option value="LEAD">Lead</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select> : <span className={`statusPill ${customer.status.toLowerCase()}`}>{customer.status.toLowerCase()}</span>}</td></tr>)}</tbody></table></div></article>
          <article className="panel"><div className="panelHeading"><div><p className="eyebrow">Catalog records</p><h2>Products/services</h2></div><span className="badge">{products.length} total</span></div><div className="tableWrap"><table className="dataTable"><thead><tr><th>Name</th><th>Type</th><th>Price</th><th>Status</th></tr></thead><tbody>{products.map((product) => <tr key={product.id}><td><b>{product.name}</b><small>{product.description || ''}</small></td><td>{product.type.toLowerCase()}</td><td>{currency(product.unitPrice)}</td><td>{canManageBusiness ? <button className="ghostButton" onClick={() => updateProductActive(product.id, !product.active)} disabled={saving === product.id}>{product.active ? 'Deactivate' : 'Activate'}</button> : <span className={`statusPill ${product.active ? 'active' : 'inactive'}`}>{product.active ? 'active' : 'inactive'}</span>}</td></tr>)}</tbody></table></div></article>
        </section>

        {canManageBusiness && <section className={sectionClass('recordsGrid', 'inventory')} id="inventory">
          <article className="panel">
            <div className="panelHeading"><div><p className="eyebrow">Suppliers</p><h2>Add supplier</h2></div><span className="badge">{suppliers.length} vendors</span></div>
            <form className="companyForm" onSubmit={saveSupplier}>
              <label>Name<input required minLength={2} value={supplierForm.name} onChange={(event) => setSupplierForm((current) => ({ ...current, name: event.target.value }))} /></label>
              <label>Contact person<input value={supplierForm.contactName} onChange={(event) => setSupplierForm((current) => ({ ...current, contactName: event.target.value }))} /></label>
              <label>Email<input type="email" value={supplierForm.email} onChange={(event) => setSupplierForm((current) => ({ ...current, email: event.target.value }))} /></label>
              <label>Phone<input value={supplierForm.phone} onChange={(event) => setSupplierForm((current) => ({ ...current, phone: event.target.value }))} /></label>
              <label className="wideField">Address<input value={supplierForm.address} onChange={(event) => setSupplierForm((current) => ({ ...current, address: event.target.value }))} /></label>
              <label className="wideField">Notes<textarea value={supplierForm.notes} onChange={(event) => setSupplierForm((current) => ({ ...current, notes: event.target.value }))} /></label>
              <button className="button" disabled={saving === 'supplier'}>{saving === 'supplier' ? 'Saving...' : 'Add supplier'}</button>
            </form>
          </article>
          <article className="panel">
            <div className="panelHeading"><div><p className="eyebrow">Inventory</p><h2>Add stock item</h2></div><span className="badge">{lowStockItems.length} low stock</span></div>
            <form className="companyForm" onSubmit={saveInventoryItem}>
              <label>SKU<input required minLength={2} value={inventoryForm.sku} onChange={(event) => setInventoryForm((current) => ({ ...current, sku: event.target.value }))} /></label>
              <label>Name<input required minLength={2} value={inventoryForm.name} onChange={(event) => setInventoryForm((current) => ({ ...current, name: event.target.value }))} /></label>
              <label>Supplier<select value={inventoryForm.supplierId} onChange={(event) => setInventoryForm((current) => ({ ...current, supplierId: event.target.value }))}><option value="">No supplier</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label>
              <label>Quantity<input required type="number" min="0" step="0.01" value={inventoryForm.quantity} onChange={(event) => setInventoryForm((current) => ({ ...current, quantity: event.target.value }))} /></label>
              <label>Reorder level<input required type="number" min="0" step="0.01" value={inventoryForm.reorderLevel} onChange={(event) => setInventoryForm((current) => ({ ...current, reorderLevel: event.target.value }))} /></label>
              <label>Unit cost<input required type="number" min="0" step="0.01" value={inventoryForm.unitCost} onChange={(event) => setInventoryForm((current) => ({ ...current, unitCost: event.target.value }))} /></label>
              <label className="wideField">Description<textarea value={inventoryForm.description} onChange={(event) => setInventoryForm((current) => ({ ...current, description: event.target.value }))} /></label>
              <button className="button" disabled={saving === 'inventory'}>{saving === 'inventory' ? 'Saving...' : 'Add inventory item'}</button>
            </form>
          </article>
        </section>}

        <section className={sectionClass('recordsGrid', 'purchasing')} id="purchasing">
          <article className="panel widePanel">
            <div className="panelHeading"><div><p className="eyebrow">Stock control</p><h2>Inventory records</h2></div><span className="badge">{inventoryItems.length} items</span></div>
            <div className="tableWrap"><table className="dataTable"><thead><tr><th>Item</th><th>Supplier</th><th>Qty</th><th>Reorder</th><th>Unit cost</th><th>Status</th></tr></thead><tbody>{inventoryItems.map((item) => <tr key={item.id}><td><b>{item.name}</b><small>{item.sku}{item.description ? ` Â· ${item.description}` : ''}</small></td><td>{item.supplier?.name || '-'}</td><td>{item.quantity}</td><td>{item.reorderLevel}</td><td>{currency(item.unitCost)}</td><td><span className={`statusPill ${item.quantity <= item.reorderLevel ? 'overdue' : 'active'}`}>{item.quantity <= item.reorderLevel ? 'reorder' : 'in stock'}</span></td></tr>)}</tbody></table></div>
          </article>
          {canManageBusiness && <article className="panel">
            <div className="panelHeading"><div><p className="eyebrow">Purchasing</p><h2>Create purchase order</h2></div><span className="badge">{openPurchaseOrders.length} open</span></div>
            <form className="companyForm" onSubmit={createPurchaseOrder}>
              <label>Supplier<select required value={purchaseOrderForm.supplierId} onChange={(event) => setPurchaseOrderForm((current) => ({ ...current, supplierId: event.target.value }))}><option value="">Choose supplier</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label>
              <label>Inventory item<select value={purchaseOrderForm.inventoryItemId} onChange={(event) => choosePurchaseInventory(event.target.value)}><option value="">Custom item</option>{inventoryItems.map((item) => <option key={item.id} value={item.id}>{item.name} - {item.sku}</option>)}</select></label>
              <label>Description<input required minLength={2} value={purchaseOrderForm.description} onChange={(event) => setPurchaseOrderForm((current) => ({ ...current, description: event.target.value }))} /></label>
              <label>Quantity<input required type="number" min="0.01" step="0.01" value={purchaseOrderForm.quantity} onChange={(event) => setPurchaseOrderForm((current) => ({ ...current, quantity: event.target.value }))} /></label>
              <label>Unit cost<input required type="number" min="0" step="0.01" value={purchaseOrderForm.unitCost} onChange={(event) => setPurchaseOrderForm((current) => ({ ...current, unitCost: event.target.value }))} /></label>
              <label>Tax<input type="number" min="0" step="0.01" value={purchaseOrderForm.tax} onChange={(event) => setPurchaseOrderForm((current) => ({ ...current, tax: event.target.value }))} /></label>
              <label>Expected date<input type="date" value={purchaseOrderForm.expectedAt} onChange={(event) => setPurchaseOrderForm((current) => ({ ...current, expectedAt: event.target.value }))} /></label>
              <label className="wideField">Notes<textarea value={purchaseOrderForm.notes} onChange={(event) => setPurchaseOrderForm((current) => ({ ...current, notes: event.target.value }))} /></label>
              <button className="button" disabled={saving === 'purchase-order' || suppliers.length === 0}>{saving === 'purchase-order' ? 'Creating...' : 'Create purchase order'}</button>
            </form>
          </article>}
        </section>

        <section className={sectionClass('panel', 'purchase-orders')} id="purchase-orders">
          <div className="panelHeading"><div><p className="eyebrow">Purchase orders</p><h2>Supplier order tracker</h2></div><span className="badge">{purchaseOrders.length} orders</span></div>
          <div className="tableWrap"><table className="dataTable"><thead><tr><th>Order</th><th>Supplier</th><th>Total</th><th>Expected</th><th>Status</th><th>Action</th></tr></thead><tbody>{purchaseOrders.map((order) => <tr key={order.id}><td><b>{order.orderNo}</b></td><td>{order.supplier.name}</td><td>{currency(order.total)}</td><td>{order.expectedAt ? new Date(order.expectedAt).toLocaleDateString() : '-'}</td><td><span className={`statusPill ${order.status.toLowerCase()}`}>{labelFromEnum(order.status)}</span></td><td>{canManageBusiness ? <select value={order.status} onChange={(event) => updatePurchaseOrderStatus(order.id, event.target.value as PurchaseOrderStatus)} disabled={saving === order.id}>{purchaseOrderStatuses.map((status) => <option key={status} value={status}>{labelFromEnum(status)}</option>)}</select> : '-'}</td></tr>)}</tbody></table></div>
          {purchaseOrders.length === 0 && <div className="emptyState"><h3>No purchase orders yet</h3><p className="muted">Create purchase orders to track stock you are buying from suppliers.</p></div>}
        </section>

        <section className={sectionClass('recordsGrid', 'quotes')} id="quotes">
          {canManageBusiness && <article className="panel">
            <div className="panelHeading"><div><p className="eyebrow">Quotes</p><h2>Create estimate</h2></div><span className="badge">{openQuotes.length} open</span></div>
            <form className="companyForm" onSubmit={createQuote}>
              <label>Customer<select required value={quoteForm.customerId} onChange={(event) => setQuoteForm((current) => ({ ...current, customerId: event.target.value }))}><option value="">Choose customer</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
              <label>Valid until<input type="date" value={quoteForm.validUntil} onChange={(event) => setQuoteForm((current) => ({ ...current, validUntil: event.target.value }))} /></label>
              <label>Product/service<select value={quoteForm.productId} onChange={(event) => chooseQuoteProduct(event.target.value)}><option value="">Custom line item</option>{activeProducts.map((product) => <option key={product.id} value={product.id}>{product.name} - {currency(product.unitPrice)}</option>)}</select></label>
              <label>Description<input required minLength={2} value={quoteForm.description} onChange={(event) => setQuoteForm((current) => ({ ...current, description: event.target.value }))} /></label>
              <label>Quantity<input required type="number" min="0.01" step="0.01" value={quoteForm.quantity} onChange={(event) => setQuoteForm((current) => ({ ...current, quantity: event.target.value }))} /></label>
              <label>Unit price<input required type="number" min="0" step="0.01" value={quoteForm.unitPrice} onChange={(event) => setQuoteForm((current) => ({ ...current, unitPrice: event.target.value }))} /></label>
              <label>Tax<input type="number" min="0" step="0.01" value={quoteForm.tax} onChange={(event) => setQuoteForm((current) => ({ ...current, tax: event.target.value }))} /></label>
              <label className="wideField">Notes<textarea value={quoteForm.notes} onChange={(event) => setQuoteForm((current) => ({ ...current, notes: event.target.value }))} /></label>
              <button className="button" disabled={saving === 'quote' || customers.length === 0}>{saving === 'quote' ? 'Creating...' : 'Create quote'}</button>
            </form>
          </article>}
          <article className="panel widePanel">
            <div className="panelHeading"><div><p className="eyebrow">Estimates</p><h2>Quote pipeline</h2></div><span className="badge">{quotes.length} total</span></div>
            <div className="tableWrap"><table className="dataTable"><thead><tr><th>Quote</th><th>Customer</th><th>Total</th><th>Status</th><th>Valid until</th><th>Action</th></tr></thead><tbody>{quotes.map((quote) => <tr key={quote.id}><td><b>{quote.quoteNo}</b></td><td>{quote.customer.name}</td><td>{currency(quote.total)}</td><td><span className={`statusPill ${quote.status.toLowerCase()}`}>{labelFromEnum(quote.status)}</span></td><td>{quote.validUntil ? new Date(quote.validUntil).toLocaleDateString() : '-'}</td><td className="rowActions">{canManageBusiness ? <><button className="ghostButton" onClick={() => queueQuoteEmail(quote)} disabled={saving === `quote-email-${quote.id}`}>{saving === `quote-email-${quote.id}` ? 'Email...' : 'Email'}</button><select value={quote.status} onChange={(event) => updateQuoteStatus(quote.id, event.target.value as QuoteStatus)} disabled={saving === quote.id}>{quoteStatuses.map((status) => <option key={status} value={status}>{labelFromEnum(status)}</option>)}</select></> : '-'}</td></tr>)}</tbody></table></div>
            {quotes.length === 0 && <div className="emptyState"><h3>No quotes yet</h3><p className="muted">Create estimates before sending invoices for approved work.</p></div>}
          </article>
        </section>

        <section className={sectionClass('recordsGrid', 'invoices')} id="invoices">
          <span className="dashboardAnchor" id="payments" />
          <article className="panel widePanel">
            <div className="panelHeading"><div><p className="eyebrow">Invoices</p><h2>Billing pipeline</h2></div><span className="badge">{currency(summary?.metrics.outstanding)} open</span></div>
            <div className="tableWrap"><table className="dataTable"><thead><tr><th>Invoice</th><th>Customer</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th><th>Actions</th></tr></thead><tbody>{invoices.map((invoice) => <tr key={invoice.id}><td><b>{invoice.invoiceNo}</b><small>{invoice.dueDate ? `Due ${new Date(invoice.dueDate).toLocaleDateString()}` : 'No due date'}</small></td><td>{invoice.customer.name}</td><td>{currency(invoice.total)}</td><td>{currency(invoice.paid)}</td><td>{currency(invoice.balance)}</td><td><span className={`statusPill ${invoice.status.toLowerCase()}`}>{invoice.status.toLowerCase()}</span></td><td className="rowActions"><button className="ghostButton" onClick={() => downloadInvoicePdf(invoice)} disabled={saving === `pdf-${invoice.id}`}>{saving === `pdf-${invoice.id}` ? 'PDF...' : 'PDF'}</button>{canManageBusiness && <><button className="ghostButton" onClick={() => queueInvoiceEmail(invoice)} disabled={saving === `invoice-email-${invoice.id}`}>{saving === `invoice-email-${invoice.id}` ? 'Email...' : 'Email'}</button>{invoice.status === 'DRAFT' && <button className="ghostButton" onClick={() => updateInvoiceStatus(invoice.id, 'SENT')}>Send</button>}{invoice.status !== 'VOID' && invoice.status !== 'PAID' && <button className="ghostButton" onClick={() => updateInvoiceStatus(invoice.id, 'VOID')}>Void</button>}</>}</td></tr>)}</tbody></table></div>
          </article>
          {canManageBusiness && <article className="panel">
            <div className="panelHeading"><div><p className="eyebrow">Payments</p><h2>Record payment</h2></div><span className="badge">{openInvoices.length} open</span></div>
            <form className="companyForm" onSubmit={recordPayment}>
              <label>Invoice<select required value={paymentForm.invoiceId} onChange={(event) => setPaymentForm((current) => ({ ...current, invoiceId: event.target.value }))}><option value="">Choose invoice</option>{openInvoices.map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.invoiceNo} - {currency(invoice.balance)}</option>)}</select></label>
              <label>Amount<input required type="number" min="0.01" step="0.01" value={paymentForm.amount} onChange={(event) => setPaymentForm((current) => ({ ...current, amount: event.target.value }))} /></label>
              <label>Method<input value={paymentForm.method} onChange={(event) => setPaymentForm((current) => ({ ...current, method: event.target.value }))} /></label>
              <label>Reference<input value={paymentForm.reference} onChange={(event) => setPaymentForm((current) => ({ ...current, reference: event.target.value }))} /></label>
              <button className="button" disabled={saving === 'payment' || openInvoices.length === 0}>{saving === 'payment' ? 'Recording...' : 'Record payment'}</button>
            </form>
          </article>}
        </section>

        <section className={sectionClass('recordsGrid', 'expenses')} id="expenses">
          {canManageBusiness && <article className="panel">
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
          </article>}

          <article className="panel">
            <div className="panelHeading"><div><p className="eyebrow">Expense records</p><h2>Spending log</h2></div><span className="badge">{expenses.length} records</span></div>
            <div className="tableWrap"><table className="dataTable"><thead><tr><th>Vendor</th><th>Category</th><th>Amount</th><th>Date</th></tr></thead><tbody>{expenses.map((expense) => <tr key={expense.id}><td><b>{expense.vendor}</b><small>{expense.description || expense.receiptUrl || ''}</small></td><td>{canManageBusiness ? <select value={expense.category} onChange={(event) => updateExpenseCategory(expense.id, event.target.value as ExpenseCategory)} disabled={saving === expense.id}>{expenseCategories.map((category) => <option key={category} value={category}>{categoryLabel(category)}</option>)}</select> : <span className={`statusPill ${expense.category.toLowerCase()}`}>{categoryLabel(expense.category)}</span>}</td><td>{currency(expense.amount)}</td><td>{new Date(expense.spentAt).toLocaleDateString()}</td></tr>)}</tbody></table></div>
            {expenses.length === 0 && <div className="emptyState"><h3>No expenses yet</h3><p className="muted">Record expenses to unlock your net profit view.</p></div>}
          </article>
        </section>

        <section className={sectionClass('panel', 'reports')} id="reports">
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
          {canManageBusiness && <div className="exportActions">
            {['profit-loss', 'customers', 'invoices', 'expenses'].map((type) => (
              <button className="ghostButton" key={type} onClick={() => downloadReport(type)} disabled={saving === `report-${type}`}>
                {saving === `report-${type}` ? 'Downloading...' : `Download ${type.replace('-', ' ')} CSV`}
              </button>
            ))}
          </div>}
        </section>
      </section>
    </main>
  );
}
