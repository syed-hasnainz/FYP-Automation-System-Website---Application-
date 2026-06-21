import { authGet, authPatch } from './apiClient';
import { fetchMyGroupDetails } from './groupService';
import { resolveBackendFileUrl } from './proofSubmissionService';

export type DefenseType = 'PROPOSAL' | 'FYP_I' | 'FYP_II';

export interface JuryAssignment {
  id: string;
  defenseScheduleId: string;
  groupId: string;
  groupName?: string;
  projectTitle?: string;
  juryMembers: string;
  evaluationStatus: string;
  marks?: number | null;
  feedback?: string | null;
  defenseAttempts?: number;
  groupMembers?: Array<{
    id: string;
    name: string;
    email?: string;
  }>;
}

export interface DefenseSchedule {
  id: string;
  defenseType: DefenseType;
  title: string;
  description?: string;
  defenseDate: string;
  defenseTime: string;
  venue: string;
  status: string;
  isPublished: boolean;
  juryAssignments?: JuryAssignment[];
}

export async function fetchDefenseSchedules() {
  const data = await authGet<DefenseSchedule[]>('/api/admin/jury/schedules');
  return Array.isArray(data) ? data : [];
}

export async function loadProjectExecutionForStudent() {
  const response = await fetchMyGroupDetails();
  const group = response?.group ?? null;
  if (!group?.id) {
    return { hasAccess: false, group: null, schedules: [] as DefenseSchedule[] };
  }

  const allSchedules = await fetchDefenseSchedules();
  const schedules = allSchedules.filter((schedule) =>
    schedule.juryAssignments?.some((a) => a.groupId === group.id),
  );
  const hasAccess = schedules.length > 0;

  return { hasAccess, group, schedules };
}

export function getAssignmentForGroup(schedule: DefenseSchedule, groupId: string) {
  return schedule.juryAssignments?.find((a) => a.groupId === groupId) ?? null;
}

export function getDefenseTypeLabel(type: string) {
  switch (type) {
    case 'PROPOSAL':
      return 'Proposal Defense';
    case 'FYP_I':
      return 'FYP-I (Mid-Project Defense)';
    case 'FYP_II':
      return 'FYP-II (Final Evaluation)';
    default:
      return type;
  }
}

export type EvalStatusBadge = { label: string; bg: string; text: string };

export function getEvaluationStatusBadge(
  status: string,
  attempts = 0,
): EvalStatusBadge {
  switch (status) {
    case 'ACCEPTED':
    case 'PASSED':
      return { label: 'Approved - Proceed to Next Phase', bg: '#16a34a', text: '#fff' };
    case 'RE_EVALUATION_REQUIRED':
    case 'CONDITIONALLY_APPROVED':
      return { label: 'Re-Evaluation Required', bg: '#ca8a04', text: '#fff' };
    case 'FAILED':
      return {
        label:
          attempts >= 3 ? 'Failed (3 attempts exhausted)' : `Failed (Attempt ${attempts}/3)`,
        bg: '#dc2626',
        text: '#fff',
      };
    case 'PENDING':
      return { label: 'Pending Evaluation', bg: '#6b7280', text: '#fff' };
    default:
      return { label: status, bg: '#e5e7eb', text: '#374151' };
  }
}

export function isFyp1Accepted(schedules: DefenseSchedule[], groupId: string) {
  const fyp1 = schedules.find((s) => s.defenseType === 'FYP_I');
  if (!fyp1) return false;
  const assignment = getAssignmentForGroup(fyp1, groupId);
  return (
    assignment?.evaluationStatus === 'ACCEPTED' || assignment?.evaluationStatus === 'PASSED'
  );
}

export function getProjectArchiveUrl(groupId: string, userId: string) {
  return resolveBackendFileUrl(`/api/projects/${groupId}/archive?userId=${userId}`);
}

export function parseJuryMembers(juryMembers: string) {
  try {
    const parsed = JSON.parse(juryMembers || '[]');
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export async function loadProjectExecutionForTeacher(teacherId: string) {
  const allSchedules = await fetchDefenseSchedules();
  return allSchedules
    .filter((schedule) => schedule.isPublished)
    .filter((schedule) =>
      schedule.juryAssignments?.some((assignment) =>
        parseJuryMembers(assignment.juryMembers).includes(teacherId),
      ),
    );
}

export function getTeacherAssignmentsForSchedule(
  schedule: DefenseSchedule,
  teacherId: string,
) {
  return (
    schedule.juryAssignments?.filter((assignment) =>
      parseJuryMembers(assignment.juryMembers).includes(teacherId),
    ) ?? []
  );
}

export function getTeacherEvaluationStatusBadge(
  status: string,
  defenseType?: DefenseType | string,
): EvalStatusBadge {
  if (defenseType === 'PROPOSAL' && status === 'ACCEPTED') {
    return {
      label: 'Approved - Active Project Execution',
      bg: '#16a34a',
      text: '#fff',
    };
  }
  if (status === 'CONDITIONALLY_APPROVED') {
    return {
      label: 'Conditionally Approved - Minor Revisions',
      bg: '#ca8a04',
      text: '#fff',
    };
  }
  if (status === 'REJECTED') {
    return { label: 'Rejected - Re-Defense Required', bg: '#dc2626', text: '#fff' };
  }
  return getEvaluationStatusBadge(status);
}

export async function saveTeacherEvaluation(
  assignmentId: string,
  payload: {
    marks: number | null;
    feedback: string;
    evaluationStatus: string;
    scheduleId: string;
  },
) {
  return authPatch(`/api/admin/jury/assignments/${assignmentId}/evaluate`, payload);
}
