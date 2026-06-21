import { authGet, authPost } from './apiClient';

export interface SystemSettingsResponse {
  general?: {
    systemName?: string;
    universityName?: string;
    contactEmail?: string;
    maintenanceMode?: boolean;
    allowRegistration?: boolean;
  };
  security?: {
    minPasswordLength?: number;
    sessionTimeout?: number;
    maxLoginAttempts?: number;
    requireEmailVerification?: boolean;
    enableTwoFactor?: boolean;
  };
  notifications?: {
    emailNotifications?: boolean;
    smsNotifications?: boolean;
    pushNotifications?: boolean;
    deadlineReminders?: boolean;
    approvalNotifications?: boolean;
  };
  backup?: {
    automaticBackup?: boolean;
    backupFrequency?: string;
    retentionDays?: number;
  };
  policies?: {
    policyAcknowledgmentRequired?: boolean;
  };
}

export interface AppSettings {
  systemName: string;
  universityName: string;
  contactEmail: string;
  maintenanceMode: boolean;
  allowRegistration: boolean;
  minPasswordLength: number;
  sessionTimeout: number;
  maxLoginAttempts: number;
  requireEmailVerification: boolean;
  enableTwoFactorAuth: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  deadlineReminders: boolean;
  approvalNotifications: boolean;
  automaticBackup: boolean;
  backupFrequency: string;
  retentionDays: number;
  policyAcknowledgmentRequired: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  systemName: 'FYP Automation System',
  universityName: 'Hamdard University',
  contactEmail: 'admin@hamdard.edu.pk',
  maintenanceMode: false,
  allowRegistration: true,
  minPasswordLength: 8,
  sessionTimeout: 24,
  maxLoginAttempts: 5,
  requireEmailVerification: false,
  enableTwoFactorAuth: false,
  emailNotifications: true,
  smsNotifications: false,
  pushNotifications: true,
  deadlineReminders: true,
  approvalNotifications: true,
  automaticBackup: true,
  backupFrequency: 'Daily',
  retentionDays: 30,
  policyAcknowledgmentRequired: false,
};

export function mapApiToAppSettings(data: SystemSettingsResponse): AppSettings {
  const freq = data.backup?.backupFrequency || 'daily';
  const normalizedFreq =
    freq.charAt(0).toUpperCase() + freq.slice(1).toLowerCase();
  return {
    systemName: data.general?.systemName || DEFAULT_SETTINGS.systemName,
    universityName: data.general?.universityName || DEFAULT_SETTINGS.universityName,
    contactEmail: data.general?.contactEmail || DEFAULT_SETTINGS.contactEmail,
    maintenanceMode: data.general?.maintenanceMode ?? false,
    allowRegistration: data.general?.allowRegistration !== false,
    emailNotifications: data.notifications?.emailNotifications !== false,
    smsNotifications: data.notifications?.smsNotifications ?? false,
    pushNotifications: data.notifications?.pushNotifications !== false,
    deadlineReminders: data.notifications?.deadlineReminders !== false,
    approvalNotifications: data.notifications?.approvalNotifications !== false,
    automaticBackup: data.backup?.automaticBackup !== false,
    backupFrequency: normalizedFreq,
    retentionDays: data.backup?.retentionDays ?? 30,
    minPasswordLength: data.security?.minPasswordLength ?? 8,
    sessionTimeout: data.security?.sessionTimeout ?? 24,
    maxLoginAttempts: data.security?.maxLoginAttempts ?? 5,
    requireEmailVerification: data.security?.requireEmailVerification ?? false,
    enableTwoFactorAuth: data.security?.enableTwoFactor ?? false,
    policyAcknowledgmentRequired:
      data.policies?.policyAcknowledgmentRequired ?? false,
  };
}

export function mapAppToApiPayload(settings: AppSettings) {
  return {
    general: {
      systemName: settings.systemName,
      universityName: settings.universityName,
      contactEmail: settings.contactEmail,
      maintenanceMode: settings.maintenanceMode,
      allowRegistration: settings.allowRegistration,
    },
    security: {
      minPasswordLength: settings.minPasswordLength,
      sessionTimeout: settings.sessionTimeout,
      maxLoginAttempts: settings.maxLoginAttempts,
      requireEmailVerification: settings.requireEmailVerification,
      enableTwoFactor: settings.enableTwoFactorAuth,
    },
    notifications: {
      emailNotifications: settings.emailNotifications,
      smsNotifications: settings.smsNotifications,
      pushNotifications: settings.pushNotifications,
      deadlineReminders: settings.deadlineReminders,
      approvalNotifications: settings.approvalNotifications,
    },
    backup: {
      automaticBackup: settings.automaticBackup,
      backupFrequency: settings.backupFrequency.toLowerCase(),
      retentionDays: settings.retentionDays,
    },
    policies: {
      policyAcknowledgmentRequired: settings.policyAcknowledgmentRequired,
    },
  };
}

export async function fetchSystemSettings() {
  return authGet<SystemSettingsResponse>('/api/settings');
}

export async function saveSystemSettings(settings: AppSettings) {
  return authPost<{ message?: string; settings?: SystemSettingsResponse }>(
    '/api/settings',
    mapAppToApiPayload(settings),
  );
}

export interface BackupFile {
  filename: string;
  size?: string;
  created?: string;
}

export async function fetchAvailableBackups() {
  return authGet<{ backups?: BackupFile[] }>('/api/admin/backup');
}

export async function createBackupNow() {
  return authPost<{ success?: boolean; backup?: BackupFile & { records?: number } }>(
    '/api/admin/backup',
  );
}

export async function restoreBackup(filename: string) {
  return authPost<{ success?: boolean; message?: string }>('/api/admin/backup/restore', {
    filename,
  });
}
