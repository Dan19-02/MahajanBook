import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Building2,
  Server,
  RefreshCw,
  Trash2,
  Check,
  Copy,
  Users,
  Cpu,
  UserCog,
  LogOut,
  Upload,
  MessageCircle,
} from 'lucide-react';
import { UserRole, type User, type Business } from '../types';
import { getHealth, type BackendHealth } from '../services/api';

interface SettingsViewProps {
  user: User;
  business: Business;
  onLogout: () => void;
  onClearData: () => void;
  onUpdateBusiness: (fields: Partial<Pick<Business, 'name' | 'address' | 'gstIn' | 'phone' | 'logo' | 'upiVpa'>>) => Promise<void>;
}

export default function SettingsView({ user, business, onLogout, onClearData, onUpdateBusiness }: SettingsViewProps) {
  const isOwner = user.role === UserRole.OWNER;
  const initials = user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const [copiedCode, setCopiedCode] = useState(false);

  const copyJoinCode = () => {
    navigator.clipboard.writeText(business.joinCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Shop profile (printed on every bill)
  const [bizName, setBizName] = useState(business.name);
  const [bizAddress, setBizAddress] = useState(business.address ?? '');
  const [bizGstin, setBizGstin] = useState(business.gstIn ?? '');
  const [bizPhone, setBizPhone] = useState(business.phone ?? '');
  const [bizUpi, setBizUpi] = useState(business.upiVpa ?? '');
  const [bizLogo, setBizLogo] = useState(business.logo ?? '');
  const [savedProfile, setSavedProfile] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);

  const handleLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 240;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          setBizLogo(canvas.toDataURL('image/png'));
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    setProfileSaving(true);
    await onUpdateBusiness({
      name: bizName.trim() || business.name,
      address: bizAddress.trim(),
      gstIn: bizGstin.trim(),
      phone: bizPhone.trim(),
      upiVpa: bizUpi.trim(),
      logo: bizLogo,
    });
    setProfileSaving(false);
    setSavedProfile(true);
    setTimeout(() => setSavedProfile(false), 2000);
  };

  // Backend / AI status
  const [health, setHealth] = useState<BackendHealth | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  const checkHealth = async () => {
    setHealthLoading(true);
    setHealthError(null);
    try {
      setHealth(await getHealth());
    } catch (err) {
      setHealth(null);
      setHealthError(err instanceof Error ? err.message : 'Backend unreachable.');
    } finally {
      setHealthLoading(false);
    }
  };

  useEffect(() => {
    void checkHealth();
  }, []);

  const handleClear = () => {
    if (window.confirm('Clear ALL business data (customers, invoices, products, reminders)? This cannot be undone.')) {
      onClearData();
    }
  };

  const inputCls = 'w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500';

  return (
    <div className="space-y-6 max-w-3xl">

      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm animate-fadeIn">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <UserCog className="w-5 h-5 text-indigo-600" /> Settings
        </h2>
        <p className="text-xs text-slate-400 mt-1">Manage your account, shop profile, and integrations.</p>
      </div>

      {/* Account */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-800 pb-2 border-b border-slate-100">Account</h3>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-14 h-14 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center font-bold text-slate-700 text-lg shrink-0">
              {initials}
            </div>
            <div className="space-y-0.5 min-w-0">
              <p className="text-sm font-bold text-slate-800 truncate">{user.name}</p>
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
              <div className="flex items-center gap-1 mt-1">
                <ShieldCheck className={`w-3.5 h-3.5 ${isOwner ? 'text-indigo-600' : 'text-amber-600'}`} />
                <span className={`text-[10px] uppercase font-bold tracking-wide ${isOwner ? 'text-indigo-700' : 'text-amber-700'}`}>
                  {user.role} · {business.name}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="shrink-0 px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-4 h-4" /> Log out
          </button>
        </div>
      </div>

      {/* Shop profile (printed on bills) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-800 pb-2 border-b border-slate-100 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-slate-400" /> Shop Profile
        </h3>
        <p className="text-[10px] text-slate-400 -mt-2">This appears on every printed bill{isOwner ? '' : ' (only the owner can edit)'}.</p>

        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
            {bizLogo ? <img src={bizLogo} alt="logo" className="w-full h-full object-contain" /> : <Building2 className="w-6 h-6 text-slate-300" />}
          </div>
          {isOwner && (
            <div className="space-y-1.5">
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer transition-colors">
                <Upload className="w-3.5 h-3.5" /> Upload logo
                <input type="file" accept="image/*" onChange={handleLogoFile} className="hidden" />
              </label>
              {bizLogo && (
                <button onClick={() => setBizLogo('')} className="block text-[10px] text-rose-600 hover:underline cursor-pointer">Remove logo</button>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Shop Name</label>
            <input type="text" disabled={!isOwner} value={bizName} onChange={(e) => setBizName(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Phone</label>
            <input type="text" disabled={!isOwner} value={bizPhone} onChange={(e) => setBizPhone(e.target.value)} placeholder="e.g. 98765 43210" className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Address</label>
            <input type="text" disabled={!isOwner} value={bizAddress} onChange={(e) => setBizAddress(e.target.value)} placeholder="Shop No, Street, City, PIN" className={inputCls} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">GSTIN</label>
            <input type="text" disabled={!isOwner} value={bizGstin} onChange={(e) => setBizGstin(e.target.value)} placeholder="15-digit GSTIN" className={`${inputCls} font-mono`} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">UPI ID</label>
            <input type="text" disabled={!isOwner} value={bizUpi} onChange={(e) => setBizUpi(e.target.value)} placeholder="e.g. shopname@okhdfcbank" className={`${inputCls} font-mono`} />
            <p className="text-[10px] text-slate-400 mt-1">Shows a scan-to-pay UPI QR (with the amount) on every bill.</p>
          </div>
        </div>

        {isOwner && (
          <div className="flex justify-end">
            <button
              onClick={handleSaveProfile}
              disabled={profileSaving}
              className="px-5 py-2 rounded-lg text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {savedProfile ? <><Check className="w-4 h-4 text-emerald-400" /> Saved</> : profileSaving ? 'Saving…' : 'Save Shop Profile'}
            </button>
          </div>
        )}
      </div>

      {/* Team & invites (owner only) */}
      {isOwner && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-800 pb-2 border-b border-slate-100 flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-400" /> Team &amp; Invites
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Share this invite code so your staff can join <strong>{business.name}</strong> when they create an account.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-base font-bold tracking-[0.3em] text-slate-800 text-center">
              {business.joinCode}
            </code>
            <button
              onClick={copyJoinCode}
              className="px-4 py-2.5 rounded-lg text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              {copiedCode ? <><Check className="w-4 h-4 text-emerald-400" /> Copied</> : <><Copy className="w-4 h-4" /> Copy</>}
            </button>
          </div>
        </div>
      )}

      {/* Role */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-2">
        <h3 className="text-sm font-bold text-slate-800 pb-2 border-b border-slate-100">Role &amp; Permissions</h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          {isOwner
            ? 'You are the shop OWNER with full administrative access.'
            : 'You are a STAFF member: day-to-day billing and recovery. Some actions are reserved for the owner.'}
        </p>
      </div>

      {/* Integrations / status */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Server className="w-4 h-4 text-slate-400" /> AI &amp; WhatsApp Status
          </h3>
          <button
            onClick={() => void checkHealth()}
            disabled={healthLoading}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${healthLoading ? 'animate-spin' : ''}`} /> Recheck
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          <span className={`w-2.5 h-2.5 rounded-full ${health ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          <span className="text-xs font-bold text-slate-700">
            {healthLoading ? 'Checking…' : health ? 'Backend online' : 'Backend offline'}
          </span>
        </div>

        {health && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <p className="text-[10px] text-slate-400 uppercase font-bold mb-0.5 flex items-center gap-1"><Cpu className="w-3 h-3" /> AI Model</p>
              <p className={`font-bold ${health.aiConfigured ? 'text-emerald-600' : 'text-amber-600'}`}>
                {health.aiConfigured ? health.model : 'Not configured'}
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <p className="text-[10px] text-slate-400 uppercase font-bold mb-0.5 flex items-center gap-1"><MessageCircle className="w-3 h-3" /> WhatsApp Auto-send</p>
              <p className={`font-bold ${health.whatsappConfigured ? 'text-emerald-600' : 'text-slate-500'}`}>
                {health.whatsappConfigured ? 'Active' : 'Manual (one-click)'}
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <p className="text-[10px] text-slate-400 uppercase font-bold mb-0.5">Reminders</p>
              <p className="font-bold text-slate-700">{health.whatsappConfigured ? 'Auto + manual' : 'One-click send'}</p>
            </div>
          </div>
        )}
        {health && !health.whatsappConfigured && (
          <p className="text-[10px] text-slate-400">
            Set <code className="font-mono">WHATSAPP_TOKEN</code> &amp; <code className="font-mono">WHATSAPP_PHONE_ID</code> in the backend to enable hands-off auto-send. Until then, reminders send with one click via WhatsApp.
          </p>
        )}
        {healthError && (
          <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-lg p-3">{healthError}</p>
        )}
      </div>

      {/* Danger zone */}
      {isOwner && (
        <div className="bg-white rounded-2xl border border-rose-200 shadow-sm p-5 space-y-3">
          <h3 className="text-sm font-bold text-rose-700 pb-2 border-b border-rose-100">Danger Zone</h3>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-slate-600 leading-relaxed">
              Permanently delete all business data (customers, invoices, products, reminders). Your account is kept.
            </p>
            <button
              onClick={handleClear}
              className="shrink-0 px-4 py-2 rounded-xl text-xs font-bold border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" /> Clear all data
            </button>
          </div>
        </div>
      )}

      <p className="text-center text-[10px] text-slate-400 font-mono pb-2">CreditFlow · Ledgix v1.0.0</p>
    </div>
  );
}
