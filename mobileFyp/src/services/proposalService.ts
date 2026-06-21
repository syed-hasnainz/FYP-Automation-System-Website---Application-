import ReactNativeBlobUtil from 'react-native-blob-util';
import { getResolvedApiBaseUrl } from './apiClient';
import { authGet } from './apiClient';

export type UploadType = 'proposal' | 'report' | 'documentation';

export type ProposalMember = {
  name: string;
  cmsId: string;
  cellNumber: string;
  email: string;
};

export type ProposalFormData = {
  title: string;
  projectTrack: 'Product' | 'Service' | 'Research & Development';
  programOfStudy: string;
  session: string;
  domain: string;
  date: string;
  members: ProposalMember[];
};

export type ReportFormData = {
  title: string;
  description: string;
};

export const UPLOAD_TYPE_OPTIONS: { value: UploadType; label: string }[] = [
  { value: 'proposal', label: 'Proposal Submission Form' },
  { value: 'report', label: 'Report' },
  { value: 'documentation', label: 'Documentation' },
];

export const PROJECT_TRACK_OPTIONS = [
  'Product',
  'Service',
  'Research & Development',
] as const;

export function createEmptyProposalForm(): ProposalFormData {
  return {
    title: '',
    projectTrack: 'Product',
    programOfStudy: '',
    session: '',
    domain: '',
    date: new Date().toISOString().split('T')[0],
    members: [
      { name: '', cmsId: '', cellNumber: '', email: '' },
      { name: '', cmsId: '', cellNumber: '', email: '' },
      { name: '', cmsId: '', cellNumber: '', email: '' },
    ],
  };
}

export interface UploadedFileItem {
  id: string;
  name: string;
  uploadedAt?: string;
  fileType?: string;
  status?: string;
  studentName?: string;
}

export async function fetchMyProposalSubmissions(userId: string) {
  const data = await authGet<{ files?: Array<Record<string, unknown>> }>('/api/files');
  const files = Array.isArray(data?.files) ? data.files : [];
  return files
    .filter((f) => String(f.studentId ?? '') === userId)
    .map((f) => ({
      id: String(f.id ?? ''),
      fileName: String(f.fileName ?? f.name ?? 'File'),
      fileUrl: String(f.fileUrl ?? ''),
      fileType: String(f.fileType ?? ''),
      status: String(f.status ?? 'PENDING'),
      supervisorApprovalStatus: String(f.supervisorApprovalStatus ?? 'PENDING'),
      uploadedAt: String(f.uploadedAt ?? f.createdAt ?? ''),
      createdAt: String(f.createdAt ?? f.uploadedAt ?? ''),
      title: String(f.title ?? f.projectTitle ?? ''),
      projectTitle: String(f.projectTitle ?? ''),
      supervisorRemarks: (f.supervisorRemarks as string | null) ?? null,
      adminRemarks: (f.adminRemarks as string | null) ?? null,
      conditionalApprovalRemarks: (f.conditionalApprovalRemarks as string | null) ?? null,
      defenseAttempts: Number(f.defenseAttempts ?? 0),
    }));
}

export async function fetchGroupUploads(groupMemberIds: string[]) {
  const data = await authGet<{ files?: Array<Record<string, unknown>> }>('/api/files');
  const files = Array.isArray(data?.files) ? data.files : Array.isArray(data) ? data : [];
  return files
    .filter((file) => {
      const studentId = String(file.studentId ?? '');
      return groupMemberIds.includes(studentId);
    })
    .map((file) => ({
      id: String(file.id ?? ''),
      name: String(file.fileName ?? file.name ?? 'File'),
      uploadedAt: String(file.createdAt ?? file.uploadedAt ?? ''),
      fileType: String(file.fileType ?? ''),
      status: String(file.status ?? ''),
      studentName: String(
        (file.student as { name?: string } | undefined)?.name ?? 'Unknown',
      ),
    }));
}

function mimeFromName(name: string) {
  const lower = name.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.doc')) return 'application/msword';
  if (lower.endsWith('.docx')) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }
  return 'application/octet-stream';
}

export async function uploadStudentFile(params: {
  fileUri: string;
  fileName: string;
  mimeType?: string;
  uploadType: UploadType;
  userId: string;
  userName: string;
  projectId?: string;
  projectTitle: string;
  description: string;
  fileType: string;
  type: string;
}) {
  const baseUrl = getResolvedApiBaseUrl();
  const path = params.fileUri.replace('file://', '');
  const mime = params.mimeType ?? mimeFromName(params.fileName);

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
    { name: 'fileType', data: params.fileType },
    { name: 'type', data: params.type },
    { name: 'projectTitle', data: params.projectTitle },
    { name: 'description', data: params.description },
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
