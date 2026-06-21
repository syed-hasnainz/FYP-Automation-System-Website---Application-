import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import { SheetModal, sheetStyles } from '../../components/portal/SheetModal';
import { PortalScreenLayout } from '../../components/portal/PortalScreenLayout';
import {
  TagInput,
  departmentsStringToTags,
  tagsToDepartmentsString,
} from '../../components/common/TagInput';
import { parseDepartments } from '../../components/common/FacultyDropdown';
import {
  createCommittee,
  createFaculty,
  deleteCommittee,
  deleteFaculty,
  fetchAllUsers,
  fetchCommittees,
  fetchFaculties,
  updateCommittee,
  updateFaculty,
  type AdminCommittee,
  type AdminFaculty,
  type AdminUser,
} from '../../services/adminService';

function formatDate(dateValue?: string) {
  if (!dateValue) return 'N/A';
  const parsed = new Date(dateValue);
  return Number.isNaN(parsed.getTime()) ? 'N/A' : parsed.toLocaleDateString();
}

function getCommitteeMemberNames(committee: AdminCommittee) {
  if (!committee.members?.length) return 'No members';
  return committee.members
    .map((m) => (typeof m === 'string' ? m : m.name))
    .filter(Boolean)
    .join(', ');
}

export function AdminOrganizationScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [faculties, setFaculties] = useState<AdminFaculty[]>([]);
  const [committees, setCommittees] = useState<AdminCommittee[]>([]);
  const [committeeHeads, setCommitteeHeads] = useState<AdminUser[]>([]);
  const [teachers, setTeachers] = useState<AdminUser[]>([]);

  const [facultyFormOpen, setFacultyFormOpen] = useState(false);
  const [facultyEditTarget, setFacultyEditTarget] = useState<AdminFaculty | null>(null);
  const [facultyDeleteTarget, setFacultyDeleteTarget] = useState<AdminFaculty | null>(null);
  const [facultyForm, setFacultyForm] = useState({
    name: '',
    code: '',
    description: '',
  });
  const [departmentTags, setDepartmentTags] = useState<string[]>([]);

  const [committeeFormOpen, setCommitteeFormOpen] = useState(false);
  const [committeeEditTarget, setCommitteeEditTarget] = useState<AdminCommittee | null>(null);
  const [committeeDeleteTarget, setCommitteeDeleteTarget] = useState<AdminCommittee | null>(null);
  const [headPickerOpen, setHeadPickerOpen] = useState(false);
  const [committeeForm, setCommitteeForm] = useState({
    name: '',
    description: '',
    headId: '',
    headName: '',
    memberIds: [] as string[],
  });

  const loadData = useCallback(async () => {
    try {
      const [facultyData, committeeData, users] = await Promise.all([
        fetchFaculties().catch(() => []),
        fetchCommittees().catch(() => []),
        fetchAllUsers().catch(() => []),
      ]);
      setFaculties(Array.isArray(facultyData) ? facultyData : []);
      setCommittees(Array.isArray(committeeData) ? committeeData : []);
      const userList = Array.isArray(users) ? users : [];
      setCommitteeHeads(
        userList.filter((u) => u.role === 'COMMITTEE_HEAD' && u.status === 'APPROVED'),
      );
      setTeachers(userList.filter((u) => u.role === 'TEACHER' && u.status === 'APPROVED'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const resetFacultyForm = () => {
    setFacultyForm({ name: '', code: '', description: '' });
    setDepartmentTags([]);
    setFacultyEditTarget(null);
  };

  const resetCommitteeForm = () => {
    setCommitteeForm({
      name: '',
      description: '',
      headId: '',
      headName: '',
      memberIds: [],
    });
    setCommitteeEditTarget(null);
  };

  const openEditFaculty = (faculty: AdminFaculty) => {
    setFacultyEditTarget(faculty);
    setFacultyForm({
      name: faculty.name,
      code: faculty.code || '',
      description: faculty.description || '',
    });
    setDepartmentTags(departmentsStringToTags(faculty.departments));
    setFacultyFormOpen(true);
  };

  const openEditCommittee = (committee: AdminCommittee) => {
    const memberIds =
      committee.memberIds ||
      (committee.members || [])
        .map((m) => (typeof m === 'string' ? null : m.id))
        .filter((id): id is string => !!id);
    setCommitteeEditTarget(committee);
    setCommitteeForm({
      name: committee.name,
      description: committee.description || '',
      headId: committee.headId || '',
      headName: committee.head || '',
      memberIds,
    });
    setCommitteeFormOpen(true);
  };

  const handleSaveFaculty = async () => {
    if (!facultyForm.name.trim()) {
      Alert.alert('Required', 'Faculty name is required.');
      return;
    }
    if (departmentTags.length === 0) {
      Alert.alert('Required', 'Add at least one department for this faculty.');
      return;
    }
    setActionLoading(true);
    try {
      const payload = {
        name: facultyForm.name.trim(),
        code: facultyForm.code.trim() || undefined,
        description: facultyForm.description.trim() || undefined,
        departments: tagsToDepartmentsString(departmentTags),
      };
      if (facultyEditTarget) {
        await updateFaculty(facultyEditTarget.id, payload);
      } else {
        await createFaculty(payload);
      }
      setFacultyFormOpen(false);
      resetFacultyForm();
      await loadData();
    } catch {
      Alert.alert('Error', 'Failed to save faculty.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveCommittee = async () => {
    if (!committeeForm.name.trim() || !committeeForm.headId) {
      Alert.alert('Required', 'Committee name and head are required.');
      return;
    }
    setActionLoading(true);
    try {
      const payload = {
        name: committeeForm.name.trim(),
        description: committeeForm.description.trim() || undefined,
        headId: committeeForm.headId,
        head: committeeForm.headName,
        memberIds: committeeForm.memberIds,
        members: teachers
          .filter((t) => committeeForm.memberIds.includes(t.id))
          .map((t) => t.name),
      };
      if (committeeEditTarget) {
        await updateCommittee(committeeEditTarget.id, payload);
      } else {
        await createCommittee(payload);
      }
      setCommitteeFormOpen(false);
      resetCommitteeForm();
      await loadData();
    } catch {
      Alert.alert('Error', 'Failed to save committee.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmDeleteFaculty = async () => {
    if (!facultyDeleteTarget) return;
    setActionLoading(true);
    try {
      await deleteFaculty(facultyDeleteTarget.id);
      setFacultyDeleteTarget(null);
      await loadData();
    } catch {
      Alert.alert('Error', 'Failed to delete faculty.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmDeleteCommittee = async () => {
    if (!committeeDeleteTarget) return;
    setActionLoading(true);
    try {
      await deleteCommittee(committeeDeleteTarget.id);
      setCommitteeDeleteTarget(null);
      await loadData();
    } catch {
      Alert.alert('Error', 'Failed to delete committee.');
    } finally {
      setActionLoading(false);
    }
  };

  const toggleCommitteeMember = (teacherId: string) => {
    setCommitteeForm((prev) => ({
      ...prev,
      memberIds: prev.memberIds.includes(teacherId)
        ? prev.memberIds.filter((id) => id !== teacherId)
        : [...prev.memberIds, teacherId],
    }));
  };

  const teacherOptions = useMemo(() => teachers, [teachers]);

  if (loading) {
    return <LoadingView message="Loading organization..." />;
  }

  return (
    <PortalScreenLayout
      title="Organization"
      subtitle="Faculties & committees"
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        loadData();
      }}>
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Faculty Management</Text>
            <Text style={styles.sectionSub}>Manage university faculties and departments</Text>
          </View>
          <Pressable
            style={styles.addBtn}
            onPress={() => {
              resetFacultyForm();
              setFacultyFormOpen(true);
            }}>
            <FeatherIcon name="plus" size={14} color="#fff" />
            <Text style={styles.addBtnText}>Add Faculty</Text>
          </Pressable>
        </View>

        {faculties.length === 0 ? (
          <Text style={styles.emptyInline}>No faculties found. Add one to get started.</Text>
        ) : (
          faculties.map((faculty) => (
            <View key={faculty.id} style={styles.itemCard}>
              <View style={styles.itemTop}>
                <Text style={styles.itemTitle}>{faculty.name}</Text>
                <View
                  style={[
                    styles.statusPill,
                    faculty.isActive !== false ? styles.activePill : styles.inactivePill,
                  ]}>
                  <Text style={styles.statusPillText}>
                    {faculty.isActive !== false ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </View>
              <Text style={styles.itemMeta}>Code: {faculty.code || 'N/A'}</Text>
              <Text style={styles.itemMeta} numberOfLines={2}>
                {faculty.description || 'No description'}
              </Text>
              {parseDepartments(faculty.departments).length > 0 ? (
                <View style={styles.deptTagRow}>
                  {parseDepartments(faculty.departments).map(dept => (
                    <View key={dept} style={styles.deptTag}>
                      <Text style={styles.deptTagText}>{dept}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
              <View style={styles.itemActions}>
                <Pressable style={styles.iconBtn} onPress={() => openEditFaculty(faculty)}>
                  <FeatherIcon name="edit-2" size={16} color="#2563eb" />
                </Pressable>
                <Pressable
                  style={styles.iconBtnDanger}
                  onPress={() => setFacultyDeleteTarget(faculty)}>
                  <FeatherIcon name="trash-2" size={16} color="#dc2626" />
                </Pressable>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Committee Management</Text>
            <Text style={styles.sectionSub}>Manage FYP committees and their members</Text>
          </View>
          <Pressable
            style={styles.addBtn}
            onPress={() => {
              resetCommitteeForm();
              setCommitteeFormOpen(true);
            }}>
            <FeatherIcon name="plus" size={14} color="#fff" />
            <Text style={styles.addBtnText}>Create Committee</Text>
          </Pressable>
        </View>

        {committees.length === 0 ? (
          <EmptyState title="No committees" message="Create a committee to get started." />
        ) : (
          committees.map((committee) => (
            <View key={committee.id} style={styles.itemCard}>
              <Text style={styles.itemTitle}>{committee.name}</Text>
              <Text style={styles.itemMeta}>Head: {committee.head || 'Not assigned'}</Text>
              <Text style={styles.itemMeta} numberOfLines={2}>
                Members: {getCommitteeMemberNames(committee)}
              </Text>
              <View style={styles.itemTop}>
                <View
                  style={[
                    styles.statusPill,
                    committee.status === 'Active' ? styles.activePill : styles.inactivePill,
                  ]}>
                  <Text style={styles.statusPillText}>{committee.status || 'Active'}</Text>
                </View>
                <Text style={styles.itemMeta}>Created: {formatDate(committee.created)}</Text>
              </View>
              <View style={styles.itemActions}>
                <Pressable style={styles.iconBtn} onPress={() => openEditCommittee(committee)}>
                  <FeatherIcon name="edit-2" size={16} color="#2563eb" />
                </Pressable>
                <Pressable
                  style={styles.iconBtnDanger}
                  onPress={() => setCommitteeDeleteTarget(committee)}>
                  <FeatherIcon name="trash-2" size={16} color="#dc2626" />
                </Pressable>
              </View>
            </View>
          ))
        )}
      </View>

      <SheetModal
        visible={facultyFormOpen}
        onClose={() => {
          setFacultyFormOpen(false);
          resetFacultyForm();
        }}
        title={facultyEditTarget ? 'Edit Faculty' : 'Add Faculty'}
        subtitle="Faculty information"
        footer={
          <View style={sheetStyles.footerRow}>
            <Pressable
              style={[sheetStyles.footerBtn, sheetStyles.footerBtnCancel]}
              onPress={() => {
                setFacultyFormOpen(false);
                resetFacultyForm();
              }}>
              <Text style={sheetStyles.footerBtnCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[sheetStyles.footerBtn, sheetStyles.footerBtnPrimary]}
              onPress={handleSaveFaculty}
              disabled={actionLoading}>
              {actionLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={sheetStyles.footerBtnPrimaryText}>
                  {facultyEditTarget ? 'Save' : 'Add Faculty'}
                </Text>
              )}
            </Pressable>
          </View>
        }>
        <TextInput
          style={styles.input}
          placeholder="Faculty name *"
          placeholderTextColor="#9ca3af"
          value={facultyForm.name}
          onChangeText={(v) => setFacultyForm((p) => ({ ...p, name: v }))}
        />
        <TextInput
          style={styles.input}
          placeholder="Faculty code"
          placeholderTextColor="#9ca3af"
          value={facultyForm.code}
          onChangeText={(v) => setFacultyForm((p) => ({ ...p, code: v }))}
        />
        <TagInput
          tags={departmentTags}
          onChangeTags={setDepartmentTags}
          placeholder="e.g. Computer Science"
          disabled={actionLoading}
        />
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Description"
          placeholderTextColor="#9ca3af"
          multiline
          value={facultyForm.description}
          onChangeText={(v) => setFacultyForm((p) => ({ ...p, description: v }))}
        />
      </SheetModal>

      <SheetModal
        visible={committeeFormOpen}
        onClose={() => {
          setCommitteeFormOpen(false);
          resetCommitteeForm();
        }}
        title={committeeEditTarget ? 'Edit Committee' : 'Create Committee'}
        subtitle="Committee details and members"
        footer={
          <View style={sheetStyles.footerRow}>
            <Pressable
              style={[sheetStyles.footerBtn, sheetStyles.footerBtnCancel]}
              onPress={() => {
                setCommitteeFormOpen(false);
                resetCommitteeForm();
              }}>
              <Text style={sheetStyles.footerBtnCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[sheetStyles.footerBtn, sheetStyles.footerBtnPrimary]}
              onPress={handleSaveCommittee}
              disabled={actionLoading}>
              {actionLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={sheetStyles.footerBtnPrimaryText}>
                  {committeeEditTarget ? 'Save' : 'Create'}
                </Text>
              )}
            </Pressable>
          </View>
        }>
        <TextInput
          style={styles.input}
          placeholder="Committee name *"
          placeholderTextColor="#9ca3af"
          value={committeeForm.name}
          onChangeText={(v) => setCommitteeForm((p) => ({ ...p, name: v }))}
        />
        <Pressable style={styles.selectField} onPress={() => setHeadPickerOpen(true)}>
          <Text style={styles.selectLabel}>Committee Head *</Text>
          <Text style={styles.selectValue}>
            {committeeForm.headName || 'Select committee head'}
          </Text>
        </Pressable>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Description (optional)"
          placeholderTextColor="#9ca3af"
          multiline
          value={committeeForm.description}
          onChangeText={(v) => setCommitteeForm((p) => ({ ...p, description: v }))}
        />
        <Text style={styles.membersLabel}>Members (Teachers)</Text>
        <View style={styles.memberList}>
          {teacherOptions.map((teacher) => {
            const selected = committeeForm.memberIds.includes(teacher.id);
            return (
              <Pressable
                key={teacher.id}
                style={[styles.memberRow, selected && styles.memberRowActive]}
                onPress={() => toggleCommitteeMember(teacher.id)}>
                <Text style={styles.memberName}>{teacher.name}</Text>
                <Text style={styles.memberEmail}>{teacher.email}</Text>
              </Pressable>
            );
          })}
        </View>
      </SheetModal>

      <Modal visible={headPickerOpen} transparent animationType="fade">
        <Pressable style={styles.pickerBackdrop} onPress={() => setHeadPickerOpen(false)}>
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerTitle}>Select Committee Head</Text>
            {committeeHeads.map((head) => (
              <Pressable
                key={head.id}
                style={styles.pickerRow}
                onPress={() => {
                  setCommitteeForm((p) => ({
                    ...p,
                    headId: head.id,
                    headName: head.name,
                  }));
                  setHeadPickerOpen(false);
                }}>
                <Text style={styles.pickerRowText}>{head.name}</Text>
                <Text style={styles.memberEmail}>{head.email}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      <SheetModal
        visible={!!facultyDeleteTarget}
        onClose={() => setFacultyDeleteTarget(null)}
        title="Delete Faculty"
        footer={
          <View style={sheetStyles.footerRow}>
            <Pressable
              style={[sheetStyles.footerBtn, sheetStyles.footerBtnCancel]}
              onPress={() => setFacultyDeleteTarget(null)}>
              <Text style={sheetStyles.footerBtnCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[sheetStyles.footerBtn, sheetStyles.footerBtnDanger]}
              onPress={handleConfirmDeleteFaculty}
              disabled={actionLoading}>
              {actionLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={sheetStyles.footerBtnDangerText}>Delete</Text>
              )}
            </Pressable>
          </View>
        }>
        <View style={sheetStyles.confirmIconWrap}>
          <FeatherIcon name="trash-2" size={26} color="#dc2626" />
        </View>
        <Text style={sheetStyles.confirmMessage}>
          This will permanently remove the faculty and associated data.
        </Text>
        <Text style={sheetStyles.confirmHighlight}>{facultyDeleteTarget?.name}</Text>
      </SheetModal>

      <SheetModal
        visible={!!committeeDeleteTarget}
        onClose={() => setCommitteeDeleteTarget(null)}
        title="Delete Committee"
        footer={
          <View style={sheetStyles.footerRow}>
            <Pressable
              style={[sheetStyles.footerBtn, sheetStyles.footerBtnCancel]}
              onPress={() => setCommitteeDeleteTarget(null)}>
              <Text style={sheetStyles.footerBtnCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[sheetStyles.footerBtn, sheetStyles.footerBtnDanger]}
              onPress={handleConfirmDeleteCommittee}
              disabled={actionLoading}>
              {actionLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={sheetStyles.footerBtnDangerText}>Delete</Text>
              )}
            </Pressable>
          </View>
        }>
        <View style={sheetStyles.confirmIconWrap}>
          <FeatherIcon name="trash-2" size={26} color="#dc2626" />
        </View>
        <Text style={sheetStyles.confirmMessage}>
          This action cannot be undone. The committee will be permanently deleted.
        </Text>
        <Text style={sheetStyles.confirmHighlight}>{committeeDeleteTarget?.name}</Text>
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
    marginBottom: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  sectionSub: { marginTop: 2, fontSize: 12, color: '#6b7280' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#16a34a',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  addBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  emptyInline: { fontSize: 13, color: '#6b7280', textAlign: 'center', paddingVertical: 12 },
  itemCard: {
    borderWidth: 1,
    borderColor: '#f3f4f6',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#fafafa',
  },
  itemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  itemTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 4 },
  itemMeta: { fontSize: 12, color: '#6b7280', marginBottom: 3 },
  statusPill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  activePill: { backgroundColor: '#16a34a' },
  inactivePill: { backgroundColor: '#9ca3af' },
  statusPillText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  itemActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnDanger: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: '#111827',
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  deptTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  deptTag: {
    backgroundColor: '#ecfdf5',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  deptTagText: {
    fontSize: 11,
    color: '#047857',
    fontWeight: '600',
  },
  selectField: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  selectLabel: { fontSize: 11, color: '#6b7280', marginBottom: 4 },
  selectValue: { fontSize: 14, color: '#111827', fontWeight: '600' },
  membersLabel: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8 },
  memberList: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    maxHeight: 160,
    marginBottom: 8,
  },
  memberRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  memberRowActive: { backgroundColor: '#f0fdf4' },
  memberName: { fontSize: 13, fontWeight: '600', color: '#111827' },
  memberEmail: { fontSize: 11, color: '#6b7280', marginTop: 2 },
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
    maxHeight: '60%',
  },
  pickerTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10, color: '#111827' },
  pickerRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  pickerRowText: { fontSize: 14, fontWeight: '600', color: '#111827' },
});
