import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import Toast from 'react-native-toast-message';
import { LoadingView } from '../../components/portal/LoadingView';
import { PortalScreenLayout } from '../../components/portal/PortalScreenLayout';
import { useAuthUser } from '../../hooks/useAuthUser';
import {
  fetchAccessPasses,
  updateAccessPasses,
} from '../../services/adminService';
import { changeAccountPassword } from '../../services/profileService';

const ACCENT = '#2563eb';

function PassField({
  label,
  value,
  onChangeText,
  visible,
  onToggleVisible,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  visible: boolean;
  onToggleVisible: () => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.passRow}>
        <TextInput
          style={styles.passInput}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!visible}
          autoCapitalize="none"
          placeholder="Enter access pass"
          placeholderTextColor="#9ca3af"
        />
        <Pressable style={styles.eyeBtn} onPress={onToggleVisible}>
          <FeatherIcon
            name={visible ? 'eye-off' : 'eye'}
            size={18}
            color="#6b7280"
          />
        </Pressable>
      </View>
    </View>
  );
}

export function AdminProfileScreen() {
  const { user } = useAuthUser();
  const isAdmin = user?.role === 'ADMIN';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [teacherPass, setTeacherPass] = useState('');
  const [committeePass, setCommitteePass] = useState('');
  const [showTeacherPass, setShowTeacherPass] = useState(false);
  const [showCommitteePass, setShowCommitteePass] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const loadData = useCallback(async () => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    try {
      const data = await fetchAccessPasses();
      setTeacherPass(data.TEACHER || '');
      setCommitteePass(data.COMMITTEE_HEAD || '');
    } catch {
      Alert.alert('Error', 'Failed to load access passes.');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    if (!teacherPass.trim() || !committeePass.trim()) {
      Alert.alert('Required', 'Both access passes are required.');
      return;
    }

    setSaving(true);
    try {
      await updateAccessPasses({
        TEACHER: teacherPass.trim(),
        COMMITTEE_HEAD: committeePass.trim(),
      });
      Alert.alert('Saved', 'Access passes updated successfully.');
    } catch {
      Alert.alert('Error', 'Failed to update access passes.');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      Toast.show({ type: 'error', text1: 'New passwords do not match' });
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      Toast.show({ type: 'error', text1: 'Password must be at least 6 characters' });
      return;
    }

    setChangingPassword(true);
    try {
      await changeAccountPassword(
        passwordForm.currentPassword,
        passwordForm.newPassword,
      );
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      Toast.show({ type: 'success', text1: 'Password changed successfully' });
    } catch (e) {
      Toast.show({
        type: 'error',
        text1: 'Password change failed',
        text2: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return <LoadingView message="Loading profile..." />;
  }

  const roleLabel = user?.role?.replace(/_/g, ' ') || 'User';

  return (
    <PortalScreenLayout
      title="Profile"
      subtitle="Account settings and security">
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <FeatherIcon name="user" size={28} color={ACCENT} />
        </View>
        <Text style={styles.name}>{user?.name || 'User'}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>{roleLabel}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Change Password</Text>
        <Text style={styles.sectionDesc}>
          Update your login password. If you forgot your password, log out and use
          Forgot Password on the login screen — a reset code will be sent to your email.
        </Text>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Current Password</Text>
          <TextInput
            style={styles.textInput}
            value={passwordForm.currentPassword}
            onChangeText={v => setPasswordForm(p => ({ ...p, currentPassword: v }))}
            secureTextEntry
            autoCapitalize="none"
            placeholder="Enter current password"
            placeholderTextColor="#9ca3af"
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>New Password</Text>
          <TextInput
            style={styles.textInput}
            value={passwordForm.newPassword}
            onChangeText={v => setPasswordForm(p => ({ ...p, newPassword: v }))}
            secureTextEntry
            autoCapitalize="none"
            placeholder="At least 6 characters"
            placeholderTextColor="#9ca3af"
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Confirm New Password</Text>
          <TextInput
            style={styles.textInput}
            value={passwordForm.confirmPassword}
            onChangeText={v => setPasswordForm(p => ({ ...p, confirmPassword: v }))}
            secureTextEntry
            autoCapitalize="none"
            placeholder="Re-enter new password"
            placeholderTextColor="#9ca3af"
          />
        </View>

        <Pressable
          style={[styles.saveBtn, changingPassword && styles.saveBtnDisabled]}
          onPress={handlePasswordChange}
          disabled={changingPassword}>
          {changingPassword ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <FeatherIcon name="lock" size={16} color="#fff" />
              <Text style={styles.saveBtnText}>Update Password</Text>
            </>
          )}
        </Pressable>
      </View>

      {isAdmin ? (
        <View style={[styles.section, styles.sectionSpaced]}>
          <Text style={styles.sectionTitle}>Registration Access Passes</Text>
          <Text style={styles.sectionDesc}>
            Required when teachers and committee heads register. Only admins can
            view and change these.
          </Text>

          <PassField
            label="Teacher Access Pass"
            value={teacherPass}
            onChangeText={setTeacherPass}
            visible={showTeacherPass}
            onToggleVisible={() => setShowTeacherPass(prev => !prev)}
          />
          <PassField
            label="Committee Head Access Pass"
            value={committeePass}
            onChangeText={setCommitteePass}
            visible={showCommitteePass}
            onToggleVisible={() => setShowCommitteePass(prev => !prev)}
          />

          <Pressable
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}>
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <FeatherIcon name="save" size={16} color="#fff" />
                <Text style={styles.saveBtnText}>Save Access Passes</Text>
              </>
            )}
          </Pressable>
        </View>
      ) : null}
    </PortalScreenLayout>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  email: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  roleBadge: {
    marginTop: 10,
    backgroundColor: '#fee2e2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  roleBadgeText: {
    color: '#dc2626',
    fontSize: 11,
    fontWeight: '700',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
  },
  sectionSpaced: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  sectionDesc: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 6,
    marginBottom: 16,
    lineHeight: 20,
  },
  field: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '600',
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#fff',
  },
  passRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  passInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  eyeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: ACCENT,
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 4,
  },
  saveBtnDisabled: {
    opacity: 0.7,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
