import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import Toast from 'react-native-toast-message';
import { EmptyState } from '../../components/portal/EmptyState';
import { LoadingView } from '../../components/portal/LoadingView';
import { DetailRow, SheetModal, sheetStyles } from '../../components/portal/SheetModal';
import { PortalScreenLayout } from '../../components/portal/PortalScreenLayout';
import { openDocumentFromUrl } from '../../services/documentService';
import {
  deleteCommitteeFile,
  fetchCommitteeFiles,
  updateCommitteeFileStatus,
  type CommitteeFile,
} from '../../services/committeeService';
import {
  isCommitteeReviewLocked,
  REVIEW_STATUS_OPTIONS,
  formatProposalDescriptionForDisplay,
  type ReviewStatusFilter,
} from '../../services/submissionService';

const ACCENT = '#16a34a';

const FILE_TYPE_OPTIONS = [
  { value: 'ALL', label: 'All Types' },
  { value: 'PROPOSAL', label: 'Proposal' },
  { value: 'FYP_I', label: 'FYP-I Document' },
  { value: 'FYP_II', label: 'FYP-II Document' },
  { value: 'REPORT', label: 'Report' },
  { value: 'DOCUMENTATION', label: 'Documentation' },
  { value: 'OTHER', label: 'Other Document' },
];

const DEPARTMENT_OPTIONS = [
  { value: 'ALL', label: 'All Departments' },
  { value: 'Computer Science', label: 'Computer Science' },
  { value: 'Software Engineering', label: 'Software Engineering' },
  { value: 'Administration', label: 'Administration' },
];

function getProjectDisplay(file: CommitteeFile) {
  const fileType = (file.fileType || '').toUpperCase();
  if (fileType === 'PROOF' || file.projectTitle === 'No Project') {
    return 'Proof Submission';
  }
  if (fileType === 'PROPOSAL' && file.groupName && file.groupName !== 'No Group') {
    return `Proposal - ${file.groupName}`;
  }
  if (fileType === 'FYP_I') {
    return file.projectTitle && file.projectTitle !== 'No Project'
      ? `FYP-I Document - ${file.projectTitle}`
      : 'FYP-I Document';
  }
  if (fileType === 'FYP_II') {
    return file.projectTitle && file.projectTitle !== 'No Project'
      ? `FYP-II Document - ${file.projectTitle}`
      : 'FYP-II Document';
  }
  if (fileType === 'OTHER') {
    return file.projectTitle && file.projectTitle !== 'No Project'
      ? `Other Document - ${file.projectTitle}`
      : 'Other Document';
  }
  if (fileType.includes('SUPERVISOR')) {
    return 'Supervisor Change Request';
  }
  if (fileType.includes('CONSENT')) {
    return 'Consent Form';
  }
  if (fileType.includes('EXTENSION')) {
    return 'Extension Request';
  }
  if (fileType.includes('REEVAL')) {
    return 'Re-Evaluation Appeal';
  }
  if (fileType.includes('GENERAL')) {
    return 'General Request';
  }
  return file.projectTitle || 'No Project';
}

function getStatusMeta(status?: string) {
  if (status === 'ADMIN_APPROVED') {
    return { label: 'Approved by Admin', bg: '#16a34a', color: '#fff' };
  }
  if (status === 'COMMITTEE_APPROVED') {
    return { label: 'Approved by Committee Head', bg: '#2563eb', color: '#fff' };
  }
  if (status === 'COMMITTEE_REJECTED') {
    return { label: 'Rejected by Committee Head', bg: '#dc2626', color: '#fff' };
  }
  if (status === 'ADMIN_REJECTED' || status === 'REJECTED') {
    return { label: status === 'ADMIN_REJECTED' ? 'Rejected by Admin' : 'Rejected', bg: '#dc2626', color: '#fff' };
  }
  return { label: 'Pending', bg: '#eab308', color: '#fff' };
}

function isFileReviewFinalized(file: CommitteeFile) {
  return isCommitteeReviewLocked(file.status);
}

function fileMatchesFilters(
  file: CommitteeFile,
  searchQuery: string,
  fileTypeFilter: string,
  departmentFilter: string,
) {
  const query = searchQuery.trim().toLowerCase();
  const matchesSearch =
    !query ||
    (file.fileName || file.originalName || '').toLowerCase().includes(query) ||
    (file.studentName || '').toLowerCase().includes(query) ||
    (file.projectTitle || '').toLowerCase().includes(query);

  const matchesType =
    fileTypeFilter === 'ALL' || (file.fileType || '').toUpperCase().includes(fileTypeFilter);

  const matchesDept = departmentFilter === 'ALL' || file.department === departmentFilter;

  return matchesSearch && matchesType && matchesDept;
}

function getFileSource(file: CommitteeFile) {
  if (file.fileUrl) {
    return file.fileUrl;
  }
  return `/api/admin/files/${encodeURIComponent(String(file.id))}/download`;
}

function getFileDownloadUrls(file: CommitteeFile) {
  return [getFileSource(file)];
}

function FilterDropdown({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.filterField}>
      <Text style={styles.filterLabel}>{label}</Text>
      <Pressable style={styles.filterChip} onPress={onPress}>
        <Text style={styles.filterText} numberOfLines={1}>
          {value}
        </Text>
        <FeatherIcon name="chevron-down" size={14} color="#6b7280" />
      </Pressable>
    </View>
  );
}

function PickerModal({
  visible,
  title,
  onClose,
  options,
  selected,
  onSelect,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  options: Array<{ value: string; label: string }>;
  selected: string;
  onSelect: (value: string) => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.pickerBackdrop} onPress={onClose}>
        <View style={styles.pickerSheet}>
          <Text style={styles.pickerTitle}>{title}</Text>
          {options.map((option) => (
            <Pressable
              key={option.value}
              style={styles.pickerOption}
              onPress={() => {
                onSelect(option.value);
                onClose();
              }}>
              <Text
                style={[
                  styles.pickerOptionText,
                  selected === option.value && styles.pickerOptionTextActive,
                ]}>
                {option.label}
              </Text>
              {selected === option.value ? (
                <FeatherIcon name="check" size={16} color={ACCENT} />
              ) : null}
            </Pressable>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}

export function CommitteeFilesScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [files, setFiles] = useState<CommitteeFile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [fileTypeFilter, setFileTypeFilter] = useState('ALL');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [reviewStatusFilter, setReviewStatusFilter] = useState<ReviewStatusFilter>('all');
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [departmentPickerOpen, setDepartmentPickerOpen] = useState(false);
  const [reviewPickerOpen, setReviewPickerOpen] = useState(false);
  const [viewFile, setViewFile] = useState<CommitteeFile | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const data = await fetchCommitteeFiles(reviewStatusFilter);
      const list = Array.isArray(data) ? data.filter((file) => file?.id) : [];
      setFiles(list);
    } catch {
      Alert.alert(
        'Load failed',
        'Could not load files. Check your internet connection and try again.',
      );
      setFiles([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [reviewStatusFilter]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredFiles = useMemo(
    () => files.filter((file) => fileMatchesFilters(file, searchQuery, fileTypeFilter, departmentFilter)),
    [files, searchQuery, fileTypeFilter, departmentFilter],
  );

  const selectedTypeLabel =
    FILE_TYPE_OPTIONS.find((item) => item.value === fileTypeFilter)?.label || 'All Types';
  const selectedDepartmentLabel =
    DEPARTMENT_OPTIONS.find((item) => item.value === departmentFilter)?.label || 'All Departments';
  const selectedReviewLabel =
    REVIEW_STATUS_OPTIONS.find((item) => item.value === reviewStatusFilter)?.label || 'All';

  const handleDownload = async (file: CommitteeFile) => {
    try {
      await openDocumentFromUrl(getFileSource(file), {
        fileName: file.originalName || file.fileName || 'document.pdf',
        urls: getFileDownloadUrls(file),
      });
    } catch {
      Alert.alert('Error', 'Failed to open file.');
    }
  };

  const handleApprove = (file: CommitteeFile) => {
    Alert.alert('Approve File', `Approve "${file.originalName || file.fileName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: async () => {
          setActionId(file.id);
          try {
            await updateCommitteeFileStatus(file.id, 'COMMITTEE_APPROVED');
            await loadData();
            Alert.alert('Success', 'Proposal approved! Student has been notified.');
          } catch {
            Alert.alert('Error', 'Failed to approve file.');
          } finally {
            setActionId(null);
          }
        },
      },
    ]);
  };

  const handleReject = (file: CommitteeFile) => {
    Alert.alert('Reject File', `Reject "${file.originalName || file.fileName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          setActionId(file.id);
          try {
            await updateCommitteeFileStatus(file.id, 'COMMITTEE_REJECTED');
            await loadData();
            Alert.alert('Success', 'File rejected.');
          } catch {
            Alert.alert('Error', 'Failed to reject file.');
          } finally {
            setActionId(null);
          }
        },
      },
    ]);
  };

  const handleDelete = (file: CommitteeFile) => {
    Alert.alert(
      'Confirm Deletion',
      `Are you sure you want to delete "${file.originalName || file.fileName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setActionId(file.id);
            try {
              await deleteCommitteeFile(file.id);
              await loadData();
              Alert.alert('Success', 'File deleted successfully.');
            } catch {
              Alert.alert('Error', 'Failed to delete file.');
            } finally {
              setActionId(null);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return <LoadingView message="Loading files..." />;
  }

  return (
    <PortalScreenLayout
      title="File Uploads"
      subtitle="Manage all student file submissions"
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        loadData();
      }}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.pageTitle}>File Uploads</Text>
          <Text style={styles.pageSub}>Manage all student file submissions</Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{files.length} Files</Text>
        </View>
      </View>

      <View style={styles.filtersCard}>
        <Text style={styles.filterLabel}>Search Files</Text>
        <View style={styles.searchWrap}>
          <FeatherIcon name="search" size={16} color="#9ca3af" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search files..."
            placeholderTextColor="#9ca3af"
            style={styles.searchInput}
          />
        </View>

        <View style={styles.filterRow}>
          <FilterDropdown
            label="Review Status"
            value={selectedReviewLabel}
            onPress={() => setReviewPickerOpen(true)}
          />
          <FilterDropdown
            label="File Type"
            value={selectedTypeLabel}
            onPress={() => setTypePickerOpen(true)}
          />
        </View>
        <View style={styles.filterRow}>
          <FilterDropdown
            label="Department"
            value={selectedDepartmentLabel}
            onPress={() => setDepartmentPickerOpen(true)}
          />
        </View>
      </View>

      {files.length === 0 ? (
        <View style={styles.listCard}>
          <EmptyState icon="file-text" title="No files uploaded yet" />
        </View>
      ) : filteredFiles.length === 0 ? (
        <View style={styles.listCard}>
          <EmptyState
            icon="search"
            title="No matching files"
            message="Try changing your search or filters."
          />
        </View>
      ) : (
        filteredFiles.map((file) => {
          const statusMeta = getStatusMeta(file.status);
          const reviewFinalized = isFileReviewFinalized(file);
          const busy = actionId === file.id;
          const projectDisplay = getProjectDisplay(file);

          return (
            <View key={file.id} style={styles.fileCard}>
              <View style={styles.fileCardTop}>
                <View style={styles.fileIconWrap}>
                  <FeatherIcon name="file-text" size={18} color={ACCENT} />
                </View>
                <View style={styles.fileMain}>
                  <Text style={styles.fileName} numberOfLines={2}>
                    {file.originalName || file.fileName}
                  </Text>
                  <Text style={styles.fileSize}>{file.fileSize || 'Unknown size'}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusMeta.bg }]}>
                  <Text style={[styles.statusBadgeText, { color: statusMeta.color }]}>
                    {statusMeta.label}
                  </Text>
                </View>
              </View>

              <View style={styles.fileMeta}>
                <Text style={styles.metaLine}>
                  <Text style={styles.metaLabel}>Student: </Text>
                  {file.studentName || 'Unknown'}
                </Text>
                {file.studentEmail ? (
                  <Text style={styles.metaSub}>{file.studentEmail}</Text>
                ) : null}
                <Text style={styles.metaLine}>
                  <Text style={styles.metaLabel}>Project: </Text>
                  {projectDisplay}
                </Text>
                <Text style={styles.metaLine}>
                  <Text style={styles.metaLabel}>Uploaded: </Text>
                  {file.uploadDate || 'N/A'}
                  {file.uploadTime ? ` • ${file.uploadTime}` : ''}
                </Text>
                {file.department ? (
                  <Text style={styles.metaLine}>
                    <Text style={styles.metaLabel}>Department: </Text>
                    {file.department}
                  </Text>
                ) : null}
              </View>

              <View style={styles.actionsRow}>
                <Pressable style={styles.iconAction} onPress={() => setViewFile(file)}>
                  <FeatherIcon name="eye" size={16} color="#374151" />
                </Pressable>
                <Pressable style={styles.iconAction} onPress={() => handleDownload(file)}>
                  <FeatherIcon name="download" size={16} color="#374151" />
                </Pressable>
                {!reviewFinalized ? (
                  <>
                    <Pressable
                      style={[styles.approveBtn, busy && styles.btnDisabled]}
                      disabled={busy}
                      onPress={() => handleApprove(file)}>
                      {busy ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <>
                          <FeatherIcon name="check" size={14} color="#fff" />
                          <Text style={styles.approveBtnText}>Approve</Text>
                        </>
                      )}
                    </Pressable>
                    <Pressable
                      style={[styles.rejectBtn, busy && styles.btnDisabled]}
                      disabled={busy}
                      onPress={() => handleReject(file)}>
                      <FeatherIcon name="x" size={14} color="#fff" />
                      <Text style={styles.rejectBtnText}>Reject</Text>
                    </Pressable>
                  </>
                ) : null}
                <Pressable style={styles.deleteAction} onPress={() => handleDelete(file)}>
                  <FeatherIcon name="trash-2" size={16} color="#dc2626" />
                </Pressable>
              </View>
            </View>
          );
        })
      )}

      <SheetModal
        visible={Boolean(viewFile)}
        onClose={() => setViewFile(null)}
        title={`${viewFile?.fileType || 'File'} Details`}
        subtitle={viewFile?.originalName || viewFile?.fileName}
        footer={
          viewFile ? (
            <View style={sheetStyles.footerRow}>
              <Pressable
                style={[sheetStyles.footerBtn, sheetStyles.footerBtnCancel]}
                onPress={() => setViewFile(null)}>
                <Text style={sheetStyles.footerBtnCancelText}>Close</Text>
              </Pressable>
              <Pressable
                style={[sheetStyles.footerBtn, sheetStyles.footerBtnPrimary]}
                onPress={() => handleDownload(viewFile)}>
                <Text style={sheetStyles.footerBtnPrimaryText}>Download</Text>
              </Pressable>
            </View>
          ) : null
        }>
        {viewFile ? (
          <>
            <DetailRow icon="user" label="Student" value={viewFile.studentName || 'Unknown'} />
            {viewFile.studentEmail ? (
              <DetailRow icon="mail" label="Email" value={viewFile.studentEmail} />
            ) : null}
            {viewFile.department ? (
              <DetailRow icon="briefcase" label="Department" value={viewFile.department} />
            ) : null}
            <DetailRow
              icon="calendar"
              label="Uploaded"
              value={`${viewFile.uploadDate || 'N/A'}${viewFile.uploadTime ? ` ${viewFile.uploadTime}` : ''}`}
            />
            <DetailRow icon="folder" label="Project" value={getProjectDisplay(viewFile)} />
            {viewFile.groupName ? (
              <DetailRow icon="users" label="Group" value={viewFile.groupName} />
            ) : null}
            {viewFile.fileSize ? (
              <DetailRow icon="hard-drive" label="File Size" value={viewFile.fileSize} />
            ) : null}
            {viewFile.fileType ? (
              <DetailRow icon="file" label="File Type" value={viewFile.fileType} />
            ) : null}
            <DetailRow icon="info" label="Status" value={getStatusMeta(viewFile.status).label} />
            {viewFile.supervisorName ? (
              <DetailRow icon="user-check" label="Supervisor" value={viewFile.supervisorName} />
            ) : null}
            {viewFile.description ? (
              <DetailRow
                icon="align-left"
                label="Description"
                value={formatProposalDescriptionForDisplay(viewFile.description)}
              />
            ) : null}
          </>
        ) : null}
      </SheetModal>

      <PickerModal
        visible={typePickerOpen}
        title="File Type"
        onClose={() => setTypePickerOpen(false)}
        options={FILE_TYPE_OPTIONS}
        selected={fileTypeFilter}
        onSelect={setFileTypeFilter}
      />

      <PickerModal
        visible={departmentPickerOpen}
        title="Department"
        onClose={() => setDepartmentPickerOpen(false)}
        options={DEPARTMENT_OPTIONS}
        selected={departmentFilter}
        onSelect={setDepartmentFilter}
      />

      <PickerModal
        visible={reviewPickerOpen}
        title="Review Status"
        onClose={() => setReviewPickerOpen(false)}
        options={REVIEW_STATUS_OPTIONS}
        selected={reviewStatusFilter}
        onSelect={setReviewStatusFilter}
      />
    </PortalScreenLayout>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  headerText: {
    flex: 1,
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  pageSub: {
    marginTop: 4,
    fontSize: 13,
    color: '#6b7280',
  },
  countBadge: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  countBadgeText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '600',
  },
  filtersCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 14,
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 10,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    paddingVertical: 11,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 10,
  },
  filterField: {
    flex: 1,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: '#fff',
  },
  filterText: {
    flex: 1,
    fontSize: 13,
    color: '#374151',
    marginRight: 8,
  },
  listCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingVertical: 8,
  },
  fileCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 14,
    marginBottom: 10,
  },
  fileCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  fileIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileMain: {
    flex: 1,
  },
  fileName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  fileSize: {
    marginTop: 2,
    fontSize: 12,
    color: '#6b7280',
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: '42%',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  fileMeta: {
    gap: 4,
    marginBottom: 12,
  },
  metaLine: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
  metaLabel: {
    fontWeight: '600',
    color: '#6b7280',
  },
  metaSub: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
    paddingLeft: 0,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconAction: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  approveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: ACCENT,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  approveBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  rejectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dc2626',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  rejectBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  deleteAction: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.7,
  },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 28,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  pickerOptionText: {
    fontSize: 15,
    color: '#374151',
  },
  pickerOptionTextActive: {
    color: ACCENT,
    fontWeight: '600',
  },
});
