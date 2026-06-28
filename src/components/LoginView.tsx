import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, Loader2, Building2, KeyRound, BookText, ArrowLeft } from 'lucide-react';
import {
  login,
  register,
  googleAuthExchange,
  googleOAuthStartUrl,
  isGoogleAuthEnabled,
  isNeedsBusiness,
  type Session,
  type RegisterOptions,
} from '../services/api';

interface LoginViewProps {
  onAuthenticated: (session: Session) => void;
}

/** Google "G" mark (lucide has no brand icons). */
const GoogleIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 18 18" aria-hidden="true">
    <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
    <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.02-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
    <path fill="#FBBC05" d="M3.98 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.02-2.33Z" />
    <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.02 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
  </svg>
);

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

  // Google "finish setup" step: a brand-new Google user must create or join a business.
  const [googleStep, setGoogleStep] = useState<{ token: string; email: string; name: string } | null>(null);

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
      onAuthenticated(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  // After butterbase redirects back with ?access_token=…, exchange it for a session.
  const handledRedirect = useRef(false);
  useEffect(() => {
    if (handledRedirect.current) return;
    const params = new URLSearchParams(window.location.search);
    const bbToken = params.get('access_token');
    if (!bbToken) return;
    handledRedirect.current = true;
    // Strip the token from the URL so it isn't reprocessed or left in history.
    window.history.replaceState({}, document.title, `${window.location.origin}/`);

    setLoading(true);
    googleAuthExchange(bbToken)
      .then((result) => {
        if (isNeedsBusiness(result)) {
          setGoogleStep({ token: bbToken, email: result.profile.email, name: result.profile.name });
          setMode('register');
          setRegMode('create');
        } else {
          onAuthenticated(result);
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Google sign-in failed.'))
      .finally(() => setLoading(false));
  }, [onAuthenticated]);

  const startGoogle = () => {
    setError(null);
    window.location.href = googleOAuthStartUrl();
  };

  const completeGoogleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleStep) return;
    setError(null);
    setLoading(true);
    try {
      const opts: RegisterOptions = regMode === 'join' ? { inviteCode: inviteCode.trim() } : { businessName: businessName.trim() };
      const result = await googleAuthExchange(googleStep.token, opts);
      if (isNeedsBusiness(result)) {
        setError('Please enter your business name or a valid invite code.');
      } else {
        onAuthenticated(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not finish setting up your account.');
    } finally {
      setLoading(false);
    }
  };

  // --- "Finish Google sign-up" step ---
  if (googleStep) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-900">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white mb-3">
              <BookText className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-800">Almost there</h1>
            <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider">Finish setting up</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <p className="text-sm text-slate-600 mb-1">
              Signed in as <span className="font-semibold text-slate-800">{googleStep.email}</span>.
            </p>
            <p className="text-xs text-slate-400 mb-5">Create your shop, or join one with an invite code.</p>

            <form onSubmit={completeGoogleSetup} className="space-y-4">
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

              {error && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-xs rounded-lg font-medium">{error}</div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Please wait…</> : (regMode === 'join' ? 'Join Business' : 'Create Business')}
              </button>
            </form>

            <button
              type="button"
              onClick={() => { setGoogleStep(null); setError(null); setBusinessName(''); setInviteCode(''); }}
              className="mt-4 w-full flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Use a different account
            </button>
          </div>

          <p className="text-center text-[10px] text-slate-400 mt-6">MahajanBook v1.0.0</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-900">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white mb-3">
            <BookText className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-800">MahajanBook</h1>
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

          {/* Google sign-in */}
          {isGoogleAuthEnabled() && (
            <>
              <div className="flex items-center gap-3 my-5">
                <div className="h-px bg-slate-200 flex-1" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">or</span>
                <div className="h-px bg-slate-200 flex-1" />
              </div>
              <button
                type="button"
                onClick={startGoogle}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-semibold text-slate-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <GoogleIcon /> Continue with Google
              </button>
            </>
          )}

          {isRegister && regMode === 'create' && (
            <p className="text-[10px] text-slate-400 mt-4 flex items-center gap-1.5 justify-center">
              <ShieldCheck className="w-3.5 h-3.5" /> You'll be the owner. Invite staff later with a code.
            </p>
          )}
        </div>

        <p className="text-center text-[10px] text-slate-400 mt-6">MahajanBook v1.0.0</p>
      </div>
    </div>
  );
}
