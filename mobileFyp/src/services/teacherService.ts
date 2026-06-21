import { authDelete, authGet, authPatch, authPost, authPut } from './apiClient';
import {
  fetchAllNotifications,
  type NotificationItem,
} from './notificationService';

export interface TeacherProject {
  id: string;
  title: string;
  description?: string;
  requirements?: string;
  status?: string;
  teacherId?: string;
  createdAt?: string;
  teacher?: {
    id?: string;
    name?: string;
    department?: string;
  };
  group?: {
    members?: Array<{
      user?: { name?: string };
    }>;
  };
  submissions?: Array<{ id: string }>;
}

export interface ProjectFormData {
  title: string;
  description: string;
  requirements: string;
}

export interface SupervisedStudent {
  id: string;
  name: string;
  email?: string;
  rollNumber?: string;
  department?: string;
  gpa?: number;
  profileImage?: string | null;
  status?: string;
  role?: string;
  joinedAt?: string;
}

export interface SupervisedGroupProject {
  id: string;
  title: string;
  description?: string;
  status?: string;
}

export interface SupervisedGroup {
  id: string;
  name: string;
  description?: string;
  isApproved?: boolean;
  isActive?: boolean;
  memberCount?: number;
  status?: string;
  members?: SupervisedStudent[];
  projects?: SupervisedGroupProject[];
}

export interface SupervisionRequest {
  id: string;
  status: string;
  message?: string;
  createdAt?: string;
  student?: {
    id: string;
    name: string;
    email?: string;
    rollNumber?: string;
    department?: string;
  };
  project?: {
    id?: string;
    title?: string;
    description?: string;
    requirements?: string | null;
    proposalDocument?: string | null;
  };
  group?: {
    id: string;
    name: string;
    leader?: {
      id: string;
      name: string;
      email?: string;
      rollNumber?: string;
      role?: string;
    } | null;
    members?: Array<{
      id: string;
      name: string;
      email?: string;
      rollNumber?: string;
      role?: string;
    }>;
  } | null;
  proposalFile?: {
    id: string;
    fileName?: string | null;
    fileUrl?: string | null;
    status?: string;
    supervisorApprovalStatus?: string;
  } | null;
}

export interface SupervisionCapacityError {
  message: string;
  capacity: number;
  currentCount: number;
}

export interface FormattedSupervisionRequest {
  id: string;
  status: string;
  message: string;
  projectTitle: string;
  projectName: string;
  requirements: string;
  leaderName: string;
  memberNames: string;
  groupName: string;
  proposalFileUrl?: string | null;
  proposalFileName?: string | null;
  date: string;
  student: {
    name: string;
    email: string;
    rollNumber: string;
  };
}

export interface TeacherFile {
  id: string;
  name: string;
  originalName?: string;
  fileName?: string;
  fileType?: string;
  fileUrl?: string;
  fileSize?: number;
  status?: string;
  supervisorApprovalStatus?: string;
  description?: string;
  uploadedAt?: string;
  groupId?: string | null;
  groupName?: string;
  student?: {
    id?: string;
    name?: string;
    email?: string;
  };
  project?: {
    id?: string;
    title?: string;
  } | null;
}

export interface TeacherFileGroup {
  id: string;
  name: string;
  projectTitle?: string;
}

export interface TeacherFilesResponse {
  files: TeacherFile[];
  groups: TeacherFileGroup[];
}

export interface ProfileData {
  id: string;
  name: string;
  email: string;
  department?: string;
  designation?: string;
  officeHours?: string;
  profileImage?: string | null;
  phone?: string;
  bio?: string;
  teacherProfile?: {
    designation?: string;
    officeHours?: string;
  };
}

export async function fetchTeacherProjects() {
  return authGet<TeacherProject[]>('/api/admin/projects');
}

export async function fetchMyTeacherProjects(teacherId: string) {
  const projects = await fetchTeacherProjects();
  return projects.filter((project) => project.teacherId === teacherId);
}

export async function createTeacherProject(
  _teacherId: string,
  data: ProjectFormData,
) {
  return authPost<TeacherProject>('/api/faculty-ideas', {
    title: data.title,
    description: data.description,
    requirements: data.requirements,
  });
}

export async function updateTeacherProject(projectId: string, data: ProjectFormData) {
  return authPut<TeacherProject>(`/api/admin/projects/${projectId}`, data);
}

export async function deleteTeacherProject(projectId: string) {
  return authDelete(`/api/admin/projects/${projectId}`);
}

export async function fetchSupervisedGroups() {
  return authGet<SupervisedGroup[]>('/api/groups/supervised');
}

export async function fetchSupervisionRequests() {
  return authGet<SupervisionRequest[]>('/api/supervision/requests');
}

export function formatSupervisionRequests(
  requests: SupervisionRequest[],
): FormattedSupervisionRequest[] {
  return requests.map((req) => {
    const leaderName =
      req.group?.leader?.name ?? req.student?.name ?? 'Not specified';
    const otherMembers =
      req.group?.members
        ?.filter((member) => member.id !== req.group?.leader?.id)
        .map((member) => member.name)
        .filter(Boolean)
        .join(', ') ?? '';
    const memberNames = otherMembers || 'Not specified';
    const projectName = req.project?.title?.trim() || 'Not specified';
    const requirements =
      req.project?.requirements?.trim() || 'Not specified';

    return {
      id: req.id,
      status: req.status,
      message: req.message?.trim() ?? '',
      projectTitle: projectName,
      projectName,
      requirements,
      leaderName,
      memberNames,
      groupName: req.group?.name ?? 'Not assigned',
      proposalFileUrl: req.proposalFile?.fileUrl ?? null,
      proposalFileName: req.proposalFile?.fileName ?? null,
      date: req.createdAt ? new Date(req.createdAt).toLocaleDateString() : '',
      student: {
        name: req.student?.name ?? 'Unknown',
        email: req.student?.email ?? '',
        rollNumber: req.student?.rollNumber ?? 'N/A',
      },
    };
  });
}

export async function updateSupervisionRequest(
  requestId: string,
  action: 'accept' | 'reject',
) {
  return authPatch(`/api/supervision/requests/${requestId}`, { action });
}

export async function requestSupervisionChanges(requestId: string, feedback: string) {
  return authPatch(`/api/supervision/requests/${requestId}`, {
    action: 'request_changes',
    feedback,
  });
}

export async function fetchTeacherFiles(teacherId: string) {
  return authGet<TeacherFilesResponse>('/api/teacher/files', { teacherId });
}

export async function updateTeacherFileStatus(
  fileId: string,
  teacherId: string,
  payload: { status: string; feedback?: string },
) {
  return authPatch(`/api/teacher/files/${fileId}`, {
    ...payload,
    teacherId,
  });
}

export { fetchAllNotifications as fetchNotifications, type NotificationItem };

export async function fetchRecentActivities() {
  const notifications = await fetchAllNotifications();
  return notifications.slice(0, 5);
}

export async function fetchProfile(userId: string) {
  return authGet<ProfileData>('/api/profile', { userId });
}

export interface MeetingStudent {
  id: string;
  name: string;
  email: string;
  rollNumber?: string;
  department?: string;
}

export interface TeacherMeetingPayload {
  title: string;
  description: string;
  date: string;
  time: string;
  type: 'online' | 'offline';
  location: string;
  meetingLink: string;
  participantIds: string[];
  organizerId: string;
}

export async function fetchStudentsForMeeting() {
  return authGet<MeetingStudent[]>('/api/students/search');
}

export async function fetchTeacherUpcomingMeetings() {
  return authGet<
    Array<{
      id: string | number;
      title: string;
      date: string;
      time: string;
      type?: string;
    }>
  >('/api/meetings/upcoming');
}

export async function scheduleTeacherMeeting(payload: TeacherMeetingPayload) {
  return authPost('/api/meetings', payload);
}
