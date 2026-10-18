import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { LoginCard } from './components/LoginCard';
import { RegisterCard } from './components/RegisterCard';
import { RecoveryFlow } from './components/RecoveryFlow';
import { Dashboard } from './components/Dashboard';
import { TwoFactorModal } from './components/TwoFactorModal';
import { LockScreen } from './components/LockScreen';
import { VirtualMailbox } from './components/VirtualMailbox';
import { Shield, Key, Mail, Lock, ShieldCheck, CheckCircle } from 'lucide-react';

function MainAppContent() {
  const {
    currentUser,
    isLoading,
    isLocked,
    pending2FAUser,
    activeResetToken,
    setActiveResetToken,
  } = useAuth();

  const [authView, setAuthView] = useState<'login' | 'register' | 'recovery'>('login');
  const [recoveryIdentifier, setRecoveryIdentifier] = useState('');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 animate-pulse mb-4">
          <Shield className="w-8 h-8" />
        </div>
        <p className="text-sm font-semibold text-slate-300">Initializing AuthVault Security Core...</p>
      </div>
    );
  }

  const handleStartRecovery = (ident?: string) => {
    setRecoveryIdentifier(ident || '');
    setAuthView('recovery');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white relative">
      {/* Top Navbar */}
      <Navbar
        onNavigateHome={() => {
          if (!currentUser) setAuthView('login');
        }}
        onOpenRecovery={() => handleStartRecovery()}
      />

      {/* Main Container */}
      <main className="flex-1 flex flex-col justify-center px-4 py-8 sm:py-12 max-w-7xl mx-auto w-full">
        {currentUser ? (
          // Authenticated State
          <>
            {isLocked && <LockScreen />}
            <Dashboard />
          </>
        ) : (
          // Unauthenticated State (Login / Register / Recovery)
          <div className="flex flex-col items-center justify-center">
            {/* Feature Highlights Pills above the cards */}
            <div className="flex flex-wrap items-center justify-center gap-2 mb-8 max-w-xl text-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300 shadow-sm">
                <Mail className="w-3.5 h-3.5 text-indigo-400" />
                <span>6-Digit Email OTP</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300 shadow-sm">
                <Key className="w-3.5 h-3.5 text-cyan-400" />
                <span>16-Char Emergency Keys</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300 shadow-sm">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Hashed Security Questions</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300 shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Brute-force Shield</span>
              </span>
            </div>

            {/* View Switcher */}
            {authView === 'login' && (
              <LoginCard
                onGoToRegister={() => setAuthView('register')}
                onGoToRecovery={handleStartRecovery}
                onLoginSuccess={() => {}}
              />
            )}

            {authView === 'register' && (
              <RegisterCard
                onBackToLogin={() => setAuthView('login')}
                onRegisteredSuccess={() => {}}
              />
            )}

            {authView === 'recovery' && (
              <RecoveryFlow
                initialIdentifier={recoveryIdentifier}
                initialResetToken={activeResetToken}
                onBackToLogin={() => {
                  setAuthView('login');
                  setActiveResetToken(null);
                }}
                onSuccessLogin={() => {
                  setAuthView('login');
                  setActiveResetToken(null);
                }}
              />
            )}
          </div>
        )}
      </main>

      {/* Footer Info */}
      <footer className="border-t border-slate-900 py-6 px-4 text-center text-xs text-slate-500">
        <div className="flex items-center justify-center gap-2 mb-1">
          <ShieldCheck className="w-4 h-4 text-indigo-400" />
          <span className="font-semibold text-slate-400">AuthVault Enterprise Authentication Standard</span>
        </div>
        <p>
          End-to-end cryptographic hashing, multi-option recovery verification, and active session protection.
        </p>
      </footer>

      {/* 2FA Challenge Modal */}
      {pending2FAUser && (
        <TwoFactorModal
          onSuccess={() => {}}
          onFallbackToRecovery={ident => {
            handleStartRecovery(ident);
          }}
        />
      )}

      {/* Simulated Security Mailbox Drawer (Always present for OTP & recovery link inspection) */}
      <VirtualMailbox
        onSelectResetToken={token => {
          setActiveResetToken(token);
          setAuthView('recovery');
        }}
        onAutofillOtp={() => {
          if (authView !== 'recovery') {
            setAuthView('recovery');
          }
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
