import React, { useCallback, useState } from 'react';
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
import { EmptyState } from '../../components/portal/EmptyState';
import { LoadingView } from '../../components/portal/LoadingView';
import { PortalScreenLayout } from '../../components/portal/PortalScreenLayout';
import { DetailRow, SheetModal, sheetStyles } from '../../components/portal/SheetModal';
import { useAuthUser } from '../../hooks/useAuthUser';
import {
  createTeacherProject,
  deleteTeacherProject,
  fetchMyTeacherProjects,
  updateTeacherProject,
  type ProjectFormData,
  type TeacherProject,
} from '../../services/teacherService';

const EMPTY_FORM: ProjectFormData = {
  title: '',
  description: '',
  requirements: '',
};

function getStatusStyle(status?: string) {
  switch (status) {
    case 'COMPLETED':
      return { backgroundColor: '#22c55e', color: '#fff', label: 'Completed' };
    case 'IN_PROGRESS':
      return { backgroundColor: '#e5e7eb', color: '#374151', label: 'In Progress' };
    case 'APPROVED':
      return { backgroundColor: '#3b82f6', color: '#fff', label: 'Approved' };
    case 'PROPOSED':
    default:
      return {
        backgroundColor: '#f3f4f6',
        color: '#374151',
        label: status === 'PROPOSED' ? 'Proposed' : status ?? 'Proposed',
      };
  }
}

function ProjectFormFields({
  form,
  onChange,
}: {
  form: ProjectFormData;
  onChange: (next: ProjectFormData) => void;
}) {
  return (
    <>
      <Text style={styles.fieldLabel}>Project Title *</Text>
      <TextInput
        style={styles.input}
        value={form.title}
        onChangeText={(title) => onChange({ ...form, title })}
        placeholder="Enter project title"
        placeholderTextColor="#9ca3af"
      />

      <Text style={styles.fieldLabel}>Description</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={form.description}
        onChangeText={(description) => onChange({ ...form, description })}
        placeholder="Describe the project"
        placeholderTextColor="#9ca3af"
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />

      <Text style={styles.fieldLabel}>Requirements</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={form.requirements}
        onChangeText={(requirements) => onChange({ ...form, requirements })}
        placeholder="List project requirements"
        placeholderTextColor="#9ca3af"
        multiline
        numberOfLines={3}
        textAlignVertical="top"
      />
    </>
  );
}

export function TeacherProjectsScreen() {
  const { user } = useAuthUser();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [projects, setProjects] = useState<TeacherProject[]>([]);
  const [form, setForm] = useState<ProjectFormData>(EMPTY_FORM);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [viewProject, setViewProject] = useState<TeacherProject | null>(null);
  const [deleteProject, setDeleteProject] = useState<TeacherProject | null>(null);
  const [selectedProject, setSelectedProject] = useState<TeacherProject | null>(null);

  const loadData = useCallback(async () => {
    if (!user?.id) {
      setProjects([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const data = await fetchMyTeacherProjects(user.id);
      setProjects(data);
    } catch {
      setProjects([]);
      Toast.show({ type: 'error', text1: 'Failed to load projects' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setAddOpen(true);
  };

  const openEdit = (project: TeacherProject) => {
    setSelectedProject(project);
    setForm({
      title: project.title ?? '',
      description: project.description ?? '',
      requirements: project.requirements ?? '',
    });
    setEditOpen(true);
  };

  const handleCreate = async () => {
    if (!user?.id) {
      return;
    }
    if (!form.title.trim()) {
      Toast.show({ type: 'error', text1: 'Project title is required' });
      return;
    }

    setSaving(true);
    try {
      await createTeacherProject(user.id, {
        title: form.title.trim(),
        description: form.description.trim(),
        requirements: form.requirements.trim(),
      });
      Toast.show({ type: 'success', text1: 'Project created successfully' });
      setAddOpen(false);
      setForm(EMPTY_FORM);
      await loadData();
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to create project' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedProject?.id) {
      return;
    }
    if (!form.title.trim()) {
      Toast.show({ type: 'error', text1: 'Project title is required' });
      return;
    }

    setSaving(true);
    try {
      await updateTeacherProject(selectedProject.id, {
        title: form.title.trim(),
        description: form.description.trim(),
        requirements: form.requirements.trim(),
      });
      Toast.show({ type: 'success', text1: 'Project updated successfully' });
      setEditOpen(false);
      setSelectedProject(null);
      setForm(EMPTY_FORM);
      await loadData();
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to update project' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteProject?.id) {
      return;
    }

    setSaving(true);
    try {
      await deleteTeacherProject(deleteProject.id);
      Toast.show({ type: 'success', text1: 'Project deleted successfully' });
      setDeleteProject(null);
      await loadData();
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to delete project' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingView message="Loading projects..." />;
  }

  return (
    <PortalScreenLayout
      title="My Projects"
      subtitle="Manage your posted FYP ideas"
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        loadData();
      }}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>My Projects</Text>
        <Pressable style={styles.addBtn} onPress={openAdd}>
          <FeatherIcon name="plus" size={16} color="#fff" />
          <Text style={styles.addBtnText}>Add Project</Text>
        </Pressable>
      </View>

      {projects.length === 0 ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            icon="book-open"
            title="No Projects Yet"
            message="Create your first project to get started"
          />
          <Pressable style={styles.emptyCreateBtn} onPress={openAdd}>
            <FeatherIcon name="plus" size={16} color="#fff" />
            <Text style={styles.emptyCreateBtnText}>Create Project</Text>
          </Pressable>
        </View>
      ) : (
        projects.map((project) => {
          const statusStyle = getStatusStyle(project.status);
          const submissionCount = project.submissions?.length ?? 0;
          const memberNames =
            project.group?.members
              ?.map((member) => member.user?.name)
              .filter(Boolean)
              .slice(0, 3) ?? [];

          return (
            <View key={project.id} style={styles.card}>
              <View style={[styles.statusBadge, { backgroundColor: statusStyle.backgroundColor }]}>
                <Text style={[styles.statusBadgeText, { color: statusStyle.color }]}>
                  {statusStyle.label}
                </Text>
              </View>

              <Text style={styles.cardTitle}>{project.title}</Text>
              {project.description ? (
                <Text style={styles.cardDesc} numberOfLines={3}>
                  {project.description}
                </Text>
              ) : null}

              {memberNames.length > 0 ? (
                <View style={styles.membersRow}>
                  {memberNames.map((name) => (
                    <View key={`${project.id}-${name}`} style={styles.memberBadge}>
                      <Text style={styles.memberBadgeText}>{name}</Text>
                    </View>
                  ))}
                  {(project.group?.members?.length ?? 0) > 3 ? (
                    <View style={styles.memberBadge}>
                      <Text style={styles.memberBadgeText}>
                        +{(project.group?.members?.length ?? 0) - 3} more
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : null}

              <View style={styles.cardFooter}>
                <Text style={styles.submissionText}>
                  {submissionCount} {submissionCount === 1 ? 'submission' : 'submissions'}
                </Text>
                <View style={styles.iconActions}>
                  <Pressable
                    style={styles.iconBtn}
                    onPress={() => setViewProject(project)}>
                    <FeatherIcon name="eye" size={16} color="#374151" />
                  </Pressable>
                  <Pressable style={styles.iconBtn} onPress={() => openEdit(project)}>
                    <FeatherIcon name="edit-2" size={16} color="#374151" />
                  </Pressable>
                  <Pressable
                    style={styles.iconBtn}
                    onPress={() => setDeleteProject(project)}>
                    <FeatherIcon name="trash-2" size={16} color="#374151" />
                  </Pressable>
                </View>
              </View>
            </View>
          );
        })
      )}

      <SheetModal
        visible={addOpen}
        onClose={() => !saving && setAddOpen(false)}
        title="Add New Project"
        subtitle="Create a new project for students to work on"
        footer={
          <View style={sheetStyles.footerRow}>
            <Pressable
              style={[sheetStyles.footerBtn, sheetStyles.footerBtnCancel]}
              disabled={saving}
              onPress={() => setAddOpen(false)}>
              <Text style={sheetStyles.footerBtnCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[sheetStyles.footerBtn, styles.primaryBtn]}
              disabled={saving}
              onPress={handleCreate}>
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={sheetStyles.footerBtnPrimaryText}>Create Project</Text>
              )}
            </Pressable>
          </View>
        }>
        <ProjectFormFields form={form} onChange={setForm} />
      </SheetModal>

      <SheetModal
        visible={editOpen}
        onClose={() => !saving && setEditOpen(false)}
        title="Edit Project"
        subtitle="Update project information"
        footer={
          <View style={sheetStyles.footerRow}>
            <Pressable
              style={[sheetStyles.footerBtn, sheetStyles.footerBtnCancel]}
              disabled={saving}
              onPress={() => setEditOpen(false)}>
              <Text style={sheetStyles.footerBtnCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[sheetStyles.footerBtn, styles.primaryBtn]}
              disabled={saving}
              onPress={handleUpdate}>
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={sheetStyles.footerBtnPrimaryText}>Update Project</Text>
              )}
            </Pressable>
          </View>
        }>
        <ProjectFormFields form={form} onChange={setForm} />
      </SheetModal>

      <SheetModal
        visible={!!viewProject}
        onClose={() => setViewProject(null)}
        title={viewProject?.title ?? 'Project Details'}
        subtitle="Project Details"
        footer={
          viewProject ? (
            <View style={sheetStyles.footerRow}>
              <Pressable
                style={[sheetStyles.footerBtn, sheetStyles.footerBtnCancel]}
                onPress={() => setViewProject(null)}>
                <Text style={sheetStyles.footerBtnCancelText}>Close</Text>
              </Pressable>
              <Pressable
                style={[sheetStyles.footerBtn, styles.primaryBtn]}
                onPress={() => {
                  const project = viewProject;
                  setViewProject(null);
                  if (project) {
                    openEdit(project);
                  }
                }}>
                <Text style={sheetStyles.footerBtnPrimaryText}>Edit</Text>
              </Pressable>
            </View>
          ) : null
        }>
        {viewProject ? (
          <>
            <Text style={styles.modalSectionTitle}>Description</Text>
            <Text style={styles.modalBodyText}>
              {viewProject.description?.trim() || 'No description provided'}
            </Text>

            <Text style={styles.modalSectionTitle}>Requirements</Text>
            <Text style={styles.modalBodyText}>
              {viewProject.requirements?.trim() || 'No requirements specified'}
            </Text>

            <DetailRow
              icon="flag"
              label="Status"
              value={getStatusStyle(viewProject.status).label}
            />
            {viewProject.teacher?.name ? (
              <DetailRow
                icon="user"
                label="Teacher"
                value={
                  viewProject.teacher.department
                    ? `${viewProject.teacher.name} - ${viewProject.teacher.department}`
                    : viewProject.teacher.name
                }
              />
            ) : null}
            <DetailRow
              icon="file-text"
              label="Submissions"
              value={`${viewProject.submissions?.length ?? 0} submission(s)`}
            />
          </>
        ) : null}
      </SheetModal>

      <SheetModal
        visible={!!deleteProject}
        onClose={() => !saving && setDeleteProject(null)}
        title="Delete Project"
        subtitle="This action cannot be undone"
        footer={
          <View style={sheetStyles.footerRow}>
            <Pressable
              style={[sheetStyles.footerBtn, sheetStyles.footerBtnCancel]}
              disabled={saving}
              onPress={() => setDeleteProject(null)}>
              <Text style={sheetStyles.footerBtnCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[sheetStyles.footerBtn, sheetStyles.footerBtnDanger]}
              disabled={saving}
              onPress={handleDeleteConfirm}>
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={sheetStyles.footerBtnDangerText}>Delete</Text>
              )}
            </Pressable>
          </View>
        }>
        <View style={sheetStyles.confirmIconWrap}>
          <FeatherIcon name="trash-2" size={28} color="#dc2626" />
        </View>
        <Text style={sheetStyles.confirmMessage}>
          Are you sure you want to delete this project? This action cannot be undone.
        </Text>
        {deleteProject ? (
          <Text style={sheetStyles.confirmHighlight}>{deleteProject.title}</Text>
        ) : null}
      </SheetModal>
    </PortalScreenLayout>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyWrap: {
    alignItems: 'center',
  },
  emptyCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 8,
  },
  emptyCreateBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 10,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  cardDesc: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    marginBottom: 10,
  },
  membersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  memberBadge: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  memberBadgeText: {
    fontSize: 11,
    color: '#374151',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
  },
  submissionText: {
    fontSize: 12,
    color: '#6b7280',
  },
  iconActions: {
    flexDirection: 'row',
    gap: 6,
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
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    marginTop: 4,
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
    marginBottom: 12,
  },
  textArea: {
    minHeight: 96,
  },
  primaryBtn: {
    backgroundColor: '#2563eb',
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    marginTop: 4,
  },
  modalBodyText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 21,
    marginBottom: 12,
  },
});
