import React, { useCallback, useMemo, useState } from 'react';
import {
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
import { DetailRow, SheetModal } from '../../components/portal/SheetModal';
import { PortalScreenLayout } from '../../components/portal/PortalScreenLayout';
import { openDocumentFromUrl } from '../../services/documentService';
import {
  fetchCommitteeProjects,
  type CommitteeProject,
} from '../../services/committeeService';
import {
  getReviewStatusLabel,
  REVIEW_STATUS_OPTIONS,
  type ReviewStatusFilter,
} from '../../services/submissionService';

const STATUS_OPTIONS = ['ALL', 'PROPOSED', 'APPROVED', 'IN_PROGRESS', 'COMPLETED'] as const;

type StatusFilter = (typeof STATUS_OPTIONS)[number];

function formatDate(dateValue?: string) {
  if (!dateValue) {
    return 'N/A';
  }
  const parsed = new Date(dateValue);
  return Number.isNaN(parsed.getTime()) ? 'N/A' : parsed.toLocaleDateString();
}

function getProposalTitle(project: CommitteeProject) {
  return project.proposalTitle || project.projectTitle || project.title || 'Untitled';
}

function getStudentNames(project: CommitteeProject) {
  if (project.group?.members?.length) {
    const names = project.group.members
      .map((member) => member.name)
      .filter(Boolean);
    if (names.length) {
      return names.join(', ');
    }
  }
  return project.submittedBy?.name || 'No students assigned';
}

function getSupervisorName(project: CommitteeProject) {
  return project.supervisor?.name || 'No supervisor';
}

function getStatusLabel(status?: string) {
  if (status === 'IN_PROGRESS') {
    return 'In Progress';
  }
  if (status === 'COMPLETED') {
    return 'Completed';
  }
  if (status === 'PROPOSED') {
    return 'Proposed';
  }
  if (status === 'APPROVED') {
    return 'Approved';
  }
  return status?.replace(/_/g, ' ') || 'Approved';
}

function getApprovalLabel(status?: string) {
  if (status === 'COMMITTEE_APPROVED') {
    return 'Committee Approved';
  }
  if (status === 'ADMIN_APPROVED') {
    return 'Admin Approved';
  }
  return '';
}

function getStatusBadgeStyle(status?: string) {
  if (status === 'IN_PROGRESS') {
    return { backgroundColor: '#e5e7eb', color: '#374151' };
  }
  if (status === 'COMPLETED' || status === 'APPROVED') {
    return { backgroundColor: '#111827', color: '#fff' };
  }
  return { backgroundColor: '#f3f4f6', color: '#374151', borderWidth: 1, borderColor: '#d1d5db' };
}

function projectMatchesSearch(project: CommitteeProject, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) {
    return true;
  }
  return (
    getProposalTitle(project).toLowerCase().includes(q) ||
    (project.proposalDescription || '').toLowerCase().includes(q) ||
    (project.projectTitle || '').toLowerCase().includes(q) ||
    getStudentNames(project).toLowerCase().includes(q) ||
    getSupervisorName(project).toLowerCase().includes(q)
  );
}

export function CommitteeProjectsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [projects, setProjects] = useState<CommitteeProject[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [reviewStatusFilter, setReviewStatusFilter] = useState<ReviewStatusFilter>('all');
  const [statusPickerOpen, setStatusPickerOpen] = useState(false);
  const [reviewPickerOpen, setReviewPickerOpen] = useState(false);
  const [reviewProject, setReviewProject] = useState<CommitteeProject | null>(null);

  const loadData = useCallback(async () => {
    try {
      const data = await fetchCommitteeProjects(reviewStatusFilter);
      setProjects(Array.isArray(data) ? data : []);
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [reviewStatusFilter]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesSearch = projectMatchesSearch(project, searchQuery);
      const matchesStatus =
        statusFilter === 'ALL' || project.projectStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [projects, searchQuery, statusFilter]);

  const openProposalFile = async (project: CommitteeProject) => {
    if (!project.fileUrl) {
      return;
    }
    try {
      await openDocumentFromUrl(project.fileUrl, {
        fileName: project.fileName || 'proposal.pdf',
      });
    } catch {
      Toast.show({ type: 'error', text1: 'Could not open file' });
    }
  };

  if (loading) {
    return <LoadingView message="Loading projects..." />;
  }

  return (
    <PortalScreenLayout
      title="All Projects"
      subtitle="Complete list of projects assigned for committee review"
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        loadData();
      }}>
      <View style={styles.searchWrap}>
        <FeatherIcon name="search" size={16} color="#9ca3af" />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search projects..."
          placeholderTextColor="#9ca3af"
          style={styles.searchInput}
        />
      </View>

      <View style={styles.filterRow}>
        <Pressable style={styles.filterChip} onPress={() => setReviewPickerOpen(true)}>
          <Text style={styles.filterText}>
            {REVIEW_STATUS_OPTIONS.find((o) => o.value === reviewStatusFilter)?.label || 'All'}
          </Text>
          <FeatherIcon name="chevron-down" size={14} color="#6b7280" />
        </Pressable>
        <Pressable style={styles.filterChip} onPress={() => setStatusPickerOpen(true)}>
          <Text style={styles.filterText}>
            {statusFilter === 'ALL' ? 'All Status' : getStatusLabel(statusFilter)}
          </Text>
          <FeatherIcon name="chevron-down" size={14} color="#6b7280" />
        </Pressable>
      </View>

      {filteredProjects.length === 0 ? (
        <EmptyState title="No projects" message="No projects match the selected filters" />
      ) : (
        filteredProjects.map((project) => {
          const status = project.projectStatus;
          const badgeStyle = getStatusBadgeStyle(status);
          const approvalLabel = getApprovalLabel(project.status);

          return (
            <View key={project.id} style={styles.card}>
              <Text style={styles.cardTitle}>{getProposalTitle(project)}</Text>
              {project.projectTitle &&
              project.proposalTitle &&
              project.projectTitle !== project.proposalTitle ? (
                <Text style={styles.projectSubtitle}>Project: {project.projectTitle}</Text>
              ) : null}

              <View style={styles.row}>
                <Text style={styles.rowLabel}>Students</Text>
                <Text style={styles.rowValue}>{getStudentNames(project)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Supervisor</Text>
                <Text style={styles.rowValue}>{getSupervisorName(project)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Status</Text>
                <View style={styles.statusWrap}>
                  <View style={[styles.statusBadge, badgeStyle]}>
                    <Text style={[styles.statusBadgeText, { color: badgeStyle.color }]}>
                      {getStatusLabel(status)}
                    </Text>
                  </View>
                  {approvalLabel ? (
                    <Text style={styles.approvalText}>{approvalLabel}</Text>
                  ) : project.status ? (
                    <Text style={styles.approvalText}>
                      {getReviewStatusLabel(project.status)}
                    </Text>
                  ) : null}
                </View>
              </View>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Submitted Date</Text>
                <View>
                  <Text style={styles.rowValue}>
                    {formatDate(project.submittedDate || project.createdAt)}
                  </Text>
                  {project.approvedDate ? (
                    <Text style={styles.approvedDateText}>
                      Approved: {formatDate(project.approvedDate)}
                    </Text>
                  ) : null}
                </View>
              </View>

              <View style={styles.actionsRow}>
                <Pressable style={styles.actionBtn} onPress={() => setReviewProject(project)}>
                  <FeatherIcon name="eye" size={15} color="#374151" />
                  <Text style={styles.actionBtnText}>Review</Text>
                </Pressable>
                {project.fileUrl ? (
                  <Pressable style={styles.actionBtn} onPress={() => openProposalFile(project)}>
                    <FeatherIcon name="download" size={15} color="#374151" />
                  </Pressable>
                ) : null}
              </View>
            </View>
          );
        })
      )}

      <Modal
        visible={reviewPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setReviewPickerOpen(false)}>
        <Pressable style={styles.pickerBackdrop} onPress={() => setReviewPickerOpen(false)}>
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerTitle}>Filter by review status</Text>
            {REVIEW_STATUS_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                style={styles.pickerRow}
                onPress={() => {
                  setReviewStatusFilter(option.value);
                  setReviewPickerOpen(false);
                }}>
                <Text
                  style={[
                    styles.pickerRowText,
                    reviewStatusFilter === option.value && styles.pickerRowTextActive,
                  ]}>
                  {option.label}
                </Text>
                {reviewStatusFilter === option.value ? (
                  <FeatherIcon name="check" size={16} color="#16a34a" />
                ) : null}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={statusPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setStatusPickerOpen(false)}>
        <Pressable style={styles.pickerBackdrop} onPress={() => setStatusPickerOpen(false)}>
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerTitle}>Filter by status</Text>
            {STATUS_OPTIONS.map((option) => (
              <Pressable
                key={option}
                style={styles.pickerRow}
                onPress={() => {
                  setStatusFilter(option);
                  setStatusPickerOpen(false);
                }}>
                <Text
                  style={[
                    styles.pickerRowText,
                    statusFilter === option && styles.pickerRowTextActive,
                  ]}>
                  {option === 'ALL' ? 'All Status' : getStatusLabel(option)}
                </Text>
                {statusFilter === option ? (
                  <FeatherIcon name="check" size={16} color="#16a34a" />
                ) : null}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      <SheetModal
        visible={!!reviewProject}
        onClose={() => setReviewProject(null)}
        title={reviewProject ? getProposalTitle(reviewProject) : 'Project Review'}
        subtitle="Review project details">
        {reviewProject ? (
          <>
            {reviewProject.projectTitle &&
            reviewProject.proposalTitle &&
            reviewProject.projectTitle !== reviewProject.proposalTitle ? (
              <DetailRow icon="folder" label="Project Title" value={reviewProject.projectTitle} />
            ) : null}
            <DetailRow icon="users" label="Students" value={getStudentNames(reviewProject)} />
            <DetailRow
              icon="user-check"
              label="Supervisor"
              value={getSupervisorName(reviewProject)}
            />
            <DetailRow
              icon="activity"
              label="Status"
              value={getStatusLabel(reviewProject.projectStatus)}
            />
            {getApprovalLabel(reviewProject.status) ? (
              <DetailRow
                icon="check-circle"
                label="Approval"
                value={getApprovalLabel(reviewProject.status)}
              />
            ) : null}
            <DetailRow
              icon="calendar"
              label="Submitted Date"
              value={formatDate(reviewProject.submittedDate || reviewProject.createdAt)}
            />
            {reviewProject.approvedDate ? (
              <DetailRow
                icon="calendar"
                label="Approved Date"
                value={formatDate(reviewProject.approvedDate)}
              />
            ) : null}
            {reviewProject.proposalDescription || reviewProject.projectDescription ? (
              <DetailRow
                icon="align-left"
                label="Description"
                value={
                  reviewProject.proposalDescription ||
                  reviewProject.projectDescription ||
                  ''
                }
              />
            ) : null}
            {reviewProject.fileUrl ? (
              <Pressable
                style={styles.downloadLinkBtn}
                onPress={() => openProposalFile(reviewProject)}>
                <FeatherIcon name="download" size={16} color="#2563eb" />
                <Text style={styles.downloadLinkText}>
                  {reviewProject.fileName || 'Download proposal file'}
                </Text>
              </Pressable>
            ) : null}
          </>
        ) : null}
      </SheetModal>
    </PortalScreenLayout>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
    paddingVertical: 11,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  filterChip: {
    flex: 1,
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
    fontSize: 13,
    color: '#374151',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 14,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  projectSubtitle: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 10,
  },
  rowLabel: {
    width: 96,
    fontSize: 11,
    fontWeight: '600',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    paddingTop: 2,
  },
  rowValue: {
    flex: 1,
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
  statusWrap: {
    flex: 1,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  approvalText: {
    marginTop: 4,
    fontSize: 11,
    color: '#6b7280',
  },
  approvedDateText: {
    marginTop: 2,
    fontSize: 11,
    color: '#9ca3af',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 20,
  },
  pickerSheet: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    maxHeight: '70%',
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  pickerRowText: {
    fontSize: 14,
    color: '#374151',
  },
  pickerRowTextActive: {
    color: '#16a34a',
    fontWeight: '700',
  },
  downloadLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
  },
  downloadLinkText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#2563eb',
  },
});
