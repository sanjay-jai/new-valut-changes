import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Key,
  ShieldCheck,
  Copy,
  Check,
  RefreshCw,
} from 'lucide-react';
import { analyzePassword, PRESET_SECURITY_QUESTIONS } from '../utils/security';
import confetti from 'canvas-confetti';

interface Props {
  onBackToLogin: () => void;
  onRegisteredSuccess: () => void;
}

export const RegisterCard: React.FC<Props> = ({
  onBackToLogin,
  onRegisteredSuccess,
}) => {
  const { register } = useAuth();

  // Wizard step
  const [step, setStep] = useState<'credentials' | 'recovery_setup' | 'backup_codes'>('credentials');

  // Fields
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Recovery Questions Setup
  const [selectedQuestion, setSelectedQuestion] = useState(PRESET_SECURITY_QUESTIONS[0]);
  const [securityAnswer, setSecurityAnswer] = useState('');

  // Generated Backup Codes
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  const [hasCopiedCodes, setHasCopiedCodes] = useState(false);

  // Feedback state
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordAnalysis = analyzePassword(password);

  const handleCredentialsNext = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim() || !username.trim() || !email.trim() || !password) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMessage('Please provide a valid email address.');
      return;
    }

    if (passwordAnalysis.score < 2) {
      setErrorMessage('Please choose a stronger password before proceeding.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setStep('recovery_setup');
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!securityAnswer.trim()) {
      setErrorMessage('Please provide an answer to your recovery security question.');
      return;
    }

    setIsSubmitting(true);
    const result = await register({
      name,
      username,
      email,
      password,
      securityQuestions: [
        {
          question: selectedQuestion,
          answer: securityAnswer,
        },
      ],
    });
    setIsSubmitting(false);

    if (!result.success) {
      setErrorMessage(result.error || 'Registration failed.');
      return;
    }

    if (result.backupCodes) {
      setGeneratedCodes(result.backupCodes);
      setStep('backup_codes');

      try {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 },
        });
      } catch {
        // Safe fallback
      }
    } else {
      onRegisteredSuccess();
    }
  };

  const copyBackupCodes = () => {
    const text = `AUTHLOGIN / AUTHVAULT EMERGENCY BACKUP RECOVERY CODES\nUser: ${email}\nGenerated: ${new Date().toISOString()}\n\n${generatedCodes.join('\n')}\n\n* Each backup code can be used once to recover your account if you lose access to your email.`;
    navigator.clipboard.writeText(text);
    setHasCopiedCodes(true);
    setTimeout(() => setHasCopiedCodes(false), 3000);
  };

  return (
    <div className="w-full max-w-lg bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-sm backdrop-blur-md relative overflow-hidden transition-all">
      {/* Glow */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-50 rounded-full blur-2xl pointer-events-none" />

      {/* Progress header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 text-xs">
        <button
          onClick={() => {
            if (step === 'credentials') onBackToLogin();
            else if (step === 'recovery_setup') setStep('credentials');
            setErrorMessage(null);
          }}
          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{step === 'credentials' ? 'Back to Login' : 'Previous Step'}</span>
        </button>

        <span className="font-mono text-indigo-600 font-semibold uppercase tracking-wider text-[11px]">
          {step === 'credentials' && 'Step 1: Account Info'}
          {step === 'recovery_setup' && 'Step 2: Recovery Shield'}
          {step === 'backup_codes' && 'Step 3: Backup Keys'}
        </span>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium leading-relaxed">{errorMessage}</div>
        </div>
      )}

      {/* STEP 1: CREDENTIALS */}
      {step === 'credentials' && (
        <div>
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Create Your Account
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Start with secure credentials and automated recovery safeguards.
            </p>
          </div>

          <form onSubmit={handleCredentialsNext} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Jordan Lee"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 text-sm"
                  />
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="jordanl"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 text-sm font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="jordan@company.com"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 text-sm"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Choose a strong password"
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 text-sm font-mono"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password strength widget */}
              {password.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Strength:</span>
                    <span className="font-bold text-slate-800">{passwordAnalysis.label}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-300 ${passwordAnalysis.score >= 1 ? passwordAnalysis.color : 'bg-transparent'}`} />
                    <div className={`h-full rounded-full transition-all duration-300 ${passwordAnalysis.score >= 2 ? passwordAnalysis.color : 'bg-transparent'}`} />
                    <div className={`h-full rounded-full transition-all duration-300 ${passwordAnalysis.score >= 3 ? passwordAnalysis.color : 'bg-transparent'}`} />
                    <div className={`h-full rounded-full transition-all duration-300 ${passwordAnalysis.score >= 4 ? passwordAnalysis.color : 'bg-transparent'}`} />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password to match"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 text-sm font-mono"
              />
            </div>

            <button
              type="submit"
              className="w-full mt-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-xs transition-all flex items-center justify-center gap-2"
            >
              <span>Next: Set Recovery Safeguards</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* STEP 2: RECOVERY SETUP */}
      {step === 'recovery_setup' && (
        <div>
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200/80 flex items-center justify-center mx-auto mb-3 shadow-xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Configure Recovery Options
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Choose a security question to guarantee emergency account restoration.
            </p>
          </div>

          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Select Security Question
              </label>
              <select
                value={selectedQuestion}
                onChange={e => setSelectedQuestion(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-600 text-sm"
              >
                {PRESET_SECURITY_QUESTIONS.map((q, i) => (
                  <option key={i} value={q} className="bg-white text-slate-900">
                    {q}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Security Answer
              </label>
              <input
                type="text"
                value={securityAnswer}
                onChange={e => setSecurityAnswer(e.target.value)}
                placeholder="Answer (e.g. Fluffy or Toronto)"
                autoFocus
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-600 text-sm"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Your answer is stored as a one-way cryptographic SHA-256 hash.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200/80 text-xs text-indigo-900 space-y-1">
              <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                <Key className="w-4 h-4 text-indigo-600" />
                Automatic Multi-Option Recovery
              </div>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                Upon registration, you will also receive 5 single-use emergency backup recovery codes and email OTP support for effortless password reset!
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !securityAnswer.trim()}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-sm shadow-xs transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Creating Secure Vault...</span>
                </>
              ) : (
                <>
                  <span>Complete Account Registration</span>
                  <CheckCircle2 className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* STEP 3: BACKUP CODES PRESENTATION */}
      {step === 'backup_codes' && (
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-cyan-50 text-cyan-700 border border-cyan-200 flex items-center justify-center mx-auto mb-4 shadow-xs">
            <Key className="w-7 h-7" />
          </div>

          <h2 className="text-xl font-bold text-slate-900 tracking-tight mb-1">
            Your Emergency Recovery Keys
          </h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
            If you ever lose access to your email, each of these 16-character backup codes can be used once to reset your password.
          </p>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-4 text-left font-mono text-xs">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 text-[11px] text-slate-500 font-sans">
              <span>5 Single-Use Master Keys</span>
              <button
                onClick={copyBackupCodes}
                className="flex items-center gap-1 text-cyan-700 hover:text-cyan-800 font-semibold transition-colors"
              >
                {hasCopiedCodes ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy All</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-800">
              {generatedCodes.map((code, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded-lg bg-white border border-slate-200 text-center tracking-wider text-cyan-800 font-semibold select-all shadow-xs"
                >
                  {code}
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={onRegisteredSuccess}
            className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-xs transition-all flex items-center justify-center gap-2"
          >
            <span>I Have Saved These Keys — Enter Vault</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
