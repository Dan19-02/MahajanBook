/**
 * Client for the MahajanBook backend. Holds the JWT, attaches it to every request,
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
  Store,
  Account,
  Plan,
  StaffMember,
  PaymentStatus,
} from '../types';

const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3001').replace(/\/+$/, '');
const TOKEN_KEY = 'mb_token';
const STORE_KEY = 'mb_store';

// ---- Token storage ----
export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string): void => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = (): void => localStorage.removeItem(TOKEN_KEY);

// ---- Active store (sent as X-Store-Id so the backend scopes data per store) ----
export const getActiveStoreId = (): string | null => localStorage.getItem(STORE_KEY);
export const setActiveStoreId = (id: string): void => localStorage.setItem(STORE_KEY, id);
export const clearActiveStoreId = (): void => localStorage.removeItem(STORE_KEY);

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
    const storeId = getActiveStoreId();
    if (storeId) headers['X-Store-Id'] = storeId;
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error(`Could not reach the MahajanBook backend at ${API_URL}. Is it running?`);
  }

  if (res.status === 401 && auth) {
    clearToken();
    clearActiveStoreId();
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

// ---- Auth / session ----
export interface Session {
  user: User;
  account: Account;
  stores: Store[];
  activeStoreId: string | null;
}
export interface AuthResult extends Session {
  token: string;
}

export interface RegisterOptions {
  businessName?: string;
  inviteCode?: string;
}

/** Persists the token + a sensible active store from an auth/session payload. */
function adoptSession(s: { activeStoreId?: string | null; stores?: Store[] }): void {
  const id = s.activeStoreId ?? s.stores?.[0]?.id ?? null;
  if (id) setActiveStoreId(id);
}

export async function register(name: string, email: string, password: string, options: RegisterOptions): Promise<AuthResult> {
  const result = await request<AuthResult>('/api/auth/register', {
    method: 'POST',
    auth: false,
    body: { name, email, password, ...options },
  });
  setToken(result.token);
  adoptSession(result);
  return result;
}

export async function login(email: string, password: string): Promise<AuthResult> {
  const result = await request<AuthResult>('/api/auth/login', { method: 'POST', auth: false, body: { email, password } });
  setToken(result.token);
  adoptSession(result);
  return result;
}

export async function me(): Promise<Session> {
  const s = await request<Session>('/api/auth/me');
  adoptSession(s);
  return s;
}

// ---- Google sign-in (via Butterbase) ----
const BB_APP_ID = import.meta.env.VITE_BUTTERBASE_APP_ID;
const BB_API_BASE = (import.meta.env.VITE_BUTTERBASE_API_BASE ?? 'https://api.butterbase.ai').replace(/\/+$/, '');

/** True when Google sign-in is configured (a butterbase app id is present). */
export const isGoogleAuthEnabled = (): boolean => Boolean(BB_APP_ID);

/** URL that starts the butterbase-hosted Google OAuth flow, returning to the app root. */
export function googleOAuthStartUrl(): string {
  const redirectTo = `${window.location.origin}/`;
  return `${BB_API_BASE}/auth/${BB_APP_ID}/oauth/google?redirect_to=${encodeURIComponent(redirectTo)}`;
}

/** A new Google user has no business yet — the UI must ask them to create or join one. */
export interface NeedsBusiness {
  needsBusiness: true;
  profile: { email: string; name: string };
}
export type GoogleAuthResult = AuthResult | NeedsBusiness;
export const isNeedsBusiness = (r: GoogleAuthResult): r is NeedsBusiness =>
  (r as NeedsBusiness).needsBusiness === true;

/**
 * Exchanges a butterbase session token for a MahajanBook session. For a brand-new
 * Google user, pass `businessName` (create, become OWNER) or `inviteCode` (join as
 * STAFF); omit both to discover whether the user is new (returns `needsBusiness`).
 */
export async function googleAuthExchange(butterbaseToken: string, options: RegisterOptions = {}): Promise<GoogleAuthResult> {
  const result = await request<GoogleAuthResult>('/api/auth/google', {
    method: 'POST',
    auth: false,
    body: { butterbaseToken, ...options },
  });
  if (!isNeedsBusiness(result)) {
    setToken(result.token);
    adoptSession(result);
  }
  return result;
}

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

// ---- Stores (per-store shop profile) ----
export type StoreProfileFields = Partial<Pick<Business, 'name' | 'address' | 'gstIn' | 'phone' | 'logo' | 'upiVpa' | 'gstRate'>>;

export const updateStore = (storeId: string, fields: StoreProfileFields): Promise<{ business: Store; stores: Store[] }> =>
  request<{ business: Store; stores: Store[] }>(`/api/stores/${storeId}`, { method: 'PATCH', body: fields });

export const listStores = (): Promise<{ stores: Store[] }> => request<{ stores: Store[] }>('/api/stores');

export const createStore = (name: string): Promise<{ store: Store; stores: Store[] }> =>
  request<{ store: Store; stores: Store[] }>('/api/stores', { method: 'POST', body: { name } });

export const lockStore = (id: string): Promise<{ stores: Store[] }> =>
  request<{ stores: Store[] }>(`/api/stores/${id}/lock`, { method: 'POST' });

export const unlockStore = (id: string): Promise<{ stores: Store[] }> =>
  request<{ stores: Store[] }>(`/api/stores/${id}/unlock`, { method: 'POST' });

// ---- Account & plan ----
export const getAccount = (): Promise<{ account: Account }> => request<{ account: Account }>('/api/account');

export const setPlanDirect = (plan: Plan): Promise<{ account: Account }> =>
  request<{ account: Account }>('/api/account/plan', { method: 'POST', body: { plan } });

// ---- Staff ----
export const listStaff = (): Promise<{ staff: StaffMember[] }> => request<{ staff: StaffMember[] }>('/api/staff');

export const setStaffStores = (userId: string, storeIds: string[]): Promise<{ staff: StaffMember[] }> =>
  request<{ staff: StaffMember[] }>(`/api/staff/${userId}/stores`, { method: 'PUT', body: { storeIds } });

// ---- Billing (Razorpay subscriptions) ----
export interface SubscribeResult {
  keyId: string;
  subscriptionId: string;
  plan: Plan;
}

export const subscribe = (plan: Plan): Promise<SubscribeResult> =>
  request<SubscribeResult>('/api/billing/subscribe', { method: 'POST', body: { plan } });

export interface VerifyPaymentPayload {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
}

export const verifySubscription = (payload: VerifyPaymentPayload): Promise<{ account: Account }> =>
  request<{ account: Account }>('/api/billing/verify', { method: 'POST', body: payload });

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
  billingConfigured?: boolean;
  model: string;
}

export const getHealth = (): Promise<BackendHealth> => request<BackendHealth>('/api/health', { auth: false });
