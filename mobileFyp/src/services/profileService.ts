import ReactNativeBlobUtil from 'react-native-blob-util';
import { authGet, authPost, authPut, getAuthHeaders, getResolvedApiBaseUrl } from './apiClient';
import { resolveBackendFileUrl } from './proofSubmissionService';
import type { AuthUser } from '../types/auth';
import { useAuthStore } from '../store/authStore';
import { getStoredUser } from '../utils/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface StudentProfileData {
  id: string;
  name: string;
  email: string;
  rollNumber?: string;
  department?: string;
  gpa?: number;
  semester?: number;
  contactInfo?: string;
  profileImage?: string | null;
  studentProfile?: {
    semester?: number;
    batch?: string;
  };
}

export interface ProfileFormState {
  fullName: string;
  email: string;
  rollNumber: string;
  department: string;
  gpa: string;
  semester: string;
  phone: string;
  profilePicture: string | null;
}

export function mapApiToProfileForm(data: StudentProfileData): ProfileFormState {
  return {
    fullName: data.name ?? '',
    email: data.email ?? '',
    rollNumber: data.rollNumber ?? '',
    department: data.department ?? '',
    gpa: data.gpa != null ? String(data.gpa) : '',
    semester:
      data.semester != null
        ? String(data.semester)
        : data.studentProfile?.semester != null
          ? String(data.studentProfile.semester)
          : '',
    phone: data.contactInfo ?? '',
    profilePicture: data.profileImage ?? null,
  };
}

export function getProfileImageUri(path?: string | null, userId?: string | null) {
  if (!path || path === 'null') return null;
  if (
    path.startsWith('data:') ||
    path.startsWith('file://') ||
    path.startsWith('content://') ||
    path.startsWith('http://') ||
    path.startsWith('https://')
  ) {
    return path;
  }
  if (userId && (path.startsWith('/profile-pictures/') || path.startsWith('/api/profile/image/'))) {
    return resolveBackendFileUrl(`/api/profile/image/${userId}`);
  }
  if (path.startsWith('/api/profile/image/')) {
    return resolveBackendFileUrl(path);
  }
  if (path.startsWith('/') && !path.startsWith('/profile-pictures') && !path.startsWith('/uploads')) {
    return `file://${path}`;
  }
  return resolveBackendFileUrl(path);
}

export async function fetchStudentProfile(userId: string) {
  return authGet<StudentProfileData>('/api/profile', { userId });
}

export async function updateStudentProfile(payload: {
  name: string;
  email: string;
  rollNumber: string;
  department: string;
  gpa: number;
  semester: number;
  contactInfo: string;
  profileImage?: string | null;
}) {
  return authPut<StudentProfileData>('/api/profile', payload);
}

export async function uploadProfilePicture(fileUri: string, fileName: string, mimeType: string) {
  const baseUrl = getResolvedApiBaseUrl();
  const authHeaders = await getAuthHeaders();
  const userId = authHeaders['x-user-id'];
  const path = fileUri.replace(/^file:\/\//, '');
  const response = await ReactNativeBlobUtil.fetch(
    'POST',
    `${baseUrl}/api/profile/picture${userId ? `?userId=${userId}` : ''}`,
    { 'Content-Type': 'multipart/form-data', ...authHeaders },
    [
      {
        name: 'file',
        filename: fileName,
        type: mimeType,
        data: ReactNativeBlobUtil.wrap(path),
      },
    ],
  );
  const status = response.info().status;
  const bodyText = await response.text();
  let body: { profilePictureUrl?: string; error?: string } = {};
  try {
    body = JSON.parse(bodyText);
  } catch {
    body = {};
  }
  if (status < 200 || status >= 300) {
    throw new Error(body.error ?? 'Failed to upload profile picture');
  }
  if (!body.profilePictureUrl) {
    throw new Error('No profile picture URL returned');
  }
  return body.profilePictureUrl;
}

export async function deleteProfilePicture(userId: string) {
  const current = await fetchStudentProfile(userId);
  return updateStudentProfile({
    name: current.name,
    email: current.email,
    rollNumber: current.rollNumber ?? '',
    department: current.department ?? '',
    gpa: current.gpa ?? 0,
    semester: current.semester ?? current.studentProfile?.semester ?? 0,
    contactInfo: current.contactInfo ?? '',
    profileImage: null,
  });
}

export interface TeacherProfileData {
  id: string;
  name: string;
  email: string;
  department?: string;
  designation?: string;
  officeHours?: string;
  profileImage?: string | null;
  teacherProfile?: {
    designation?: string;
    officeHours?: string;
  };
}

export interface TeacherProfileFormState {
  fullName: string;
  email: string;
  department: string;
  designation: string;
  officeHours: string;
  profilePicture: string | null;
}

export function mapApiToTeacherProfileForm(data: TeacherProfileData): TeacherProfileFormState {
  return {
    fullName: data.name ?? '',
    email: data.email ?? '',
    department: data.department ?? '',
    designation: data.designation ?? data.teacherProfile?.designation ?? '',
    officeHours: data.officeHours ?? data.teacherProfile?.officeHours ?? '',
    profilePicture: data.profileImage ?? null,
  };
}

export async function fetchTeacherProfile(userId: string) {
  return authGet<TeacherProfileData>('/api/profile', { userId });
}

export async function updateTeacherProfile(payload: {
  name: string;
  email: string;
  department: string;
  designation: string;
  officeHours: string;
  profileImage?: string | null;
}) {
  return authPut<TeacherProfileData>('/api/profile', payload);
}

export async function deleteTeacherProfilePicture(userId: string) {
  const current = await fetchTeacherProfile(userId);
  return updateTeacherProfile({
    name: current.name,
    email: current.email,
    department: current.department ?? '',
    designation: current.designation ?? current.teacherProfile?.designation ?? '',
    officeHours: current.officeHours ?? current.teacherProfile?.officeHours ?? '',
    profileImage: null,
  });
}

/** Push profile image (and optional fields) into auth store + AsyncStorage for drawer/header. */
export async function syncProfileToAuth(updates: Partial<AuthUser>) {
  const stored = await getStoredUser<AuthUser>();
  if (!stored) return;
  const merged: AuthUser = { ...stored, ...updates };
  await AsyncStorage.setItem('user', JSON.stringify(merged));
  useAuthStore.getState().setUser(merged);
}

export async function applyProfilePictureToAuth(profileImageUrl: string | null) {
  await syncProfileToAuth({
    profileImage: profileImageUrl,
  });
}

export async function changeAccountPassword(currentPassword: string, newPassword: string) {
  return authPost<{ message?: string }>('/api/auth/change-password', {
    currentPassword,
    newPassword,
  });
}