import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, CreditCard, Printer, MessageCircle, Sparkles, Loader2, Trash2 } from 'lucide-react';
import { Invoice, PaymentStatus, WhatsAppReminder, Business } from '../types';
import { draftReminder, type ReminderTone } from '../services/api';
import { openWhatsApp, waUrl, buildReminderMessage, buildInvoiceNudge } from '../utils/whatsapp';

interface OutstandingViewProps {
  invoices: Invoice[];
  reminders: WhatsAppReminder[];
  business: Business;
  onAutoReconcile: (invoiceId: string) => void;
  onSendReminder: (reminderId: string) => void;
  onViewInvoice: (invoice: Invoice) => void;
  onDeleteInvoice: (id: string) => void;
}

const toneFor = (trigger: WhatsAppReminder['triggerType']): ReminderTone => {
  switch (trigger) {
    case 'PTP_MINUS_1': return 'gentle';
    case 'PTP_PLUS_1': return 'overdue';
    case 'PTP_PLUS_3':
    case 'PTP_PLUS_5': return 'serious';
    default: return 'final';
  }
};

export default function OutstandingView({ invoices, reminders, business, onAutoReconcile, onSendReminder, onViewInvoice, onDeleteInvoice }: OutstandingViewProps) {
  const voidInvoice = (inv: Invoice) => {
    if (window.confirm(`Void invoice ${inv.invoiceNumber}? Stock is restored and reminders cleared.`)) onDeleteInvoice(inv.id);
  };
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'UPCOMING' | 'DUE_TODAY' | 'OVERDUE' | 'PAID'>('ALL');
  const [activeTab, setActiveTab] = useState<'TABLE' | 'QUEUED_REMINDERS'>('TABLE');
  const [aiSendingId, setAiSendingId] = useState<string | null>(null);

  const invNumberFor = (rem: WhatsAppReminder) =>
    invoices.find((i) => i.id === rem.invoiceId)?.invoiceNumber ?? rem.invoiceId;

  // One-click WhatsApp: open the chat with the message pre-filled, then mark sent.
  const handleSend = (rem: WhatsAppReminder) => {
    openWhatsApp(rem.customerMobile, buildReminderMessage(rem, business.name, invNumberFor(rem)));
    onSendReminder(rem.id);
  };

  // AI-personalised send. Open the tab inside the click (to dodge popup blockers),
  // then point it at the wa.me link once MiniMax responds (template fallback).
  const handleSendAI = async (rem: WhatsAppReminder) => {
    const win = window.open('about:blank', '_blank');
    setAiSendingId(rem.id);
    let message = buildReminderMessage(rem, business.name, invNumberFor(rem));
    try {
      message = await draftReminder({
        customerName: rem.customerName,
        invoiceNumber: invNumberFor(rem),
        amount: rem.invoiceAmount.toLocaleString('en-IN'),
        dueDate: rem.ptpDate,
        payLink: rem.razorpayPaymentLink,
        tone: toneFor(rem.triggerType),
        businessName: business.name,
      });
    } catch {
      /* fall back to the template message already in `message` */
    } finally {
      const url = waUrl(rem.customerMobile, message);
      if (win) win.location.href = url;
      else openWhatsApp(rem.customerMobile, message);
      onSendReminder(rem.id);
      setAiSendingId(null);
    }
  };

  const handleInvoiceNudge = (inv: Invoice) =>
    openWhatsApp(inv.customerMobile, buildInvoiceNudge(inv, business.name));

  const getOverdueDays = (ptpDateStr?: string): number => {
    if (!ptpDateStr) return 0;
    const ptp = new Date(ptpDateStr);
    const today = new Date();
    ptp.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today.getTime() - ptp.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const getInvoiceStatusDetails = (inv: Invoice): { label: string; bg: string; text: string; days: number } => {
    if (inv.paymentStatus === PaymentStatus.PAID) {
      return { label: 'Paid', bg: 'bg-emerald-50 border-emerald-100', text: 'text-emerald-700', days: 0 };
    }
    const todayStr = new Date().toISOString().split('T')[0];
    const daysOverdue = getOverdueDays(inv.ptpDate);
    if (inv.ptpDate === todayStr) {
      return { label: 'Due Today', bg: 'bg-amber-50 border-amber-100 animate-pulse', text: 'text-amber-700 font-extrabold', days: 0 };
    }
    if (inv.ptpDate && inv.ptpDate < todayStr) {
      return { label: 'Overdue', bg: 'bg-rose-50 border-rose-100', text: 'text-rose-700 font-bold', days: daysOverdue };
    }
    return { label: 'Upcoming', bg: 'bg-blue-50 border-blue-100', text: 'text-blue-700', days: 0 };
  };

  const filteredInvoices = invoices.filter((inv) => {
    const details = getInvoiceStatusDetails(inv);
    if (filterStatus === 'ALL') return true;
    if (filterStatus === 'PAID') return inv.paymentStatus === PaymentStatus.PAID;
    if (filterStatus === 'OVERDUE') return inv.paymentStatus === PaymentStatus.CREDIT && details.label === 'Overdue';
    if (filterStatus === 'DUE_TODAY') return inv.paymentStatus === PaymentStatus.CREDIT && details.label === 'Due Today';
    if (filterStatus === 'UPCOMING') return inv.paymentStatus === PaymentStatus.CREDIT && details.label === 'Upcoming';
    return true;
  });

  const queuedCount = reminders.filter((r) => r.status === 'QUEUED').length;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm animate-fadeIn">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Overdue &amp; Recovery</h2>
          <p className="text-xs text-slate-400 mt-1">Send WhatsApp reminders in one click, reconcile payments, and print bills.</p>
        </div>
        <div className="flex bg-slate-100 p-1 border border-slate-200/60 rounded-xl">
          <button
            type="button" onClick={() => setActiveTab('TABLE')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'TABLE' ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Outstanding Ledgers
          </button>
          <button
            type="button" onClick={() => setActiveTab('QUEUED_REMINDERS')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'QUEUED_REMINDERS' ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Reminder Queue{queuedCount > 0 ? ` (${queuedCount})` : ''}
          </button>
        </div>
      </div>

      {activeTab === 'TABLE' ? (
        <div className="space-y-4 animate-fadeIn">

          {/* Quick Filter Rails */}
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'ALL', label: 'All Invoices' },
              { id: 'OVERDUE', label: '🔴 Overdue Accounts' },
              { id: 'DUE_TODAY', label: '🟡 Due Today' },
              { id: 'UPCOMING', label: '🔵 Upcoming Claims' },
              { id: 'PAID', label: '🟢 Fully Settled' },
            ].map((bt) => (
              <button
                key={bt.id}
                onClick={() => setFilterStatus(bt.id as typeof filterStatus)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  filterStatus === bt.id
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200/70'
                }`}
              >
                {bt.label}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse table-auto">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 border-b border-slate-100 tracking-wider">
                    <th className="px-6 py-4">Customer Details</th>
                    <th className="px-6 py-4">Invoice #</th>
                    <th className="px-6 py-4 text-right">Outstanding (₹)</th>
                    <th className="px-6 py-4 text-center">PTP Date</th>
                    <th className="px-6 py-4 text-center">Days Overdue</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-center">Quick Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans text-xs">
                  {filteredInvoices.map((inv) => {
                    const statusVal = getInvoiceStatusDetails(inv);
                    return (
                      <tr key={inv.id} className="hover:bg-gray-50/20 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-gray-900">{inv.customerName}</div>
                          <div className="text-[10px] text-gray-400 mt-0.5">Cell: {inv.customerMobile}</div>
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-gray-800">{inv.invoiceNumber}</td>
                        <td className="px-6 py-4 text-right font-extrabold text-sm text-gray-900">
                          ₹{inv.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-center font-bold font-mono text-gray-600">
                          {inv.ptpDate || <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-6 py-4 text-center font-bold font-mono">
                          {inv.paymentStatus === PaymentStatus.PAID ? (
                            <span className="text-gray-300">N/A</span>
                          ) : statusVal.days > 0 ? (
                            <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded font-black border border-rose-100">
                              {statusVal.days}d
                            </span>
                          ) : (
                            <span className="text-gray-400 font-normal">0</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2.5 py-1 inline-block border-[0.5px] rounded-lg text-[10px] font-bold ${statusVal.bg} ${statusVal.text}`}>
                            {statusVal.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            {inv.paymentStatus === PaymentStatus.CREDIT && (
                              <>
                                <button
                                  onClick={() => handleInvoiceNudge(inv)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg px-2.5 py-1.5 text-[10px] flex items-center gap-1 cursor-pointer transition-all"
                                  title="Send a WhatsApp reminder"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                                </button>
                                <button
                                  onClick={() => onAutoReconcile(inv.id)}
                                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg px-2.5 py-1.5 text-[10px] flex items-center gap-1 cursor-pointer transition-all"
                                  title="Mark paid via Razorpay (simulated)"
                                >
                                  <CreditCard className="w-3.5 h-3.5" /> Razorpay
                                </button>
                              </>
                            )}
                            {inv.paymentStatus === PaymentStatus.PAID && (
                              <span className="text-emerald-600 font-bold flex items-center gap-1 text-[11px]">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Settled
                              </span>
                            )}
                            <button
                              onClick={() => onViewInvoice(inv)}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg px-2.5 py-1.5 text-[10px] flex items-center gap-1 cursor-pointer transition-all"
                              title="View & print bill"
                            >
                              <Printer className="w-3.5 h-3.5" /> Print
                            </button>
                            <button
                              onClick={() => voidInvoice(inv)}
                              className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-lg px-2 py-1.5 text-[10px] flex items-center cursor-pointer transition-all"
                              title="Void invoice"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredInvoices.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-16 text-sm text-gray-400 font-medium">
                        No invoices found under the specified recovery filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4 animate-fadeIn">

          <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex gap-3 text-xs text-indigo-900 shadow-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-indigo-600" />
            <div>
              <span className="font-extrabold text-sm block">How automated recovery works</span>
              <p className="mt-1 leading-relaxed text-indigo-700">
                Every credit bill auto-schedules reminders from the day before the PTP date, then every other day:
                <span className="font-bold"> PTP−1 • +1 • +3 • +5 • +7 • +9 • +11</span>.
                Hit <strong>Send on WhatsApp</strong> and the message — name, ₹ amount, invoice, due date and pay link —
                opens in WhatsApp already typed and addressed to the customer; just tap send. Use <strong>✨</strong> for an
                AI-tailored message. When the customer pays, the rest of their reminders cancel automatically.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left table-auto border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    <th className="px-6 py-4">Milestone</th>
                    <th className="px-6 py-4">Client</th>
                    <th className="px-6 py-4">Scheduled</th>
                    <th className="px-6 py-4 text-right">Dues (₹)</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-center">Send</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {reminders.map((rem) => (
                    <tr key={rem.id} className="hover:bg-gray-50/20 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-extrabold text-indigo-700 font-mono text-[10px] bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                          {rem.triggerType}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-gray-800">{rem.customerName}</span>
                        <p className="text-[10px] text-gray-400">Mobile: {rem.customerMobile}</p>
                      </td>
                      <td className="px-6 py-4 font-mono font-medium text-gray-500">{rem.scheduledFor}</td>
                      <td className="px-6 py-4 text-right font-extrabold pr-10">₹{rem.invoiceAmount.toLocaleString('en-IN')}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-md font-bold text-[9px] uppercase border ${
                          rem.status === 'SENT' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' :
                          rem.status === 'QUEUED' ? 'bg-amber-50 border-amber-100 text-amber-700' :
                          'bg-gray-100 border-gray-200 text-gray-400 line-through'
                        }`}>
                          {rem.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {rem.status === 'QUEUED' ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleSend(rem)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg px-3 py-1.5 text-[10px] flex items-center gap-1.5 transition-all cursor-pointer"
                            >
                              <MessageCircle className="w-3.5 h-3.5" /> Send on WhatsApp
                            </button>
                            <button
                              onClick={() => handleSendAI(rem)}
                              disabled={aiSendingId === rem.id}
                              className="border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold rounded-lg px-2 py-1.5 text-[10px] flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                              title="Send an AI-personalised message"
                            >
                              {aiSendingId === rem.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        ) : rem.status === 'SENT' ? (
                          <span className="text-[10px] text-gray-400 font-medium flex items-center justify-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Sent {rem.sentAt?.split('T')[0]}
                          </span>
                        ) : (
                          <span className="text-gray-300 italic line-through text-[11px] block text-center">Cancelled</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {reminders.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-sm text-gray-400 font-medium">
                        No reminders yet. Create a customer CREDIT invoice to schedule them.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
