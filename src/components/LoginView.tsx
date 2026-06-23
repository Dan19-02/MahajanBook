import React, { useState } from 'react';
import { ShieldCheck, Loader2, Building2, KeyRound } from 'lucide-react';
import { login, register } from '../services/api';
import type { User, Business } from '../types';

interface LoginViewProps {
  onAuthenticated: (token: string, user: User, business: Business) => void;
}

export default function LoginView({ onAuthenticated }: LoginViewProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [regMode, setRegMode] = useState<'create' | 'join'>('create');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isRegister = mode === 'register';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = isRegister
        ? await register(
            name.trim(),
            email.trim(),
            password,
            regMode === 'join' ? { inviteCode: inviteCode.trim() } : { businessName: businessName.trim() },
          )
        : await login(email.trim(), password);
      onAuthenticated(result.token, result.user, result.business);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-900">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-extrabold text-xl mb-3">
            C
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-800">CreditFlow</h1>
          <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider">SaaS India POS</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          {/* Login / Register tabs */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl mb-5">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(null); }}
              className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                !isRegister ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(null); }}
              className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                isRegister ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            {isRegister && (
              <>
                {/* Create new business vs join existing */}
                <div className="grid grid-cols-2 gap-1 p-1 bg-slate-50 rounded-lg border border-slate-100">
                  <button
                    type="button"
                    onClick={() => { setRegMode('create'); setError(null); }}
                    className={`py-1.5 text-[11px] font-bold rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      regMode === 'create' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" /> New business
                  </button>
                  <button
                    type="button"
                    onClick={() => { setRegMode('join'); setError(null); }}
                    className={`py-1.5 text-[11px] font-bold rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      regMode === 'join' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    <KeyRound className="w-3.5 h-3.5" /> Join with code
                  </button>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Your Name</label>
                  <input
                    type="text" required value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rajesh Gupta" autoComplete="off"
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {regMode === 'create' ? (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Business Name</label>
                    <input
                      type="text" required value={businessName} onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g. Sharma General Store" autoComplete="off"
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Invite Code</label>
                    <input
                      type="text" required value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                      placeholder="From your shop owner" autoComplete="off"
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 font-mono tracking-widest"
                    />
                  </div>
                )}
              </>
            )}

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Email</label>
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@shop.in" autoComplete="off"
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Password</label>
              <input
                type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder={isRegister ? 'At least 6 characters' : '••••••••'} autoComplete="new-password"
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-xs rounded-lg font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Please wait…</>
              ) : (
                isRegister ? (regMode === 'join' ? 'Join Business' : 'Create Business') : 'Sign In'
              )}
            </button>
          </form>

          {isRegister && regMode === 'create' && (
            <p className="text-[10px] text-slate-400 mt-4 flex items-center gap-1.5 justify-center">
              <ShieldCheck className="w-3.5 h-3.5" /> You'll be the owner. Invite staff later with a code.
            </p>
          )}
        </div>

        <p className="text-center text-[10px] text-slate-400 mt-6">CreditFlow · Ledgix v1.0.0</p>
      </div>
    </div>
  );
}
