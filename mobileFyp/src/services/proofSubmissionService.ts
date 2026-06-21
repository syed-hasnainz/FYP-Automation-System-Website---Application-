import { authDelete, authGet, authPost } from './apiClient';
import { getResolvedApiBaseUrl } from './apiClient';
import { uploadStudentFile } from './proposalService';

export const PROOF_DOCUMENT_TYPES = [
  { value: 'TRANSCRIPT', label: 'Summer Transcript' },
  { value: 'CLEARANCE', label: 'Clearance Certificate' },
  { value: 'OTHER', label: 'Other Document' },
] as const;

export type ProofDocumentType = (typeof PROOF_DOCUMENT_TYPES)[number]['value'];

export interface ProofSubmissionRow {
  id: string;
  proofFileName: string;
  proofFileUrl: string;
  proofFileSize: number;
  status: string;
  createdAt: string;
  reviewComments?: string | null;
  studentId: string;
}

export interface AnnouncementRow {
  id: string;
  type: string;
  title?: string;
}

export function resolveBackendFileUrl(fileUrl: string) {
  if (!fileUrl) return '';
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
    return fileUrl;
  }
  const base = getResolvedApiBaseUrl().replace(/\/$/, '');
  return `${base}${fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`}`;
}

export async function fetchAnnouncements() {
  return authGet<AnnouncementRow[]>('/api/announcements');
}

export async function fetchActiveProofAnnouncement() {
  const announcements = await fetchAnnouncements();
  const list = Array.isArray(announcements) ? announcements : [];
  return list.find((a) => a.type === 'PROOF_SUBMISSION') ?? null;
}

export async function fetchMyProofSubmissions(userId: string) {
  const announcement = await fetchActiveProofAnnouncement();
  if (!announcement?.id) {
    return [];
  }
  const all = await authGet<ProofSubmissionRow[]>(
    '/api/committee/proof-submissions',
    { announcementId: announcement.id },
  );
  const rows = Array.isArray(all) ? all : [];
  return rows.filter((s) => s.studentId === userId);
}

export async function submitProofDocument(params: {
  userId: string;
  userName: string;
  fileUri: string;
  fileName: string;
  fileSize: number;
  mimeType?: string;
  documentType: ProofDocumentType;
}) {
  const announcement = await fetchActiveProofAnnouncement();
  if (!announcement?.id) {
    throw new Error(
      'No active proof submission announcement. Please contact the committee head.',
    );
  }

  const uploadData = await uploadStudentFile({
    fileUri: params.fileUri,
    fileName: params.fileName,
    mimeType: params.mimeType ?? 'application/pdf',
    uploadType: 'documentation',
    userId: params.userId,
    userName: params.userName,
    projectTitle: 'Proof Submission',
    description: `Proof document (${params.documentType})`,
    fileType: 'proof',
    type: 'proof',
  });

  const fileUrl =
    (uploadData as { fileUrl?: string; url?: string }).fileUrl ??
    (uploadData as { fileUrl?: string; url?: string }).url;
  if (!fileUrl) {
    throw new Error('File upload succeeded but no file URL returned');
  }

  return authPost<ProofSubmissionRow>('/api/committee/proof-submissions', {
    announcementId: announcement.id,
    proofFileUrl: fileUrl,
    proofFileName: params.fileName,
    proofFileSize: params.fileSize,
    remarks: params.documentType,
  });
}

export async function deleteProofSubmission(id: string) {
  return authDelete(`/api/committee/proof-submissions/${id}`);
}
