import { authDelete, authGet, authPost, authPut } from './apiClient';

export type AnnouncementType =
  | 'PROOF_SUBMISSION'
  | 'DEFENSE'
  | 'DEFENSE_SCHEDULE'
  | 'GENERAL'
  | 'OTHER';

export type AnnouncementPriority = 'HIGH' | 'NORMAL' | 'LOW';

export interface AdminAnnouncement {
  id: string;
  title: string;
  content: string;
  type: AnnouncementType;
  priority: AnnouncementPriority | string;
  deadlineDate?: string | null;
  expiresAt?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
  createdByName?: string;
  _count?: {
    proofSubmissions?: number;
    evaluations?: number;
  };
}

export interface AnnouncementPayload {
  title: string;
  content: string;
  type: AnnouncementType;
  priority?: AnnouncementPriority;
  deadlineDate?: string | null;
  expiresAt?: string | null;
  isActive?: boolean;
}

export async function fetchAdminAnnouncements() {
  return authGet<AdminAnnouncement[]>('/api/announcements');
}

export async function fetchAnnouncementById(id: string) {
  return authGet<AdminAnnouncement>(`/api/announcements/${id}`);
}

export async function createAnnouncement(payload: AnnouncementPayload) {
  return authPost<{ success?: boolean; announcement?: AdminAnnouncement }>(
    '/api/announcements',
    payload,
  );
}

export async function updateAnnouncement(id: string, payload: AnnouncementPayload) {
  return authPut<AdminAnnouncement>(`/api/committee/announcements/${id}`, payload);
}

export async function deleteAnnouncement(id: string) {
  return authDelete<{ success?: boolean }>(`/api/announcements/${id}`);
}

export type CommitteeAnnouncementType = 'PROOF_SUBMISSION' | 'OTHER';

export interface CommitteeAnnouncementPayload {
  title: string;
  content: string;
  type: CommitteeAnnouncementType;
  priority?: AnnouncementPriority;
  deadlineDate?: string | null;
  expiresAt?: string | null;
  isActive?: boolean;
}

export async function fetchCommitteeAnnouncements() {
  return authGet<AdminAnnouncement[]>('/api/committee/announcements');
}

export async function fetchCommitteeAnnouncementById(id: string) {
  return authGet<AdminAnnouncement>(`/api/committee/announcements/${id}`);
}

export async function createCommitteeAnnouncement(payload: CommitteeAnnouncementPayload) {
  return authPost<AdminAnnouncement>('/api/committee/announcements', payload);
}

export async function updateCommitteeAnnouncement(
  id: string,
  payload: CommitteeAnnouncementPayload,
) {
  return authPut<AdminAnnouncement>(`/api/committee/announcements/${id}`, payload);
}

export async function deleteCommitteeAnnouncement(id: string) {
  return authDelete<{ success?: boolean }>(`/api/committee/announcements/${id}`);
}
