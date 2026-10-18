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
      <div className="min-h-screen bg-slate-100/80 flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-200/80 flex items-center justify-center text-indigo-600 animate-pulse mb-4 shadow-sm">
          <Shield className="w-8 h-8" />
        </div>
        <p className="text-sm font-semibold text-slate-700">Initializing AuthVault Security Core...</p>
      </div>
    );
  }

  const handleStartRecovery = (ident?: string) => {
    setRecoveryIdentifier(ident || '');
    setAuthView('recovery');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100/75 text-slate-900 selection:bg-indigo-500 selection:text-white relative font-sans overflow-x-hidden">
      {/* Professional subtle ambient backdrop pattern */}
      <div className="absolute inset-0 pointer-events-none -z-10 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_70%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-70" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-80 -z-10 bg-gradient-to-b from-indigo-100/60 via-slate-100/30 to-transparent blur-3xl pointer-events-none" />

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
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 text-xs text-slate-700 shadow-xs">
                <Mail className="w-3.5 h-3.5 text-indigo-600" />
                <span>6-Digit Email OTP</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 text-xs text-slate-700 shadow-xs">
                <Key className="w-3.5 h-3.5 text-cyan-600" />
                <span>16-Char Emergency Keys</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 text-xs text-slate-700 shadow-xs">
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                <span>Hashed Security Questions</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 text-xs text-slate-700 shadow-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
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
      <footer className="border-t border-slate-200/90 py-6 px-4 text-center text-xs text-slate-500 bg-white/40">
        <div className="flex items-center justify-center gap-2 mb-1">
          <ShieldCheck className="w-4 h-4 text-indigo-600" />
          <span className="font-semibold text-slate-700">AuthVault Enterprise Authentication Standard</span>
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
