import { PasswordAnalysis, UserAccount } from '../types/auth';

/**
 * Computes SHA-256 hash using the Web Crypto API
 */
export async function sha256(message: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generates a random alphanumeric salt
 */
export function generateSalt(length = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return result;
}

/**
 * Hashes a password with salt
 */
export async function hashPassword(password: string, salt: string): Promise<string> {
  return sha256(`${password}:${salt}`);
}

/**
 * Normalizes and hashes an answer for a security question
 */
export async function hashAnswer(answer: string): Promise<string> {
  const normalized = answer.trim().toLowerCase().replace(/\s+/g, ' ');
  return sha256(normalized);
}

/**
 * Generates a set of 16-character emergency recovery codes (e.g. ABCD-EFGH-IJKL-MNOP)
 */
export function generateBackupCodes(count = 5): string[] {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // base32 Crockford-like (no 0, 1, I, O to avoid confusion)
  const codes: string[] = [];

  for (let i = 0; i < count; i++) {
    let raw = '';
    const randomValues = new Uint8Array(16);
    crypto.getRandomValues(randomValues);
    for (let j = 0; j < 16; j++) {
      raw += chars[randomValues[j] % chars.length];
    }
    const formatted = `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}`;
    codes.push(formatted);
  }
  return codes;
}

/**
 * Generates a 6-digit numeric OTP
 */
export function generateOtp(): string {
  const randomValues = new Uint32Array(1);
  crypto.getRandomValues(randomValues);
  const code = (randomValues[0] % 900000) + 100000;
  return code.toString();
}

/**
 * Generates a random reset token
 */
export function generateResetToken(): string {
  const randomValues = new Uint8Array(24);
  crypto.getRandomValues(randomValues);
  return Array.from(randomValues)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Comprehensive password strength analyzer
 */
export function analyzePassword(password: string): PasswordAnalysis {
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(password);

  const feedback: string[] = [];
  if (!hasMinLength) feedback.push('Must be at least 8 characters');
  if (!hasUppercase) feedback.push('Include uppercase letters');
  if (!hasLowercase) feedback.push('Include lowercase letters');
  if (!hasNumber) feedback.push('Include at least one number');
  if (!hasSpecialChar) feedback.push('Include special symbols (!@#$%^&*)');

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (hasUppercase && hasLowercase) score++;
  if (hasNumber && hasSpecialChar) score++;

  if (password.length < 6) {
    score = 0;
  } else if (password.length < 8 && score > 1) {
    score = 1;
  }

  // Cap score between 0 and 4
  score = Math.min(4, Math.max(0, score));

  let label: PasswordAnalysis['label'] = 'Very Weak';
  let color = 'bg-rose-500';

  switch (score) {
    case 0:
      label = 'Very Weak';
      color = 'bg-rose-500';
      break;
    case 1:
      label = 'Weak';
      color = 'bg-orange-500';
      break;
    case 2:
      label = 'Medium';
      color = 'bg-amber-400';
      break;
    case 3:
      label = 'Strong';
      color = 'bg-emerald-400';
      break;
    case 4:
      label = 'Fortress';
      color = 'bg-cyan-400';
      break;
  }

  return {
    score,
    label,
    color,
    hasMinLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecialChar,
    feedback,
  };
}

/**
 * Pre-seeded default questions available during setup or recovery
 */
export const PRESET_SECURITY_QUESTIONS = [
  'What was the make and model of your first car?',
  'What is the maiden name of your mother?',
  'What was the name of your first childhood pet?',
  'In what city or town did your parents meet?',
  'What was the name of your elementary school?',
  'What was the title of your favorite childhood book?',
];

/**
 * Pre-seeded demonstration user accounts with ready-to-test recovery setups
 */
export async function getInitialDemoAccounts(): Promise<UserAccount[]> {
  const salt1 = 'salt_sanjai_2026';
  const salt2 = 'salt_alexm_2026';
  const salt3 = 'salt_sectest_2026';

  const hash1 = await hashPassword('Password123!', salt1);
  const hash2 = await hashPassword('CyberVault#2026', salt2);
  const hash3 = await hashPassword('DemoAccount$2026', salt3);

  const answerHashPet = await hashAnswer('Rusty');
  const answerHashCity = await hashAnswer('Seattle');
  const answerHashSchool = await hashAnswer('Lincoln Elementary');

  const now = Date.now();

  const demoAccounts: UserAccount[] = [
    {
      id: 'usr_sanjai',
      name: 'Sanjai Lakshu',
      username: 'sanjai',
      email: 'sanjailakshu@gmail.com',
      passwordHash: hash1,
      passwordSalt: salt1,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80',
      createdAt: now - 86400000 * 30,
      twoFactorEnabled: false,
      securityQuestions: [
        {
          id: 'sq_1',
          question: 'What was the name of your first childhood pet?',
          answerHash: answerHashPet,
        },
        {
          id: 'sq_2',
          question: 'In what city or town did your parents meet?',
          answerHash: answerHashCity,
        },
      ],
      backupCodes: [
        'VAUL-7X9B-K3M4-P9L2',
        'AUTH-8Q2W-9R5T-1Y6U',
        'RECV-4E5R-6T7Y-8U9I',
        'SAFE-3S4D-5F6G-7H8J',
        'PASS-9Z8X-7C6V-5B4N',
      ],
      usedBackupCodes: [],
      activeSessions: [
        {
          id: 'sess_cur',
          device: 'MacBook Pro 16"',
          browser: 'Chrome 124.0',
          location: 'San Jose, California, US',
          ipAddress: '192.168.1.104',
          lastActive: now,
          isCurrent: true,
        },
        {
          id: 'sess_phone',
          device: 'iPhone 15 Pro',
          browser: 'Mobile Safari 17.4',
          location: 'San Jose, California, US',
          ipAddress: '172.56.21.8',
          lastActive: now - 3600000 * 4,
          isCurrent: false,
        },
      ],
      auditLogs: [
        {
          id: 'aud_1',
          timestamp: now - 86400000 * 15,
          type: 'login_success',
          description: 'Logged in via Chrome on MacOS',
          ipAddress: '192.168.1.104',
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        },
        {
          id: 'aud_2',
          timestamp: now - 86400000 * 7,
          type: 'backup_codes_regenerated',
          description: 'Emergency backup recovery codes generated',
          ipAddress: '192.168.1.104',
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        },
      ],
    },
    {
      id: 'usr_alex',
      name: 'Alex Morgan',
      username: 'alexm',
      email: 'alex.morgan@vaultguard.dev',
      passwordHash: hash2,
      passwordSalt: salt2,
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&h=256&q=80',
      createdAt: now - 86400000 * 60,
      twoFactorEnabled: true,
      twoFactorSecret: 'JBSWY3DPEHPK3PXP',
      securityQuestions: [
        {
          id: 'sq_alex_1',
          question: 'What was the name of your elementary school?',
          answerHash: answerHashSchool,
        },
      ],
      backupCodes: [
        'ALEX-9988-7766-5544',
        'CODE-1122-3344-5566',
        'LOCK-7788-9900-1122',
      ],
      usedBackupCodes: [],
      activeSessions: [
        {
          id: 'sess_alex_1',
          device: 'Windows Workstation',
          browser: 'Firefox 125.0',
          location: 'Austin, Texas, US',
          ipAddress: '24.155.88.12',
          lastActive: now,
          isCurrent: true,
        },
      ],
      auditLogs: [
        {
          id: 'aud_alex_1',
          timestamp: now - 86400000 * 3,
          type: '2fa_toggled',
          description: 'Two-Factor Authentication (2FA) enabled with Authenticator App',
          ipAddress: '24.155.88.12',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
      ],
    },
    {
      id: 'usr_sec',
      name: 'Security Test Account',
      username: 'sectest',
      email: 'security.tester@example.com',
      passwordHash: hash3,
      passwordSalt: salt3,
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=256&h=256&q=80',
      createdAt: now - 86400000 * 10,
      twoFactorEnabled: false,
      securityQuestions: [
        {
          id: 'sq_sec_1',
          question: 'What was the name of your first childhood pet?',
          answerHash: answerHashPet,
        },
      ],
      backupCodes: [
        'TEST-0001-CODE-RECV',
        'TEST-0002-CODE-SAFE',
      ],
      usedBackupCodes: [],
      activeSessions: [],
      auditLogs: [],
    },
  ];

  return demoAccounts;
}
