import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import Toast from 'react-native-toast-message';
import { LoadingView } from '../../components/portal/LoadingView';
import { PortalScreenLayout } from '../../components/portal/PortalScreenLayout';
import { SheetModal, sheetStyles, DetailRow } from '../../components/portal/SheetModal';
import { getResolvedApiBaseUrl } from '../../services/apiClient';
import { openDocumentFromUrl } from '../../services/documentService';
import {
  fetchTeacherFiles,
  updateTeacherFileStatus,
  type TeacherFile,
  type TeacherFileGroup,
} from '../../services/teacherService';
import { useAuthUser } from '../../hooks/useAuthUser';
import { formatProposalDescriptionForDisplay } from '../../services/submissionService';

const FILE_TYPE_OPTIONS = [
  { value: 'ALL', label: 'All Types' },
  { value: 'PROPOSAL', label: 'Proposal Form' },
  { value: 'REPORT', label: 'Report' },
  { value: 'DOCUMENTATION', label: 'Documentation' },
  { value: 'OTHER', label: 'Other' },
];

function getFileTypeBadge(fileType?: string) {
  const normalizedType = (fileType || '').toUpperCase();
  const types: Record<string, { label: string; bg: string; color: string }> = {
    PROPOSAL: { label: 'Proposal Form', bg: '#dbeafe', color: '#1e40af' },
    REPORT: { label: 'Report', bg: '#dcfce7', color: '#166534' },
    DOCUMENTATION: { label: 'Documentation', bg: '#f3e8ff', color: '#6b21a8' },
    WEEKLY_REPORT: { label: 'Weekly Report', bg: '#dcfce7', color: '#166534' },
    OTHER: { label: 'Other', bg: '#f3f4f6', color: '#374151' },
  };
  return types[normalizedType] || types.OTHER;
}

function getStatusBadge(
  status?: string,
  supervisorApprovalStatus?: string,
  fileType?: string,
) {
  const fileTypeUpper = (fileType || '').toUpperCase();

  if (fileTypeUpper === 'REPORT' || fileTypeUpper === 'DOCUMENTATION') {
    if (status === 'APPROVED' || supervisorApprovalStatus === 'APPROVED') {
      return { label: 'Forwarded for Tracking', bg: '#dbeafe', color: '#1e40af' };
    }
    return { label: 'Pending', bg: '#fef9c3', color: '#854d0e' };
  }

  if (
    status === 'REJECTED' ||
    status === 'COMMITTEE_REJECTED' ||
    status === 'ADMIN_REJECTED'
  ) {
    return { label: 'Rejected', bg: '#fee2e2', color: '#991b1b' };
  }
  if (status === 'ADMIN_APPROVED' || status === 'COMMITTEE_APPROVED') {
    return { label: 'Approved', bg: '#dcfce7', color: '#166534' };
  }
  if (status === 'CHANGES_REQUESTED') {
    return { label: 'Changes Requested', bg: '#fef9c3', color: '#854d0e' };
  }

  const isProposal = fileTypeUpper === 'PROPOSAL';
  const isSupervisorApproved =
    supervisorApprovalStatus === 'APPROVED' ||
    (status === 'APPROVED' && isProposal && supervisorApprovalStatus !== 'REJECTED');

  if (isSupervisorApproved) {
    return {
      label: 'Pending from Committee/Admin',
      bg: '#ffedd5',
      color: '#9a3412',
    };
  }
  if (supervisorApprovalStatus === 'REJECTED') {
    return { label: 'Rejected by Supervisor', bg: '#fee2e2', color: '#991b1b' };
  }
  return { label: 'Pending from Supervisor', bg: '#fef9c3', color: '#854d0e' };
}

function filterTeacherFiles(
  files: TeacherFile[],
  searchQuery: string,
  fileTypeFilter: string,
  groupFilter: string,
) {
  const q = searchQuery.trim().toLowerCase();
  const filterTypeUpper = (fileTypeFilter || 'ALL').toUpperCase();

  return files.filter((file) => {
    const matchesSearch =
      !q ||
      file.name?.toLowerCase().includes(q) ||
      file.originalName?.toLowerCase().includes(q) ||
      file.student?.name?.toLowerCase().includes(q) ||
      file.student?.email?.toLowerCase().includes(q) ||
      file.groupName?.toLowerCase().includes(q) ||
      file.description?.toLowerCase().includes(q);

    const fileTypeUpper = (file.fileType || '').toUpperCase();
    const matchesType = filterTypeUpper === 'ALL' || fileTypeUpper === filterTypeUpper;

    const matchesGroup =
      groupFilter === 'ALL' ||
      (file.groupId && String(file.groupId) === String(groupFilter)) ||
      (file.groupName && file.groupName === groupFilter);

    return matchesSearch && matchesType && matchesGroup;
  });
}

function getFileViewUrl(file: TeacherFile) {
  if (file.fileUrl) {
    return file.fileUrl;
  }
  return `/api/admin/files/${encodeURIComponent(file.id)}/download?inline=1`;
}

function getFileDownloadUrls(file: TeacherFile) {
  const base = getResolvedApiBaseUrl().replace(/\/$/, '');
  return [`${base}/api/admin/files/${encodeURIComponent(file.id)}/download?inline=1`];
}

function formatFileSize(size?: number) {
  if (!size) {
    return null;
  }
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function FileRow({
  file,
  onView,
  onDownload,
  onApprove,
  onReject,
  onRequestChanges,
  actionLoading,
}: {
  file: TeacherFile;
  onView: () => void;
  onDownload: () => void;
  onApprove: () => void;
  onReject: () => void;
  onRequestChanges: () => void;
  actionLoading: boolean;
}) {
  const typeBadge = getFileTypeBadge(file.fileType);
  const statusBadge = getStatusBadge(
    file.status,
    file.supervisorApprovalStatus,
    file.fileType,
  );
  const displayName = file.name || file.originalName || file.fileName || 'Untitled file';
  const uploadedDate = file.uploadedAt
    ? new Date(file.uploadedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'N/A';

  const canReview =
    file.status === 'PENDING' &&
    file.supervisorApprovalStatus !== 'APPROVED' &&
    file.supervisorApprovalStatus !== 'REJECTED' &&
    (file.fileType || '').toUpperCase() === 'PROPOSAL';

  return (
    <View style={styles.fileCard}>
      <View style={styles.fileHeader}>
        <FeatherIcon name="file-text" size={18} color="#9ca3af" />
        <View style={styles.fileHeaderText}>
          <Text style={styles.fileName}>{displayName}</Text>
          {file.description ? (
            <Text style={styles.fileDescription} numberOfLines={2}>
              {formatProposalDescriptionForDisplay(file.description)}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.fileMetaRow}>
        <View style={[styles.metaBadge, { backgroundColor: typeBadge.bg }]}>
          <Text style={[styles.metaBadgeText, { color: typeBadge.color }]}>
            {typeBadge.label}
          </Text>
        </View>
        <View style={[styles.metaBadge, { backgroundColor: statusBadge.bg }]}>
          <Text style={[styles.metaBadgeText, { color: statusBadge.color }]}>
            {statusBadge.label}
          </Text>
        </View>
      </View>

      <View style={styles.fileDetails}>
        <Text style={styles.detailLine}>
          <Text style={styles.detailLabel}>Student: </Text>
          {file.student?.name || 'Unknown'}
        </Text>
        {file.student?.email ? (
          <Text style={styles.detailSub}>{file.student.email}</Text>
        ) : null}
        <Text style={styles.detailLine}>
          <Text style={styles.detailLabel}>Uploaded: </Text>
          {uploadedDate}
        </Text>
      </View>

      <View style={styles.fileActions}>
        <Pressable style={styles.iconBtn} onPress={onView}>
          <FeatherIcon name="eye" size={16} color="#374151" />
        </Pressable>
        <Pressable style={styles.iconBtn} onPress={onDownload}>
          <FeatherIcon name="download" size={16} color="#374151" />
        </Pressable>
        {canReview ? (
          <>
            <Pressable
              style={[styles.iconBtn, styles.approveBtn]}
              disabled={actionLoading}
              onPress={onApprove}>
              <FeatherIcon name="check" size={16} color="#15803d" />
            </Pressable>
            <Pressable
              style={[styles.iconBtn, styles.rejectBtn]}
              disabled={actionLoading}
              onPress={onReject}>
              <FeatherIcon name="x" size={16} color="#dc2626" />
            </Pressable>
            <Pressable
              style={[styles.iconBtn, styles.changesBtn]}
              disabled={actionLoading}
              onPress={onRequestChanges}>
              <FeatherIcon name="edit-2" size={16} color="#ca8a04" />
            </Pressable>
          </>
        ) : null}
      </View>
    </View>
  );
}

export function TeacherFilesScreen() {
  const { user } = useAuthUser();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [files, setFiles] = useState<TeacherFile[]>([]);
  const [groups, setGroups] = useState<TeacherFileGroup[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [fileTypeFilter, setFileTypeFilter] = useState('ALL');
  const [groupFilter, setGroupFilter] = useState('ALL');
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [groupPickerOpen, setGroupPickerOpen] = useState(false);
  const [changesOpen, setChangesOpen] = useState(false);
  const [changesFeedback, setChangesFeedback] = useState('');
  const [changesFileId, setChangesFileId] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [savingChanges, setSavingChanges] = useState(false);
  const [viewFile, setViewFile] = useState<TeacherFile | null>(null);

  const loadData = useCallback(async () => {
    if (!user?.id) {
      setFiles([]);
      setGroups([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const data = await fetchTeacherFiles(user.id);
      setFiles(Array.isArray(data.files) ? data.files : []);
      setGroups(Array.isArray(data.groups) ? data.groups : []);
    } catch {
      setFiles([]);
      setGroups([]);
      Toast.show({ type: 'error', text1: 'Failed to load uploaded files' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredFiles = useMemo(
    () => filterTeacherFiles(files, searchQuery, fileTypeFilter, groupFilter),
    [files, searchQuery, fileTypeFilter, groupFilter],
  );

  const groupedFiles = useMemo(
    () =>
      groups
        .map((group) => ({
          ...group,
          files: filteredFiles.filter((file) => String(file.groupId) === String(group.id)),
        }))
        .filter((group) => group.files.length > 0),
    [groups, filteredFiles],
  );

  const selectedTypeLabel =
    FILE_TYPE_OPTIONS.find((option) => option.value === fileTypeFilter)?.label ?? 'All Types';
  const selectedGroupLabel =
    groupFilter === 'ALL'
      ? 'All Groups'
      : groups.find((group) => group.id === groupFilter)?.name ?? 'All Groups';

  const handleFileAction = async (fileId: string, status: string, feedback?: string) => {
    if (!user?.id) {
      return;
    }
    setActionLoading(true);
    try {
      await updateTeacherFileStatus(fileId, user.id, { status, feedback });
      Toast.show({ type: 'success', text1: 'File updated successfully' });
      await loadData();
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to update file' });
    } finally {
      setActionLoading(false);
    }
  };

  const openChangesModal = (fileId: string) => {
    setChangesFileId(fileId);
    setChangesFeedback('');
    setChangesOpen(true);
  };

  const handleRequestChanges = async () => {
    if (!changesFeedback.trim()) {
      Toast.show({ type: 'error', text1: 'Please provide feedback for the requested changes' });
      return;
    }
    setSavingChanges(true);
    try {
      await handleFileAction(changesFileId, 'CHANGES_REQUESTED', changesFeedback.trim());
      setChangesOpen(false);
      setChangesFileId('');
      setChangesFeedback('');
    } finally {
      setSavingChanges(false);
    }
  };

  const openFileDocument = async (file: TeacherFile) => {
    const displayName = file.name || file.originalName || file.fileName || 'document';
    try {
      await openDocumentFromUrl(getFileViewUrl(file), {
        fileName: displayName,
        urls: getFileDownloadUrls(file),
      });
    } catch {
      Toast.show({ type: 'error', text1: 'Could not open file' });
    }
  };

  const getViewFileStatusLabel = (file: TeacherFile) =>
    getStatusBadge(file.status, file.supervisorApprovalStatus, file.fileType).label;

  if (loading) {
    return <LoadingView message="Loading uploaded files..." />;
  }

  return (
    <PortalScreenLayout
      title="Uploaded Files"
      subtitle="View files uploaded by your supervised students"
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        loadData();
      }}>
      <Text style={styles.pageTitle}>Uploaded Files</Text>
      <Text style={styles.pageSubtitle}>View files uploaded by your supervised students</Text>

      <View style={styles.filtersCard}>
        <Text style={styles.filterLabel}>Search Files</Text>
        <View style={styles.searchWrap}>
          <FeatherIcon name="search" size={18} color="#9ca3af" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by file name, student, or group..."
            placeholderTextColor="#9ca3af"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 ? (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
              <FeatherIcon name="x-circle" size={18} color="#9ca3af" />
            </Pressable>
          ) : null}
        </View>

        <Text style={styles.filterLabel}>File Type</Text>
        <Pressable style={styles.picker} onPress={() => setTypePickerOpen(true)}>
          <Text style={styles.pickerText}>{selectedTypeLabel}</Text>
          <FeatherIcon name="chevron-down" size={18} color="#6b7280" />
        </Pressable>

        <Text style={styles.filterLabel}>Filter by Group</Text>
        <Pressable style={styles.picker} onPress={() => setGroupPickerOpen(true)}>
          <Text style={styles.pickerText}>{selectedGroupLabel}</Text>
          <FeatherIcon name="chevron-down" size={18} color="#6b7280" />
        </Pressable>
      </View>

      {filteredFiles.length === 0 ? (
        <View style={styles.emptyCard}>
          <FeatherIcon name="file-text" size={48} color="#9ca3af" />
          <Text style={styles.emptyTitle}>No Files Found</Text>
          <Text style={styles.emptyMessage}>
            {files.length === 0
              ? "Your students haven't uploaded any files yet"
              : 'No files match your search criteria'}
          </Text>
        </View>
      ) : groupedFiles.length === 0 ? (
        <View style={styles.emptyCard}>
          <FeatherIcon name="file-text" size={48} color="#9ca3af" />
          <Text style={styles.emptyTitle}>No Files Found</Text>
          <Text style={styles.emptyMessage}>No files match your search criteria</Text>
        </View>
      ) : (
        groupedFiles.map((group) => (
          <View key={group.id} style={styles.groupCard}>
            <View style={styles.groupHeader}>
              <FeatherIcon name="users" size={18} color="#2563eb" />
              <Text style={styles.groupName}>{group.name}</Text>
              <View style={styles.groupCountBadge}>
                <Text style={styles.groupCountText}>{group.files.length} Files</Text>
              </View>
            </View>
            {group.files.map((file) => (
              <FileRow
                key={file.id}
                file={file}
                actionLoading={actionLoading}
                onView={() => setViewFile(file)}
                onDownload={() => openFileDocument(file)}
                onApprove={() => handleFileAction(file.id, 'APPROVED')}
                onReject={() => handleFileAction(file.id, 'REJECTED')}
                onRequestChanges={() => openChangesModal(file.id)}
              />
            ))}
          </View>
        ))
      )}

      <SheetModal
        visible={typePickerOpen}
        onClose={() => setTypePickerOpen(false)}
        title="File Type">
        {FILE_TYPE_OPTIONS.map((option) => (
          <Pressable
            key={option.value}
            style={styles.optionRow}
            onPress={() => {
              setFileTypeFilter(option.value);
              setTypePickerOpen(false);
            }}>
            <Text style={styles.optionText}>{option.label}</Text>
            {fileTypeFilter === option.value ? (
              <FeatherIcon name="check" size={18} color="#2563eb" />
            ) : null}
          </Pressable>
        ))}
      </SheetModal>

      <SheetModal
        visible={groupPickerOpen}
        onClose={() => setGroupPickerOpen(false)}
        title="Filter by Group">
        <Pressable
          style={styles.optionRow}
          onPress={() => {
            setGroupFilter('ALL');
            setGroupPickerOpen(false);
          }}>
          <Text style={styles.optionText}>All Groups</Text>
          {groupFilter === 'ALL' ? (
            <FeatherIcon name="check" size={18} color="#2563eb" />
          ) : null}
        </Pressable>
        {groups.length === 0 ? (
          <Text style={styles.noGroupsText}>No groups available</Text>
        ) : (
          groups.map((group) => (
            <Pressable
              key={group.id}
              style={styles.optionRow}
              onPress={() => {
                setGroupFilter(group.id);
                setGroupPickerOpen(false);
              }}>
              <Text style={styles.optionText}>{group.name}</Text>
              {groupFilter === group.id ? (
                <FeatherIcon name="check" size={18} color="#2563eb" />
              ) : null}
            </Pressable>
          ))
        )}
      </SheetModal>

      <SheetModal
        visible={Boolean(viewFile)}
        onClose={() => setViewFile(null)}
        title="File Details"
        subtitle={viewFile?.name || viewFile?.originalName || viewFile?.fileName}
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
                onPress={() => openFileDocument(viewFile)}>
                <Text style={sheetStyles.footerBtnPrimaryText}>Open File</Text>
              </Pressable>
            </View>
          ) : null
        }>
        {viewFile ? (
          <>
            <DetailRow
              icon="file-text"
              label="File Name"
              value={viewFile.name || viewFile.originalName || viewFile.fileName || 'Untitled'}
            />
            <DetailRow icon="user" label="Student" value={viewFile.student?.name || 'Unknown'} />
            {viewFile.student?.email ? (
              <DetailRow icon="mail" label="Email" value={viewFile.student.email} />
            ) : null}
            {viewFile.groupName ? (
              <DetailRow icon="users" label="Group" value={viewFile.groupName} />
            ) : null}
            {viewFile.project?.title ? (
              <DetailRow icon="folder" label="Project" value={viewFile.project.title} />
            ) : null}
            <DetailRow
              icon="calendar"
              label="Uploaded"
              value={
                viewFile.uploadedAt
                  ? new Date(viewFile.uploadedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                  : 'N/A'
              }
            />
            {viewFile.fileType ? (
              <DetailRow
                icon="file"
                label="File Type"
                value={getFileTypeBadge(viewFile.fileType).label}
              />
            ) : null}
            {formatFileSize(viewFile.fileSize) ? (
              <DetailRow
                icon="hard-drive"
                label="File Size"
                value={formatFileSize(viewFile.fileSize)!}
              />
            ) : null}
            <DetailRow icon="info" label="Status" value={getViewFileStatusLabel(viewFile)} />
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

      <SheetModal
        visible={changesOpen}
        onClose={() => !savingChanges && setChangesOpen(false)}
        title="Request Changes"
        subtitle="Provide feedback for the group to revise their file"
        footer={
          <View style={sheetStyles.footerRow}>
            <Pressable
              style={[sheetStyles.footerBtn, sheetStyles.footerBtnCancel]}
              disabled={savingChanges}
              onPress={() => setChangesOpen(false)}>
              <Text style={sheetStyles.footerBtnCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[sheetStyles.footerBtn, sheetStyles.footerBtnPrimary]}
              disabled={savingChanges}
              onPress={handleRequestChanges}>
              {savingChanges ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={sheetStyles.footerBtnPrimaryText}>Send Feedback</Text>
              )}
            </Pressable>
          </View>
        }>
        <Text style={styles.fieldLabel}>Feedback</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={changesFeedback}
          onChangeText={setChangesFeedback}
          placeholder="Explain what changes are needed..."
          placeholderTextColor="#9ca3af"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </SheetModal>
    </PortalScreenLayout>
  );
}

const styles = StyleSheet.create({
  pageTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 14,
  },
  filtersCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    marginBottom: 14,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    marginTop: 4,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 44,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    paddingVertical: 10,
  },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  pickerText: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  emptyMessage: {
    marginTop: 8,
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  groupCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    marginBottom: 14,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  groupName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  groupCountBadge: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  groupCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
  },
  fileCard: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 14,
    marginTop: 14,
    gap: 10,
  },
  fileHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  fileHeaderText: { flex: 1, minWidth: 0 },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  fileDescription: {
    marginTop: 4,
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 17,
  },
  fileMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  metaBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  fileDetails: { gap: 4 },
  detailLine: {
    fontSize: 13,
    color: '#374151',
  },
  detailLabel: {
    fontWeight: '600',
    color: '#4b5563',
  },
  detailSub: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 0,
  },
  fileActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  approveBtn: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  rejectBtn: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  changesBtn: {
    backgroundColor: '#fefce8',
    borderColor: '#fde68a',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 12,
  },
  optionText: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  noGroupsText: {
    fontSize: 13,
    color: '#6b7280',
    paddingVertical: 12,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  textArea: {
    minHeight: 110,
  },
});
