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
    <header className="sticky top-0 z-30 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <div
          onClick={onNavigateHome}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white flex items-center justify-center shadow-md shadow-indigo-600/30 group-hover:scale-105 transition-transform">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-white group-hover:text-indigo-300 transition-colors">
                AuthVault
              </span>
              <span className="hidden sm:inline-flex text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                v2.4 Secure
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
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
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Demo Switcher</span>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>

            {showAccountMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-2 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800 mb-1">
                  Test Personas
                </div>

                <div className="space-y-1">
                  {accounts.slice(0, 3).map(acc => {
                    const pass = acc.email.includes('alex') ? 'CyberVault#2026' : 'Password123!';
                    return (
                      <button
                        key={acc.id}
                        onClick={() => handleQuickLoginAs(acc.email, pass)}
                        className="w-full text-left p-2 rounded-lg hover:bg-slate-800/80 transition-colors flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-2">
                          <img
                            src={acc.avatarUrl}
                            alt=""
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
                      </button>
                    );
                  })}
                </div>

                <div className="border-t border-slate-800 mt-2 pt-1.5 space-y-1">
                  <button
                    onClick={() => {
                      setShowAccountMenu(false);
                      onOpenRecovery();
                    }}
                    className="w-full text-left px-2 py-1.5 rounded text-xs text-indigo-400 hover:bg-slate-800 font-medium"
                  >
                    Test Account Recovery
                  </button>
                  <button
                    onClick={() => {
                      setShowAccountMenu(false);
                      handleResetDemo();
                    }}
                    className="w-full text-left px-2 py-1.5 rounded text-xs text-rose-400 hover:bg-slate-800 font-medium flex items-center gap-1.5"
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
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <button
                onClick={lockSession}
                title="Lock App"
                className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <Lock className="w-4 h-4 text-indigo-400" />
              </button>

              <button
                onClick={logout}
                title="Log out"
                className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>

              <div className="hidden md:flex items-center gap-2">
                <img
                  src={currentUser.avatarUrl}
                  alt=""
                  className="w-8 h-8 rounded-full border border-indigo-500/40 bg-slate-800"
                />
              </div>
            </div>
          ) : (
            <button
              onClick={onNavigateHome}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
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
