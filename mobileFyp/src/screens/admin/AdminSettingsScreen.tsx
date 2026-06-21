import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import { LoadingView } from '../../components/portal/LoadingView';
import { PortalScreenLayout } from '../../components/portal/PortalScreenLayout';
import { SheetModal } from '../../components/portal/SheetModal';
import { usePortalNavigation } from '../../components/portal/portalNavigation';
import {
  createBackupNow,
  DEFAULT_SETTINGS,
  fetchAvailableBackups,
  fetchSystemSettings,
  mapApiToAppSettings,
  restoreBackup,
  saveSystemSettings,
  type AppSettings,
  type BackupFile,
} from '../../services/settingsService';

const SETTINGS_TABS = [
  { id: 'general', label: 'General' },
  { id: 'security', label: 'Security' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'backup', label: 'Backup' },
  { id: 'policies', label: 'Policies' },
] as const;

type SettingsTab = (typeof SETTINGS_TABS)[number]['id'];

const BACKUP_FREQUENCIES = ['Daily', 'Weekly', 'Monthly'];

const POLICY_ITEMS = [
  'Privacy Policy',
  'Terms of Service',
  'Academic Integrity Policy',
];

function ToggleRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleText}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.toggleDesc}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: '#d1d5db', true: '#86efac' }}
        thumbColor={value ? '#16a34a' : '#f4f4f5'}
      />
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: 'default' | 'email-address' | 'numeric';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholderTextColor="#9ca3af"
      />
    </View>
  );
}

export function AdminSettingsScreen() {
  const { routeOptions, clearRouteOptions } = usePortalNavigation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [freqPickerOpen, setFreqPickerOpen] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<BackupFile | null>(null);

  const patch = (partial: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  };

  const loadSettings = useCallback(async () => {
    try {
      const data = await fetchSystemSettings();
      setSettings(mapApiToAppSettings(data));
    } catch {
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadBackups = useCallback(async () => {
    try {
      const data = await fetchAvailableBackups();
      setBackups(data.backups || []);
    } catch {
      setBackups([]);
    }
  }, []);

  useEffect(() => {
    loadSettings();
    loadBackups();
  }, [loadSettings, loadBackups]);

  useEffect(() => {
    if (routeOptions?.settingsTab) {
      setActiveTab(routeOptions.settingsTab);
      clearRouteOptions();
    }
  }, [clearRouteOptions, routeOptions?.settingsTab]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSystemSettings(settings);
      Alert.alert('Success', 'Settings saved successfully.');
    } catch {
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleBackupNow = async () => {
    setBackupBusy(true);
    try {
      const result = await createBackupNow();
      if (result.success) {
        Alert.alert('Backup Complete', 'System backup created successfully.');
        await loadBackups();
      } else {
        throw new Error('Backup failed');
      }
    } catch {
      Alert.alert('Backup Failed', 'Could not create backup.');
    } finally {
      setBackupBusy(false);
    }
  };

  const handleRestoreConfirm = async () => {
    if (!restoreTarget?.filename) return;
    setBackupBusy(true);
    try {
      const result = await restoreBackup(restoreTarget.filename);
      if (result.success) {
        Alert.alert('Restore Complete', 'Backup restored successfully.');
        setRestoreTarget(null);
      } else {
        throw new Error('Restore failed');
      }
    } catch {
      Alert.alert('Restore Failed', 'Could not restore backup.');
    } finally {
      setBackupBusy(false);
    }
  };

  if (loading) {
    return <LoadingView message="Loading settings..." />;
  }

  return (
    <PortalScreenLayout title="Settings" subtitle="Platform controls and configuration">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabRow}>
        {SETTINGS_TABS.map((tab) => (
          <Pressable
            key={tab.id}
            style={[styles.tabChip, activeTab === tab.id && styles.tabChipActive]}
            onPress={() => setActiveTab(tab.id)}>
            <Text
              style={[
                styles.tabChipText,
                activeTab === tab.id && styles.tabChipTextActive,
              ]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.panel}>
        {activeTab === 'general' ? (
          <>
            <Text style={styles.panelTitle}>General Settings</Text>
            <Text style={styles.panelDesc}>Basic system configuration</Text>
            <View style={styles.rowFields}>
              <View style={styles.halfField}>
                <Field
                  label="System Name"
                  value={settings.systemName}
                  onChangeText={(systemName) => patch({ systemName })}
                />
              </View>
              <View style={styles.halfField}>
                <Field
                  label="University Name"
                  value={settings.universityName}
                  onChangeText={(universityName) => patch({ universityName })}
                />
              </View>
            </View>
            <Field
              label="Contact Email"
              value={settings.contactEmail}
              onChangeText={(contactEmail) => patch({ contactEmail })}
              keyboardType="email-address"
            />
            <ToggleRow
              label="Maintenance Mode"
              description="Temporarily disable user access"
              value={settings.maintenanceMode}
              onChange={(maintenanceMode) => patch({ maintenanceMode })}
            />
            <ToggleRow
              label="Allow Registration"
              description="Enable new user registration"
              value={settings.allowRegistration}
              onChange={(allowRegistration) => patch({ allowRegistration })}
            />
          </>
        ) : null}

        {activeTab === 'security' ? (
          <>
            <Text style={styles.panelTitle}>Security Settings</Text>
            <Text style={styles.panelDesc}>Configure security and authentication</Text>
            <Field
              label="Minimum Password Length"
              value={String(settings.minPasswordLength)}
              onChangeText={(v) =>
                patch({ minPasswordLength: parseInt(v, 10) || 8 })
              }
              keyboardType="numeric"
            />
            <Field
              label="Session Timeout (hours)"
              value={String(settings.sessionTimeout)}
              onChangeText={(v) =>
                patch({ sessionTimeout: parseInt(v, 10) || 24 })
              }
              keyboardType="numeric"
            />
            <Field
              label="Max Login Attempts"
              value={String(settings.maxLoginAttempts)}
              onChangeText={(v) =>
                patch({ maxLoginAttempts: parseInt(v, 10) || 5 })
              }
              keyboardType="numeric"
            />
            <ToggleRow
              label="Require Email Verification"
              description="Force email verification for new accounts"
              value={settings.requireEmailVerification}
              onChange={(requireEmailVerification) =>
                patch({ requireEmailVerification })
              }
            />
            <ToggleRow
              label="Enable Two-Factor Authentication"
              description="Add an extra layer of security"
              value={settings.enableTwoFactorAuth}
              onChange={(enableTwoFactorAuth) => patch({ enableTwoFactorAuth })}
            />
          </>
        ) : null}

        {activeTab === 'notifications' ? (
          <>
            <Text style={styles.panelTitle}>Notification Settings</Text>
            <Text style={styles.panelDesc}>Configure system notifications</Text>
            <ToggleRow
              label="Email Notifications"
              description="Send notifications via email"
              value={settings.emailNotifications}
              onChange={(emailNotifications) => patch({ emailNotifications })}
            />
            <ToggleRow
              label="SMS Notifications"
              description="Send notifications via SMS"
              value={settings.smsNotifications}
              onChange={(smsNotifications) => patch({ smsNotifications })}
            />
            <ToggleRow
              label="Push Notifications"
              description="Send push notifications to devices"
              value={settings.pushNotifications}
              onChange={(pushNotifications) => patch({ pushNotifications })}
            />
            <ToggleRow
              label="Deadline Reminders"
              description="Remind users about upcoming deadlines"
              value={settings.deadlineReminders}
              onChange={(deadlineReminders) => patch({ deadlineReminders })}
            />
            <ToggleRow
              label="Approval Notifications"
              description="Notify when approvals are required"
              value={settings.approvalNotifications}
              onChange={(approvalNotifications) => patch({ approvalNotifications })}
            />
          </>
        ) : null}

        {activeTab === 'backup' ? (
          <>
            <Text style={styles.panelTitle}>Backup Settings</Text>
            <Text style={styles.panelDesc}>Configure data backup and retention</Text>
            <ToggleRow
              label="Automatic Backup"
              description="Enable automatic system backups"
              value={settings.automaticBackup}
              onChange={(automaticBackup) => patch({ automaticBackup })}
            />
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Backup Frequency</Text>
              <Pressable style={styles.picker} onPress={() => setFreqPickerOpen(true)}>
                <Text style={styles.pickerText}>{settings.backupFrequency}</Text>
                <FeatherIcon name="chevron-down" size={18} color="#6b7280" />
              </Pressable>
            </View>
            <Field
              label="Retention Days"
              value={String(settings.retentionDays)}
              onChangeText={(v) =>
                patch({ retentionDays: parseInt(v, 10) || 30 })
              }
              keyboardType="numeric"
            />
            <View style={styles.backupActions}>
              <Pressable
                style={[styles.outlineAction, backupBusy && styles.disabled]}
                disabled={backupBusy}
                onPress={handleBackupNow}>
                <FeatherIcon name="database" size={16} color="#111827" />
                <Text style={styles.outlineActionText}>
                  {backupBusy ? 'Working...' : 'Backup Now'}
                </Text>
              </Pressable>
            </View>
            {backups.length > 0 ? (
              <View style={styles.backupList}>
                <Text style={styles.backupListTitle}>Recent Backups</Text>
                {backups.slice(0, 5).map((backup) => (
                  <View key={backup.filename} style={styles.backupRow}>
                    <View style={styles.backupRowText}>
                      <Text style={styles.backupName} numberOfLines={1}>
                        {backup.filename}
                      </Text>
                      <Text style={styles.backupMeta}>
                        {backup.size || '—'} ·{' '}
                        {backup.created
                          ? new Date(backup.created).toLocaleString()
                          : '—'}
                      </Text>
                    </View>
                    <Pressable
                      style={styles.restoreBtn}
                      onPress={() => setRestoreTarget(backup)}>
                      <Text style={styles.restoreBtnText}>Restore</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : null}
          </>
        ) : null}

        {activeTab === 'policies' ? (
          <>
            <Text style={styles.panelTitle}>Policy Management</Text>
            <Text style={styles.panelDesc}>Manage system policies and documents</Text>
            <ToggleRow
              label="Policy Acknowledgment Required"
              description="Require users to acknowledge policies"
              value={settings.policyAcknowledgmentRequired}
              onChange={(policyAcknowledgmentRequired) =>
                patch({ policyAcknowledgmentRequired })
              }
            />
            <Text style={styles.subHeading}>Active Policies</Text>
            <Text style={styles.panelDesc}>
              Manage policy documents that users must acknowledge
            </Text>
            {POLICY_ITEMS.map((name) => (
              <View key={name} style={styles.policyRow}>
                <View style={styles.policyLeft}>
                  <FeatherIcon name="shield" size={16} color="#2563eb" />
                  <Text style={styles.policyName}>{name}</Text>
                </View>
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>Active</Text>
                </View>
              </View>
            ))}
          </>
        ) : null}
      </View>

      <Pressable
        style={[styles.saveBtn, saving && styles.disabled]}
        disabled={saving}
        onPress={handleSave}>
        {saving ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.saveBtnText}>Save Settings</Text>
        )}
      </Pressable>

      <SheetModal
        visible={freqPickerOpen}
        onClose={() => setFreqPickerOpen(false)}
        title="Backup Frequency">
        {BACKUP_FREQUENCIES.map((freq) => (
          <Pressable
            key={freq}
            style={styles.optionRow}
            onPress={() => {
              patch({ backupFrequency: freq });
              setFreqPickerOpen(false);
            }}>
            <Text style={styles.optionText}>{freq}</Text>
            {settings.backupFrequency === freq ? (
              <FeatherIcon name="check" size={18} color="#16a34a" />
            ) : null}
          </Pressable>
        ))}
      </SheetModal>

      <SheetModal
        visible={!!restoreTarget}
        onClose={() => !backupBusy && setRestoreTarget(null)}
        title="Restore Backup?"
        subtitle="This action cannot be undone">
        <Text style={styles.warningText}>
          Restoring a backup will overwrite current data including users, projects,
          committees, and settings.
        </Text>
        {restoreTarget ? (
          <Text style={styles.restoreFilename}>{restoreTarget.filename}</Text>
        ) : null}
        <View style={styles.restoreFooter}>
          <Pressable
            style={styles.cancelRestore}
            disabled={backupBusy}
            onPress={() => setRestoreTarget(null)}>
            <Text style={styles.cancelRestoreText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[styles.confirmRestore, backupBusy && styles.disabled]}
            disabled={backupBusy}
            onPress={handleRestoreConfirm}>
            {backupBusy ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.confirmRestoreText}>Yes, Restore</Text>
            )}
          </Pressable>
        </View>
      </SheetModal>
    </PortalScreenLayout>
  );
}

const styles = StyleSheet.create({
  tabRow: { gap: 8, paddingBottom: 14 },
  tabChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tabChipActive: { backgroundColor: '#f3f4f6', borderColor: '#d1d5db' },
  tabChipText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  tabChipTextActive: { color: '#111827' },
  panel: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    marginBottom: 16,
  },
  panelTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 4 },
  panelDesc: { fontSize: 13, color: '#6b7280', marginBottom: 16, lineHeight: 20 },
  rowFields: { flexDirection: 'row', gap: 10 },
  halfField: { flex: 1 },
  field: { marginBottom: 14 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#fff',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    gap: 12,
  },
  toggleText: { flex: 1 },
  toggleLabel: { fontSize: 14, fontWeight: '600', color: '#111827' },
  toggleDesc: { fontSize: 12, color: '#6b7280', marginTop: 2, lineHeight: 18 },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  pickerText: { fontSize: 14, color: '#111827' },
  backupActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  outlineAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  outlineActionText: { fontWeight: '600', color: '#111827', fontSize: 14 },
  backupList: { marginTop: 16 },
  backupListTitle: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8 },
  backupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingVertical: 10,
    gap: 8,
  },
  backupRowText: { flex: 1 },
  backupName: { fontSize: 13, fontWeight: '600', color: '#111827' },
  backupMeta: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  restoreBtn: {
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  restoreBtnText: { color: '#dc2626', fontWeight: '700', fontSize: 12 },
  subHeading: { fontSize: 14, fontWeight: '700', color: '#111827', marginTop: 8 },
  policyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  policyLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  policyName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  activeBadge: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activeBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  saveBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 24,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  disabled: { opacity: 0.6 },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  optionText: { fontSize: 15, color: '#111827' },
  warningText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 22,
    marginBottom: 12,
  },
  restoreFilename: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  restoreFooter: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelRestore: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  cancelRestoreText: { fontWeight: '700', color: '#374151' },
  confirmRestore: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#dc2626',
    alignItems: 'center',
  },
  confirmRestoreText: { fontWeight: '700', color: '#fff' },
});
