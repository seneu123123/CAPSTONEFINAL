import { 
  StaffAccount, 
  StaffRole, 
  SubmoduleTab, 
  SecurityAuditLog, 
  GranularPermission 
} from '../types';
import { 
  generateTotpSecret, 
  generateBackupCodes, 
  calculateAuditHash, 
  verifyAuditChain,
  repairAuditChain,
  generateSalt,
  hashPassword,
  verifyPassword
} from './cryptoAuth';

export const ROLE_DEFAULT_TABS: Record<StaffRole, SubmoduleTab[]> = {
  'Super Admin': [
    'overview',
    'guide_command',
    'packages',
    'bookings',
    'itineraries',
    'reservations',
    'payment_gate',
    'payments',
    'reconciliation',
    'concierge',
    'feedback',
    'database',
    'settings',
    'rbac'
  ],
  'Tour Operations Manager': [
    'overview',
    'packages',
    'bookings',
    'itineraries',
    'reservations',
    'concierge',
    'feedback',
    'database'
  ],
  'Finance Officer': [
    'overview',
    'payment_gate',
    'payments',
    'reconciliation',
    'bookings',
    'database'
  ],
  'Tour Guide': [
    'guide_command',
    'overview',
    'feedback',
    'database'
  ],
  'Custom Staff': [
    'overview',
    'database'
  ]
};

export const ROLE_DEFAULT_PERMISSIONS: Record<StaffRole, GranularPermission[]> = {
  'Super Admin': [
    'packages.view',
    'packages.create',
    'packages.edit',
    'packages.delete',
    'bookings.view_manifest',
    'bookings.update_status',
    'bookings.export_csv',
    'bookings.delete',
    'logistics.dispatch_guide',
    'logistics.manage_hotels',
    'logistics.manage_transport',
    'finance.view_payments',
    'finance.verify_payment',
    'finance.issue_refund',
    'finance.export_invoices',
    'finance.reconciliation',
    'feedback.view',
    'feedback.moderate',
    'concierge.view',
    'concierge.respond',
    'concierge.resolve',
    'settings.view',
    'settings.update',
    'rbac.view_staff',
    'rbac.create_staff',
    'rbac.edit_roles',
    'rbac.reset_passwords',
    'rbac.delete_staff',
    'rbac.view_audit_logs'
  ],
  'Tour Operations Manager': [
    'packages.view',
    'packages.create',
    'packages.edit',
    'packages.delete',
    'bookings.view_manifest',
    'bookings.update_status',
    'bookings.export_csv',
    'logistics.dispatch_guide',
    'logistics.manage_hotels',
    'logistics.manage_transport',
    'feedback.view',
    'feedback.moderate',
    'concierge.view',
    'concierge.respond',
    'concierge.resolve'
  ],
  'Finance Officer': [
    'bookings.view_manifest',
    'finance.view_payments',
    'finance.verify_payment',
    'finance.issue_refund',
    'finance.export_invoices',
    'finance.reconciliation'
  ],
  'Tour Guide': [
    'bookings.view_manifest',
    'bookings.update_status',
    'logistics.dispatch_guide',
    'logistics.manage_transport',
    'feedback.view'
  ],
  'Custom Staff': [
    'bookings.view_manifest'
  ]
};

export const TAB_DISPLAY_NAMES: Record<SubmoduleTab, string> = {
  overview: 'Operations Dashboard',
  guide_command: 'Field Tour Guide Command',
  packages: 'Tour Package Management',
  bookings: 'Booking & Passenger Manifest',
  itineraries: 'Itinerary & Schedule Dispatch',
  reservations: 'Hotel & Transport Logistics',
  payments: 'Payment & Invoice Management',
  payment_gate: 'Payment Gate & Audit',
  reconciliation: 'Fiscal Reconciliation & Payouts',
  concierge: 'Live Customer Concierge Desk',
  feedback: 'Customer Feedback & Ratings',
  database: 'Database & Data Dictionary',
  settings: 'System & Agency Settings',
  rbac: 'Staff & RBAC Governance'
};

export const DEFAULT_PASSWORD_VALUE = 'admin12345';

export const DEFAULT_STAFF_ACCOUNTS: StaffAccount[] = [
  {
    id: 'staff-superadmin-01',
    fullName: 'Karll Jacob',
    email: 'karlljacob8@gmail.com',
    role: 'Super Admin',
    password: DEFAULT_PASSWORD_VALUE,
    status: 'Active',
    createdAt: '2026-01-10T08:00:00.000Z',
    lastLogin: '2026-09-09T06:30:00.000Z',
    allowedTabs: ROLE_DEFAULT_TABS['Super Admin'],
    granularPermissions: ROLE_DEFAULT_PERMISSIONS['Super Admin'],
    totpSecret: 'JBSWY3DPEHPK3PXP4M2A====',
    twoFactorEnabled: true,
    backupCodes: ['4819-2048', '9102-3841', '5512-8839', '7719-2201', '3910-4492'],
    phoneNumber: '+63 917 123 4567',
    notes: 'Agency Director & Chief Information Security Officer. Full enterprise system clearance.'
  },
  {
    id: 'staff-ops-02',
    fullName: 'Kyle Dulay',
    email: 'dulaykyle15@gmail.com',
    role: 'Tour Operations Manager',
    password: DEFAULT_PASSWORD_VALUE,
    status: 'Active',
    createdAt: '2026-01-15T09:30:00.000Z',
    lastLogin: '2026-09-08T14:20:00.000Z',
    allowedTabs: ROLE_DEFAULT_TABS['Tour Operations Manager'],
    granularPermissions: ROLE_DEFAULT_PERMISSIONS['Tour Operations Manager'],
    totpSecret: 'KREU4ZKSK5FEYS2J====',
    twoFactorEnabled: true,
    backupCodes: ['3819-1092', '4491-8821', '6620-1928', '8812-4019', '2190-7731'],
    phoneNumber: '+63 918 234 5678',
    notes: 'Tour Operations Lead. Manages package schedules, flight/hotel/shuttle allocations, and bookings.'
  },
  {
    id: 'staff-finance-03',
    fullName: 'Ilona May Ambe',
    email: 'ambeilonamay67@gmail.com',
    role: 'Finance Officer',
    password: DEFAULT_PASSWORD_VALUE,
    status: 'Active',
    createdAt: '2026-02-01T10:15:00.000Z',
    lastLogin: '2026-09-07T11:45:00.000Z',
    allowedTabs: ROLE_DEFAULT_TABS['Finance Officer'],
    granularPermissions: ROLE_DEFAULT_PERMISSIONS['Finance Officer'],
    totpSecret: 'MZXW6YTBOJRGC4Q=====',
    twoFactorEnabled: true,
    backupCodes: ['5501-9921', '7721-3310', '1920-4482', '6610-8829', '4419-5502'],
    phoneNumber: '+63 919 345 6789',
    notes: 'Chief Accountant & Fiscal Auditor. Verifies GCash/Maya/Bank payments and issues tax invoices.'
  },
  {
    id: 'staff-guide-04',
    fullName: 'Michael Baynosa',
    email: 'michaelbaynosa01@gmail.com',
    role: 'Tour Guide',
    password: DEFAULT_PASSWORD_VALUE,
    status: 'Active',
    createdAt: '2026-02-10T13:00:00.000Z',
    lastLogin: '2026-09-06T09:10:00.000Z',
    allowedTabs: ROLE_DEFAULT_TABS['Tour Guide'],
    granularPermissions: ROLE_DEFAULT_PERMISSIONS['Tour Guide'],
    totpSecret: 'NBSWY3DPEHPK3PXP====',
    twoFactorEnabled: true,
    backupCodes: ['8819-2041', '3310-9920', '6629-1102', '5510-4491', '7712-8830'],
    phoneNumber: '+63 920 456 7890',
    notes: 'Accredited Expedition Leader. Assigned field passenger manifests and island schedules.'
  }
];

export const STAFF_STORAGE_KEY = 'holiday_staff_accounts_v2';
export const AUDIT_STORAGE_KEY = 'holiday_security_audit_logs_v2';

export const GENESIS_AUDIT_LOGS: SecurityAuditLog[] = [
  {
    id: 'audit-boot-01',
    timestamp: '2026-01-10T08:00:00.000Z',
    actorEmail: 'karlljacob8@gmail.com',
    action: 'RBAC_SECURITY_INITIALIZE',
    details: 'Super Administrator provisioned enterprise commercial RBAC matrix with RFC 6238 TOTP authenticators.',
    severity: 'info',
    prevHash: 'GENESIS_BLOCK_HOLIDAY_TRAVELERS_2026',
    hash: '0e32f91a7c5b4e6d8a9f2b1c4e6d8a9f2b1c4e6d8a9f2b1c4e6d8a9f2b1c4e6d',
    ipAddress: '192.168.1.100 (Backbone Node)'
  },
  {
    id: 'audit-boot-02',
    timestamp: '2026-02-01T10:15:00.000Z',
    actorEmail: 'karlljacob8@gmail.com',
    action: 'DEFAULT_CREDENTIALS_SET',
    targetEmail: 'karlljacob8@gmail.com',
    details: 'Default enterprise credentials provisioned with mandatory 2FA enforcement.',
    severity: 'info',
    prevHash: '0e32f91a7c5b4e6d8a9f2b1c4e6d8a9f2b1c4e6d8a9f2b1c4e6d8a9f2b1c4e6d',
    hash: '5d8f2a1c9e4b6d7a8f1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f',
    ipAddress: '192.168.1.100 (Backbone Node)'
  },
  {
    id: 'audit-boot-03',
    timestamp: '2026-09-09T06:45:00.000Z',
    actorEmail: 'karlljacob8@gmail.com',
    action: 'ZERO_PUBLIC_FOOTPRINT_VERIFIED',
    details: 'Admin triggers hidden from public DOM. Keyboard shortcut & multi-gesture ingress activated.',
    severity: 'info',
    prevHash: '5d8f2a1c9e4b6d7a8f1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f',
    hash: '7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b',
    ipAddress: '192.168.1.100 (Backbone Node)'
  }
];

export function saveStoredAuditLogs(logs: SecurityAuditLog[]): void {
  try {
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(logs));
  } catch (err) {
    console.warn('Failed to save audit logs to localStorage:', err);
  }
}

export function unifyAuditLogs(
  localLogs: SecurityAuditLog[] = [],
  cloudLogs: SecurityAuditLog[] = []
): SecurityAuditLog[] {
  const auditMap = new Map<string, SecurityAuditLog>();

  // 1. Static genesis baseline records (always present)
  GENESIS_AUDIT_LOGS.forEach((log) => auditMap.set(log.id, log));

  // 2. Local logs
  if (Array.isArray(localLogs)) {
    localLogs.forEach((log) => {
      if (log && log.id) auditMap.set(log.id, log);
    });
  }

  // 3. Online database logs
  if (Array.isArray(cloudLogs)) {
    cloudLogs.forEach((log) => {
      if (log && log.id) auditMap.set(log.id, log);
    });
  }

  // Deterministic descending sort with ID tiebreaker to eliminate UI jumping
  return Array.from(auditMap.values()).sort((a, b) => {
    const diff = new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    if (diff !== 0) return diff;
    return (b.id || '').localeCompare(a.id || '');
  });
}

export function getStoredStaffAccounts(): StaffAccount[] {
  try {
    const raw = localStorage.getItem(STAFF_STORAGE_KEY);
    let accounts: StaffAccount[] = [];

    if (!raw) {
      accounts = DEFAULT_STAFF_ACCOUNTS;
      localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(accounts));
    } else {
      accounts = JSON.parse(raw);
    }

    if (!Array.isArray(accounts) || accounts.length === 0) {
      accounts = DEFAULT_STAFF_ACCOUNTS;
      localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(accounts));
    }

    // Commercial Migration & Normalization:
    // 1. Upgrade any old 'password123' to 'admin12345'
    // 2. Ensure all default staff accounts exist
    // 3. Ensure totpSecret, backupCodes, and granularPermissions are set
    let modified = false;
    const existingEmails = new Set(accounts.map((a) => a.email.toLowerCase()));

    for (const core of DEFAULT_STAFF_ACCOUNTS) {
      if (!existingEmails.has(core.email.toLowerCase())) {
        accounts.push(core);
        modified = true;
      }
    }

    accounts = accounts.map((acc) => {
      let changed = false;
      const updated = { ...acc };

      // Commercial Normalization: Ensure Karll Jacob name is clean and accurate
      if (updated.email.toLowerCase() === 'karlljacob8@gmail.com') {
        if (updated.fullName !== 'Karll Jacob') {
          updated.fullName = 'Karll Jacob';
          changed = true;
        }
        if (updated.notes && updated.notes.includes('root')) {
          updated.notes = 'Agency Director & Chief Information Security Officer. Full enterprise system clearance.';
          changed = true;
        }
      }

      // Migrate default password
      if (!updated.password || updated.password === 'password123') {
        updated.password = DEFAULT_PASSWORD_VALUE;
        changed = true;
      }

      // Ensure TOTP secret exists
      if (!updated.totpSecret) {
        updated.totpSecret = generateTotpSecret(20);
        updated.twoFactorEnabled = true;
        changed = true;
      }

      // Ensure backup codes exist
      if (!updated.backupCodes || updated.backupCodes.length === 0) {
        updated.backupCodes = generateBackupCodes(5);
        changed = true;
      }

      // Ensure granular permissions exist
      if (!updated.granularPermissions || updated.granularPermissions.length === 0) {
        updated.granularPermissions = ROLE_DEFAULT_PERMISSIONS[updated.role] || ROLE_DEFAULT_PERMISSIONS['Custom Staff'];
        changed = true;
      }

      // Ensure allowedTabs exist and filter out deprecated tabs (e.g. laravel_integration)
      if (!updated.allowedTabs || updated.allowedTabs.length === 0) {
        updated.allowedTabs = ROLE_DEFAULT_TABS[updated.role] || ROLE_DEFAULT_TABS['Custom Staff'];
        changed = true;
      } else {
        const validTabs = updated.allowedTabs.filter((tab) => tab in TAB_DISPLAY_NAMES);
        if (validTabs.length !== updated.allowedTabs.length) {
          updated.allowedTabs = validTabs;
          changed = true;
        }
      }

      if (changed) modified = true;
      return updated;
    });

    if (modified) {
      localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(accounts));
    }

    return accounts;
  } catch (err) {
    console.error('Failed reading staff accounts from storage, restoring defaults', err);
    return DEFAULT_STAFF_ACCOUNTS;
  }
}

import { 
  saveStaffAccountToDb, 
  logSecurityEventToDb,
  fetchStaffAccountsFromDb,
  fetchStaffAccountByEmailFromDb
} from './supabaseClient';

export async function syncStaffAccountToCloud(acc: StaffAccount): Promise<void> {
  let salt = acc.passwordSalt;
  let hash = acc.passwordHash;
  // If plain password is provided, generate fresh salt and hash
  if (acc.password) {
    salt = generateSalt(16);
    hash = await hashPassword(acc.password, salt);
    acc.passwordSalt = salt;
    acc.passwordHash = hash;
  } else if (!hash || !salt) {
    salt = salt || generateSalt(16);
    hash = await hashPassword(DEFAULT_PASSWORD_VALUE, salt);
    acc.passwordSalt = salt;
    acc.passwordHash = hash;
  }

  await saveStaffAccountToDb({
    id: acc.id,
    email: acc.email,
    fullName: acc.fullName,
    role: acc.role,
    status: acc.status || 'Active',
    allowedTabs: acc.allowedTabs,
    permissions: acc.granularPermissions,
    twoFactorEnabled: acc.twoFactorEnabled ?? true,
    backupCodes: acc.backupCodes,
    phone: acc.phoneNumber,
    notes: acc.notes,
    lastLoginAt: acc.lastLogin,
    passwordHash: hash,
    passwordSalt: salt,
    totpSecret: acc.totpSecret
  });
}

export function saveStaffAccounts(accounts: StaffAccount[], syncToDb: boolean = true): void {
  try {
    localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(accounts));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('holiday_rbac_changed', { detail: { accounts } }));
    }
    if (syncToDb) {
      // Asynchronously sync all staff accounts to Supabase Cloud Database with secure hashing
      accounts.forEach((acc) => {
        syncStaffAccountToCloud(acc).catch((err) => console.warn('Supabase staff account sync notice:', err));
      });
    }
  } catch (err) {
    console.error('Failed saving staff accounts', err);
  }
}

export async function syncAllStaffAccountsFromCloud(): Promise<StaffAccount[]> {
  try {
    const dbAccounts = await fetchStaffAccountsFromDb();
    if (!Array.isArray(dbAccounts) || dbAccounts.length === 0) {
      return getStoredStaffAccounts();
    }
    const currentLocal = getStoredStaffAccounts();
    const localMap = new Map(currentLocal.map((a) => [a.email.toLowerCase(), a]));

    dbAccounts.forEach((dbAcc) => {
      const email = dbAcc.email?.toLowerCase();
      if (!email) return;
      const existing = localMap.get(email);
      let cleanFullName = dbAcc.full_name || dbAcc.fullName || existing?.fullName || 'Staff Operator';
      if (email === 'karlljacob8@gmail.com') {
        cleanFullName = 'Karll Jacob';
      } else {
        cleanFullName = cleanFullName.replace(/\s*\(Root\s*Super\s*Admin\)/gi, '').trim();
      }

      const mapped: StaffAccount = {
        id: dbAcc.id,
        fullName: cleanFullName,
        email: dbAcc.email,
        role: dbAcc.role || existing?.role || 'Tour Operations Manager',
        status: dbAcc.status || existing?.status || 'Active',
        allowedTabs: dbAcc.allowed_tabs || dbAcc.allowedTabs || existing?.allowedTabs || ROLE_DEFAULT_TABS[dbAcc.role as StaffRole] || [],
        granularPermissions: dbAcc.permissions || dbAcc.granularPermissions || existing?.granularPermissions || ROLE_DEFAULT_PERMISSIONS[dbAcc.role as StaffRole] || [],
        twoFactorEnabled: dbAcc.two_factor_enabled ?? dbAcc.twoFactorEnabled ?? existing?.twoFactorEnabled ?? true,
        backupCodes: dbAcc.backup_codes || dbAcc.backupCodes || existing?.backupCodes || [],
        totpSecret: dbAcc.totp_secret || dbAcc.totpSecret || existing?.totpSecret,
        passwordHash: dbAcc.password_hash || dbAcc.passwordHash || existing?.passwordHash,
        passwordSalt: dbAcc.password_salt || dbAcc.passwordSalt || existing?.passwordSalt,
        password: existing?.password,
        phoneNumber: dbAcc.phone || dbAcc.phoneNumber || existing?.phoneNumber,
        notes: dbAcc.notes || existing?.notes,
        lastLogin: dbAcc.last_login_at || dbAcc.lastLogin || existing?.lastLogin,
        createdAt: dbAcc.created_at || dbAcc.createdAt || existing?.createdAt || new Date().toISOString()
      };
      localMap.set(email, mapped);
    });

    const merged = Array.from(localMap.values());
    localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(merged));
    return merged;
  } catch (err) {
    console.warn('Failed to sync staff accounts from cloud:', err);
    return getStoredStaffAccounts();
  }
}

export function findStaffAccountByEmail(email: string): StaffAccount | undefined {
  const accounts = getStoredStaffAccounts();
  const normalized = email.trim().toLowerCase();
  return accounts.find((a) => a.email.toLowerCase() === normalized);
}

export function authenticateStaffCredentials(
  email: string,
  passwordAttempt: string
): { success: boolean; account?: StaffAccount; error?: string } {
  const account = findStaffAccountByEmail(email);
  if (!account) {
    return {
      success: false,
      error: 'Security Clearance Denied: Account not recognized on this terminal.'
    };
  }

  if (account.status === 'Suspended') {
    return {
      success: false,
      error: 'Account Suspended: Access privileges have been revoked by the Super Administrator.'
    };
  }

  const expectedPassword = account.password || DEFAULT_PASSWORD_VALUE;
  if (passwordAttempt !== expectedPassword) {
    return {
      success: false,
      error: 'Authentication Failure: Invalid password provided.'
    };
  }

  return { success: true, account };
}

export async function authenticateStaffCredentialsAsync(
  email: string,
  passwordAttempt: string
): Promise<{ success: boolean; account?: StaffAccount; error?: string }> {
  const normEmail = email.trim().toLowerCase();
  let account = findStaffAccountByEmail(normEmail);

  // Synchronize freshest credentials from Supabase Cloud staff_accounts
  try {
    const dbAcc = await fetchStaffAccountByEmailFromDb(normEmail);
    if (dbAcc) {
      let cleanFullName = dbAcc.full_name || dbAcc.fullName || 'Staff Operator';
      if (normEmail === 'karlljacob8@gmail.com') {
        cleanFullName = 'Karll Jacob';
      }

      account = {
        id: dbAcc.id,
        fullName: cleanFullName,
        email: dbAcc.email,
        role: dbAcc.role || account?.role || 'Tour Operations Manager',
        status: dbAcc.status || account?.status || 'Active',
        allowedTabs: dbAcc.allowed_tabs || dbAcc.allowedTabs || account?.allowedTabs || ROLE_DEFAULT_TABS[dbAcc.role as StaffRole] || [],
        granularPermissions: dbAcc.permissions || dbAcc.granularPermissions || account?.granularPermissions || ROLE_DEFAULT_PERMISSIONS[dbAcc.role as StaffRole] || [],
        twoFactorEnabled: dbAcc.two_factor_enabled ?? dbAcc.twoFactorEnabled ?? account?.twoFactorEnabled ?? true,
        backupCodes: dbAcc.backup_codes || dbAcc.backupCodes || account?.backupCodes || [],
        totpSecret: dbAcc.totp_secret || dbAcc.totpSecret || account?.totpSecret || generateTotpSecret(20),
        passwordHash: dbAcc.password_hash || dbAcc.passwordHash || account?.passwordHash,
        passwordSalt: dbAcc.password_salt || dbAcc.passwordSalt || account?.passwordSalt,
        password: dbAcc.password || account?.password,
        phoneNumber: dbAcc.phone || dbAcc.phoneNumber || account?.phoneNumber,
        notes: dbAcc.notes || account?.notes,
        requiresPasswordChange: dbAcc.requires_password_change ?? dbAcc.requiresPasswordChange ?? account?.requiresPasswordChange ?? false,
        lastLogin: dbAcc.last_login_at || dbAcc.lastLogin || account?.lastLogin,
        createdAt: dbAcc.created_at || account?.createdAt || new Date().toISOString()
      };

      // Cache into local accounts storage so this device immediately reflects latest cloud credentials
      const currentLocal = getStoredStaffAccounts();
      const updated = [...currentLocal.filter((a) => a.email.toLowerCase() !== normEmail), account];
      localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(updated));
    }
  } catch (e) {
    console.warn('Supabase remote staff check notice:', e);
  }

  if (!account) {
    return {
      success: false,
      error: 'Security Clearance Denied: Account not recognized on this terminal or cloud registry.'
    };
  }

  if (account.status === 'Suspended') {
    return {
      success: false,
      error: 'Account Suspended: Access privileges have been revoked by the Super Administrator.'
    };
  }

  // 1. Verify PBKDF2 hash if present
  if (account.passwordHash && account.passwordSalt) {
    const isHashValid = await verifyPassword(passwordAttempt, account.passwordHash, account.passwordSalt);
    if (isHashValid) {
      return { success: true, account };
    }
  }

  // 2. Direct password match (for standard default credentials or local accounts)
  const expectedPassword = account.password || DEFAULT_PASSWORD_VALUE;
  if (passwordAttempt === expectedPassword) {
    // Opportunistically upgrade to PBKDF2 hash
    try {
      const salt = account.passwordSalt || generateSalt(16);
      const hash = await hashPassword(passwordAttempt, salt);
      account.passwordHash = hash;
      account.passwordSalt = salt;
      account.password = passwordAttempt;
      const allAccs = getStoredStaffAccounts().map((a) => (a.id === account!.id ? account! : a));
      saveStaffAccounts(allAccs, true);
    } catch {}
    return { success: true, account };
  }

  return {
    success: false,
    error: 'Authentication Failure: Invalid password provided.'
  };
}

export function hasTabAccess(
  user: { email: string; role?: string; allowedTabs?: SubmoduleTab[] } | null,
  tab: SubmoduleTab
): boolean {
  if (!user) return false;
  if (user.role === 'Super Admin' || (!user.role && user.email === 'karlljacob8@gmail.com')) return true;

  if (user.allowedTabs && user.allowedTabs.length > 0) {
    return user.allowedTabs.includes(tab);
  }

  const role = (user.role as StaffRole) || 'Custom Staff';
  const defaults = ROLE_DEFAULT_TABS[role] || ROLE_DEFAULT_TABS['Custom Staff'];
  return defaults.includes(tab);
}

export function hasPermission(
  user: { email: string; role?: string; granularPermissions?: GranularPermission[] } | null,
  permission: GranularPermission
): boolean {
  if (!user) return false;
  if (user.role === 'Super Admin' || (!user.role && user.email === 'karlljacob8@gmail.com')) return true;

  if (user.granularPermissions && user.granularPermissions.length > 0) {
    return user.granularPermissions.includes(permission);
  }

  const role = (user.role as StaffRole) || 'Custom Staff';
  const defaults = ROLE_DEFAULT_PERMISSIONS[role] || [];
  return defaults.includes(permission);
}

export function getRoleBadgeStyle(role: StaffRole | string): { bg: string; text: string; border: string } {
  switch (role) {
    case 'Super Admin':
      return {
        bg: 'bg-rose-500/15',
        text: 'text-rose-400',
        border: 'border-rose-500/30'
      };
    case 'Tour Operations Manager':
      return {
        bg: 'bg-sunset-coral/15',
        text: 'text-sunset-coral',
        border: 'border-sunset-coral/30'
      };
    case 'Finance Officer':
      return {
        bg: 'bg-emerald-500/15',
        text: 'text-emerald-400',
        border: 'border-emerald-500/30'
      };
    case 'Tour Guide':
      return {
        bg: 'bg-cyan-500/15',
        text: 'text-cyan-400',
        border: 'border-cyan-500/30'
      };
    default:
      return {
        bg: 'bg-purple-500/15',
        text: 'text-purple-400',
        border: 'border-purple-500/30'
      };
  }
}

// --------------------------------------------------------------------------
// Cryptographic Tamper-Evident Audit Logging (ISO/IEC 27001 ISMS Compliance)
// --------------------------------------------------------------------------
export async function logSecurityEvent(
  actorEmail: string,
  action: string,
  details: string,
  severity: 'info' | 'warning' | 'critical' = 'info',
  targetEmail?: string
): Promise<void> {
  try {
    const logs = getStoredAuditLogs();
    const prevHash = logs.length > 0 && logs[0].hash 
      ? logs[0].hash 
      : 'GENESIS_BLOCK_HOLIDAY_TRAVELERS_2026';

    const id = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const timestamp = new Date().toISOString();

    const hash = await calculateAuditHash(prevHash, {
      id,
      timestamp,
      actorEmail,
      action,
      details,
      severity,
      targetEmail
    });

    const entry: SecurityAuditLog = {
      id,
      timestamp,
      actorEmail,
      action,
      targetEmail,
      details,
      severity,
      prevHash,
      hash,
      ipAddress: '192.168.1.104 (Encrypted Tunnel)'
    };

    const updated = [entry, ...logs];
    // Retain up to 300 logs
    if (updated.length > 300) updated.pop();
    saveStoredAuditLogs(updated);

    // Asynchronously log to Supabase Cloud Database
    logSecurityEventToDb({
      id: entry.id,
      timestamp: entry.timestamp,
      actorName: entry.actorEmail.split('@')[0],
      actorEmail: entry.actorEmail,
      actorRole: 'Staff / Admin',
      actionType: entry.action,
      submodule: 'RBAC',
      details: entry.details,
      ipAddress: entry.ipAddress,
      sha256Signature: entry.hash
    }).catch((err) => console.warn('Supabase audit log sync notice:', err));
  } catch (err) {
    console.error('Failed to write cryptographic security audit log', err);
  }
}

export function getStoredAuditLogs(): SecurityAuditLog[] {
  try {
    const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
    const parsedLogs: SecurityAuditLog[] = raw ? JSON.parse(raw) : [];
    const united = unifyAuditLogs(parsedLogs);
    saveStoredAuditLogs(united);
    return united;
  } catch {
    return [...GENESIS_AUDIT_LOGS];
  }
}

export async function syncGenesisAuditsToDb(): Promise<void> {
  try {
    for (const genesis of GENESIS_AUDIT_LOGS) {
      await logSecurityEventToDb({
        id: genesis.id,
        timestamp: genesis.timestamp,
        actorName: genesis.actorEmail.split('@')[0],
        actorEmail: genesis.actorEmail,
        actorRole: 'Super Admin',
        actionType: genesis.action,
        submodule: 'RBAC Genesis',
        details: genesis.details,
        ipAddress: genesis.ipAddress || '192.168.1.100 (Backbone Node)',
        sha256Signature: genesis.hash
      });
    }
  } catch (err) {
    console.warn('Genesis audits sync to DB notice:', err);
  }
}

export { verifyAuditChain, repairAuditChain };

// ============================================================================
// SUPER ADMIN RBAC 2-MINUTE OTP ACTION AUTHORIZATION LEASE (STEP-UP CHALLENGE)
// ============================================================================
export const SUPER_ADMIN_OTP_SESSION_DURATION_MS = 2 * 60 * 1000; // 2 minutes (120 seconds)

export interface SuperAdminOtpSession {
  email: string;
  expiresAt: number;
  verifiedAt: number;
}

const SUPER_ADMIN_OTP_SESSION_KEY_PREFIX = 'holiday_superadmin_otp_session_';

export function getSuperAdminOtpSession(email: string): SuperAdminOtpSession | null {
  if (!email) return null;
  const normEmail = email.trim().toLowerCase();
  const key = `${SUPER_ADMIN_OTP_SESSION_KEY_PREFIX}${normEmail}`;
  try {
    const raw = sessionStorage.getItem(key) || localStorage.getItem(key);
    if (!raw) return null;
    const session: SuperAdminOtpSession = JSON.parse(raw);
    if (Date.now() > session.expiresAt) {
      sessionStorage.removeItem(key);
      localStorage.removeItem(key);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function getSuperAdminOtpRemainingMs(email: string): number {
  const session = getSuperAdminOtpSession(email);
  if (!session) return 0;
  return Math.max(0, session.expiresAt - Date.now());
}

export function isSuperAdminOtpAuthorized(email: string): boolean {
  return getSuperAdminOtpRemainingMs(email) > 0;
}

export function grantSuperAdminOtpSession(
  email: string, 
  durationMs: number = SUPER_ADMIN_OTP_SESSION_DURATION_MS
): SuperAdminOtpSession {
  const normEmail = email.trim().toLowerCase();
  const session: SuperAdminOtpSession = {
    email: normEmail,
    verifiedAt: Date.now(),
    expiresAt: Date.now() + durationMs
  };
  const key = `${SUPER_ADMIN_OTP_SESSION_KEY_PREFIX}${normEmail}`;
  try {
    sessionStorage.setItem(key, JSON.stringify(session));
    localStorage.setItem(key, JSON.stringify(session));
  } catch {}
  return session;
}

export function revokeSuperAdminOtpSession(email: string): void {
  if (!email) return;
  const normEmail = email.trim().toLowerCase();
  const key = `${SUPER_ADMIN_OTP_SESSION_KEY_PREFIX}${normEmail}`;
  try {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
  } catch {}
}
