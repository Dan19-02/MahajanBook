import React, { useMemo } from 'react';
import { ClipboardList, Receipt, Wallet, TrendingUp, AlertCircle, Send } from 'lucide-react';
import { Invoice, Transaction, Customer, Business, PaymentStatus } from '../types';
import { openWhatsApp } from '../utils/whatsapp';

interface DayBookViewProps {
  invoices: Invoice[];
  transactions: Transaction[];
  customers: Customer[];
  business: Business;
}

const inr = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export default function DayBookView({ invoices, transactions, customers, business }: DayBookViewProps) {
  const today = new Date().toISOString().split('T')[0];

  const s = useMemo(() => {
    const todayInv = invoices.filter((i) => i.createdAt.startsWith(today));
    const paid = todayInv.filter((i) => i.paymentStatus === PaymentStatus.PAID);
    const credit = todayInv.filter((i) => i.paymentStatus === PaymentStatus.CREDIT);
    const sales = todayInv.reduce((t, i) => t + i.grandTotal, 0);
    const cashIn = transactions
      .filter((t) => t.type === 'CREDIT' && t.createdAt.startsWith(today))
      .reduce((t, x) => t + x.amount, 0);
    const creditGiven = credit.reduce((t, i) => t + i.grandTotal, 0);
    const outstanding = customers.reduce((t, c) => t + c.balance, 0);

    const itemMap = new Map<string, { name: string; qty: number; amount: number }>();
    for (const inv of todayInv) {
      for (const it of inv.items) {
        const cur = itemMap.get(it.name) ?? { name: it.name, qty: 0, amount: 0 };
        cur.qty += it.quantity;
        cur.amount += it.total;
        itemMap.set(it.name, cur);
      }
    }
    const topItems = [...itemMap.values()].sort((a, b) => b.amount - a.amount).slice(0, 5);

    return { count: todayInv.length, sales, paidCount: paid.length, creditCount: credit.length, cashIn, creditGiven, outstanding, topItems };
  }, [invoices, transactions, customers, today]);

  const dateLabel = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const sendSummary = () => {
    if (!business.phone) {
      alert('Add your shop phone in Settings → Shop Profile to send the summary to yourself.');
      return;
    }
    const lines = [
      `*${business.name}* — Day Book (${today})`,
      `Bills: ${s.count}  |  Sales: ${inr(s.sales)}`,
      `Cash in: ${inr(s.cashIn)}`,
      `Credit given: ${inr(s.creditGiven)}`,
      `Total outstanding: ${inr(s.outstanding)}`,
      s.topItems.length ? `Top: ${s.topItems.slice(0, 3).map((i) => i.name).join(', ')}` : '',
    ].filter(Boolean);
    openWhatsApp(business.phone, lines.join('\n'));
  };

  const cards = [
    { label: 'Bills Today', value: String(s.count), sub: `${s.paidCount} paid · ${s.creditCount} credit`, icon: Receipt, tint: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
    { label: 'Sales Today', value: inr(s.sales), sub: 'All invoices today', icon: TrendingUp, tint: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
    { label: 'Cash In Today', value: inr(s.cashIn), sub: 'Cash sales + recoveries', icon: Wallet, tint: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
    { label: 'Credit Given Today', value: inr(s.creditGiven), sub: 'Added to customer dues', icon: AlertCircle, tint: 'text-amber-600 bg-amber-50 border-amber-100' },
    { label: 'Total Outstanding', value: inr(s.outstanding), sub: 'All unpaid dues', icon: AlertCircle, tint: 'text-rose-600 bg-rose-50 border-rose-100' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm animate-fadeIn">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-indigo-600" /> Day Book
          </h2>
          <p className="text-xs text-slate-400 mt-1">{dateLabel}</p>
        </div>
        <button
          onClick={sendSummary}
          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-4 py-2.5 text-xs font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer"
        >
          <Send className="w-4 h-4" /> WhatsApp summary to me
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{c.label}</p>
                  <h3 className="text-2xl font-bold text-slate-800 mt-1.5">{c.value}</h3>
                </div>
                <div className={`p-2.5 rounded-xl border ${c.tint}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-3">{c.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Top items today */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <h3 className="text-sm font-bold text-slate-800 pb-2 border-b border-slate-100 mb-3">Top Sellers Today</h3>
        {s.topItems.length === 0 ? (
          <p className="text-sm text-slate-400 font-medium py-6 text-center">No sales yet today.</p>
        ) : (
          <div className="space-y-2">
            {s.topItems.map((it, idx) => (
              <div key={it.name} className="flex items-center justify-between text-xs py-1.5">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 font-bold flex items-center justify-center shrink-0">{idx + 1}</span>
                  <span className="font-bold text-slate-800 truncate">{it.name}</span>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-extrabold text-slate-900">{inr(it.amount)}</span>
                  <span className="text-[10px] text-slate-400 ml-2">{it.qty} sold</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
