import ReactNativeBlobUtil from 'react-native-blob-util';
import { authDelete, authGet, getResolvedApiBaseUrl } from './apiClient';
import { fetchMyGroupDetails } from './groupService';

export const DOCUMENT_CATEGORIES = [
  { value: 'FYP_I', label: 'FYP-I Document' },
  { value: 'FYP_II', label: 'FYP-II Document' },
  { value: 'OTHER', label: 'Other Document' },
] as const;

export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number]['value'];

export const DOCUMENT_CATEGORY_LABELS: Record<string, string> = {
  FYP_I: 'FYP-I Document',
  FYP_II: 'FYP-II Document',
  OTHER: 'Other Document',
};

export interface DocumentSubmissionRow {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: DocumentCategory | string;
  fileSize: number;
  title: string;
  description?: string;
  status: string;
  reviewComments?: string | null;
  adminRemarks?: string | null;
  committeeRemarks?: string | null;
  createdAt: string;
  groupName?: string;
  projectTitle?: string;
}

const DOCUMENT_FILE_TYPES = new Set(['FYP_I', 'FYP_II', 'OTHER']);

function mimeFromName(name: string) {
  const lower = name.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.doc')) return 'application/msword';
  if (lower.endsWith('.docx')) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'application/octet-stream';
}

export async function ensureApprovedGroupForDocuments() {
  const data = await fetchMyGroupDetails();
  if (!data?.hasGroup || !data.group?.isApproved) {
    throw new Error(
      'You must belong to an approved FYP group before submitting documents.',
    );
  }
  return data.group;
}

export async function fetchMyDocumentSubmissions(userId: string) {
  const data = await authGet<{ files?: Array<Record<string, unknown>> }>('/api/files');
  const files = Array.isArray(data?.files) ? data.files : [];
  return files
    .filter((f) => {
      const type = String(f.fileType ?? '').toUpperCase();
      return DOCUMENT_FILE_TYPES.has(type) && String(f.studentId ?? '') === userId;
    })
    .map((f) => ({
      id: String(f.id ?? ''),
      fileName: String(f.fileName ?? f.name ?? 'File'),
      fileUrl: String(f.fileUrl ?? ''),
      fileType: String(f.fileType ?? ''),
      fileSize: Number(f.size ?? f.fileSize ?? 0),
      title: String(f.title ?? f.projectTitle ?? f.fileName ?? f.name ?? 'Document'),
      description: String(f.description ?? ''),
      status: String(f.status ?? 'PENDING'),
      reviewComments: (f.reviewComments as string | null) ?? null,
      adminRemarks: (f.adminRemarks as string | null) ?? null,
      committeeRemarks: (f.committeeRemarks as string | null) ?? null,
      createdAt: String(f.createdAt ?? f.uploadedAt ?? ''),
      groupName: String(f.groupName ?? ''),
      projectTitle: String(f.projectTitle ?? ''),
    })) as DocumentSubmissionRow[];
}

export async function submitDocument(params: {
  userId: string;
  userName: string;
  fileUri: string;
  fileName: string;
  mimeType?: string;
  category: DocumentCategory;
  documentTitle?: string;
  remarks?: string;
  projectId?: string;
  projectTitle?: string;
}) {
  await ensureApprovedGroupForDocuments();

  const baseUrl = getResolvedApiBaseUrl();
  const path = params.fileUri.replace('file://', '');
  const mime = params.mimeType ?? mimeFromName(params.fileName);
  const title = params.documentTitle?.trim() || params.fileName;

  const parts: Array<{
    name: string;
    data: string;
    filename?: string;
    type?: string;
  }> = [
    {
      name: 'file',
      filename: params.fileName,
      type: mime,
      data: ReactNativeBlobUtil.wrap(path),
    },
    { name: 'fileType', data: params.category },
    { name: 'type', data: 'document' },
    { name: 'documentTitle', data: title },
    { name: 'projectTitle', data: params.projectTitle ?? title },
    { name: 'description', data: params.remarks ?? '' },
    { name: 'userId', data: params.userId },
    { name: 'userName', data: params.userName },
    { name: 'projectId', data: params.projectId ?? '' },
  ];

  const response = await ReactNativeBlobUtil.fetch(
    'POST',
    `${baseUrl}/api/upload`,
    { 'Content-Type': 'multipart/form-data' },
    parts,
  );

  const status = response.info().status;
  const bodyText = await response.text();
  let body: { error?: string; message?: string } = {};
  try {
    body = JSON.parse(bodyText);
  } catch {
    body = {};
  }

  if (status < 200 || status >= 300) {
    throw new Error(body.error ?? 'Upload failed');
  }

  return body;
}

export async function deleteDocumentSubmission(id: string) {
  return authDelete(`/api/files/${id}`);
}

export function getDocumentStatusLabel(status: string) {
  const upper = (status || 'PENDING').toUpperCase();
  if (upper === 'COMMITTEE_APPROVED' || upper === 'ADMIN_APPROVED' || upper === 'APPROVED') {
    return 'Approved';
  }
  if (upper === 'COMMITTEE_REJECTED' || upper === 'ADMIN_REJECTED' || upper === 'REJECTED') {
    return 'Rejected';
  }
  return 'Pending Review';
}

export function getDocumentStatusStyle(status: string) {
  const upper = (status || 'PENDING').toUpperCase();
  if (upper === 'COMMITTEE_APPROVED' || upper === 'ADMIN_APPROVED' || upper === 'APPROVED') {
    return { bg: '#16a34a', text: '#fff', label: 'Approved' };
  }
  if (upper === 'COMMITTEE_REJECTED' || upper === 'ADMIN_REJECTED' || upper === 'REJECTED') {
    return { bg: '#dc2626', text: '#fff', label: 'Rejected' };
  }
  return { bg: '#6b7280', text: '#fff', label: 'Pending Review' };
}
