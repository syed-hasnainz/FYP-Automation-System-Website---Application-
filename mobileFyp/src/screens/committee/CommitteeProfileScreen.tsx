import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import Toast from 'react-native-toast-message';
import ImageCropPicker from 'react-native-image-crop-picker';
import { LoadingView } from '../../components/portal/LoadingView';
import { PortalScreenLayout } from '../../components/portal/PortalScreenLayout';
import { SheetModal } from '../../components/portal/SheetModal';
import { useAuthUser } from '../../hooks/useAuthUser';
import {
  applyProfilePictureToAuth,
  changeAccountPassword,
  deleteTeacherProfilePicture,
  fetchTeacherProfile,
  getProfileImageUri,
  mapApiToTeacherProfileForm,
  syncProfileToAuth,
  updateTeacherProfile,
  uploadProfilePicture,
  type TeacherProfileFormState,
} from '../../services/profileService';

const ACCENT = '#16a34a';

function FormLabel({ children }: { children: string }) {
  return <Text style={styles.label}>{children}</Text>;
}

function FormField({
  value,
  onChangeText,
  placeholder,
  keyboardType,
  secureTextEntry,
  editable = true,
}: {
  value: string;
  onChangeText?: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address';
  secureTextEntry?: boolean;
  editable?: boolean;
}) {
  return (
    <TextInput
      style={[styles.input, !editable && styles.inputDisabled]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#9ca3af"
      keyboardType={keyboardType}
      autoCapitalize="none"
      secureTextEntry={secureTextEntry}
      editable={editable}
    />
  );
}

export function CommitteeProfileScreen() {
  const { user } = useAuthUser();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [form, setForm] = useState<TeacherProfileFormState>({
    fullName: '',
    email: '',
    department: '',
    designation: '',
    officeHours: '',
    profilePicture: null,
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [photoOptionsOpen, setPhotoOptionsOpen] = useState(false);

  const loadData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    try {
      const data = await fetchTeacherProfile(user.id);
      const mapped = mapApiToTeacherProfileForm(data);
      setForm(mapped);
      setPreviewUri(getProfileImageUri(mapped.profilePicture, user.id));
      if (mapped.profilePicture) {
        await applyProfilePictureToAuth(mapped.profilePicture);
      }
    } catch {
      setForm({
        fullName: user.name ?? '',
        email: user.email ?? '',
        department: user.department ?? '',
        designation: '',
        officeHours: '',
        profilePicture: null,
      });
      setPreviewUri(getProfileImageUri(user.profileImage, user.id));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const setField = <K extends keyof TeacherProfileFormState>(
    key: K,
    value: TeacherProfileFormState[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const uploadPhotoFromUri = async (localUri: string, fileName: string, mimeType: string) => {
    setPreviewUri(getProfileImageUri(localUri, user?.id) ?? localUri);
    setUploadingPhoto(true);
    try {
      const url = await uploadProfilePicture(localUri, fileName, mimeType);
      setField('profilePicture', url);
      setPreviewUri(getProfileImageUri(url, user?.id));
      await applyProfilePictureToAuth(url);
      Toast.show({ type: 'success', text1: 'Profile picture updated' });
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to upload photo' });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const uploadFromGallery = async () => {
    try {
      const image = await ImageCropPicker.openPicker({
        width: 400,
        height: 400,
        cropping: true,
        cropperCircleOverlay: true,
        compressImageQuality: 0.85,
        mediaType: 'photo',
      });
      if (!image?.path) {
        return;
      }
      const name = image.filename ?? 'profile.jpg';
      const mime = image.mime ?? 'image/jpeg';
      await uploadPhotoFromUri(image.path, name, mime);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'E_PICKER_CANCELLED') {
        return;
      }
      Toast.show({ type: 'error', text1: 'Failed to select photo' });
    }
  };

  const removeProfilePhoto = () => {
    if (!user?.id) {
      return;
    }
    Alert.alert('Remove profile photo?', 'Your photo will be removed from your account.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setUploadingPhoto(true);
          try {
            await deleteTeacherProfilePicture(user.id);
            setField('profilePicture', null);
            setPreviewUri(null);
            await applyProfilePictureToAuth(null);
            Toast.show({ type: 'success', text1: 'Profile photo removed' });
          } catch {
            Toast.show({ type: 'error', text1: 'Failed to remove photo' });
          } finally {
            setUploadingPhoto(false);
          }
        },
      },
    ]);
  };

  const handleSave = () => {
    if (!form.fullName.trim() || !form.email.trim()) {
      Toast.show({ type: 'error', text1: 'Name and email are required' });
      return;
    }

    Alert.alert('Save changes?', 'Update your profile information?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Save',
        onPress: async () => {
          setSaving(true);
          try {
            await updateTeacherProfile({
              name: form.fullName.trim(),
              email: form.email.trim(),
              department: form.department.trim(),
              designation: form.designation.trim(),
              officeHours: form.officeHours.trim(),
              profileImage: form.profilePicture,
            });

            await syncProfileToAuth({
              name: form.fullName.trim(),
              email: form.email.trim(),
              department: form.department.trim(),
              profileImage: form.profilePicture,
            });

            Toast.show({ type: 'success', text1: 'Profile updated successfully' });
          } catch (e) {
            Toast.show({
              type: 'error',
              text1: 'Save failed',
              text2: e instanceof Error ? e.message : undefined,
            });
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
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
      await changeAccountPassword(passwordForm.currentPassword, passwordForm.newPassword);
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

  const displayImage = previewUri ?? getProfileImageUri(form.profilePicture, user?.id);

  return (
    <PortalScreenLayout
      title="Profile Settings"
      subtitle="Manage your profile information"
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        loadData();
      }}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Profile Settings</Text>
        <Text style={styles.cardSub}>Manage your profile information</Text>

        <View style={styles.profileHeader}>
          <View style={styles.avatarColumn}>
            <Pressable
              style={styles.avatarWrap}
              onPress={() => setPhotoOptionsOpen(true)}
              disabled={uploadingPhoto}>
              {displayImage ? (
                <Image source={{ uri: displayImage }} style={styles.avatarImage} resizeMode="cover" />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <FeatherIcon name="user" size={32} color="#9ca3af" />
                </View>
              )}
              {uploadingPhoto ? (
                <View style={styles.avatarOverlay}>
                  <ActivityIndicator color="#fff" />
                </View>
              ) : null}
            </Pressable>
            <Pressable
              style={styles.changePhotoBtn}
              onPress={() => setPhotoOptionsOpen(true)}
              disabled={uploadingPhoto}>
              <FeatherIcon name="camera" size={14} color="#fff" />
              <Text style={styles.changePhotoText}>Change Photo</Text>
            </Pressable>
          </View>

          <View style={styles.profileHeaderText}>
            <Text style={styles.profileName}>{form.fullName || user?.name || 'Committee Head'}</Text>
            <Text style={styles.profileEmail}>{form.email || user?.email || ''}</Text>
            <Text style={styles.profileRole}>Committee Head</Text>
          </View>
        </View>

        <FormLabel>Full Name</FormLabel>
        <FormField value={form.fullName} onChangeText={(v) => setField('fullName', v)} />

        <FormLabel>Email</FormLabel>
        <FormField
          value={form.email}
          onChangeText={(v) => setField('email', v)}
          keyboardType="email-address"
        />

        <FormLabel>Department</FormLabel>
        <FormField
          value={form.department}
          onChangeText={(v) => setField('department', v)}
          placeholder="Department"
        />

        <FormLabel>Role</FormLabel>
        <FormField value="Committee Head" editable={false} />

        <Pressable
          style={[styles.saveBtn, saving && styles.btnDisabled]}
          onPress={handleSave}
          disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Save Changes</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Change Password</Text>

        <FormLabel>Current Password</FormLabel>
        <FormField
          value={passwordForm.currentPassword}
          onChangeText={(v) => setPasswordForm((prev) => ({ ...prev, currentPassword: v }))}
          placeholder="Enter current password"
          secureTextEntry
        />

        <FormLabel>New Password</FormLabel>
        <FormField
          value={passwordForm.newPassword}
          onChangeText={(v) => setPasswordForm((prev) => ({ ...prev, newPassword: v }))}
          placeholder="Enter new password"
          secureTextEntry
        />

        <FormLabel>Confirm New Password</FormLabel>
        <FormField
          value={passwordForm.confirmPassword}
          onChangeText={(v) => setPasswordForm((prev) => ({ ...prev, confirmPassword: v }))}
          placeholder="Confirm new password"
          secureTextEntry
        />

        <Pressable
          style={[styles.saveBtn, changingPassword && styles.btnDisabled]}
          onPress={handlePasswordChange}
          disabled={changingPassword}>
          {changingPassword ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Update Password</Text>
          )}
        </Pressable>
      </View>

      <SheetModal
        visible={photoOptionsOpen}
        onClose={() => setPhotoOptionsOpen(false)}
        title="Profile Photo">
        <Pressable
          style={styles.photoOptionRow}
          onPress={() => {
            setPhotoOptionsOpen(false);
            uploadFromGallery();
          }}>
          <FeatherIcon name="image" size={18} color={ACCENT} />
          <Text style={styles.photoOptionText}>Upload from Gallery</Text>
        </Pressable>
        {form.profilePicture || previewUri ? (
          <Pressable
            style={styles.photoOptionRow}
            onPress={() => {
              setPhotoOptionsOpen(false);
              removeProfilePhoto();
            }}>
            <FeatherIcon name="trash-2" size={18} color="#dc2626" />
            <Text style={[styles.photoOptionText, { color: '#dc2626' }]}>Remove Photo</Text>
          </Pressable>
        ) : null}
      </SheetModal>
    </PortalScreenLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  cardSub: {
    marginTop: 4,
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  avatarColumn: {
    alignItems: 'center',
    gap: 8,
  },
  avatarWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    backgroundColor: '#e5e7eb',
  },
  avatarImage: { width: 80, height: 80 },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileHeaderText: {
    flex: 1,
    paddingTop: 4,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  profileEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  profileRole: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  changePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#111827',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  changePhotoText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#fafafa',
  },
  inputDisabled: {
    color: '#9ca3af',
    backgroundColor: '#f3f4f6',
  },
  saveBtn: {
    backgroundColor: ACCENT,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  photoOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  photoOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
});
