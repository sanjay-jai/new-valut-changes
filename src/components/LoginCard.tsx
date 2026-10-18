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
    <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden transition-all">
      {/* Decorative ambient glows */}
      <div className="absolute -top-20 -right-20 w-44 h-44 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-44 h-44 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="text-center mb-6">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white flex items-center justify-center mx-auto mb-3 shadow-lg shadow-indigo-500/20">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">
          Welcome to AuthVault
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Secure identity authentication & multi-layered recovery
        </p>
      </div>

      {/* Error / Cooldown Notice */}
      {errorMessage && (
        <div className="mb-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium leading-relaxed">{errorMessage}</div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            Email or Username
          </label>
          <div className="relative">
            <input
              type="text"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              placeholder="name@company.com or username"
              disabled={lockoutTimer > 0}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950/70 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
            />
            <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Password
            </label>
            <button
              type="button"
              onClick={() => onGoToRecovery(identifier)}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
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
              className="w-full pl-10 pr-10 py-3 rounded-xl bg-slate-950/70 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm font-mono"
            />
            <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <button
              type="button"
              onClick={() => setShowPassword(p => !p)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs pt-1">
          <label className="flex items-center gap-2 cursor-pointer text-slate-300 select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={e => setRememberMe(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-indigo-500 focus:ring-0 focus:ring-offset-0"
            />
            <span>Remember this device</span>
          </label>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || lockoutTimer > 0}
          className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-sm shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 mt-2"
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
      <div className="mt-6 pt-5 border-t border-slate-800/80">
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium mb-2.5">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            1-Click Demo Profiles
          </span>
          <span className="text-[10px] text-slate-500">Instant test</span>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {accounts.slice(0, 2).map(acc => {
            const pass = acc.email.includes('alex') ? 'CyberVault#2026' : 'Password123!';
            return (
              <button
                key={acc.id}
                type="button"
                onClick={() => fillDemo(acc.email, pass)}
                className="w-full p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/60 text-left transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-2">
                  <img
                    src={acc.avatarUrl}
                    alt={acc.name}
                    className="w-6 h-6 rounded-full bg-slate-800"
                  />
                  <div>
                    <div className="text-xs font-semibold text-slate-200 group-hover:text-white">
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
                      ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                      : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
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
      <div className="mt-6 text-center text-xs text-slate-400">
        Don&apos;t have an account yet?{' '}
        <button
          onClick={onGoToRegister}
          className="font-semibold text-indigo-400 hover:text-indigo-300 underline underline-offset-2 ml-1"
        >
          Create an account
        </button>
      </div>
    </div>
  );
};
