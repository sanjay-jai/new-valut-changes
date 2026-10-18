import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

interface Props {
  onGoToRegister: () => void;
  onGoToRecovery: (identifier?: string) => void;
  onLoginSuccess: () => void;
}

export const LoginCard: React.FC<Props> = ({
  onGoToRegister,
  onGoToRecovery,
  onLoginSuccess,
}) => {
  const { login, accounts } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Rate limiting / lock protection simulation
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTimer, setLockoutTimer] = useState(0);

  useEffect(() => {
    if (lockoutTimer <= 0) return;
    const interval = setInterval(() => {
      setLockoutTimer(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutTimer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (lockoutTimer > 0) {
      setErrorMessage(`Too many failed attempts. Security cooldown active for ${lockoutTimer}s.`);
      return;
    }

    if (!identifier.trim() || !password) {
      setErrorMessage('Please enter both your email/username and password.');
      return;
    }

    setIsSubmitting(true);
    const result = await login(identifier, password, rememberMe);
    setIsSubmitting(false);

    if (!result.success) {
      const nextFailures = failedAttempts + 1;
      setFailedAttempts(nextFailures);
      if (nextFailures >= 5) {
        setLockoutTimer(30);
        setErrorMessage('Security lock engaged: 5 failed attempts. Please wait 30 seconds or use Account Recovery.');
      } else {
        setErrorMessage(result.error || 'Authentication failed. Please check credentials.');
      }
      return;
    }

    // Success (or 2FA required modal will open via context)
    setFailedAttempts(0);
    onLoginSuccess();
  };

  const fillDemo = (email: string, pass: string) => {
    setIdentifier(email);
    setPassword(pass);
    setErrorMessage(null);
  };

  return (
    <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-sm backdrop-blur-md relative overflow-hidden transition-all">
      {/* Decorative ambient glows */}
      <div className="absolute -top-20 -right-20 w-44 h-44 bg-indigo-50 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-44 h-44 bg-slate-50 rounded-full blur-2xl pointer-events-none" />

      {/* Brand Header */}
      <div className="text-center mb-6">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center mx-auto mb-3 shadow-xs">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          Welcome to AuthVault
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Secure identity authentication & multi-layered recovery
        </p>
      </div>

      {/* Error / Cooldown Notice */}
      {errorMessage && (
        <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium leading-relaxed">{errorMessage}</div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
            Email or Username
          </label>
          <div className="relative">
            <input
              type="text"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              placeholder="name@company.com or username"
              disabled={lockoutTimer > 0}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all text-sm"
            />
            <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Password
            </label>
            <button
              type="button"
              onClick={() => onGoToRecovery(identifier)}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••••••"
              disabled={lockoutTimer > 0}
              className="w-full pl-10 pr-10 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all text-sm font-mono"
            />
            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <button
              type="button"
              onClick={() => setShowPassword(p => !p)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs pt-1">
          <label className="flex items-center gap-2 cursor-pointer text-slate-600 select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={e => setRememberMe(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span>Remember this device</span>
          </label>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || lockoutTimer > 0}
          className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-sm shadow-xs transition-all flex items-center justify-center gap-2 mt-2"
        >
          {isSubmitting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Verifying Credentials...</span>
            </>
          ) : (
            <>
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* One-Click Demo Accounts */}
      <div className="mt-6 pt-5 border-t border-slate-100">
        <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium mb-2.5">
          <span className="flex items-center gap-1 font-semibold text-slate-600">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            1-Click Demo Profiles
          </span>
          <span className="text-[10px] text-slate-400">Instant test</span>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {accounts.slice(0, 2).map(acc => {
            const pass = acc.email.includes('alex') ? 'CyberVault#2026' : 'Password123!';
            return (
              <button
                key={acc.id}
                type="button"
                onClick={() => fillDemo(acc.email, pass)}
                className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/40 text-left transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-2.5">
                  <img
                    src={acc.avatarUrl}
                    alt={acc.name}
                    className="w-6 h-6 rounded-full bg-slate-200 border border-slate-300/50"
                  />
                  <div>
                    <div className="text-xs font-semibold text-slate-800 group-hover:text-indigo-600">
                      {acc.name}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {acc.email}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                    acc.twoFactorEnabled
                      ? 'bg-purple-50 text-purple-700 border border-purple-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}>
                    {acc.twoFactorEnabled ? '2FA Enabled' : 'Standard'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Register Footer */}
      <div className="mt-6 text-center text-xs text-slate-500">
        Don&apos;t have an account yet?{' '}
        <button
          onClick={onGoToRegister}
          className="font-semibold text-indigo-600 hover:text-indigo-700 underline underline-offset-2 ml-1"
        >
          Create an account
        </button>
      </div>
    </div>
  );
};
