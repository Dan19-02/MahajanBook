import React, { useMemo } from 'react';
import { Receipt, Plus, FileText, Clock, Printer, Trash2 } from 'lucide-react';
import { Invoice, PaymentStatus } from '../types';

interface TodaysBillsViewProps {
  invoices: Invoice[];
  onNavigate: (tab: string) => void;
  onViewInvoice: (invoice: Invoice) => void;
  onDeleteInvoice: (id: string) => void;
}

export default function TodaysBillsView({ invoices, onNavigate, onViewInvoice, onDeleteInvoice }: TodaysBillsViewProps) {
  const voidBill = (inv: Invoice) => {
    if (window.confirm(`Void invoice ${inv.invoiceNumber}? Stock is restored and reminders cleared.`)) onDeleteInvoice(inv.id);
  };
  const today = new Date().toISOString().split('T')[0];

  const todaysBills = useMemo(
    () =>
      invoices
        .filter((inv) => inv.createdAt.startsWith(today))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [invoices, today],
  );

  const totalSales = todaysBills.reduce((sum, inv) => sum + inv.grandTotal, 0);
  const paidCount = todaysBills.filter((inv) => inv.paymentStatus === PaymentStatus.PAID).length;
  const creditCount = todaysBills.length - paidCount;

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
      ? '—'
      : d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm animate-fadeIn">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-indigo-600" /> Today's Bills
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            All invoices generated on {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}.
          </p>
        </div>
        <button
          onClick={() => onNavigate('billing')}
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2.5 text-xs font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Create New Bill
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Bills Today</p>
          <h3 className="text-2xl font-bold text-slate-800 mt-1.5">{todaysBills.length}</h3>
          <p className="text-[10px] text-slate-400 mt-1">{paidCount} paid • {creditCount} on credit</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Sales</p>
          <h3 className="text-2xl font-bold text-emerald-600 mt-1.5">
            ₹{totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
          <p className="text-[10px] text-slate-400 mt-1">Across all of today's invoices</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Avg / Bill</p>
          <h3 className="text-2xl font-bold text-slate-800 mt-1.5">
            ₹{todaysBills.length ? Math.round(totalSales / todaysBills.length).toLocaleString('en-IN') : 0}
          </h3>
          <p className="text-[10px] text-slate-400 mt-1">Average invoice value</p>
        </div>
      </div>

      {/* Bills table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse table-auto">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100 tracking-wider">
                <th className="px-6 py-4">Invoice #</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4 text-center">Time</th>
                <th className="px-6 py-4 text-center">Items</th>
                <th className="px-6 py-4 text-right">Amount (₹)</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Bill</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {todaysBills.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-mono font-bold text-indigo-700">{inv.invoiceNumber}</td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-800">{inv.customerName}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Cell: {inv.customerMobile}</div>
                  </td>
                  <td className="px-6 py-4 text-center font-mono text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-300" /> {formatTime(inv.createdAt)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center font-bold text-slate-600">{inv.items.length}</td>
                  <td className="px-6 py-4 text-right font-extrabold text-sm text-slate-900">
                    ₹{inv.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {inv.paymentStatus === PaymentStatus.PAID ? (
                      <span className="px-2.5 py-1 inline-block rounded-lg text-[10px] font-bold bg-emerald-50 border border-emerald-100 text-emerald-700">
                        Paid
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 inline-block rounded-lg text-[10px] font-bold bg-rose-50 border border-rose-100 text-rose-700">
                        Credit
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => onViewInvoice(inv)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] transition-colors cursor-pointer"
                        title="View & print bill"
                      >
                        <Printer className="w-3.5 h-3.5" /> Print
                      </button>
                      <button
                        onClick={() => voidBill(inv)}
                        className="inline-flex items-center px-2 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-[10px] transition-colors cursor-pointer"
                        title="Void invoice"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {todaysBills.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-sm text-slate-400 font-medium">
                    <FileText className="w-8 h-8 mx-auto mb-3 text-slate-300" />
                    No bills generated today yet.
                    <button
                      onClick={() => onNavigate('billing')}
                      className="block mx-auto mt-3 text-indigo-600 hover:text-indigo-700 font-bold cursor-pointer"
                    >
                      Create the first bill →
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
