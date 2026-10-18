import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, ArrowRight, LogOut, AlertCircle, RefreshCw } from 'lucide-react';

export const LockScreen: React.FC = () => {
  const { currentUser, unlockSession, logout } = useAuth();
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!currentUser) return null;

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    const ok = await unlockSession(password);
    setIsSubmitting(false);

    if (!ok) {
      setErrorMessage('Incorrect password.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <div className="w-full max-w-sm text-center bg-white border border-slate-200/90 rounded-2xl p-7 shadow-2xl">
        <div className="relative inline-block mb-4">
          <img
            src={currentUser.avatarUrl}
            alt={currentUser.name}
            className="w-20 h-20 rounded-full mx-auto border-2 border-indigo-600 shadow-md bg-slate-100"
          />
          <div className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-white border border-slate-200 text-indigo-600 shadow-xs">
            <Lock className="w-4 h-4" />
          </div>
        </div>

        <h3 className="text-xl font-bold text-slate-900 mb-1">
          {currentUser.name}
        </h3>
        <p className="text-xs text-slate-500 font-mono mb-6">
          {currentUser.email}
        </p>

        {errorMessage && (
          <div className="mb-4 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleUnlock} className="space-y-3">
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Enter password to unlock"
            autoFocus
            className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-center font-mono focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 text-sm"
          />

          <button
            type="submit"
            disabled={isSubmitting || !password}
            className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-sm shadow-xs transition-all flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Unlock Session</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-100">
          <button
            onClick={logout}
            className="text-xs text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1.5 mx-auto transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign out or switch account</span>
          </button>
        </div>
      </div>
    </div>
  );
};
