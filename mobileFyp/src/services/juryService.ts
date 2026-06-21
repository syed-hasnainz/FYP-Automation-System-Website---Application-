import { authDelete, authGet, authPatch, authPost } from './apiClient';
import type { AdminGroup, AdminUser } from './adminService';

export type DefenseType = 'PROPOSAL' | 'FYP_I' | 'FYP_II';

export interface JuryAssignment {
  id: string;
  defenseScheduleId: string;
  groupId: string;
  groupName?: string;
  projectTitle?: string;
  juryMembers: string;
  chairpersonId?: string;
  evaluationStatus: string;
  marks?: number;
  feedback?: string;
  juryEvaluations?: string;
}

export interface DefenseSchedule {
  id: string;
  defenseType: DefenseType;
  title: string;
  description?: string;
  defenseDate: string;
  defenseTime: string;
  venue: string;
  status?: string;
  isPublished: boolean;
  createdAt: string;
  juryAssignments?: JuryAssignment[];
}

export interface ApprovedDefense {
  id: string;
  defenseType: DefenseType;
  title: string;
  marks?: number | null;
  feedback?: string | null;
  approvedAt: string;
  defenseDate?: string | null;
  project: {
    id: string;
    title: string;
    group?: { id: string; name: string; members?: unknown[] } | null;
    supervisor?: { id: string; name: string; email?: string; department?: string } | null;
  };
  student?: { id: string; name: string; email: string; rollNumber?: string } | null;
}

export interface GroupWithDetails extends AdminGroup {
  projects?: Array<{ title?: string }>;
  members?: Array<{
    user?: { name?: string; email?: string; rollNumber?: string };
  }>;
}

export async function fetchDefenseSchedules() {
  return authGet<DefenseSchedule[]>('/api/admin/jury/schedules');
}

export async function fetchDefenseScheduleById(scheduleId: string) {
  return authGet<DefenseSchedule>(`/api/admin/jury/schedules/${scheduleId}`);
}

export async function createDefenseSchedule(payload: {
  defenseType: DefenseType;
  title: string;
  description?: string;
  defenseDate: string;
  defenseTime: string;
  venue: string;
  isPublished: boolean;
  createdBy: string;
  selectedTeachers: string[];
  selectedGroups: string[];
}) {
  return authPost<DefenseSchedule>('/api/admin/jury/schedules', payload);
}

export async function deleteDefenseSchedule(scheduleId: string) {
  return authDelete<{ message?: string }>(`/api/admin/jury/schedules/${scheduleId}`);
}

export async function createJuryAssignment(
  scheduleId: string,
  payload: {
    groupId: string;
    groupName: string;
    projectTitle: string;
    juryMembers: string[];
    chairpersonId: string;
  },
) {
  return authPost<JuryAssignment>(
    `/api/admin/jury/schedules/${scheduleId}/assignments`,
    payload,
  );
}

export async function fetchApprovedDefenses() {
  return authGet<ApprovedDefense[]>('/api/admin/jury/approved-proposals');
}

export async function deleteJuryAssignment(assignmentId: string) {
  return authDelete<{ message?: string }>(`/api/admin/jury/assignments/${assignmentId}`);
}

export async function evaluateJuryAssignment(
  assignmentId: string,
  payload: {
    evaluationStatus: string;
    scheduleId: string;
    marks?: number;
    feedback?: string;
  },
) {
  return authPatch<JuryAssignment>(
    `/api/admin/jury/assignments/${assignmentId}/evaluate`,
    payload,
  );
}

export async function fetchTeachersForJury() {
  const users = await authGet<AdminUser[]>('/api/admin/users');
  return users.filter((user) => user.role === 'TEACHER');
}

export async function fetchAllGroupsForJury() {
  return authGet<GroupWithDetails[]>('/api/admin/groups', { status: 'all' });
}
