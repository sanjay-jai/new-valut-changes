import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Mail, X, Check, ArrowRight, ShieldCheck, Clock, Trash2, KeyRound } from 'lucide-react';

interface Props {
  onSelectResetToken?: (token: string) => void;
  onAutofillOtp?: (code: string) => void;
}

export const VirtualMailbox: React.FC<Props> = ({ onSelectResetToken, onAutofillOtp }) => {
  const {
    dispatches,
    unreadMailCount,
    markDispatchAsRead,
    clearDispatches,
    setAutofillOtp,
    setActiveResetToken,
  } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleApplyOtp = (code: string, dispatchId: string) => {
    markDispatchAsRead(dispatchId);
    setAutofillOtp(code);
    if (onAutofillOtp) onAutofillOtp(code);
  };

  const handleDirectReset = (token: string, dispatchId: string) => {
    markDispatchAsRead(dispatchId);
    setActiveResetToken(token);
    if (onSelectResetToken) onSelectResetToken(token);
    setIsOpen(false);
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-slate-900/90 border border-indigo-500/30 text-slate-100 hover:border-indigo-400 hover:bg-slate-800 shadow-xl backdrop-blur-md transition-all group"
      >
        <div className="relative">
          <Mail className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform" />
          {unreadMailCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white animate-pulse">
              {unreadMailCount}
            </span>
          )}
        </div>
        <span className="text-sm font-semibold tracking-wide">
          Security Mailbox
        </span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-950/80 text-indigo-300 font-mono border border-indigo-800/40">
          {dispatches.length}
        </span>
      </button>

      {/* Slide-over Mailbox Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/60 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    Virtual Security Mailbox
                    <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                      Simulated
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Real-time OTPs, recovery tokens & security dispatches
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {dispatches.length > 0 && (
                  <button
                    onClick={clearDispatches}
                    title="Clear Mailbox"
                    className="p-1.5 rounded-md text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Email List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 divide-y divide-transparent">
              {dispatches.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <div className="w-12 h-12 rounded-full bg-slate-800/80 text-slate-500 flex items-center justify-center mx-auto mb-3">
                    <Mail className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-300 mb-1">
                    No Security Emails Yet
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                    When you request a password recovery OTP code, magic link, or reset your password, the simulated email will appear here immediately for testing!
                  </p>
                </div>
              ) : (
                dispatches.map(item => (
                  <div
                    key={item.id}
                    onClick={() => markDispatchAsRead(item.id)}
                    className={`p-4 rounded-xl border transition-all ${
                      item.read
                        ? 'bg-slate-800/40 border-slate-800 text-slate-300'
                        : 'bg-indigo-950/20 border-indigo-500/30 text-white shadow-sm'
                    }`}
                  >
                    {/* Meta info */}
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                      <span className="flex items-center gap-1 text-indigo-400 font-medium">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        AuthVault Security
                      </span>
                      <span className="flex items-center gap-1 text-[11px]">
                        <Clock className="w-3 h-3" />
                        {new Date(item.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>

                    <h4 className="text-sm font-semibold mb-1 text-slate-100">
                      {item.subject}
                    </h4>

                    <div className="text-xs text-slate-400 mb-3 font-mono">
                      To: <span className="text-slate-300">{item.toEmail}</span>
                    </div>

                    {/* OTP Highlight */}
                    {item.otpCode && (
                      <div className="p-3 rounded-lg bg-slate-950/80 border border-indigo-500/20 mb-3 flex items-center justify-between">
                        <div>
                          <div className="text-[10px] text-indigo-300 uppercase font-bold tracking-wider mb-0.5">
                            One-Time Passcode (OTP)
                          </div>
                          <div className="text-2xl font-mono font-bold tracking-widest text-indigo-400">
                            {item.otpCode}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              handleCopy(item.otpCode!, item.id);
                            }}
                            className="px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors flex items-center gap-1"
                          >
                            {copiedId === item.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Copied</span>
                              </>
                            ) : (
                              <span>Copy</span>
                            )}
                          </button>

                          <button
                            onClick={e => {
                              e.stopPropagation();
                              handleApplyOtp(item.otpCode!, item.id);
                            }}
                            className="px-2.5 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors flex items-center gap-1 shadow-sm"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            <span>Autofill</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Direct Magic Reset Link */}
                    {item.resetToken && (
                      <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                        <span className="text-xs text-slate-400">Or bypass OTP verification:</span>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleDirectReset(item.resetToken!, item.id);
                          }}
                          className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 underline underline-offset-2"
                        >
                          Use Reset Link <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Footer tip */}
            <div className="p-3 border-t border-slate-800 bg-slate-950/60 text-center text-xs text-slate-400">
              💡 Tip: Click <strong className="text-slate-300">Autofill</strong> on any code to populate the recovery box instantly.
            </div>
          </div>
        </div>
      )}
    </>
  );
};
