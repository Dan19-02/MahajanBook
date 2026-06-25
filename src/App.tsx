/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  DollarSign,
  ClipboardList,
  Settings,
  Menu,
  X,
  ArrowLeft,
  ShieldCheck,
  LogOut,
  Loader2
} from 'lucide-react';

import { Product, Customer, Invoice, Transaction, WhatsAppReminder, User, UserRole, Business } from './types';
import {
  me,
  bootstrap,
  createProduct,
  createProductsBulk,
  updateStock,
  updateProduct,
  deleteProduct,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  createInvoice,
  deleteInvoice,
  collectPayment,
  reconcileInvoice,
  sendReminder,
  clearData,
  updateBusiness,
  getToken,
  clearToken,
  setUnauthorizedHandler,
  type Snapshot,
  type CreateInvoicePayload
} from './services/api';

// Subcomponents
import LoginView from './components/LoginView';
import DashboardView from './components/DashboardView';
import BillingView from './components/BillingView';
import InventoryView from './components/InventoryView';
import CustomersView from './components/CustomersView';
import OutstandingView from './components/OutstandingView';
import TodaysBillsView from './components/TodaysBillsView';
import DayBookView from './components/DayBookView';
import SettingsView from './components/SettingsView';
import InvoiceReceipt from './components/InvoiceReceipt';

const errMsg = (e: unknown): string => (e instanceof Error ? e.message : 'Something went wrong.');

export default function App() {
  // Auth
  const [token, setTokenState] = useState<string | null>(() => getToken());
  const [user, setUser] = useState<User | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);

  // Shared application data (from the backend)
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [reminders, setReminders] = useState<WhatsAppReminder[]>([]);

  // UI
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [navHistory, setNavHistory] = useState<string[]>([]);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'alert' | 'info' } | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);

  const applySnapshot = (s: Snapshot) => {
    setProducts(s.products);
    setCustomers(s.customers);
    setInvoices(s.invoices);
    setTransactions(s.transactions);
    setReminders(s.reminders);
  };

  const clearLocalData = () => {
    setProducts([]);
    setCustomers([]);
    setInvoices([]);
    setTransactions([]);
    setReminders([]);
  };

  const showHeaderAlert = (message: string, type: 'success' | 'alert' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // Purge legacy localStorage demo data from older versions (now ignored).
  useEffect(() => {
    ['cf_products', 'cf_customers', 'cf_invoices', 'cf_transactions', 'cf_reminders', 'cf_role']
      .forEach((key) => localStorage.removeItem(key));
  }, []);

  // Log out if any request reports an expired/invalid token.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setTokenState(null);
      setUser(null);
      setBusiness(null);
      clearLocalData();
      setActiveTab('dashboard');
      setNavHistory([]);
    });
  }, []);

  // Load the session + data whenever the token changes.
  useEffect(() => {
    if (!token) {
      setAuthChecked(true);
      return;
    }
    let cancelled = false;
    (async () => {
      setDataLoading(true);
      try {
        const profile = await me();
        if (cancelled) return;
        setUser(profile.user);
        setBusiness(profile.business);
        const snap = await bootstrap();
        if (cancelled) return;
        applySnapshot(snap);
      } catch {
        if (!cancelled) {
          clearToken();
          setTokenState(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setAuthChecked(true);
          setDataLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // --- Auth handlers ---
  const handleAuthenticated = (newToken: string, newUser: User, newBusiness: Business) => {
    setUser(newUser);
    setBusiness(newBusiness);
    setTokenState(newToken); // triggers the load effect
  };

  const handleLogout = () => {
    clearToken();
    setTokenState(null);
    setUser(null);
    setBusiness(null);
    clearLocalData();
    setActiveTab('dashboard');
    setNavHistory([]);
    setMobileMenuOpen(false);
  };

  // --- Data handlers (backend is the source of truth) ---
  const handleAddNewInvoice = async (payload: CreateInvoicePayload): Promise<boolean> => {
    try {
      const { invoice, snapshot } = await createInvoice(payload);
      applySnapshot(snapshot);
      setViewingInvoice(invoice); // auto-open the printable bill
      showHeaderAlert('Invoice recorded! Stock and ledger updated.', 'success');
      return true;
    } catch (e) {
      showHeaderAlert(errMsg(e), 'alert');
      return false;
    }
  };

  const handleRegisterCustomer = async (newCust: Customer): Promise<Customer | null> => {
    try {
      const { customer, snapshot } = await createCustomer(newCust);
      applySnapshot(snapshot);
      showHeaderAlert(`Customer ${newCust.name} successfully registered.`, 'success');
      return customer;
    } catch (e) {
      showHeaderAlert(errMsg(e), 'alert');
      return null;
    }
  };

  const handleCommitProduct = async (newProd: Product) => {
    try {
      applySnapshot(await createProduct(newProd));
      showHeaderAlert(`New SKU ${newProd.sku} added to inventory.`, 'success');
    } catch (e) {
      showHeaderAlert(errMsg(e), 'alert');
    }
  };

  const handleQuickAddStock = async (productId: string, newStockLevel: number) => {
    try {
      applySnapshot(await updateStock(productId, newStockLevel));
      showHeaderAlert('Stock level updated.', 'info');
    } catch (e) {
      showHeaderAlert(errMsg(e), 'alert');
    }
  };

  const handlePostPaymentDeposit = async (customerId: string, payValue: number, note: string) => {
    try {
      applySnapshot(await collectPayment(customerId, payValue, note));
      showHeaderAlert(`Cash collection of ₹${payValue.toLocaleString('en-IN')} recorded.`, 'success');
    } catch (e) {
      showHeaderAlert(errMsg(e), 'alert');
    }
  };

  const handleRazorpayAutoReconcile = async (invoiceId: string) => {
    try {
      applySnapshot(await reconcileInvoice(invoiceId));
      showHeaderAlert('Invoice auto-reconciled via Razorpay. Reminders cancelled.', 'success');
    } catch (e) {
      showHeaderAlert(errMsg(e), 'alert');
    }
  };

  const handleWhatsAppManualFire = async (reminderId: string) => {
    try {
      const { snapshot } = await sendReminder(reminderId);
      applySnapshot(snapshot);
      showHeaderAlert('WhatsApp reminder sent via backend.', 'info');
    } catch (e) {
      showHeaderAlert(errMsg(e), 'alert');
    }
  };

  const handleClearData = async () => {
    try {
      applySnapshot(await clearData());
      showHeaderAlert('All business data has been cleared.', 'alert');
    } catch (e) {
      showHeaderAlert(errMsg(e), 'alert');
    }
  };

  const handleUpdateProduct = async (id: string, fields: Partial<Omit<Product, 'id' | 'createdAt'>>) => {
    try {
      applySnapshot(await updateProduct(id, fields));
      showHeaderAlert('Product updated.', 'success');
    } catch (e) {
      showHeaderAlert(errMsg(e), 'alert');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      applySnapshot(await deleteProduct(id));
      showHeaderAlert('Product deleted.', 'info');
    } catch (e) {
      showHeaderAlert(errMsg(e), 'alert');
    }
  };

  const handleImportProducts = async (items: Omit<Product, 'id' | 'createdAt'>[]) => {
    try {
      applySnapshot(await createProductsBulk(items));
      showHeaderAlert(`${items.length} product${items.length === 1 ? '' : 's'} imported.`, 'success');
    } catch (e) {
      showHeaderAlert(errMsg(e), 'alert');
    }
  };

  const handleUpdateCustomer = async (id: string, fields: Partial<Omit<Customer, 'id' | 'createdAt' | 'balance'>>) => {
    try {
      applySnapshot(await updateCustomer(id, fields));
      showHeaderAlert('Customer updated.', 'success');
    } catch (e) {
      showHeaderAlert(errMsg(e), 'alert');
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    try {
      applySnapshot(await deleteCustomer(id));
      showHeaderAlert('Customer deleted.', 'info');
    } catch (e) {
      showHeaderAlert(errMsg(e), 'alert');
    }
  };

  const handleDeleteInvoice = async (id: string) => {
    try {
      applySnapshot(await deleteInvoice(id));
      setViewingInvoice(null);
      showHeaderAlert('Invoice voided — stock restored and reminders cleared.', 'info');
    } catch (e) {
      showHeaderAlert(errMsg(e), 'alert');
    }
  };

  const handleUpdateBusiness = async (fields: Partial<Pick<Business, 'name' | 'address' | 'gstIn' | 'phone' | 'logo' | 'upiVpa' | 'gstRate'>>) => {
    try {
      const { business: updated } = await updateBusiness(fields);
      setBusiness(updated);
      showHeaderAlert('Shop profile updated.', 'success');
    } catch (e) {
      showHeaderAlert(errMsg(e), 'alert');
    }
  };

  // --- Navigation ---
  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'billing', label: 'Express Billing', icon: ShoppingCart },
    { id: 'inventory', label: 'Stock Directory', icon: Package },
    { id: 'customers', label: 'Ledger Accounts', icon: Users },
    { id: 'outstanding', label: 'Overdue & Recovery', icon: DollarSign },
    { id: 'daybook', label: 'Day Book', icon: ClipboardList },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const TAB_TITLES: Record<string, string> = {
    dashboard: 'Business Dashboard',
    billing: 'Express Billing',
    inventory: 'Stock Directory',
    customers: 'Ledger Accounts',
    outstanding: 'Overdue & Recovery',
    daybook: 'Day Book',
    settings: 'Settings',
    'todays-bills': "Today's Bills",
  };

  const navigateTo = (tabId: string) => {
    if (tabId !== activeTab) {
      setNavHistory((h) => [...h, activeTab]);
      setActiveTab(tabId);
    }
    setMobileMenuOpen(false);
  };

  const goBack = () => {
    if (navHistory.length === 0) return;
    const previous = navHistory[navHistory.length - 1];
    setNavHistory(navHistory.slice(0, -1));
    setActiveTab(previous);
  };

  // --- Render gates ---
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!token || !user || !business) {
    return <LoginView onAuthenticated={handleAuthenticated} />;
  }

  const initials = user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const isOwner = user.role === UserRole.OWNER;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-900 font-sans">

      {/* Mobile Top App Bar */}
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-3.5 flex justify-between items-center shadow-sm z-30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-extrabold text-sm">
            C
          </div>
          <span className="font-bold text-slate-800 tracking-tight">CreditFlow</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1 rounded bg-slate-100 border border-slate-200"
        >
          {mobileMenuOpen ? <X className="w-5.5 h-5.5" /> : <Menu className="w-5.5 h-5.5" />}
        </button>
      </div>

      {/* Left Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 bg-white border-r border-slate-200 w-64 z-40 transform transition-transform duration-300 md:relative md:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } flex flex-col justify-between`}
      >
        <div>
          {/* Brand */}
          <div className="p-6 border-b border-slate-100 flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
              C
            </div>
            <div className="min-w-0">
              <span className="font-extrabold text-slate-800 tracking-tight block text-xl">CreditFlow</span>
              <span className="text-[10px] text-indigo-600 font-bold tracking-wider uppercase block truncate">{business.name}</span>
            </div>
          </div>

          {/* Authenticated user */}
          <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center font-bold text-slate-700 shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{user.name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <ShieldCheck className={`w-3.5 h-3.5 ${isOwner ? 'text-indigo-600' : 'text-amber-600'}`} />
                  <span className={`text-[10px] uppercase font-bold tracking-wide ${isOwner ? 'text-indigo-700' : 'text-amber-700'}`}>
                    {user.role} Profile
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-900 transition-all cursor-pointer shrink-0"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => navigateTo(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md font-medium text-sm transition-colors cursor-pointer ${
                    isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-700' : 'text-slate-400'}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 text-center font-mono text-[9px] text-slate-400">
          <span className="font-bold">CreditFlow · Ledgix v1.0.0</span>
          <p className="mt-0.5">Automated recovery engine: Active</p>
        </div>
      </aside>

      {/* Mobile backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-950/20 backdrop-blur-xs z-30 md:hidden"
        />
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">

        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 shrink-0 z-10 shadow-sm gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {navHistory.length > 0 && (
              <button
                onClick={goBack}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer shrink-0"
                title="Go back"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-xs font-semibold hidden sm:inline">Back</span>
              </button>
            )}
            <h2 className="text-lg font-semibold text-slate-700 truncate">{TAB_TITLES[activeTab] ?? activeTab}</h2>
            {dataLoading && <Loader2 className="w-4 h-4 animate-spin text-slate-300 shrink-0" />}
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <span className="text-sm text-slate-500 hidden sm:inline">
              {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <button
              onClick={() => navigateTo('billing')}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg shadow-md transition-shadow cursor-pointer"
            >
              + QUICK BILL
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8">

          {notification && (
            <div className={`p-4 rounded-xl border flex items-center justify-between text-sm font-bold animate-fadeIn shadow-sm ${
              notification.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' :
              notification.type === 'alert' ? 'bg-red-50 border-red-100 text-red-800' :
              'bg-indigo-50 border-indigo-100 text-indigo-800'
            }`}>
              <span>{notification.message}</span>
              <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {activeTab === 'dashboard' && (
            <DashboardView products={products} customers={customers} invoices={invoices} onNavigate={navigateTo} />
          )}

          {activeTab === 'billing' && (
            <BillingView
              products={products}
              customers={customers}
              defaultGstRate={business.gstRate ?? 18}
              onAddInvoice={handleAddNewInvoice}
              onQuickAddCustomer={handleRegisterCustomer}
            />
          )}

          {activeTab === 'inventory' && (
            <InventoryView
              products={products}
              onAddProduct={handleCommitProduct}
              onUpdateStock={handleQuickAddStock}
              onUpdateProduct={handleUpdateProduct}
              onDeleteProduct={handleDeleteProduct}
              onImportProducts={handleImportProducts}
            />
          )}

          {activeTab === 'customers' && (
            <CustomersView
              customers={customers}
              transactions={transactions}
              onAddCustomer={handleRegisterCustomer}
              onReceivePayment={handlePostPaymentDeposit}
              onUpdateCustomer={handleUpdateCustomer}
              onDeleteCustomer={handleDeleteCustomer}
            />
          )}

          {activeTab === 'outstanding' && (
            <OutstandingView
              invoices={invoices}
              reminders={reminders}
              business={business}
              onAutoReconcile={handleRazorpayAutoReconcile}
              onSendReminder={handleWhatsAppManualFire}
              onViewInvoice={setViewingInvoice}
              onDeleteInvoice={handleDeleteInvoice}
            />
          )}

          {activeTab === 'todays-bills' && (
            <TodaysBillsView
              invoices={invoices}
              onNavigate={navigateTo}
              onViewInvoice={setViewingInvoice}
              onDeleteInvoice={handleDeleteInvoice}
            />
          )}

          {activeTab === 'daybook' && (
            <DayBookView invoices={invoices} transactions={transactions} customers={customers} business={business} />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              user={user}
              business={business}
              onLogout={handleLogout}
              onClearData={handleClearData}
              onUpdateBusiness={handleUpdateBusiness}
            />
          )}
        </div>
      </main>

      {viewingInvoice && (
        <InvoiceReceipt invoice={viewingInvoice} business={business} onClose={() => setViewingInvoice(null)} />
      )}
    </div>
  );
}
