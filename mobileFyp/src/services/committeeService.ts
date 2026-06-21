import { authDelete, authGet, authPatch, authPost } from './apiClient';
import { updateAdminUser, updateCommittee } from './adminService';
import { fetchAllNotifications } from './notificationService';

export interface CommitteeProjectMember {
  id?: string;
  name?: string;
  email?: string;
  rollNumber?: string;
  department?: string;
}

export interface CommitteeProject {
  id: string;
  proposalId?: string;
  proposalTitle?: string;
  proposalDescription?: string;
  projectId?: string;
  title?: string;
  projectTitle?: string;
  description?: string;
  projectDescription?: string;
  status?: string;
  projectStatus?: string;
  fileUrl?: string;
  fileName?: string;
  submittedDate?: string;
  approvedDate?: string;
  createdAt?: string;
  group?: {
    id?: string;
    name?: string;
    members?: CommitteeProjectMember[];
  };
  supervisor?: {
    id?: string;
    name?: string;
    email?: string;
    department?: string;
  };
  submittedBy?: {
    id?: string;
    name?: string;
    email?: string;
    rollNumber?: string;
    department?: string;
  };
}

export interface CommitteeGroupMember {
  id?: string;
  role?: string;
  user?: {
    id?: string;
    name?: string;
    email?: string;
    rollNumber?: string;
    department?: string;
    role?: string;
  };
}

export interface CommitteeGroup {
  id: string;
  name: string;
  status?: string;
  isApproved?: boolean;
  createdAt?: string;
  approvedAt?: string | null;
  approvedBy?: string | null;
  members?: CommitteeGroupMember[];
  projects?: Array<{ id?: string; title?: string; status?: string }>;
  approver?: {
    id?: string;
    name?: string;
    email?: string;
    role?: string;
  };
}

export interface CommitteeFile {
  id: string;
  originalName?: string;
  fileName?: string;
  fileUrl?: string | null;
  fileType?: string;
  fileSize?: string;
  fileSizeBytes?: number;
  studentName?: string;
  studentEmail?: string;
  studentId?: string;
  studentRollNumber?: string;
  groupName?: string;
  groupId?: string | null;
  projectTitle?: string;
  projectId?: string | null;
  supervisorName?: string;
  supervisorEmail?: string;
  uploadDate?: string;
  uploadTime?: string;
  approvedDate?: string;
  status?: string;
  description?: string;
  department?: string;
  uploadedAt?: string;
}

export interface CommitteeReportAnalytics {
  projectCompletionRate: number;
  averageReviewScore: number;
  committeeEfficiency: number;
}

export interface CommitteeReport {
  id: string;
  title: string;
  type?: string;
  generatedDate: string;
  status: string;
  groupId?: string | null;
  defenseScheduleId?: string;
  data?: {
    group?: { id?: string };
  };
}

export type CommitteeReportType =
  | 'PROJECT_SUMMARY'
  | 'GROUP_REPORT'
  | 'PERFORMANCE'
  | 'REVIEW_ANALYSIS'
  | 'MEETING_SUMMARY';

export type CommitteeReportDateRange =
  | 'LAST_WEEK'
  | 'LAST_MONTH'
  | 'LAST_QUARTER'
  | 'LAST_YEAR'
  | 'ALL_TIME';

export interface CommitteeReportPayload {
  type: CommitteeReportType;
  dateRange: CommitteeReportDateRange;
  department: string;
  groupId?: string;
}

export interface ProfileData {
  id: string;
  name: string;
  email: string;
  department?: string;
  phone?: string;
  bio?: string;
}

export interface CommitteeMember {
  id?: string;
  name?: string;
  email?: string;
  department?: string;
  role?: string;
  profileImage?: string | null;
  designation?: string;
  employeeId?: string;
  officeHours?: string;
  supervisionCapacity?: number;
}

export interface MyCommittee {
  id: string;
  name: string;
  description?: string | null;
  headId?: string;
  head?: string;
  headDetails?: {
    id?: string;
    name?: string;
    email?: string;
    department?: string;
    profileImage?: string | null;
  };
  members?: CommitteeMember[];
  memberIds?: string[];
  status?: string;
  isActive?: boolean;
}

import type { ReviewStatusFilter } from './submissionService';

export async function fetchCommitteeProjects(reviewStatus: ReviewStatusFilter = 'all') {
  return authGet<CommitteeProject[]>('/api/committee/projects', { reviewStatus });
}

export async function fetchCommitteeGroups(status = 'pending') {
  return authGet<CommitteeGroup[]>('/api/admin/groups', { status });
}

export async function approveGroup(groupId: string, approve = true) {
  return authPatch(`/api/admin/groups/${groupId}/approve`, { approve });
}

import type { ReviewStatusFilter } from './submissionService';

export async function fetchCommitteeFiles(reviewStatus: ReviewStatusFilter = 'all') {
  return authGet<CommitteeFile[]>('/api/committee/files', { reviewStatus });
}

export async function updateCommitteeFileStatus(
  fileId: string,
  status: 'COMMITTEE_APPROVED' | 'COMMITTEE_REJECTED',
) {
  return authPatch('/api/committee/files', { fileId, status });
}

export async function deleteCommitteeFile(fileId: string) {
  return authDelete(`/api/committee/files/${fileId}`);
}

export async function fetchProfile(userId: string) {
  return authGet<ProfileData>('/api/profile', { userId });
}

export async function fetchMyCommittee(headId: string) {
  const committees = await authGet<MyCommittee[]>('/api/admin/committees', { headId });
  const list = Array.isArray(committees) ? committees : [];
  return list.find((committee) => committee.headId === headId) ?? null;
}

export async function removeCommitteeMember(committee: MyCommittee, memberId: string) {
  const existingIds =
    committee.memberIds ??
    committee.members?.map((member) => member.id).filter((id): id is string => Boolean(id)) ??
    [];
  const memberIds = existingIds.filter((id) => id !== memberId);
  return updateCommittee(committee.id, { memberIds });
}

export async function updateCommitteeMember(
  memberId: string,
  payload: {
    name?: string;
    email?: string;
    department?: string;
    supervisionCapacity?: number;
    role?: string;
  },
) {
  return updateAdminUser(memberId, payload);
}

export { fetchAllNotifications as fetchNotifications } from './notificationService';

export function computeCommitteeOverviewStats(
  projects: CommitteeProject[],
  files: CommitteeFile[],
) {
  const projectList = Array.isArray(projects) ? projects : [];
  const fileList = Array.isArray(files) ? files : [];
  const pendingReviews = projectList.filter(
    (project) =>
      project.projectStatus === 'PROPOSED' || project.projectStatus === 'IN_PROGRESS',
  ).length;
  const completedReviews = projectList.filter(
    (project) =>
      project.projectStatus === 'APPROVED' || project.projectStatus === 'COMPLETED',
  ).length;

  return {
    totalProjects: projectList.length,
    pendingReviews,
    completedReviews,
    filesUploaded: fileList.length,
  };
}

export async function fetchRecentActivities() {
  const notifications = await fetchAllNotifications();
  return notifications.slice(0, 5);
}

export async function fetchCommitteeReports() {
  return authGet<CommitteeReport[]>('/api/committee/reports');
}

export async function fetchCommitteeReportAnalytics() {
  return authGet<CommitteeReportAnalytics>('/api/committee/reports/analytics');
}

export async function generateCommitteeReport(payload: CommitteeReportPayload) {
  return authPost<CommitteeReport>('/api/committee/reports', payload);
}

export interface PendingRegistrationUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  department?: string;
  rollNumber?: string;
  gpa?: number;
  createdAt?: string;
  studentProfile?: {
    faculty?: string;
    session?: string;
    cgpa?: number;
    eligibilityStatus?: string;
  };
  teacherProfile?: {
    faculty?: string;
  };
}

export async function fetchPendingRegistrations() {
  return authGet<PendingRegistrationUser[]>('/api/committee/users', {
    status: 'PENDING',
  });
}

export async function updatePendingRegistrationStatus(
  userId: string,
  action: 'approve' | 'reject',
) {
  return authPatch('/api/committee/users', { userId, action });
}
