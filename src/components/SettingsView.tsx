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
  Store as StoreIcon,
  Plus,
  Lock,
  Unlock,
  CreditCard,
} from 'lucide-react';
import { UserRole, type User, type Account, type Store, type StaffMember } from '../types';
import {
  getHealth,
  createStore,
  lockStore,
  unlockStore,
  getAccount,
  listStaff,
  setStaffStores,
  type BackendHealth,
  type StoreProfileFields,
} from '../services/api';

interface SettingsViewProps {
  user: User;
  account: Account;
  stores: Store[];
  activeStore: Store;
  onLogout: () => void;
  onClearData: () => void;
  onUpdateStore: (fields: StoreProfileFields) => Promise<void>;
  onStoresChanged: (stores: Store[]) => void;
  onAccountChanged: (account: Account) => void;
  onSwitchStore: (id: string) => void;
  onGoToPlans: () => void;
}

const errMsg = (e: unknown): string => (e instanceof Error ? e.message : 'Something went wrong.');

export default function SettingsView({
  user,
  account,
  stores,
  activeStore,
  onLogout,
  onClearData,
  onUpdateStore,
  onStoresChanged,
  onAccountChanged,
  onSwitchStore,
  onGoToPlans,
}: SettingsViewProps) {
  const isOwner = user.role === UserRole.OWNER;
  const initials = user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const [copiedCode, setCopiedCode] = useState(false);

  const copyJoinCode = () => {
    navigator.clipboard.writeText(account.joinCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // ---- Active store profile (printed on its bills) ----
  const [bizName, setBizName] = useState(activeStore.name);
  const [bizAddress, setBizAddress] = useState(activeStore.address ?? '');
  const [bizGstin, setBizGstin] = useState(activeStore.gstIn ?? '');
  const [bizPhone, setBizPhone] = useState(activeStore.phone ?? '');
  const [bizUpi, setBizUpi] = useState(activeStore.upiVpa ?? '');
  const [bizGstRate, setBizGstRate] = useState(activeStore.gstRate ?? 18);
  const [bizLogo, setBizLogo] = useState(activeStore.logo ?? '');
  const [savedProfile, setSavedProfile] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);

  // Re-seed the form whenever the active store changes.
  useEffect(() => {
    setBizName(activeStore.name);
    setBizAddress(activeStore.address ?? '');
    setBizGstin(activeStore.gstIn ?? '');
    setBizPhone(activeStore.phone ?? '');
    setBizUpi(activeStore.upiVpa ?? '');
    setBizGstRate(activeStore.gstRate ?? 18);
    setBizLogo(activeStore.logo ?? '');
  }, [activeStore.id]);

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
    await onUpdateStore({
      name: bizName.trim() || activeStore.name,
      address: bizAddress.trim(),
      gstIn: bizGstin.trim(),
      phone: bizPhone.trim(),
      upiVpa: bizUpi.trim(),
      gstRate: Math.min(100, Math.max(0, bizGstRate)),
      logo: bizLogo,
    });
    setProfileSaving(false);
    setSavedProfile(true);
    setTimeout(() => setSavedProfile(false), 2000);
  };

  // ---- Stores management (owner) ----
  const [newStoreName, setNewStoreName] = useState('');
  const [storeBusy, setStoreBusy] = useState(false);
  const [storeError, setStoreError] = useState<string | null>(null);

  const storeLimit = account.limits.stores; // null = unlimited
  const atStoreLimit = storeLimit !== null && account.usage.stores >= storeLimit;

  const refreshAccount = async () => {
    try {
      const { account: a } = await getAccount();
      onAccountChanged(a);
    } catch {
      /* non-fatal */
    }
  };

  const handleAddStore = async () => {
    if (!newStoreName.trim()) return;
    setStoreBusy(true);
    setStoreError(null);
    try {
      const { stores: updated } = await createStore(newStoreName.trim());
      onStoresChanged(updated);
      setNewStoreName('');
      await refreshAccount();
    } catch (e) {
      setStoreError(errMsg(e));
    } finally {
      setStoreBusy(false);
    }
  };

  const handleToggleLock = async (store: Store) => {
    setStoreError(null);
    try {
      const { stores: updated } = store.locked ? await unlockStore(store.id) : await lockStore(store.id);
      onStoresChanged(updated);
      await refreshAccount();
    } catch (e) {
      setStoreError(errMsg(e));
    }
  };

  // ---- Staff management (owner) ----
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [staffLoaded, setStaffLoaded] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOwner) return;
    void (async () => {
      try {
        setStaff((await listStaff()).staff);
      } catch (e) {
        setStaffError(errMsg(e));
      } finally {
        setStaffLoaded(true);
      }
    })();
  }, [isOwner]);

  const toggleStaffStore = async (member: StaffMember, storeId: string) => {
    const has = member.storeIds.includes(storeId);
    const next = has ? member.storeIds.filter((s) => s !== storeId) : [...member.storeIds, storeId];
    // optimistic
    setStaff((prev) => prev.map((m) => (m.id === member.id ? { ...m, storeIds: next } : m)));
    try {
      const res = await setStaffStores(member.id, next);
      setStaff(res.staff);
    } catch (e) {
      setStaffError(errMsg(e));
      try {
        setStaff((await listStaff()).staff);
      } catch { /* ignore */ }
    }
  };

  // ---- Backend / AI status ----
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
    if (window.confirm(`Clear ALL data for the store "${activeStore.name}" (customers, invoices, products, reminders)? This cannot be undone.`)) {
      onClearData();
    }
  };

  const inputCls = 'w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500';
  const fmtLimit = (n: number | null) => (n === null ? '∞' : String(n));

  return (
    <div className="space-y-6 max-w-3xl">

      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm animate-fadeIn">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <UserCog className="w-5 h-5 text-indigo-600" /> Settings
        </h2>
        <p className="text-xs text-slate-400 mt-1">Manage your account, stores, staff, and shop profile.</p>
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
                  {user.role} · {account.name}
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

      {/* Plan & usage */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-slate-400" /> Plan &amp; Usage
          </h3>
          <button onClick={onGoToPlans} className="text-xs font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer">
            {isOwner ? 'Manage plan →' : 'View plans →'}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-extrabold uppercase">{account.limits.label}</span>
          <span className="text-xs text-slate-500">₹{account.limits.priceMonthly.toLocaleString('en-IN')}/mo</span>
        </div>
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <p className="text-[10px] text-slate-400 uppercase font-bold">Stores</p>
            <p className="font-bold text-slate-800">{account.usage.stores} / {fmtLimit(account.limits.stores)}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <p className="text-[10px] text-slate-400 uppercase font-bold">Staff</p>
            <p className="font-bold text-slate-800">{account.usage.staff} / {fmtLimit(account.limits.staff)}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <p className="text-[10px] text-slate-400 uppercase font-bold">Reminders / mo</p>
            <p className="font-bold text-slate-800">{account.usage.remindersThisMonth} / {fmtLimit(account.limits.reminderCap)}</p>
          </div>
        </div>
      </div>

      {/* Stores (owner only) */}
      {isOwner && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-800 pb-2 border-b border-slate-100 flex items-center gap-2">
            <StoreIcon className="w-4 h-4 text-slate-400" /> Stores
          </h3>
          <div className="space-y-2">
            {stores.map((s) => (
              <div key={s.id} className={`flex items-center justify-between gap-3 p-3 rounded-xl border text-xs ${s.id === activeStore.id ? 'border-indigo-200 bg-indigo-50/40' : 'border-slate-100 bg-slate-50/40'}`}>
                <div className="min-w-0">
                  <p className="font-bold text-slate-800 truncate flex items-center gap-1.5">
                    {s.name}
                    {s.id === activeStore.id && <span className="text-[9px] font-bold text-indigo-600 uppercase">active</span>}
                    {s.locked && <span className="text-[9px] font-bold text-rose-600 uppercase">locked</span>}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono">Join code: {s.joinCode}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {s.id !== activeStore.id && !s.locked && (
                    <button onClick={() => onSwitchStore(s.id)} className="px-2.5 py-1.5 rounded-lg bg-slate-900 text-white font-bold hover:bg-slate-800 transition-colors cursor-pointer">Switch</button>
                  )}
                  <button
                    onClick={() => handleToggleLock(s)}
                    className="px-2 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                    title={s.locked ? 'Unlock store' : 'Lock store'}
                  >
                    {s.locked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add store */}
          <div className="pt-1">
            {atStoreLimit ? (
              <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-2.5">
                You’ve reached your plan’s store limit ({fmtLimit(storeLimit)}). <button onClick={onGoToPlans} className="font-bold underline cursor-pointer">Upgrade</button> to add more.
              </p>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text" value={newStoreName} onChange={(e) => setNewStoreName(e.target.value)}
                  placeholder="New store name (e.g. MG Road Branch)"
                  className={inputCls}
                />
                <button
                  onClick={handleAddStore} disabled={storeBusy || !newStoreName.trim()}
                  className="shrink-0 px-3 py-2 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" /> Add store
                </button>
              </div>
            )}
            {storeError && <p className="text-[11px] text-rose-600 mt-2">{storeError}</p>}
          </div>
        </div>
      )}

      {/* Shop profile for the active store (printed on its bills) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-800 pb-2 border-b border-slate-100 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-slate-400" /> Shop Profile — <span className="text-indigo-700">{activeStore.name}</span>
        </h3>
        <p className="text-[10px] text-slate-400 -mt-2">Appears on every bill for this store{isOwner ? '' : ' (only the owner can edit)'}.</p>

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
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Default GST Rate (%)</label>
            <input
              type="number" min="0" max="100" step="0.5" disabled={!isOwner}
              value={bizGstRate}
              onChange={(e) => setBizGstRate(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
              className={inputCls}
            />
            <p className="text-[10px] text-slate-400 mt-1">Pre-fills the GST % on new bills; still editable per bill.</p>
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
            Share this code so staff can join <strong>{account.name}</strong> when they create an account. New staff start with access to your first store — assign more below.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-base font-bold tracking-[0.3em] text-slate-800 text-center">
              {account.joinCode}
            </code>
            <button
              onClick={copyJoinCode}
              className="px-4 py-2.5 rounded-lg text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              {copiedCode ? <><Check className="w-4 h-4 text-emerald-400" /> Copied</> : <><Copy className="w-4 h-4" /> Copy</>}
            </button>
          </div>

          {/* Staff access matrix */}
          <div className="pt-2">
            <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2">Staff store access</h4>
            {!staffLoaded ? (
              <p className="text-xs text-slate-400">Loading staff…</p>
            ) : staff.filter((m) => m.role === 'STAFF').length === 0 ? (
              <p className="text-xs text-slate-400">No staff yet. Share the code above to invite them.</p>
            ) : (
              <div className="space-y-3">
                {staff.filter((m) => m.role === 'STAFF').map((m) => (
                  <div key={m.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50/40">
                    <p className="text-xs font-bold text-slate-800">{m.name} <span className="font-normal text-slate-400">· {m.email}</span></p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {stores.map((s) => {
                        const on = m.storeIds.includes(s.id);
                        return (
                          <button
                            key={s.id}
                            onClick={() => toggleStaffStore(m, s.id)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${on ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                          >
                            {on ? <Check className="w-3 h-3 inline mr-1" /> : null}{s.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {staffError && <p className="text-[11px] text-rose-600 mt-2">{staffError}</p>}
          </div>
        </div>
      )}

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
              Permanently delete all data for <strong>{activeStore.name}</strong> (customers, invoices, products, reminders). Other stores and your account are kept.
            </p>
            <button
              onClick={handleClear}
              className="shrink-0 px-4 py-2 rounded-xl text-xs font-bold border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" /> Clear this store’s data
            </button>
          </div>
        </div>
      )}

      <p className="text-center text-[10px] text-slate-400 font-mono pb-2">CreditFlow · Ledgix v1.0.0</p>
    </div>
  );
}
