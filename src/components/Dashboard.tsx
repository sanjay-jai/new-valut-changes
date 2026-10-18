import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  Key,
  Lock,
  Smartphone,
  Laptop,
  Globe,
  Clock,
  RefreshCw,
  LogOut,
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
  Eye,
  EyeOff,
  History,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { analyzePassword, PRESET_SECURITY_QUESTIONS } from '../utils/security';
import confetti from 'canvas-confetti';

export const Dashboard: React.FC = () => {
  const {
    currentUser,
    logout,
    lockSession,
    changePassword,
    regenerateBackupCodes,
    toggle2FA,
    updateSecurityQuestions,
    revokeSession,
    revokeAllOtherSessions,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'recovery' | 'password' | 'sessions' | 'logs'>('recovery');

  // Change Password State
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isChangingPass, setIsChangingPass] = useState(false);

  // Backup codes
  const [showCodes, setShowCodes] = useState(false);
  const [hasCopiedCodes, setHasCopiedCodes] = useState(false);
  const [isRegeneratingCodes, setIsRegeneratingCodes] = useState(false);

  // Security questions modal/editor
  const [isEditingQuestions, setIsEditingQuestions] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(PRESET_SECURITY_QUESTIONS[0]);
  const [newAnswer, setNewAnswer] = useState('');
  const [questionsSaved, setQuestionsSaved] = useState(false);

  if (!currentUser) return null;

  // Calculate Security Score
  let securityScore = 40; // baseline
  if (currentUser.twoFactorEnabled) securityScore += 25;
  if (currentUser.backupCodes && currentUser.backupCodes.length >= 3) securityScore += 20;
  if (currentUser.securityQuestions && currentUser.securityQuestions.length > 0) securityScore += 15;
  securityScore = Math.min(100, securityScore);

  const newPassAnalysis = analyzePassword(newPass);

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus(null);

    if (newPassAnalysis.score < 2) {
      setPasswordStatus({ type: 'error', message: 'New password is too weak.' });
      return;
    }

    if (newPass !== confirmPass) {
      setPasswordStatus({ type: 'error', message: 'New passwords do not match.' });
      return;
    }

    setIsChangingPass(true);
    const result = await changePassword(currentPass, newPass);
    setIsChangingPass(false);

    if (!result.success) {
      setPasswordStatus({ type: 'error', message: result.error || 'Failed to change password.' });
      return;
    }

    setPasswordStatus({ type: 'success', message: 'Password updated successfully!' });
    setCurrentPass('');
    setNewPass('');
    setConfirmPass('');

    try {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    } catch {
      // safe fallback
    }
  };

  const handleRegenerateCodes = async () => {
    if (!confirm('Generating new emergency backup recovery codes will immediately invalidate all previous backup codes. Do you want to proceed?')) {
      return;
    }
    setIsRegeneratingCodes(true);
    await regenerateBackupCodes();
    setIsRegeneratingCodes(false);
    setShowCodes(true);
  };

  const copyBackupCodes = () => {
    const text = `AUTHLOGIN EMERGENCY BACKUP CODES\nUser: ${currentUser.email}\nGenerated: ${new Date().toISOString()}\n\n${currentUser.backupCodes.join('\n')}`;
    navigator.clipboard.writeText(text);
    setHasCopiedCodes(true);
    setTimeout(() => setHasCopiedCodes(false), 2500);
  };

  const handleSaveSecurityQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnswer.trim()) return;

    await updateSecurityQuestions([
      {
        question: selectedQuestion,
        answer: newAnswer,
      },
    ]);

    setQuestionsSaved(true);
    setTimeout(() => {
      setQuestionsSaved(false);
      setIsEditingQuestions(false);
      setNewAnswer('');
    }, 1200);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Top Profile & Health Score Header Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-indigo-500/10 via-transparent to-transparent pointer-events-none rounded-full blur-2xl" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative">
          {/* User info */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                className="w-16 h-16 rounded-2xl border-2 border-indigo-500/40 shadow-lg object-cover bg-slate-800"
              />
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-900" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {currentUser.name}
                </h1>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  @{currentUser.username}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                {currentUser.email}
              </p>
              <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Member since {new Date(currentUser.createdAt).toLocaleDateString()}
                </span>
                <span>•</span>
                <span className="text-emerald-400 font-medium">Session Active</span>
              </div>
            </div>
          </div>

          {/* Security Score Widget & Quick Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                Security Health Score
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-extrabold ${
                  securityScore >= 80 ? 'text-emerald-400' : securityScore >= 60 ? 'text-amber-400' : 'text-rose-400'
                }`}>
                  {securityScore}%
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {securityScore >= 80 ? 'Fortress Level' : securityScore >= 60 ? 'Good Protection' : 'Needs Attention'}
                </span>
              </div>
              <div className="w-36 h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    securityScore >= 80 ? 'bg-emerald-400' : securityScore >= 60 ? 'bg-amber-400' : 'bg-rose-400'
                  }`}
                  style={{ width: `${securityScore}%` }}
                />
              </div>
            </div>

            <div className="h-10 w-px bg-slate-800 hidden sm:block" />

            {/* Quick Session Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={lockSession}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700/60"
              >
                <Lock className="w-3.5 h-3.5 text-indigo-400" />
                <span>Lock</span>
              </button>

              <button
                onClick={logout}
                className="px-3 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-rose-500/20"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tab navigation bar */}
        <div className="flex items-center gap-1 sm:gap-2 mt-6 pt-4 border-t border-slate-800 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('recovery')}
            className={`px-3.5 py-2 rounded-xl font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'recovery'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>Recovery & 2FA</span>
          </button>

          <button
            onClick={() => setActiveTab('password')}
            className={`px-3.5 py-2 rounded-xl font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'password'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Change Password</span>
          </button>

          <button
            onClick={() => setActiveTab('sessions')}
            className={`px-3.5 py-2 rounded-xl font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'sessions'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Laptop className="w-4 h-4" />
            <span>Active Sessions ({currentUser.activeSessions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`px-3.5 py-2 rounded-xl font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'logs'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Audit Trail</span>
          </button>
        </div>
      </div>

      {/* TAB CONTENT */}

      {/* 1. RECOVERY & 2FA TAB */}
      {activeTab === 'recovery' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card: Emergency Backup Codes */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Emergency Backup Keys
                  </h3>
                  <p className="text-xs text-slate-400">
                    {currentUser.backupCodes.length} remaining active keys
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowCodes(prev => !prev)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title={showCodes ? 'Hide codes' : 'Reveal codes'}
              >
                {showCodes ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Keep these 16-character backup codes stored in a password manager. If you ever lose access to your primary email, each code can restore account access once.
            </p>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs mb-4">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[11px] font-sans text-slate-400">
                <span>Single-Use Passkeys</span>
                {showCodes && currentUser.backupCodes.length > 0 && (
                  <button
                    onClick={copyBackupCodes}
                    className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-semibold"
                  >
                    {hasCopiedCodes ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy All</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {currentUser.backupCodes.length === 0 ? (
                <div className="text-center py-3 text-rose-400 text-xs">
                  All backup codes have been consumed! Regenerate immediately.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-1.5">
                  {currentUser.backupCodes.map((code, idx) => (
                    <div
                      key={idx}
                      className="p-1.5 rounded bg-slate-900 border border-slate-800/80 text-center tracking-wider text-cyan-300 select-all"
                    >
                      {showCodes ? code : '••••-••••-••••-••••'}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleRegenerateCodes}
              disabled={isRegeneratingCodes}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700/60 transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRegeneratingCodes ? 'animate-spin' : ''}`} />
              <span>Regenerate New Backup Codes</span>
            </button>
          </div>

          {/* Card: Two-Factor Authentication & Security Questions */}
          <div className="space-y-6">
            {/* 2FA Card */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-xl">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      Two-Factor Authentication (2FA)
                    </h3>
                    <p className="text-xs text-slate-400">
                      Requires 6-digit Authenticator code on sign in
                    </p>
                  </div>
                </div>

                {/* 2FA Toggle Switch */}
                <button
                  type="button"
                  onClick={toggle2FA}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out ${
                    currentUser.twoFactorEnabled ? 'bg-purple-600' : 'bg-slate-800'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                      currentUser.twoFactorEnabled ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="text-xs text-slate-400 leading-relaxed pt-2">
                Status:{' '}
                <strong className={currentUser.twoFactorEnabled ? 'text-purple-300' : 'text-slate-400'}>
                  {currentUser.twoFactorEnabled ? 'Enabled & Enforced' : 'Disabled'}
                </strong>
                {currentUser.twoFactorEnabled && (
                  <div className="mt-2 p-2.5 rounded-lg bg-purple-950/20 border border-purple-500/20 text-purple-300 text-[11px] font-mono">
                    Secret Key: {currentUser.twoFactorSecret || 'JBSWY3DPEHPK3PXP'}
                  </div>
                )}
              </div>
            </div>

            {/* Security Questions Card */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      Security Question Challenge
                    </h3>
                    <p className="text-xs text-slate-400">
                      Fallback verification mechanism
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsEditingQuestions(prev => !prev)}
                  className="text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors"
                >
                  {isEditingQuestions ? 'Cancel' : 'Update'}
                </button>
              </div>

              {!isEditingQuestions ? (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                  <div className="text-[10px] text-amber-400 uppercase font-bold tracking-wider mb-1">
                    Configured Question:
                  </div>
                  <div className="text-slate-200 font-medium">
                    {currentUser.securityQuestions?.[0]?.question || 'No question registered'}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Answer status: Cryptographically hashed (SHA-256)
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSaveSecurityQuestion} className="space-y-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Choose Question
                    </label>
                    <select
                      value={selectedQuestion}
                      onChange={e => setSelectedQuestion(e.target.value)}
                      className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                    >
                      {PRESET_SECURITY_QUESTIONS.map((q, idx) => (
                        <option key={idx} value={q} className="bg-slate-900">
                          {q}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Answer
                    </label>
                    <input
                      type="text"
                      value={newAnswer}
                      onChange={e => setNewAnswer(e.target.value)}
                      placeholder="Your secret answer"
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!newAnswer.trim()}
                    className="w-full py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                  >
                    {questionsSaved ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Saved!</span>
                      </>
                    ) : (
                      <span>Save Security Question</span>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. CHANGE PASSWORD TAB */}
      {activeTab === 'password' && (
        <div className="max-w-xl mx-auto bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl backdrop-blur-xl">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-white tracking-tight">
              Change Account Password
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Ensure your account is protected with modern cryptographic hashing.
            </p>
          </div>

          {passwordStatus && (
            <div
              className={`mb-4 p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
                passwordStatus.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              {passwordStatus.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{passwordStatus.message}</span>
            </div>
          )}

          <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Current Password
              </label>
              <input
                type="password"
                value={currentPass}
                onChange={e => setCurrentPass(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={newPass}
                  onChange={e => setNewPass(e.target.value)}
                  placeholder="New strong password"
                  className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm font-mono focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password strength widget */}
              {newPass.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Strength:</span>
                    <span className="font-bold text-white">{newPassAnalysis.label}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${newPassAnalysis.score >= 1 ? newPassAnalysis.color : 'bg-transparent'}`} />
                    <div className={`h-full rounded-full ${newPassAnalysis.score >= 2 ? newPassAnalysis.color : 'bg-transparent'}`} />
                    <div className={`h-full rounded-full ${newPassAnalysis.score >= 3 ? newPassAnalysis.color : 'bg-transparent'}`} />
                    <div className={`h-full rounded-full ${newPassAnalysis.score >= 4 ? newPassAnalysis.color : 'bg-transparent'}`} />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPass}
                onChange={e => setConfirmPass(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={isChangingPass || newPassAnalysis.score < 2 || newPass !== confirmPass}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-sm shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2"
            >
              {isChangingPass ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <span>Save Password</span>
                  <CheckCircle2 className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* 3. ACTIVE SESSIONS TAB */}
      {activeTab === 'sessions' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xl backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-base font-bold text-white">
                Active Devices & Authorized Sessions
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage all devices currently authenticated to your account.
              </p>
            </div>

            {currentUser.activeSessions.length > 1 && (
              <button
                onClick={revokeAllOtherSessions}
                className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Revoke All Other Devices</span>
              </button>
            )}
          </div>

          <div className="space-y-3">
            {currentUser.activeSessions.map(session => (
              <div
                key={session.id}
                className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
                  session.isCurrent
                    ? 'bg-indigo-950/20 border-indigo-500/30'
                    : 'bg-slate-950/60 border-slate-800'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-2.5 rounded-lg bg-slate-800 text-indigo-400">
                    {session.device.toLowerCase().includes('iphone') || session.device.toLowerCase().includes('android') ? (
                      <Smartphone className="w-5 h-5" />
                    ) : (
                      <Laptop className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">
                        {session.device}
                      </span>
                      {session.isCurrent && (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Current Device
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5 flex flex-wrap items-center gap-2 font-mono">
                      <span>{session.browser}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Globe className="w-3 h-3 text-slate-500" />
                        {session.location} ({session.ipAddress})
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  {!session.isCurrent && (
                    <button
                      onClick={() => revokeSession(session.id)}
                      className="text-xs font-semibold text-rose-400 hover:text-rose-300 p-2 rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. SECURITY AUDIT LOG TAB */}
      {activeTab === 'logs' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xl backdrop-blur-xl">
          <div className="mb-6">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-400" />
              Security Audit Trail
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Immutable ledger of recent authentication and credential recovery events.
            </p>
          </div>

          <div className="space-y-2.5">
            {(!currentUser.auditLogs || currentUser.auditLogs.length === 0) ? (
              <div className="text-center py-10 text-xs text-slate-400">
                No events recorded yet.
              </div>
            ) : (
              currentUser.auditLogs.map(log => (
                <div
                  key={log.id}
                  className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-start justify-between gap-4 text-xs"
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-1.5 rounded-lg mt-0.5 ${
                      log.type === 'login_success'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : log.type === 'login_failed'
                        ? 'bg-rose-500/10 text-rose-400'
                        : log.type === 'password_reset' || log.type === 'password_changed'
                        ? 'bg-cyan-500/10 text-cyan-400'
                        : 'bg-indigo-500/10 text-indigo-400'
                    }`}>
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-200">
                        {log.description}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        IP: {log.ipAddress} • {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-400 shrink-0">
                    {log.type.replace(/_/g, ' ')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
