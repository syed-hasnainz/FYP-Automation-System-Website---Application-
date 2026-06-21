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
import { PortalScreenLayout } from '../../components/portal/PortalScreenLayout';
import { useAuthStore } from '../../store/authStore';
import type { AdminUser } from '../../services/adminService';
import {
  createDefenseSchedule,
  createJuryAssignment,
  deleteDefenseSchedule,
  deleteJuryAssignment,
  evaluateJuryAssignment,
  fetchAllGroupsForJury,
  fetchApprovedDefenses,
  fetchDefenseScheduleById,
  fetchDefenseSchedules,
  fetchTeachersForJury,
  type ApprovedDefense,
  type DefenseSchedule,
  type DefenseType,
  type GroupWithDetails,
  type JuryAssignment,
} from '../../services/juryService';

type TabKey = 'schedules' | 'assignments' | 'approved';
type SortKey = 'date' | 'title' | 'group' | 'supervisor';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'schedules', label: 'Defense Schedules' },
  { key: 'assignments', label: 'Jury Assignments' },
  { key: 'approved', label: 'Approved' },
];

const DEFENSE_TYPES: { value: DefenseType; label: string }[] = [
  { value: 'PROPOSAL', label: 'Proposal Defense' },
  { value: 'FYP_I', label: 'FYP-I Defense' },
  { value: 'FYP_II', label: 'FYP-II Defense' },
];

const DEFENSE_TIME_SLOTS = Array.from({ length: 24 }, (_, hour) =>
  `${hour.toString().padStart(2, '0')}:00`,
);

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getDaysInMonth(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();
  const days: Array<Date | null> = [];

  for (let i = 0; i < startingDayOfWeek; i += 1) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i += 1) {
    days.push(new Date(year, month, i));
  }
  return days;
}

function isDefenseDateSelectable(date: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selectedDateObj = new Date(date);
  selectedDateObj.setHours(0, 0, 0, 0);
  return selectedDateObj >= today;
}

function formatDateValue(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatSelectedDateLabel(dateStr: string) {
  if (!dateStr) {
    return 'Select date';
  }
  const date = new Date(`${dateStr}T12:00:00`);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function CheckboxRow({
  checked,
  onPress,
  children,
}: {
  checked: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <Pressable style={styles.checkboxRow} onPress={onPress}>
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked ? <FeatherIcon name="check" size={13} color="#fff" /> : null}
      </View>
      <View style={styles.checkboxContent}>{children}</View>
    </Pressable>
  );
}

function formatDefenseType(type: string) {
  if (type === 'PROPOSAL') return 'PROPOSAL';
  if (type === 'FYP_I') return 'FYP I';
  if (type === 'FYP_II') return 'FYP II';
  return type.replace(/_/g, ' ');
}

function defenseTypeColor(type: string) {
  if (type === 'PROPOSAL') return '#2563eb';
  if (type === 'FYP_I') return '#9333ea';
  if (type === 'FYP_II') return '#16a34a';
  return '#6b7280';
}

function formatDate(dateValue?: string | null) {
  if (!dateValue) return 'N/A';
  const parsed = new Date(dateValue);
  return Number.isNaN(parsed.getTime()) ? 'N/A' : parsed.toLocaleDateString();
}

function parseJuryMemberIds(raw?: string) {
  try {
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

function getEvaluationStatusLabel(status: string, defenseType: string) {
  if (status === 'ACCEPTED') {
    if (defenseType === 'PROPOSAL') return 'Accepted → Proceed to FYP I';
    if (defenseType === 'FYP_I') return 'Accepted → Proceed to FYP II';
    return 'Accepted';
  }
  if (status === 'RE_EVALUATION_REQUIRED') return 'Re-Evaluation Required';
  if (status === 'FAILED') return 'Failed (3 attempts)';
  return 'Pending';
}

function getStatusBadgeStyle(status: string) {
  if (status === 'ACCEPTED') return { bg: '#111827', text: '#fff' };
  if (status === 'RE_EVALUATION_REQUIRED') return { bg: '#fef3c7', text: '#92400e' };
  if (status === 'FAILED') return { bg: '#fee2e2', text: '#b91c1c' };
  return { bg: '#f3f4f6', text: '#374151' };
}

function getTeacherNames(memberIds: string[], teachers: AdminUser[]) {
  return teachers.filter((t) => memberIds.includes(t.id)).map((t) => t.name);
}

type DeleteTarget =
  | { kind: 'schedule'; item: DefenseSchedule }
  | { kind: 'assignment'; item: JuryAssignment }
  | { kind: 'approved'; item: ApprovedDefense };

function SheetModal({
  visible,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={sheetStyles.overlay}>
        <Pressable style={sheetStyles.backdrop} onPress={onClose} />
        <View style={sheetStyles.sheet}>
          <View style={sheetStyles.header}>
            <View style={sheetStyles.headerText}>
              <Text style={sheetStyles.title}>{title}</Text>
              {subtitle ? <Text style={sheetStyles.subtitle}>{subtitle}</Text> : null}
            </View>
            <Pressable style={sheetStyles.closeBtn} onPress={onClose}>
              <FeatherIcon name="x" size={20} color="#4b5563" />
            </Pressable>
          </View>
          <ScrollView style={sheetStyles.body} showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
          {footer ? <View style={sheetStyles.footer}>{footer}</View> : null}
        </View>
      </View>
    </Modal>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <View style={sheetStyles.detailRow}>
      <View style={sheetStyles.detailIconWrap}>
        <FeatherIcon name={icon} size={16} color="#2563eb" />
      </View>
      <View style={sheetStyles.detailContent}>
        <Text style={sheetStyles.detailLabel}>{label}</Text>
        <Text style={sheetStyles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

const sheetStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  backdrop: { ...StyleSheet.absoluteFillObject },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '88%',
    paddingBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerText: { flex: 1, paddingRight: 12 },
  title: { fontSize: 18, fontWeight: '700', color: '#111827' },
  subtitle: { marginTop: 4, fontSize: 13, color: '#6b7280', lineHeight: 18 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { paddingHorizontal: 18, paddingTop: 14, maxHeight: 420 },
  footer: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  detailIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  detailContent: { flex: 1 },
  detailLabel: { fontSize: 11, color: '#6b7280', fontWeight: '600', marginBottom: 3 },
  detailValue: { fontSize: 14, color: '#111827', lineHeight: 20 },
  memberChip: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 6,
    marginBottom: 6,
  },
  memberChipText: { fontSize: 12, color: '#166534', fontWeight: '600' },
  actionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  actionOptionText: { fontSize: 15, color: '#111827', fontWeight: '500' },
  actionOptionDanger: { color: '#dc2626' },
  confirmIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 14,
  },
  confirmMessage: {
    fontSize: 14,
    color: '#4b5563',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  confirmHighlight: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 16,
  },
  footerRow: { flexDirection: 'row', gap: 10 },
  footerBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerBtnCancel: { backgroundColor: '#f3f4f6' },
  footerBtnDanger: { backgroundColor: '#dc2626' },
  footerBtnConfirm: { backgroundColor: '#16a34a' },
  footerBtnCancelText: { color: '#374151', fontWeight: '700', fontSize: 14 },
  footerBtnDangerText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  footerBtnConfirmText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});

export function AdminJuryManagementScreen() {
  const authUser = useAuthStore((s) => s.user);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('schedules');

  const [schedules, setSchedules] = useState<DefenseSchedule[]>([]);
  const [approvedDefenses, setApprovedDefenses] = useState<ApprovedDefense[]>([]);
  const [teachers, setTeachers] = useState<AdminUser[]>([]);
  const [groups, setGroups] = useState<GroupWithDetails[]>([]);

  const [sortBy, setSortBy] = useState<SortKey>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [createOpen, setCreateOpen] = useState(false);
  const [viewSchedule, setViewSchedule] = useState<DefenseSchedule | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [assignmentActions, setAssignmentActions] = useState<{
    assignment: JuryAssignment;
    schedule: DefenseSchedule;
  } | null>(null);
  const [viewApproved, setViewApproved] = useState<ApprovedDefense | null>(null);
  const [evaluateConfirm, setEvaluateConfirm] = useState<{
    assignment: JuryAssignment;
    schedule: DefenseSchedule;
    status: 'ACCEPTED' | 'RE_EVALUATION_REQUIRED' | 'FAILED';
  } | null>(null);
  const [defenseTypePickerOpen, setDefenseTypePickerOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [teacherSearch, setTeacherSearch] = useState('');
  const [groupSearch, setGroupSearch] = useState('');

  const [scheduleForm, setScheduleForm] = useState({
    defenseType: 'PROPOSAL' as DefenseType,
    title: '',
    description: '',
    defenseDate: '',
    defenseTime: '',
    venue: '',
    isPublished: true,
    selectedTeachers: [] as string[],
    selectedGroups: [] as string[],
  });

  const loadData = useCallback(async () => {
    try {
      const [scheduleData, approvedData, teacherData, groupData] = await Promise.all([
        fetchDefenseSchedules().catch(() => []),
        fetchApprovedDefenses().catch(() => []),
        fetchTeachersForJury().catch(() => []),
        fetchAllGroupsForJury().catch(() => []),
      ]);
      setSchedules(Array.isArray(scheduleData) ? scheduleData : []);
      setApprovedDefenses(Array.isArray(approvedData) ? approvedData : []);
      setTeachers(Array.isArray(teacherData) ? teacherData : []);
      setGroups(Array.isArray(groupData) ? groupData : []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  React.useEffect(() => {
    if (!createOpen) {
      return;
    }
    fetchAllGroupsForJury()
      .then((groupData) => {
        setGroups(Array.isArray(groupData) ? groupData : []);
      })
      .catch(() => {});
    setCurrentMonth(new Date());
  }, [createOpen]);

  const calendarDays = useMemo(() => getDaysInMonth(currentMonth), [currentMonth]);

  const sortedApproved = useMemo(() => {
    const list = [...approvedDefenses];
    list.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'title':
          comparison = a.project.title.localeCompare(b.project.title);
          break;
        case 'group':
          comparison = (a.project.group?.name || 'Individual').localeCompare(
            b.project.group?.name || 'Individual',
          );
          break;
        case 'supervisor':
          comparison = (a.project.supervisor?.name || 'Not Assigned').localeCompare(
            b.project.supervisor?.name || 'Not Assigned',
          );
          break;
        case 'date':
        default:
          comparison = new Date(a.approvedAt).getTime() - new Date(b.approvedAt).getTime();
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    return list;
  }, [approvedDefenses, sortBy, sortOrder]);

  const filteredTeachers = useMemo(() => {
    const q = teacherSearch.trim().toLowerCase();
    if (!q) return teachers;
    return teachers.filter(
      (t) => t.name.toLowerCase().includes(q) || t.email.toLowerCase().includes(q),
    );
  }, [teacherSearch, teachers]);

  const filteredGroups = useMemo(() => {
    const q = groupSearch.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => {
      if (g.name?.toLowerCase().includes(q)) return true;
      if (
        g.members?.some(
          (m) =>
            m.user?.name?.toLowerCase().includes(q) ||
            m.user?.email?.toLowerCase().includes(q) ||
            m.user?.rollNumber?.toLowerCase().includes(q),
        )
      ) {
        return true;
      }
      return g.projects?.some((p) => p.title?.toLowerCase().includes(q));
    });
  }, [groupSearch, groups]);

  const allAssignments = useMemo(() => {
    return schedules.flatMap((schedule) =>
      (schedule.juryAssignments || []).map((assignment) => ({
        schedule,
        assignment,
      })),
    );
  }, [schedules]);

  const resetScheduleForm = () => {
    setScheduleForm({
      defenseType: 'PROPOSAL',
      title: '',
      description: '',
      defenseDate: '',
      defenseTime: '',
      venue: '',
      isPublished: true,
      selectedTeachers: [],
      selectedGroups: [],
    });
    setTeacherSearch('');
    setGroupSearch('');
    setCurrentMonth(new Date());
  };

  const openCreateSchedule = () => {
    resetScheduleForm();
    setCreateOpen(true);
    fetchAllGroupsForJury()
      .then((data) => setGroups(Array.isArray(data) ? data : []))
      .catch(() => {});
  };

  const toggleTeacher = (teacherId: string) => {
    setScheduleForm((prev) => ({
      ...prev,
      selectedTeachers: prev.selectedTeachers.includes(teacherId)
        ? prev.selectedTeachers.filter((id) => id !== teacherId)
        : [...prev.selectedTeachers, teacherId],
    }));
  };

  const toggleGroup = (groupId: string) => {
    setScheduleForm((prev) => ({
      ...prev,
      selectedGroups: prev.selectedGroups.includes(groupId)
        ? prev.selectedGroups.filter((id) => id !== groupId)
        : [...prev.selectedGroups, groupId],
    }));
  };

  const handleCreateSchedule = async () => {
    if (!scheduleForm.title.trim() || !scheduleForm.defenseDate || !scheduleForm.defenseTime || !scheduleForm.venue.trim()) {
      Alert.alert('Missing fields', 'Title, date, time and venue are required.');
      return;
    }
    if (!scheduleForm.selectedGroups.length || !scheduleForm.selectedTeachers.length) {
      Alert.alert('Selection required', 'Select at least one group and one teacher.');
      return;
    }
    if (!authUser?.id) {
      Alert.alert('Session error', 'Please login again.');
      return;
    }

    setActionLoading(true);
    try {
      const created = await createDefenseSchedule({
        ...scheduleForm,
        title: scheduleForm.title.trim(),
        venue: scheduleForm.venue.trim(),
        description: scheduleForm.description.trim() || undefined,
        createdBy: authUser.id,
      });

      if (created.id) {
        await Promise.all(
          scheduleForm.selectedGroups.map(async (groupId) => {
            const group = groups.find((g) => g.id === groupId);
            if (!group) return;
            await createJuryAssignment(created.id, {
              groupId: group.id,
              groupName: group.name || 'Unnamed Group',
              projectTitle: group.projects?.[0]?.title || '',
              juryMembers: scheduleForm.selectedTeachers,
              chairpersonId: scheduleForm.selectedTeachers[0] || '',
            });
          }),
        );
      }

      setCreateOpen(false);
      resetScheduleForm();
      await loadData();
      Alert.alert('Success', 'Defense schedule created successfully.');
    } catch {
      Alert.alert('Error', 'Failed to create defense schedule.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewSchedule = async (schedule: DefenseSchedule) => {
    try {
      const details = await fetchDefenseScheduleById(schedule.id);
      setViewSchedule(details);
    } catch {
      setViewSchedule(schedule);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      if (deleteTarget.kind === 'schedule') {
        await deleteDefenseSchedule(deleteTarget.item.id);
      } else {
        await deleteJuryAssignment(deleteTarget.item.id);
      }
      setDeleteTarget(null);
      setAssignmentActions(null);
      await loadData();
    } catch {
      Alert.alert('Error', 'Failed to delete. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmEvaluate = async () => {
    if (!evaluateConfirm) return;
    setActionLoading(true);
    try {
      await evaluateJuryAssignment(evaluateConfirm.assignment.id, {
        evaluationStatus: evaluateConfirm.status,
        scheduleId: evaluateConfirm.schedule.id,
      });
      setEvaluateConfirm(null);
      setAssignmentActions(null);
      await loadData();
    } catch {
      Alert.alert('Error', 'Failed to update evaluation.');
    } finally {
      setActionLoading(false);
    }
  };

  const getDeleteModalContent = () => {
    if (!deleteTarget) return { title: '', message: '', highlight: '' };
    if (deleteTarget.kind === 'schedule') {
      return {
        title: 'Delete Defense Schedule',
        message: 'This will permanently remove the schedule and all linked jury assignments.',
        highlight: deleteTarget.item.title,
      };
    }
    if (deleteTarget.kind === 'assignment') {
      return {
        title: 'Delete Jury Assignment',
        message: 'This will remove the jury assignment for this group from the schedule.',
        highlight: deleteTarget.item.groupName || 'Assignment',
      };
    }
    return {
      title: 'Delete Approved Record',
      message: 'This will permanently remove this approved defense record from the system.',
      highlight: deleteTarget.item.project.title,
    };
  };

  const renderTabHeader = (title: string, description: string) => (
    <View style={styles.tabSectionHeader}>
      <Text style={styles.tabSectionTitle}>{title}</Text>
      <Text style={styles.tabSectionDesc}>{description}</Text>
    </View>
  );

  const renderSchedulesTab = () => {
    return (
      <>
        {renderTabHeader(
          'Defense Schedules',
          'Manage defense schedules for FYP-I and FYP-II',
        )}
        {schedules.length === 0 ? (
          <EmptyState
            title="No defense schedules"
            message="No defense schedules created yet"
          />
        ) : (
          schedules.map((schedule) => (
            <View key={schedule.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View
                  style={[
                    styles.typeBadge,
                    { backgroundColor: `${defenseTypeColor(schedule.defenseType)}18` },
                  ]}>
                  <Text
                    style={[
                      styles.typeBadgeText,
                      { color: defenseTypeColor(schedule.defenseType) },
                    ]}>
                    {formatDefenseType(schedule.defenseType)}
                  </Text>
                </View>
                <View
                  style={[styles.statusPill, schedule.isPublished ? styles.published : styles.draft]}>
                  <Text
                    style={[
                      styles.statusPillText,
                      !schedule.isPublished && styles.statusPillTextDark,
                    ]}>
                    {schedule.isPublished ? 'Published' : 'Draft'}
                  </Text>
                </View>
              </View>
              <Text style={styles.cardTitle}>{schedule.title}</Text>
              <View style={styles.metaRow}>
                <FeatherIcon name="calendar" size={13} color="#6b7280" />
                <Text style={styles.metaText}>{formatDate(schedule.defenseDate)}</Text>
                <FeatherIcon name="clock" size={13} color="#6b7280" style={styles.metaIconGap} />
                <Text style={styles.metaText}>{schedule.defenseTime}</Text>
              </View>
              <View style={styles.metaRow}>
                <FeatherIcon name="map-pin" size={13} color="#6b7280" />
                <Text style={styles.metaText}>{schedule.venue}</Text>
              </View>
              <Text style={styles.assignCount}>
                Assignments: {schedule.juryAssignments?.length || 0} Groups
              </Text>
              <View style={styles.cardActions}>
                <Pressable style={styles.iconBtn} onPress={() => handleViewSchedule(schedule)}>
                  <FeatherIcon name="eye" size={16} color="#2563eb" />
                </Pressable>
                <Pressable
                  style={styles.iconBtnDanger}
                  onPress={() => setDeleteTarget({ kind: 'schedule', item: schedule })}>
                  <FeatherIcon name="trash-2" size={16} color="#dc2626" />
                </Pressable>
              </View>
            </View>
          ))
        )}
      </>
    );
  };

  const renderAssignmentsTab = () => {
    return (
      <>
        {renderTabHeader(
          'All Jury Assignments',
          'View and evaluate jury panel assignments across defenses',
        )}
        {allAssignments.length === 0 ? (
          <EmptyState
            title="No jury assignments"
            message="No jury assignments found. Create a defense schedule and assign groups to see assignments here."
          />
        ) : (
          schedules.map((schedule) => {
            const assignments = schedule.juryAssignments || [];
            if (!assignments.length) {
              return null;
            }

            return (
              <View key={schedule.id} style={styles.sectionBlock}>
                <Text style={styles.sectionHeading}>
                  {schedule.title} - {formatDefenseType(schedule.defenseType)}
                </Text>
          {assignments.map((assignment) => {
            const memberIds = parseJuryMemberIds(assignment.juryMembers);
            const memberNames = getTeacherNames(memberIds, teachers);
            const statusLabel = getEvaluationStatusLabel(
              assignment.evaluationStatus,
              schedule.defenseType,
            );
            const statusStyle = getStatusBadgeStyle(assignment.evaluationStatus);

            return (
              <View key={assignment.id} style={styles.card}>
                <Text style={styles.cardTitle}>{assignment.groupName || 'Group'}</Text>
                <Text style={styles.subText}>{assignment.projectTitle || 'No project title'}</Text>

                <Text style={styles.juryLabel}>Jury Members</Text>
                <View style={styles.juryChipsWrap}>
                  {memberNames.length > 0 ? (
                    memberNames.map((name, index) => (
                      <View key={`${name}-${index}`} style={sheetStyles.memberChip}>
                        <Text style={sheetStyles.memberChipText}>{name}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.subText}>{memberIds.length} member(s) assigned</Text>
                  )}
                </View>

                <View style={styles.cardTop}>
                  <View style={[styles.evalBadge, { backgroundColor: statusStyle.bg }]}>
                    <Text style={[styles.evalBadgeText, { color: statusStyle.text }]}>
                      {statusLabel}
                    </Text>
                  </View>
                  {schedule.defenseType !== 'PROPOSAL' ? (
                    <Text style={styles.marksText}>
                      {assignment.marks != null ? `${assignment.marks}/100` : 'Marks: -'}
                    </Text>
                  ) : null}
                </View>
                <Pressable
                  style={styles.actionBtn}
                  onPress={() => setAssignmentActions({ assignment, schedule })}>
                  <Text style={styles.actionBtnText}>Actions</Text>
                  <FeatherIcon name="more-horizontal" size={16} color="#2563eb" />
                </Pressable>
              </View>
            );
          })}
              </View>
            );
          })
        )}
      </>
    );
  };

  const renderApprovedTab = () => {
    return (
      <>
        {renderTabHeader(
          'Approved',
          'All approved defenses (Proposal, FYP I, FYP II) through jury evaluation',
        )}
        <View style={styles.sortRow}>
          <Text style={styles.sortLabel}>Sort:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {(['date', 'title', 'group', 'supervisor'] as SortKey[]).map((key) => (
              <Pressable
                key={key}
                style={[styles.sortChip, sortBy === key && styles.sortChipActive]}
                onPress={() => setSortBy(key)}>
                <Text style={[styles.sortChipText, sortBy === key && styles.sortChipTextActive]}>
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <Pressable style={styles.sortOrderBtn} onPress={() => setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}>
            <Text style={styles.sortOrderText}>{sortOrder === 'asc' ? '↑' : '↓'}</Text>
          </Pressable>
        </View>

        {sortedApproved.length === 0 ? (
          <EmptyState title="No approved defenses" message="No approved defenses yet" />
        ) : (
          sortedApproved.map((defense) => (
            <View key={defense.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View
                  style={[
                    styles.typeBadge,
                    { backgroundColor: `${defenseTypeColor(defense.defenseType)}18` },
                  ]}>
                  <Text style={[styles.typeBadgeText, { color: defenseTypeColor(defense.defenseType) }]}>
                    {formatDefenseType(defense.defenseType)}
                  </Text>
                </View>
                <View style={[styles.statusPill, styles.approvedPill]}>
                  <Text style={styles.statusPillText}>Approved</Text>
                </View>
              </View>
              <Text style={styles.cardTitle}>{defense.project.title}</Text>
              <Text style={styles.subText}>Group: {defense.project.group?.name || 'Individual'}</Text>
              <Text style={styles.subText}>
                Supervisor: {defense.project.supervisor?.name || 'Not Assigned'}
              </Text>
              <Text style={styles.subText}>
                Marks:{' '}
                {defense.defenseType === 'PROPOSAL'
                  ? '-'
                  : defense.marks != null
                    ? `${defense.marks}/100`
                    : '-'}
              </Text>
              <Text style={styles.subText}>Approved: {formatDate(defense.approvedAt)}</Text>
              <View style={styles.cardActions}>
                <Pressable style={styles.iconBtn} onPress={() => setViewApproved(defense)}>
                  <FeatherIcon name="eye" size={16} color="#2563eb" />
                </Pressable>
                <Pressable
                  style={styles.iconBtnDanger}
                  onPress={() => setDeleteTarget({ kind: 'approved', item: defense })}>
                  <FeatherIcon name="trash-2" size={16} color="#dc2626" />
                </Pressable>
              </View>
            </View>
          ))
        )}
      </>
    );
  };

  if (loading) {
    return <LoadingView message="Loading jury management..." />;
  }

  return (
    <PortalScreenLayout
      title="Jury Management"
      subtitle="Schedule defenses and assign jury panels"
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        loadData();
      }}>
      <Pressable style={styles.createBtn} onPress={openCreateSchedule}>
        <FeatherIcon name="plus" size={16} color="#fff" />
        <Text style={styles.createBtnText}>Create Defense Schedule</Text>
      </Pressable>

      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={[styles.tabItem, active && styles.tabItemActive]}
              onPress={() => setActiveTab(tab.key)}>
              <Text style={[styles.tabText, active && styles.tabTextActive]} numberOfLines={2}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {activeTab === 'schedules' ? renderSchedulesTab() : null}
      {activeTab === 'assignments' ? renderAssignmentsTab() : null}
      {activeTab === 'approved' ? renderApprovedTab() : null}

      {actionLoading ? (
        <View style={styles.globalLoader}>
          <ActivityIndicator color="#16a34a" />
        </View>
      ) : null}

      <Modal visible={createOpen} animationType="slide" onRequestClose={() => setCreateOpen(false)}>
        <View style={styles.modalRoot}>
          <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>Create Defense Schedule</Text>
            <Text style={styles.modalSub}>
              Schedule a new defense session for Proposal, FYP-I, or FYP-II
            </Text>

            <Text style={styles.fieldLabel}>Defense Type</Text>
            <Pressable style={styles.dropdownField} onPress={() => setDefenseTypePickerOpen(true)}>
              <Text style={[styles.dropdownValue, styles.dropdownValueFlex]}>
                {DEFENSE_TYPES.find((d) => d.value === scheduleForm.defenseType)?.label}
              </Text>
              <FeatherIcon name="chevron-down" size={18} color="#6b7280" />
            </Pressable>

            <Text style={styles.fieldLabel}>Title</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Proposal Defense - Spring 2025"
              placeholderTextColor="#9ca3af"
              value={scheduleForm.title}
              onChangeText={(v) => setScheduleForm((p) => ({ ...p, title: v }))}
            />

            <Text style={styles.fieldLabel}>Description (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Additional details about the defense..."
              placeholderTextColor="#9ca3af"
              multiline
              value={scheduleForm.description}
              onChangeText={(v) => setScheduleForm((p) => ({ ...p, description: v }))}
            />

            <Text style={styles.fieldLabel}>Date</Text>
            <Pressable style={styles.dropdownField} onPress={() => setCalendarOpen(true)}>
              <FeatherIcon name="calendar" size={16} color="#6b7280" />
              <Text
                style={[
                  styles.dropdownValue,
                  styles.dropdownValueFlex,
                  !scheduleForm.defenseDate && styles.dropdownPlaceholder,
                ]}>
                {scheduleForm.defenseDate
                  ? formatSelectedDateLabel(scheduleForm.defenseDate)
                  : 'Select date'}
              </Text>
              <FeatherIcon name="chevron-down" size={18} color="#6b7280" />
            </Pressable>

            <Text style={styles.fieldLabel}>Time</Text>
            <Pressable style={styles.dropdownField} onPress={() => setTimePickerOpen(true)}>
              <FeatherIcon name="clock" size={16} color="#6b7280" />
              <Text
                style={[
                  styles.dropdownValue,
                  styles.dropdownValueFlex,
                  !scheduleForm.defenseTime && styles.dropdownPlaceholder,
                ]}>
                {scheduleForm.defenseTime || 'Select time'}
              </Text>
              <FeatherIcon name="chevron-down" size={18} color="#6b7280" />
            </Pressable>

            <Text style={styles.fieldLabel}>Venue</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Main Auditorium, Room 301"
              placeholderTextColor="#9ca3af"
              value={scheduleForm.venue}
              onChangeText={(v) => setScheduleForm((p) => ({ ...p, venue: v }))}
            />

            <Text style={styles.sectionLabel}>Select Teachers</Text>
            <TextInput
              style={styles.input}
              placeholder="Search teachers..."
              placeholderTextColor="#9ca3af"
              value={teacherSearch}
              onChangeText={setTeacherSearch}
            />
            <ScrollView style={styles.pickList} nestedScrollEnabled>
              {filteredTeachers.length === 0 ? (
                <Text style={styles.pickEmpty}>No teachers found</Text>
              ) : (
                filteredTeachers.map((teacher) => {
                  const selected = scheduleForm.selectedTeachers.includes(teacher.id);
                  return (
                    <CheckboxRow
                      key={teacher.id}
                      checked={selected}
                      onPress={() => toggleTeacher(teacher.id)}>
                      <Text style={styles.pickName}>{teacher.name}</Text>
                      <Text style={styles.pickSub}>{teacher.email}</Text>
                    </CheckboxRow>
                  );
                })
              )}
            </ScrollView>
            {scheduleForm.selectedTeachers.length > 0 ? (
              <Text style={styles.pickCount}>
                {scheduleForm.selectedTeachers.length} teacher(s) selected
              </Text>
            ) : null}

            <Text style={styles.sectionLabel}>Select Groups</Text>
            <TextInput
              style={styles.input}
              placeholder="Search groups..."
              placeholderTextColor="#9ca3af"
              value={groupSearch}
              onChangeText={setGroupSearch}
            />
            <ScrollView style={styles.pickList} nestedScrollEnabled>
              {filteredGroups.length === 0 ? (
                <Text style={styles.pickEmpty}>
                  {groups.length === 0
                    ? 'No groups found. Please create groups first.'
                    : 'No groups match your search. Try a different search term.'}
                </Text>
              ) : (
                filteredGroups.map((group) => {
                  const selected = scheduleForm.selectedGroups.includes(group.id);
                  const memberNames =
                    group.members
                      ?.map((member) => member.user?.name)
                      .filter(Boolean)
                      .join(', ') || '';
                  return (
                    <CheckboxRow
                      key={group.id}
                      checked={selected}
                      onPress={() => toggleGroup(group.id)}>
                      <Text style={styles.pickName}>{group.name || 'Unnamed Group'}</Text>
                      {memberNames ? (
                        <Text style={styles.pickSub}>Members: {memberNames}</Text>
                      ) : null}
                      {group.projects?.[0]?.title ? (
                        <Text style={styles.pickSub}>Project: {group.projects[0].title}</Text>
                      ) : null}
                    </CheckboxRow>
                  );
                })
              )}
            </ScrollView>
            {filteredGroups.length > 0 ? (
              <Text style={styles.pickHint}>
                Showing {filteredGroups.length} of {groups.length} groups
              </Text>
            ) : null}
            {scheduleForm.selectedGroups.length > 0 ? (
              <Text style={styles.pickCount}>
                {scheduleForm.selectedGroups.length} group(s) selected
              </Text>
            ) : null}

            <View style={styles.publishRow}>
              <CheckboxRow
                checked={scheduleForm.isPublished}
                onPress={() =>
                  setScheduleForm((p) => ({ ...p, isPublished: !p.isPublished }))
                }>
                <Text style={styles.publishLabel}>Publish immediately</Text>
              </CheckboxRow>
            </View>

            <View style={styles.modalActions}>
              <Pressable
                style={styles.cancelBtn}
                onPress={() => setCreateOpen(false)}
                disabled={actionLoading}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.saveBtn} onPress={handleCreateSchedule} disabled={actionLoading}>
                {actionLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveText}>Create Schedule</Text>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={defenseTypePickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDefenseTypePickerOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setDefenseTypePickerOpen(false)}>
          <View style={styles.optionSheet}>
            <Text style={styles.optionSheetTitle}>Defense Type</Text>
            {DEFENSE_TYPES.map((item) => (
              <Pressable
                key={item.value}
                style={styles.optionRowSelectable}
                onPress={() => {
                  setScheduleForm((p) => ({ ...p, defenseType: item.value }));
                  setDefenseTypePickerOpen(false);
                }}>
                <Text style={styles.optionText}>{item.label}</Text>
                {scheduleForm.defenseType === item.value ? (
                  <FeatherIcon name="check" size={18} color="#16a34a" />
                ) : null}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      <SheetModal
        visible={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        title="Select Date"
        subtitle={currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}>
        <View style={styles.calendarHeader}>
          <Pressable
            style={styles.calendarNavBtn}
            onPress={() =>
              setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
            }>
            <FeatherIcon name="chevron-left" size={20} color="#374151" />
          </Pressable>
          <Text style={styles.calendarMonth}>
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </Text>
          <Pressable
            style={styles.calendarNavBtn}
            onPress={() =>
              setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
            }>
            <FeatherIcon name="chevron-right" size={20} color="#374151" />
          </Pressable>
        </View>
        <View style={styles.weekdayRow}>
          {WEEKDAYS.map((day) => (
            <Text key={day} style={styles.weekdayText}>
              {day}
            </Text>
          ))}
        </View>
        <View style={styles.calendarGrid}>
          {calendarDays.map((date, index) => {
            if (!date) {
              return <View key={`empty-${index}`} style={styles.calendarCell} />;
            }
            const value = formatDateValue(date);
            const selectable = isDefenseDateSelectable(date);
            const selected = scheduleForm.defenseDate === value;
            return (
              <Pressable
                key={value}
                style={[
                  styles.calendarCell,
                  selected && styles.calendarCellSelected,
                  !selectable && styles.calendarCellDisabled,
                ]}
                disabled={!selectable}
                onPress={() => {
                  setScheduleForm((p) => ({ ...p, defenseDate: value }));
                  setCalendarOpen(false);
                }}>
                <Text
                  style={[
                    styles.calendarCellText,
                    selected && styles.calendarCellTextSelected,
                    !selectable && styles.calendarCellTextDisabled,
                  ]}>
                  {date.getDate()}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </SheetModal>

      <SheetModal
        visible={timePickerOpen}
        onClose={() => setTimePickerOpen(false)}
        title="Select Time"
        subtitle="Choose defense time">
        <ScrollView showsVerticalScrollIndicator={false} style={styles.timePickerList}>
          {DEFENSE_TIME_SLOTS.map((slot) => (
            <Pressable
              key={slot}
              style={styles.optionRowSelectable}
              onPress={() => {
                setScheduleForm((p) => ({ ...p, defenseTime: slot }));
                setTimePickerOpen(false);
              }}>
              <Text style={styles.optionText}>{slot}</Text>
              {scheduleForm.defenseTime === slot ? (
                <FeatherIcon name="check" size={18} color="#16a34a" />
              ) : null}
            </Pressable>
          ))}
        </ScrollView>
      </SheetModal>

      <SheetModal
        visible={!!viewSchedule}
        onClose={() => setViewSchedule(null)}
        title={viewSchedule?.title || 'Schedule Details'}
        subtitle={`${formatDefenseType(viewSchedule?.defenseType || '')} Defense`}>
        <DetailRow
          icon="calendar"
          label="Date"
          value={formatDate(viewSchedule?.defenseDate)}
        />
        <DetailRow icon="clock" label="Time" value={viewSchedule?.defenseTime || 'N/A'} />
        <DetailRow icon="map-pin" label="Venue" value={viewSchedule?.venue || 'N/A'} />
        <DetailRow
          icon="check-circle"
          label="Publication"
          value={viewSchedule?.isPublished ? 'Published' : 'Draft'}
        />
        {viewSchedule?.description ? (
          <DetailRow icon="file-text" label="Description" value={viewSchedule.description} />
        ) : null}
        <DetailRow
          icon="users"
          label="Assignments"
          value={`${viewSchedule?.juryAssignments?.length || 0} group(s) assigned`}
        />
        <Text style={styles.sectionLabel}>Assigned Groups</Text>
        {(viewSchedule?.juryAssignments || []).length === 0 ? (
          <Text style={styles.subText}>No assignments yet.</Text>
        ) : (
          (viewSchedule?.juryAssignments || []).map((a) => {
            const memberIds = parseJuryMemberIds(a.juryMembers);
            const names = getTeacherNames(memberIds, teachers).join(', ') || '—';
            const statusLabel = getEvaluationStatusLabel(
              a.evaluationStatus,
              viewSchedule?.defenseType || 'PROPOSAL',
            );
            return (
              <View key={a.id} style={styles.assignmentDetailCard}>
                <Text style={styles.pickName}>{a.groupName || 'Group'}</Text>
                <Text style={styles.pickSub}>{a.projectTitle || 'No project'}</Text>
                <Text style={styles.pickSub}>Jury: {names}</Text>
                <Text style={styles.pickSub}>Status: {statusLabel}</Text>
              </View>
            );
          })
        )}
      </SheetModal>

      <SheetModal
        visible={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={getDeleteModalContent().title}
        footer={
          <View style={sheetStyles.footerRow}>
            <Pressable
              style={[sheetStyles.footerBtn, sheetStyles.footerBtnCancel]}
              onPress={() => setDeleteTarget(null)}
              disabled={actionLoading}>
              <Text style={sheetStyles.footerBtnCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[sheetStyles.footerBtn, sheetStyles.footerBtnDanger]}
              onPress={handleConfirmDelete}
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
        <Text style={sheetStyles.confirmMessage}>{getDeleteModalContent().message}</Text>
        <Text style={sheetStyles.confirmHighlight}>{getDeleteModalContent().highlight}</Text>
      </SheetModal>

      <SheetModal
        visible={!!assignmentActions}
        onClose={() => setAssignmentActions(null)}
        title={assignmentActions?.assignment.groupName || 'Jury Assignment'}
        subtitle={assignmentActions?.assignment.projectTitle || 'Actions'}>
        {assignmentActions ? (
          <>
            <Text style={styles.subText}>
              Status:{' '}
              {getEvaluationStatusLabel(
                assignmentActions.assignment.evaluationStatus,
                assignmentActions.schedule.defenseType,
              )}
            </Text>
            <Pressable
              style={sheetStyles.actionOption}
              disabled={
                assignmentActions.assignment.evaluationStatus === 'ACCEPTED' ||
                assignmentActions.assignment.evaluationStatus === 'FAILED'
              }
              onPress={() => {
                setEvaluateConfirm({
                  assignment: assignmentActions.assignment,
                  schedule: assignmentActions.schedule,
                  status: 'ACCEPTED',
                });
                setAssignmentActions(null);
              }}>
              <FeatherIcon name="check-circle" size={18} color="#16a34a" />
              <Text style={sheetStyles.actionOptionText}>Accept</Text>
            </Pressable>
            <Pressable
              style={sheetStyles.actionOption}
              disabled={
                assignmentActions.assignment.evaluationStatus === 'ACCEPTED' ||
                assignmentActions.assignment.evaluationStatus === 'FAILED'
              }
              onPress={() => {
                setEvaluateConfirm({
                  assignment: assignmentActions.assignment,
                  schedule: assignmentActions.schedule,
                  status: 'RE_EVALUATION_REQUIRED',
                });
                setAssignmentActions(null);
              }}>
              <FeatherIcon name="alert-circle" size={18} color="#d97706" />
              <Text style={sheetStyles.actionOptionText}>Re-Evaluate</Text>
            </Pressable>
            <Pressable
              style={sheetStyles.actionOption}
              disabled={
                assignmentActions.assignment.evaluationStatus === 'ACCEPTED' ||
                assignmentActions.assignment.evaluationStatus === 'FAILED'
              }
              onPress={() => {
                setEvaluateConfirm({
                  assignment: assignmentActions.assignment,
                  schedule: assignmentActions.schedule,
                  status: 'FAILED',
                });
                setAssignmentActions(null);
              }}>
              <FeatherIcon name="x-circle" size={18} color="#dc2626" />
              <Text style={[sheetStyles.actionOptionText, sheetStyles.actionOptionDanger]}>
                Fail
              </Text>
            </Pressable>
            <Pressable
              style={sheetStyles.actionOption}
              onPress={() => {
                setAssignmentActions(null);
                setDeleteTarget({ kind: 'assignment', item: assignmentActions.assignment });
              }}>
              <FeatherIcon name="trash-2" size={18} color="#dc2626" />
              <Text style={[sheetStyles.actionOptionText, sheetStyles.actionOptionDanger]}>
                Delete Assignment
              </Text>
            </Pressable>
          </>
        ) : null}
      </SheetModal>

      <SheetModal
        visible={!!evaluateConfirm}
        onClose={() => setEvaluateConfirm(null)}
        title="Confirm Evaluation"
        footer={
          <View style={sheetStyles.footerRow}>
            <Pressable
              style={[sheetStyles.footerBtn, sheetStyles.footerBtnCancel]}
              onPress={() => setEvaluateConfirm(null)}
              disabled={actionLoading}>
              <Text style={sheetStyles.footerBtnCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[sheetStyles.footerBtn, sheetStyles.footerBtnConfirm]}
              onPress={handleConfirmEvaluate}
              disabled={actionLoading}>
              {actionLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={sheetStyles.footerBtnConfirmText}>Confirm</Text>
              )}
            </Pressable>
          </View>
        }>
        <Text style={sheetStyles.confirmMessage}>
          Update evaluation status for{' '}
          <Text style={{ fontWeight: '700' }}>
            {evaluateConfirm?.assignment.groupName || 'this group'}
          </Text>
          ?
        </Text>
        <Text style={sheetStyles.confirmHighlight}>
          {evaluateConfirm
            ? getEvaluationStatusLabel(
                evaluateConfirm.status,
                evaluateConfirm.schedule.defenseType,
              )
            : ''}
        </Text>
      </SheetModal>

      <SheetModal
        visible={!!viewApproved}
        onClose={() => setViewApproved(null)}
        title={viewApproved?.project.title || 'Approved Defense'}
        subtitle={`${formatDefenseType(viewApproved?.defenseType || '')} · Approved`}>
        <DetailRow
          icon="layers"
          label="Defense Type"
          value={formatDefenseType(viewApproved?.defenseType || '')}
        />
        <DetailRow
          icon="users"
          label="Group"
          value={viewApproved?.project.group?.name || 'Individual'}
        />
        <DetailRow
          icon="user"
          label="Supervisor"
          value={viewApproved?.project.supervisor?.name || 'Not Assigned'}
        />
        <DetailRow
          icon="award"
          label="Marks"
          value={
            viewApproved?.defenseType === 'PROPOSAL'
              ? 'N/A (Proposal)'
              : viewApproved?.marks != null
                ? `${viewApproved.marks}/100`
                : '—'
          }
        />
        <DetailRow
          icon="calendar"
          label="Approved Date"
          value={formatDate(viewApproved?.approvedAt)}
        />
        {viewApproved?.defenseDate ? (
          <DetailRow
            icon="clock"
            label="Defense Date"
            value={formatDate(viewApproved.defenseDate)}
          />
        ) : null}
        {viewApproved?.feedback ? (
          <DetailRow icon="message-square" label="Feedback" value={viewApproved.feedback} />
        ) : null}
        <View style={[styles.evalBadge, styles.approvedBadgeInModal]}>
          <FeatherIcon name="check-circle" size={14} color="#16a34a" />
          <Text style={styles.approvedBadgeText}>Approved</Text>
        </View>
      </SheetModal>
    </PortalScreenLayout>
  );
}

const styles = StyleSheet.create({
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingVertical: 12,
    marginBottom: 12,
  },
  createBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#e5e7eb',
    borderRadius: 10,
    padding: 4,
    marginBottom: 14,
    gap: 4,
  },
  tabItem: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  tabItemActive: { backgroundColor: '#fff' },
  tabText: { fontSize: 11, color: '#6b7280', textAlign: 'center', fontWeight: '500' },
  tabTextActive: { color: '#111827', fontWeight: '700' },
  tabSectionHeader: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 14,
    marginBottom: 12,
  },
  tabSectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  tabSectionDesc: { fontSize: 13, color: '#6b7280', marginTop: 4, lineHeight: 18 },
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
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  typeBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  typeBadgeText: { fontSize: 11, fontWeight: '700' },
  statusPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  published: { backgroundColor: '#111827' },
  draft: { backgroundColor: '#e5e7eb' },
  approvedPill: { backgroundColor: '#16a34a' },
  statusPillText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  statusPillTextDark: { color: '#374151' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 6 },
  subText: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  metaText: { fontSize: 12, color: '#4b5563', marginLeft: 6 },
  metaIconGap: { marginLeft: 10 },
  assignCount: { fontSize: 12, color: '#374151', marginTop: 4, marginBottom: 8 },
  cardActions: { flexDirection: 'row', gap: 8 },
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
  sectionBlock: { marginBottom: 8 },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  evalBadge: {
    backgroundColor: '#f3f4f6',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  evalBadgeText: { fontSize: 11, fontWeight: '600', color: '#374151' },
  juryLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    marginTop: 8,
    marginBottom: 6,
  },
  juryChipsWrap: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  assignmentDetailCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 12,
    marginBottom: 8,
  },
  approvedBadgeInModal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#dcfce7',
    marginTop: 8,
  },
  approvedBadgeText: { fontSize: 12, fontWeight: '700', color: '#16a34a' },
  marksText: { fontSize: 12, color: '#6b7280' },
  actionBtn: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 8,
    paddingVertical: 8,
    backgroundColor: '#eff6ff',
  },
  actionBtnText: { color: '#2563eb', fontWeight: '600', fontSize: 13 },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  sortLabel: { fontSize: 12, color: '#6b7280', fontWeight: '600' },
  sortChip: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 6,
    backgroundColor: '#fff',
  },
  sortChipActive: { backgroundColor: '#111827', borderColor: '#111827' },
  sortChipText: { fontSize: 11, color: '#374151' },
  sortChipTextActive: { color: '#fff', fontWeight: '700' },
  sortOrderBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  sortOrderText: { fontSize: 14, fontWeight: '700', color: '#111827' },
  globalLoader: { marginTop: 8, alignItems: 'center' },
  modalRoot: { flex: 1, backgroundColor: '#f3f4f6' },
  modalScroll: { padding: 16, paddingBottom: 40 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  modalSub: { fontSize: 13, color: '#6b7280', marginTop: 4, marginBottom: 14 },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    marginTop: 2,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: '#111827',
    marginBottom: 10,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  dropdownField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
  },
  dropdownValue: { fontSize: 14, color: '#111827', fontWeight: '600' },
  dropdownValueFlex: { flex: 1, fontWeight: '500' },
  dropdownPlaceholder: { color: '#9ca3af', fontWeight: '400' },
  selectField: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  selectLabel: { fontSize: 11, color: '#6b7280', marginBottom: 4 },
  selectValue: { fontSize: 14, color: '#111827', fontWeight: '600' },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 12,
  },
  switchLabel: { fontSize: 14, color: '#111827', fontWeight: '500' },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 8, marginTop: 8 },
  pickList: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    maxHeight: 200,
    marginBottom: 6,
  },
  pickEmpty: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  pickHint: {
    fontSize: 11,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 6,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: '#16a34a',
    borderColor: '#16a34a',
  },
  checkboxContent: { flex: 1 },
  publishLabel: { fontSize: 14, color: '#111827', fontWeight: '500' },
  publishRow: {
    marginTop: 4,
    marginBottom: 4,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
  },
  pickRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  pickRowActive: { backgroundColor: '#f0fdf4' },
  pickName: { fontSize: 13, fontWeight: '600', color: '#111827' },
  pickSub: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  pickCount: { fontSize: 12, color: '#6b7280', marginBottom: 12 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 16 },
  cancelBtn: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  cancelText: { color: '#374151', fontWeight: '600' },
  saveBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 120,
    alignItems: 'center',
  },
  saveText: { color: '#fff', fontWeight: '700' },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 20,
  },
  optionSheet: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    paddingBottom: 4,
  },
  optionSheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  optionRowSelectable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  optionRow: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  optionText: { fontSize: 14, color: '#111827' },
  timePickerList: { maxHeight: 320 },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  calendarNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarMonth: { fontSize: 15, fontWeight: '700', color: '#111827' },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: '#9ca3af',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    marginBottom: 4,
  },
  calendarCellSelected: { backgroundColor: '#16a34a' },
  calendarCellDisabled: { opacity: 0.35 },
  calendarCellText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  calendarCellTextSelected: { color: '#fff', fontWeight: '700' },
  calendarCellTextDisabled: { color: '#9ca3af' },
  detailLine: { fontSize: 13, color: '#374151', marginBottom: 6 },
});
