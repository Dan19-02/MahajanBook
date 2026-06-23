import React from 'react';
import {
  TrendingUp,
  DollarSign,
  Users,
  AlertTriangle,
  Clock,
  FileText,
  ArrowUpRight,
  ChevronRight
} from 'lucide-react';
import { Product, Customer, Invoice, PaymentStatus } from '../types';

interface DashboardViewProps {
  products: Product[];
  customers: Customer[];
  invoices: Invoice[];
  onNavigate: (tab: string) => void;
}

export default function DashboardView({ products, customers, invoices, onNavigate }: DashboardViewProps) {
  // Real-time calculated KPI Metrics based on state:
  
  // 1. Today's Sales (Sum of invoices created today)
  const todaySales = React.useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return invoices
      .filter(inv => inv.createdAt.startsWith(today))
      .reduce((sum, inv) => sum + inv.grandTotal, 0);
  }, [invoices]);

  // 2. Outstanding Receivables (Sum of customer outstanding balances)
  const outstandingReceivables = React.useMemo(() => {
    return customers.reduce((sum, cust) => sum + cust.balance, 0);
  }, [customers]);

  // 3. Total Customers Count
  const totalCustomers = customers.length;

  // 4. Low Stock Items (Stock <= Threshold)
  const lowStockItemsCount = React.useMemo(() => {
    return products.filter(p => p.currentStock <= p.lowStockThreshold).length;
  }, [products]);

  // 5. Overdue Customers count (Invoices outstanding & past PTP date)
  const overdueCustomersCount = React.useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const uniqueOverdueCustomers = new Set<string>();
    
    invoices.forEach(inv => {
      if (inv.paymentStatus === PaymentStatus.CREDIT && inv.ptpDate && inv.ptpDate < today) {
        uniqueOverdueCustomers.add(inv.customerId);
      }
    });

    return uniqueOverdueCustomers.size;
  }, [invoices]);

  // 6. Bills Generated Today
  const billsGeneratedTodayCount = React.useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return invoices.filter(inv => inv.createdAt.startsWith(today)).length;
  }, [invoices]);

  // Dynamic Recent Credit Transactions
  const recentCreditInvoices = React.useMemo(() => {
    return invoices
      .filter(inv => inv.paymentStatus === PaymentStatus.CREDIT)
      .slice(0, 4);
  }, [invoices]);

  // Dynamic Low Stock warning items list
  const lowStockItems = React.useMemo(() => {
    return products
      .filter(p => p.currentStock <= p.lowStockThreshold)
      .slice(0, 4);
  }, [products]);

  return (
    <div className="space-y-6" id="dashboard-tab">
      {/* Header and Live Engine Status */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200/85 shadow-sm">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 font-sans">
            CreditFlow Live Monitor
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time shop billing ledger & Automated WhatsApp Recovery console.
          </p>
        </div>
        <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-xl text-emerald-800 text-xs font-semibold self-stretch md:self-auto justify-center">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          WhatsApp Recovery Engine Active (100% Sim Rate)
        </div>
      </div>

      {/* 6 Core Requested Business Metrics cards - Beautiful Sleek style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* KPI 1: Today's Sales */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between hover:shadow-md hover:border-slate-300 transition-all">
          <div className="flex justify-between items-start">
            <div className="space-y-1.5">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Today's Sales</p>
              <h3 className="text-2xl font-bold text-slate-800 tracking-tight font-sans">
                ₹{todaySales.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600">
              <TrendingUp className="w-5.5 h-5.5" />
            </div>
          </div>
          <div className="mt-5 pt-3.5 border-t border-slate-50 flex justify-between items-center">
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
              +14.2% Growth
            </span>
            <button 
              onClick={() => onNavigate('billing')}
              className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              New Bill <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* KPI 2: Outstanding Receivables */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between hover:shadow-md hover:border-slate-300 transition-all">
          <div className="flex justify-between items-start">
            <div className="space-y-1.5">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Outstanding Receivables</p>
              <h3 className="text-2xl font-bold text-red-600 tracking-tight font-sans">
                ₹{outstandingReceivables.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-100 text-amber-600">
              <DollarSign className="w-5.5 h-5.5" />
            </div>
          </div>
          <div className="mt-5 pt-3.5 border-t border-slate-50 flex justify-between items-center">
            <span className="text-[10px] font-medium text-slate-400">
              Locked in customer ledgers
            </span>
            <button 
              onClick={() => onNavigate('outstanding')}
              className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              Run Recoveries <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* KPI 3: Total Customers */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between hover:shadow-md hover:border-slate-300 transition-all">
          <div className="flex justify-between items-start">
            <div className="space-y-1.5">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Customers</p>
              <h3 className="text-2xl font-bold text-slate-800 tracking-tight font-sans">
                {totalCustomers}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-100 text-blue-600">
              <Users className="w-5.5 h-5.5" />
            </div>
          </div>
          <div className="mt-5 pt-3.5 border-t border-slate-50 flex justify-between items-center">
            <span className="text-[10px] text-slate-400">
              {customers.filter(c => c.customerType === 'WHOLESALER').length} Wholesalers • {customers.filter(c => c.customerType === 'RETAILER').length} Retailers
            </span>
            <button 
              onClick={() => onNavigate('customers')}
              className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              Ledgers <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* KPI 4: Low Stock Items */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between hover:shadow-md hover:border-slate-300 transition-all">
          <div className="flex justify-between items-start">
            <div className="space-y-1.5">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Low Stock Items</p>
              <h3 className="text-2xl font-bold text-amber-500 tracking-tight font-sans">
                {lowStockItemsCount}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-100 text-amber-600">
              <AlertTriangle className="w-5.5 h-5.5" />
            </div>
          </div>
          <div className="mt-5 pt-3.5 border-t border-slate-50 flex justify-between items-center">
            <span className="text-xs text-amber-600 bg-amber-50 px-2 rounded-full py-0.5 font-semibold">
              Needs Action
            </span>
            <button 
              onClick={() => onNavigate('inventory')}
              className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              Add Stock <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* KPI 5: Overdue Customers */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between hover:shadow-md hover:border-slate-300 transition-all">
          <div className="flex justify-between items-start">
            <div className="space-y-1.5">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Overdue Customers</p>
              <h3 className="text-2xl font-bold text-red-600 tracking-tight font-sans">
                {overdueCustomersCount}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-red-50 border border-red-100 text-red-600">
              <Clock className="w-5.5 h-5.5" />
            </div>
          </div>
          <div className="mt-5 pt-3.5 border-t border-slate-50 flex justify-between items-center">
            <span className="text-xs font-medium text-slate-500">
              Pending Recovery
            </span>
            <button 
              onClick={() => onNavigate('outstanding')}
              className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              Collect Now <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* KPI 6: Bills Generated Today (click to view today's bills) */}
        <button
          type="button"
          onClick={() => onNavigate('todays-bills')}
          className="text-left bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer"
        >
          <div className="flex justify-between items-start">
            <div className="space-y-1.5">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Bills Generated Today</p>
              <h3 className="text-2xl font-bold text-slate-800 tracking-tight font-sans">
                {billsGeneratedTodayCount}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600">
              <FileText className="w-5.5 h-5.5" />
            </div>
          </div>
          <div className="mt-5 pt-3.5 border-t border-slate-50 flex justify-between items-center">
            <span className="text-xs font-bold text-slate-500">
              Avg: ₹{billsGeneratedTodayCount > 0 ? Math.round(todaySales / billsGeneratedTodayCount).toLocaleString('en-IN') : 0}/bill
            </span>
            <span className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-0.5">
              View Bills <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </button>

      </div>

      {/* Grid for critical lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Outstanding Credit Monitor */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex justify-between items-center mb-5">
            <div>
              <h3 className="text-base font-bold text-slate-800">Active Debt Ledger & PTP Dates</h3>
              <p className="text-xs text-slate-400">Invoices on credit tracking</p>
            </div>
            <span className="text-[10px] font-mono text-slate-400">Auto recovery active</span>
          </div>

          {recentCreditInvoices.length === 0 ? (
            <div className="text-center py-12 text-sm text-slate-400 font-medium">
              Excellent! No credit bills outstanding today. All invoices paid.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto pr-1">
              {recentCreditInvoices.map((inv) => {
                const todayStr = new Date().toISOString().split('T')[0];
                const isOverdue = inv.ptpDate && inv.ptpDate < todayStr;
                const isDueToday = inv.ptpDate === todayStr;

                return (
                  <div key={inv.id} className="py-3.5 flex justify-between items-center hover:bg-slate-50 px-2 rounded-xl transition-all">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 text-xs">{inv.customerName}</span>
                        <span className="text-[9px] font-bold text-slate-400">{inv.invoiceNumber}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-semibold flex items-center gap-1.5">
                        PTP: <span className="font-bold text-slate-700">{inv.ptpDate || 'N/A'}</span>
                        {isOverdue && (
                          <span className="px-1.5 py-0.2 bg-red-50 text-red-600 font-bold rounded text-[8px] border border-red-100 animate-pulse">
                            Overdue
                          </span>
                        )}
                        {isDueToday && (
                          <span className="px-1.5 py-0.2 bg-amber-50 text-amber-700 font-bold rounded text-[8px] border border-amber-100">
                            Due Today
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="text-right space-y-1">
                      <p className="font-extrabold text-xs text-slate-800">₹{inv.grandTotal.toLocaleString('en-IN')}</p>
                      <button 
                        onClick={() => onNavigate('outstanding')}
                        className="text-[10px] text-indigo-500 hover:text-indigo-700 font-bold flex items-center gap-0.5 ml-auto cursor-pointer"
                      >
                        Recovery <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Low Stock Alerts & Fast Purchase Reorder */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-800">Stock Reorder Warnings</h3>
              <p className="text-xs text-slate-400">Inventory levels below threshold</p>
            </div>

            {lowStockItems.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-400 font-medium">
                Perfect! All items are adequately stocked.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {lowStockItems.map((prod) => (
                  <div key={prod.id} className="p-3 bg-rose-50/50 rounded-xl border border-rose-100/50 flex justify-between items-center text-xs">
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-800 line-clamp-1">{prod.name}</h4>
                      <p className="text-[10px] text-slate-400 font-mono">Limit: {prod.lowStockThreshold} {prod.unitType}s</p>
                    </div>
                    <span className="text-xs font-extrabold text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                      {prod.currentStock} left
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button 
            onClick={() => onNavigate('inventory')}
            className="w-full mt-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2.5 text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            Update Inventory Levels
          </button>
        </div>

      </div>
    </div>
  );
}
