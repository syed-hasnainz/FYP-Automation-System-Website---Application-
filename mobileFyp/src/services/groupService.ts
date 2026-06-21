import { authDelete, authGet, authPatch, authPost, authPut } from './apiClient';

export type StudentSearchType = 'name' | 'rollNumber';

export interface SearchStudent {
  id: string;
  name: string;
  rollNumber: string;
  email?: string;
  gpa: number;
  department: string;
  isInGroup: boolean;
  currentGroup?: { id: string; name: string } | null;
}

export interface GroupRequestRow {
  id: string;
  name: string;
  toUserId?: string;
  fromUserId?: string;
  rollNumber: string;
  date: string;
  status: string;
  projectTitle?: string;
  projectDescription?: string;
  projectRequirements?: string;
  message?: string;
}

export interface GroupProjectInfo {
  id: string;
  title: string;
  description: string;
  requirements?: string | null;
}

export interface MyGroupMember {
  id: string;
  name: string;
  email?: string;
  rollNumber?: string;
  department?: string;
  gpa?: number;
  isLeader?: boolean;
  role?: string;
}

export interface MyGroupDetails {
  id: string;
  name: string;
  memberCount: number;
  members: MyGroupMember[];
  isLeader: boolean;
  isApproved: boolean;
  description?: string;
  project?: GroupProjectInfo | null;
  supervisor?: {
    id: string;
    name: string;
    email?: string;
    department?: string;
  } | null;
  addMemberDeadline?: string;
}

export async function searchStudents(query = '', type: StudentSearchType = 'name') {
  const params: Record<string, string> = { type };
  if (query.trim()) {
    params.query = query.trim();
  }
  return authGet<SearchStudent[]>('/api/students/search', params);
}

export async function fetchMyGroupDetails() {
  return authGet<{ hasGroup: boolean; group: MyGroupDetails | null }>(
    '/api/groups/my-group',
  );
}

export async function fetchSentGroupRequests() {
  const data = await authGet<
    Array<{
      id: string;
      status: string;
      createdAt: string;
      toUserId: string;
      message?: string;
      projectTitle?: string;
      projectDescription?: string;
      projectRequirements?: string;
      toUser?: { name?: string; rollNumber?: string };
    }>
  >('/api/groups/requests', { type: 'sent' });

  return (Array.isArray(data) ? data : []).map((req) => ({
    id: req.id,
    name: req.toUser?.name || 'Unknown',
    toUserId: req.toUserId,
    rollNumber: req.toUser?.rollNumber || 'N/A',
    date: new Date(req.createdAt).toLocaleDateString(),
    status: req.status,
    projectTitle: req.projectTitle,
    projectDescription: req.projectDescription,
    projectRequirements: req.projectRequirements,
    message: req.message,
  }));
}

export async function fetchReceivedGroupRequests() {
  const data = await authGet<
    Array<{
      id: string;
      status: string;
      createdAt: string;
      fromUserId: string;
      message?: string;
      projectTitle?: string;
      projectDescription?: string;
      projectRequirements?: string;
      toUser?: { name?: string; rollNumber?: string };
      fromUser?: { name?: string; rollNumber?: string };
    }>
  >('/api/groups/requests', { type: 'received' });

  return (Array.isArray(data) ? data : []).map((req) => ({
    id: req.id,
    name: req.fromUser?.name || 'Unknown',
    fromUserId: req.fromUserId,
    rollNumber: req.fromUser?.rollNumber || 'N/A',
    date: new Date(req.createdAt).toLocaleDateString(),
    status: req.status,
    projectTitle: req.projectTitle,
    projectDescription: req.projectDescription,
    projectRequirements: req.projectRequirements,
    message: req.message,
  }));
}

export async function sendGroupRequest(
  toUserId: string,
  payload?: {
    projectTitle?: string;
    projectDescription?: string;
    projectRequirements?: string;
    message?: string;
  },
) {
  return authPost('/api/groups/requests', {
    toUserId,
    message:
      payload?.message ||
      'Hi! I would like to team up with you for the FYP project.',
    projectTitle: payload?.projectTitle,
    projectDescription: payload?.projectDescription,
    projectRequirements: payload?.projectRequirements,
    groupName: payload?.projectTitle,
  });
}

export async function acceptGroupRequest(requestId: string) {
  return authPut<{ groupName?: string; groupFormed?: boolean }>(
    `/api/groups/requests/${requestId}`,
    { status: 'ACCEPTED' },
  );
}

export async function rejectGroupRequest(requestId: string) {
  return authPut(`/api/groups/requests/${requestId}`, { status: 'REJECTED' });
}

export async function cancelGroupRequest(requestId: string) {
  return authDelete(`/api/groups/requests/${requestId}`);
}

export async function updateGroupName(groupName: string) {
  return authPatch('/api/groups/my-group', { groupName });
}

export async function leaveGroup(groupId: string) {
  return authDelete(`/api/groups/${groupId}/leave`);
}

export async function removeGroupMember(groupId: string, memberId: string) {
  return authDelete(`/api/groups/${groupId}/members/${memberId}`);
}
