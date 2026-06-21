import { authGet, authPost } from './apiClient';

export interface SearchTeacher {
  id: string;
  name: string;
  email: string;
  department: string;
  specialization: string;
  profileImage?: string | null;
  currentSupervising: number;
  maxSupervising: number;
  isAvailable: boolean;
}

export interface SupervisionRequestDetail {
  id: string;
  status: string;
  teacherId?: string;
  createdAt?: string;
  message?: string;
  teacher?: {
    id: string;
    name: string;
    email?: string;
    department?: string;
    specialization?: string;
    profileImage?: string | null;
  };
  student?: {
    id: string;
    name: string;
    rollNumber?: string;
    department?: string;
  };
  project?: { id?: string; title?: string };
}

export interface SupervisionRequestRow {
  id: string;
  name: string;
  teacherId?: string;
  status: string;
  date: string;
  studentName?: string;
  department?: string;
}

export interface CurrentSupervisorInfo {
  id: string;
  name: string;
  email?: string;
  department?: string;
  specialization?: string;
  profileImage?: string | null;
}

export async function searchTeachers(query = '') {
  const params: Record<string, string> = {};
  if (query.trim()) {
    params.query = query.trim();
  }
  return authGet<SearchTeacher[]>('/api/teachers/search', params);
}

export async function fetchSupervisionRequestsDetailed() {
  return authGet<SupervisionRequestDetail[]>('/api/supervision/requests');
}

export function mapSupervisionRequests(
  requests: SupervisionRequestDetail[],
): SupervisionRequestRow[] {
  return requests.map((req) => ({
    id: req.id,
    name: req.teacher?.name || 'Unknown',
    teacherId: req.teacherId || req.teacher?.id,
    status: req.status,
    date: req.createdAt
      ? new Date(req.createdAt).toLocaleDateString()
      : '',
    studentName: req.student?.name,
    department: req.teacher?.department,
  }));
}

export function findCurrentSupervisor(
  requests: SupervisionRequestDetail[],
): CurrentSupervisorInfo | null {
  const accepted = requests.find((req) => req.status === 'ACCEPTED' && req.teacher);
  if (!accepted?.teacher) {
    return null;
  }
  return {
    id: accepted.teacher.id,
    name: accepted.teacher.name,
    email: accepted.teacher.email,
    department: accepted.teacher.department,
    specialization: accepted.teacher.specialization,
    profileImage: accepted.teacher.profileImage,
  };
}

export async function sendSupervisionRequest(teacherId: string, message: string) {
  return authPost<SupervisionRequestDetail>('/api/supervision/requests', {
    teacherId,
    message: message.trim(),
  });
}
