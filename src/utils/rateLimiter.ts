// Commercial Rate Limiting & Brute-Force Lockout Defense with Progressive Escalation
// 1st lockout: 5 minutes
// 2nd lockout: 10 minutes
// 3rd lockout: 15 minutes (escalates by +5 minutes each cycle)

interface AttemptRecord {
  failedAttempts: number;
  lockoutLevel: number; // 1 = 5m, 2 = 10m, 3 = 15m, etc.
  lockedUntil: number | null; // epoch ms
  lastAttemptTime: number;
}

const STORAGE_KEY = 'holiday_security_rate_limits';
const MAX_ATTEMPTS_BEFORE_CHALLENGE = 3;
const MAX_ATTEMPTS_BEFORE_LOCKOUT = 5;
const BASE_LOCKOUT_MINUTES = 5; // Initial 5 minutes

function getRecords(): Record<string, AttemptRecord> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveRecords(records: Record<string, AttemptRecord>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // ignore
  }
}

export interface RateLimitStatus {
  isLocked: boolean;
  lockoutRemainingSeconds: number;
  failedCount: number;
  lockoutLevel: number;
  currentLockoutMinutes: number;
  nextLockoutMinutes: number;
  requiresChallenge: boolean;
}

export function checkRateLimit(identifier: string): RateLimitStatus {
  const records = getRecords();
  const key = identifier.trim().toLowerCase();
  const record = records[key];

  if (!record) {
    return {
      isLocked: false,
      lockoutRemainingSeconds: 0,
      failedCount: 0,
      lockoutLevel: 1,
      currentLockoutMinutes: BASE_LOCKOUT_MINUTES,
      nextLockoutMinutes: BASE_LOCKOUT_MINUTES * 2,
      requiresChallenge: false
    };
  }

  const now = Date.now();
  const level = Math.max(1, record.lockoutLevel || 1);
  const currentLockMinutes = level * BASE_LOCKOUT_MINUTES;
  const nextLockMinutes = (level + 1) * BASE_LOCKOUT_MINUTES;

  // If lockout expired, reset failedAttempts so user can try again, but preserve escalated lockoutLevel
  if (record.lockedUntil && now >= record.lockedUntil) {
    record.lockedUntil = null;
    record.failedAttempts = 0;
    saveRecords(records);

    return {
      isLocked: false,
      lockoutRemainingSeconds: 0,
      failedCount: 0,
      lockoutLevel: level,
      currentLockoutMinutes: currentLockMinutes,
      nextLockoutMinutes: nextLockMinutes,
      requiresChallenge: false
    };
  }

  // Currently actively locked out
  if (record.lockedUntil && now < record.lockedUntil) {
    const remaining = Math.ceil((record.lockedUntil - now) / 1000);
    return {
      isLocked: true,
      lockoutRemainingSeconds: remaining,
      failedCount: record.failedAttempts,
      lockoutLevel: level,
      currentLockoutMinutes: currentLockMinutes,
      nextLockoutMinutes: nextLockMinutes,
      requiresChallenge: true
    };
  }

  return {
    isLocked: false,
    lockoutRemainingSeconds: 0,
    failedCount: record.failedAttempts,
    lockoutLevel: level,
    currentLockoutMinutes: currentLockMinutes,
    nextLockoutMinutes: nextLockMinutes,
    requiresChallenge: record.failedAttempts >= MAX_ATTEMPTS_BEFORE_CHALLENGE
  };
}

export function recordFailedAttempt(identifier: string): RateLimitStatus {
  const records = getRecords();
  const key = identifier.trim().toLowerCase();
  const now = Date.now();

  const record: AttemptRecord = records[key] || {
    failedAttempts: 0,
    lockoutLevel: 1,
    lockedUntil: null,
    lastAttemptTime: now
  };

  record.failedAttempts += 1;
  record.lastAttemptTime = now;

  if (record.failedAttempts >= MAX_ATTEMPTS_BEFORE_LOCKOUT) {
    const level = Math.max(1, record.lockoutLevel || 1);
    const durationMinutes = level * BASE_LOCKOUT_MINUTES;
    const durationMs = durationMinutes * 60 * 1000;
    
    record.lockedUntil = now + durationMs;
    // Escalate next lockout level for repeated lockouts
    record.lockoutLevel = level + 1;
  }

  records[key] = record;
  saveRecords(records);

  return checkRateLimit(identifier);
}

export function clearRateLimit(identifier: string): void {
  const records = getRecords();
  const key = identifier.trim().toLowerCase();
  if (records[key]) {
    delete records[key];
    saveRecords(records);
  }
}

export function generateMathChallenge(): { question: string; answer: number } {
  const a = Math.floor(Math.random() * 12) + 3;
  const b = Math.floor(Math.random() * 12) + 3;
  return {
    question: `Security Challenge: What is ${a} + ${b}?`,
    answer: a + b
  };
}
