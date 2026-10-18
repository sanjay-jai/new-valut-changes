export type RecoveryMethodType = 'email_otp' | 'backup_code' | 'security_question';

export interface SecurityQuestion {
  id: string;
  question: string;
  answerHash: string; // SHA-256 hash of normalized answer
}

export interface AuditEvent {
  id: string;
  timestamp: number;
  type: 'login_success' | 'login_failed' | 'password_reset' | 'password_changed' | 'backup_codes_regenerated' | '2fa_toggled' | 'session_revoked';
  description: string;
  ipAddress: string;
  userAgent: string;
}

export interface UserSession {
  id: string;
  device: string;
  browser: string;
  location: string;
  ipAddress: string;
  lastActive: number;
  isCurrent: boolean;
}

export interface UserAccount {
  id: string;
  name: string;
  username: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  avatarUrl: string;
  createdAt: number;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  securityQuestions: SecurityQuestion[];
  backupCodes: string[]; // List of 16-char backup codes
  usedBackupCodes: string[];
  activeSessions: UserSession[];
  auditLogs: AuditEvent[];
}

export interface EmailDispatch {
  id: string;
  toEmail: string;
  subject: string;
  type: 'otp_code' | 'magic_link' | 'security_alert';
  otpCode?: string;
  resetToken?: string;
  expiresAt: number;
  sentAt: number;
  read: boolean;
}

export interface PasswordAnalysis {
  score: number; // 0 to 4
  label: 'Very Weak' | 'Weak' | 'Medium' | 'Strong' | 'Fortress';
  color: string;
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
  feedback: string[];
}
