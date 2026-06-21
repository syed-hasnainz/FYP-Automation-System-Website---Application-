import { authDelete, authGet, authPatch, authPost, authPut } from './apiClient';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  isActive?: boolean;
  department?: string;
  rollNumber?: string;
  createdAt?: string;
  gpa?: number;
  cgpa?: number;
}

export interface AdminProject {
  id: string;
  title: string;
  description?: string;
  status?: string;
  createdAt?: string;
  supervisor?: { name?: string };
}

export interface ReviewProject {
  id: string;
  title?: string;
  proposalTitle?: string;
  projectTitle?: string;
  proposalDescription?: string;
  description?: string;
  status?: string;
  projectStatus?: string;
  studentNames?: string;
  supervisor?: string | { name?: string };
  teacher?: { name?: string };
  submittedDate?: string;
  approvedDate?: string;
  createdAt?: string;
  weeklyReports?: Array<{ id: string; week?: string; title?: string }>;
  group?: {
    name?: string;
    members?: Array<{ name?: string; user?: { name?: string } }>;
  };
  fileUrl?: string;
}

export interface AdminFaculty {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  departments?: string | null;
  isActive?: boolean;
}

export interface AdminCommittee {
  id: string;
  name: string;
  description?: string | null;
  head?: string;
  headId?: string;
  members?: Array<string | { id: string; name: string; email?: string }>;
  memberIds?: string[];
  status?: string;
  created?: string;
  isActive?: boolean;
}

export interface AdminGroup {
  id: string;
  name: string;
  status?: string;
  isApproved?: boolean;
  createdAt?: string;
  approver?: { name?: string };
  members?: Array<{ user?: { name?: string; rollNumber?: string } }>;
}

export async function fetchAllUsers() {
  return authGet<AdminUser[]>('/api/admin/users');
}

export async function createAdminUser(payload: {
  name: string;
  email: string;
  role: string;
  department?: string;
  password?: string;
}) {
  return authPost<AdminUser>('/api/admin/users', payload);
}

export async function updateAdminUser(userId: string, payload: Partial<AdminUser>) {
  return authPut<AdminUser>(`/api/admin/users/${userId}`, payload);
}

export async function updateAdminUserStatus(userId: string, action: 'approve' | 'reject') {
  return authPatch<AdminUser>(`/api/admin/users/${userId}`, { action });
}

export async function deleteAdminUser(userId: string) {
  return authDelete<{ success?: boolean }>(`/api/admin/users/${userId}`);
}

export async function fetchAllProjects() {
  return authGet<AdminProject[]>('/api/admin/projects');
}

export async function fetchApprovedProjects() {
  return authGet<ReviewProject[]>('/api/admin/projects/approved');
}

export async function fetchGroups(status = 'pending') {
  return authGet<AdminGroup[]>('/api/admin/groups', { status });
}

export async function approveGroup(groupId: string) {
  return authPatch(`/api/admin/groups/${groupId}/approve`, { approve: true });
}

export async function fetchStudentProjects() {
  return authGet<ReviewProject[]>('/api/admin/student-projects');
}

export async function fetchFaculties() {
  return authGet<AdminFaculty[]>('/api/admin/faculties');
}

export async function createFaculty(payload: {
  name: string;
  description?: string;
  code?: string;
  departments?: string;
}) {
  return authPost<AdminFaculty>('/api/admin/faculties', payload);
}

export async function updateFaculty(
  facultyId: string,
  payload: Partial<AdminFaculty>,
) {
  return authPut<AdminFaculty>(`/api/admin/faculties/${facultyId}`, payload);
}

export async function deleteFaculty(facultyId: string) {
  return authDelete<{ success?: boolean }>(`/api/admin/faculties/${facultyId}`);
}

export async function fetchFacultyProjectIdeas() {
  return authGet<AdminProject[]>('/api/faculty-ideas');
}

export async function createFacultyProjectIdea(payload: {
  title: string;
  description: string;
  domain?: string;
  requirements?: string;
  tools?: string;
  objectives?: string;
}) {
  return authPost<AdminProject>('/api/faculty-ideas', payload);
}

export async function deleteProjectIdea(projectId: string) {
  return authDelete<{ success?: boolean }>(`/api/admin/projects/${projectId}`);
}

export async function fetchCommittees() {
  return authGet<AdminCommittee[]>('/api/admin/committees');
}

export async function createCommittee(payload: {
  name: string;
  headId: string;
  head?: string;
  description?: string;
  memberIds?: string[];
  members?: string[];
}) {
  return authPost<{ committee?: AdminCommittee }>('/api/admin/committees', payload);
}

export async function updateCommittee(
  committeeId: string,
  payload: Partial<AdminCommittee> & { memberIds?: string[] },
) {
  return authPut<{ committee?: AdminCommittee }>(
    `/api/admin/committees/${committeeId}`,
    payload,
  );
}

export async function deleteCommittee(committeeId: string) {
  return authDelete<{ message?: string }>(`/api/admin/committees/${committeeId}`);
}

export interface AccessPasses {
  ADMIN: string;
  TEACHER: string;
  COMMITTEE_HEAD: string;
}

export async function fetchAccessPasses() {
  const data = await authGet<{ accessPasses: AccessPasses }>(
    '/api/admin/access-passes',
  );
  return data.accessPasses;
}

export async function updateAccessPasses(
  passes: Partial<Pick<AccessPasses, 'TEACHER' | 'COMMITTEE_HEAD'>>,
) {
  return authPut<{ accessPasses: AccessPasses }>('/api/admin/access-passes', passes);
}
