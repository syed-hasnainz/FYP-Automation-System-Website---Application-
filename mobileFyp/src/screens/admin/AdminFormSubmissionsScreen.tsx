import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import { EmptyState } from '../../components/portal/EmptyState';
import { LoadingView } from '../../components/portal/LoadingView';
import { PortalScreenLayout } from '../../components/portal/PortalScreenLayout';
import { DetailRow, SheetModal, sheetStyles } from '../../components/portal/SheetModal';
import { usePortalNavigation } from '../../components/portal/portalNavigation';
import {
  deleteAdminFile,
  deleteFormSubmission,
  deleteProofSubmission,
  fetchAdminFiles,
  fetchAdminProofSubmissions,
  fetchAllFormSubmissions,
  FORM_LABELS,
  formatFileSize,
  formatProofSubmissions,
  formatProposalMemberList,
  formatProposalSubmissions,
  getProposalFileOpenUrl,
  getReviewStatusLabel,
  isAdminProposalReviewLocked,
  matchesReviewStatus,
  parseProposalFormDescription,
  reviewAdminFile,
  reviewFormSubmission,
  reviewProofSubmission,
  REVIEW_STATUS_OPTIONS,
  type FormSubmissionItem,
  type ReviewStatusFilter,
} from '../../services/submissionService';
import { openDocumentFromUrl } from '../../services/documentService';
import Toast from 'react-native-toast-message';

const FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Forms' },
  { value: 'proposal', label: 'Proposal Submission Form' },
  { value: 'proposal-file', label: 'Proposal File' },
  { value: 'supervisor-change', label: 'Supervisor Change Form' },
  { value: 'consent', label: 'FYP Student Consent Form' },
  { value: 'extension', label: 'Extension Request Form' },
  { value: 'reeval', label: 'Re-Evaluation Appeal Form' },
  { value: 'general', label: 'General Request Form' },
  { value: 'proof-submission', label: 'Proof Submission' },
] as const;

function formatDateTime(dateValue?: string) {
  if (!dateValue) return 'N/A';
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return 'N/A';
  return `${parsed.toLocaleDateString()} ${parsed.toLocaleTimeString()}`;
}

function getStatusColor(status?: string) {
  if (status === 'APPROVED' || status === 'ADMIN_APPROVED' || status === 'COMMITTEE_APPROVED') {
    return '#16a34a';
  }
  if (status === 'REJECTED' || status === 'ADMIN_REJECTED' || status === 'COMMITTEE_REJECTED') {
    return '#dc2626';
  }
  return '#6b7280';
}

function canReviewSubmission(item: FormSubmissionItem) {
  if (item.type === 'proposal-file') {
    return !isAdminProposalReviewLocked(item.status);
  }
  return item.status === 'PENDING';
}

function getSubmissionStatusLabel(item: FormSubmissionItem) {
  if (item.type === 'proposal-file') {
    return getReviewStatusLabel(item.status);
  }
  return item.status || 'PENDING';
}

function renderDetailFields(type: string, data?: Record<string, unknown>) {
  if (!data) return <Text style={styles.noData}>No data available</Text>;

  const fields: Array<{ label: string; value: unknown }> = [];

  const add = (label: string, value: unknown) => {
    if (value !== undefined && value !== null && value !== '') {
      fields.push({ label, value });
    }
  };

  switch (type) {
    case 'proposal-file': {
      const parsedDescription = parseProposalFormDescription(data.description);
      add('Project Title', data.title || data.projectTitle);
      if (parsedDescription) {
        add('Project Track', parsedDescription.projectTrack);
        add('Program of Study', parsedDescription.programOfStudy);
        add('Session', parsedDescription.session);
        add('Domain / Area', parsedDescription.domain || data.domain);
        add('Date', parsedDescription.date);
        const membersText = formatProposalMemberList(parsedDescription.members);
        if (membersText) {
          add('Team Members', membersText);
        }
      } else {
        add('Domain', data.domain);
        if (data.description && typeof data.description === 'string') {
          add('Description', data.description);
        }
      }
      add('File Name', data.fileName);
      const fileSize = formatFileSize(data.fileSize);
      if (fileSize) {
        add('File Size', fileSize);
      }
      add('Group', data.groupName);
      break;
    }
    case 'proof-submission':
      add('Announcement', data.announcementTitle);
      add('Group', data.groupName);
      add('CGPA', data.cgpa);
      add('Proof File', data.proofFileName);
      add('Remarks', data.remarks);
      break;
    case 'proposal':
      add('Project Title', data.projectTitle);
      add('Track', data.projectTrack);
      add('Program', data.program);
      add('Domain', data.domain);
      break;
    default:
      Object.entries(data).forEach(([key, value]) => {
        if (typeof value === 'string' || typeof value === 'number') {
          add(key.replace(/([A-Z])/g, ' $1'), value);
        }
      });
  }

  if (fields.length === 0) {
    return (
      <Text style={styles.jsonPreview}>{JSON.stringify(data, null, 2)}</Text>
    );
  }

  return fields.map((field) => (
    <DetailRow
      key={field.label}
      icon="file-text"
      label={field.label}
      value={String(field.value)}
    />
  ));
}

export function AdminFormSubmissionsScreen() {
  const { navigateTo } = usePortalNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [submissions, setSubmissions] = useState<FormSubmissionItem[]>([]);
  const [proofSubmissions, setProofSubmissions] = useState<FormSubmissionItem[]>([]);
  const [proposalSubmissions, setProposalSubmissions] = useState<FormSubmissionItem[]>([]);
  const [formTypeFilter, setFormTypeFilter] = useState('ALL');
  const [reviewStatusFilter, setReviewStatusFilter] = useState<ReviewStatusFilter>('all');
  const [filterPickerOpen, setFilterPickerOpen] = useState(false);
  const [reviewPickerOpen, setReviewPickerOpen] = useState(false);
  const [viewItem, setViewItem] = useState<FormSubmissionItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<FormSubmissionItem | null>(null);
  const [reviewItem, setReviewItem] = useState<FormSubmissionItem | null>(null);
  const [reviewAction, setReviewAction] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [reviewComments, setReviewComments] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [forms, proof, files] = await Promise.all([
        fetchAllFormSubmissions().catch(() => []),
        fetchAdminProofSubmissions().catch(() => []),
        fetchAdminFiles(reviewStatusFilter).catch(() => []),
      ]);
      setSubmissions(Array.isArray(forms) ? forms : []);
      setProofSubmissions(formatProofSubmissions(Array.isArray(proof) ? proof : []));
      setProposalSubmissions(
        formatProposalSubmissions(Array.isArray(files) ? files : []),
      );
    } catch {
      setSubmissions([]);
      setProofSubmissions([]);
      setProposalSubmissions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [reviewStatusFilter]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredSubmissions = useMemo(() => {
    let list: FormSubmissionItem[];
    if (formTypeFilter === 'ALL') {
      list = [...submissions, ...proofSubmissions, ...proposalSubmissions];
    } else if (formTypeFilter === 'proof-submission') {
      list = proofSubmissions;
    } else if (formTypeFilter === 'proposal') {
      list = [
        ...submissions.filter((s) => s.type === 'proposal'),
        ...proposalSubmissions,
      ];
    } else if (formTypeFilter === 'proposal-file') {
      list = proposalSubmissions;
    } else {
      list = submissions.filter((s) => s.type === formTypeFilter);
    }

    if (reviewStatusFilter === 'all') {
      return list;
    }
    return list.filter((item) => matchesReviewStatus(item.status, reviewStatusFilter));
  }, [formTypeFilter, proofSubmissions, proposalSubmissions, reviewStatusFilter, submissions]);

  const openReview = (item: FormSubmissionItem, action: 'APPROVE' | 'REJECT') => {
    setReviewItem(item);
    setReviewAction(action);
    setReviewComments('');
  };

  const handleReviewConfirm = async () => {
    if (!reviewItem || !reviewAction) return;
    setProcessing(true);
    try {
      if (reviewItem.type === 'proof-submission') {
        await reviewProofSubmission(
          reviewItem.id,
          reviewAction === 'APPROVE' ? 'APPROVED' : 'REJECTED',
          reviewComments,
        );
      } else if (reviewItem.type === 'proposal-file') {
        await reviewAdminFile(
          reviewItem.id,
          reviewAction === 'APPROVE' ? 'ADMIN_APPROVED' : 'ADMIN_REJECTED',
          reviewComments,
        );
      } else {
        await reviewFormSubmission(reviewItem.id, reviewAction, reviewComments);
      }
      setReviewItem(null);
      setReviewAction(null);
      setReviewComments('');
      await loadData();
    } catch {
      Alert.alert('Error', 'Failed to update submission.');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteItem) return;
    setProcessing(true);
    try {
      if (deleteItem.type === 'proof-submission') {
        await deleteProofSubmission(deleteItem.id);
      } else if (deleteItem.type === 'proposal-file') {
        await deleteAdminFile(deleteItem.id);
      } else {
        await deleteFormSubmission(deleteItem.id);
      }
      setDeleteItem(null);
      if (viewItem?.id === deleteItem.id) setViewItem(null);
      await loadData();
    } catch {
      Alert.alert('Error', 'Failed to delete submission.');
    } finally {
      setProcessing(false);
    }
  };

  const filterLabel =
    FILTER_OPTIONS.find((o) => o.value === formTypeFilter)?.label || 'All Forms';
  const reviewFilterLabel =
    REVIEW_STATUS_OPTIONS.find((o) => o.value === reviewStatusFilter)?.label || 'All';

  if (loading) {
    return <LoadingView message="Loading form submissions..." />;
  }

  return (
    <PortalScreenLayout
      title="Admin Submissions & Approvals"
      subtitle="Manage and review student form submissions"
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        loadData();
      }}>
      <Pressable
        style={styles.backBtn}
        onPress={() => navigateTo('PolicySubmissions')}>
        <FeatherIcon name="arrow-left" size={18} color="#2563eb" />
        <Text style={styles.backBtnText}>Back to Policy & Submissions</Text>
      </Pressable>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <FeatherIcon name="file-text" size={20} color="#111827" />
            <View style={styles.sectionTitleText}>
              <Text style={styles.sectionTitle}>Form Submissions</Text>
              <Text style={styles.sectionDesc}>
                Review and manage all student form submissions
              </Text>
            </View>
          </View>
          <View style={styles.filterRow}>
            <Pressable style={styles.filterBtn} onPress={() => setFilterPickerOpen(true)}>
              <FeatherIcon name="filter" size={16} color="#6b7280" />
              <Text style={styles.filterBtnText} numberOfLines={1}>
                {filterLabel}
              </Text>
              <FeatherIcon name="chevron-down" size={16} color="#6b7280" />
            </Pressable>
            <Pressable style={styles.filterBtn} onPress={() => setReviewPickerOpen(true)}>
              <FeatherIcon name="check-circle" size={16} color="#6b7280" />
              <Text style={styles.filterBtnText} numberOfLines={1}>
                {reviewFilterLabel}
              </Text>
              <FeatherIcon name="chevron-down" size={16} color="#6b7280" />
            </Pressable>
          </View>
        </View>

        {filteredSubmissions.length === 0 ? (
          <EmptyState
            icon="file-text"
            title={
              formTypeFilter === 'ALL'
                ? 'No Form Submissions'
                : `No ${FORM_LABELS[formTypeFilter] || formTypeFilter} Submissions`
            }
            message="No submissions match the selected filter."
          />
        ) : (
          filteredSubmissions.map((item) => (
            <View key={`${item.type}-${item.id}`} style={styles.rowCard}>
              <View style={styles.rowTop}>
                <View style={styles.typeRow}>
                  <FeatherIcon name="file-text" size={16} color="#9ca3af" />
                  <Text style={styles.typeText}>
                    {FORM_LABELS[item.type] || item.type}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: `${getStatusColor(item.status)}20` },
                  ]}>
                  <FeatherIcon name="clock" size={12} color={getStatusColor(item.status)} />
                  <Text
                    style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                    {getSubmissionStatusLabel(item)}
                  </Text>
                </View>
              </View>

              {item.submittedByName ? (
                <View style={styles.userBlock}>
                  <FeatherIcon name="user" size={14} color="#9ca3af" />
                  <View style={styles.userText}>
                    <Text style={styles.userName}>{item.submittedByName}</Text>
                    {item.submittedByEmail ? (
                      <Text style={styles.userMeta} numberOfLines={1}>
                        {item.submittedByEmail}
                      </Text>
                    ) : null}
                    {item.submittedByDepartment ? (
                      <Text style={styles.userMeta}>{item.submittedByDepartment}</Text>
                    ) : null}
                  </View>
                </View>
              ) : null}

              <View style={styles.dateRow}>
                <FeatherIcon name="calendar" size={14} color="#9ca3af" />
                <Text style={styles.dateText}>{formatDateTime(item.createdAt)}</Text>
              </View>

              <View style={styles.actionsRow}>
                <Pressable style={styles.viewBtn} onPress={() => setViewItem(item)}>
                  <FeatherIcon name="eye" size={16} color="#111827" />
                  <Text style={styles.viewBtnText}>View</Text>
                </Pressable>
                {canReviewSubmission(item) ? (
                  <>
                    <Pressable
                      style={styles.approveBtn}
                      onPress={() => openReview(item, 'APPROVE')}>
                      <FeatherIcon name="check-circle" size={16} color="#fff" />
                    </Pressable>
                    <Pressable
                      style={styles.rejectBtn}
                      onPress={() => openReview(item, 'REJECT')}>
                      <FeatherIcon name="x-circle" size={16} color="#fff" />
                    </Pressable>
                  </>
                ) : null}
                <Pressable
                  style={styles.deleteBtn}
                  onPress={() => setDeleteItem(item)}>
                  <FeatherIcon name="trash-2" size={16} color="#fff" />
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </View>

      <SheetModal
        visible={filterPickerOpen}
        onClose={() => setFilterPickerOpen(false)}
        title="Filter by Form Type">
        {FILTER_OPTIONS.map((option) => (
          <Pressable
            key={option.value}
            style={styles.optionRow}
            onPress={() => {
              setFormTypeFilter(option.value);
              setFilterPickerOpen(false);
            }}>
            <Text style={styles.optionText}>{option.label}</Text>
            {formTypeFilter === option.value ? (
              <FeatherIcon name="check" size={18} color="#16a34a" />
            ) : null}
          </Pressable>
        ))}
      </SheetModal>

      <SheetModal
        visible={reviewPickerOpen}
        onClose={() => setReviewPickerOpen(false)}
        title="Filter by Review Status">
        {REVIEW_STATUS_OPTIONS.map((option) => (
          <Pressable
            key={option.value}
            style={styles.optionRow}
            onPress={() => {
              setReviewStatusFilter(option.value);
              setReviewPickerOpen(false);
            }}>
            <Text style={styles.optionText}>{option.label}</Text>
            {reviewStatusFilter === option.value ? (
              <FeatherIcon name="check" size={18} color="#16a34a" />
            ) : null}
          </Pressable>
        ))}
      </SheetModal>

      <SheetModal
        visible={!!viewItem}
        onClose={() => setViewItem(null)}
        title={viewItem ? FORM_LABELS[viewItem.type] || viewItem.type : 'Details'}
        subtitle="View form submission details"
        footer={
          viewItem ? (
            <View style={sheetStyles.footerRow}>
              <Pressable
                style={[sheetStyles.footerBtn, sheetStyles.footerBtnCancel]}
                onPress={() => setViewItem(null)}>
                <Text style={sheetStyles.footerBtnCancelText}>Close</Text>
              </Pressable>
              {canReviewSubmission(viewItem) ? (
                <>
                  <Pressable
                    style={[sheetStyles.footerBtn, { backgroundColor: '#16a34a', flex: 1 }]}
                    onPress={() => {
                      const item = viewItem;
                      setViewItem(null);
                      if (item) openReview(item, 'APPROVE');
                    }}>
                    <Text style={sheetStyles.footerBtnPrimaryText}>Approve</Text>
                  </Pressable>
                  <Pressable
                    style={[sheetStyles.footerBtn, sheetStyles.footerBtnDanger, { flex: 1 }]}
                    onPress={() => {
                      const item = viewItem;
                      setViewItem(null);
                      if (item) openReview(item, 'REJECT');
                    }}>
                    <Text style={sheetStyles.footerBtnDangerText}>Reject</Text>
                  </Pressable>
                </>
              ) : null}
            </View>
          ) : undefined
        }>
        {viewItem ? (
          <>
            <DetailRow
              icon="user"
              label="Submitted By"
              value={viewItem.submittedByName || 'Unknown'}
            />
            {viewItem.submittedByEmail ? (
              <DetailRow icon="mail" label="Email" value={viewItem.submittedByEmail} />
            ) : null}
            {viewItem.submittedByDepartment ? (
              <DetailRow
                icon="briefcase"
                label="Department"
                value={viewItem.submittedByDepartment}
              />
            ) : null}
            <DetailRow
              icon="calendar"
              label="Submitted"
              value={formatDateTime(viewItem.createdAt)}
            />
            <DetailRow
              icon="activity"
              label="Status"
              value={viewItem.status || 'PENDING'}
            />
            <Text style={styles.detailsHeading}>Form Details</Text>
            {renderDetailFields(viewItem.type, viewItem.data)}
            {viewItem.type === 'proposal-file' ? (
              <Pressable
                style={styles.linkBtn}
                onPress={async () => {
                  try {
                    const fileUrl = viewItem.data?.fileUrl
                      ? String(viewItem.data.fileUrl)
                      : `/api/admin/files/${viewItem.id}/download?inline=1`;
                    await openDocumentFromUrl(fileUrl, {
                      fileName: String(viewItem.data?.fileName ?? 'proposal.pdf'),
                      urls: [getProposalFileOpenUrl(viewItem)],
                    });
                  } catch {
                    Toast.show({
                      type: 'error',
                      text1: 'Could not open file',
                      text2: 'Please try again or check your connection.',
                    });
                  }
                }}>
                <FeatherIcon name="external-link" size={16} color="#2563eb" />
                <Text style={styles.linkBtnText}>Open proposal file</Text>
              </Pressable>
            ) : null}
            {viewItem.type === 'proof-submission' && viewItem.data?.proofFileUrl ? (
              <Pressable
                style={styles.linkBtn}
                onPress={async () => {
                  try {
                    await openDocumentFromUrl(String(viewItem.data?.proofFileUrl), {
                      fileName: String(viewItem.data?.proofFileName ?? 'proof.pdf'),
                    });
                  } catch {
                    Toast.show({
                      type: 'error',
                      text1: 'Could not open file',
                      text2: 'Please try again or check your connection.',
                    });
                  }
                }}>
                <FeatherIcon name="external-link" size={16} color="#2563eb" />
                <Text style={styles.linkBtnText}>Open proof file</Text>
              </Pressable>
            ) : null}
          </>
        ) : null}
      </SheetModal>

      <SheetModal
        visible={!!reviewItem}
        onClose={() => !processing && setReviewItem(null)}
        title={reviewAction === 'APPROVE' ? 'Approve Submission' : 'Reject Submission'}
        subtitle={
          reviewItem
            ? FORM_LABELS[reviewItem.type] || reviewItem.type
            : undefined
        }
        footer={
          <View style={sheetStyles.footerRow}>
            <Pressable
              style={[sheetStyles.footerBtn, sheetStyles.footerBtnCancel]}
              disabled={processing}
              onPress={() => {
                setReviewItem(null);
                setReviewAction(null);
              }}>
              <Text style={sheetStyles.footerBtnCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[
                sheetStyles.footerBtn,
                reviewAction === 'APPROVE'
                  ? { backgroundColor: '#16a34a' }
                  : sheetStyles.footerBtnDanger,
              ]}
              disabled={processing}
              onPress={handleReviewConfirm}>
              {processing ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text
                  style={
                    reviewAction === 'APPROVE'
                      ? sheetStyles.footerBtnPrimaryText
                      : sheetStyles.footerBtnDangerText
                  }>
                  {reviewAction === 'APPROVE' ? 'Approve' : 'Reject'}
                </Text>
              )}
            </Pressable>
          </View>
        }>
        <Text style={styles.fieldLabel}>Review Comments (optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={reviewComments}
          onChangeText={setReviewComments}
          placeholder={
            reviewAction === 'APPROVE'
              ? 'Add any comments or notes...'
              : 'Provide reason for rejection...'
          }
          placeholderTextColor="#9ca3af"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </SheetModal>

      <SheetModal
        visible={!!deleteItem}
        onClose={() => !processing && setDeleteItem(null)}
        title="Delete Form Submission"
        subtitle="This action cannot be undone"
        footer={
          <View style={sheetStyles.footerRow}>
            <Pressable
              style={[sheetStyles.footerBtn, sheetStyles.footerBtnCancel]}
              disabled={processing}
              onPress={() => setDeleteItem(null)}>
              <Text style={sheetStyles.footerBtnCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[sheetStyles.footerBtn, sheetStyles.footerBtnDanger]}
              disabled={processing}
              onPress={handleDeleteConfirm}>
              {processing ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={sheetStyles.footerBtnDangerText}>Delete</Text>
              )}
            </Pressable>
          </View>
        }>
        <View style={sheetStyles.confirmIconWrap}>
          <FeatherIcon name="alert-triangle" size={28} color="#dc2626" />
        </View>
        <Text style={sheetStyles.confirmMessage}>
          Are you sure you want to delete this form submission?
        </Text>
        {deleteItem ? (
          <View style={styles.deletePreview}>
            <Text style={styles.deletePreviewTitle}>
              {FORM_LABELS[deleteItem.type] || deleteItem.type}
            </Text>
            {deleteItem.submittedByName ? (
              <Text style={styles.deletePreviewMeta}>
                By: {deleteItem.submittedByName}
              </Text>
            ) : null}
            <Text style={styles.deletePreviewMeta}>
              {formatDateTime(deleteItem.createdAt)}
            </Text>
          </View>
        ) : null}
      </SheetModal>
    </PortalScreenLayout>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  backBtnText: { color: '#2563eb', fontWeight: '600', fontSize: 14 },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 14,
  },
  sectionHeader: { marginBottom: 14, gap: 12 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  sectionTitleText: { flex: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  sectionDesc: { fontSize: 13, color: '#6b7280', marginTop: 4, lineHeight: 18 },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flex: 1,
    minWidth: 140,
  },
  filterBtnText: { fontSize: 13, color: '#374151', fontWeight: '600', flexShrink: 1 },
  rowCard: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 14,
    marginTop: 14,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 10,
  },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  typeText: { fontSize: 14, fontWeight: '600', color: '#111827', flex: 1 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: { fontSize: 10, fontWeight: '700' },
  userBlock: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  userText: { flex: 1 },
  userName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  userMeta: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  dateText: { fontSize: 12, color: '#6b7280' },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  viewBtnText: { fontSize: 13, fontWeight: '600', color: '#111827' },
  approveBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#dc2626',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  deleteBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  optionText: { fontSize: 14, color: '#111827', flex: 1, paddingRight: 8 },
  detailsHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginTop: 8,
    marginBottom: 8,
  },
  noData: { fontSize: 13, color: '#9ca3af', fontStyle: 'italic' },
  jsonPreview: {
    fontSize: 11,
    color: '#4b5563',
    backgroundColor: '#f9fafb',
    padding: 10,
    borderRadius: 8,
    fontFamily: 'monospace',
  },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 10,
  },
  linkBtnText: { color: '#2563eb', fontWeight: '600', fontSize: 14 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#fff',
  },
  textArea: { minHeight: 100 },
  deletePreview: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
  },
  deletePreviewTitle: { fontWeight: '700', fontSize: 14, color: '#111827' },
  deletePreviewMeta: { fontSize: 12, color: '#6b7280', marginTop: 4 },
});
