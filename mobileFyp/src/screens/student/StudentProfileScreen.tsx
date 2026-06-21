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
import {
  errorCodes,
  isErrorWithCode,
  keepLocalCopy,
  pick,
  types,
} from '@react-native-documents/picker';
import FeatherIcon from 'react-native-vector-icons/Feather';
import Toast from 'react-native-toast-message';
import { LoadingView } from '../../components/portal/LoadingView';
import { PortalScreenLayout } from '../../components/portal/PortalScreenLayout';
import { SheetModal } from '../../components/portal/SheetModal';
import { useAuthUser } from '../../hooks/useAuthUser';
import ImageCropPicker from 'react-native-image-crop-picker';
import {
  applyProfilePictureToAuth,
  deleteProfilePicture,
  fetchStudentProfile,
  getProfileImageUri,
  mapApiToProfileForm,
  syncProfileToAuth,
  updateStudentProfile,
  uploadProfilePicture,
  type ProfileFormState,
} from '../../services/profileService';

function FormLabel({ children }: { children: string }) {
  return <Text style={styles.label}>{children}</Text>;
}

function FormField({
  value,
  onChangeText,
  placeholder,
  keyboardType,
  editable = true,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'decimal-pad';
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
      editable={editable}
      autoCapitalize="none"
    />
  );
}

export function StudentProfileScreen() {
  const { user } = useAuthUser();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [form, setForm] = useState<ProfileFormState>({
    fullName: '',
    email: '',
    rollNumber: '',
    department: '',
    gpa: '',
    semester: '',
    phone: '',
    profilePicture: null,
  });
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [photoOptionsOpen, setPhotoOptionsOpen] = useState(false);

  const loadData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    try {
      const data = await fetchStudentProfile(user.id);
      const mapped = mapApiToProfileForm(data);
      setForm(mapped);
      setPreviewUri(getProfileImageUri(mapped.profilePicture, user.id));
      if (mapped.profilePicture) {
        await applyProfilePictureToAuth(mapped.profilePicture);
      }
    } catch {
      setForm({
        fullName: user.name ?? '',
        email: user.email ?? '',
        rollNumber: user.rollNumber ?? '',
        department: user.department ?? '',
        gpa: '',
        semester: '',
        phone: '',
        profilePicture: null,
      });
      setPreviewUri(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const setField = <K extends keyof ProfileFormState>(key: K, value: ProfileFormState[K]) => {
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

  const pickProfilePhoto = async () => {
    try {
      const [file] = await pick({
        type: [types.images],
        allowMultiSelection: false,
      });
      if (!file?.uri) return;

      const copies = await keepLocalCopy({
        files: [{ uri: file.uri, fileName: file.name ?? 'profile.jpg' }],
        destination: 'cachesDirectory',
      });
      const localUri = copies[0]?.uri ?? file.uri;
      await uploadPhotoFromUri(
        localUri,
        file.name ?? 'profile.jpg',
        file.type ?? 'image/jpeg',
      );
    } catch (err) {
      if (isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED) {
        return;
      }
      Toast.show({ type: 'error', text1: 'Failed to upload photo' });
    }
  };

  const cropProfilePhoto = async () => {
    try {
      const image = await ImageCropPicker.openPicker({
        width: 400,
        height: 400,
        cropping: true,
        cropperCircleOverlay: true,
        compressImageQuality: 0.85,
        mediaType: 'photo',
      });
      if (!image?.path) return;
      const name = image.filename ?? 'profile.jpg';
      const mime = image.mime ?? 'image/jpeg';
      await uploadPhotoFromUri(image.path, name, mime);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'E_PICKER_CANCELLED') return;
      Toast.show({ type: 'error', text1: 'Failed to crop photo' });
    }
  };

  const removeProfilePhoto = () => {
    if (!user?.id) return;
    Alert.alert('Remove profile photo?', 'Your photo will be removed from your account.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setUploadingPhoto(true);
          try {
            await deleteProfilePicture(user.id);
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

  const showPhotoOptions = () => setPhotoOptionsOpen(true);

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
            await updateStudentProfile({
              name: form.fullName.trim(),
              email: form.email.trim(),
              rollNumber: form.rollNumber.trim(),
              department: form.department.trim(),
              gpa: parseFloat(form.gpa) || 0,
              semester: parseInt(form.semester, 10) || 0,
              contactInfo: form.phone.trim(),
              profileImage: form.profilePicture,
            });

            await syncProfileToAuth({
              name: form.fullName.trim(),
              email: form.email.trim(),
              rollNumber: form.rollNumber.trim(),
              department: form.department.trim(),
              profileImage: form.profilePicture,
            });

            Toast.show({ type: 'success', text1: 'Profile saved successfully' });
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

  if (loading) {
    return <LoadingView message="Loading profile..." />;
  }

  const displayImage = previewUri ?? getProfileImageUri(form.profilePicture, user?.id);

  return (
    <PortalScreenLayout
      title="Profile"
      subtitle="Manage your account information"
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        loadData();
      }}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Profile Information</Text>

        <View style={styles.profileHeader}>
          <Pressable style={styles.avatarWrap} onPress={showPhotoOptions} disabled={uploadingPhoto}>
            {displayImage ? (
              <Image
                source={{ uri: displayImage }}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <FeatherIcon name="user" size={32} color="#6b7280" />
              </View>
            )}
            {uploadingPhoto ? (
              <View style={styles.avatarOverlay}>
                <ActivityIndicator color="#fff" />
              </View>
            ) : null}
          </Pressable>
          <View style={styles.profileHeaderText}>
            <Text style={styles.profileName}>{form.fullName || 'Student'}</Text>
            <Text style={styles.profileDept}>{form.department || 'Department'}</Text>
            <Pressable
              style={styles.changePhotoBtn}
              onPress={showPhotoOptions}
              disabled={uploadingPhoto}>
              <FeatherIcon name="camera" size={14} color="#fff" />
              <Text style={styles.changePhotoText}>Photo Options</Text>
            </Pressable>
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

        <FormLabel>Roll Number</FormLabel>
        <FormField value={form.rollNumber} onChangeText={(v) => setField('rollNumber', v)} />

        <FormLabel>Department</FormLabel>
        <FormField value={form.department} onChangeText={(v) => setField('department', v)} />

        <FormLabel>GPA</FormLabel>
        <FormField
          value={form.gpa}
          onChangeText={(v) => setField('gpa', v)}
          keyboardType="decimal-pad"
          placeholder="e.g. 3.5"
        />

        <FormLabel>Semester</FormLabel>
        <FormField
          value={form.semester}
          onChangeText={(v) => setField('semester', v)}
          keyboardType="phone-pad"
          placeholder="e.g. 1"
        />

        <FormLabel>Phone</FormLabel>
        <FormField
          value={form.phone}
          onChangeText={(v) => setField('phone', v)}
          keyboardType="phone-pad"
          placeholder="Contact number"
        />

        <Pressable
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Save Changes</Text>
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
            pickProfilePhoto();
          }}>
          <FeatherIcon name="image" size={18} color="#2563eb" />
          <Text style={styles.photoOptionText}>Change Photo</Text>
        </Pressable>
        <Pressable
          style={styles.photoOptionRow}
          onPress={() => {
            setPhotoOptionsOpen(false);
            cropProfilePhoto();
          }}>
          <FeatherIcon name="crop" size={18} color="#2563eb" />
          <Text style={styles.photoOptionText}>Crop & Set Photo</Text>
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
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
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
  profileHeaderText: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: '700', color: '#111827' },
  profileDept: { fontSize: 14, color: '#6b7280', marginTop: 2, marginBottom: 10 },
  changePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#111827',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  changePhotoText: { color: '#fff', fontSize: 13, fontWeight: '600' },
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
  inputDisabled: { backgroundColor: '#f3f4f6', color: '#6b7280' },
  saveBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  photoOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  photoOptionText: { fontSize: 16, fontWeight: '600', color: '#111827' },
});
