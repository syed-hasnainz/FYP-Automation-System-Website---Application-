import { authDelete, authGet, authPatch, authPost, getResolvedApiBaseUrl } from './apiClient';
import { resolveBackendFileUrl } from './proofSubmissionService';

export type SubmissionType =
  | 'proposal'
  | 'proposal-file'
  | 'supervisor-change'
  | 'consent'
  | 'extension'
  | 'reeval'
  | 'general'
  | 'proof-submission';

export interface FormSubmissionItem {
  id: string;
  type: SubmissionType | string;
  submittedBy?: string;
  submittedByName?: string | null;
  submittedByEmail?: string | null;
  submittedByRollNumber?: string | null;
  submittedByDepartment?: string | null;
  status?: string;
  reviewedBy?: string | null;
  reviewComments?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  data?: Record<string, unknown>;
  supervisorApprovalStatus?: string;
}

export interface AdminFileItem {
  id: string;
  fileType?: string;
  fileName?: string;
  fileUrl?: string;
  fileSize?: number;
  title?: string;
  description?: string;
  domain?: string;
  status?: string;
  supervisorApprovalStatus?: string;
  studentId?: string;
  studentName?: string;
  studentEmail?: string;
  studentRollNumber?: string;
  studentDepartment?: string;
  student?: {
    name?: string;
    email?: string;
    rollNumber?: string;
    department?: string;
  };
  projectTitle?: string;
  project?: { title?: string; group?: { name?: string } };
  groupName?: string;
  reviewComments?: string;
  supervisorRemarks?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface ProofSubmissionItem {
  id: string;
  studentId?: string;
  studentName?: string;
  studentEmail?: string;
  studentRollNumber?: string;
  studentDepartment?: string;
  status?: string;
  reviewedBy?: string;
  reviewComments?: string;
  reviewedAt?: string;
  createdAt: string;
  announcementTitle?: string;
  proofFileName?: string;
  proofFileUrl?: string;
  proofFileSize?: number;
  transcriptUrl?: string;
  cgpa?: number;
  remarks?: string;
  groupName?: string;
}

export const FORM_LABELS: Record<string, string> = {
  proposal: 'Proposal Submission Form',
  'proposal-file': 'Proposal File',
  'supervisor-change': 'Supervisor Change Form',
  consent: 'FYP Student Consent Form',
  extension: 'Extension Request Form',
  reeval: 'Re-Evaluation Appeal Form',
  general: 'General Request Form',
  'proof-submission': 'Proof Submission',
};

export type ReviewStatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

export const REVIEW_STATUS_OPTIONS: Array<{ value: ReviewStatusFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

export function isCommitteeReviewLocked(status?: string) {
  const normalized = (status || 'PENDING').toUpperCase();
  return [
    'COMMITTEE_APPROVED',
    'COMMITTEE_REJECTED',
    'ADMIN_APPROVED',
    'ADMIN_REJECTED',
    'REJECTED',
  ].includes(normalized);
}

export function isAdminProposalReviewLocked(status?: string) {
  const normalized = (status || 'PENDING').toUpperCase();
  return ['ADMIN_APPROVED', 'ADMIN_REJECTED'].includes(normalized);
}

export function matchesReviewStatus(
  status: string | null | undefined,
  filter: ReviewStatusFilter,
) {
  const normalized = (status || 'PENDING').toUpperCase();
  const approved = ['APPROVED', 'COMMITTEE_APPROVED', 'ADMIN_APPROVED'];
  const rejected = ['REJECTED', 'COMMITTEE_REJECTED', 'ADMIN_REJECTED'];

  if (filter === 'all') return true;
  if (filter === 'pending') {
    return !approved.includes(normalized) && !rejected.includes(normalized);
  }
  if (filter === 'approved') return approved.includes(normalized);
  if (filter === 'rejected') return rejected.includes(normalized);
  return true;
}

export function getReviewStatusLabel(status?: string) {
  const normalized = (status || 'PENDING').toUpperCase();
  if (normalized === 'ADMIN_APPROVED') return 'Approved by Admin';
  if (normalized === 'COMMITTEE_APPROVED') return 'Approved by Committee';
  if (normalized === 'ADMIN_REJECTED') return 'Rejected by Admin';
  if (normalized === 'COMMITTEE_REJECTED') return 'Rejected by Committee';
  if (normalized === 'APPROVED') return 'Supervisor Approved';
  if (normalized === 'REJECTED') return 'Rejected';
  if (normalized === 'PENDING') return 'Pending Review';
  return normalized.replace(/_/g, ' ');
}

export async function fetchAllFormSubmissions() {
  return authGet<FormSubmissionItem[]>('/api/forms/all');
}

export async function fetchAdminProofSubmissions() {
  return authGet<ProofSubmissionItem[]>('/api/admin/proof-submissions');
}

export async function fetchAdminFiles(reviewStatus: ReviewStatusFilter = 'all') {
  return authGet<AdminFileItem[]>('/api/admin/files', { reviewStatus });
}

export function formatProposalSubmissions(files: AdminFileItem[]): FormSubmissionItem[] {
  return files
    .filter((p) => {
      const isProposal =
        p.fileType?.toUpperCase() === 'PROPOSAL' || p.fileType === 'proposal';
      return isProposal;
    })
    .map((ps) => ({
    id: ps.id,
    type: 'proposal-file',
    submittedBy: ps.studentId,
    submittedByName: ps.studentName || ps.student?.name || 'Unknown',
    submittedByEmail: ps.studentEmail || ps.student?.email || '',
    submittedByRollNumber: ps.studentRollNumber || ps.student?.rollNumber || '',
    submittedByDepartment: ps.studentDepartment || ps.student?.department || '',
    status: ps.status,
    supervisorApprovalStatus: ps.supervisorApprovalStatus,
    reviewComments: ps.reviewComments || ps.supervisorRemarks,
    reviewedAt: ps.reviewedAt,
    createdAt: ps.createdAt,
    data: {
      fileName: ps.fileName,
      fileUrl: ps.fileUrl,
      fileSize: ps.fileSize,
      title: ps.title,
      description: ps.description,
      domain: ps.domain,
      projectTitle: ps.projectTitle || ps.project?.title,
      groupName: ps.groupName || ps.project?.group?.name,
    },
  }));
}

export function formatProofSubmissions(
  proofSubmissions: ProofSubmissionItem[],
): FormSubmissionItem[] {
  return proofSubmissions.map((ps) => ({
    id: ps.id,
    type: 'proof-submission',
    submittedBy: ps.studentId,
    submittedByName: ps.studentName,
    submittedByEmail: ps.studentEmail,
    submittedByRollNumber: ps.studentRollNumber,
    submittedByDepartment: ps.studentDepartment,
    status: ps.status,
    reviewedBy: ps.reviewedBy,
    reviewComments: ps.reviewComments,
    reviewedAt: ps.reviewedAt,
    createdAt: ps.createdAt,
    data: {
      announcementTitle: ps.announcementTitle,
      proofFileName: ps.proofFileName,
      proofFileUrl: ps.proofFileUrl,
      proofFileSize: ps.proofFileSize,
      transcriptUrl: ps.transcriptUrl,
      cgpa: ps.cgpa,
      remarks: ps.remarks,
      groupName: ps.groupName,
    },
  }));
}

export async function reviewProofSubmission(
  id: string,
  status: 'APPROVED' | 'REJECTED',
  reviewComments?: string,
) {
  return authPost(`/api/committee/proof-submissions/${id}/review`, {
    status,
    reviewComments: reviewComments || '',
  });
}

export async function reviewAdminFile(
  id: string,
  status: 'ADMIN_APPROVED' | 'ADMIN_REJECTED',
  adminRemarks?: string,
) {
  return authPatch(`/api/admin/files/${id}`, { status, adminRemarks: adminRemarks || '' });
}

export async function reviewFormSubmission(
  id: string,
  action: 'APPROVE' | 'REJECT',
  comments?: string,
) {
  return authPatch(`/api/forms/${id}/approve`, { action, comments: comments || '' });
}

export async function deleteProofSubmission(id: string) {
  return authDelete(`/api/committee/proof-submissions/${id}`);
}

export async function deleteAdminFile(id: string) {
  return authDelete(`/api/admin/files/${id}`);
}

export async function deleteFormSubmission(id: string) {
  return authDelete(`/api/forms/${id}`);
}

export function parseProposalFormDescription(description: unknown) {
  if (!description || typeof description !== 'string') {
    return null;
  }
  const trimmed = description.trim();
  if (!trimmed.startsWith('{')) {
    return null;
  }
  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export function formatProposalMemberList(members: unknown) {
  if (!Array.isArray(members) || members.length === 0) {
    return '';
  }
  return members
    .map((member, index) => {
      const row = member as Record<string, string>;
      const parts = [
        row.name,
        row.cmsId ? `CMS: ${row.cmsId}` : '',
        row.email,
        row.cellNumber ? `Cell: ${row.cellNumber}` : '',
      ].filter(Boolean);
      if (parts.length === 0) {
        return '';
      }
      const leadLabel = index === 0 ? ' (Team Lead)' : '';
      return `Student ${index + 1}${leadLabel}: ${parts.join(' | ')}`;
    })
    .filter(Boolean)
    .join('\n');
}

export function formatProposalDescriptionForDisplay(description: unknown) {
  const parsed = parseProposalFormDescription(description);
  if (!parsed) {
    return typeof description === 'string' ? description.trim() : '';
  }

  const lines: string[] = [];
  if (parsed.projectTrack) {
    lines.push(`Project Track: ${parsed.projectTrack}`);
  }
  if (parsed.programOfStudy) {
    lines.push(`Program of Study: ${parsed.programOfStudy}`);
  }
  if (parsed.session) {
    lines.push(`Session: ${parsed.session}`);
  }
  if (parsed.domain) {
    lines.push(`Domain / Area: ${parsed.domain}`);
  }
  if (parsed.date) {
    lines.push(`Date: ${parsed.date}`);
  }
  const membersText = formatProposalMemberList(parsed.members);
  if (membersText) {
    lines.push(`Team Members:\n${membersText}`);
  }
  return lines.join('\n');
}

export function formatFileSize(bytes: unknown) {
  const size = Number(bytes);
  if (!size || Number.isNaN(size)) {
    return '';
  }
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function getProposalFileOpenUrl(
  item: Pick<FormSubmissionItem, 'id'> & { data?: Record<string, unknown> },
) {
  const fileUrl = item.data?.fileUrl ? String(item.data.fileUrl) : '';
  if (fileUrl) {
    return resolveBackendFileUrl(fileUrl);
  }
  const base = getResolvedApiBaseUrl().replace(/\/$/, '');
  return `${base}/api/admin/files/${encodeURIComponent(item.id)}/download?inline=1`;
}
