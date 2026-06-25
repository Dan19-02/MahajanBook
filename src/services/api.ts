/**
 * Client for the Ledgix Backend. Holds the JWT, attaches it to every request,
 * and exposes auth + data + AI calls. All business data lives in the backend's
 * shared database; the browser only talks to the API.
 */
import type {
  Product,
  Customer,
  Invoice,
  Transaction,
  WhatsAppReminder,
  User,
  Business,
  PaymentStatus,
} from '../types';

const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3001').replace(/\/+$/, '');
const TOKEN_KEY = 'cf_token';

// ---- Token storage ----
export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string): void => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = (): void => localStorage.removeItem(TOKEN_KEY);

let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: () => void): void => {
  onUnauthorized = fn;
};

// ---- Core request helper ----
async function request<T>(path: string, options: { method?: string; body?: unknown; auth?: boolean } = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = options;
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error(`Could not reach the Ledgix Backend at ${API_URL}. Is it running?`);
  }

  if (res.status === 401 && auth) {
    clearToken();
    onUnauthorized?.();
    throw new Error('Your session has expired. Please log in again.');
  }

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error((data.error as string) ?? `Request failed (${res.status}).`);
  }
  return data as T;
}

// ---- Snapshot ----
export interface Snapshot {
  products: Product[];
  customers: Customer[];
  invoices: Invoice[];
  transactions: Transaction[];
  reminders: WhatsAppReminder[];
}

// ---- Auth ----
export interface AuthResult {
  token: string;
  user: User;
  business: Business;
}

export interface RegisterOptions {
  businessName?: string;
  inviteCode?: string;
}

export async function register(name: string, email: string, password: string, options: RegisterOptions): Promise<AuthResult> {
  const result = await request<AuthResult>('/api/auth/register', {
    method: 'POST',
    auth: false,
    body: { name, email, password, ...options },
  });
  setToken(result.token);
  return result;
}

export async function login(email: string, password: string): Promise<AuthResult> {
  const result = await request<AuthResult>('/api/auth/login', { method: 'POST', auth: false, body: { email, password } });
  setToken(result.token);
  return result;
}

export const me = (): Promise<{ user: User; business: Business }> =>
  request<{ user: User; business: Business }>('/api/auth/me');

// ---- Data ----
export const bootstrap = (): Promise<Snapshot> => request<Snapshot>('/api/bootstrap');

export const createProduct = (product: Omit<Product, 'id' | 'createdAt'>): Promise<Snapshot> =>
  request<Snapshot>('/api/products', { method: 'POST', body: product });

export const updateStock = (productId: string, currentStock: number): Promise<Snapshot> =>
  request<Snapshot>(`/api/products/${productId}/stock`, { method: 'PATCH', body: { currentStock } });

export const createCustomer = (customer: Omit<Customer, 'id' | 'createdAt' | 'balance'>): Promise<{ customer: Customer; snapshot: Snapshot }> =>
  request<{ customer: Customer; snapshot: Snapshot }>('/api/customers', { method: 'POST', body: customer });

export interface CreateInvoicePayload {
  customerId: string;
  paymentStatus: PaymentStatus;
  ptpDate?: string;
  discount: number;
  taxRate?: number;
  items: { productId: string; quantity: number }[];
}

export const createInvoice = (payload: CreateInvoicePayload): Promise<{ invoice: Invoice; snapshot: Snapshot }> =>
  request<{ invoice: Invoice; snapshot: Snapshot }>('/api/invoices', { method: 'POST', body: payload });

export const collectPayment = (customerId: string, amount: number, note: string): Promise<Snapshot> =>
  request<Snapshot>('/api/payments', { method: 'POST', body: { customerId, amount, note } });

export const reconcileInvoice = (invoiceId: string): Promise<Snapshot> =>
  request<Snapshot>(`/api/invoices/${invoiceId}/reconcile`, { method: 'POST' });

export const sendReminder = (reminderId: string): Promise<{ log: string; snapshot: Snapshot }> =>
  request<{ log: string; snapshot: Snapshot }>(`/api/reminders/${reminderId}/send`, { method: 'POST' });

export const clearData = (): Promise<Snapshot> => request<Snapshot>('/api/data', { method: 'DELETE' });

// ---- Edit / delete ----
export const updateProduct = (id: string, fields: Partial<Omit<Product, 'id' | 'createdAt'>>): Promise<Snapshot> =>
  request<Snapshot>(`/api/products/${id}`, { method: 'PATCH', body: fields });

export const deleteProduct = (id: string): Promise<Snapshot> =>
  request<Snapshot>(`/api/products/${id}`, { method: 'DELETE' });

export const createProductsBulk = (products: Omit<Product, 'id' | 'createdAt'>[]): Promise<Snapshot> =>
  request<Snapshot>('/api/products/bulk', { method: 'POST', body: { products } });

export const updateCustomer = (id: string, fields: Partial<Omit<Customer, 'id' | 'createdAt' | 'balance'>>): Promise<Snapshot> =>
  request<Snapshot>(`/api/customers/${id}`, { method: 'PATCH', body: fields });

export const deleteCustomer = (id: string): Promise<Snapshot> =>
  request<Snapshot>(`/api/customers/${id}`, { method: 'DELETE' });

export const deleteInvoice = (id: string): Promise<Snapshot> =>
  request<Snapshot>(`/api/invoices/${id}`, { method: 'DELETE' });

// ---- Shop profile ----
export const updateBusiness = (
  fields: Partial<Pick<Business, 'name' | 'address' | 'gstIn' | 'phone' | 'logo' | 'upiVpa' | 'gstRate'>>,
): Promise<{ business: Business }> =>
  request<{ business: Business }>('/api/business', { method: 'PATCH', body: fields });

// ---- AI (MiniMax-M3) ----
export type ReminderTone = 'gentle' | 'due_today' | 'overdue' | 'serious' | 'final';

export interface DraftReminderRequest {
  customerName: string;
  invoiceNumber: string;
  amount: string;
  dueDate: string;
  payLink: string;
  tone: ReminderTone;
  businessName?: string;
  language?: string;
}

export async function draftReminder(payload: DraftReminderRequest): Promise<string> {
  const data = await request<{ message?: string }>('/api/ai/draft', { method: 'POST', body: payload });
  if (!data.message) throw new Error('The backend returned an empty message.');
  return data.message;
}

// ---- Health ----
export interface BackendHealth {
  status: string;
  aiConfigured: boolean;
  whatsappConfigured: boolean;
  model: string;
}

export const getHealth = (): Promise<BackendHealth> => request<BackendHealth>('/api/health', { auth: false });
