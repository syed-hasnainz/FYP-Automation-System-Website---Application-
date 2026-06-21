import { authPost } from './apiClient';

export type StudentFormType =
  | 'supervisor-change'
  | 'consent'
  | 'extension'
  | 'reeval'
  | 'general';

export type MemberRow = { name: string; regNo: string };

export const STUDENT_FORM_TABS = [
  {
    key: 'supervisor' as const,
    type: 'supervisor-change' as StudentFormType,
    label: 'Supervisor Change',
    shortLabel: 'Supervisor',
    description: 'Request a change of project supervisor',
    icon: 'user-check',
  },
  {
    key: 'consent' as const,
    type: 'consent' as StudentFormType,
    label: 'Student Consent',
    shortLabel: 'Consent',
    description: 'Team consent and witness acknowledgement',
    icon: 'check-square',
  },
  {
    key: 'extension' as const,
    type: 'extension' as StudentFormType,
    label: 'Extension Request',
    shortLabel: 'Extension',
    description: 'Request additional time for your project',
    icon: 'clock',
  },
  {
    key: 'reeval' as const,
    type: 'reeval' as StudentFormType,
    label: 'Re-Evaluation Appeal',
    shortLabel: 'Re-Eval',
    description: 'Appeal for course or component re-evaluation',
    icon: 'refresh-cw',
  },
  {
    key: 'general' as const,
    type: 'general' as StudentFormType,
    label: 'General Request',
    shortLabel: 'General',
    description: 'Other FYP-related requests or issues',
    icon: 'file-text',
  },
];

export type StudentFormTabKey = (typeof STUDENT_FORM_TABS)[number]['key'];

export function emptyMembers(count = 3): MemberRow[] {
  return Array.from({ length: count }, () => ({ name: '', regNo: '' }));
}

export async function submitStudentForm(
  type: StudentFormType,
  payload: Record<string, unknown>,
) {
  return authPost<{ success?: boolean; error?: string }>('/api/forms/submit', {
    type,
    ...payload,
  });
}
