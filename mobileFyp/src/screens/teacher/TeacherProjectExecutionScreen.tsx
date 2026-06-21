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
import { SheetModal, sheetStyles } from '../../components/portal/SheetModal';
import { useAuthUser } from '../../hooks/useAuthUser';
import {
  getTeacherAssignmentsForSchedule,
  getTeacherEvaluationStatusBadge,
  loadProjectExecutionForTeacher,
  saveTeacherEvaluation,
  type DefenseSchedule,
  type DefenseType,
  type EvalStatusBadge,
  type JuryAssignment,
} from '../../services/projectExecutionService';

type ExecTab = 'proposal' | 'fyp1' | 'fyp2';

const TABS: { key: ExecTab; label: string; defenseType: DefenseType; emptyText: string }[] = [
  {
    key: 'proposal',
    label: 'Proposal Defense',
    defenseType: 'PROPOSAL',
    emptyText: 'No Proposal Defense schedules found',
  },
  {
    key: 'fyp1',
    label: 'FYP-I Evaluation',
    defenseType: 'FYP_I',
    emptyText: 'No FYP-I schedules found',
  },
  {
    key: 'fyp2',
    label: 'FYP-II Evaluation',
    defenseType: 'FYP_II',
    emptyText: 'No FYP-II schedules found',
  },
];

const PROPOSAL_STATUS_OPTIONS = [
  { value: 'ACCEPTED', label: 'Approved - Active Project Execution' },
  { value: 'CONDITIONALLY_APPROVED', label: 'Conditionally Approved - Minor Revisions' },
  { value: 'REJECTED', label: 'Rejected - Re-Defense Required' },
  { value: 'PENDING', label: 'Pending' },
];

const FYP_STATUS_OPTIONS = [
  { value: 'ACCEPTED', label: 'Accepted - Proceed to Next Phase' },
  { value: 'RE_EVALUATION_REQUIRED', label: 'Re-Evaluation Required' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'PENDING', label: 'Pending' },
];

function StatusBadge({
  status,
  defenseType,
}: {
  status: string;
  defenseType?: DefenseType | string;
}) {
  const badge: EvalStatusBadge = getTeacherEvaluationStatusBadge(status, defenseType);
  return (
    <View style={[styles.badge, { backgroundColor: badge.bg }]}>
      <Text style={[styles.badgeText, { color: badge.text }]} numberOfLines={3}>
        {badge.label}
      </Text>
    </View>
  );
}

function AssignmentRow({
  assignment,
  defenseType,
  showEvaluate,
  onEvaluate,
}: {
  assignment: JuryAssignment;
  defenseType: DefenseType;
  showEvaluate: boolean;
  onEvaluate: () => void;
}) {
  const members =
    assignment.groupMembers?.map((member) => member.name).join(', ') || 'N/A';

  return (
    <View style={styles.assignmentCard}>
      <View style={styles.assignmentRow}>
        <Text style={styles.assignmentLabel}>Group</Text>
        <Text style={styles.assignmentValue}>{assignment.groupName || 'N/A'}</Text>
      </View>
      <View style={styles.assignmentRow}>
        <Text style={styles.assignmentLabel}>Project</Text>
        <Text style={styles.assignmentValue}>{assignment.projectTitle || 'N/A'}</Text>
      </View>
      <View style={styles.assignmentRow}>
        <Text style={styles.assignmentLabel}>Members</Text>
        <Text style={styles.assignmentValue}>{members}</Text>
      </View>
      <View style={styles.assignmentRow}>
        <Text style={styles.assignmentLabel}>Status</Text>
        <StatusBadge status={assignment.evaluationStatus} defenseType={defenseType} />
      </View>
      {showEvaluate ? (
        <>
          {defenseType !== 'PROPOSAL' ? (
            <View style={styles.assignmentRow}>
              <Text style={styles.assignmentLabel}>Marks</Text>
              <Text style={styles.assignmentValue}>
                {assignment.marks != null ? `${assignment.marks}/100` : '-'}
              </Text>
            </View>
          ) : null}
          <Pressable style={styles.evaluateBtn} onPress={onEvaluate}>
            <FeatherIcon name="edit-2" size={14} color="#fff" />
            <Text style={styles.evaluateBtnText}>
              {assignment.marks != null || assignment.evaluationStatus !== 'PENDING'
                ? 'Update Evaluation'
                : 'Evaluate'}
            </Text>
          </Pressable>
        </>
      ) : null}
    </View>
  );
}

export function TeacherProjectExecutionScreen() {
  const { user } = useAuthUser();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [schedules, setSchedules] = useState<DefenseSchedule[]>([]);
  const [activeTab, setActiveTab] = useState<ExecTab>('proposal');
  const [evalOpen, setEvalOpen] = useState(false);
  const [statusPickerOpen, setStatusPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<JuryAssignment | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<DefenseSchedule | null>(null);
  const [evaluationData, setEvaluationData] = useState({
    marks: '',
    feedback: '',
    status: 'PENDING',
  });

  const loadData = useCallback(async () => {
    if (!user?.id) {
      setSchedules([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const data = await loadProjectExecutionForTeacher(user.id);
      setSchedules(data);
    } catch {
      setSchedules([]);
      Toast.show({ type: 'error', text1: 'Failed to load scheduled defenses' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const activeTabConfig = TABS.find((tab) => tab.key === activeTab)!;
  const filteredSchedules = useMemo(
    () => schedules.filter((schedule) => schedule.defenseType === activeTabConfig.defenseType),
    [schedules, activeTabConfig.defenseType],
  );

  const statusOptions =
    selectedSchedule?.defenseType === 'PROPOSAL'
      ? PROPOSAL_STATUS_OPTIONS
      : FYP_STATUS_OPTIONS;

  const selectedStatusLabel =
    statusOptions.find((option) => option.value === evaluationData.status)?.label ??
    evaluationData.status;

  const openEvaluation = (assignment: JuryAssignment, schedule: DefenseSchedule) => {
    setSelectedAssignment(assignment);
    setSelectedSchedule(schedule);
    setEvaluationData({
      marks:
        schedule.defenseType !== 'PROPOSAL' && assignment.marks != null
          ? String(assignment.marks)
          : '',
      feedback: assignment.feedback || '',
      status: assignment.evaluationStatus || 'PENDING',
    });
    setEvalOpen(true);
  };

  const handleSaveEvaluation = async () => {
    if (!selectedAssignment || !selectedSchedule || !user?.id) {
      return;
    }

    const isProposal = selectedSchedule.defenseType === 'PROPOSAL';

    if (!isProposal) {
      const marks = parseFloat(evaluationData.marks);
      if (
        evaluationData.marks === '' ||
        Number.isNaN(marks) ||
        marks < 0 ||
        marks > 100
      ) {
        Toast.show({ type: 'error', text1: 'Please enter marks between 0 and 100' });
        return;
      }
    }

    if (!evaluationData.feedback.trim()) {
      Toast.show({ type: 'error', text1: 'Please provide feedback for the evaluation' });
      return;
    }

    setSaving(true);
    try {
      await saveTeacherEvaluation(selectedAssignment.id, {
        marks:
          !isProposal && evaluationData.marks !== ''
            ? parseFloat(evaluationData.marks)
            : null,
        feedback: evaluationData.feedback.trim(),
        evaluationStatus: evaluationData.status,
        scheduleId: selectedSchedule.id,
      });
      Toast.show({ type: 'success', text1: 'Evaluation saved successfully' });
      setEvalOpen(false);
      setSelectedAssignment(null);
      setSelectedSchedule(null);
      await loadData();
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to save evaluation' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingView message="Loading project execution..." />;
  }

  return (
    <PortalScreenLayout
      title="Project Execution"
      subtitle="Enter marks and remarks for scheduled defenses"
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        loadData();
      }}>
      <Text style={styles.pageTitle}>Project Execution - Evaluation</Text>
      <Text style={styles.pageSubtitle}>Enter marks and remarks for scheduled defenses</Text>

      <View style={styles.segmentedWrap}>
        {TABS.map((tab, index) => {
          const active = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={[
                styles.segment,
                index === TABS.length - 1 && styles.segmentLast,
                active && styles.segmentActive,
              ]}
              onPress={() => setActiveTab(tab.key)}>
              <Text
                style={[styles.segmentText, active && styles.segmentTextActive]}
                numberOfLines={2}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {filteredSchedules.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>{activeTabConfig.emptyText}</Text>
        </View>
      ) : (
        filteredSchedules.map((schedule) => {
          const assignments = user?.id
            ? getTeacherAssignmentsForSchedule(schedule, user.id)
            : [];
          const showEvaluate = assignments.length > 0;

          return (
            <View key={schedule.id} style={styles.scheduleCard}>
              <Text style={styles.scheduleTitle}>{schedule.title}</Text>
              <Text style={styles.scheduleMeta}>
                {new Date(schedule.defenseDate).toLocaleDateString()} at {schedule.defenseTime} —{' '}
                {schedule.venue}
              </Text>
              {assignments.map((assignment) => (
                <AssignmentRow
                  key={assignment.id}
                  assignment={assignment}
                  defenseType={schedule.defenseType}
                  showEvaluate={showEvaluate}
                  onEvaluate={() => openEvaluation(assignment, schedule)}
                />
              ))}
            </View>
          );
        })
      )}

      <SheetModal
        visible={evalOpen}
        onClose={() => !saving && setEvalOpen(false)}
        title="Enter Evaluation"
        subtitle={
          selectedAssignment
            ? `${selectedAssignment.groupName ?? 'Group'} — ${selectedAssignment.projectTitle ?? 'Project'}`
            : undefined
        }
        footer={
          <View style={sheetStyles.footerRow}>
            <Pressable
              style={[sheetStyles.footerBtn, sheetStyles.footerBtnCancel]}
              disabled={saving}
              onPress={() => setEvalOpen(false)}>
              <Text style={sheetStyles.footerBtnCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[sheetStyles.footerBtn, sheetStyles.footerBtnPrimary]}
              disabled={saving}
              onPress={handleSaveEvaluation}>
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={sheetStyles.footerBtnPrimaryText}>Save Evaluation</Text>
              )}
            </Pressable>
          </View>
        }>
        {selectedSchedule?.defenseType !== 'PROPOSAL' ? (
          <>
            <Text style={styles.fieldLabel}>Marks (0-100)</Text>
            <TextInput
              style={styles.input}
              value={evaluationData.marks}
              onChangeText={(marks) => setEvaluationData((prev) => ({ ...prev, marks }))}
              placeholder="Enter marks"
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
            />
          </>
        ) : null}

        <Text style={styles.fieldLabel}>Evaluation Status</Text>
        <Pressable style={styles.picker} onPress={() => setStatusPickerOpen(true)}>
          <Text style={styles.pickerText} numberOfLines={2}>
            {selectedStatusLabel}
          </Text>
          <FeatherIcon name="chevron-down" size={18} color="#6b7280" />
        </Pressable>

        <Text style={styles.fieldLabel}>Remarks / Feedback</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={evaluationData.feedback}
          onChangeText={(feedback) => setEvaluationData((prev) => ({ ...prev, feedback }))}
          placeholder="Enter detailed feedback and remarks..."
          placeholderTextColor="#9ca3af"
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />
      </SheetModal>

      <SheetModal
        visible={statusPickerOpen}
        onClose={() => setStatusPickerOpen(false)}
        title="Evaluation Status">
        {statusOptions.map((option) => (
          <Pressable
            key={option.value}
            style={styles.optionRow}
            onPress={() => {
              setEvaluationData((prev) => ({ ...prev, status: option.value }));
              setStatusPickerOpen(false);
            }}>
            <Text style={styles.optionText}>{option.label}</Text>
            {evaluationData.status === option.value ? (
              <FeatherIcon name="check" size={18} color="#2563eb" />
            ) : null}
          </Pressable>
        ))}
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
    marginBottom: 16,
  },
  segmentedWrap: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
    minHeight: 52,
  },
  segmentLast: {
    borderRightWidth: 0,
  },
  segmentActive: {
    backgroundColor: '#f3f4f6',
  },
  segmentText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4b5563',
    textAlign: 'center',
    lineHeight: 15,
  },
  segmentTextActive: {
    color: '#111827',
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  scheduleCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    marginBottom: 14,
  },
  scheduleTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  scheduleMeta: {
    marginTop: 4,
    marginBottom: 12,
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  assignmentCard: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
    marginTop: 12,
    gap: 8,
  },
  assignmentRow: {
    gap: 4,
  },
  assignmentLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  assignmentValue: {
    fontSize: 14,
    color: '#111827',
    lineHeight: 20,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: '100%',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  evaluateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 4,
  },
  evaluateBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
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
    minHeight: 120,
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
    marginBottom: 12,
    gap: 8,
  },
  pickerText: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
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
    lineHeight: 20,
  },
});
