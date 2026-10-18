import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  UserAccount,
  EmailDispatch,
  RecoveryMethodType,
  AuditEvent,
  UserSession,
} from '../types/auth';
import {
  generateSalt,
  hashPassword,
  hashAnswer,
  generateBackupCodes,
  generateOtp,
  generateResetToken,
  getInitialDemoAccounts,
} from '../utils/security';

interface ResetSessionState {
  userId: string;
  token: string;
  expiresAt: number;
  verifiedMethod: RecoveryMethodType;
}

interface AuthContextType {
  currentUser: UserAccount | null;
  accounts: UserAccount[];
  isLoading: boolean;
  isLocked: boolean;
  lockSession: () => void;
  unlockSession: (password: string) => Promise<boolean>;
  
  // Auth operations
  login: (identifier: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; requires2FA?: boolean; user?: UserAccount; error?: string }>;
  verify2FA: (code: string) => Promise<boolean>;
  pending2FAUser: UserAccount | null;
  cancel2FA: () => void;
  register: (data: {
    name: string;
    username: string;
    email: string;
    password: string;
    securityQuestions: { question: string; answer: string }[];
  }) => Promise<{ success: boolean; error?: string; backupCodes?: string[]; user?: UserAccount }>;
  logout: () => void;
  
  // Password Recovery
  initiateRecovery: (identifier: string) => Promise<{
    success: boolean;
    user?: UserAccount;
    availableMethods: RecoveryMethodType[];
    error?: string;
  }>;
  requestEmailOtp: (email: string) => Promise<{ success: boolean; error?: string }>;
  verifyEmailOtp: (email: string, otp: string) => Promise<{ success: boolean; resetToken?: string; error?: string }>;
  verifyBackupCode: (identifier: string, code: string) => Promise<{ success: boolean; resetToken?: string; error?: string }>;
  verifySecurityAnswer: (identifier: string, questionId: string, answer: string) => Promise<{ success: boolean; resetToken?: string; error?: string }>;
  validateResetToken: (token: string) => boolean;
  resetPasswordWithToken: (token: string, newPassword: string, invalidateOthers?: boolean) => Promise<{ success: boolean; error?: string }>;
  
  // In-session Account updates
  changePassword: (currentPass: string, newPass: string) => Promise<{ success: boolean; error?: string }>;
  regenerateBackupCodes: () => Promise<string[]>;
  toggle2FA: () => Promise<boolean>;
  updateSecurityQuestions: (questions: { question: string; answer: string }[]) => Promise<boolean>;
  revokeSession: (sessionId: string) => void;
  revokeAllOtherSessions: () => void;

  // Virtual Mailbox
  dispatches: EmailDispatch[];
  unreadMailCount: number;
  markDispatchAsRead: (id: string) => void;
  clearDispatches: () => void;
  
  // Direct shortcut from virtual mailbox
  autofillOtp: string | null;
  setAutofillOtp: (otp: string | null) => void;
  activeResetToken: string | null;
  setActiveResetToken: (token: string | null) => void;

  // Reset to demo accounts
  resetDemoData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_USERS_KEY = 'authvault_users_v2';
const STORAGE_CURRENT_USER_KEY = 'authvault_active_user_id';
const STORAGE_DISPATCHES_KEY = 'authvault_email_dispatches';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [pending2FAUser, setPending2FAUser] = useState<UserAccount | null>(null);

  // Active password reset sessions { token: ResetSessionState }
  const [resetSessions, setResetSessions] = useState<Record<string, ResetSessionState>>({});

  // Virtual Email Dispatches
  const [dispatches, setDispatches] = useState<EmailDispatch[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_DISPATCHES_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [autofillOtp, setAutofillOtp] = useState<string | null>(null);
  const [activeResetToken, setActiveResetToken] = useState<string | null>(null);

  // Initialize and seed data if needed
  useEffect(() => {
    async function init() {
      try {
        const storedUsers = localStorage.getItem(STORAGE_USERS_KEY);
        let userList: UserAccount[] = [];

        if (storedUsers) {
          userList = JSON.parse(storedUsers);
        } else {
          userList = await getInitialDemoAccounts();
          localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(userList));
        }

        setAccounts(userList);

        const currentUserId = localStorage.getItem(STORAGE_CURRENT_USER_KEY);
        if (currentUserId) {
          const found = userList.find(u => u.id === currentUserId);
          if (found) {
            setCurrentUser(found);
          }
        }
      } catch (err) {
        console.error('Failed to load accounts:', err);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  // Save dispatches
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_DISPATCHES_KEY, JSON.stringify(dispatches));
    } catch (e) {
      console.warn('Storage error:', e);
    }
  }, [dispatches]);

  // Sync users to storage whenever accounts update
  const persistAccounts = useCallback((newAccounts: UserAccount[]) => {
    setAccounts(newAccounts);
    try {
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(newAccounts));
    } catch (e) {
      console.warn('Storage save failed:', e);
    }
  }, []);

  const addAuditLog = useCallback((userId: string, event: Omit<AuditEvent, 'id' | 'timestamp'>) => {
    const now = Date.now();
    const newEvent: AuditEvent = {
      ...event,
      id: `aud_${now}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: now,
    };

    setAccounts(prev => {
      const updated = prev.map(u => {
        if (u.id === userId) {
          const logs = [newEvent, ...(u.auditLogs || [])].slice(0, 30);
          return { ...u, auditLogs: logs };
        }
        return u;
      });
      persistAccounts(updated);
      return updated;
    });

    setCurrentUser(curr => {
      if (curr && curr.id === userId) {
        return {
          ...curr,
          auditLogs: [newEvent, ...(curr.auditLogs || [])].slice(0, 30),
        };
      }
      return curr;
    });
  }, [persistAccounts]);

  const sendDispatch = useCallback((dispatch: Omit<EmailDispatch, 'id' | 'sentAt' | 'read'>) => {
    const newDispatch: EmailDispatch = {
      ...dispatch,
      id: `mail_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sentAt: Date.now(),
      read: false,
    };
    setDispatches(prev => [newDispatch, ...prev]);
    return newDispatch;
  }, []);

  // Login
  const login = async (identifier: string, password: string, rememberMe = true) => {
    const cleanId = identifier.trim().toLowerCase();
    const user = accounts.find(
      u => u.email.toLowerCase() === cleanId || u.username.toLowerCase() === cleanId
    );

    if (!user) {
      return { success: false, error: 'No account found with this email or username.' };
    }

    const testHash = await hashPassword(password, user.passwordSalt);
    if (testHash !== user.passwordHash) {
      addAuditLog(user.id, {
        type: 'login_failed',
        description: 'Failed login attempt (incorrect password)',
        ipAddress: '192.168.1.104',
        userAgent: navigator.userAgent,
      });
      return { success: false, error: 'Invalid password. Please double check or use recovery.' };
    }

    // Check 2FA
    if (user.twoFactorEnabled) {
      setPending2FAUser(user);
      return { success: true, requires2FA: true, user };
    }

    // Success login
    setCurrentUser(user);
    if (rememberMe) {
      localStorage.setItem(STORAGE_CURRENT_USER_KEY, user.id);
    } else {
      sessionStorage.setItem(STORAGE_CURRENT_USER_KEY, user.id);
    }

    addAuditLog(user.id, {
      type: 'login_success',
      description: 'Successfully authenticated to dashboard',
      ipAddress: '192.168.1.104',
      userAgent: navigator.userAgent,
    });

    return { success: true, user };
  };

  const verify2FA = async (code: string): Promise<boolean> => {
    if (!pending2FAUser) return false;

    // Simulation: accept '123456' or any valid 6-digit code or match mock secret
    const cleanCode = code.trim();
    if (cleanCode.length === 6 && /^\d+$/.test(cleanCode)) {
      setCurrentUser(pending2FAUser);
      localStorage.setItem(STORAGE_CURRENT_USER_KEY, pending2FAUser.id);

      addAuditLog(pending2FAUser.id, {
        type: 'login_success',
        description: '2FA challenge passed via Authenticator code',
        ipAddress: '192.168.1.104',
        userAgent: navigator.userAgent,
      });

      setPending2FAUser(null);
      return true;
    }
    return false;
  };

  const cancel2FA = () => {
    setPending2FAUser(null);
  };

  // Register
  const register = async (data: {
    name: string;
    username: string;
    email: string;
    password: string;
    securityQuestions: { question: string; answer: string }[];
  }) => {
    const cleanEmail = data.email.trim().toLowerCase();
    const cleanUsername = data.username.trim().toLowerCase();

    // Check conflict
    const existing = accounts.find(
      u => u.email.toLowerCase() === cleanEmail || u.username.toLowerCase() === cleanUsername
    );
    if (existing) {
      return {
        success: false,
        error: existing.email.toLowerCase() === cleanEmail
          ? 'An account with this email address already exists.'
          : 'This username is already taken. Please choose another.',
      };
    }

    const salt = generateSalt(16);
    const passwordHash = await hashPassword(data.password, salt);
    const backupCodes = generateBackupCodes(5);

    // Process security questions
    const processedQuestions = await Promise.all(
      data.securityQuestions.map(async (sq, idx) => ({
        id: `sq_${idx}_${Date.now()}`,
        question: sq.question,
        answerHash: await hashAnswer(sq.answer),
      }))
    );

    const now = Date.now();
    const newUser: UserAccount = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: data.name.trim(),
      username: cleanUsername,
      email: cleanEmail,
      passwordHash,
      passwordSalt: salt,
      avatarUrl: `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(cleanUsername)}`,
      createdAt: now,
      twoFactorEnabled: false,
      securityQuestions: processedQuestions,
      backupCodes,
      usedBackupCodes: [],
      activeSessions: [
        {
          id: `sess_${now}`,
          device: 'Current Workstation',
          browser: 'Browser Applet',
          location: 'Detected Localhost',
          ipAddress: '192.168.1.104',
          lastActive: now,
          isCurrent: true,
        },
      ],
      auditLogs: [
        {
          id: `aud_reg_${now}`,
          timestamp: now,
          type: 'login_success',
          description: 'Account created and initial security configuration registered',
          ipAddress: '192.168.1.104',
          userAgent: navigator.userAgent,
        },
      ],
    };

    const updatedList = [newUser, ...accounts];
    persistAccounts(updatedList);
    setCurrentUser(newUser);
    localStorage.setItem(STORAGE_CURRENT_USER_KEY, newUser.id);

    // Send a welcome & security key confirmation dispatch
    sendDispatch({
      toEmail: cleanEmail,
      subject: 'Security Alert: Welcome to AuthVault - Backup Codes Generated',
      type: 'security_alert',
      expiresAt: now + 86400000,
    });

    return {
      success: true,
      backupCodes,
      user: newUser,
    };
  };

  const logout = () => {
    setCurrentUser(null);
    setIsLocked(false);
    localStorage.removeItem(STORAGE_CURRENT_USER_KEY);
    sessionStorage.removeItem(STORAGE_CURRENT_USER_KEY);
  };

  const lockSession = () => {
    setIsLocked(true);
  };

  const unlockSession = async (password: string) => {
    if (!currentUser) return false;
    const testHash = await hashPassword(password, currentUser.passwordSalt);
    if (testHash === currentUser.passwordHash) {
      setIsLocked(false);
      return true;
    }
    return false;
  };

  // Recovery Initiation
  const initiateRecovery = async (identifier: string) => {
    const cleanId = identifier.trim().toLowerCase();
    const user = accounts.find(
      u => u.email.toLowerCase() === cleanId || u.username.toLowerCase() === cleanId
    );

    if (!user) {
      return {
        success: false,
        error: 'No account associated with that email or username was found.',
        availableMethods: [],
      };
    }

    const availableMethods: RecoveryMethodType[] = ['email_otp'];
    if (user.backupCodes && user.backupCodes.length > 0) {
      availableMethods.push('backup_code');
    }
    if (user.securityQuestions && user.securityQuestions.length > 0) {
      availableMethods.push('security_question');
    }

    return {
      success: true,
      user,
      availableMethods,
    };
  };

  // 1. Recovery Option: Request Email OTP
  const requestEmailOtp = async (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const user = accounts.find(u => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      return { success: false, error: 'User email not found.' };
    }

    const otp = generateOtp();
    const resetToken = generateResetToken();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store the temporary verification session
    setResetSessions(prev => ({
      ...prev,
      [cleanEmail]: {
        userId: user.id,
        token: otp, // temporary hold of expected OTP
        expiresAt,
        verifiedMethod: 'email_otp',
      },
      // Also register token for direct magic link reset
      [resetToken]: {
        userId: user.id,
        token: resetToken,
        expiresAt,
        verifiedMethod: 'email_otp',
      },
    }));

    // Send dispatch to virtual mailbox
    sendDispatch({
      toEmail: cleanEmail,
      subject: `Your AuthVault Security Reset Code: ${otp}`,
      type: 'otp_code',
      otpCode: otp,
      resetToken,
      expiresAt,
    });

    return { success: true };
  };

  // Verify Email OTP
  const verifyEmailOtp = async (email: string, otp: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim();
    const session = resetSessions[cleanEmail];

    if (!session) {
      return { success: false, error: 'No active recovery request found. Please request a new code.' };
    }

    if (Date.now() > session.expiresAt) {
      return { success: false, error: 'This security code has expired. Please request a fresh one.' };
    }

    if (session.token !== cleanOtp) {
      return { success: false, error: 'Incorrect 6-digit code. Please verify and try again.' };
    }

    // Approved! Generate an authorized password reset token
    const authorizedToken = generateResetToken();
    setResetSessions(prev => {
      const copy = { ...prev };
      delete copy[cleanEmail]; // invalidate OTP
      copy[authorizedToken] = {
        userId: session.userId,
        token: authorizedToken,
        expiresAt: Date.now() + 15 * 60 * 1000, // 15 mins to enter new password
        verifiedMethod: 'email_otp',
      };
      return copy;
    });

    return { success: true, resetToken: authorizedToken };
  };

  // 2. Recovery Option: Emergency Backup Code
  const verifyBackupCode = async (identifier: string, rawCode: string) => {
    const cleanId = identifier.trim().toLowerCase();
    const user = accounts.find(
      u => u.email.toLowerCase() === cleanId || u.username.toLowerCase() === cleanId
    );

    if (!user) {
      return { success: false, error: 'No account found with that identifier.' };
    }

    const cleanInputCode = rawCode.trim().toUpperCase().replace(/\s+/g, '');

    // Look for matching code in unused codes
    const matchingCode = user.backupCodes.find(c => {
      const formattedC = c.replace(/-/g, '').toUpperCase();
      const inputWithoutDashes = cleanInputCode.replace(/-/g, '');
      return formattedC === inputWithoutDashes;
    });

    if (!matchingCode) {
      // Check if it was already used
      const wasUsed = user.usedBackupCodes?.some(c => {
        const formattedC = c.replace(/-/g, '').toUpperCase();
        return formattedC === cleanInputCode.replace(/-/g, '');
      });

      if (wasUsed) {
        return { success: false, error: 'This backup code has already been consumed. Please use another code.' };
      }
      return { success: false, error: 'Invalid backup recovery code. Must be 16 characters in XXXX-XXXX-XXXX-XXXX format.' };
    }

    // Consume the backup code! (It cannot be reused)
    const updatedBackupCodes = user.backupCodes.filter(c => c !== matchingCode);
    const updatedUsedCodes = [...(user.usedBackupCodes || []), matchingCode];

    const updatedUser: UserAccount = {
      ...user,
      backupCodes: updatedBackupCodes,
      usedBackupCodes: updatedUsedCodes,
    };

    const updatedList = accounts.map(u => u.id === user.id ? updatedUser : u);
    persistAccounts(updatedList);

    addAuditLog(user.id, {
      type: 'login_success',
      description: `Emergency recovery code used (${updatedBackupCodes.length} remaining)`,
      ipAddress: '192.168.1.104',
      userAgent: navigator.userAgent,
    });

    // Generate authorized reset token
    const authorizedToken = generateResetToken();
    setResetSessions(prev => ({
      ...prev,
      [authorizedToken]: {
        userId: user.id,
        token: authorizedToken,
        expiresAt: Date.now() + 15 * 60 * 1000,
        verifiedMethod: 'backup_code',
      },
    }));

    return { success: true, resetToken: authorizedToken };
  };

  // 3. Recovery Option: Security Question
  const verifySecurityAnswer = async (identifier: string, questionId: string, answer: string) => {
    const cleanId = identifier.trim().toLowerCase();
    const user = accounts.find(
      u => u.email.toLowerCase() === cleanId || u.username.toLowerCase() === cleanId
    );

    if (!user) {
      return { success: false, error: 'User not found.' };
    }

    const questionObj = user.securityQuestions.find(q => q.id === questionId);
    if (!questionObj) {
      return { success: false, error: 'Security question not found.' };
    }

    const testHash = await hashAnswer(answer);
    if (testHash !== questionObj.answerHash) {
      return { success: false, error: 'The answer provided does not match our records.' };
    }

    // Approved!
    const authorizedToken = generateResetToken();
    setResetSessions(prev => ({
      ...prev,
      [authorizedToken]: {
        userId: user.id,
        token: authorizedToken,
        expiresAt: Date.now() + 15 * 60 * 1000,
        verifiedMethod: 'security_question',
      },
    }));

    return { success: true, resetToken: authorizedToken };
  };

  // Validate Token
  const validateResetToken = (token: string): boolean => {
    const session = resetSessions[token];
    if (!session) return false;
    return Date.now() <= session.expiresAt;
  };

  // Execute password reset
  const resetPasswordWithToken = async (token: string, newPass: string, invalidateOthers = true) => {
    const session = resetSessions[token];
    if (!session || Date.now() > session.expiresAt) {
      return { success: false, error: 'Your recovery session has expired or is invalid. Please restart recovery.' };
    }

    const user = accounts.find(u => u.id === session.userId);
    if (!user) {
      return { success: false, error: 'Account could not be found.' };
    }

    // Verify user is not reusing the exact same password
    const oldHashCheck = await hashPassword(newPass, user.passwordSalt);
    if (oldHashCheck === user.passwordHash) {
      return { success: false, error: 'New password cannot be identical to your old password.' };
    }

    const newSalt = generateSalt(16);
    const newHash = await hashPassword(newPass, newSalt);

    const now = Date.now();
    const updatedSessions: UserSession[] = invalidateOthers
      ? [
          {
            id: `sess_${now}`,
            device: 'Current Device (Recovery)',
            browser: 'Browser Applet',
            location: 'Detected Localhost',
            ipAddress: '192.168.1.104',
            lastActive: now,
            isCurrent: true,
          },
        ]
      : user.activeSessions;

    const updatedUser: UserAccount = {
      ...user,
      passwordHash: newHash,
      passwordSalt: newSalt,
      activeSessions: updatedSessions,
    };

    const updatedList = accounts.map(u => u.id === user.id ? updatedUser : u);
    persistAccounts(updatedList);

    // Consume the token
    setResetSessions(prev => {
      const copy = { ...prev };
      delete copy[token];
      return copy;
    });

    addAuditLog(user.id, {
      type: 'password_reset',
      description: `Password successfully reset via ${session.verifiedMethod}`,
      ipAddress: '192.168.1.104',
      userAgent: navigator.userAgent,
    });

    // Send confirmation email
    sendDispatch({
      toEmail: user.email,
      subject: 'Security Alert: Your AuthVault Password Was Successfully Reset',
      type: 'security_alert',
      expiresAt: now + 86400000,
    });

    // If activeResetToken matched, clear it
    if (activeResetToken === token) {
      setActiveResetToken(null);
    }

    return { success: true };
  };

  // Change password in session
  const changePassword = async (currentPass: string, newPass: string) => {
    if (!currentUser) return { success: false, error: 'Not authenticated.' };

    const testHash = await hashPassword(currentPass, currentUser.passwordSalt);
    if (testHash !== currentUser.passwordHash) {
      return { success: false, error: 'Current password is incorrect.' };
    }

    if (currentPass === newPass) {
      return { success: false, error: 'New password cannot be the same as your old password.' };
    }

    const newSalt = generateSalt(16);
    const newHash = await hashPassword(newPass, newSalt);

    const updatedUser: UserAccount = {
      ...currentUser,
      passwordHash: newHash,
      passwordSalt: newSalt,
    };

    const updatedList = accounts.map(u => u.id === currentUser.id ? updatedUser : u);
    persistAccounts(updatedList);
    setCurrentUser(updatedUser);

    addAuditLog(currentUser.id, {
      type: 'password_changed',
      description: 'Password changed from Account Security Settings',
      ipAddress: '192.168.1.104',
      userAgent: navigator.userAgent,
    });

    sendDispatch({
      toEmail: currentUser.email,
      subject: 'Security Alert: Your Password Was Changed',
      type: 'security_alert',
      expiresAt: Date.now() + 86400000,
    });

    return { success: true };
  };

  const regenerateBackupCodes = async () => {
    if (!currentUser) return [];
    const newCodes = generateBackupCodes(5);
    const updatedUser: UserAccount = {
      ...currentUser,
      backupCodes: newCodes,
      usedBackupCodes: [],
    };
    const updatedList = accounts.map(u => u.id === currentUser.id ? updatedUser : u);
    persistAccounts(updatedList);
    setCurrentUser(updatedUser);

    addAuditLog(currentUser.id, {
      type: 'backup_codes_regenerated',
      description: 'Emergency backup codes regenerated (old codes invalidated)',
      ipAddress: '192.168.1.104',
      userAgent: navigator.userAgent,
    });

    return newCodes;
  };

  const toggle2FA = async () => {
    if (!currentUser) return false;
    const newState = !currentUser.twoFactorEnabled;
    const updatedUser: UserAccount = {
      ...currentUser,
      twoFactorEnabled: newState,
      twoFactorSecret: newState ? 'JBSWY3DPEHPK3PXP' : undefined,
    };
    const updatedList = accounts.map(u => u.id === currentUser.id ? updatedUser : u);
    persistAccounts(updatedList);
    setCurrentUser(updatedUser);

    addAuditLog(currentUser.id, {
      type: '2fa_toggled',
      description: `Two-Factor Authentication (2FA) ${newState ? 'enabled' : 'disabled'}`,
      ipAddress: '192.168.1.104',
      userAgent: navigator.userAgent,
    });

    return newState;
  };

  const updateSecurityQuestions = async (questions: { question: string; answer: string }[]) => {
    if (!currentUser) return false;
    const processed = await Promise.all(
      questions.map(async (sq, idx) => ({
        id: `sq_${idx}_${Date.now()}`,
        question: sq.question,
        answerHash: await hashAnswer(sq.answer),
      }))
    );

    const updatedUser: UserAccount = {
      ...currentUser,
      securityQuestions: processed,
    };
    const updatedList = accounts.map(u => u.id === currentUser.id ? updatedUser : u);
    persistAccounts(updatedList);
    setCurrentUser(updatedUser);
    return true;
  };

  const revokeSession = (sessionId: string) => {
    if (!currentUser) return;
    const filtered = currentUser.activeSessions.filter(s => s.id !== sessionId);
    const updatedUser = { ...currentUser, activeSessions: filtered };
    const updatedList = accounts.map(u => u.id === currentUser.id ? updatedUser : u);
    persistAccounts(updatedList);
    setCurrentUser(updatedUser);

    addAuditLog(currentUser.id, {
      type: 'session_revoked',
      description: 'Terminated remote session',
      ipAddress: '192.168.1.104',
      userAgent: navigator.userAgent,
    });
  };

  const revokeAllOtherSessions = () => {
    if (!currentUser) return;
    const currentOnly = currentUser.activeSessions.filter(s => s.isCurrent);
    const updatedUser = { ...currentUser, activeSessions: currentOnly };
    const updatedList = accounts.map(u => u.id === currentUser.id ? updatedUser : u);
    persistAccounts(updatedList);
    setCurrentUser(updatedUser);

    addAuditLog(currentUser.id, {
      type: 'session_revoked',
      description: 'Revoked all other active sessions across devices',
      ipAddress: '192.168.1.104',
      userAgent: navigator.userAgent,
    });
  };

  const markDispatchAsRead = (id: string) => {
    setDispatches(prev => prev.map(d => d.id === id ? { ...d, read: true } : d));
  };

  const clearDispatches = () => {
    setDispatches([]);
    localStorage.removeItem(STORAGE_DISPATCHES_KEY);
  };

  const resetDemoData = async () => {
    const demos = await getInitialDemoAccounts();
    persistAccounts(demos);
    setCurrentUser(null);
    setDispatches([]);
    localStorage.removeItem(STORAGE_CURRENT_USER_KEY);
    localStorage.removeItem(STORAGE_DISPATCHES_KEY);
  };

  const unreadMailCount = dispatches.filter(d => !d.read).length;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        accounts,
        isLoading,
        isLocked,
        lockSession,
        unlockSession,
        login,
        verify2FA,
        pending2FAUser,
        cancel2FA,
        register,
        logout,
        initiateRecovery,
        requestEmailOtp,
        verifyEmailOtp,
        verifyBackupCode,
        verifySecurityAnswer,
        validateResetToken,
        resetPasswordWithToken,
        changePassword,
        regenerateBackupCodes,
        toggle2FA,
        updateSecurityQuestions,
        revokeSession,
        revokeAllOtherSessions,
        dispatches,
        unreadMailCount,
        markDispatchAsRead,
        clearDispatches,
        autofillOtp,
        setAutofillOtp,
        activeResetToken,
        setActiveResetToken,
        resetDemoData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
