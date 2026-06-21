import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import Toast from 'react-native-toast-message';
import { EmptyState } from '../../components/portal/EmptyState';
import { LoadingView } from '../../components/portal/LoadingView';
import { PortalScreenLayout } from '../../components/portal/PortalScreenLayout';
import { usePortalNavigation } from '../../components/portal/portalNavigation';
import { openDocumentFromUrl } from '../../services/documentService';
import { fetchMyProposalSubmissions } from '../../services/proposalService';
import { useAuthUser } from '../../hooks/useAuthUser';
import {
  getProposalFeedbackFlags,
  getProposalStatusBadge,
  type ProposalSubmissionItem,
} from '../../utils/proposalFeedback';

function InfoBox({
  title,
  message,
  tone,
}: {
  title: string;
  message: string;
  tone: 'blue' | 'yellow' | 'green' | 'red';
}) {
  const colors = {
    blue: { bg: '#eff6ff', border: '#bfdbfe', title: '#1e40af', text: '#1d4ed8' },
    yellow: { bg: '#fefce8', border: '#fde047', title: '#854d0e', text: '#a16207' },
    green: { bg: '#f0fdf4', border: '#86efac', title: '#166534', text: '#15803d' },
    red: { bg: '#fef2f2', border: '#fecaca', title: '#991b1b', text: '#b91c1c' },
  }[tone];

  return (
    <View style={[styles.infoBox, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      <Text style={[styles.infoTitle, { color: colors.title }]}>{title}</Text>
      <Text style={[styles.infoText, { color: colors.text }]}>{message}</Text>
    </View>
  );
}

function SubmissionCard({
  submission,
  onView,
  onReupload,
}: {
  submission: ProposalSubmissionItem;
  onView: () => void;
  onReupload: () => void;
}) {
  const badge = getProposalStatusBadge(
    submission.status,
    submission.supervisorApprovalStatus,
    submission.fileType,
  );
  const flags = getProposalFeedbackFlags(submission);
  const submittedDate = new Date(
    submission.createdAt || submission.uploadedAt || Date.now(),
  ).toLocaleDateString();
  const displayTitle =
    submission.title || submission.projectTitle || submission.fileName;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {displayTitle}
        </Text>
        <View style={[styles.badge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.badgeText, { color: badge.text }]} numberOfLines={2}>
            {badge.label}
          </Text>
        </View>
      </View>

      <View style={styles.detailGrid}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>File Name</Text>
          <Text style={styles.detailValue}>{submission.fileName}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>File Type</Text>
          <Text style={styles.detailValue}>{submission.fileType}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Submitted</Text>
          <Text style={styles.detailValue}>{submittedDate}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Status</Text>
          <Text style={styles.detailValue}>{submission.status.replace(/_/g, ' ')}</Text>
        </View>
      </View>

      {!flags.isSupervisorApproved &&
        !flags.isFullyApproved &&
        submission.supervisorApprovalStatus !== 'REJECTED' &&
        !flags.isRejected && (
          <InfoBox
            tone="blue"
            title="Pending Supervisor Review"
            message="Your proposal is awaiting review by your supervisor."
          />
        )}

      {flags.isSupervisorApproved && !flags.isFullyApproved && !flags.isRejected && (
        <InfoBox
          tone="yellow"
          title="Pending from Committee Review"
          message="Your proposal is under review of committee/admin."
        />
      )}

      {flags.isFullyApproved && (
        <InfoBox
          tone="green"
          title="Approved: Active Project Execution"
          message={
            submission.status === 'COMMITTEE_APPROVED'
              ? 'Your proposal has been approved by the Committee Head. Your group can now proceed to active project execution!'
              : 'Your proposal has been approved by the Admin. Your group can now proceed to active project execution!'
          }
        />
      )}

      {flags.isConditionallyApproved && (
        <>
          <InfoBox
            tone="blue"
            title="Conditionally Approved"
            message="Your proposal has been conditionally approved. Please upload the corrected proposal with minor revisions."
          />
          {submission.conditionalApprovalRemarks ? (
            <View style={styles.remarksBox}>
              <Text style={styles.remarksTitle}>Revision Requirements</Text>
              <Text style={styles.remarksBody}>{submission.conditionalApprovalRemarks}</Text>
            </View>
          ) : null}
        </>
      )}

      {flags.isRejected && (
        <>
          <InfoBox
            tone="red"
            title="Rejected"
            message={
              submission.status === 'REJECTED'
                ? 'Your proposal has been rejected by your supervisor. You can select another supervisor and resubmit.'
                : submission.status === 'COMMITTEE_REJECTED'
                  ? 'Your proposal has been rejected by the Committee Head. Major changes are required.'
                  : 'Your proposal has been rejected by the Admin. Major changes are required.'
            }
          />
          {(submission.status === 'COMMITTEE_REJECTED' ||
            submission.status === 'ADMIN_REJECTED') && (
            <View style={styles.remarksBox}>
              <Text style={styles.remarksTitle}>
                Defense Attempt: {submission.defenseAttempts || 1} of 3
              </Text>
              {submission.adminRemarks ? (
                <Text style={styles.remarksBody}>{submission.adminRemarks}</Text>
              ) : null}
            </View>
          )}
        </>
      )}

      {submission.status === 'CHANGES_REQUESTED' && submission.supervisorRemarks ? (
        <View style={styles.remarksBox}>
          <Text style={styles.remarksTitle}>Supervisor Feedback</Text>
          <Text style={styles.remarksBody}>{submission.supervisorRemarks}</Text>
        </View>
      ) : null}

      <View style={styles.cardActions}>
        <Pressable style={styles.outlineBtn} onPress={onView}>
          <FeatherIcon name="eye" size={16} color="#374151" />
          <Text style={styles.outlineBtnText}>View Proposal</Text>
        </Pressable>
        {submission.status === 'CHANGES_REQUESTED' ? (
          <Pressable style={styles.primaryBtn} onPress={onReupload}>
            <FeatherIcon name="upload" size={16} color="#fff" />
            <Text style={styles.primaryBtnText}>Reupload</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function StudentProposalFeedbackScreen() {
  const { user } = useAuthUser();
  const { navigateTo } = usePortalNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submissions, setSubmissions] = useState<ProposalSubmissionItem[]>([]);

  const load = useCallback(
    async (showSpinner = false) => {
      if (!user?.id) {
        setLoading(false);
        return;
      }
      if (showSpinner) setLoading(true);
      try {
        const rows = await fetchMyProposalSubmissions(user.id);
        setSubmissions(rows);
      } catch {
        setSubmissions([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user?.id],
  );

  React.useEffect(() => {
    load(true);
  }, [load]);

  const refresh = () => {
    setRefreshing(true);
    load(false);
  };

  const openFile = async (url: string, fileName?: string) => {
    try {
      await openDocumentFromUrl(url, { fileName: fileName || 'proposal.pdf' });
    } catch {
      Toast.show({ type: 'error', text1: 'Could not open file' });
    }
  };

  if (loading) {
    return <LoadingView message="Loading proposal feedback..." />;
  }

  return (
    <PortalScreenLayout
      title="Proposal Feedback"
      subtitle="View supervisor decision and feedback on your proposals"
      refreshing={refreshing}
      onRefresh={refresh}>
      {submissions.length === 0 ? (
        <EmptyState
          icon="file-text"
          title="No proposals submitted yet"
          message='Upload your proposal from the "Proposal Submission Form" section.'
        />
      ) : (
        submissions.map((submission) => (
          <SubmissionCard
            key={submission.id}
            submission={submission}
            onView={() => openFile(submission.fileUrl, submission.fileName)}
            onReupload={() => navigateTo('ProposalSubmission')}
          />
        ))
      )}
    </PortalScreenLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 14,
  },
  cardTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  badge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: 140,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  detailGrid: {
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 12,
    gap: 10,
    marginBottom: 12,
  },
  detailItem: {},
  detailLabel: { fontSize: 12, color: '#6b7280', marginBottom: 2 },
  detailValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
  infoBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  infoTitle: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  infoText: { fontSize: 13, lineHeight: 20 },
  remarksBox: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 12,
    marginBottom: 10,
  },
  remarksTitle: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 4 },
  remarksBody: { fontSize: 13, color: '#4b5563', lineHeight: 20 },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  outlineBtnText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#2563eb',
  },
  primaryBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
