import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ShieldAlert,
  Mail,
  Key,
  HelpCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { analyzePassword } from '../utils/security';
import confetti from 'canvas-confetti';

interface Props {
  onBackToLogin: () => void;
  onSuccessLogin: () => void;
  initialIdentifier?: string;
  initialResetToken?: string | null;
}

type Step = 'identify' | 'select_method' | 'verify_otp' | 'verify_backup' | 'verify_question' | 'set_new_password' | 'success';

export const RecoveryFlow: React.FC<Props> = ({
  onBackToLogin,
  onSuccessLogin,
  initialIdentifier = '',
  initialResetToken = null,
}) => {
  const {
    accounts,
    initiateRecovery,
    requestEmailOtp,
    verifyEmailOtp,
    verifyBackupCode,
    verifySecurityAnswer,
    validateResetToken,
    resetPasswordWithToken,
    autofillOtp,
    setAutofillOtp,
  } = useAuth();

  // Wizard State
  const [step, setStep] = useState<Step>('identify');
  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [resolvedUserEmail, setResolvedUserEmail] = useState('');
  const [availableMethods, setAvailableMethods] = useState<('email_otp' | 'backup_code' | 'security_question')[]>([]);
  const [activeQuestion, setActiveQuestion] = useState<{ id: string; question: string } | null>(null);

  // Verification Inputs
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [backupCodeInput, setBackupCodeInput] = useState('');
  const [securityAnswerInput, setSecurityAnswerInput] = useState('');

  // Password Reset Inputs
  const [authorizedToken, setAuthorizedToken] = useState<string | null>(initialResetToken);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [invalidateSessions, setInvalidateSessions] = useState(true);

  // UI status
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // If initialResetToken was passed from a direct reset link
  useEffect(() => {
    if (initialResetToken && validateResetToken(initialResetToken)) {
      setAuthorizedToken(initialResetToken);
      setStep('set_new_password');
    }
  }, [initialResetToken, validateResetToken]);

  // Autofill OTP listener if user clicks "Autofill" in virtual mailbox
  useEffect(() => {
    if (autofillOtp && step === 'verify_otp') {
      const digits = autofillOtp.slice(0, 6).split('');
      setOtpDigits(digits);
      setAutofillOtp(null);
    }
  }, [autofillOtp, step, setAutofillOtp]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // 1. Identify User
  const handleIdentify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    if (!identifier.trim()) {
      setErrorMessage('Please enter your email or username.');
      return;
    }

    setIsSubmitting(true);
    const result = await initiateRecovery(identifier);
    setIsSubmitting(false);

    if (!result.success || !result.user) {
      setErrorMessage(result.error || 'User not found.');
      return;
    }

    setResolvedUserEmail(result.user.email);
    setAvailableMethods(result.availableMethods);

    if (result.user.securityQuestions && result.user.securityQuestions.length > 0) {
      // Pick first security question
      setActiveQuestion({
        id: result.user.securityQuestions[0].id,
        question: result.user.securityQuestions[0].question,
      });
    }

    // Direct to selection
    setStep('select_method');
  };

  // Method Selection
  const startEmailOtp = async () => {
    setErrorMessage(null);
    setIsSubmitting(true);
    const res = await requestEmailOtp(resolvedUserEmail);
    setIsSubmitting(false);

    if (!res.success) {
      setErrorMessage(res.error || 'Failed to send OTP.');
      return;
    }

    setResendCooldown(45);
    setOtpDigits(['', '', '', '', '', '']);
    setStep('verify_otp');
    setTimeout(() => otpRefs.current[0]?.focus(), 150);
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setErrorMessage(null);
    setIsSubmitting(true);
    await requestEmailOtp(resolvedUserEmail);
    setIsSubmitting(false);
    setResendCooldown(45);
  };

  // OTP Input handlers
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...otpDigits];
    if (value.length > 1) {
      // Pasting full code
      const pasted = value.slice(0, 6).split('');
      for (let i = 0; i < 6; i++) {
        newDigits[i] = pasted[i] || '';
      }
      setOtpDigits(newDigits);
      otpRefs.current[Math.min(5, pasted.length)]?.focus();
      return;
    }

    newDigits[index] = value;
    setOtpDigits(newDigits);

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const fullOtp = otpDigits.join('');
    if (fullOtp.length !== 6) {
      setErrorMessage('Please enter all 6 digits of the verification code.');
      return;
    }

    setIsSubmitting(true);
    const result = await verifyEmailOtp(resolvedUserEmail, fullOtp);
    setIsSubmitting(false);

    if (!result.success || !result.resetToken) {
      setErrorMessage(result.error || 'Verification failed.');
      return;
    }

    setAuthorizedToken(result.resetToken);
    setStep('set_new_password');
  };

  // Backup Code Input Formatter
  const handleBackupCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let clean = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (clean.length > 16) clean = clean.slice(0, 16);

    // Format with hyphens
    const parts: string[] = [];
    for (let i = 0; i < clean.length; i += 4) {
      parts.push(clean.slice(i, i + 4));
    }
    setBackupCodeInput(parts.join('-'));
  };

  const handleVerifyBackupCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!backupCodeInput.trim()) {
      setErrorMessage('Please enter your 16-character backup code.');
      return;
    }

    setIsSubmitting(true);
    const result = await verifyBackupCode(identifier, backupCodeInput);
    setIsSubmitting(false);

    if (!result.success || !result.resetToken) {
      setErrorMessage(result.error || 'Invalid backup code.');
      return;
    }

    setAuthorizedToken(result.resetToken);
    setStep('set_new_password');
  };

  // Security Question Verification
  const handleVerifySecurityQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!securityAnswerInput.trim()) {
      setErrorMessage('Please enter your security question answer.');
      return;
    }

    if (!activeQuestion) {
      setErrorMessage('No active security question found.');
      return;
    }

    setIsSubmitting(true);
    const result = await verifySecurityAnswer(identifier, activeQuestion.id, securityAnswerInput);
    setIsSubmitting(false);

    if (!result.success || !result.resetToken) {
      setErrorMessage(result.error || 'Incorrect answer.');
      return;
    }

    setAuthorizedToken(result.resetToken);
    setStep('set_new_password');
  };

  // Reset Password Execution
  const passwordAnalysis = analyzePassword(newPassword);

  const handleExecutePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!authorizedToken) {
      setErrorMessage('Recovery session expired. Please restart the recovery process.');
      setStep('identify');
      return;
    }

    if (passwordAnalysis.score < 2) {
      setErrorMessage('Password is too weak. Please meet the minimum requirements.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    setIsSubmitting(true);
    const result = await resetPasswordWithToken(authorizedToken, newPassword, invalidateSessions);
    setIsSubmitting(false);

    if (!result.success) {
      setErrorMessage(result.error || 'Failed to update password.');
      return;
    }

    // Trigger celebration
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {
      // Ignore if confetti not loaded
    }

    setStep('success');
  };

  return (
    <div className="w-full max-w-lg bg-white border border-slate-200/90 rounded-2xl p-6 md:p-8 shadow-sm backdrop-blur-md relative overflow-hidden transition-all">
      {/* Decorative background glow */}
      <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-50 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-slate-50 rounded-full blur-2xl pointer-events-none" />

      {/* Progress / Step indicator bar */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 text-xs">
        <button
          onClick={() => {
            if (step === 'identify') onBackToLogin();
            else if (step === 'select_method') setStep('identify');
            else if (step === 'set_new_password') setStep('select_method');
            else setStep('select_method');
            setErrorMessage(null);
          }}
          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{step === 'identify' ? 'Back to Login' : 'Previous Step'}</span>
        </button>

        <span className="font-mono text-indigo-600 font-semibold uppercase tracking-wider text-[11px]">
          {step === 'identify' && 'Step 1 of 3: Identify'}
          {step === 'select_method' && 'Step 2 of 3: Method'}
          {(step === 'verify_otp' || step === 'verify_backup' || step === 'verify_question') && 'Step 2 of 3: Verify'}
          {step === 'set_new_password' && 'Step 3 of 3: New Password'}
          {step === 'success' && 'Completed'}
        </span>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium leading-relaxed">{errorMessage}</div>
        </div>
      )}

      {/* STEP 1: IDENTIFY */}
      {step === 'identify' && (
        <div>
          <div className="mb-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200/80 flex items-center justify-center mx-auto mb-3 shadow-xs">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Account Recovery
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Enter your email address or username to explore available recovery options.
            </p>
          </div>

          <form onSubmit={handleIdentify} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Email Address or Username
              </label>
              <input
                type="text"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                placeholder="e.g. sanjailakshu@gmail.com or sanjai"
                autoFocus
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all text-sm"
              />
            </div>

            {/* Quick Demo Pre-fills */}
            <div className="pt-2">
              <div className="text-[11px] font-medium text-slate-500 mb-2">
                Or test with demo accounts:
              </div>
              <div className="flex flex-wrap gap-2">
                {accounts.slice(0, 2).map(acc => (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => {
                      setIdentifier(acc.email);
                      setErrorMessage(null);
                    }}
                    className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors flex items-center gap-1.5 font-mono shadow-xs"
                  >
                    <span>{acc.email}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-4 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-sm shadow-xs transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Looking up account...</span>
                </>
              ) : (
                <>
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* STEP 2: SELECT RECOVERY METHOD */}
      {step === 'select_method' && (
        <div>
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Choose Recovery Method
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Select one of the secure recovery methods registered for{' '}
              <strong className="text-indigo-600 font-mono">{resolvedUserEmail}</strong>.
            </p>
          </div>

          <div className="space-y-3">
            {/* OPTION 1: Email OTP */}
            {availableMethods.includes('email_otp') && (
              <button
                onClick={startEmailOtp}
                disabled={isSubmitting}
                className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 transition-all text-left flex items-start gap-3.5 group shadow-xs"
              >
                <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200 group-hover:bg-indigo-100 transition-colors">
                  <Mail className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      Email Verification Code (OTP)
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Recommended
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Receive a 6-digit security passkey in your mailbox to verify identity.
                  </p>
                </div>
              </button>
            )}

            {/* OPTION 2: Emergency Backup Code */}
            {availableMethods.includes('backup_code') && (
              <button
                onClick={() => {
                  setErrorMessage(null);
                  setStep('verify_backup');
                }}
                className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-cyan-300 hover:bg-cyan-50/40 transition-all text-left flex items-start gap-3.5 group shadow-xs"
              >
                <div className="p-2.5 rounded-lg bg-cyan-50 text-cyan-600 border border-cyan-200 group-hover:bg-cyan-100 transition-colors">
                  <Key className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900 group-hover:text-cyan-600 transition-colors">
                      Emergency Backup Recovery Code
                    </span>
                    <span className="text-[10px] font-mono text-cyan-700 font-semibold">
                      16-char
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Use one of your pre-generated master emergency codes (e.g. ABCD-EFGH-...).
                  </p>
                </div>
              </button>
            )}

            {/* OPTION 3: Security Questions */}
            {availableMethods.includes('security_question') && (
              <button
                onClick={() => {
                  setErrorMessage(null);
                  setStep('verify_question');
                }}
                className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-amber-300 hover:bg-amber-50/40 transition-all text-left flex items-start gap-3.5 group shadow-xs"
              >
                <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 group-hover:bg-amber-100 transition-colors">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
                      Security Questions Challenge
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Answer your configured personal verification security question.
                  </p>
                </div>
              </button>
            )}
          </div>
        </div>
      )}

      {/* STEP 2A: VERIFY EMAIL OTP */}
      {step === 'verify_otp' && (
        <div>
          <div className="mb-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200/80 flex items-center justify-center mx-auto mb-3 shadow-xs">
              <Mail className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Enter Verification Code
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              We dispatched a 6-digit passcode to{' '}
              <strong className="text-indigo-600 font-mono">{resolvedUserEmail}</strong>.
              Check the <span className="text-indigo-600 font-semibold">Security Mailbox</span> at the bottom right.
            </p>
          </div>

          <form onSubmit={handleVerifyOtp} className="space-y-6">
            {/* 6 Digit Input Boxes */}
            <div className="flex justify-center gap-2 sm:gap-3">
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={el => { otpRefs.current[idx] = el; }}
                  type="text"
                  maxLength={6}
                  inputMode="numeric"
                  value={digit}
                  onChange={e => handleOtpChange(idx, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(idx, e)}
                  className="w-11 h-14 sm:w-12 sm:h-16 text-center text-xl sm:text-2xl font-mono font-bold rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all shadow-xs"
                />
              ))}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 px-1">
              <span>Didn&apos;t receive code?</span>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendCooldown > 0 || isSubmitting}
                className="text-indigo-600 hover:text-indigo-700 disabled:opacity-40 font-semibold transition-colors"
              >
                {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend Code Now'}
              </button>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || otpDigits.join('').length !== 6}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-sm shadow-xs transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying Code...</span>
                </>
              ) : (
                <>
                  <span>Verify & Proceed to Reset</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* STEP 2B: VERIFY BACKUP CODE */}
      {step === 'verify_backup' && (
        <div>
          <div className="mb-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-cyan-50 text-cyan-700 border border-cyan-200 flex items-center justify-center mx-auto mb-3 shadow-xs">
              <Key className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Emergency Backup Code
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Enter one of your 16-character backup recovery codes. Note: Once used, this backup code is permanently retired.
            </p>
          </div>

          <form onSubmit={handleVerifyBackupCode} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                16-Character Backup Code
              </label>
              <input
                type="text"
                value={backupCodeInput}
                onChange={handleBackupCodeChange}
                placeholder="XXXX-XXXX-XXXX-XXXX"
                autoFocus
                className="w-full px-4 py-3.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-center font-mono text-base tracking-widest uppercase placeholder-slate-400 focus:outline-none focus:bg-white focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100 transition-all shadow-xs"
              />
            </div>

            {/* Quick Demo Code Hint */}
            <div className="p-3 rounded-xl bg-cyan-50/70 border border-cyan-200 text-xs text-cyan-900 flex items-start gap-2">
              <Key className="w-4 h-4 text-cyan-600 shrink-0 mt-0.5" />
              <div>
                <strong>Demo Hint:</strong> If testing account{' '}
                <span className="font-mono text-cyan-800 font-semibold">sanjailakshu@gmail.com</span>, you can use{' '}
                <span className="font-mono font-bold text-cyan-900">VAUL-7X9B-K3M4-P9L2</span> or{' '}
                <span className="font-mono font-bold text-cyan-900">AUTH-8Q2W-9R5T-1Y6U</span>.
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || backupCodeInput.replace(/-/g, '').length < 16}
              className="w-full py-3 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white font-semibold text-sm shadow-xs transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Validating Code...</span>
                </>
              ) : (
                <>
                  <span>Verify Backup Key</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* STEP 2C: VERIFY SECURITY QUESTION */}
      {step === 'verify_question' && (
        <div>
          <div className="mb-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center mx-auto mb-3 shadow-xs">
              <HelpCircle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Security Question
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Answer the question associated with your registered profile.
            </p>
          </div>

          <form onSubmit={handleVerifySecurityQuestion} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider mb-1">
                Security Question:
              </div>
              <div className="text-sm font-semibold text-slate-900">
                {activeQuestion?.question || 'What was the name of your first childhood pet?'}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Your Answer
              </label>
              <input
                type="text"
                value={securityAnswerInput}
                onChange={e => setSecurityAnswerInput(e.target.value)}
                placeholder="Enter answer (case-insensitive)"
                autoFocus
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-amber-600 focus:ring-2 focus:ring-amber-100 transition-all text-sm"
              />
            </div>

            {/* Hint for tester */}
            <div className="text-[11px] text-slate-500 px-1">
              💡 Demo test answer for pet is <strong className="text-slate-800">Rusty</strong> or city is <strong className="text-slate-800">Seattle</strong>.
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !securityAnswerInput.trim()}
              className="w-full py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold text-sm shadow-xs transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying Answer...</span>
                </>
              ) : (
                <>
                  <span>Submit Security Answer</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* STEP 3: SET NEW PASSWORD */}
      {step === 'set_new_password' && (
        <div>
          <div className="mb-5 text-center">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto mb-3 shadow-xs">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Create New Password
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Your recovery challenge was verified. Choose a strong, new password.
            </p>
          </div>

          <form onSubmit={handleExecutePasswordReset} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Enter secure new password"
                  autoFocus
                  className="w-full pl-4 pr-10 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all text-sm font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password strength meter */}
              {newPassword.length > 0 && (
                <div className="mt-2.5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Strength:</span>
                    <span className="font-bold text-slate-800">{passwordAnalysis.label}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-300 ${passwordAnalysis.score >= 1 ? passwordAnalysis.color : 'bg-transparent'}`} />
                    <div className={`h-full rounded-full transition-all duration-300 ${passwordAnalysis.score >= 2 ? passwordAnalysis.color : 'bg-transparent'}`} />
                    <div className={`h-full rounded-full transition-all duration-300 ${passwordAnalysis.score >= 3 ? passwordAnalysis.color : 'bg-transparent'}`} />
                    <div className={`h-full rounded-full transition-all duration-300 ${passwordAnalysis.score >= 4 ? passwordAnalysis.color : 'bg-transparent'}`} />
                  </div>

                  <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-500 pt-1">
                    <div className={`flex items-center gap-1.5 ${passwordAnalysis.hasMinLength ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>8+ characters</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${passwordAnalysis.hasUppercase && passwordAnalysis.hasLowercase ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Upper & lowercase</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${passwordAnalysis.hasNumber ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>At least 1 number</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${passwordAnalysis.hasSpecialChar ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Special symbol (!@#$)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password to confirm"
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all text-sm font-mono"
              />
              {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                <p className="text-xs text-rose-600 mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Passwords do not match yet.
                </p>
              )}
            </div>

            {/* Invalidate other sessions security option */}
            <div className="pt-2">
              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={invalidateSessions}
                  onChange={e => setInvalidateSessions(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <span className="font-semibold text-slate-900">Revoke all other active sessions</span>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Recommended if your password was compromised or device was lost.
                  </p>
                </div>
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || passwordAnalysis.score < 2 || newPassword !== confirmPassword}
              className="w-full mt-4 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-sm shadow-xs transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Updating Credentials...</span>
                </>
              ) : (
                <>
                  <span>Save New Password</span>
                  <CheckCircle2 className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* STEP 4: SUCCESS CONFIRMATION */}
      {step === 'success' && (
        <div className="text-center py-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto mb-4 shadow-xs">
            <Sparkles className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">
            Password Reset Successful!
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto mb-6">
            Your security credentials have been securely updated and hashed. A confirmation alert was sent to your inbox.
          </p>

          <div className="space-y-3">
            <button
              onClick={onBackToLogin}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-xs transition-all flex items-center justify-center gap-2"
            >
              <span>Return to Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
