export type ProposalSubmissionItem = {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  status: string;
  supervisorApprovalStatus?: string;
  uploadedAt?: string;
  createdAt?: string;
  title?: string;
  projectTitle?: string;
  supervisorRemarks?: string | null;
  adminRemarks?: string | null;
  conditionalApprovalRemarks?: string | null;
  defenseAttempts?: number;
};

export type StatusBadge = { label: string; bg: string; text: string };

export function getProposalStatusBadge(
  status: string,
  supervisorApprovalStatus?: string,
  fileType?: string,
): StatusBadge {
  if (status === 'ADMIN_APPROVED' || status === 'COMMITTEE_APPROVED') {
    return { label: 'Approved - Active Execution', bg: '#16a34a', text: '#fff' };
  }
  if (status === 'CONDITIONALLY_APPROVED') {
    return { label: 'Conditionally Approved', bg: '#2563eb', text: '#fff' };
  }
  if (status === 'REJECTED' || status === 'ADMIN_REJECTED' || status === 'COMMITTEE_REJECTED') {
    return { label: 'Rejected', bg: '#dc2626', text: '#fff' };
  }
  if (status === 'CHANGES_REQUESTED') {
    return { label: 'Changes Requested', bg: '#ca8a04', text: '#fff' };
  }

  const isSupervisorApproved =
    supervisorApprovalStatus === 'APPROVED' ||
    (status === 'APPROVED' &&
      (fileType === 'PROPOSAL' || fileType === 'proposal') &&
      supervisorApprovalStatus !== 'REJECTED' &&
      status !== 'ADMIN_APPROVED' &&
      status !== 'COMMITTEE_APPROVED');

  if (isSupervisorApproved) {
    return { label: 'Pending from Committee/Admin', bg: '#ea580c', text: '#fff' };
  }
  if (supervisorApprovalStatus === 'REJECTED') {
    return { label: 'Rejected by Supervisor', bg: '#dc2626', text: '#fff' };
  }
  return { label: 'Pending from Supervisor', bg: '#ca8a04', text: '#fff' };
}

export function getProposalFeedbackFlags(submission: ProposalSubmissionItem) {
  const status = submission.status ?? 'PENDING';
  const isFullyApproved = ['ADMIN_APPROVED', 'COMMITTEE_APPROVED'].includes(status);
  const isConditionallyApproved = status === 'CONDITIONALLY_APPROVED';
  const isSupervisorApproved =
    submission.supervisorApprovalStatus === 'APPROVED' ||
    (status === 'APPROVED' &&
      (submission.fileType === 'PROPOSAL' || submission.fileType === 'proposal') &&
      submission.supervisorApprovalStatus !== 'REJECTED');
  const isRejected = ['REJECTED', 'ADMIN_REJECTED', 'COMMITTEE_REJECTED'].includes(status);

  return { isFullyApproved, isConditionallyApproved, isSupervisorApproved, isRejected, status };
}
