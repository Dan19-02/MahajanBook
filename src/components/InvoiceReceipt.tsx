import React from 'react';
import { createPortal } from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, X } from 'lucide-react';
import { Invoice, Business, PaymentStatus } from '../types';

interface InvoiceReceiptProps {
  invoice: Invoice;
  business: Business;
  onClose: () => void;
}

const inr = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function InvoiceReceipt({ invoice, business, onClose }: InvoiceReceiptProps) {
  const createdAt = new Date(invoice.createdAt);
  const dateStr = Number.isNaN(createdAt.getTime())
    ? invoice.createdAt
    : createdAt.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const upiLink = business.upiVpa
    ? `upi://pay?pa=${encodeURIComponent(business.upiVpa)}&pn=${encodeURIComponent(business.name)}&am=${invoice.grandTotal}&cu=INR&tn=${encodeURIComponent(invoice.invoiceNumber)}`
    : '';

  return createPortal(
    <div className="receipt-overlay fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex items-start sm:items-center justify-center overflow-y-auto p-4">
      <div className="w-full max-w-sm my-4">
        {/* Action bar (not printed) */}
        <div className="flex justify-between items-center mb-3 no-print">
          <h3 className="text-sm font-bold text-white">Bill / Receipt</h3>
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Print
            </button>
            <button
              onClick={onClose}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <X className="w-4 h-4" /> Close
            </button>
          </div>
        </div>

        {/* Printable receipt */}
        <div className="print-area bg-white rounded-xl p-6 text-slate-900 font-mono text-[12px] leading-relaxed shadow-xl">
          {/* Header */}
          <div className="text-center border-b border-dashed border-slate-300 pb-3 mb-3">
            {business.logo && <img src={business.logo} alt="" className="h-12 mx-auto mb-2 object-contain" />}
            <h1 className="text-lg font-bold tracking-tight font-sans">{business.name}</h1>
            {business.address && <p className="text-[10px] text-slate-500 mt-0.5">{business.address}</p>}
            {business.phone && <p className="text-[10px] text-slate-500">Ph: {business.phone}</p>}
            {business.gstIn && <p className="text-[10px] text-slate-500 font-mono">GSTIN: {business.gstIn}</p>}
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Tax Invoice</p>
          </div>

          {/* Meta */}
          <div className="space-y-0.5 mb-3">
            <div className="flex justify-between"><span className="text-slate-500">Invoice</span><span className="font-bold">{invoice.invoiceNumber}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Date</span><span>{dateStr}</span></div>
            <div className="flex justify-between">
              <span className="text-slate-500">Status</span>
              <span className={`font-bold ${invoice.paymentStatus === PaymentStatus.PAID ? 'text-emerald-700' : 'text-rose-700'}`}>
                {invoice.paymentStatus}{invoice.paymentStatus === PaymentStatus.CREDIT && invoice.ptpDate ? ` · due ${invoice.ptpDate}` : ''}
              </span>
            </div>
          </div>

          {/* Customer */}
          <div className="border-t border-dashed border-slate-300 pt-2 mb-3">
            <p className="text-[10px] text-slate-500 uppercase">Billed to</p>
            <p className="font-bold font-sans">{invoice.customerName}</p>
            <p className="text-slate-600">+91 {invoice.customerMobile}</p>
          </div>

          {/* Items */}
          <table className="w-full border-t border-dashed border-slate-300 pt-2">
            <thead>
              <tr className="text-[10px] text-slate-500 uppercase border-b border-dashed border-slate-200">
                <th className="text-left py-1 font-medium">Item</th>
                <th className="text-center py-1 font-medium">Qty</th>
                <th className="text-right py-1 font-medium">Rate</th>
                <th className="text-right py-1 font-medium">Amt</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((it) => (
                <tr key={it.id} className="align-top">
                  <td className="py-1 pr-1 font-sans">{it.name}</td>
                  <td className="py-1 text-center">{it.quantity}</td>
                  <td className="py-1 text-right">{inr(it.price)}</td>
                  <td className="py-1 text-right font-bold">{inr(it.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="border-t border-dashed border-slate-300 mt-2 pt-2 space-y-0.5">
            <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>₹{inr(invoice.subtotal)}</span></div>
            {invoice.discount > 0 && (
              <div className="flex justify-between"><span className="text-slate-500">Discount</span><span>− ₹{inr(invoice.discount)}</span></div>
            )}
            <div className="flex justify-between"><span className="text-slate-500">GST ({invoice.taxRate ?? 18}%)</span><span>+ ₹{inr(invoice.tax)}</span></div>
            <div className="flex justify-between border-t border-slate-300 mt-1 pt-1.5 text-sm font-bold">
              <span>Grand Total</span><span>₹{inr(invoice.grandTotal)}</span>
            </div>
          </div>

          {/* UPI QR */}
          {upiLink && (
            <div className="text-center border-t border-dashed border-slate-300 mt-3 pt-3">
              <p className="text-[10px] text-slate-500 mb-2">Scan to pay ₹{inr(invoice.grandTotal)} via any UPI app</p>
              <div className="flex justify-center">
                <QRCodeSVG value={upiLink} size={120} level="M" />
              </div>
              <p className="text-[9px] text-slate-400 mt-1 font-mono">{business.upiVpa}</p>
            </div>
          )}

          {/* Footer */}
          <div className="text-center border-t border-dashed border-slate-300 mt-3 pt-3 text-[10px] text-slate-500">
            <p className="font-sans">Thank you for your business!</p>
            <p className="mt-0.5">Powered by CreditFlow</p>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
