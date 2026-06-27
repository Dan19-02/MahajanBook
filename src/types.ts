/**
 * MahajanBook Types & Schema Definitions
 */

export enum UserRole {
  OWNER = 'OWNER',
  STAFF = 'STAFF'
}

export type Plan = 'STARTER' | 'GROWTH' | 'UNLIMITED';

/** Plan limits; `null` means unlimited. Mirrors the backend's serialized limits. */
export interface PlanLimits {
  label: string;
  priceMonthly: number;
  stores: number | null;
  staff: number | null;
  reminderCap: number | null;
}

/** The billing entity (owner's organisation) that holds the subscription plan. */
export interface Account {
  id: string;
  name: string;
  joinCode: string;
  plan: Plan;
  razorpaySubscriptionId?: string;
  subscriptionStatus?: string;
  currentPeriodEnd?: string;
  limits: PlanLimits;
  usage: { stores: number; staff: number; remindersThisMonth: number };
  createdAt: string;
}

/** A store. (The backend table is `businesses` for historical reasons.) */
export interface Business {
  id: string;
  accountId: string;
  name: string;
  joinCode: string;
  address?: string;
  gstIn?: string;
  phone?: string;
  logo?: string;
  upiVpa?: string;
  gstRate?: number; // default GST % applied on bills (defaults to 18)
  locked?: boolean; // true when locked out by a plan downgrade (read-only)
  createdAt: string;
}

/** Alias to read clearly in multi-store code. */
export type Store = Business;

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  accountId: string;
  businessId: string;
}

/** A user in the account with the stores they can access (for staff management). */
export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: 'OWNER' | 'STAFF';
  storeIds: string[];
}

export interface Product {
  id: string;
  sku: string;
  barcode?: string;
  name: string;
  category: string;
  unitType: 'Piece' | 'Kg' | 'Liter' | 'Box' | 'Dozen' | 'Meter';
  costPrice: number;
  retailPrice: number;
  wholesalePrice: number;
  currentStock: number;
  lowStockThreshold: number;
  createdAt: string;
}

export type CustomerType = 'RETAILER' | 'WHOLESALER';

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  businessName?: string;
  gstIn?: string;
  customerType: CustomerType;
  balance: number; // outstanding dues (positive = customer owes us)
  createdAt: string;
}

export enum PaymentStatus {
  PAID = 'PAID',
  CREDIT = 'CREDIT'
}

export interface InvoiceItem {
  id: string;
  productId: string;
  name: string;
  sku: string;
  quantity: number;
  price: number; // dynamically resolved Retail or Wholesale
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string; // e.g. INV-2026-0001
  customerId: string;
  customerName: string;
  customerMobile: string;
  subtotal: number;
  discount: number;
  tax: number; // GST amount in ₹
  taxRate?: number; // GST % used for this invoice (defaults to 18)
  grandTotal: number;
  paymentStatus: PaymentStatus;
  ptpDate?: string; // Promise To Pay Date (ISO string or YYYY-MM-DD)
  createdAt: string;
  items: InvoiceItem[];
}

export interface Transaction {
  id: string;
  customerId: string;
  customerName: string;
  invoiceId?: string;
  invoiceNumber?: string;
  amount: number;
  type: 'DEBIT' | 'CREDIT'; // DEBIT = credit purchase (increases balance), CREDIT = cash payment (decreases balance)
  description: string;
  createdAt: string;
}

export interface WhatsAppReminder {
  id: string;
  invoiceId: string;
  customerId: string;
  customerName: string;
  customerMobile: string;
  invoiceAmount: number;
  ptpDate: string;
  triggerType:
    | 'PTP_MINUS_1'
    | 'PTP_PLUS_1'
    | 'PTP_PLUS_3'
    | 'PTP_PLUS_5'
    | 'PTP_PLUS_7'
    | 'PTP_PLUS_9'
    | 'PTP_PLUS_11';
  scheduledFor: string; // date string
  status: 'QUEUED' | 'SENT' | 'CANCELLED' | 'FAILED';
  razorpayPaymentLink: string;
  sentAt?: string;
}
