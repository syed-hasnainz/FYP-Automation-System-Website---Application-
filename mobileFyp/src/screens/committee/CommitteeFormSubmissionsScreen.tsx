import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import { LoadingView } from '../../components/portal/LoadingView';
import { PortalScreenLayout } from '../../components/portal/PortalScreenLayout';
import { DetailRow, SheetModal, sheetStyles } from '../../components/portal/SheetModal';
import {
  deleteFormSubmission,
  fetchAllFormSubmissions,
  FORM_LABELS,
  reviewFormSubmission,
  type FormSubmissionItem,
} from '../../services/submissionService';

const FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Forms' },
  { value: 'proposal', label: 'Proposal Submission Form' },
  { value: 'supervisor-change', label: 'Supervisor Change Form' },
  { value: 'consent', label: 'FYP Student Consent Form' },
  { value: 'extension', label: 'Extension Request Form' },
  { value: 'reeval', label: 'Re-Evaluation Appeal Form' },
  { value: 'general', label: 'General Request Form' },
] as const;

function formatDateTime(dateValue?: string) {
  if (!dateValue) {
    return 'N/A';
  }
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) {
    return 'N/A';
  }
  return `${parsed.toLocaleDateString()} ${parsed.toLocaleTimeString()}`;
}

function getStatusColor(status?: string) {
  if (status === 'APPROVED') {
    return '#16a34a';
  }
  if (status === 'REJECTED') {
    return '#dc2626';
  }
  return '#6b7280';
}

function getStatusIcon(status?: string) {
  if (status === 'APPROVED') {
    return 'check-circle';
  }
  if (status === 'REJECTED') {
    return 'x-circle';
  }
  return 'clock';
}

function addField(
  fields: Array<{ label: string; value: string }>,
  label: string,
  value: unknown,
) {
  if (value !== undefined && value !== null && value !== '') {
    fields.push({ label, value: String(value) });
  }
}

function renderMemberFields(data?: Record<string, unknown>) {
  const members = data?.members;
  if (!Array.isArray(members) || members.length === 0) {
    return null;
  }

  return members.map((member, index) => {
    const row = member as Record<string, unknown>;
    if (!row.name && !row.regNo) {
      return null;
    }
    return (
      <View key={`member-${index}`} style={styles.memberCard}>
        <Text style={styles.memberTitle}>Project Member {index + 1}</Text>
        {row.name ? <Text style={styles.memberText}>Name: {String(row.name)}</Text> : null}
        {row.regNo ? (
          <Text style={styles.memberText}>Registration: {String(row.regNo)}</Text>
        ) : null}
      </View>
    );
  });
}

function renderFormDetails(type: string, data?: Record<string, unknown>) {
  if (!data) {
    return <Text style={styles.noData}>No data available</Text>;
  }

  const fields: Array<{ label: string; value: string }> = [];

  switch (type) {
    case 'proposal':
      addField(fields, 'Project Title', data.projectTitle);
      addField(fields, 'Project Track', data.projectTrack);
      addField(fields, 'Program of Study', data.program);
      addField(fields, 'Session', data.session);
      addField(fields, 'Domain/Area', data.domain);
      addField(fields, 'Date', data.date);
      addField(fields, 'Supervisor Recommendation', data.supervisorRecommendation);
      addField(fields, 'Extra Requirements', data.extraRequirements);
      addField(fields, 'Supervisor Name', data.supervisorName);
      addField(fields, 'Supervisor Designation', data.supervisorDesignation);
      addField(fields, 'Co-Supervisor Name', data.coSupervisorName);
      addField(fields, 'Co-Supervisor Designation', data.coSupervisorDesignation);
      addField(fields, 'Comments by FYP Committee', data.comments);
      break;
    case 'supervisor-change':
      addField(fields, 'Project Title', data.projectTitle);
      addField(fields, 'Project Code', data.projectCode);
      addField(fields, 'Previous Supervisor', data.prevSupervisor);
      addField(fields, 'New Supervisor', data.newSupervisor);
      addField(fields, 'Co-Supervisors', data.coSupervisors);
      addField(fields, 'Date', data.date);
      addField(fields, 'Reason for Change', data.reason);
      addField(fields, 'Previous Supervisor Comments', data.prevSupervisorComments);
      addField(fields, 'New Supervisor Comments', data.newSupervisorComments);
      addField(fields, 'Committee Comments', data.committeeComments);
      break;
    case 'consent':
      addField(fields, 'Consent Statement', data.consentStatement);
      addField(fields, 'Additional Notes', data.additionalNotes);
      addField(fields, 'Date', data.date);
      break;
    case 'extension':
      addField(fields, 'Project Title', data.projectTitle);
      addField(fields, 'Requested Extension', data.requestedExtension);
      addField(fields, 'Supporting Documents', data.supportingDocs);
      addField(fields, 'Reason for Extension', data.reason);
      break;
    case 'reeval':
      addField(fields, 'Project Title', data.projectTitle);
      addField(fields, 'Evaluation Type', data.evaluationType);
      addField(fields, 'Previous Score', data.previousScore);
      addField(fields, 'Date', data.date);
      addField(fields, 'Appeal Reason', data.appealReason);
      addField(fields, 'Supporting Evidence', data.supportingEvidence);
      addField(fields, 'Committee Response', data.committeeResponse);
      break;
    case 'general':
      addField(fields, 'Request Type', data.requestType);
      addField(fields, 'Subject', data.subject);
      addField(fields, 'Date', data.date);
      addField(fields, 'Description', data.description);
      addField(fields, 'Committee Response', data.committeeResponse);
      break;
    default:
      Object.entries(data).forEach(([key, value]) => {
        if (typeof value === 'string' || typeof value === 'number') {
          addField(fields, key.replace(/([A-Z])/g, ' $1'), value);
        }
      });
  }

  return (
    <>
      {fields.map((field) => (
        <DetailRow key={field.label} icon="file-text" label={field.label} value={field.value} />
      ))}
      {renderMemberFields(data)}
      {fields.length === 0 && !Array.isArray(data.members) ? (
        <Text style={styles.jsonPreview}>{JSON.stringify(data, null, 2)}</Text>
      ) : null}
    </>
  );
}

function getEmptyMessage(filter: string) {
  if (filter === 'ALL') {
    return 'No form submissions have been submitted yet. Forms will appear here once students submit them.';
  }
  const label = FORM_LABELS[filter] || filter;
  return `No ${label} submissions found.`;
}

export function CommitteeFormSubmissionsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [submissions, setSubmissions] = useState<FormSubmissionItem[]>([]);
  const [formTypeFilter, setFormTypeFilter] = useState('ALL');
  const [filterPickerOpen, setFilterPickerOpen] = useState(false);
  const [viewItem, setViewItem] = useState<FormSubmissionItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<FormSubmissionItem | null>(null);
  const [reviewItem, setReviewItem] = useState<FormSubmissionItem | null>(null);
  const [reviewAction, setReviewAction] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [reviewComments, setReviewComments] = useState('');

  const loadData = useCallback(async () => {
    try {
      const forms = await fetchAllFormSubmissions();
      setSubmissions(Array.isArray(forms) ? forms : []);
    } catch {
      setSubmissions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredSubmissions = useMemo(() => {
    if (formTypeFilter === 'ALL') {
      return submissions;
    }
    return submissions.filter((item) => item.type === formTypeFilter);
  }, [formTypeFilter, submissions]);

  const filterLabel =
    FILTER_OPTIONS.find((option) => option.value === formTypeFilter)?.label || 'All Forms';

  const openReview = (item: FormSubmissionItem, action: 'APPROVE' | 'REJECT') => {
    setReviewItem(item);
    setReviewAction(action);
    setReviewComments('');
  };

  const handleReviewConfirm = async () => {
    if (!reviewItem || !reviewAction) {
      return;
    }
    setProcessing(true);
    try {
      await reviewFormSubmission(reviewItem.id, reviewAction, reviewComments);
      setReviewItem(null);
      setReviewAction(null);
      setReviewComments('');
      await loadData();
    } catch {
      Alert.alert('Error', 'Failed to update form submission.');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteItem) {
      return;
    }
    setProcessing(true);
    try {
      await deleteFormSubmission(deleteItem.id);
      setDeleteItem(null);
      if (viewItem?.id === deleteItem.id) {
        setViewItem(null);
      }
      await loadData();
    } catch {
      Alert.alert('Error', 'Failed to delete form submission.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <LoadingView message="Loading form submissions..." />;
  }

  return (
    <PortalScreenLayout
      title="Form Submissions & Approvals"
      subtitle="Review and manage student form submissions"
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        loadData();
      }}>
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
          <Pressable style={styles.filterBtn} onPress={() => setFilterPickerOpen(true)}>
            <FeatherIcon name="filter" size={16} color="#6b7280" />
            <Text style={styles.filterBtnText} numberOfLines={1}>
              {filterLabel}
            </Text>
            <FeatherIcon name="chevron-down" size={16} color="#6b7280" />
          </Pressable>
        </View>

        {filteredSubmissions.length === 0 ? (
          <View style={styles.emptyWrap}>
            <FeatherIcon name="file-text" size={44} color="#9ca3af" />
            <Text style={styles.emptyTitle}>
              {formTypeFilter === 'ALL'
                ? 'No Form Submissions'
                : `No ${FORM_LABELS[formTypeFilter] || formTypeFilter} Submissions`}
            </Text>
            <Text style={styles.emptyMessage}>{getEmptyMessage(formTypeFilter)}</Text>
          </View>
        ) : (
          filteredSubmissions.map((item) => (
            <View key={item.id} style={styles.rowCard}>
              <View style={styles.rowTop}>
                <View style={styles.typeRow}>
                  <FeatherIcon name="file-text" size={16} color="#9ca3af" />
                  <Text style={styles.typeText}>{FORM_LABELS[item.type] || item.type}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: `${getStatusColor(item.status)}20` },
                  ]}>
                  <FeatherIcon
                    name={getStatusIcon(item.status)}
                    size={12}
                    color={getStatusColor(item.status)}
                  />
                  <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                    {item.status || 'PENDING'}
                  </Text>
                </View>
              </View>

              {item.submittedByName ? (
                <View style={styles.userBlock}>
                  <FeatherIcon name="user" size={14} color="#9ca3af" />
                  <View style={styles.userText}>
                    <Text style={styles.userName}>{item.submittedByName}</Text>
                    {item.submittedByRollNumber ? (
                      <Text style={styles.userMeta}>Roll: {item.submittedByRollNumber}</Text>
                    ) : null}
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
                {item.status === 'PENDING' ? (
                  <>
                    <Pressable
                      style={styles.approveBtn}
                      onPress={() => openReview(item, 'APPROVE')}>
                      <FeatherIcon name="check-circle" size={16} color="#fff" />
                      <Text style={styles.approveBtnText}>Approve</Text>
                    </Pressable>
                    <Pressable style={styles.rejectBtn} onPress={() => openReview(item, 'REJECT')}>
                      <FeatherIcon name="x-circle" size={16} color="#fff" />
                      <Text style={styles.rejectBtnText}>Reject</Text>
                    </Pressable>
                  </>
                ) : null}
                <Pressable style={styles.deleteBtn} onPress={() => setDeleteItem(item)}>
                  <FeatherIcon name="trash-2" size={16} color="#fff" />
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
        visible={!!viewItem}
        onClose={() => setViewItem(null)}
        title={viewItem ? FORM_LABELS[viewItem.type] || viewItem.type : 'Form Details'}
        subtitle="View form submission details"
        footer={
          viewItem ? (
            <View style={sheetStyles.footerRow}>
              <Pressable
                style={[sheetStyles.footerBtn, sheetStyles.footerBtnCancel]}
                onPress={() => setViewItem(null)}>
                <Text style={sheetStyles.footerBtnCancelText}>Close</Text>
              </Pressable>
              {viewItem.status === 'PENDING' ? (
                <>
                  <Pressable
                    style={[sheetStyles.footerBtn, { backgroundColor: '#16a34a', flex: 1 }]}
                    onPress={() => {
                      const item = viewItem;
                      setViewItem(null);
                      if (item) {
                        openReview(item, 'APPROVE');
                      }
                    }}>
                    <Text style={sheetStyles.footerBtnPrimaryText}>Approve</Text>
                  </Pressable>
                  <Pressable
                    style={[sheetStyles.footerBtn, sheetStyles.footerBtnDanger, { flex: 1 }]}
                    onPress={() => {
                      const item = viewItem;
                      setViewItem(null);
                      if (item) {
                        openReview(item, 'REJECT');
                      }
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
              value={viewItem.submittedByName || 'Not available'}
            />
            {viewItem.submittedByEmail ? (
              <DetailRow icon="mail" label="Email" value={viewItem.submittedByEmail} />
            ) : null}
            {viewItem.submittedByRollNumber ? (
              <DetailRow icon="hash" label="Roll Number" value={viewItem.submittedByRollNumber} />
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
              label="Submitted Date"
              value={formatDateTime(viewItem.createdAt)}
            />
            <DetailRow icon="activity" label="Status" value={viewItem.status || 'PENDING'} />
            <Text style={styles.detailsHeading}>Form Details</Text>
            {renderFormDetails(viewItem.type, viewItem.data)}
          </>
        ) : null}
      </SheetModal>

      <SheetModal
        visible={!!reviewItem}
        onClose={() => !processing && setReviewItem(null)}
        title={reviewAction === 'APPROVE' ? 'Approve Form Submission' : 'Reject Form Submission'}
        subtitle={reviewItem ? FORM_LABELS[reviewItem.type] || reviewItem.type : undefined}
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
        {reviewItem?.submittedByName ? (
          <Text style={styles.reviewMeta}>Submitted by: {reviewItem.submittedByName}</Text>
        ) : null}
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
              <Text style={styles.deletePreviewMeta}>By: {deleteItem.submittedByName}</Text>
            ) : null}
            <Text style={styles.deletePreviewMeta}>{formatDateTime(deleteItem.createdAt)}</Text>
          </View>
        ) : null}
      </SheetModal>
    </PortalScreenLayout>
  );
}

const styles = StyleSheet.create({
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
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    maxWidth: '100%',
  },
  filterBtnText: { fontSize: 13, color: '#374151', fontWeight: '600', flexShrink: 1 },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    marginTop: 14,
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  emptyMessage: {
    marginTop: 8,
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#16a34a',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  approveBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  rejectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#dc2626',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  rejectBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  deleteBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  memberCard: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  memberTitle: { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 4 },
  memberText: { fontSize: 13, color: '#4b5563', marginTop: 2 },
  noData: { fontSize: 13, color: '#9ca3af', fontStyle: 'italic' },
  jsonPreview: {
    fontSize: 11,
    color: '#4b5563',
    backgroundColor: '#f9fafb',
    padding: 10,
    borderRadius: 8,
    fontFamily: 'monospace',
  },
  reviewMeta: { fontSize: 13, color: '#6b7280', marginBottom: 12 },
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
