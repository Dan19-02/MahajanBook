import React, { useState } from 'react';
import { Check, Loader2, Sparkles, Crown, Store, Zap } from 'lucide-react';
import type { Account, Plan } from '../types';
import { subscribe, verifySubscription } from '../services/api';

interface PlansViewProps {
  account: Account;
  isOwner: boolean;
  onAccountChanged: (account: Account) => void;
  onNavigate: (tab: string) => void;
}

interface Tier {
  plan: Plan;
  name: string;
  price: number;
  tagline: string;
  icon: typeof Store;
  highlight?: boolean;
  features: string[];
}

const TIERS: Tier[] = [
  {
    plan: 'STARTER',
    name: 'Starter',
    price: 1500,
    tagline: 'The solo kirana / single shop',
    icon: Store,
    features: [
      '1 store',
      '1 owner + 1 staff login',
      'Express GST billing (retail + wholesale)',
      'Unlimited customers & digital khata',
      'Unlimited inventory + low-stock alerts',
      'UPI payment links',
      'AI WhatsApp recovery — ~150 reminders/mo',
      'Core reports: daily sales, outstanding, day book',
      'Chat / email support',
    ],
  },
  {
    plan: 'GROWTH',
    name: 'Growth',
    price: 2500,
    tagline: 'Multi-counter shops & small chains',
    icon: Zap,
    highlight: true,
    features: [
      'Everything in Starter, plus:',
      'Up to 10 stores',
      'Up to 8 staff logins (owner/staff roles)',
      'AI WhatsApp recovery — ~750 reminders/mo',
      'Consolidated multi-store reporting',
      'GST reports + Excel/PDF export',
      'Priority support',
    ],
  },
  {
    plan: 'UNLIMITED',
    name: 'Unlimited',
    price: 5000,
    tagline: 'Distributors, wholesalers, chains',
    icon: Crown,
    features: [
      'Everything in Growth, plus:',
      'Unlimited stores',
      'Unlimited staff logins',
      'AI WhatsApp recovery — fair-use (high cap)',
      'Custom branding on invoices & WhatsApp',
      'Dedicated account manager / phone support',
      'Early access to new features',
    ],
  },
];

const RZP_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

/** Loads the Razorpay Checkout script once. */
function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false);
    const w = window as unknown as { Razorpay?: unknown };
    if (w.Razorpay) return resolve(true);
    const existing = document.querySelector(`script[src="${RZP_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(true));
      existing.addEventListener('error', () => resolve(false));
      return;
    }
    const s = document.createElement('script');
    s.src = RZP_SRC;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

const errMsg = (e: unknown): string => (e instanceof Error ? e.message : 'Something went wrong.');

export default function PlansView({ account, isOwner, onAccountChanged, onNavigate }: PlansViewProps) {
  const [busyPlan, setBusyPlan] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const rank: Record<Plan, number> = { STARTER: 0, GROWTH: 1, UNLIMITED: 2 };
  const current = account.plan;

  const choose = async (plan: Plan) => {
    if (!isOwner || plan === current) return;
    setError(null);
    setNotice(null);
    setBusyPlan(plan);
    try {
      const ok = await loadRazorpay();
      if (!ok) throw new Error('Could not load the Razorpay checkout. Check your connection and try again.');

      const { keyId, subscriptionId } = await subscribe(plan);

      const RazorpayCtor = (window as unknown as { Razorpay: new (o: unknown) => { open: () => void; on: (e: string, cb: (r: unknown) => void) => void } }).Razorpay;
      const rzp = new RazorpayCtor({
        key: keyId,
        subscription_id: subscriptionId,
        name: account.name,
        description: `${TIERS.find((t) => t.plan === plan)?.name} plan — MahajanBook`,
        theme: { color: '#4f46e5' },
        handler: async (resp: unknown) => {
          const r = resp as { razorpay_payment_id: string; razorpay_subscription_id: string; razorpay_signature: string };
          try {
            const { account: updated } = await verifySubscription({
              razorpay_payment_id: r.razorpay_payment_id,
              razorpay_subscription_id: r.razorpay_subscription_id,
              razorpay_signature: r.razorpay_signature,
            });
            onAccountChanged(updated);
            setNotice(`You're now on the ${updated.limits.label} plan. 🎉`);
          } catch (e) {
            setError(errMsg(e));
          } finally {
            setBusyPlan(null);
          }
        },
      });
      rzp.on('payment.failed', () => {
        setError('Payment failed or was cancelled. You have not been charged.');
        setBusyPlan(null);
      });
      rzp.open();
      // Checkout is now open; clear our spinner (the handler manages the rest).
      setBusyPlan(null);
    } catch (e) {
      setError(errMsg(e));
      setBusyPlan(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm animate-fadeIn flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" /> Plans &amp; Billing
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            You're on the <span className="font-bold text-indigo-700">{account.limits.label}</span> plan · ₹{account.limits.priceMonthly.toLocaleString('en-IN')}/mo.
            {account.subscriptionStatus ? ` Subscription: ${account.subscriptionStatus}.` : ''}
          </p>
        </div>
        <button onClick={() => onNavigate('settings')} className="text-xs font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer self-start">
          ← Back to Settings
        </button>
      </div>

      {!isOwner && (
        <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-800">
          Only the account owner can change the plan. You can review the tiers below.
        </div>
      )}
      {error && <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-700 font-medium">{error}</div>}
      {notice && <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-800 font-bold">{notice}</div>}

      {/* Tiers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {TIERS.map((tier) => {
          const Icon = tier.icon;
          const isCurrent = tier.plan === current;
          const isUpgrade = rank[tier.plan] > rank[current];
          return (
            <div
              key={tier.plan}
              className={`relative bg-white rounded-2xl border shadow-sm p-6 flex flex-col ${
                tier.highlight ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-slate-200'
              }`}
            >
              {tier.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-indigo-600 text-white text-[10px] font-extrabold uppercase tracking-wide shadow">
                  Most Popular
                </span>
              )}
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl border ${tier.highlight ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-800">{tier.name}</h3>
                  <p className="text-[10px] text-slate-400">{tier.tagline}</p>
                </div>
              </div>

              <div className="mt-4">
                <span className="text-3xl font-black text-slate-900">₹{tier.price.toLocaleString('en-IN')}</span>
                <span className="text-xs text-slate-400 font-semibold">/month</span>
              </div>

              <ul className="mt-4 space-y-2 flex-1">
                {tier.features.map((f, i) => (
                  <li key={i} className={`flex items-start gap-2 text-xs ${i === 0 && f.startsWith('Everything') ? 'text-slate-500 font-bold' : 'text-slate-600'}`}>
                    {!(i === 0 && f.startsWith('Everything')) && <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />}
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <button
                disabled={!isOwner || isCurrent || busyPlan !== null}
                onClick={() => choose(tier.plan)}
                className={`mt-5 w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed ${
                  isCurrent
                    ? 'bg-slate-100 text-slate-500 border border-slate-200'
                    : tier.highlight
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50'
                    : 'bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50'
                }`}
              >
                {busyPlan === tier.plan ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Opening checkout…</>
                ) : isCurrent ? (
                  'Current plan'
                ) : isUpgrade ? (
                  'Upgrade'
                ) : (
                  'Switch to this plan'
                )}
              </button>
            </div>
          );
        })}
      </div>

      <p className="text-center text-[10px] text-slate-400">
        Secure payments by Razorpay. Plans are billed monthly and can be changed anytime.
      </p>
    </div>
  );
}
