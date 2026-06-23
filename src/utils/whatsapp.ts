import type { WhatsAppReminder, Invoice } from '../types';

/** Normalise an Indian mobile to wa.me format (adds country code 91 if missing). */
function toWaNumber(mobile: string): string {
  const digits = mobile.replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

/** Builds the wa.me deep link (number + pre-filled message). */
export function waUrl(mobile: string, message: string): string {
  return `https://wa.me/${toWaNumber(mobile)}?text=${encodeURIComponent(message)}`;
}

/** Opens WhatsApp (app or web) pre-addressed to the number with the message typed. */
export function openWhatsApp(mobile: string, message: string): void {
  window.open(waUrl(mobile, message), '_blank', 'noopener');
}

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;

/**
 * Builds a ready-to-send WhatsApp reminder from real data, escalating in tone
 * with the reminder milestone. No manual entry — every field is filled in.
 */
export function buildReminderMessage(
  reminder: WhatsAppReminder,
  businessName: string,
  invoiceNumber: string,
): string {
  const name = reminder.customerName;
  const amt = inr(reminder.invoiceAmount);
  const link = reminder.razorpayPaymentLink;
  const due = reminder.ptpDate;
  const inv = invoiceNumber || reminder.invoiceId;

  switch (reminder.triggerType) {
    case 'PTP_MINUS_1':
      return `Dear ${name}, a gentle reminder from ${businessName}: invoice #${inv} of ${amt} is due tomorrow (${due}). You can pay anytime here: ${link}. Thank you!`;
    case 'PTP_PLUS_1':
      return `Hello ${name}, invoice #${inv} of ${amt} from ${businessName} is now overdue (was due ${due}). Kindly clear it at your earliest convenience: ${link}. Thank you.`;
    case 'PTP_PLUS_3':
      return `Reminder from ${businessName}: your balance of ${amt} on invoice #${inv} is a few days overdue. Please settle it today to keep your account in good standing: ${link}.`;
    case 'PTP_PLUS_5':
      return `${name}, this is an important reminder from ${businessName}. Invoice #${inv} of ${amt} remains unpaid. Please pay now to avoid disruption to your credit: ${link}.`;
    default: // PTP_PLUS_7 / 9 / 11
      return `Final reminder from ${businessName}: invoice #${inv} of ${amt} is significantly overdue. Please clear it within 24 hours to avoid further action: ${link}. Thank you.`;
  }
}

/** A simple ad-hoc nudge for an outstanding invoice (used from the invoice list). */
export function buildInvoiceNudge(invoice: Invoice, businessName: string): string {
  const link = `https://rzp.io/i/cf_${invoice.invoiceNumber.toLowerCase()}`;
  const due = invoice.ptpDate ? ` (due ${invoice.ptpDate})` : '';
  return `Hello ${invoice.customerName}, a reminder from ${businessName}: invoice #${invoice.invoiceNumber} of ${inr(invoice.grandTotal)}${due} is pending. Please pay here: ${link}. Thank you!`;
}
