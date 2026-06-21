import { apiClient } from './apiClient';
import type { LoginResponse, RegisterResponse, SystemSettings } from '../types/auth';

export async function fetchSystemSettings(): Promise<SystemSettings> {
  const { data } = await apiClient.get<SystemSettings>('/api/settings');
  return data;
}

export async function login(email: string, password: string) {
  const { data } = await apiClient.post<LoginResponse>('/api/auth/login', {
    email,
    password,
  });
  return data;
}

export async function register(payload: Record<string, unknown>) {
  const { data } = await apiClient.post<RegisterResponse>(
    '/api/auth/register',
    payload,
  );
  return data;
}

export async function forgotPassword(email: string) {
  const { data } = await apiClient.post<{ message: string }>(
    '/api/auth/forgot-password',
    { email },
  );
  return data;
}

export async function resetPassword(token: string, password: string) {
  const { data } = await apiClient.post<{ message: string }>(
    '/api/auth/reset-password',
    { token, password },
  );
  return data;
}

export async function completeConditionalRegistration(body: {
  userId: string;
  unpassedCourses?: string;
  conditionalCommitment: string;
}) {
  const { data } = await apiClient.post<{ message: string }>(
    '/api/auth/complete-conditional',
    body,
  );
  return data;
}

export interface RegistrationFaculty {
  id: string;
  name: string;
  departments?: string | null;
  isActive?: boolean;
}

export async function fetchRegistrationFaculties() {
  const { data } = await apiClient.get<RegistrationFaculty[]>(
    '/api/admin/faculties',
  );
  return (Array.isArray(data) ? data : []).filter(
    faculty => faculty.isActive !== false,
  );
}
