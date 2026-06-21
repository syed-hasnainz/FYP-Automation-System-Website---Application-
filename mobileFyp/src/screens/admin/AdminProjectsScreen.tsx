import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
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
import { DetailRow, SheetModal } from '../../components/portal/SheetModal';
import { PortalScreenLayout } from '../../components/portal/PortalScreenLayout';
import { fetchStudentProjects, type ReviewProject } from '../../services/adminService';

const STATUS_OPTIONS = [
  'ALL',
  'PROPOSED',
  'APPROVED',
  'IN_PROGRESS',
  'FYP_I',
  'FYP_II',
  'COMPLETED',
] as const;

function formatDate(dateValue?: string) {
  if (!dateValue) return 'N/A';
  const parsed = new Date(dateValue);
  return Number.isNaN(parsed.getTime()) ? 'N/A' : parsed.toLocaleDateString();
}

function getProjectTitle(project: ReviewProject) {
  return project.proposalTitle || project.title || project.projectTitle || 'Untitled';
}

function getSupervisorName(project: ReviewProject) {
  if (typeof project.supervisor === 'string') return project.supervisor;
  return project.supervisor?.name || project.teacher?.name || 'No supervisor';
}

function getStudentNames(project: ReviewProject) {
  if (project.group?.members?.length) {
    return project.group.members
      .map((m) => m.user?.name || m.name)
      .filter(Boolean)
      .join(', ');
  }
  return project.studentNames || 'No students';
}

function getStatusLabel(status?: string) {
  if (status === 'FYP_I') return 'FYP I';
  if (status === 'FYP_II') return 'FYP II';
  if (status === 'IN_PROGRESS') return 'In Progress';
  if (status === 'COMPLETED') return 'Completed';
  if (status === 'PROPOSED') return 'Proposed';
  if (status === 'APPROVED') return 'Approved';
  return status?.replace(/_/g, ' ') || 'Approved';
}

function getWeeklyReportsLabel(project: ReviewProject) {
  const count = project.weeklyReports?.length || 0;
  if (count === 0) return 'No reports yet';
  const latest = project.weeklyReports?.[0];
  const week = latest?.week || 'N/A';
  return `${count} Report${count !== 1 ? 's' : ''} · Latest: Week ${week}`;
}

export function AdminProjectsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [projects, setProjects] = useState<ReviewProject[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] =
    useState<(typeof STATUS_OPTIONS)[number]>('ALL');
  const [statusPickerOpen, setStatusPickerOpen] = useState(false);
  const [viewProject, setViewProject] = useState<ReviewProject | null>(null);

  const loadData = useCallback(async () => {
    try {
      const data = await fetchStudentProjects();
      setProjects(Array.isArray(data) ? data : []);
    } catch {
      Alert.alert(
        'Load failed',
        'Could not load projects. Check your internet connection and try again.',
      );
      setProjects([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredProjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return projects.filter((project) => {
      const title = getProjectTitle(project).toLowerCase();
      const desc = (project.description || project.proposalDescription || '').toLowerCase();
      const matchesSearch =
        !q ||
        title.includes(q) ||
        desc.includes(q) ||
        getStudentNames(project).toLowerCase().includes(q);
      const status = project.projectStatus || project.status || '';
      const matchesStatus = statusFilter === 'ALL' || status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [projects, searchQuery, statusFilter]);

  if (loading) {
    return <LoadingView message="Loading projects..." />;
  }

  return (
    <PortalScreenLayout
      title="Review Projects"
      subtitle="Projects taken by students"
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

      <Pressable style={styles.filterChip} onPress={() => setStatusPickerOpen(true)}>
        <Text style={styles.filterText}>
          {statusFilter === 'ALL' ? 'All Status' : getStatusLabel(statusFilter)}
        </Text>
        <FeatherIcon name="chevron-down" size={14} color="#6b7280" />
      </Pressable>

      {filteredProjects.length === 0 ? (
        <EmptyState title="No projects" message="No approved projects found." />
      ) : (
        filteredProjects.map((project) => {
          const status = project.projectStatus || project.status;
          return (
            <View key={project.id} style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle}>{getProjectTitle(project)}</Text>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusBadgeText}>{getStatusLabel(status)}</Text>
                </View>
              </View>
              <Text style={styles.meta}>Students: {getStudentNames(project)}</Text>
              <Text style={styles.meta}>Supervisor: {getSupervisorName(project)}</Text>
              <Text style={styles.meta}>{getWeeklyReportsLabel(project)}</Text>
              <Text style={styles.meta}>
                Submitted: {formatDate(project.submittedDate || project.createdAt)}
              </Text>
              {project.approvedDate ? (
                <Text style={styles.metaSub}>
                  Approved: {formatDate(project.approvedDate)}
                </Text>
              ) : null}
              <Pressable style={styles.viewBtn} onPress={() => setViewProject(project)}>
                <FeatherIcon name="eye" size={16} color="#2563eb" />
                <Text style={styles.viewBtnText}>View</Text>
              </Pressable>
            </View>
          );
        })
      )}

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
        visible={!!viewProject}
        onClose={() => setViewProject(null)}
        title={viewProject ? getProjectTitle(viewProject) : 'Project Details'}
        subtitle="Review project information">
        {viewProject ? (
          <>
            <DetailRow icon="users" label="Students" value={getStudentNames(viewProject)} />
            <DetailRow
              icon="user-check"
              label="Supervisor"
              value={getSupervisorName(viewProject)}
            />
            <DetailRow
              icon="activity"
              label="Status"
              value={getStatusLabel(viewProject.projectStatus || viewProject.status)}
            />
            <DetailRow
              icon="file-text"
              label="Weekly Reports"
              value={getWeeklyReportsLabel(viewProject)}
            />
            <DetailRow
              icon="calendar"
              label="Submitted Date"
              value={formatDate(viewProject.submittedDate || viewProject.createdAt)}
            />
            {viewProject.approvedDate ? (
              <DetailRow
                icon="check-circle"
                label="Approved Date"
                value={formatDate(viewProject.approvedDate)}
              />
            ) : null}
            {viewProject.description || viewProject.proposalDescription ? (
              <DetailRow
                icon="align-left"
                label="Description"
                value={viewProject.description || viewProject.proposalDescription || ''}
              />
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
  searchInput: { flex: 1, fontSize: 13, color: '#111827', paddingVertical: 11 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 14,
    backgroundColor: '#fff',
  },
  filterText: { fontSize: 13, color: '#374151' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 14,
    marginBottom: 10,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: '#111827' },
  statusBadge: {
    backgroundColor: '#111827',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  meta: { fontSize: 12, color: '#4b5563', marginBottom: 4 },
  metaSub: { fontSize: 11, color: '#9ca3af', marginBottom: 8 },
  viewBtn: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingVertical: 9,
    backgroundColor: '#f9fafb',
  },
  viewBtnText: { fontSize: 13, fontWeight: '600', color: '#2563eb' },
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
  pickerTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 10 },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  pickerRowText: { fontSize: 14, color: '#374151' },
  pickerRowTextActive: { color: '#16a34a', fontWeight: '700' },
});
