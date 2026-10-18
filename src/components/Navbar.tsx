import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  RotateCcw,
  User,
  LogOut,
  Lock,
  ChevronDown,
  Sparkles,
} from 'lucide-react';

interface Props {
  onNavigateHome: () => void;
  onOpenRecovery: () => void;
}

export const Navbar: React.FC<Props> = ({ onNavigateHome, onOpenRecovery }) => {
  const { currentUser, logout, lockSession, resetDemoData, accounts, login } = useAuth();
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleResetDemo = async () => {
    if (confirm('Reset database back to default demonstration accounts?')) {
      setIsResetting(true);
      await resetDemoData();
      setIsResetting(false);
      onNavigateHome();
    }
  };

  const handleQuickLoginAs = async (email: string, pass: string) => {
    setShowAccountMenu(false);
    await login(email, pass, true);
  };

  return (
    <header className="sticky top-0 z-30 w-full border-b border-slate-200/90 bg-white/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <div
          onClick={onNavigateHome}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">
                AuthVault
              </span>
              <span className="hidden sm:inline-flex text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60 font-semibold">
                v2.4 Secure
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              Multi-Layer Authentication & Secure Recovery
            </p>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Demo Switcher dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowAccountMenu(prev => !prev)}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">Demo Switcher</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showAccountMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-2 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                  Test Personas
                </div>

                <div className="space-y-1">
                  {accounts.slice(0, 3).map(acc => {
                    const pass = acc.email.includes('alex') ? 'CyberVault#2026' : 'Password123!';
                    return (
                      <button
                        key={acc.id}
                        onClick={() => handleQuickLoginAs(acc.email, pass)}
                        className="w-full text-left p-2 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-2">
                          <img
                            src={acc.avatarUrl}
                            alt=""
                            className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200"
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
                      </button>
                    );
                  })}
                </div>

                <div className="border-t border-slate-100 mt-2 pt-1.5 space-y-1">
                  <button
                    onClick={() => {
                      setShowAccountMenu(false);
                      onOpenRecovery();
                    }}
                    className="w-full text-left px-2 py-1.5 rounded text-xs text-indigo-600 hover:bg-indigo-50 font-medium"
                  >
                    Test Account Recovery
                  </button>
                  <button
                    onClick={() => {
                      setShowAccountMenu(false);
                      handleResetDemo();
                    }}
                    className="w-full text-left px-2 py-1.5 rounded text-xs text-rose-600 hover:bg-rose-50 font-medium flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Demo Database</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Status / Account */}
          {currentUser ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <button
                onClick={lockSession}
                title="Lock App"
                className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-xs transition-colors"
              >
                <Lock className="w-4 h-4 text-indigo-600" />
              </button>

              <button
                onClick={logout}
                title="Log out"
                className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-rose-600 hover:bg-rose-50 shadow-xs transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>

              <div className="hidden md:flex items-center gap-2">
                <img
                  src={currentUser.avatarUrl}
                  alt=""
                  className="w-8 h-8 rounded-full border border-indigo-200 bg-slate-100 shadow-xs"
                />
              </div>
            </div>
          ) : (
            <button
              onClick={onNavigateHome}
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
            >
              <User className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
